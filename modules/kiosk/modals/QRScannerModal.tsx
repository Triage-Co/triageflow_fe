'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { useAuthStore } from '../store/authStore';
import {
  ArrowLeft,
  Camera,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Keyboard,
} from 'lucide-react';
import { NumericKeypad } from '../components/NumericKeypad';
import { useFlowStore } from '../store/flowStore';
import { scanWithJsQREngine } from '../utils/qrImageEnhancer';

interface CameraDevice {
  id: string;
  label: string;
  isPhoneOrExternal: boolean;
}

export const QRScannerModal: React.FC = () => {
  const [cccdInput, setCccdInput] = useState('');
  const [error, setError] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Camera states
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isCameraLoading, setIsCameraLoading] = useState(true);
  const [isSnapshotScanning, setIsSnapshotScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanSuccessId, setScanSuccessId] = useState<string | null>(null);

  const activeModal = useKioskStore((state) => state.activeModal);
  const targetViewAfterScan = useKioskStore((state) => state.targetViewAfterScan);
  const closeModal = useKioskStore((state) => state.closeModal);
  const isLoading = useKioskStore((state) => state.isLoading);
  const navigateToView = useKioskStore((state) => state.navigateToView);
  const showToast = useKioskStore((state) => state.showToast);
  const setLoading = useKioskStore((state) => state.setLoading);

  const loginCitizen = useAuthStore((state) => state.loginCitizen);

  const manualInputRef = useRef<HTMLInputElement | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const scannerRef = useRef<any>(null);
  const isScannerRunningRef = useRef<boolean>(false);
  const processingLoopRef = useRef<number | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // State refs để tránh re-trigger useEffect / useCallback
  const showManualInputRef = useRef<boolean>(false);
  const selectedCameraIdRef = useRef<string>('');
  const startCameraRef = useRef<((id: string) => Promise<void>) | null>(null);
  const stopCameraRef = useRef<(() => Promise<void>) | null>(null);
  const initCamerasRef = useRef<(() => Promise<void>) | null>(null);
  const processSubmissionRef = useRef<((val: string) => Promise<void>) | null>(null);

  useEffect(() => {
    showManualInputRef.current = showManualInput;
  }, [showManualInput]);

  useEffect(() => {
    selectedCameraIdRef.current = selectedCameraId;
  }, [selectedCameraId]);

  // Âm thanh 'bíp' khi nhận diện thành công
  const playBeepSound = () => {
    try {
      if (typeof window === 'undefined') return;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // AudioContext có thể bị chặn nếu chưa tương tác
    }
  };

  // Helper trích xuất 12 số CCCD từ bất kỳ dạng đầu vào nào
  const extractCitizenId = (rawInput: string): string => {
    const text = (rawInput || '').trim();
    if (text.includes('|')) {
      const parts = text.split('|');
      return parts[0]?.trim()?.replace(/\D/g, '') || '';
    }
    return text.replace(/\D/g, '').slice(0, 12);
  };

  // Dừng camera an toàn & hủy loop
  const stopCamera = useCallback(async () => {
    if (processingLoopRef.current) {
      clearInterval(processingLoopRef.current);
      processingLoopRef.current = null;
    }

    if (scannerRef.current && isScannerRunningRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.warn('Lỗi khi dừng camera scanner:', err);
      }
      isScannerRunningRef.current = false;
    }
  }, []);

  useEffect(() => {
    stopCameraRef.current = stopCamera;
  }, [stopCamera]);

  // Xử lý xác thực khi lấy được số CCCD
  const processCitizenIdSubmission = useCallback(async (rawInput: string) => {
    const cleanId = extractCitizenId(rawInput);
    if (!cleanId || cleanId.length !== 12 || isProcessingRef.current) {
      if (cleanId && cleanId.length > 0 && cleanId.length !== 12) {
        setError(`Mã CCCD (${cleanId}) phải gồm đúng 12 chữ số`);
      }
      return;
    }

    isProcessingRef.current = true;
    playBeepSound();
    setScanSuccessId(cleanId);
    setError('');

    // Dừng camera ngay khi nhận diện thành công
    await stopCamera();

    setLoading(true, 'Đang xác thực thông tin CCCD...');

    try {
      const isSuccess = await loginCitizen(cleanId);
      setLoading(false);

      if (isSuccess) {
        showToast(`Xác thực thành công CCCD: ${cleanId}`, 'success');
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
        setError(`Không tìm thấy Bệnh nhân với CCCD/CMND: ${cleanId} trong hệ thống, vui lòng liên hệ lễ tân để được hỗ trợ.`);
        isProcessingRef.current = false;
        setScanSuccessId(null);

        // Khởi động lại camera nếu đang ở chế độ camera
        if (!showManualInputRef.current && selectedCameraIdRef.current) {
          setTimeout(() => {
            if (!showManualInputRef.current) {
              startCameraRef.current?.(selectedCameraIdRef.current);
            }
          }, 800);
        }
      }
    } catch (e: any) {
      console.error(e);
      setLoading(false);
      const errMsg = e?.message || `Không tìm thấy Bệnh nhân với CCCD: ${cleanId} trong hệ thống. Vui lòng liên hệ lễ tân.`;
      setError(errMsg);
      isProcessingRef.current = false;
      setScanSuccessId(null);

      if (!showManualInputRef.current && selectedCameraIdRef.current) {
        setTimeout(() => {
          if (!showManualInputRef.current) {
            startCameraRef.current?.(selectedCameraIdRef.current);
          }
        }, 800);
      }
    }
  }, [closeModal, loginCitizen, navigateToView, setLoading, showToast, stopCamera, targetViewAfterScan]);

  useEffect(() => {
    processSubmissionRef.current = processCitizenIdSubmission;
  }, [processCitizenIdSubmission]);

  // Bộ lõi giải mã đa tầng siêu nhạy
  const startAdvancedDecodingLoop = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (processingLoopRef.current) {
      clearInterval(processingLoopRef.current);
    }

    let barcodeDetector: any = null;
    if ('BarcodeDetector' in window) {
      try {
        barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'ean_13', 'data_matrix'],
        });
      } catch (e) {
        console.warn('BarcodeDetector error:', e);
      }
    }

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }

    processingLoopRef.current = window.setInterval(async () => {
      if (!isScannerRunningRef.current || isProcessingRef.current || showManualInputRef.current) return;

      const video = document.querySelector('#kiosk-cccd-reader video') as HTMLVideoElement | null;
      if (!video || video.readyState < 2 || video.paused || video.videoWidth === 0) return;

      const canvas = offscreenCanvasRef.current;
      if (!canvas) return;

      // 1. ENGINE 1: Native BarcodeDetector
      if (barcodeDetector) {
        try {
          const rawCodes = await barcodeDetector.detect(video);
          if (rawCodes && rawCodes.length > 0 && rawCodes[0].rawValue) {
            processSubmissionRef.current?.(rawCodes[0].rawValue);
            return;
          }
        } catch {
          // Bỏ qua lỗi frame
        }
      }

      // 2. ENGINE 2: jsQR Engine với Multi-Scale & Digital Zoom
      try {
        const jsQrResult = scanWithJsQREngine(video, canvas);
        if (jsQrResult && !isProcessingRef.current) {
          processSubmissionRef.current?.(jsQrResult);
          return;
        }
      } catch {
        // Bỏ qua lỗi jsQR
      }
    }, 100);
  }, []);

  // Chức năng Snapshot tĩnh (Chụp & Quét ngay)
  const handleManualSnapshotScan = async () => {
    if (isSnapshotScanning || isProcessingRef.current) return;

    const video = document.querySelector('#kiosk-cccd-reader video') as HTMLVideoElement | null;
    if (!video || video.readyState < 2) return;

    setIsSnapshotScanning(true);
    setError('');

    try {
      const canvas = offscreenCanvasRef.current || document.createElement('canvas');

      const jsQrText = scanWithJsQREngine(video, canvas);
      if (jsQrText) {
        processSubmissionRef.current?.(jsQrText);
        setIsSnapshotScanning(false);
        return;
      }

      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const results = await detector.detect(canvas).catch(() => []);
        if (results.length > 0 && results[0].rawValue) {
          processSubmissionRef.current?.(results[0].rawValue);
          setIsSnapshotScanning(false);
          return;
        }
      }

      if (scannerRef.current) {
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], 'snapshot.jpg', { type: 'image/jpeg' });
            try {
              const text = await scannerRef.current.scanFile(file, false);
              if (text) {
                processSubmissionRef.current?.(text);
                setIsSnapshotScanning(false);
                return;
              }
            } catch {
              // Bỏ qua lỗi scanFile
            }
          }
          setIsSnapshotScanning(false);
          setError('Chưa nhận diện được mã. Vui lòng giữ thẻ cố định và bấm lại!');
        }, 'image/jpeg', 0.95);
        return;
      }

      setIsSnapshotScanning(false);
      setError('Chưa nhận diện được mã. Vui lòng giữ thẻ cách camera 15-20cm và bấm lại.');
    } catch (err) {
      console.error(err);
      setIsSnapshotScanning(false);
      setError('Lỗi khi phân tích ảnh chụp.');
    }
  };

  // Khởi chạy camera với cameraId cụ thể
  const startCamera = useCallback(async (cameraId: string) => {
    if (typeof window === 'undefined' || showManualInputRef.current) return;

    try {
      setIsCameraLoading(true);
      setCameraError(null);

      await stopCamera();

      const { Html5Qrcode } = await import('html5-qrcode');

      const readerElement = document.getElementById('kiosk-cccd-reader');
      if (!readerElement) {
        setIsCameraLoading(false);
        return;
      }

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('kiosk-cccd-reader', {
          verbose: false,
          useBarCodeDetectorIfSupported: true,
        });
      }

      // Quét Full Frame 16:9 màn hình ngang với độ phân giải cao nhất
      await scannerRef.current.start(
        cameraId ? { deviceId: { exact: cameraId } } : { facingMode: 'environment' },
        {
          fps: 25,
          disableFlip: false,
          videoConstraints: {
            deviceId: cameraId ? { exact: cameraId } : undefined,
            width: { min: 640, ideal: 1920, max: 3840 },
            height: { min: 480, ideal: 1080, max: 2160 },
            aspectRatio: { ideal: 1.7777777778 },
            advanced: [{ focusMode: 'continuous' } as any],
          },
        },
        (decodedText: string) => {
          if (!isProcessingRef.current && !showManualInputRef.current) {
            processSubmissionRef.current?.(decodedText);
          }
        },
        () => {
          // Bỏ qua lỗi frame
        }
      );

      isScannerRunningRef.current = true;
      setIsCameraLoading(false);

      startAdvancedDecodingLoop();
    } catch (err: any) {
      console.error('Lỗi khi mở camera:', err);
      setIsCameraLoading(false);
      isScannerRunningRef.current = false;

      const errMsg = err?.message || String(err);
      if (/notallowed|permission/i.test(errMsg)) {
        setCameraError('Chưa được cấp quyền truy cập Camera. Vui lòng cấp quyền trong trình duyệt.');
      } else if (/notfound|no camera/i.test(errMsg)) {
        setCameraError('Không tìm thấy thiết bị Camera nào trên máy.');
      } else {
        setCameraError('Không thể mở Camera. Vui lòng kiểm tra lại thiết bị hoặc dùng nhập tay.');
      }
    }
  }, [startAdvancedDecodingLoop, stopCamera]);

  useEffect(() => {
    startCameraRef.current = startCamera;
  }, [startCamera]);

  // Khởi tạo danh sách camera khi mở modal
  const initCameras = useCallback(async () => {
    if (showManualInputRef.current) return;

    try {
      setIsCameraLoading(true);
      setCameraError(null);

      const { Html5Qrcode } = await import('html5-qrcode');
      const deviceList = await Html5Qrcode.getCameras();

      if (!deviceList || deviceList.length === 0) {
        setCameraError('Không tìm thấy camera khả dụng');
        setIsCameraLoading(false);
        return;
      }

      const formattedCameras: CameraDevice[] = deviceList.map((cam, idx) => {
        const label = cam.label || `Camera ${idx + 1}`;
        const isPhone = /phone|link|connected|virtual|droidcam|camo|iriun|rear|back|sau|external/i.test(label);
        return {
          id: cam.id,
          label: label,
          isPhoneOrExternal: isPhone,
        };
      });

      setCameras(formattedCameras);

      const preferredCam = formattedCameras.find((c) => c.isPhoneOrExternal) || formattedCameras[0];
      setSelectedCameraId(preferredCam.id);
      selectedCameraIdRef.current = preferredCam.id;

      await startCamera(preferredCam.id);
    } catch (err: any) {
      console.error('Lỗi khi lấy danh sách camera:', err);
      setIsCameraLoading(false);
      setCameraError('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
    }
  }, [startCamera]);

  useEffect(() => {
    initCamerasRef.current = initCameras;
  }, [initCameras]);

  // Quản lý mở/đóng Modal duy nhất theo activeModal (không phụ thuộc vào hàm con)
  useEffect(() => {
    if (activeModal === 'scan_cccd') {
      isProcessingRef.current = false;
      setError('');
      setCccdInput('');
      setScanSuccessId(null);
      setShowManualInput(false);
      showManualInputRef.current = false;

      // Khởi động camera khi mở modal
      initCamerasRef.current?.();
    } else {
      stopCameraRef.current?.();
    }

    return () => {
      stopCameraRef.current?.();
    };
  }, [activeModal]);

  // Tự động focus vào input khi mở chế độ bàn phím
  useEffect(() => {
    if (showManualInput) {
      isProcessingRef.current = false;
      const timer = setTimeout(() => {
        manualInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showManualInput]);

  // Chuyển sang chế độ nhập bàn phím
  const handleSwitchToManualMode = async () => {
    setError('');
    await stopCamera();
    setShowManualInput(true);
    showManualInputRef.current = true;
  };

  // Chuyển sang chế độ Camera
  const handleSwitchToCameraMode = async () => {
    setError('');
    setShowManualInput(false);
    showManualInputRef.current = false;
    if (selectedCameraIdRef.current) {
      await startCamera(selectedCameraIdRef.current);
    } else {
      await initCameras();
    }
  };

  // Xử lý khi người dùng đổi camera
  const handleSwitchCamera = async (newCameraId: string) => {
    setSelectedCameraId(newCameraId);
    selectedCameraIdRef.current = newCameraId;
    await startCamera(newCameraId);
  };

  const handleManualSubmit = () => {
    processCitizenIdSubmission(cccdInput);
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
      case 'pending_bills':
      case 'payment': return 'Thanh toán viện phí';
      default: return 'Xác thực căn cước công dân';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1E2939]/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in-0 duration-300 select-none"
    >
      <div className="bg-white w-full max-w-xl rounded-[36px] shadow-2xl overflow-hidden border border-neutral-100/50 flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-300">

        {/* Modal Header */}
        <div className="px-6 sm:px-8 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
          <button
            onClick={() => {
              stopCamera();
              closeModal();
            }}
            className="flex items-center gap-2 text-[#4A5565] hover:text-[#1E2939] font-bold text-sm sm:text-base transition-colors duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay lại
          </button>

          <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-[#155DFC] bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100/50">
            {getTargetTitle()}
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 flex flex-col items-center text-center space-y-3.5 overflow-y-auto max-h-[84vh]">

          {!showManualInput ? (
            /* CAMERA SCANNER VIEW */
            <div className="w-full flex flex-col items-center space-y-3.5">
              
              {/* Live Camera Viewfinder Box (16:9 Landscape Widescreen) */}
              <div className="relative w-full aspect-video max-w-lg rounded-3xl bg-slate-950 overflow-hidden shadow-2xl border-2 border-slate-800 flex items-center justify-center">

                {/* HTML5 QR Scanner Container */}
                <div
                  id="kiosk-cccd-reader"
                  className="cccd-qr-reader w-full h-full"
                />

                {/* Shutter Flash Animation khi chụp Snapshot */}
                {isSnapshotScanning && (
                  <div className="absolute inset-0 z-30 bg-white animate-out fade-out-0 duration-300 pointer-events-none flex items-center justify-center">
                    <div className="bg-black/70 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      <span>Đang phân tích hình ảnh...</span>
                    </div>
                  </div>
                )}

                {/* Loading Camera Indicator */}
                {isCameraLoading && (
                  <div className="absolute inset-0 z-20 bg-slate-950/90 flex flex-col items-center justify-center gap-3 text-white">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    <span className="text-xs font-semibold tracking-wide text-neutral-300">
                      Đang kết nối camera
                    </span>
                  </div>
                )}

                {/* Camera Error Message */}
                {cameraError && (
                  <div className="absolute inset-0 z-20 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                    <AlertCircle className="w-10 h-10 text-amber-400" />
                    <p className="text-xs font-medium text-neutral-300">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => initCameras()}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Thử lại
                    </button>
                  </div>
                )}

                {/* Scan Success Visual Flash */}
                {scanSuccessId && (
                  <div className="absolute inset-0 z-20 pointer-events-none bg-emerald-500/30 backdrop-blur-xs flex items-center justify-center animate-in zoom-in-95 duration-200">
                    <div className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2.5 font-black text-sm shadow-2xl">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                      <span>Đã nhận diện: {scanSuccessId}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Toolbar: Snapshot Button + Instructions */}
              <div className="flex items-center gap-3 w-full max-w-md justify-center">
                <button
                  type="button"
                  disabled={isCameraLoading || !!cameraError || isSnapshotScanning}
                  onClick={handleManualSnapshotScan}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>Chụp &amp; Quét ngay</span>
                </button>
              </div>

              <p className="text-xs text-neutral-400 font-semibold leading-relaxed max-w-sm">
                Đưa mã QR CCCD cách camera khoảng <strong className="text-neutral-700">10 – 20 cm</strong>. Bạn cũng có thể chọn nhập bằng bàn phím bên dưới.
              </p>

              {/* Switch to Manual Input */}
              <div className="w-full max-w-sm pt-1 border-t border-neutral-100 flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleSwitchToManualMode}
                  className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#155DFC] hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 px-5 py-2.5 rounded-full transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Keyboard className="w-4 h-4" />
                  <span>Chạm để nhập số CCCD bằng bàn phím</span>
                </button>
              </div>
            </div>
          ) : (
            /* MANUAL INPUT MODE (INTERACTIVE INPUT & TOUCH NUMERIC KEYPAD) */
            <div className="w-full max-w-md space-y-4 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
                  Nhập số căn cước công dân
                </span>
                <button
                  type="button"
                  onClick={handleSwitchToCameraMode}
                  className="text-xs font-bold text-[#155DFC] hover:underline cursor-pointer flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" /> Dùng Camera quét QR
                </button>
              </div>

              {/* Interactive Real Input Field */}
              <div className="space-y-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider">
                    Số CCCD / CMND ({cccdInput.length}/12)
                  </span>
                  {cccdInput.length === 12 && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Đủ 12 chữ số
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    ref={manualInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={12}
                    value={cccdInput}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
                      setCccdInput(digits);
                      isProcessingRef.current = false;
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
                    placeholder="Nhập 12 số CCCD..."
                    className="w-full bg-neutral-50 hover:bg-white focus:bg-white border-2 border-blue-300 focus:border-blue-600 rounded-2xl py-3.5 px-4 text-2xl sm:text-3xl font-black font-mono text-center tracking-widest text-[#155DFC] placeholder:text-neutral-300 placeholder:text-base placeholder:tracking-normal placeholder:font-sans outline-none shadow-inner transition-all select-text"
                    autoFocus
                  />
                </div>
              </div>

              {/* Touch Numeric Keypad */}
              <NumericKeypad
                onKeyPress={(num) => {
                  if (cccdInput.length < 12) {
                    setCccdInput((prev) => prev + num);
                    isProcessingRef.current = false;
                    setError('');
                  }
                }}
                onDelete={() => {
                  setCccdInput((prev) => prev.slice(0, -1));
                  isProcessingRef.current = false;
                  setError('');
                }}
                onClear={() => {
                  setCccdInput('');
                  isProcessingRef.current = false;
                  setError('');
                }}
                onSubmit={handleManualSubmit}
                submitLabel="Xác nhận CCCD"
                isSubmitDisabled={cccdInput.length !== 12}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Backend Validation / Error Message Box */}
          {error && (
            <div className="w-full max-w-lg bg-amber-50 border-2 border-amber-300 text-amber-950 p-4 rounded-2xl shadow-md text-left flex items-start gap-3.5 animate-in fade-in duration-300">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-xs font-black uppercase tracking-wider text-amber-900">
                  Thông báo từ hệ thống
                </p>
                <p className="text-xs sm:text-sm font-semibold text-amber-900 leading-relaxed">
                  {error}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-amber-700 hover:text-amber-950 text-xs font-bold px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors cursor-pointer shrink-0 font-mono text-xs"
              >
                ✕ Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
