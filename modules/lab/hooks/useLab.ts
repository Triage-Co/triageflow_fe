'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { labService } from '../services/labService';
import { ShiftInfo, RoomQueueData, QueuePatientItem, Toast } from '../types/lab.types';
import { OverrideConfirmData } from '../modals/OverrideConfirmModal';

export function useLab() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialSearch = searchParams ? searchParams.get('search') || '' : '';
    const accessToken = useAuthStore((s) => s.accessToken);
    const user = useAuthStore((s) => s.user);
    const profile = useAuthStore((s) => s.profile);
    const fetchProfile = useAuthStore((s) => s.fetchProfile);
    const [mounted, setMounted] = useState(false);

    // Call Next state
    const [isCallingNext, setIsCallingNext] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isRecalling, setIsRecalling] = useState(false);
    const [isCompletingDetail, setIsCompletingDetail] = useState<Record<string, boolean>>({});

    // Override Queue state
    const [overrideConfirmData, setOverrideConfirmData] = useState<OverrideConfirmData | null>(null);
    const [isOverriding, setIsOverriding] = useState(false);

    // Ca trực & Hàng chờ state
    const [myShifts, setMyShifts] = useState<ShiftInfo[]>([]);
    const [activeShift, setActiveShift] = useState<ShiftInfo | null>(null);
    const [queueData, setQueueData] = useState<RoomQueueData | null>(null);
    
    const [isLoadingShifts, setIsLoadingShifts] = useState(false);
    const [isLoadingQueue, setIsLoadingQueue] = useState(false);

    // Filters & Search
    const [search, setSearch] = useState(initialSearch);
    const [activeListTab, setActiveListTab] = useState<'waiting' | 'missing' | 'completed'>('waiting');
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Local overrides for queue list interaction (since we don't write back to database for queue status)
    const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<QueuePatientItem>>>({});

    // Modals
    const [selectedPatient, setSelectedPatient] = useState<QueuePatientItem | null>(null);
    const [activeModal, setActiveModal] = useState<'view' | null>(null);

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

            // Tìm ca trực của phòng Lab (LABORATORY) hoặc phòng thủ thuật (PROCEDURE_ROOM)
            const labShift = shifts.find(s => s.room?.room_type === 'LABORATORY' || s.room?.room_type === 'PROCEDURE_ROOM') || shifts[0];
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

    useEffect(() => {
        if (mounted && accessToken && !profile) {
            fetchProfile(accessToken).catch((err) => {
                console.error('Failed to fetch profile in useLab:', err);
            });
        }
    }, [mounted, accessToken, profile, fetchProfile]);

    // Handle initial search from query
    useEffect(() => {
        if (initialSearch) {
            setSearch(initialSearch);
        }
    }, [initialSearch]);


    // Merge API Queue Data with Local Interactions
    const mergedQueueLists = useMemo(() => {
        const initialServing: QueuePatientItem[] = queueData?.serving ? (() => {
            const serving = queueData.serving;
            let activeStep = serving.step;

            // Nếu dịch vụ hiện hành đã được hoàn thành (status === 'COMPLETED'),
            // tự động chuyển bước khám hiển thị sang dịch vụ kế tiếp chưa hoàn thành.
            if (activeStep && serving.service_order?.details) {
                const currentDetail = serving.service_order.details.find(
                    (d: any) => d.service_code === activeStep?.service_code
                );
                if (currentDetail?.status === 'COMPLETED') {
                    const nextUncompletedDetail = serving.service_order.details.find(
                        (d: any) => d.status !== 'COMPLETED'
                    );
                    if (nextUncompletedDetail) {
                        activeStep = {
                            ...activeStep,
                            step_name: nextUncompletedDetail.service_name || nextUncompletedDetail.name || activeStep.step_name,
                            service_code: nextUncompletedDetail.service_code || activeStep.service_code,
                        };
                    }
                }
            }

            return [{
                queue_id: serving.queue_id,
                queue_number: serving.queue_number,
                patient_name: serving.patient?.full_name || 'Bệnh nhân',
                enqueued_at: serving.serving_started_at,
                queue_type: activeStep?.step_name || 'Xét nghiệm phòng Lab',
                patient: serving.patient,
                step: activeStep,
                serving_started_at: serving.serving_started_at,
                service_order: serving.service_order,
            }];
        })() : [];
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
            (p.patient_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.queue_number || '').includes(search) ||
            (p.queue_id || '').includes(search);

        return {
            waiting: [...servingList, ...waitingList].filter(filterFn),
            missing: missingList.filter(filterFn),
            completed: completedList.filter(filterFn)
        };
    }, [queueData, localOverrides, search]);

    // Sync selectedPatient with latest queue data (to show updated service order detail status in real-time)
    useEffect(() => {
        if (!selectedPatient) return;
        const targetId = selectedPatient.queue_id;
        const latest = 
            mergedQueueLists.waiting.find(p => p.queue_id === targetId) ||
            mergedQueueLists.missing.find(p => p.queue_id === targetId) ||
            mergedQueueLists.completed.find(p => p.queue_id === targetId);
        if (latest && latest !== selectedPatient) {
            setSelectedPatient(latest);
        }
    }, [mergedQueueLists, selectedPatient]);

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
    const handleOpenViewModal = (patient: QueuePatientItem) => {
        setSelectedPatient(patient);
        setActiveModal('view');
    };

    const handleCallNext = async () => {
        if (!activeShift) {
            showToast('Không tìm thấy ca trực hoạt động.', 'error');
            return;
        }
        
        const staffId = profile?.account_id || user?.id || activeShift.staff_id;
        if (!staffId) {
            showToast('Không xác định được thông tin nhân viên.', 'error');
            return;
        }

        setIsCallingNext(true);
        try {
            await labService.callNext({
                room_id: activeShift.room_id,
                staff_id: staffId
            });
            showToast('Đã gọi bệnh nhân tiếp theo vào phòng xét nghiệm.', 'success');
            await handleRefresh();
        } catch (e: any) {
            console.error('[useLab] Error calling next patient:', e);
            const errMsg = e?.response?.data?.message || e?.message || 'Có lỗi xảy ra khi gọi bệnh nhân.';
            showToast(errMsg, 'error');
        } finally {
            setIsCallingNext(false);
        }
    };

    const handleCompleteQueue = async (queueId: string) => {
        if (!queueId) return;
        setIsCompleting(true);
        try {
            await labService.completeQueue(queueId);
            showToast('Đã hoàn thành lượt phục vụ thành công.', 'success');
            await handleRefresh();
        } catch (e: any) {
            console.error('[useLab] Error completing queue:', e);
            const errMsg = e?.response?.data?.message || e?.message || 'Có lỗi xảy ra khi hoàn thành lượt phục vụ.';
            showToast(errMsg, 'error');
        } finally {
            setIsCompleting(false);
        }
    };

    const handleCompleteOrderDetail = async (queueId: string, detailId: string) => {
        if (!queueId || !detailId) return;
        setIsCompletingDetail((prev) => ({ ...prev, [detailId]: true }));
        try {
            await labService.completeOrderDetail(queueId, detailId);
            showToast('Đã hoàn thành dịch vụ chỉ định.', 'success');
            await handleRefresh();
        } catch (e: any) {
            console.error('[useLab] Error completing order detail:', e);
            const errMsg = e?.response?.data?.message || e?.message || 'Có lỗi xảy ra khi hoàn thành dịch vụ.';
            showToast(errMsg, 'error');
        } finally {
            setIsCompletingDetail((prev) => ({ ...prev, [detailId]: false }));
        }
    };

    const handleRecallQueue = async (queueId: string) => {
        if (!queueId) return;
        setIsRecalling(true);
        try {
            await labService.recallQueue(queueId);
            showToast('Đã đưa bệnh nhân quay lại hàng chờ.', 'success');
            await handleRefresh();
        } catch (e: any) {
            console.error('[useLab] Error recalling queue:', e);
            const errMsg = e?.response?.data?.message || e?.message || 'Có lỗi xảy ra khi gọi lại bệnh nhân.';
            showToast(errMsg, 'error');
        } finally {
            setIsRecalling(false);
        }
    };

    const handleOpenOverrideConfirm = (draggedIndex: number, targetIndex: number) => {
        const list = mergedQueueLists.waiting;
        const draggedPatient = list[draggedIndex];
        if (!draggedPatient) return;

        // Calculate backend position
        const hasServing = list[0]?.localStatus === 'SERVING';
        let backendPosition = targetIndex;
        if (hasServing) {
            backendPosition = Math.max(0, targetIndex - 1);
        }

        setOverrideConfirmData({
            queueId: draggedPatient.queue_id,
            patientName: draggedPatient.patient_name,
            queueNumber: draggedPatient.queue_number,
            oldIndex: draggedIndex,
            newIndex: targetIndex,
            backendPosition,
        });
    };

    const handleConfirmOverride = async (reason: string) => {
        if (!overrideConfirmData) return;
        setIsOverriding(true);
        try {
            await labService.overrideQueue(overrideConfirmData.queueId, {
                action: 'MOVE_TO_POSITION',
                position: overrideConfirmData.backendPosition,
                reason,
            });
            showToast('Đã cập nhật vị trí ưu tiên lượt chờ.', 'success');
            setOverrideConfirmData(null);
            await handleRefresh();
        } catch (e: any) {
            console.error('[useLab] Error overriding queue:', e);
            const errMsg = e?.response?.data?.message || e?.message || 'Có lỗi xảy ra khi can thiệp hàng đợi.';
            showToast(errMsg, 'error');
        } finally {
            setIsOverriding(false);
        }
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
        activeModal,
        setActiveModal,
        activeShift,
        isLoadingQueue,
        mergedQueueLists,
        handleRefresh,
        handleOpenViewModal,
        isCallingNext,
        handleCallNext,
        isCompleting,
        handleCompleteQueue,
        isCompletingDetail,
        handleCompleteOrderDetail,
        isRecalling,
        handleRecallQueue,
        overrideConfirmData,
        setOverrideConfirmData,
        isOverriding,
        handleOpenOverrideConfirm,
        handleConfirmOverride,
    };
}
