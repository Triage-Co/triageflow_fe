declare module 'html5-qrcode' {
    export interface Html5QrcodeCamera {
        id: string;
        label: string;
    }

    export enum Html5QrcodeScannerState {
        UNKNOWN = 0,
        NOT_STARTED = 1,
        SCANNING = 2,
        PAUSED = 3,
    }

    export interface Html5QrcodeCameraScanConfig {
        fps?: number;
        qrbox?:
        | number
        | {
            width: number;
            height: number;
        }
        | ((viewfinderWidth: number, viewfinderHeight: number) => { width: number; height: number });
        disableFlip?: boolean;
        videoConstraints?: Record<string, unknown>;
    }

    export class Html5Qrcode {
        constructor(elementId: string, config?: { verbose?: boolean; useBarCodeDetectorIfSupported?: boolean });
        static getCameras(): Promise<Html5QrcodeCamera[]>;
        readonly isScanning: boolean;
        getState(): Html5QrcodeScannerState;
        start(
            cameraConfig: string | MediaTrackConstraints,
            config: Html5QrcodeCameraScanConfig,
            onSuccess: (decodedText: string) => void,
            onFailure?: (errorMessage: string) => void,
        ): Promise<void>;
        stop(): Promise<void>;
        scanFile(file: File, showImage?: boolean): Promise<string>;
        clear(): void;
    }
}

declare module 'qrcode.react' {
    import React from 'react';
    export interface QRCodeProps {
        value: string;
        size?: number;
        bgColor?: string;
        fgColor?: string;
        level?: 'L' | 'M' | 'Q' | 'H';
        includeMargin?: boolean;
        imageSettings?: {
            src: string;
            x?: number;
            y?: number;
            height?: number;
            width?: number;
            excavate?: boolean;
        };
        className?: string;
        style?: React.CSSProperties;
    }
    export const QRCodeSVG: React.FC<QRCodeProps>;
    export const QRCodeCanvas: React.FC<QRCodeProps>;
}
