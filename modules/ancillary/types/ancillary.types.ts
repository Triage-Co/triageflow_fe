export * from '@/shared/types/prescription.types';

import { PrescriptionStatusEnum, Prescription, Medicine } from '@/shared/types/prescription.types';

export interface PharmacyQueueFilter {
    status?: PrescriptionStatusEnum | 'ALL';
    search?: string;
    date?: string;
}

export interface PharmacySummaryStats {
    pending_count: number;
    processing_count: number;
    prepared_count: number;
    dispensed_count: number;
    total_today: number;
}
