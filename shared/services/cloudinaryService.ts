/**
 * Cloudinary upload service — client-side only (unsigned upload).
 *
 * Uses an "unsigned" upload preset so the API Secret is never exposed
 * in the browser.  Configure the preset in:
 *   Cloudinary Dashboard → Settings → Upload → Upload presets → Add preset
 *   Mode: Unsigned, folder: triage/avatars (optional), allowed formats: jpg,png,webp
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export interface CloudinaryUploadResult {
    secure_url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
}

/**
 * Upload a single image file to Cloudinary via unsigned upload.
 * Returns the secure URL of the uploaded image.
 */
export async function uploadImageToCloudinary(file: File): Promise<CloudinaryUploadResult> {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error(
            'Cloudinary chưa được cấu hình. Kiểm tra NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME và NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET trong file .env'
        );
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'triage/avatars');

    const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            errorData?.error?.message || `Upload thất bại (HTTP ${response.status})`
        );
    }

    const data: CloudinaryUploadResult = await response.json();
    return data;
}

/**
 * Validate image file before upload.
 * Returns error message string, or null if valid.
 */
export function validateImageFile(file: File): string | null {
    const MAX_SIZE_MB = 5;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!ALLOWED_TYPES.includes(file.type)) {
        return 'Chỉ hỗ trợ định dạng JPG, PNG, WebP, GIF.';
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        return `Kích thước ảnh tối đa là ${MAX_SIZE_MB}MB.`;
    }

    return null;
}
