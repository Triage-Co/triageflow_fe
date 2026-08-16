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

    // TRƯỜNG HỢP 2: Số CCCD 9 - 12 chữ số thuần (nhập tay)
    const cleanId = text.replace(/\D/g, '');
    if (cleanId.length < 9 || cleanId.length > 12) {
      setError('Số CCCD / CMND phải gồm 9 đến 12 chữ số');
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
        <div className="p-8 flex flex-col items-center text-center space-y-6 overflow-y-auto">
          
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
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-2xl font-black text-[#1E2939] tracking-tight">
              Quét mã QR trên thẻ CCCD
            </h3>
            <p className="text-xs sm:text-sm text-[#4A5565] font-medium leading-relaxed">
              Hướng mã QR trên <strong className="text-[#155DFC]">thẻ CCCD gắn chip</strong> hoặc <strong className="text-[#155DFC]">ứng dụng VNeID</strong> vào máy quét cầm tay.
            </p>
          </div>

          {/* Quick Tip Box */}
          <div className="flex items-center gap-2.5 bg-blue-50/80 text-[#155DFC] border border-blue-100 px-4 py-3 rounded-2xl text-xs font-extrabold max-w-md text-left leading-snug shadow-2xs">
            <Lightbulb className="w-5 h-5 text-[#155DFC] shrink-0" />
            <span>Mẹo: Giữ thẻ cố định cách đầu đọc khoảng 10 - 15cm để máy nhận diện tức thì.</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-200 px-4 py-2.5 rounded-2xl text-xs font-bold max-w-md">
              <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Invisible Auto-Focus Input for Barcode Scanners */}
          <input
            ref={inputRef}
            type="text"
            value={cccdInput}
            onChange={(e) => {
              const val = e.target.value;
              setCccdInput(val);
              if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
              
              // Nếu máy quét bắn chuỗi CCCD đầy đủ
              if (val.includes('|') && val.split('|').length >= 6) {
                processCCCDSubmission(val);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleManualSubmit();
              }
            }}
            className="opacity-0 absolute -z-10 pointer-events-none"
            tabIndex={-1}
            autoFocus
          />

          {/* Manual Input Toggle Button */}
          <div className="w-full max-w-md pt-2 border-t border-neutral-100 flex flex-col items-center space-y-3">
            {!showManualInput ? (
              <button
                type="button"
                onClick={() => setShowManualInput(true)}
                className="flex items-center gap-2 text-xs font-extrabold text-[#4A5565] hover:text-[#155DFC] transition-colors py-1 cursor-pointer"
              >
                <Keyboard className="w-4 h-4" />
                <span>Thẻ CCCD bị mờ? Bấm vào đây để nhập số bằng tay</span>
              </button>
            ) : (
              <div className="w-full space-y-3 animate-in fade-in-50 duration-200 text-left">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-500 uppercase block">
                    Nhập thủ công 12 số CCCD / CMND:
                  </label>
                  <input
                    type="text"
                    value={cccdInput}
                    onChange={(e) => setCccdInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                    placeholder="Ví dụ: 07920100xxxx"
                    maxLength={12}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-[#155DFC]"
                  />
                </div>

                <PrimaryButton
                  onClick={handleManualSubmit}
                  isLoading={isLoading}
                  className="w-full text-sm"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isLoading ? 'Đang xác thực...' : 'Xác nhận nhập tay'}
                </PrimaryButton>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
