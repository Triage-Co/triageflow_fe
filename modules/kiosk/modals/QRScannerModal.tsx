'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { useAuthStore } from '../store/authStore';
import { parseCCCDQrCode } from '../utils/cccdParser';
import {
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  QrCode,
  Sparkles,
  Keyboard,
  Zap,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';
import { PrimaryButton } from '../components/PrimaryButton';
import { NumericKeypad } from '../components/NumericKeypad';
import { useFlowStore } from '../store/flowStore';

export const QRScannerModal: React.FC = () => {
  const [cccdInput, setCccdInput] = useState('');
  const [error, setError] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const activeModal = useKioskStore((state) => state.activeModal);
  const targetViewAfterScan = useKioskStore((state) => state.targetViewAfterScan);
  const closeModal = useKioskStore((state) => state.closeModal);
  const isLoading = useKioskStore((state) => state.isLoading);
  const navigateToView = useKioskStore((state) => state.navigateToView);
  const showToast = useKioskStore((state) => state.showToast);
  const setLoading = useKioskStore((state) => state.setLoading);

  const loginCitizenWithCCCDData = useAuthStore((state) => state.loginCitizenWithCCCDData);
  const loginCitizen = useAuthStore((state) => state.loginCitizen);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Tự động focus vào ô nhận dữ liệu ngay khi mở Modal để đón máy quét / Barcode to PC
  useEffect(() => {
    if (activeModal === 'scan_cccd') {
      isProcessingRef.current = false;
      setError('');
      setCccdInput('');
      setShowManualInput(false);

      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [activeModal]);

  // Luôn giữ focus để máy quét bắn dữ liệu mọi lúc khi modal đang mở
  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const processCCCDSubmission = async (rawInput: string) => {
    const text = rawInput.trim();
    if (!text || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setError('');

    // 1. Khóa hàm in NGAY LẬP TỨC từ mili-giây đầu tiên (trước khi gọi API)
    if (typeof window !== 'undefined') {
      const originalPrint = window.print;
      window.print = () => {
        console.warn('🔒 Lệnh in tự động bị chặn trong thời gian đăng nhập.');
      };
      setTimeout(() => {
        window.print = originalPrint;
      }, 10000);

      // Nuốt toàn bộ phím Enter / phím tắt từ máy quét
      const swallowHandler = (e: KeyboardEvent) => {
        e.stopImmediatePropagation();
        e.preventDefault();
      };
      window.addEventListener('keydown', swallowHandler, { capture: true });
      window.addEventListener('keypress', swallowHandler, { capture: true });
      window.addEventListener('keyup', swallowHandler, { capture: true });

      setTimeout(() => {
        window.removeEventListener('keydown', swallowHandler, { capture: true });
        window.removeEventListener('keypress', swallowHandler, { capture: true });
        window.removeEventListener('keyup', swallowHandler, { capture: true });
      }, 3000);

      // Giải phóng con trỏ chuột ngay lập tức
      (document.activeElement as HTMLElement)?.blur();
    }

    // TRƯỜNG HỢP 1: Chuỗi QR thẻ CCCD gắn chip (có dấu '|')
    if (text.includes('|')) {
      const parsed = parseCCCDQrCode(text);
      if (!parsed.citizenId || parsed.citizenId.length < 9) {
        setError('Mã QR không đúng định dạng CCCD chuẩn!');
        isProcessingRef.current = false;
        return;
      }

      setLoading(true, 'Đang đọc thẻ chip & xác thực danh tính...');
      showToast(`Đã nhận diện CCCD: ${parsed.fullName}`, 'success');

      const isSuccess = await loginCitizenWithCCCDData(parsed);
      setLoading(false);

      if (isSuccess) {
        const authState = useAuthStore.getState();
        const patientId = authState.patientId || authState.citizenId;
        const target = targetViewAfterScan ?? 'register';

        closeModal();

        if (target === 'pending_bills') {
          if (patientId) {
            await useFlowStore.getState().fetchPendingPaymentSteps(patientId);
          }
          return;
        }

        if (patientId && (target === 'patient_info' || target === 'queue' || target === 'doctor_route')) {
          await useFlowStore.getState().fetchActiveTicketForPatient(patientId);
        }

        navigateToView(target);
      } else {
        setError('Xác thực căn cước công dân thất bại!');
        isProcessingRef.current = false;
      }
      return;
    }

    // TRƯỜNG HỢP 2: Số CCCD 12 chữ số (nhập tay)
    const cleanId = text.replace(/\D/g, '');
    if (cleanId.length !== 12) {
      setError('Số CCCD phải gồm đúng 12 chữ số');
      isProcessingRef.current = false;
      return;
    }

    setLoading(true, 'Đang xác thực thẻ căn cước công dân...');

    try {
      const isSuccess = await loginCitizen(cleanId);
      setLoading(false);

      if (isSuccess) {
        showToast('Xác thực căn cước công dân thành công!', 'success');
        const authState = useAuthStore.getState();
        const patientId = authState.patientId || authState.citizenId;
        const target = targetViewAfterScan ?? 'register';

        closeModal();

        if (target === 'pending_bills') {
          if (patientId) {
            await useFlowStore.getState().fetchPendingPaymentSteps(patientId);
          }
          return;
        }

        if (patientId && (target === 'patient_info' || target === 'queue' || target === 'doctor_route')) {
          await useFlowStore.getState().fetchActiveTicketForPatient(patientId);
        }

        navigateToView(target);
      } else {
        setError('Xác thực căn cước thất bại. Vui lòng kiểm tra lại!');
        isProcessingRef.current = false;
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
      setError('Lỗi kết nối máy chủ khi xác thực');
      isProcessingRef.current = false;
    }
  };

  const handleManualSubmit = () => {
    processCCCDSubmission(cccdInput);
  };

  if (activeModal !== 'scan_cccd') return null;

  const getTargetTitle = () => {
    switch (targetViewAfterScan) {
      case 'booking_mode':
      case 'register': return 'Đăng ký khám bệnh';
      case 'patient_info': return 'Xem thông tin khám bệnh';
      case 'doctor_route': return 'In phiếu / Lộ trình khám';
      case 'queue': return 'Theo dõi hàng đợi';
      case 'map': return 'Xem đường đi phòng khám';
      case 'payment': return 'Thanh toán viện phí';
      default: return 'Xác thực căn cước công dân';
    }
  };

  return (
    <div
      onClick={handleContainerClick}
      className="fixed inset-0 z-50 bg-[#1E2939]/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in-0 duration-300 select-none"
    >
      <div className="bg-white w-full max-w-xl rounded-[36px] shadow-2xl overflow-hidden border border-neutral-100/50 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">

        {/* Modal Header */}
        <div className="px-8 py-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <button
            onClick={closeModal}
            className="flex items-center gap-2 text-[#4A5565] hover:text-[#1E2939] font-bold text-base transition-colors duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay lại
          </button>

          <span className="text-xs font-extrabold uppercase tracking-widest text-[#155DFC] bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100/50">
            {getTargetTitle()}
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-5 overflow-y-auto max-h-[80vh]">

          {!showManualInput ? (
            <>
              {/* Animated Holographic Scanner Graphic Box */}
              <div className="relative w-full max-w-sm aspect-[16/10] rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-6 flex flex-col items-center justify-center text-white shadow-2xl shadow-blue-500/10 border border-blue-500/30 overflow-hidden group">

                {/* Background Ambient Glow & Waves */}
                <div className="absolute -top-12 -left-12 w-36 h-36 bg-blue-500/20 blur-2xl rounded-full pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-indigo-500/20 blur-2xl rounded-full pointer-events-none" />

                {/* Glowing Scan Laser Line Animation */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_16px_#34D399] animate-bounce duration-1000 z-20 pointer-events-none" />

                {/* Illustrated CCCD Card */}
                <div className="relative z-10 w-44 h-28 rounded-2xl bg-white/10 backdrop-blur-md border border-white/25 p-3 flex flex-col justify-between shadow-xl transform transition-transform group-hover:scale-105 duration-300">
                  <div className="flex items-center justify-between">
                    <div className="w-6 h-5 rounded-md bg-amber-400/80 border border-amber-300 flex items-center justify-center shadow-xs">
                      <div className="w-3 h-3 rounded-xs border border-amber-600/50" />
                    </div>
                    <QrCode className="w-7 h-7 text-emerald-400 animate-pulse" />
                  </div>
                  <div className="space-y-1 text-left">
                    <div className="w-20 h-2 rounded bg-white/40" />
                    <div className="w-28 h-1.5 rounded bg-white/20" />
                  </div>
                </div>

                {/* Ready Radar Badge */}
                <div className="absolute bottom-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-[11px] font-bold text-emerald-300 z-10 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Máy quét đã sẵn sàng (Đang chờ thẻ)</span>
                </div>
              </div>

              {/* User Instructions */}
              <div className="space-y-1 max-w-md">
                <h3 className="text-xl sm:text-2xl font-black text-[#1E2939] tracking-tight">
                  Quét mã QR trên thẻ CCCD
                </h3>
                <p className="text-xs text-neutral-400 font-semibold">
                  Đặt mã QR trên thẻ CCCD của bạn trước đầu đọc để hệ thống nhận diện
                </p>
              </div>

              {/* Manual Input Toggle Button */}
              <div className="w-full max-w-md pt-2 border-t border-neutral-100 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowManualInput(true);
                    setError('');
                  }}
                  className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#155DFC] hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 px-5 py-2.5 rounded-full transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Keyboard className="w-4 h-4" />
                  <span>Chạm để nhập số CCCD bằng bàn phím</span>
                </button>
              </div>
            </>
          ) : (
            /* MANUAL INPUT MODE WITH NUMERIC KEYPAD */
            <div className="w-full max-w-md space-y-4 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
                  Bàn phím số cảm ứng
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowManualInput(false);
                    setError('');
                  }}
                  className="text-xs font-bold text-[#155DFC] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <QrCode className="w-3.5 h-3.5" /> Dùng máy quét mã
                </button>
              </div>

              {/* Digits Display Box */}
              <div className="bg-neutral-50 border-2 border-blue-200 rounded-2xl p-3.5 text-center shadow-inner space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                  Số CCCD / CMND ({cccdInput.length}/12)
                </span>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-[#155DFC] min-h-[36px] flex items-center justify-center">
                  {cccdInput ? (
                    cccdInput
                  ) : (
                    <span className="text-neutral-300 font-normal text-lg tracking-normal">
                      Chạm phím số bên dưới để nhập...
                    </span>
                  )}
                </div>
              </div>

              {/* Touch Numeric Keypad */}
              <NumericKeypad
                onKeyPress={(num) => {
                  if (cccdInput.length < 12) {
                    setCccdInput((prev) => prev + num);
                    setError('');
                  }
                }}
                onDelete={() => {
                  setCccdInput((prev) => prev.slice(0, -1));
                }}
                onClear={() => {
                  setCccdInput('');
                  setError('');
                }}
                onSubmit={handleManualSubmit}
                submitLabel="Xác nhận CCCD"
                isSubmitDisabled={cccdInput.length !== 12}
                isLoading={isLoading}
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-200 px-4 py-2.5 rounded-2xl text-xs font-bold max-w-md animate-in fade-in duration-200">
              <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Invisible Auto-Focus Input for Barcode Scanners & PC Keyboard */}
          <input
            ref={inputRef}
            type="text"
            value={cccdInput}
            onChange={(e) => {
              const val = e.target.value;
              if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

              // Nếu là dữ liệu từ máy quét mã QR CCCD (chứa dấu phân cách '|')
              if (val.includes('|')) {
                setCccdInput(val);
                if (val.split('|').length >= 6) {
                  processCCCDSubmission(val);
                }
                return;
              }

              // Nếu nhập từ bàn phím PC: Chỉ giữ lại chữ số (0-9) và tối đa 12 số
              const digitsOnly = val.replace(/\D/g, '').slice(0, 12);
              setCccdInput(digitsOnly);
              if (error) setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (cccdInput.length === 12) {
                  handleManualSubmit();
                }
              }
            }}
            className="opacity-0 absolute -z-10 pointer-events-none"
            tabIndex={-1}
            autoFocus
          />
        </div>
      </div>
    </div>
  );
};
