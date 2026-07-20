import { NextResponse } from 'next/server';
import {
    getEnvVnptCredentials,
    mapVnptCredentials,
} from '@/modules/reception/services/vnptCredentials';
import type { VnptKeyPayload } from '@/modules/reception/types/vnpt.types';

export async function GET() {
    const fromEnv = getEnvVnptCredentials();
    if (fromEnv) {
        return NextResponse.json({ data: fromEnv });
    }

    return NextResponse.json(
        { message: 'VNPT key chưa cấu hình trong môi trường local.' },
        { status: 503 },
    );
}

export async function POST(request: Request) {
    const json = (await request.json().catch(() => ({}))) as {
        data?: VnptKeyPayload | VnptKeyPayload[];
    };
    const raw = json.data;
    const payload = Array.isArray(raw) ? raw[0] : raw;
    const creds = payload && typeof payload === 'object' ? mapVnptCredentials(payload) : null;

    if (!creds) {
        return NextResponse.json({ message: 'Payload VNPT key không hợp lệ.' }, { status: 400 });
    }

    return NextResponse.json({ data: creds });
}
