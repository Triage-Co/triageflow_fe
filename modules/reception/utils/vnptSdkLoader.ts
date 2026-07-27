const LOTTIE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.7.4/lottie.min.js';

const VNPT_SCRIPTS = [
    '/vendor/vnpt/lib/VNPTQRBrowserApp.js',
    '/vendor/vnpt/lib/VNPTBrowserSDKAppV4.1.0.js',
    '/vendor/vnpt/web-sdk-version-3.0.js',
] as const;

interface VnptQrBrowserSdk {
    createInstance(): void;
}

interface FaceVnptBrowserSdk {
    init(): void;
}

declare global {
    interface Window {
        lottie?: { loadAnimation?: (...args: unknown[]) => unknown };
        VNPTQRBrowserSDK?: VnptQrBrowserSdk;
    }
}

type RuntimeWindow = Window & {
    SDK?: { launch?: (...args: unknown[]) => unknown };
    FaceVNPTBrowserSDK?: FaceVnptBrowserSdk;
};

function hasVnptSdkReady(runtimeWindow: RuntimeWindow): boolean {
    const globalBag = runtimeWindow as unknown as Record<string, unknown>;
    const sdk = globalBag.SDK as { launch?: unknown } | undefined;
    const qrSdk = globalBag.VNPTQRBrowserSDK;
    const faceSdk = globalBag.FaceVNPTBrowserSDK;

    return typeof sdk?.launch === 'function' && Boolean(qrSdk) && Boolean(faceSdk);
}

let loadPromise: Promise<void> | null = null;

function loadScript(src: string, id: string): Promise<void> {
    const existing = document.querySelector(
        `script[data-vnpt-script="${id}"]`,
    ) as HTMLScriptElement | null;

    if (existing?.dataset.loaded === 'true') {
        return Promise.resolve();
    }

    if (existing) {
        return new Promise<void>((resolve, reject) => {
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), {
                once: true,
            });
        });
    }

    return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.dataset.vnptScript = id;
        script.onload = () => {
            script.dataset.loaded = 'true';
            resolve();
        };
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

async function ensureLottieLoaded(): Promise<void> {
    if (window.lottie?.loadAnimation) return;

    await loadScript(LOTTIE_SRC, 'lottie');

    for (let attempt = 0; attempt < 30; attempt += 1) {
        if (window.lottie?.loadAnimation) return;
        await new Promise((resolve) => window.setTimeout(resolve, 100));
    }

    throw new Error('Lottie chưa sẵn sàng cho VNPT eKYC');
}

async function waitForVnptGlobals(): Promise<void> {
    const runtimeWindow = window as RuntimeWindow;
    for (let attempt = 0; attempt < 50; attempt += 1) {
        if (hasVnptSdkReady(runtimeWindow)) {
            return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 100));
    }

    throw new Error('VNPT eKYC SDK chưa sẵn sàng (thiếu QR/Face browser SDK)');
}

async function loadVnptSdkScripts(): Promise<void> {
    await ensureLottieLoaded();

    for (const src of VNPT_SCRIPTS) {
        const id = src.split('/').pop() ?? src;
        await loadScript(src, id);
    }

    await waitForVnptGlobals();
}

export function ensureVnptSdkLoaded(): Promise<void> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('VNPT eKYC chỉ chạy trên trình duyệt'));
    }

    const runtimeWindow = window as RuntimeWindow;

    if (hasVnptSdkReady(runtimeWindow)) {
        return Promise.resolve();
    }

    if (!loadPromise) {
        loadPromise = loadVnptSdkScripts().catch((err) => {
            loadPromise = null;
            throw err;
        });
    }

    return loadPromise;
}
