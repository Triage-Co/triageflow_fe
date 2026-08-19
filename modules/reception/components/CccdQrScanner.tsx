'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Camera,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Keyboard,
  X,
  ScanLine,
} from 'lucide-react';
import { scanWithJsQREngine } from '@/modules/kiosk/utils/qrImageEnhancer';
import { parseCccdQr, type CccdScanResult } from '@/modules/reception/utils/cccdQrParser';

interface CameraDevice {
  id: string;
  label: string;
  isPhoneOrExternal: boolean;
}

interface CccdQrScannerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (data: CccdScanResult) => void;
  onManualInput?: () => void;
}

export function CccdQrScanner({
  open,
  onClose,
  onSuccess,
  onManualInput,
}: CccdQrScannerProps) {
  const [cccdInput, setCccdInput] = useState('');
  const [error, setError] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Camera states
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isCameraLoading, setIsCameraLoading] = useState(true);
  const [isSnapshotScanning, setIsSnapshotScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanSuccessData, setScanSuccessData] = useState<CccdScanResult | null>(null);

  const manualInputRef = useRef<HTMLInputElement | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const scannerRef = useRef<any>(null);
  const isScannerRunningRef = useRef<boolean>(false);
  const processingLoopRef = useRef<number | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // State refs để tránh re-trigger
  const showManualInputRef = useRef<boolean>(false);
  const selectedCameraIdRef = useRef<string>('');
  const startCameraRef = useRef<((id: string) => Promise<void>) | null>(null);
  const stopCameraRef = useRef<(() => Promise<void>) | null>(null);
  const initCamerasRef = useRef<(() => Promise<void>) | null>(null);
  const processDecodedRef = useRef<((rawText: string) => Promise<void>) | null>(null);

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

  // Xử lý chuỗi mã QR sau khi giải mã thành công
  const processDecodedText = useCallback(
    async (rawText: string) => {
      if (isProcessingRef.current) return;

      const parsed = parseCccdQr(rawText);
      if (!parsed.ok) {
        setError(parsed.error.message);
        return;
      }

      isProcessingRef.current = true;
      playBeepSound();
      setScanSuccessData(parsed.data);
      setError('');

      await stopCamera();

      setTimeout(() => {
        onSuccess(parsed.data);
        onClose();
      }, 500);
    },
    [onClose, onSuccess, stopCamera],
  );

  useEffect(() => {
    processDecodedRef.current = processDecodedText;
  }, [processDecodedText]);

  // Bộ lõi giải mã đa tầng siêu nhạy (BarcodeDetector + jsQR)
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

      const video = document.querySelector('#reception-cccd-reader video') as HTMLVideoElement | null;
      if (!video || video.readyState < 2 || video.paused || video.videoWidth === 0) return;

      const canvas = offscreenCanvasRef.current;
      if (!canvas) return;

      // 1. ENGINE 1: Native BarcodeDetector (Siêu tốc bằng phần cứng)
      if (barcodeDetector) {
        try {
          const rawCodes = await barcodeDetector.detect(video);
          if (rawCodes && rawCodes.length > 0 && rawCodes[0].rawValue) {
            processDecodedRef.current?.(rawCodes[0].rawValue);
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
          processDecodedRef.current?.(jsQrResult);
          return;
        }
      } catch {
        // Bỏ qua lỗi jsQR
      }
    }, 100);
  }, []);

  // Chức năng Snapshot tĩnh (Chụp & Quét ngay khi thẻ mờ/xa)
  const handleManualSnapshotScan = async () => {
    if (isSnapshotScanning || isProcessingRef.current) return;

    const video = document.querySelector('#reception-cccd-reader video') as HTMLVideoElement | null;
    if (!video || video.readyState < 2) return;

    setIsSnapshotScanning(true);
    setError('');

    try {
      const canvas = offscreenCanvasRef.current || document.createElement('canvas');

      const jsQrText = scanWithJsQREngine(video, canvas);
      if (jsQrText) {
        processDecodedRef.current?.(jsQrText);
        setIsSnapshotScanning(false);
        return;
      }

      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const results = await detector.detect(canvas).catch(() => []);
        if (results.length > 0 && results[0].rawValue) {
          processDecodedRef.current?.(results[0].rawValue);
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
                processDecodedRef.current?.(text);
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
  const startCamera = useCallback(
    async (cameraId: string) => {
      if (typeof window === 'undefined' || showManualInputRef.current) return;

      try {
        setIsCameraLoading(true);
        setCameraError(null);

        await stopCamera();

        const { Html5Qrcode } = await import('html5-qrcode');

        const readerElement = document.getElementById('reception-cccd-reader');
        if (!readerElement) {
          setIsCameraLoading(false);
          return;
        }

        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode('reception-cccd-reader', {
            verbose: false,
            useBarCodeDetectorIfSupported: true,
          });
        }

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
              processDecodedRef.current?.(decodedText);
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
    },
    [startAdvancedDecodingLoop, stopCamera]
  );

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

  // Quản lý mở/đóng Modal theo prop open
  useEffect(() => {
    if (open) {
      isProcessingRef.current = false;
      setError('');
      setCccdInput('');
      setScanSuccessData(null);
      setShowManualInput(false);
      showManualInputRef.current = false;

      initCamerasRef.current?.();
    } else {
      stopCameraRef.current?.();
    }

    return () => {
      stopCameraRef.current?.();
    };
  }, [open]);

  // Tự động focus khi chuyển sang chế độ nhập tay
  useEffect(() => {
    if (showManualInput) {
      isProcessingRef.current = false;
      const timer = setTimeout(() => {
        manualInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showManualInput]);

  const handleSwitchToManualMode = async () => {
    setError('');
    await stopCamera();
    setShowManualInput(true);
    showManualInputRef.current = true;
    onManualInput?.();
  };

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

  const handleSwitchCamera = async (newCameraId: string) => {
    setSelectedCameraId(newCameraId);
    selectedCameraIdRef.current = newCameraId;
    await startCamera(newCameraId);
  };

  const handleManualSubmit = () => {
    const cleanId = cccdInput.replace(/\D/g, '');
    if (cleanId.length !== 12 && cleanId.length !== 9) {
      setError('Số CCCD phải gồm đúng 12 chữ số (hoặc 9 số CMND cũ)');
      return;
    }
    processDecodedText(cleanId);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#1E293B]/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in-0 duration-200 select-none">
      <div className="bg-white w-full max-w-xl rounded-[28px] shadow-2xl overflow-hidden border border-neutral-100 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#8B7CF6]/10 flex items-center justify-center">
              <ScanLine className="w-4 h-4 text-[#8B7CF6]" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#1F2937]">Quét CCCD / VNeID</h2>
              <p className="text-[11px] text-[#9CA3AF]">Tự động nhận diện thông tin cá nhân</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-[#4B5563] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 flex flex-col items-center text-center space-y-4 overflow-y-auto max-h-[80vh]">
          
          {!showManualInput ? (
            /* CAMERA SCANNER VIEW */
            <div className="w-full flex flex-col items-center space-y-3.5">
              
              {/* Camera Selector Dropdown (nếu có nhiều hơn 1 camera) */}
              {cameras.length > 1 && (
                <div className="w-full flex items-center justify-between px-1">
                  <span className="text-[12px] font-medium text-[#6B7280]">Thiết bị camera:</span>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => handleSwitchCamera(e.target.value)}
                    className="text-[12px] font-semibold text-[#8B7CF6] bg-[#F5F3FF] border border-[#DDD6FE] rounded-lg px-2.5 py-1 outline-none cursor-pointer"
                  >
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Viewfinder Box (16:9 Landscape) */}
              <div className="relative w-full aspect-video max-w-lg rounded-2xl bg-slate-950 overflow-hidden shadow-xl border-2 border-slate-800 flex items-center justify-center">
                
                {/* HTML5 QR Scanner Container */}
                <div
                  id="reception-cccd-reader"
                  className="cccd-qr-reader w-full h-full"
                />

                {/* Shutter Flash Animation khi chụp Snapshot */}
                {isSnapshotScanning && (
                  <div className="absolute inset-0 z-30 bg-white animate-out fade-out-0 duration-300 pointer-events-none flex items-center justify-center">
                    <div className="bg-black/80 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#A78BFA]" />
                      <span>Đang phân tích hình ảnh...</span>
                    </div>
                  </div>
                )}

                {/* Loading Camera Indicator */}
                {isCameraLoading && (
                  <div className="absolute inset-0 z-20 bg-slate-950/90 flex flex-col items-center justify-center gap-2.5 text-white">
                    <Loader2 className="w-8 h-8 text-[#8B7CF6] animate-spin" />
                    <span className="text-xs font-semibold tracking-wide text-neutral-300">
                      Đang khởi động Camera...
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
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#8B7CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Thử lại
                    </button>
                  </div>
                )}

                {/* Scan Success Visual Flash */}
                {scanSuccessData && (
                  <div className="absolute inset-0 z-20 pointer-events-none bg-emerald-500/30 backdrop-blur-xs flex items-center justify-center animate-in zoom-in-95 duration-200">
                    <div className="bg-emerald-600 text-white px-5 py-3 rounded-2xl flex items-center gap-3 font-bold text-sm shadow-2xl">
                      <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                      <div className="text-left">
                        <p className="text-xs text-emerald-100">Đã nhận diện CCCD:</p>
                        <p className="text-sm font-black">{scanSuccessData.citizen_id}</p>
                        {scanSuccessData.full_name && (
                          <p className="text-xs font-medium text-emerald-100">{scanSuccessData.full_name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Toolbar: Snapshot Button */}
              <div className="flex items-center gap-3 w-full max-w-md justify-center pt-1">
                <button
                  type="button"
                  disabled={isCameraLoading || !!cameraError || isSnapshotScanning}
                  onClick={handleManualSnapshotScan}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#8B7CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-[#8B7CF6]/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>Chụp &amp; Quét ngay</span>
                </button>
              </div>

              <p className="text-xs text-neutral-400 font-medium leading-relaxed max-w-sm">
                Hướng mã QR trên thẻ CCCD hoặc ứng dụng VNeID vào giữa khung hình (khoảng cách 10 – 20 cm).
              </p>

              {/* Switch to Manual Input */}
              <div className="w-full max-w-sm pt-2 border-t border-neutral-100 flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleSwitchToManualMode}
                  className="flex items-center gap-2 text-xs font-bold text-[#8B7CF6] hover:text-[#7C3AED] bg-[#F5F3FF] hover:bg-[#EDE9FE] px-4 py-2 rounded-full transition-all cursor-pointer active:scale-95"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>Nhập số CCCD bằng bàn phím</span>
                </button>
              </div>
            </div>
          ) : (
            /* MANUAL INPUT MODE */
            <div className="w-full max-w-md space-y-4 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Nhập số CCCD / CMND
                </span>
                <button
                  type="button"
                  onClick={handleSwitchToCameraMode}
                  className="text-xs font-bold text-[#8B7CF6] hover:underline cursor-pointer flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" /> Dùng Camera quét QR
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-semibold text-neutral-400">
                    Số CCCD ({cccdInput.length}/12)
                  </span>
                  {cccdInput.length === 12 && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Đủ 12 chữ số
                    </span>
                  )}
                </div>

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
                    if (error) setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleManualSubmit();
                    }
                  }}
                  placeholder="Nhập 12 số CCCD..."
                  className="w-full bg-neutral-50 hover:bg-white focus:bg-white border-2 border-[#DDD6FE] focus:border-[#8B7CF6] rounded-2xl py-3 px-4 text-xl sm:text-2xl font-black font-mono text-center tracking-widest text-[#7C3AED] placeholder:text-neutral-300 placeholder:text-sm placeholder:font-sans outline-none transition-all select-text shadow-inner"
                  autoFocus
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCccdInput('')}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 text-xs font-bold hover:bg-neutral-50 transition-colors"
                >
                  Xóa nhập lại
                </button>
                <button
                  type="button"
                  disabled={cccdInput.length < 9}
                  onClick={handleManualSubmit}
                  className="px-4 py-2.5 rounded-xl bg-[#8B7CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-[#8B7CF6]/25 transition-all"
                >
                  Xác nhận số CCCD
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="w-full max-w-lg bg-amber-50 border border-amber-300 text-amber-950 p-3.5 rounded-xl shadow-xs text-left flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-amber-900">Thông báo</p>
                <p className="text-xs text-amber-800 leading-relaxed">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-amber-700 hover:text-amber-950 text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
