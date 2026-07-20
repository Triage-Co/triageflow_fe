import { readFile } from 'node:fs/promises';
import path from 'node:path';

const SDK_ROOT = path.join(
    process.cwd(),
    'node_modules',
    '@ultranomic',
    'vnpt-ekyc-sdk',
    'dist',
);

const ALLOWED_FILES: Record<string, string> = {
    'lib/VNPTQRBrowserApp.js': 'application/javascript; charset=utf-8',
    'lib/VNPTBrowserSDKAppV4.1.0.js': 'application/javascript; charset=utf-8',
    'web-sdk-version-3.0.js': 'application/javascript; charset=utf-8',
};

export async function GET(
    _request: Request,
    context: { params: Promise<{ path: string[] }> },
) {
    const { path: segments } = await context.params;
    const relative = segments.join('/');
    const contentType = ALLOWED_FILES[relative];

    if (!contentType) {
        return new Response('Not found', { status: 404 });
    }

    const resolved = path.resolve(SDK_ROOT, relative);
    if (!resolved.startsWith(SDK_ROOT)) {
        return new Response('Not found', { status: 404 });
    }

    try {
        const body = await readFile(resolved);
        return new Response(body, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, immutable',
            },
        });
    } catch {
        return new Response('Not found', { status: 404 });
    }
}
