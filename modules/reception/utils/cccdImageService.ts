import { parseCccdQr, type CccdScanResult } from '@/modules/reception/utils/cccdQrParser';

async function scanQrFromImage(file: File): Promise<CccdScanResult | null> {
    const tempId = `cccd-img-scan-${Date.now()}`;
    const container = document.createElement('div');
    container.id = tempId;
    container.style.display = 'none';
    document.body.appendChild(container);

    try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const scanner = new Html5Qrcode(tempId, {
            verbose: false,
            useBarCodeDetectorIfSupported: true,
        });
        const text = await scanner.scanFile(file, false);
        scanner.clear();

        const parsed = parseCccdQr(text);
        return parsed.ok ? parsed.data : null;
    } catch {
        return null;
    } finally {
        container.remove();
    }
}

async function ocrFromImageViaServer(
    file: File,
    accessToken?: string | null,
): Promise<CccdScanResult | null> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (accessToken?.trim()) {
        headers.Authorization = `Bearer ${accessToken.trim()}`;
    }

    const res = await fetch('/api/vnpt/ocr', {
        method: 'POST',
        headers,
        body: formData,
    });

    const json = (await res.json().catch(() => ({}))) as {
        data?: CccdScanResult;
        message?: string;
    };

    if (!res.ok) {
        throw new Error(json.message || 'OCR thất bại.');
    }

    return json.data ?? null;
}

export async function analyzeCccdImage(
    file: File,
    _accessToken?: string | null,
): Promise<CccdScanResult> {
    const qrResult = await scanQrFromImage(file);
    if (qrResult) {
        return { ...qrResult, ekyc_verified: false };
    }

    try {
        const ocrResult = await ocrFromImageViaServer(file, _accessToken);
        if (ocrResult) return ocrResult;
    } catch (err) {
        const message = err instanceof Error ? err.message : 'OCR thất bại.';
        throw new Error(message);
    }

    throw new Error(
        'Không đọc được QR hoặc OCR từ ảnh. Hãy chụp rõ mặt trước CCCD (hoặc vùng mã QR) và thử lại.',
    );
}
