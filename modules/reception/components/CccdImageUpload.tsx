'use client';

import { useRef, useState, useTransition } from 'react';
import { Camera, ImagePlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { analyzeCccdImage } from '@/modules/reception/utils/cccdImageService';
import type { CccdScanResult } from '@/modules/reception/utils/cccdQrParser';

interface CccdImageUploadProps {
    accessToken?: string | null;
    onSuccess: (data: CccdScanResult) => void | Promise<void>;
    onError?: (message: string) => void;
    disabled?: boolean;
    className?: string;
    variant?: 'card' | 'inline';
}

export function CccdImageUpload({
    accessToken,
    onSuccess,
    onError,
    disabled = false,
    className,
    variant = 'card',
}: CccdImageUploadProps) {
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const [isPending, startTransition] = useTransition();
    const [preview, setPreview] = useState<string | null>(null);

    function handleFile(file: File | undefined) {
        if (!file || disabled || isPending) return;

        setPreview(URL.createObjectURL(file));
        startTransition(async () => {
            try {
                const result = await analyzeCccdImage(file, accessToken);
                await onSuccess(result);
            } catch (err) {
                onError?.(
                    err instanceof Error
                        ? err.message
                        : 'Không phân tích được ảnh CCCD. Vui lòng thử lại.',
                );
            }
        });
    }

    if (variant === 'inline') {
        return (
            <div className={cn('flex gap-2', className)}>
                <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                        handleFile(e.target.files?.[0]);
                        e.target.value = '';
                    }}
                />
                <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        handleFile(e.target.files?.[0]);
                        e.target.value = '';
                    }}
                />
                <button
                    type="button"
                    disabled={disabled || isPending}
                    onClick={() => cameraInputRef.current?.click()}
                    className="inline-flex flex-1 items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg border border-[#E5E7EB] bg-white text-[#374151] text-[12px] font-bold hover:bg-[#F9FAFB] disabled:opacity-50"
                >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    Chụp CCCD
                </button>
                <button
                    type="button"
                    disabled={disabled || isPending}
                    onClick={() => galleryInputRef.current?.click()}
                    className="inline-flex flex-1 items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg border border-[#8B7CF6] bg-[#F5F2FF] text-[#8B7CF6] text-[12px] font-bold hover:bg-[#EDE9FE] disabled:opacity-50"
                >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                    Tải ảnh
                </button>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'rounded-[12px] border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_6px_rgba(0,0,0,0.04)]',
                className,
            )}
        >
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                    handleFile(e.target.files?.[0]);
                    e.target.value = '';
                }}
            />
            <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    handleFile(e.target.files?.[0]);
                    e.target.value = '';
                }}
            />

            <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
                    <ImagePlus className="w-5 h-5 text-[#2563EB]" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-[#1F2937]">Chụp / tải ảnh CCCD</p>
                    <p className="text-[12px] text-[#6B7280] mt-1 leading-relaxed">
                        Tự động đọc QR hoặc OCR mặt trước thẻ, rồi điền họ tên, CCCD, ngày sinh, giới tính.
                    </p>
                </div>
            </div>

            {preview && (
                <div className="mt-3 rounded-lg overflow-hidden border border-[#E5E7EB] bg-[#F9FAFB]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Ảnh CCCD đã chọn" className="w-full max-h-40 object-contain" />
                </div>
            )}

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <button
                    type="button"
                    disabled={disabled || isPending}
                    onClick={() => cameraInputRef.current?.click()}
                    className="inline-flex flex-1 items-center justify-center gap-2 min-h-[48px] px-4 rounded-lg bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-[13px] font-bold transition-colors disabled:opacity-50"
                >
                    {isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Camera className="w-4 h-4" />
                    )}
                    {isPending ? 'Đang phân tích...' : 'Chụp ảnh CCCD'}
                </button>
                <button
                    type="button"
                    disabled={disabled || isPending}
                    onClick={() => galleryInputRef.current?.click()}
                    className="inline-flex flex-1 items-center justify-center gap-2 min-h-[48px] px-4 rounded-lg border border-[#E5E7EB] bg-white text-[#374151] text-[13px] font-bold hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
                >
                    <ImagePlus className="w-4 h-4" />
                    Chọn từ thư viện
                </button>
            </div>
        </div>
    );
}
