'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { labService } from '../services/labService';
import { ShiftInfo, RoomQueueData, QueuePatientItem, Toast } from '../types/lab.types';
import { OverrideConfirmData } from '../modals/OverrideConfirmModal';
import { RefuseConfirmData } from '../modals/RefuseConfirmModal';
import { CompleteConfirmData } from '../modals/CompleteConfirmModal';
import { PROCEDURE_ROOM_TYPES } from '@/modules/clinical/utils/staffShift';

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
    const [isRefusing, setIsRefusing] = useState(false);
    const [isCompletingDetail, setIsCompletingDetail] = useState<Record<string, boolean>>({});

    // Override, Refuse & Complete Queue state
    const [overrideConfirmData, setOverrideConfirmData] = useState<OverrideConfirmData | null>(null);
    const [refuseConfirmData, setRefuseConfirmData] = useState<RefuseConfirmData | null>(null);
    const [completeConfirmData, setCompleteConfirmData] = useState<CompleteConfirmData | null>(null);
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

            // Tìm ca trực của phòng cận lâm sàng / Lab / thủ thuật
            const labShift =
                shifts.find((s) =>
                    PROCEDURE_ROOM_TYPES.has(String(s.room?.room_type || '').toUpperCase())
                ) || shifts[0];
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

            const isCalled =
                serving.status === 'CALLED' ||
                (!serving.serving_started_at && String(activeStep?.step_status).toUpperCase() === 'PENDING');

            return [{
                queue_id: serving.queue_id,
                queue_number: serving.queue_number,
                patient_name: serving.patient?.full_name || 'Bệnh nhân',
                enqueued_at: serving.serving_started_at || undefined,
                queue_type: activeStep?.step_name || 'Xét nghiệm phòng Lab',
                patient: serving.patient,
                step: activeStep,
                serving_started_at: serving.serving_started_at || undefined,
                service_order: serving.service_order,
                initialStatus: isCalled ? 'CALLED' : 'SERVING',
                localStatus: isCalled ? 'CALLED' : 'SERVING',
            }];
        })() : [];
        const initialWaiting = queueData?.waiting ?? [];
        const initialMissing = queueData?.missing ?? [];
        const initialFinished: QueuePatientItem[] = (queueData?.finished ?? []).map((f) => ({
            queue_id: f.queue_id,
            queue_number: f.queue_number,
            patient_name: f.patient?.full_name || (f as any).patient_name || 'Bệnh nhân',
            queue_type: f.queue_type || f.step?.step_name || 'Xét nghiệm phòng Lab',
            enqueued_at: f.serving_started_at || undefined,
            serving_started_at: f.serving_started_at || undefined,
            finished_at: f.finished_at || undefined,
            duration_minutes: f.duration_minutes,
            refusal_reason: f.refusal_reason,
            patient: f.patient,
            step: f.step,
            service_order: f.service_order,
            status: f.status,
            initialStatus: 'COMPLETED',
            localStatus: 'COMPLETED',
        }));

        // Lists to build
        const servingList: QueuePatientItem[] = [];
        const waitingList: QueuePatientItem[] = [];
        const missingList: QueuePatientItem[] = [];
        const completedList: QueuePatientItem[] = [];

        const allRawPatients: QueuePatientItem[] = [
            ...initialServing,
            ...initialWaiting.map((p) => ({ ...p, initialStatus: 'WAITING' as const })),
            ...initialMissing.map((p) => ({ ...p, initialStatus: 'MISSING' as const })),
            ...initialFinished.map((p) => ({ ...p, initialStatus: 'COMPLETED' as const })),
        ];

        allRawPatients.forEach((patient) => {
            const override = localOverrides[patient.queue_id] || {};
            const mergedPatient: QueuePatientItem = {
                ...patient,
                ...override,
                localStatus: override.localStatus || (patient.initialStatus as any)
            };

            if (mergedPatient.localStatus === 'SERVING' || mergedPatient.localStatus === 'CALLED') {
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
        const filterFn = (p: QueuePatientItem) => {
            const q = search.trim().toLowerCase();
            if (!q) return true;
            return (
                (p.patient_name || '').toLowerCase().includes(q) ||
                (p.queue_number || '').includes(q) ||
                (p.queue_id || '').toLowerCase().includes(q) ||
                (p.patient?.phone || '').includes(q) ||
                (p.patient?.citizen_id || '').includes(q) ||
                (p.step?.step_name || '').toLowerCase().includes(q)
            );
        };

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
    const handleRefresh = async (opts?: { silent?: boolean }) => {
        if (!activeShift) return;
        setIsLoadingQueue(true);
        try {
            const queue = await labService.getRoomQueue(activeShift.room_id);
            setQueueData(queue);
            if (!opts?.silent) {
                showToast('Đã làm mới danh sách hàng chờ thành công.', 'success');
            }
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

    const handleOpenRefuseConfirm = (patient: { queue_id: string; patient_name: string; queue_number: string }) => {
        if (!patient) return;
        setRefuseConfirmData({
            queueId: patient.queue_id,
            patientName: patient.patient_name,
            queueNumber: patient.queue_number,
        });
    };

    const handleConfirmRefuse = async (reason: string) => {
        if (!refuseConfirmData) return;
        setIsRefusing(true);
        try {
            await labService.refuseQueue(refuseConfirmData.queueId, reason);
            showToast(`Đã từ chối lượt phục vụ của bệnh nhân ${refuseConfirmData.patientName}.`, 'success');
            setRefuseConfirmData(null);
            await handleRefresh();
        } catch (e: any) {
            console.error('[useLab] Error refusing queue:', e);
            const errMsg = e?.response?.data?.message || e?.message || 'Có lỗi xảy ra khi từ chối lượt phục vụ.';
            showToast(errMsg, 'error');
        } finally {
            setIsRefusing(false);
        }
    };

    const handleOpenCompleteConfirm = (patient: {
        queue_id: string;
        patient_name: string;
        queue_number: string;
        step?: any;
        service_order?: any;
    }) => {
        if (!patient) return;
        const services = patient.service_order?.details?.map((d: any) => d.service_name || d.name).filter(Boolean) || [];
        setCompleteConfirmData({
            queueId: patient.queue_id,
            patientName: patient.patient_name,
            queueNumber: patient.queue_number,
            stepName: patient.step?.step_name,
            services,
        });
    };

    const handleConfirmComplete = async () => {
        if (!completeConfirmData) return;
        setIsCompleting(true);
        try {
            await labService.completeQueue(completeConfirmData.queueId);
            showToast(`Đã hoàn thành lượt phục vụ của bệnh nhân ${completeConfirmData.patientName}.`, 'success');
            setCompleteConfirmData(null);
            await handleRefresh();
        } catch (e: any) {
            console.error('[useLab] Error completing queue:', e);
            const errMsg = e?.response?.data?.message || e?.message || 'Có lỗi xảy ra khi hoàn thành lượt phục vụ.';
            showToast(errMsg, 'error');
        } finally {
            setIsCompleting(false);
        }
    };

    const handleScanTicket = async (ticketCode?: string, queueId?: string) => {
        if (!activeShift?.room_id) {
            showToast('Chưa xác định phòng xét nghiệm của ca trực.', 'error');
            return;
        }
        try {
            const res = await labService.scanQueue({
                ticket_code: ticketCode,
                queue_id: queueId,
                room_id: activeShift.room_id,
                staff_id: activeShift.staff_id,
            });
            const msg = res?.message || 'Đã xử lý vé khám / bắt đầu thực hiện thành công.';
            showToast(msg, 'success');
            await handleRefresh();
            return res;
        } catch (e: any) {
            console.error('[useLab] Error scanning queue ticket:', e);
            const errMsg = e?.response?.data?.message || e?.message || 'Có lỗi xảy ra khi quét vé xét nghiệm.';
            showToast(errMsg, 'error');
            throw e;
        }
    };

    const handleStartServing = async (queueId: string) => {
        return handleScanTicket(undefined, queueId);
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
        refuseConfirmData,
        setRefuseConfirmData,
        isRefusing,
        handleOpenRefuseConfirm,
        handleConfirmRefuse,
        completeConfirmData,
        setCompleteConfirmData,
        handleOpenCompleteConfirm,
        handleConfirmComplete,
        handleScanTicket,
        handleStartServing,
    };
}
