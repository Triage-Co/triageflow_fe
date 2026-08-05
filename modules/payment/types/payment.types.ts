export type PaymentMethodEnum = 'CASH' | 'VIETQR' | 'CARD' | 'MOMO' | 'ZALOPAY';
export type PaymentStatusEnum = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface PaymentTransaction {
    payment_id: string;
    prescription_id?: string;
    service_order_id?: string;
    patient_name: string;
    patient_code?: string;
    amount: number;
    payment_method: PaymentMethodEnum;
    status: PaymentStatusEnum;
    transaction_code?: string;
    qr_url?: string;
    created_at: string;
    updated_at: string;
}

export interface CreatePaymentDto {
    prescription_id?: string;
    service_order_id?: string;
    amount: number;
    payment_method: PaymentMethodEnum;
    note?: string;
}
