'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
    X,
    ScanLine,
    Loader2,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    Keyboard,
    ImagePlus,
    ShieldCheck,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { vnptService } from '@/modules/reception/services/vnptService';
import { buildVnptSdkLaunchConfig } from '@/modules/reception/services/vnptCredentials';
import type { VnptCredentials } from '@/modules/reception/types/vnpt.types';
import { mapEkycResultToCccd } from '@/modules/reception/utils/ekycResultMapper';
import { analyzeCccdImage } from '@/modules/reception/utils/cccdImageService';
import { parseCccdQr, type CccdScanResult } from '@/modules/reception/utils/cccdQrParser';
import { ensureVnptSdkLoaded } from '@/modules/reception/utils/vnptSdkLoader';

export type ScannerErrorCode =
    | 'NO_CAMERA'
    | 'PERMISSION_DENIED'
    | 'NOT_SUPPORTED'
    | 'START_FAILED'
    | 'INVALID_QR'
    | 'PARSE_ERROR'
    | 'EKYC_UNAVAILABLE'
    | 'EKYC_FAILED';

export interface ScannerError {
    code: ScannerErrorCode;
    message: string;
    hint?: string;
}

type ScanMode = 'ekyc' | 'quick';

interface CccdQrScannerProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (data: CccdScanResult) => void;
    onManualInput: () => void;
}

const ERROR_MESSAGES: Record<ScannerErrorCode, { message: string; hint: string }> = {
    NO_CAMERA: {
        message: 'Thiết bị không có camera hoặc camera không khả dụng.',
        hint: 'Hãy dùng thiết bị có camera hoặc chọn "Nhập thủ công".',
    },
    PERMISSION_DENIED: {
        message: 'Chưa được cấp quyền truy cập camera.',
        hint: 'Vào cài đặt trình duyệt → cho phép Camera cho trang web này, sau đó bấm "Quét lại".',
    },
    NOT_SUPPORTED: {
        message: 'Trình duyệt không hỗ trợ quét QR qua camera.',
        hint: 'Thử Chrome/Edge mới nhất hoặc nhập thủ công.',
    },
    START_FAILED: {
        message: 'Không thể khởi động camera.',
        hint: 'Đóng các tab đang dùng camera và thử lại.',
    },
    INVALID_QR: {
        message: 'Không tìm thấy mã QR trong khung hình.',
        hint: 'Đặt mã QR CCCD/VNeID vào giữa khung, giữ thẻ ổn định và đủ sáng.',
    },
    PARSE_ERROR: {
        message: 'Mã QR không hợp lệ.',
        hint: 'QR có thể bị mờ hoặc không phải CCCD/VNeID. Thử quét lại hoặc nhập thủ công.',
    },
    EKYC_UNAVAILABLE: {
        message: 'eKYC chưa sẵn sàng.',
        hint: 'Hệ thống chưa cấu hình VNPT eKYC. Dùng "Quét nhanh" hoặc nhập thủ công.',
    },
    EKYC_FAILED: {
        message: 'Xác thực eKYC thất bại.',
        hint: 'Thử lại với CCCD gốc, đủ sáng. Nếu gặp IDG-00000500, đợi vài phút rồi thử lại hoặc dùng "Quét nhanh".',
    },
};

function mapCameraError(err: unknown): ScannerError | null {
    if (isIgnorableMediaError(err)) return null;

    const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();

    if (msg.includes('notallowed') || msg.includes('permission')) {
        return { code: 'PERMISSION_DENIED', ...ERROR_MESSAGES.PERMISSION_DENIED };
    }
    if (msg.includes('notfound') || msg.includes('no camera') || msg.includes('requested device not found')) {
        return { code: 'NO_CAMERA', ...ERROR_MESSAGES.NO_CAMERA };
    }
    if (msg.includes('notsupported') || msg.includes('secure context')) {
        return { code: 'NOT_SUPPORTED', ...ERROR_MESSAGES.NOT_SUPPORTED };
    }
    return { code: 'START_FAILED', ...ERROR_MESSAGES.START_FAILED };
}

function isIgnorableMediaError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    if (err.name === 'AbortError') return true;
    return err.message.includes('play() request was interrupted');
}

function pauseReaderVideo(readerId: string) {
    const container = document.getElementById(readerId);
    const video = container?.querySelector('video');
    const stream = video?.srcObject;
    if (stream instanceof MediaStream) {
        stream.getTracks().forEach((track) => track.stop());
    }
    if (video) {
        video.pause();
        video.srcObject = null;
    }
}

async function resolveCameraId(Html5Qrcode: typeof import('html5-qrcode').Html5Qrcode): Promise<string> {
    const cameras = await Html5Qrcode.getCameras();
    if (!cameras?.length) {
        throw new Error('No camera found');
    }

    const backCamera = cameras.find((cam) =>
        /back|rear|environment|sau/i.test(cam.label),
    );
    if (backCamera) return backCamera.id;

    const frontCamera = cameras.find((cam) =>
        /front|user|trước|facetime|integrated/i.test(cam.label),
    );
    if (frontCamera) return frontCamera.id;

    return cameras[0].id;
}

export function CccdQrScanner({ open, onClose, onSuccess, onManualInput }: CccdQrScannerProps) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const uid = useId().replace(/:/g, '');
    const readerId = `cccd-qr-reader-${uid}`;
    const ekycContainerId = 'ekyc_sdk_intergrated';
    const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
    const handledRef = useRef(false);
    const startScannerRef = useRef<(() => Promise<void>) | null>(null);
    const scanTicksRef = useRef(0);
    const lastTickUiRef = useRef(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const ekycLaunchedRef = useRef(false);
    const scannerGenerationRef = useRef(0);

    const [mode, setMode] = useState<ScanMode>('ekyc');
    const [vnptCredentials, setVnptCredentials] = useState<VnptCredentials | null>(null);
    const [loadingCredentials, setLoadingCredentials] = useState(false);
    const [phase, setPhase] = useState<'starting' | 'scanning' | 'processing' | 'success'>('starting');
    const [error, setError] = useState<ScannerError | null>(null);
    const [scanTicks, setScanTicks] = useState(0);

    const stopScanner = useCallback(async () => {
        scannerGenerationRef.current += 1;
        const scanner = scannerRef.current;
        if (!scanner) return;

        pauseReaderVideo(readerId);

        try {
            if (scanner.isScanning) await scanner.stop();
            scanner.clear();
        } catch (err) {
            if (!isIgnorableMediaError(err)) {
                /* ignore expected teardown errors */
            }
        }
        scannerRef.current = null;
    }, [readerId]);

    const resetEkycContainer = useCallback(() => {
        const container = document.getElementById(ekycContainerId);
        if (container) container.innerHTML = '';
        ekycLaunchedRef.current = false;
    }, [ekycContainerId]);

    const handleDecoded = useCallback(
        async (raw: string, fromEkyc = false) => {
            if (handledRef.current) return;
            handledRef.current = true;
            setPhase('processing');
            setError(null);
            await stopScanner();
            resetEkycContainer();

            const parsed = parseCccdQr(raw);
            if (!parsed.ok) {
                setError({
                    code: 'PARSE_ERROR',
                    message: parsed.error.message,
                    hint: ERROR_MESSAGES.PARSE_ERROR.hint,
                });
                handledRef.current = false;
                if (mode === 'quick') await startScannerRef.current?.();
                return;
            }

            setPhase('success');
            setTimeout(() => {
                onSuccess({
                    ...parsed.data,
                    ekyc_verified: fromEkyc ? parsed.data.ekyc_verified : false,
                });
                onClose();
            }, 600);
        },
        [onSuccess, onClose, stopScanner, resetEkycContainer, mode],
    );

    const handleEkycResult = useCallback(
        (result: import('@ultranomic/vnpt-ekyc-sdk').EkycResult) => {
            if (handledRef.current) return;
            handledRef.current = true;
            setPhase('processing');
            setError(null);

            const mapped = mapEkycResultToCccd(result);
            if (!mapped) {
                setError({ code: 'EKYC_FAILED', ...ERROR_MESSAGES.EKYC_FAILED });
                handledRef.current = false;
                setPhase('starting');
                return;
            }

            setPhase('success');
            setTimeout(() => {
                onSuccess(mapped);
                onClose();
            }, 600);
        },
        [onSuccess, onClose],
    );

    const launchEkyc = useCallback(async () => {
        if (!vnptCredentials || ekycLaunchedRef.current) return;

        setError(null);
        setPhase('starting');
        handledRef.current = false;
        await stopScanner();
        resetEkycContainer();

        try {
            await ensureVnptSdkLoaded();

            const validation = await vnptService.validateCredentials();
            if (!validation.ok) {
                throw new Error(
                    validation.message?.toLowerCase().includes('invalid_token')
                        ? 'VNPT invalid_token: Token ID, Token Key và Access Token không khớp hoặc đã hết hạn. Vào portal VNPT eKYC lấy bộ key mới cùng lúc.'
                        : validation.message || 'VNPT credentials không hợp lệ.',
                );
            }

            const container = document.getElementById(ekycContainerId);
            if (!container) {
                throw new Error('eKYC container not ready');
            }

            if (!window.SDK?.launch) {
                throw new Error('VNPT SDK not available');
            }

            ekycLaunchedRef.current = true;

            window.SDK.launch({
                ...buildVnptSdkLaunchConfig(vnptCredentials),
                CUTOM_THEME: {
                    PRIMARY_COLOR: '#8B7CF6',
                    TEXT_COLOR_DEFAULT: '#1F2937',
                    BACKGROUND_COLOR: '#FFFFFF',
                },
                CALL_BACK_END_FLOW: handleEkycResult,
                CALL_BACK_DOCUMENT_RESULT: async (result) => {
                    const qrRaw =
                        (typeof result.qr_code === 'string' && result.qr_code) ||
                        (typeof result.dataBase64 === 'string' && result.dataBase64) ||
                        '';
                    if (qrRaw) {
                        const parsed = parseCccdQr(qrRaw);
                        if (parsed.ok) {
                            handleEkycResult({
                                ...result,
                                ocr: {
                                    ...result.ocr,
                                    id: result.ocr?.id || parsed.data.citizen_id,
                                    name: result.ocr?.name || parsed.data.full_name,
                                    birth_day: result.ocr?.birth_day || parsed.data.dob,
                                    gender: result.ocr?.gender || parsed.data.gender,
                                    recent_location:
                                        result.ocr?.recent_location || parsed.data.address,
                                    origin_location: result.ocr?.origin_location || parsed.data.address,
                                },
                            });
                        }
                    }
                },
            });

            setPhase('scanning');
        } catch (err) {
            ekycLaunchedRef.current = false;
            setError({
                code: 'EKYC_UNAVAILABLE',
                message: err instanceof Error ? err.message : ERROR_MESSAGES.EKYC_UNAVAILABLE.message,
                hint: ERROR_MESSAGES.EKYC_UNAVAILABLE.hint,
            });
            setPhase('starting');
        }
    }, [vnptCredentials, ekycContainerId, stopScanner, resetEkycContainer, handleEkycResult]);

    const startScanner = useCallback(async () => {
        const generation = scannerGenerationRef.current + 1;
        scannerGenerationRef.current = generation;

        setError(null);
        setPhase('starting');
        setScanTicks(0);
        scanTicksRef.current = 0;
        lastTickUiRef.current = 0;
        handledRef.current = false;
        resetEkycContainer();

        await stopScanner();
        if (scannerGenerationRef.current !== generation) return;

        if (!navigator.mediaDevices?.getUserMedia) {
            setError({ code: 'NOT_SUPPORTED', ...ERROR_MESSAGES.NOT_SUPPORTED });
            return;
        }

        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            if (scannerGenerationRef.current !== generation) return;

            const container = document.getElementById(readerId);
            if (!container) {
                throw new Error('Scanner container not ready');
            }

            const scanner = new Html5Qrcode(readerId, {
                verbose: false,
                useBarCodeDetectorIfSupported: true,
            });
            scannerRef.current = scanner;

            const cameraId = await resolveCameraId(Html5Qrcode);
            if (scannerGenerationRef.current !== generation) return;

            await scanner.start(
                { deviceId: { exact: cameraId } },
                {
                    fps: 15,
                    disableFlip: false,
                    videoConstraints: {
                        deviceId: { exact: cameraId },
                        width: { min: 640, ideal: 1920, max: 3840 },
                        height: { min: 480, ideal: 1080, max: 2160 },
                    },
                },
                (text) => {
                    void handleDecoded(text);
                },
                () => {
                    scanTicksRef.current += 1;
                    const now = Date.now();
                    if (now - lastTickUiRef.current > 400) {
                        lastTickUiRef.current = now;
                        setScanTicks(scanTicksRef.current);
                    }
                },
            );

            if (scannerGenerationRef.current !== generation) {
                await scanner.stop().catch(() => undefined);
                scanner.clear();
                scannerRef.current = null;
                return;
            }

            setPhase('scanning');
        } catch (err) {
            if (scannerGenerationRef.current !== generation || isIgnorableMediaError(err)) return;
            const mapped = mapCameraError(err);
            if (mapped) setError(mapped);
            setPhase('starting');
        }
    }, [readerId, handleDecoded, stopScanner, resetEkycContainer]);

    const handleImageUpload = useCallback(
        async (file: File) => {
            setError(null);
            setPhase('processing');
            await stopScanner();
            resetEkycContainer();

            try {
                const result = await analyzeCccdImage(file, accessToken);
                setPhase('success');
                setTimeout(() => {
                    onSuccess(result);
                    onClose();
                }, 600);
            } catch (err) {
                setError({
                    code: 'INVALID_QR',
                    message:
                        err instanceof Error
                            ? err.message
                            : 'Không phân tích được ảnh CCCD.',
                    hint: 'Chụp rõ mặt trước thẻ hoặc vùng mã QR, đủ sáng, không bị mờ.',
                });
                handledRef.current = false;
                if (mode === 'quick') await startScannerRef.current?.();
            }
        },
        [accessToken, stopScanner, resetEkycContainer, mode, onSuccess, onClose],
    );

    useEffect(() => {
        startScannerRef.current = startScanner;
    }, [startScanner]);

    useEffect(() => {
        if (!open) return;

        let cancelled = false;

        void (async () => {
            setLoadingCredentials(true);
            try {
                const creds = await vnptService.getCredentials(accessToken ?? undefined);
                if (cancelled) return;
                setVnptCredentials(creds);
                setMode(creds ? 'ekyc' : 'quick');
            } catch {
                if (cancelled) return;
                setVnptCredentials(null);
                setMode('quick');
            } finally {
                if (!cancelled) setLoadingCredentials(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open, accessToken]);

    useEffect(() => {
        if (!open) return;

        const timer = window.setTimeout(() => {
            if (mode === 'ekyc' && vnptCredentials) {
                void launchEkyc();
            } else if (mode === 'quick') {
                void startScanner();
            }
        }, 150);

        return () => {
            window.clearTimeout(timer);
        };
    }, [open, mode, vnptCredentials, launchEkyc, startScanner]);

    async function handleModeChange(nextMode: ScanMode) {
        if (nextMode === mode) return;
        await stopScanner();
        resetEkycContainer();
        setMode(nextMode);
    }

    async function handleClose() {
        await stopScanner();
        resetEkycContainer();
        onClose();
    }

    if (!open) return null;

    const showEkycTab = Boolean(vnptCredentials);

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm touch-manipulation">
            <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[100dvh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6]">
                    <div className="flex items-center gap-2">
                        <ScanLine className="w-5 h-5 text-[#8B7CF6]" />
                        <h2 className="text-[15px] font-bold text-[#1F2937]">Quét CCCD / VNeID</h2>
                    </div>
                    <button
                        type="button"
                        onClick={() => void handleClose()}
                        className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280] transition-colors"
                        aria-label="Đóng"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {showEkycTab && (
                    <div className="flex gap-2 px-5 pt-4">
                        <button
                            type="button"
                            onClick={() => void handleModeChange('ekyc')}
                            className={cn(
                                'flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] rounded-lg text-[12px] font-bold transition-colors',
                                mode === 'ekyc'
                                    ? 'bg-[#8B7CF6] text-white'
                                    : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]',
                            )}
                        >
                            <ShieldCheck className="w-4 h-4" />
                            eKYC xác thực
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleModeChange('quick')}
                            className={cn(
                                'flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] rounded-lg text-[12px] font-bold transition-colors',
                                mode === 'quick'
                                    ? 'bg-[#8B7CF6] text-white'
                                    : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]',
                            )}
                        >
                            <Zap className="w-4 h-4" />
                            Quét nhanh
                        </button>
                    </div>
                )}

                <div
                    className={cn(
                        'relative bg-[#111827] overflow-hidden',
                        mode === 'ekyc' ? 'min-h-[420px]' : 'aspect-square min-h-[320px]',
                    )}
                >
                    <div
                        id={ekycContainerId}
                        className={cn(
                            'cccd-ekyc-reader w-full min-h-[420px] bg-white',
                            mode !== 'ekyc' && 'hidden',
                        )}
                    />
                    <div
                        id={readerId}
                        className={cn(
                            'cccd-qr-reader w-full h-full min-h-[320px]',
                            mode !== 'quick' && 'hidden',
                        )}
                    />

                    {mode === 'quick' && phase === 'scanning' && (
                        <>
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-sm border border-[#8B7CF6]/50 shadow-lg">
                                <span className="cccd-scan-pulse-dot" />
                                <span className="text-[12px] font-bold text-white tracking-wide">
                                    Đang quét mã QR
                                </span>
                            </div>

                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 p-4">
                                <div className="cccd-scan-frame w-full h-full relative rounded-xl">
                                    <span className="cccd-scan-corner cccd-scan-corner-tl" />
                                    <span className="cccd-scan-corner cccd-scan-corner-tr" />
                                    <span className="cccd-scan-corner cccd-scan-corner-bl" />
                                    <span className="cccd-scan-corner cccd-scan-corner-br" />
                                    <div className="cccd-scan-line" />
                                </div>
                            </div>

                            <div className="absolute bottom-3 left-0 right-0 z-20 px-4">
                                <p className="text-[11px] font-semibold text-white/90 bg-black/55 backdrop-blur-sm px-3 py-1.5 rounded-full text-center">
                                    {scanTicks > 0
                                        ? 'Đưa QR góc phải CCCD vào khung hình'
                                        : 'Đang khởi động nhận diện...'}
                                </p>
                            </div>
                        </>
                    )}

                    {mode === 'ekyc' && phase === 'scanning' && (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#8B7CF6]/90 backdrop-blur-sm shadow-lg">
                            <ShieldCheck className="w-4 h-4 text-white" />
                            <span className="text-[12px] font-bold text-white">VNPT eKYC đang chạy</span>
                        </div>
                    )}

                    {(phase === 'starting' || phase === 'processing' || loadingCredentials) && (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3 z-30">
                            <Loader2 className="w-10 h-10 text-white animate-spin" />
                            <p className="text-white text-[13px] font-semibold text-center px-6">
                                {loadingCredentials
                                    ? 'Đang tải cấu hình eKYC...'
                                    : phase === 'starting'
                                        ? mode === 'ekyc'
                                            ? 'Đang khởi động VNPT eKYC...'
                                            : 'Đang mở camera...'
                                        : 'Đang xử lý kết quả...'}
                            </p>
                        </div>
                    )}

                    {phase === 'success' && (
                        <div className="absolute inset-0 bg-[#10B981]/80 flex flex-col items-center justify-center gap-2 z-30">
                            <CheckCircle2 className="w-14 h-14 text-white" />
                            <p className="text-white text-[14px] font-bold">
                                {mode === 'ekyc' ? 'Xác thực eKYC thành công!' : 'Quét thành công!'}
                            </p>
                        </div>
                    )}
                </div>

                <div className="px-5 py-3 bg-[#FAFAFA] border-b border-[#F3F4F6]">
                    <p className="text-[12px] text-[#6B7280] text-center leading-relaxed">
                        {mode === 'ekyc' ? (
                            <>
                                <strong className="text-[#8B7CF6]">eKYC VNPT</strong> — quét QR, OCR CCCD gắn chip,
                                kiểm tra liveness và so khớp khuôn mặt.
                            </>
                        ) : (
                            <>
                                Mã QR nằm <strong className="text-[#374151]">góc phải</strong> thẻ CCCD. Giữ cách
                                camera 15–25cm, đủ sáng.
                            </>
                        )}
                    </p>
                </div>

                {error && (
                    <div className="mx-5 mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[13px] font-semibold text-red-800">{error.message}</p>
                            {error.hint && (
                                <p className="text-[11px] text-red-600 mt-1 leading-relaxed">{error.hint}</p>
                            )}
                        </div>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleImageUpload(file);
                        e.target.value = '';
                    }}
                />
                <div className="flex gap-2 p-5 pt-4">
                    {mode === 'quick' && (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={phase === 'processing' || phase === 'success'}
                            className={cn(
                                'inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg',
                                'border border-[#E5E7EB] text-[#374151] text-[12px] font-bold',
                                'hover:bg-[#F9FAFB] transition-colors disabled:opacity-50',
                            )}
                        >
                            <ImagePlus className="w-4 h-4" />
                            Chụp ảnh
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            if (mode === 'ekyc') void launchEkyc();
                            else void startScanner();
                        }}
                        disabled={phase === 'processing' || phase === 'success' || loadingCredentials}
                        className={cn(
                            'flex-1 inline-flex items-center justify-center gap-2 py-3 min-h-[48px] rounded-lg',
                            'border border-[#8B7CF6] text-[#8B7CF6] text-[13px] font-bold touch-manipulation',
                            'hover:bg-[#F5F2FF] active:bg-[#EDE9FE] transition-colors disabled:opacity-50',
                        )}
                    >
                        <RefreshCw className="w-4 h-4" />
                        {mode === 'ekyc' ? 'Chạy lại eKYC' : 'Quét lại'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onManualInput();
                            void handleClose();
                        }}
                        className={cn(
                            'flex-1 inline-flex items-center justify-center gap-2 py-3 min-h-[48px] rounded-lg',
                            'bg-[#F3F4F6] text-[#374151] text-[13px] font-bold touch-manipulation',
                            'hover:bg-[#E5E7EB] active:bg-[#D1D5DB] transition-colors',
                        )}
                    >
                        <Keyboard className="w-4 h-4" />
                        Nhập thủ công
                    </button>
                </div>
            </div>
        </div>
    );
}

