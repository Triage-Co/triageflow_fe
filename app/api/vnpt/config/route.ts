import { NextResponse } from 'next/server';
import { getEnvVnptCredentials } from '@/modules/reception/services/vnptCredentials';

export async function GET() {
    const creds = getEnvVnptCredentials();
    if (!creds?.accessToken || !creds.tokenId || !creds.tokenKey) {
        return NextResponse.json(
            { message: 'VNPT local env chưa cấu hình đủ (TOKEN_ID, TOKEN_KEY, ACCESS_TOKEN).' },
            { status: 503 },
        );
    }

    return NextResponse.json({ data: creds });
}
