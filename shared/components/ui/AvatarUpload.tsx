'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Camera, Loader2, AlertCircle, CheckCircle, X, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadImageToCloudinary, validateImageFile } from '@/shared/services/cloudinaryService';

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface AvatarUploadProps {
    /** Current avatar URL (displayed as preview before user selects a new file) */
    currentAvatarUrl?: string | null;
    /** User's display name — used to generate initials fallback */
    displayName?: string;
    /** Called with the Cloudinary URL after a successful upload */
    onUploadSuccess: (url: string) => void;
    /** Called when upload fails */
    onUploadError?: (error: string) => void;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Whether the upload is disabled (e.g. parent form is submitting) */
    disabled?: boolean;
    /** Extra class for the outer wrapper */
    className?: string;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function getInitials(name?: string): string {
    if (!name) return '?';
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join('');
}

const SIZE_MAP = {
    sm: { avatar: 'w-16 h-16', icon: 'w-4 h-4', badge: 'w-6 h-6', text: 'text-lg' },
    md: { avatar: 'w-24 h-24', icon: 'w-5 h-5', badge: 'w-8 h-8', text: 'text-2xl' },
    lg: { avatar: 'w-32 h-32', icon: 'w-6 h-6', badge: 'w-10 h-10', text: 'text-3xl' },
};

/* ─── Component ──────────────────────────────────────────────────────────── */

/**
 * AvatarUpload — a reusable avatar picker + Cloudinary uploader.
 *
 * Usage:
 *   <AvatarUpload
 *     currentAvatarUrl={profile.avatar}
 *     displayName={profile.user_name}
 *     onUploadSuccess={(url) => setFormField('avatar', url)}
 *   />
 *
 * Works for any authenticated role: ADMIN, DOCTOR, NURSE, RECEPTIONIST, etc.
 * Cloudinary credentials are read from NEXT_PUBLIC_* env variables, never
 * hardcoded or exposed as API secrets.
 */
export function AvatarUpload({
    currentAvatarUrl,
    displayName,
    onUploadSuccess,
    onUploadError,
    size = 'md',
    disabled = false,
    className,
}: AvatarUploadProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadState, setUploadState] = useState<UploadState>('idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const sizes = SIZE_MAP[size];

    const displayUrl = previewUrl ?? currentAvatarUrl;

    const resetState = useCallback(() => {
        setUploadState('idle');
        setErrorMsg(null);
        setPreviewUrl(null);
        setProgress(0);
    }, []);

    const handleFileSelect = useCallback(
        async (file: File) => {
            // Validate
            const validationError = validateImageFile(file);
            if (validationError) {
                setErrorMsg(validationError);
                setUploadState('error');
                onUploadError?.(validationError);
                return;
            }

            // Local preview
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
            setUploadState('uploading');
            setErrorMsg(null);

            // Simulate progress (Cloudinary doesn't give progress events on fetch)
            const progressInterval = setInterval(() => {
                setProgress((p) => Math.min(p + 12, 85));
            }, 200);

            try {
                const result = await uploadImageToCloudinary(file);
                clearInterval(progressInterval);
                setProgress(100);
                setUploadState('success');
                onUploadSuccess(result.secure_url);
                // Replace blob URL with real URL for memory cleanup
                URL.revokeObjectURL(objectUrl);
                setPreviewUrl(result.secure_url);
            } catch (err) {
                clearInterval(progressInterval);
                URL.revokeObjectURL(objectUrl);
                setPreviewUrl(null);
                const msg = err instanceof Error ? err.message : 'Upload thất bại. Thử lại sau.';
                setErrorMsg(msg);
                setUploadState('error');
                onUploadError?.(msg);
            } finally {
                setProgress(0);
            }
        },
        [onUploadSuccess, onUploadError],
    );

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
            // Reset input so the same file can be re-selected if needed
            e.target.value = '';
        },
        [handleFileSelect],
    );

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            if (disabled || uploadState === 'uploading') return;
            const file = e.dataTransfer.files?.[0];
            if (file) handleFileSelect(file);
        },
        [disabled, uploadState, handleFileSelect],
    );

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const isUploading = uploadState === 'uploading';

    return (
        <div className={cn('flex flex-col items-center gap-3', className)}>
            {/* ── Avatar circle ── */}
            <div
                className="relative group"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                {/* Avatar image / initials */}
                <div
                    className={cn(
                        'rounded-full overflow-hidden border-2 ring-4 ring-brand-100/60 flex items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 select-none transition-all duration-200',
                        sizes.avatar,
                        isUploading ? 'opacity-70' : '',
                        !disabled && !isUploading
                            ? 'group-hover:ring-brand-300 cursor-pointer'
                            : 'cursor-default',
                        uploadState === 'success' ? 'border-green-400' : 'border-white',
                        uploadState === 'error' ? 'border-red-400' : '',
                    )}
                    onClick={() => {
                        if (!disabled && !isUploading) inputRef.current?.click();
                    }}
                >
                    {displayUrl ? (
                        <Image
                            src={displayUrl}
                            alt={displayName ?? 'Avatar'}
                            width={128}
                            height={128}
                            className="w-full h-full object-cover"
                            unoptimized
                        />
                    ) : (
                        <span className={cn('font-bold text-white', sizes.text)}>
                            {getInitials(displayName)}
                        </span>
                    )}

                    {/* Upload progress overlay */}
                    {isUploading && (
                        <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center gap-1">
                            <Loader2 className={cn('text-white animate-spin', sizes.icon)} />
                            <span className="text-white text-[10px] font-bold">{progress}%</span>
                        </div>
                    )}

                    {/* Hover overlay (only when not uploading) */}
                    {!isUploading && !disabled && (
                        <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Camera className={cn('text-white', sizes.icon)} />
                        </div>
                    )}
                </div>

                {/* Badge indicator */}
                {uploadState === 'success' && (
                    <div
                        className={cn(
                            'absolute -bottom-1 -right-1 rounded-full bg-green-500 flex items-center justify-center border-2 border-white shadow-sm',
                            sizes.badge,
                        )}
                    >
                        <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                )}
                {uploadState === 'error' && (
                    <div
                        className={cn(
                            'absolute -bottom-1 -right-1 rounded-full bg-red-500 flex items-center justify-center border-2 border-white shadow-sm cursor-pointer',
                            sizes.badge,
                        )}
                        onClick={resetState}
                    >
                        <X className="w-3 h-3 text-white" />
                    </div>
                )}
                {uploadState === 'idle' && !disabled && (
                    <div
                        className={cn(
                            'absolute -bottom-1 -right-1 rounded-full bg-brand-500 flex items-center justify-center border-2 border-white shadow-sm cursor-pointer hover:bg-brand-600 transition-colors',
                            sizes.badge,
                        )}
                        onClick={() => inputRef.current?.click()}
                    >
                        <Camera className="w-3 h-3 text-white" />
                    </div>
                )}
            </div>

            {/* ── Upload button / hint ── */}
            {!disabled && (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={isUploading}
                    className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all',
                        isUploading
                            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                            : 'bg-brand-50 text-brand-600 hover:bg-brand-100 cursor-pointer',
                    )}
                >
                    <Upload className="w-3.5 h-3.5" />
                    {isUploading ? 'Đang tải lên...' : 'Thay đổi ảnh'}
                </button>
            )}

            {/* ── Error message ── */}
            {uploadState === 'error' && errorMsg && (
                <div className="flex items-start gap-1.5 px-3 py-2 bg-red-50 rounded-lg max-w-[200px]">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-red-600 font-medium">{errorMsg}</p>
                </div>
            )}

            {/* ── Success message ── */}
            {uploadState === 'success' && (
                <p className="text-[11px] text-green-600 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Ảnh đã được tải lên
                </p>
            )}

            {/* ── Hint ── */}
            {uploadState === 'idle' && (
                <p className="text-[11px] text-[#9C9C9C] text-center">
                    JPG, PNG, WebP · Tối đa 5MB
                </p>
            )}

            {/* Hidden file input */}
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleInputChange}
                disabled={disabled || isUploading}
            />
        </div>
    );
}
