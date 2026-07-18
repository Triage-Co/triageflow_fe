import { NextResponse } from 'next/server';
import {
    ocrCccdFront,
    resolveServerVnptCredentials,
    uploadImageToVnpt,
} from '@/modules/reception/services/vnptOcrServer';
import { mapVnptOcrToCccd } from '@/modules/reception/utils/vnptOcrMapper';

function extractBearerToken(request: Request): string | undefined {
    const header = request.headers.get('Authorization');
    if (!header) return undefined;
    return header.replace(/^Bearer\s+/i, '').trim() || undefined;
}

export async function POST(request: Request) {
    try {
        const bearerToken = extractBearerToken(request);
        const creds = await resolveServerVnptCredentials(bearerToken);
        if (!creds?.accessToken) {
            return NextResponse.json(
                {
                    message:
                        'VNPT OCR chưa cấu hình. Cấu hình NEXT_PUBLIC_VNPT_* trong .env.local hoặc đăng nhập lễ tân để BE cấp key qua /api/vnpt/key.',
                },
                { status: 503 },
            );
        }

        const formData = await request.formData();
        const file = formData.get('file');
        if (!(file instanceof Blob) || file.size === 0) {
            return NextResponse.json({ message: 'Thiếu file ảnh CCCD.' }, { status: 400 });
        }

        const filename =
            file instanceof File && file.name ? file.name : `cccd-${Date.now()}.jpg`;
        const { hash, creds: activeCreds } = await uploadImageToVnpt(
            file,
            filename,
            creds,
            bearerToken,
        );
        const ocr = await ocrCccdFront(hash, activeCreds);
        const mapped = ocr ? mapVnptOcrToCccd(ocr) : null;

        if (!mapped) {
            return NextResponse.json(
                { message: 'OCR không đọc được thông tin CCCD từ ảnh.' },
                { status: 422 },
            );
        }

        return NextResponse.json({ data: mapped });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'VNPT OCR thất bại.';
        const isAuth =
            message.includes('401') ||
            message.toLowerCase().includes('unauthorized') ||
            message.includes('IDG-00000401');
        return NextResponse.json({ message }, { status: isAuth ? 401 : 500 });
    }
}
