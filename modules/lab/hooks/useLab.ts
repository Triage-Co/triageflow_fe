'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { labService } from '../services/labService';
import { ShiftInfo, RoomQueueData, QueuePatientItem, Toast } from '../types/lab.types';

export function useLab() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialSearch = searchParams ? searchParams.get('search') || '' : '';
    const accessToken = useAuthStore((s) => s.accessToken);
    const [mounted, setMounted] = useState(false);

    // Ca trực & Hàng chờ state
    const [myShifts, setMyShifts] = useState<ShiftInfo[]>([]);
    const [activeShift, setActiveShift] = useState<ShiftInfo | null>(null);
    const [queueData, setQueueData] = useState<RoomQueueData | null>(null);
    
    const [isLoadingShifts, setIsLoadingShifts] = useState(false);
    const [isLoadingQueue, setIsLoadingQueue] = useState(false);

    // Filters & Search
    const [search, setSearch] = useState(initialSearch);
    const [activeListTab, setActiveListTab] = useState<'waiting' | 'serving' | 'missing' | 'completed'>('waiting');
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Local overrides for queue list interaction (since we don't write back to database for queue status)
    const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<QueuePatientItem>>>({});

    // Modals
    const [selectedPatient, setSelectedPatient] = useState<QueuePatientItem | null>(null);
    const [activeModal, setActiveModal] = useState<'view' | 'collect' | 'result' | null>(null);

    // Form inputs for results
    const [inputResultValue, setInputResultValue] = useState('');
    const [inputResultNotes, setInputResultNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [collectingStep, setCollectingStep] = useState(false);
    const [tubeType, setTubeType] = useState('EDTA (Nắp Tím)');
    const [volume, setVolume] = useState('2 ml');
    const [labelConfirmed, setLabelConfirmed] = useState(false);

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!accessToken) {
            router.push('/login');
        }
    }, [accessToken, mounted, router]);

    // Format local date YYYY-MM-DD
    const todayStr = useMemo(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    // 1. Fetch Ca trực của Staff đăng nhập
    const loadShiftsAndQueue = async () => {
        if (!accessToken) return;
        setIsLoadingShifts(true);
        try {
            const shifts = await labService.getMyShifts(todayStr);
            setMyShifts(shifts);

            // Tìm ca trực của phòng Lab (LABORATORY)
            const labShift = shifts.find(s => s.room?.room_type === 'LABORATORY') || shifts[0];
            if (labShift) {
                setActiveShift(labShift);
                // 2. Fetch Hàng chờ của Room ID này
                setIsLoadingQueue(true);
                const queue = await labService.getRoomQueue(labShift.room_id);
                setQueueData(queue);
            } else {
                setQueueData(null);
            }
        } catch (e) {
            console.error('[useLab] Error loading shifts & queue:', e);
            showToast('Không thể tải ca trực và hàng chờ của bạn.', 'error');
        } finally {
            setIsLoadingShifts(false);
            setIsLoadingQueue(false);
        }
    };

    useEffect(() => {
        if (mounted && accessToken) {
            void loadShiftsAndQueue();
        }
    }, [mounted, accessToken, todayStr]);

    // Handle initial search from query
    useEffect(() => {
        if (initialSearch) {
            setSearch(initialSearch);
        }
    }, [initialSearch]);

    // Merge API Queue Data with Local Interactions
    const mergedQueueLists = useMemo(() => {
        const initialServing = queueData?.serving ? [queueData.serving] : [];
        const initialWaiting = queueData?.waiting ?? [];
        const initialMissing = queueData?.missing ?? [];

        // Lists to build
        const servingList: QueuePatientItem[] = [];
        const waitingList: QueuePatientItem[] = [];
        const missingList: QueuePatientItem[] = [];
        const completedList: QueuePatientItem[] = [];

        const allRawPatients = [
            ...initialServing.map(p => ({ ...p, initialStatus: 'SERVING' })),
            ...initialWaiting.map(p => ({ ...p, initialStatus: 'WAITING' })),
            ...initialMissing.map(p => ({ ...p, initialStatus: 'MISSING' }))
        ];

        allRawPatients.forEach((patient) => {
            const override = localOverrides[patient.queue_id] || {};
            const mergedPatient: QueuePatientItem = {
                ...patient,
                ...override,
                localStatus: override.localStatus || (patient.initialStatus as any)
            };

            if (mergedPatient.localStatus === 'SERVING') {
                servingList.push(mergedPatient);
            } else if (mergedPatient.localStatus === 'WAITING') {
                waitingList.push(mergedPatient);
            } else if (mergedPatient.localStatus === 'MISSING') {
                missingList.push(mergedPatient);
            } else if (mergedPatient.localStatus === 'COMPLETED') {
                completedList.push(mergedPatient);
            }
        });

        // Filter helper by search query
        const filterFn = (p: QueuePatientItem) => 
            p.patient_name.toLowerCase().includes(search.toLowerCase()) ||
            p.queue_number.includes(search) ||
            p.queue_id.includes(search);

        return {
            serving: servingList.filter(filterFn),
            waiting: waitingList.filter(filterFn),
            missing: missingList.filter(filterFn),
            completed: completedList.filter(filterFn)
        };
    }, [queueData, localOverrides, search]);

    // Refresh Queue manually
    const handleRefresh = async () => {
        if (!activeShift) return;
        setIsLoadingQueue(true);
        try {
            const queue = await labService.getRoomQueue(activeShift.room_id);
            setQueueData(queue);
            showToast('Đã làm mới danh sách hàng chờ thành công.', 'success');
        } catch (e) {
            console.error(e);
            showToast('Không thể làm mới hàng chờ.', 'error');
        } finally {
            setIsLoadingQueue(false);
        }
    };

    // Actions
    const handlePrintBarcode = (patient: QueuePatientItem) => {
        showToast(`Đang in mã vạch ống nghiệm cho bệnh nhân: ${patient.patient_name} (Số: ${patient.queue_number})`, 'success');
    };

    const handleUpdateStatus = (patientId: string, nextStatus: 'WAITING' | 'SERVING' | 'MISSING' | 'COMPLETED') => {
        setLocalOverrides(prev => ({
            ...prev,
            [patientId]: {
                ...prev[patientId],
                localStatus: nextStatus
            }
        }));
        
        let statusText = '';
        if (nextStatus === 'SERVING') statusText = 'Đang phục vụ';
        else if (nextStatus === 'WAITING') statusText = 'Đang chờ';
        else if (nextStatus === 'MISSING') statusText = 'Lỡ lượt';
        else if (nextStatus === 'COMPLETED') statusText = 'Hoàn thành';

        showToast(`Cập nhật trạng thái thành công: ${statusText}`, 'success');
        setActiveModal(null);
    };

    const handleSaveResult = () => {
        if (!selectedPatient) return;
        if (!inputResultValue.trim()) {
            showToast('Vui lòng nhập trị số kết quả xét nghiệm.', 'error');
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            setLocalOverrides(prev => ({
                ...prev,
                [selectedPatient.queue_id]: {
                    ...prev[selectedPatient.queue_id],
                    localStatus: 'COMPLETED',
                    resultValue: inputResultValue,
                    resultNotes: inputResultNotes,
                }
            }));
            
            setIsSubmitting(false);
            setActiveModal(null);
            showToast(`Đã lưu kết quả xét nghiệm cho bệnh nhân: ${selectedPatient.patient_name}`, 'success');
        }, 1200);
    };

    const handleOpenViewModal = (patient: QueuePatientItem) => {
        setSelectedPatient(patient);
        setCollectingStep(false);
        setLabelConfirmed(false);
        
        setTubeType('EDTA (Nắp Tím)');
        setVolume('2 ml');
        setActiveModal('view');
    };

    const handleConfirmCollection = async () => {
        if (!selectedPatient) return;
        if (!labelConfirmed) {
            showToast('Vui lòng xác nhận nhãn barcode đã được dán đúng!', 'error');
            return;
        }

        setIsSubmitting(true);
        showToast('Đang ghi nhận thông tin thu thập mẫu...', 'info');
        await new Promise((resolve) => setTimeout(resolve, 1200));
        setIsSubmitting(false);

        setLocalOverrides(prev => ({
            ...prev,
            [selectedPatient.queue_id]: {
                ...prev[selectedPatient.queue_id],
                localStatus: 'SERVING',
                tubeType,
                volume,
            }
        }));

        setSelectedPatient(prev => prev ? { 
            ...prev, 
            localStatus: 'SERVING',
            tubeType,
            volume 
        } : null);
        
        setActiveModal(null);
        showToast(`Thu thập mẫu thành công cho bệnh nhân: ${selectedPatient.patient_name}`, 'success');
    };

    return {
        mounted,
        accessToken,
        search,
        setSearch,
        activeListTab,
        setActiveListTab,
        toasts,
        selectedPatient,
        setSelectedPatient,
        activeModal,
        setActiveModal,
        inputResultValue,
        setInputResultValue,
        inputResultNotes,
        setInputResultNotes,
        isSubmitting,
        collectingStep,
        setCollectingStep,
        tubeType,
        setTubeType,
        volume,
        setVolume,
        labelConfirmed,
        setLabelConfirmed,
        activeShift,
        isLoadingShifts,
        isLoadingQueue,
        mergedQueueLists,
        handleRefresh,
        handlePrintBarcode,
        handleUpdateStatus,
        handleSaveResult,
        handleOpenViewModal,
        handleConfirmCollection,
    };
}
