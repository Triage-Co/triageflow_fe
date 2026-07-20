declare module 'html5-qrcode' {
    export interface Html5QrcodeCamera {
        id: string;
        label: string;
    }

    export class Html5Qrcode {
        constructor(elementId: string, config?: { verbose?: boolean; useBarCodeDetectorIfSupported?: boolean });
        static getCameras(): Promise<Html5QrcodeCamera[]>;
        readonly isScanning: boolean;
        start(
            cameraConfig: { deviceId?: { exact: string } },
            config: {
                fps?: number;
                disableFlip?: boolean;
                videoConstraints?: Record<string, unknown>;
            },
            onSuccess: (decodedText: string) => void,
            onFailure?: (errorMessage: string) => void,
        ): Promise<void>;
        stop(): Promise<void>;
        scanFile(file: File, showImage?: boolean): Promise<string>;
        clear(): void;
    }
}
