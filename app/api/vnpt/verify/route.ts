import { NextResponse } from 'next/server';
import { buildVnptHeaders } from '@/modules/reception/services/vnptOcrServer';
import { getEnvVnptCredentials } from '@/modules/reception/services/vnptCredentials';

const BACKENDS = [
    'https://sandbox-idg.vnpt.vn',
    'https://api.idg.vnpt.vn',
    'https://explorer.idg.vnpt.vn',
];

async function probeBackend(creds: NonNullable<ReturnType<typeof getEnvVnptCredentials>>, backendUrl: string) {
    const url = `${backendUrl}/file-service/v1/addFile?challengeCode=00000`;
    const formData = new FormData();
    const blob = new Blob(['vnpt-verify'], { type: 'text/plain' });
    formData.append('file', blob, 'verify.txt');
    formData.append('title', 'upload_file');
    formData.append('description', 'ic_upload_file');

    const res = await fetch(url, {
        method: 'POST',
        headers: buildVnptHeaders({ ...creds, backendUrl }),
        body: formData,
    });
    const json = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
        status?: string;
    };

    return {
        backendUrl,
        ok: res.ok,
        status: res.status,
        message: json.message || json.error || json.status || 'no message',
    };
}

export async function GET() {
    const creds = getEnvVnptCredentials();
    if (!creds?.accessToken) {
        return NextResponse.json({ ok: false, message: 'Missing VNPT credentials' }, { status: 503 });
    }

    const results = [];
    for (const backendUrl of BACKENDS) {
        try {
            results.push(await probeBackend(creds, backendUrl));
        } catch (err) {
            results.push({
                backendUrl,
                ok: false,
                status: 0,
                message: err instanceof Error ? err.message : 'probe failed',
            });
        }
    }

    const working = results.find((item) => item.ok);
    return NextResponse.json({
        ok: Boolean(working),
        recommendedBackend: working?.backendUrl ?? creds.backendUrl,
        tokenId: creds.tokenId,
        tokenKeyLength: creds.tokenKey.length,
        accessTokenLength: creds.accessToken?.length ?? 0,
        results,
    });
}
