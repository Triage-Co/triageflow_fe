import { useState, useEffect, useMemo, useCallback } from 'react';
import { Prescription, PrescriptionStatusEnum } from '@/shared/types/prescription.types';
import { pharmacyService } from '../services/pharmacyService';

export function usePharmacyQueue(refreshKey: number = 0, onSelect?: (prescription: Prescription) => void) {
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    });
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeStatus, setActiveStatus] = useState<PrescriptionStatusEnum | 'ALL'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [scanInput, setScanInput] = useState('');
    const [scanning, setScanning] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);

    const fetchQueue = useCallback(async (isSilent = false, dateToFetch = selectedDate) => {
        if (!isSilent) setLoading(true);
        try {
            const list = await pharmacyService.getPrescriptions({
                date: dateToFetch || undefined
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

    const handleScanSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scanInput.trim()) return;

        setScanning(true);
        setScanError(null);
        try {
            let codeToScan = scanInput.trim();
            if (codeToScan.startsWith('{')) {
                try {
                    const parsed = JSON.parse(codeToScan);
                    codeToScan = parsed.code || parsed.prescription_code || codeToScan;
                } catch {
                    // Ignore JSON parse error
                }
            }

            const prescription = await pharmacyService.scanPrescription(codeToScan);
            if (prescription) {
                onSelect?.(prescription);
                setScanInput('');
                fetchQueue(true);
            }
        } catch (err: any) {
            const msg =
                err?.response?.data?.detail ||
                err?.response?.data?.message ||
                err?.message ||
                'Không tìm thấy đơn thuốc tương ứng mã này';
            setScanError(msg);
        } finally {
            setScanning(false);
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
                const nameMatch = p.patient_name?.toLowerCase().includes(q) || false;
                const patientCodeMatch = p.patient_code?.toLowerCase().includes(q) || false;
                return codeMatch || nameMatch || patientCodeMatch;
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
        scanInput,
        setScanInput,
        scanning,
        scanError,
        fetchQueue,
        handleScanSubmit
    };
}
