'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  QrCode,
  Camera,
  Keyboard,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/lib/utils';
import { sanitizeStaffScanErrorMessage } from '@/shared/utils/apiError';

export interface StaffQRScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedCode: string) => Promise<{ message?: string } | void | any>;
  title?: string;
  subtitle?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  cameraOnly?: boolean;
}

export function StaffQRScanModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Quét mã QR',
  subtitle,
  inputLabel = 'Mã vé / Mã QR phiếu',
  inputPlaceholder = 'VD: TK-20260830-XXXX / RX-...',
  cameraOnly = false,
}: StaffQRScanModalProps) {
  const [ticketInput, setTicketInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');

  // Camera states
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);

  const scannerRef = useRef<any>(null);
  const isScannerRunningRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);
  const manualInputRef = useRef<HTMLInputElement | null>(null);

  const onScanSuccessRef = useRef(onScanSuccess);
  onScanSuccessRef.current = onScanSuccess;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const stopCamera = useCallback(async () => {
    if (scannerRef.current && isScannerRunningRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.warn('[StaffQRScanModal] Lỗi khi dừng camera scanner:', err);
      }
      isScannerRunningRef.current = false;
    }
  }, []);

  const handleProcessCode = useCallback(
    async (rawCode: string) => {
      const cleanCode = (rawCode || '').trim();
      if (!cleanCode || isProcessingRef.current) return;

      isProcessingRef.current = true;
      setIsProcessing(true);
      setError(null);

      try {
        await stopCamera();
        await onScanSuccessRef.current(cleanCode);
        onCloseRef.current();
      } catch (err: any) {
        console.error('[StaffQRScanModal] Lỗi khi xử lý mã quét:', err);
        const errMsg = sanitizeStaffScanErrorMessage(
          err?.response?.data?.message ||
            err?.response?.data?.detail ||
            err?.message ||
            'Không thể xử lý mã này. Vui lòng kiểm tra lại.',
        );
        setError(errMsg);
        isProcessingRef.current = false;
        setIsProcessing(false);

        if (mode === 'camera' || cameraOnly) {
          setTimeout(() => {
            startCamera();
          }, 1500);
        }
      }
    },
    [mode, cameraOnly, stopCamera],
  );

  const handleProcessCodeRef = useRef(handleProcessCode);
  handleProcessCodeRef.current = handleProcessCode;

  const startCamera = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      setIsCameraLoading(true);
      setCameraError(null);

      await stopCamera();

      const { Html5Qrcode } = await import('html5-qrcode');
      const readerElement = document.getElementById('shared-staff-qr-reader');
      if (!readerElement) {
        setIsCameraLoading(false);
        return;
      }

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('shared-staff-qr-reader', {
          verbose: false,
        });
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 20,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText: string) => {
          if (!isProcessingRef.current) {
            handleProcessCodeRef.current(decodedText);
          }
        },
        () => {},
      );

      isScannerRunningRef.current = true;
      setIsCameraLoading(false);
    } catch (err: any) {
      console.warn('[StaffQRScanModal] Lỗi khi mở camera:', err);
      setIsCameraLoading(false);
      isScannerRunningRef.current = false;
      setCameraError(
        'Không thể mở camera. Vui lòng cấp quyền truy cập camera cho trình duyệt.',
      );
      if (!cameraOnly) {
        setMode('manual');
      }
    }
  }, [stopCamera, cameraOnly]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setTicketInput('');
      isProcessingRef.current = false;
      setIsProcessing(false);

      if (mode === 'camera' || cameraOnly) {
        const timer = setTimeout(() => {
          startCamera();
        }, 100);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          manualInputRef.current?.focus();
        }, 150);
        return () => clearTimeout(timer);
      }
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, mode, cameraOnly, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-neutral-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/70 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-neutral-900">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] font-medium text-neutral-500">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Mode Switcher (Ẩn khi cameraOnly = true) */}
          {!cameraOnly && (
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-neutral-100/90 p-1.5 border border-neutral-200/50">
              <button
                type="button"
                onClick={() => setMode('camera')}
                className={cn(
                  'flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer select-none',
                  mode === 'camera'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/50',
                )}
              >
                <Camera className="h-4 w-4 shrink-0" />
                <span>Quét Camera</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={cn(
                  'flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer select-none',
                  mode === 'manual'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/50',
                )}
              >
                <Keyboard className="h-4 w-4 shrink-0" />
                <span>Nhập mã / Máy quét</span>
              </button>
            </div>
          )}

          {/* Camera View */}
          {(mode === 'camera' || cameraOnly) && (
            <div className="flex flex-col items-center space-y-3 pt-1">
              <div className="relative aspect-video w-full max-w-[320px] overflow-hidden rounded-2xl border-2 border-slate-800 bg-slate-950 shadow-inner">
                <div
                  id="shared-staff-qr-reader"
                  className="cccd-qr-reader absolute inset-0 w-full h-full"
                />

                {isCameraLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 text-white">
                    <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
                    <span className="text-xs font-medium">
                      Đang kết nối camera...
                    </span>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-white space-y-2 bg-slate-950/95">
                    <AlertCircle className="h-8 w-8 text-amber-400" />
                    <p className="text-xs text-neutral-300">{cameraError}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startCamera()}
                      className="text-xs text-white border-slate-700 bg-slate-800 hover:bg-slate-700 cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> Thử lại
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-neutral-500 text-center font-medium">
                Đưa mã QR trên đơn thuốc / phiếu khám vào giữa khung hình
              </p>
            </div>
          )}

          {/* Manual Input View (Chỉ khi !cameraOnly && mode === 'manual') */}
          {!cameraOnly && mode === 'manual' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700">
                  {inputLabel}
                </label>
                <div className="relative">
                  <input
                    ref={manualInputRef}
                    type="text"
                    value={ticketInput}
                    onChange={(e) => {
                      setTicketInput(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleProcessCode(ticketInput);
                      }
                    }}
                    placeholder={inputPlaceholder}
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2.5 text-xs font-mono font-bold text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    autoFocus
                  />
                  <Search className="absolute right-3.5 top-2.5 h-4 w-4 text-neutral-400" />
                </div>
              </div>

              <Button
                type="button"
                className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                disabled={!ticketInput.trim() || isProcessing}
                onClick={() => handleProcessCode(ticketInput)}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                    Đang xử lý...
                  </>
                ) : (
                  'Xác nhận tra cứu'
                )}
              </Button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="font-semibold">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
