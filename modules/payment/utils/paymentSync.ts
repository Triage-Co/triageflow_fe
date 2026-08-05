export interface MedicineDisplayItem {
    medicine_code?: string;
    medicine_name: string;
    active_ingredient?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    sub_total: number;
    dosage_instruction?: string;
}

export interface PatientDisplaySyncPayload {
    status: 'idle' | 'active' | 'success';
    prescriptionId?: string;
    patientName?: string;
    patientCode?: string;
    rxCode?: string;
    totalAmount?: number;
    insuranceAmount?: number;
    paymentMethod?: 'qr' | 'card' | 'cash';
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    transferMemo?: string;
    checkoutUrl?: string;
    qrCode?: string;
    medicines?: MedicineDisplayItem[];
    updatedAt?: number;
}

export const DISPLAY_SYNC_CHANNEL_NAME = 'triageflow_payment_display_channel';
export const DISPLAY_SYNC_STORAGE_KEY = 'triageflow_patient_display';

/**
 * Broadcasts patient display updates to all open customer-facing secondary windows
 * via BroadcastChannel & localStorage sync (zero-latency dual screen sync like 7-Eleven POS)
 */
export function broadcastPaymentDisplaySync(payload: PatientDisplaySyncPayload) {
    if (typeof window === 'undefined') return;
    const fullPayload: PatientDisplaySyncPayload = {
        ...payload,
        updatedAt: Date.now(),
    };

    try {
        localStorage.setItem(DISPLAY_SYNC_STORAGE_KEY, JSON.stringify(fullPayload));
    } catch (e) {
        console.error('[PaymentSync] Failed to write to localStorage:', e);
    }

    try {
        if ('BroadcastChannel' in window) {
            const channel = new BroadcastChannel(DISPLAY_SYNC_CHANNEL_NAME);
            channel.postMessage(fullPayload);
            channel.close();
        }
    } catch (e) {
        console.error('[PaymentSync] Failed to broadcast message:', e);
    }
}
