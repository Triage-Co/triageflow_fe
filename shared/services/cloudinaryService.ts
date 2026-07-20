/**
 * Helper to upload image files to Cloudinary using unsigned upload preset,
 * falling back to Base64 data URL if Cloudinary credentials are unavailable or request fails.
 */
export async function uploadImageToCloudinary(file: File): Promise<string> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (cloudName && uploadPreset) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);

            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (res.ok && data.secure_url) {
                return data.secure_url;
            }

            console.warn('[Cloudinary] Upload returned error, using Base64 fallback:', data);
        } catch (err) {
            console.warn('[Cloudinary] Fetch error, using Base64 fallback:', err);
        }
    }

    // Fallback: Read file as Base64 Data URL
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}
