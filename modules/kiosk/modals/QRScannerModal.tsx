'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { useKioskStore } from '../store/kioskStore';
import { useAuthStore } from '../store/authStore';
import { parseCCCDQrCode } from '../utils/cccdParser';
import { Camera, ArrowLeft, ShieldCheck, AlertCircle, Lightbulb } from 'lucide-react';
import { PrimaryButton } from '../components/PrimaryButton';

import { useFlowStore } from '../store/flowStore';

export const QRScannerModal: React.FC = () => {
  const [cccdInput, setCccdInput] = useState('');
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [isScannerActive, setIsScannerActive] = useState(false);

  const activeModal = useKioskStore((state) => state.activeModal);
  const targetViewAfterScan = useKioskStore((state) => state.targetViewAfterScan);
  const closeModal = useKioskStore((state) => state.closeModal);
  const isLoading = useKioskStore((state) => state.isLoading);
  const navigateToView = useKioskStore((state) => state.navigateToView);
  const showToast = useKioskStore((state) => state.showToast);
  const setLoading = useKioskStore((state) => state.setLoading);

  const loginCitizenWithCCCDData = useAuthStore((state) => state.loginCitizenWithCCCDData);
  const loginCitizen = useAuthStore((state) => state.loginCitizen);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isTransitioningRef = useRef<boolean>(false);

  // Helper an toàn dừng và giải phóng bộ nhớ camera mà không gây ra lỗi State Transition
  const safeStopScanner = async (instance: Html5Qrcode | null) => {
    if (!instance) return;

    try {
      // Chỉ gọi stop khi instance thực sự ở trạng thái đang SCANNING
      const state = instance.getState();
      if (state === Html5QrcodeScannerState.SCANNING || instance.isScanning) {
        await instance.stop();
      }
    } catch (err) {
      console.warn('Cảnh báo an toàn khi dừng scanner:', err);
    } finally {
      try {
        instance.clear();
      } catch (e) {
        // Ignored clear error
      }
    }
  };

  useEffect(() => {
    if (activeModal !== 'scan_cccd') {
      if (scannerRef.current) {
        safeStopScanner(scannerRef.current);
        scannerRef.current = null;
      }
      setIsScannerActive(false);
      return;
    }

    let isMounted = true;
    const elementId = 'cccd-qr-reader';

    const qrConfig = {
      fps: 25,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const boxSize = Math.floor(minEdge * 0.58);
        return { width: boxSize, height: boxSize };
      }
    };

    const handleSuccessScan = async (decodedText: string) => {
      if (!isMounted) return;

      // An toàn dừng camera khi nhận diện QR thành công
      if (scannerRef.current) {
        await safeStopScanner(scannerRef.current);
      }

      const parsed = parseCCCDQrCode(decodedText);
      if (!parsed.citizenId || parsed.citizenId.length < 9) {
        showToast('Mã QR không đúng định dạng CCCD!', 'error');
        return;
      }

      setLoading(true, 'Đang đọc thẻ chip & xác thực...');
      showToast(`Đã quét CCCD thành công: ${parsed.fullName}`, 'success');

      const isSuccess = await loginCitizenWithCCCDData(parsed);
      setLoading(false);

      if (isSuccess) {
        const authState = useAuthStore.getState();
        const patientId = authState.patientId || authState.citizenId;
        const target = targetViewAfterScan ?? 'register';

        if (patientId && (target === 'patient_info' || target === 'queue' || target === 'doctor_route')) {
          await useFlowStore.getState().fetchActiveTicketForPatient(patientId);
        }

        closeModal();
        navigateToView(target);
      } else {
        showToast('Xác thực căn cước công dân thất bại!', 'error');
      }
    };

    const startCamera = async () => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;
      setCameraError('');

      try {
        // Đảm bảo dọn dẹp instance cũ nếu có trước khi khởi tạo instance mới
        if (scannerRef.current) {
          await safeStopScanner(scannerRef.current);
          scannerRef.current = null;
        }

        if (!isMounted) return;

        const html5Qrcode = new Html5Qrcode(elementId);
        scannerRef.current = html5Qrcode;

        // Phương án 1: Lấy danh sách camera phần cứng thực tế qua Html5Qrcode.getCameras()
        let devices: Array<{ id: string; label: string }> = [];
        try {
          devices = await Html5Qrcode.getCameras();
        } catch (e) {
          console.warn('Lỗi truy vấn danh sách thiết bị camera:', e);
        }

        if (devices && devices.length > 0) {
          const selectedCamera = devices.find(d => d.label.toLowerCase().includes('front') || d.label.toLowerCase().includes('user')) || devices[0];

          await html5Qrcode.start(
            selectedCamera.id,
            qrConfig,
            handleSuccessScan,
            () => {}
          );

          if (isMounted) setIsScannerActive(true);
          return;
        }

        // Phương án 2: Mở camera với facingMode "user"
        await html5Qrcode.start(
          { facingMode: 'user' },
          qrConfig,
          handleSuccessScan,
          () => {}
        );

        if (isMounted) setIsScannerActive(true);
      } catch (err: any) {
        console.warn('Thử mở camera chính thất bại, thử mở với facingMode environment:', err);

        try {
          if (!isMounted) return;

          // Tạo instance sạch mới nếu instance cũ bị lỗi state
          if (scannerRef.current) {
            await safeStopScanner(scannerRef.current);
          }

          const fallbackQrcode = new Html5Qrcode(elementId);
          scannerRef.current = fallbackQrcode;

          await fallbackQrcode.start(
            { facingMode: 'environment' },
            qrConfig,
            handleSuccessScan,
            () => {}
          );

          if (isMounted) setIsScannerActive(true);
        } catch (finalErr: any) {
          console.error('Không thể mở Camera Kiosk:', finalErr);
          if (isMounted) {
            setCameraError('Không thể mở Camera. Vui lòng cấp quyền truy cập camera hoặc sử dụng ô nhập tay bên dưới.');
            setIsScannerActive(false);
          }
        }
      } finally {
        isTransitioningRef.current = false;
      }
    };

    const timer = setTimeout(() => {
      startCamera();
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        safeStopScanner(scannerRef.current);
        scannerRef.current = null;
      }
    };
  }, [activeModal, targetViewAfterScan, loginCitizenWithCCCDData, closeModal, navigateToView, showToast, setLoading]);

  const handleManualSubmit = async () => {
    const cleanId = cccdInput.trim();
    if (!/^\d{9,12}$/.test(cleanId)) {
      setError('Số CCCD / CMND phải gồm 9 đến 12 chữ số');
      return;
    }
    setError('');
    setLoading(true, 'Đang xác thực thẻ căn cước công dân...');

    try {
      const isSuccess = await loginCitizen(cleanId);
      setLoading(false);

      if (isSuccess) {
        showToast('Xác thực căn cước công dân thành công!', 'success');
        const authState = useAuthStore.getState();
        const patientId = authState.patientId || authState.citizenId;
        const target = targetViewAfterScan ?? 'register';

        if (patientId && (target === 'patient_info' || target === 'queue' || target === 'doctor_route')) {
          await useFlowStore.getState().fetchActiveTicketForPatient(patientId);
        }

        closeModal();
        navigateToView(target);
      } else {
        setError('Xác thực căn cước thất bại. Vui lòng kiểm tra lại!');
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
      setError('Lỗi kết nối máy chủ khi xác thực');
    }
  };

  if (activeModal !== 'scan_cccd') return null;

  const getTargetTitle = () => {
    switch (targetViewAfterScan) {
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
    <div className="fixed inset-0 z-50 bg-[#1E2939]/50 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in-0 duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[36px] shadow-2xl overflow-hidden border border-neutral-100/50 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
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
        <div className="p-8 flex flex-col items-center text-center space-y-5 overflow-y-auto">
          {/* Real Camera Video Container / Scanner Box */}
          <div className="relative w-80 h-56 rounded-3xl border-4 border-dashed border-[#155DFC] bg-black/90 flex flex-col items-center justify-center overflow-hidden shadow-inner">
            <div id="cccd-qr-reader" className="w-full h-full object-cover" />

            {!isScannerActive && !cameraError && (
              <div className="absolute inset-0 bg-neutral-900/90 flex flex-col items-center justify-center text-white space-y-2 z-10">
                <Camera className="w-10 h-10 text-[#155DFC] animate-pulse" />
                <span className="text-xs font-bold">Đang kết nối Camera Kiosk...</span>
              </div>
            )}

            {isScannerActive && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-400 animate-bounce shadow-[0_0_12px_#34D399] z-20 pointer-events-none" />
            )}
          </div>

          {/* UI Hint Box: Mẹo quét nhanh */}
          <div className="flex items-center gap-2.5 bg-blue-50/80 text-[#155DFC] border border-blue-100 px-4 py-3 rounded-2xl text-xs font-extrabold max-w-md text-left leading-snug shadow-2xs">
            <Lightbulb className="w-5 h-5 text-[#155DFC] shrink-0" />
            <span>Mẹo quét nhanh: Đặt thẻ cách camera khoảng 1 gang tay (25cm) và nghiêng nhẹ thẻ để tránh lóa đèn.</span>
          </div>

          {cameraError && (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 px-4 py-2.5 rounded-2xl text-xs font-semibold max-w-md">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          <div className="space-y-1 max-w-md">
            <h3 className="text-xl font-extrabold text-[#1E2939]">Quét mã QR trên thẻ CCCD</h3>
            <p className="text-xs text-[#4A5565] font-medium leading-relaxed">
              Hướng mã QR trên mặt trước/sau của thẻ CCCD gắn chip hoặc ứng dụng VNeID vào khung camera.
            </p>
          </div>

          {/* Manual Input Fallback Section */}
          <div className="pt-2 w-full max-w-xs space-y-3 border-t border-neutral-100">
            <div className="space-y-1 text-left">
              <label className="text-[11px] font-bold text-neutral-500 uppercase block">Hoặc nhập thủ công số CCCD / CMND:</label>
              <input
                type="text"
                value={cccdInput}
                onChange={(e) => setCccdInput(e.target.value)}
                placeholder="Nhập 12 số căn cước..."
                maxLength={12}
                className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-[#155DFC]"
              />
              {error && <p className="text-rose-600 text-xs font-bold pt-0.5">{error}</p>}
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
        </div>
      </div>
    </div>
  );
};
