import { useState, useEffect, useMemo, useCallback } from 'react';
import { Prescription, PrescriptionStatusEnum } from '@/shared/types/prescription.types';
import { mergePrescription, pharmacyService } from '../services/pharmacyService';

export function usePharmacyQueue(
    refreshKey: number = 0,
    onSelect?: (prescription: Prescription) => void,
    scanMode: 'select' | 'dispense' = 'select'
) {
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    });
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeStatus, setActiveStatus] = useState<PrescriptionStatusEnum | 'ALL'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [actingId, setActingId] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [scanNotice, setScanNotice] = useState<string | null>(null);

    const resolvePrescriptionAfterAction = useCallback(
        async (patch: Prescription, previous?: Prescription | null) => {
            try {
                const fresh = await pharmacyService.getPrescriptionById(patch.prescription_id);
                return mergePrescription(previous || patch, fresh);
            } catch {
                return mergePrescription(previous || null, patch);
            }
        },
        []
    );

    const fetchQueue = useCallback(async (isSilent = false, dateToFetch = selectedDate) => {
        if (!isSilent) setLoading(true);
        try {
            const list = await pharmacyService.getPrescriptions({
                date: dateToFetch || undefined,
                limit: 200
            });
            const validList = list.filter((p) => p.status !== 'CANCELLED' && p.status !== 'EXPIRED');
            setPrescriptions(validList);
        } catch (err) {
            console.error('[usePharmacyQueue] Failed to load queue:', err);
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchQueue(prescriptions.length > 0, selectedDate);
    }, [refreshKey, selectedDate, fetchQueue]);

    const handleScanCode = useCallback(async (code: string) => {
        let codeToScan = (code || '').trim();
        if (!codeToScan) return;
        if (codeToScan.startsWith('{')) {
            try {
                const parsed = JSON.parse(codeToScan) as { code?: string; prescription_code?: string };
                codeToScan = parsed.code || parsed.prescription_code || codeToScan;
            } catch {
                // Ignore JSON parse error
            }
        }

        const prescription = await pharmacyService.scanPrescription(codeToScan);
        if (!prescription) return;
        setScanNotice(null);

        if (scanMode === 'dispense') {
            if (prescription.status === 'PREPARED') {
                const updated = await pharmacyService.dispensePrescription(prescription.prescription_id);
                const fresh = await resolvePrescriptionAfterAction(updated, prescription);
                onSelect?.(fresh);
                await fetchQueue(true);
                setScanNotice(`Đã giao thuốc ${fresh.pickup_number || fresh.prescription_code}`);
                return { ...fresh, message: `Đã giao thuốc ${fresh.pickup_number || fresh.prescription_code}` };
            }
            if (prescription.status === 'DISPENSED') {
                setScanNotice(`Đơn ${prescription.prescription_code} đã được giao thuốc trước đó.`);
                throw new Error(`Đơn ${prescription.prescription_code} đã được giao thuốc trước đó.`);
            }
            if (prescription.status === 'PROCESSING') {
                onSelect?.(prescription);
                await fetchQueue(true);
                return prescription;
            }
        }

        onSelect?.(prescription);
        await fetchQueue(true);
        return prescription;
    }, [fetchQueue, onSelect, resolvePrescriptionAfterAction, scanMode]);

    const handleMiss = async (prescription: Prescription) => {
        setActingId(prescription.prescription_id);
        setActionError(null);
        try {
            const updated = await pharmacyService.missPrescription(prescription.prescription_id);
            const fresh = await resolvePrescriptionAfterAction(updated, prescription);
            onSelect?.(fresh);
            await fetchQueue(true);
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Không thể đánh miss số này');
        } finally {
            setActingId(null);
        }
    };

    const handleRecall = async (prescription: Prescription) => {
        setActingId(prescription.prescription_id);
        setActionError(null);
        try {
            const updated = await pharmacyService.recallPrescription(prescription.prescription_id);
            const fresh = await resolvePrescriptionAfterAction(updated, prescription);
            onSelect?.(fresh);
            await fetchQueue(true);
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Không thể gọi lại số này');
        } finally {
            setActingId(null);
        }
    };

    const counts = useMemo(() => {
        return {
            ALL: prescriptions.length,
            PENDING: prescriptions.filter((p) => p.status === 'PENDING').length,
            PROCESSING: prescriptions.filter((p) => p.status === 'PROCESSING').length,
            PREPARED: prescriptions.filter((p) => p.status === 'PREPARED').length,
            DISPENSED: prescriptions.filter((p) => p.status === 'DISPENSED').length
        };
    }, [prescriptions]);

    const filteredPrescriptions = useMemo(() => {
        return prescriptions.filter((p) => {
            if (activeStatus !== 'ALL' && p.status !== activeStatus) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const codeMatch = p.prescription_code.toLowerCase().includes(q);
                const pickupMatch = p.pickup_number?.toLowerCase().includes(q) || false;
                const nameMatch = p.patient_name?.toLowerCase().includes(q) || false;
                const patientCodeMatch = p.patient_code?.toLowerCase().includes(q) || false;
                return codeMatch || pickupMatch || nameMatch || patientCodeMatch;
            }
            return true;
        });
    }, [prescriptions, activeStatus, searchQuery]);

    return {
        selectedDate,
        setSelectedDate,
        prescriptions,
        filteredPrescriptions,
        counts,
        loading,
        activeStatus,
        setActiveStatus,
        searchQuery,
        setSearchQuery,
        fetchQueue,
        handleScanCode,
        handleMiss,
        handleRecall,
        actingId,
        actionError,
        scanNotice
    };
}
