'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { ProcessTemplate } from '@/modules/admin/types/process.types';
import {
    mapRoomTypeToStepType,
    normalizeRoomType,
} from '@/modules/admin/types/process.types';
import type { HospitalRoom } from '@/modules/admin/types/room.types';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { clinicalService } from '@/modules/clinical/services/clinicalService';
import {
    extractServiceOrderList,
    serviceOrderService,
} from '@/modules/clinical/services/serviceOrderService';
import type { ServiceOrder } from '@/modules/clinical/types/serviceOrder.types';
import { filterOrdersByBookingId } from '@/modules/clinical/types/serviceOrder.types';
import {
    buildDraftFromTemplateStep,
    expandDraftsWithPaymentSteps,
    pickServiceCodeByContext,
} from '@/modules/clinical/workflow/draftBuilder';
import { asRecord, getRoomTypeValue, pickLinkedServiceOrderDetailId } from '@/modules/clinical/workflow/flowPickers';
import { orderFlowStepsForTimeline } from '@/modules/clinical/workflow/flowOrder';
import {
    findLiveExamStepId,
    isDraftPaymentStep,
    isProtectedBaseStep,
    isStepContentLocked,
    normalizeStepStatusForApi,
} from '@/modules/clinical/workflow/stepIdentity';
import type { DraftStep, ServiceOption } from '@/modules/clinical/workflow/types';

interface UseWorkflowMutationsArgs {
    accessToken: string | null;
    patient?: Patient;
    flowData: Record<string, unknown> | null;
    orderedFlowSteps: unknown[];
    rooms: HospitalRoom[];
    serviceOptions: ServiceOption[];
    templates: ProcessTemplate[];
    draftSteps: DraftStep[];
    selectedTemplateId: string;
    selectedSpecialtyId: string;
    selectedRoomId: string;
    selectedStaffId: string;
    selectedServiceCode: string;
    selectedDraftServiceCode: string;
    editingRoomId: string;
    editingStaffId: string;
    editingStepStatus: string;
    editingRequiredStepId: string;
    editingOldRequiredStepId: string;
    pickDoctorOnDutyForRoom: (roomId: string) => string;
    getStaffOnDutyForRoom: (roomId: string) => string;
    canCurrentDoctorEditStepStatus: (step: Record<string, unknown>) => boolean;
    reloadFlow: () => Promise<Record<string, unknown> | null>;
    setPendingOrders: Dispatch<SetStateAction<ServiceOrder[]>>;
    setError: (error: string | null) => void;
    setDraftSteps: Dispatch<SetStateAction<DraftStep[]>>;
    setSelectedTemplateId: (id: string) => void;
    setSelectedSpecialtyId: (id: string) => void;
    setSelectedRoomId: (id: string) => void;
    setSelectedStaffId: (id: string) => void;
    setSelectedServiceCode: (code: string) => void;
    setSelectedDraftServiceCode: (code: string) => void;
    setIsConfiguringDraft: (open: boolean) => void;
    setIsAssigning: (busy: boolean) => void;
    setIsActionLoading: (busy: boolean) => void;
    closeStepDetail: () => void;
    onFlowChanged?: (flow: Record<string, unknown> | null) => void;
}

async function updateServiceOrderFromStep(
    step: Record<string, unknown> | null | undefined,
    body: {
        room_id?: string;
        assign_by_staff_id?: string;
        status?: string;
        service_code?: string;
    },
    token: string
) {
    const detailId = pickLinkedServiceOrderDetailId(step);
    const stepId =
        (typeof step?.step_id === 'string' && step.step_id.trim()) ||
        (typeof step?.id === 'string' && step.id.trim()) ||
        '';
    const nestedService = step ? asRecord(step.service) : null;
    const serviceCode =
        (body.service_code || '').trim() ||
        (typeof step?.service_code === 'string' ? step.service_code.trim() : '') ||
        (typeof nestedService?.service_code === 'string' ? nestedService.service_code.trim() : '');

    if (!detailId && !stepId) {
        throw new Error(
            'Bước này không có service_order_detail_id lẫn step_id — không thể cập nhật.'
        );
    }

    const hasRoom = Boolean(body.room_id);
    const hasStaff = Boolean(body.assign_by_staff_id);
    const hasStatus = Boolean(body.status);

    if (hasRoom && detailId) {
        const payload: { service_code?: string; room_id?: string } = {
            room_id: body.room_id,
        };
        if (serviceCode) payload.service_code = serviceCode;
        await serviceOrderService.updateOrderDetail(detailId, payload, token);
    }

    const patchStepRoom = hasRoom && !detailId;
    if (patchStepRoom || hasStaff) {
        if (!stepId) {
            throw new Error('Bước này không có step_id — không thể cập nhật nhân viên/phòng.');
        }
        await clinicalService.updateStep(
            stepId,
            {
                room_id: patchStepRoom ? body.room_id : undefined,
                staff_id: body.assign_by_staff_id || undefined,
            },
            token
        );
    }

    if (hasStatus) {
        if (!stepId) {
            throw new Error('Bước này không có step_id — không thể cập nhật trạng thái.');
        }
        await clinicalService.updateStepStatus(
            stepId,
            normalizeStepStatusForApi(body.status || ''),
            token
        );
    }

    if (!hasRoom && !hasStaff && !hasStatus) {
        throw new Error('Không có dữ liệu để cập nhật bước.');
    }
}

export function useWorkflowMutations(args: UseWorkflowMutationsArgs) {
    const {
        accessToken,
        patient,
        flowData,
        orderedFlowSteps,
        rooms,
        serviceOptions,
        templates,
        draftSteps,
        selectedTemplateId,
        selectedSpecialtyId,
        selectedRoomId,
        selectedStaffId,
        selectedServiceCode,
        selectedDraftServiceCode,
        editingRoomId,
        editingStaffId,
        editingStepStatus,
        editingRequiredStepId,
        editingOldRequiredStepId,
        pickDoctorOnDutyForRoom,
        getStaffOnDutyForRoom,
        canCurrentDoctorEditStepStatus,
        reloadFlow,
        setPendingOrders,
        setError,
        setDraftSteps,
        setSelectedTemplateId,
        setSelectedSpecialtyId,
        setSelectedRoomId,
        setSelectedStaffId,
        setSelectedServiceCode,
        setSelectedDraftServiceCode,
        setIsConfiguringDraft,
        setIsAssigning,
        setIsActionLoading,
        closeStepDetail,
        onFlowChanged,
    } = args;

    const handleCancelStep = async (stepId: string) => {
        if (!accessToken) return;
        const liveStep = orderedFlowSteps
            .map((item) => asRecord(item))
            .find((s) => s && String(s.step_id || '') === stepId);
        if (liveStep && isStepContentLocked(String(liveStep.step_status || ''))) {
            setError('Không thể xóa bước đang thực hiện hoặc đã hoàn tất.');
            return;
        }
        if (liveStep && isProtectedBaseStep(liveStep)) {
            setError('Không thể xóa bước cơ bản của quy trình.');
            return;
        }
        setIsActionLoading(true);
        try {
            await updateServiceOrderFromStep(liveStep, { status: 'CANCELLED' }, accessToken);
            closeStepDetail();
            const latestFlow = await reloadFlow();
            onFlowChanged?.(latestFlow);
        } catch (err) {
            console.error('Failed to cancel step:', err);
            setError(err instanceof Error ? err.message : 'Không thể hủy bước khám.');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUpdateStep = async (stepId: string) => {
        if (!accessToken) return;

        const liveStep = orderedFlowSteps
            .map((item) => asRecord(item))
            .find((s) => s && String(s.step_id || '') === stepId);
        const nextStatus = (editingStepStatus || '').trim().toUpperCase();
        const contentLocked = isStepContentLocked(
            (typeof liveStep?.step_status === 'string' && liveStep.step_status) || nextStatus
        );
        const hasRoom = Boolean(editingRoomId) && !contentLocked;
        const hasStatus = Boolean(nextStatus);
        const canEditStatus = liveStep ? canCurrentDoctorEditStepStatus(liveStep) : true;

        if (!hasStatus && !hasRoom) {
            setError('Vui lòng chọn phòng hoặc đổi trạng thái trước khi lưu.');
            return;
        }
        if (hasStatus && !canEditStatus) {
            setError('Bác sĩ chỉ có thể sửa trạng thái ở bước mình phụ trách.');
            return;
        }

        setIsActionLoading(true);
        setError(null);
        try {
            await updateServiceOrderFromStep(
                liveStep,
                {
                    room_id: hasRoom ? editingRoomId : undefined,
                    assign_by_staff_id: hasRoom && editingStaffId ? editingStaffId : undefined,
                    status: hasStatus ? nextStatus : undefined,
                },
                accessToken
            );

            if (!contentLocked) {
                const nextRequired = editingRequiredStepId.trim();
                const oldRequired = editingOldRequiredStepId.trim();
                if (nextRequired && nextRequired !== stepId) {
                    if (!oldRequired) {
                        await clinicalService.createStepDependency(
                            { waiting_step_id: stepId, required_step_id: nextRequired },
                            accessToken
                        );
                    } else if (oldRequired !== nextRequired) {
                        await clinicalService.updateStepDependency(
                            {
                                waiting_step_id: stepId,
                                old_required_step_id: oldRequired,
                                new_required_step_id: nextRequired,
                            },
                            accessToken
                        );
                    }
                }
            }

            closeStepDetail();
            const latestFlow = await reloadFlow();
            onFlowChanged?.(latestFlow);
        } catch (err) {
            console.error('Failed to update step:', err);
            setError(err instanceof Error ? err.message : 'Không thể cập nhật thông tin bước.');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleAddStep = async () => {
        if (!accessToken || !selectedRoomId) return;

        const room = rooms.find((r) => r.room_id === selectedRoomId);
        const resolvedServiceCode =
            selectedServiceCode ||
            pickServiceCodeByContext(
                {
                    roomType: getRoomTypeValue(room),
                    roomName: room?.room_name,
                    specialtyName: room?.specialty?.specialty_name,
                },
                serviceOptions
            );

        if (!resolvedServiceCode) {
            setError('Vui lòng chọn mã dịch vụ cho bước khám.');
            return;
        }

        const bookingId =
            (typeof flowData?.booking_id === 'string' && flowData.booking_id) ||
            patient?.bookingId ||
            '';
        if (!bookingId) {
            setError('Không tìm thấy booking_id để tạo service order.');
            return;
        }

        setIsActionLoading(true);
        try {
            await serviceOrderService.createOrder(
                {
                    booking_id: bookingId,
                    service_code: [resolvedServiceCode],
                },
                accessToken
            );
            setSelectedRoomId('');
            setSelectedStaffId('');
            setSelectedServiceCode('');
            const flowObj = await reloadFlow();

            try {
                const resolvedPatientId = (patient?.patientId || '').trim();
                if (resolvedPatientId) {
                    const pendingRes = await serviceOrderService.getPendingByPatientId(
                        resolvedPatientId,
                        accessToken
                    );
                    setPendingOrders(
                        filterOrdersByBookingId(extractServiceOrderList(pendingRes?.data), bookingId)
                    );
                }
            } catch {
                // ignore
            }

            onFlowChanged?.(flowObj);
        } catch (err) {
            console.error('Failed to add service order:', err);
            setError('Không thể tạo service order.');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSelectTemplateDraft = (templateId: string) => {
        setSelectedTemplateId(templateId);
        const tpl = templates.find((t) => (t.template_id || t.id) === templateId);
        if (tpl && tpl.steps) {
            const parentId = tpl.template_id || tpl.id || templateId;
            const baseDrafts = tpl.steps.map((s, idx) =>
                buildDraftFromTemplateStep(
                    s,
                    idx,
                    parentId,
                    rooms,
                    serviceOptions,
                    pickDoctorOnDutyForRoom,
                    getStaffOnDutyForRoom
                )
            );
            setDraftSteps(
                expandDraftsWithPaymentSteps(
                    baseDrafts,
                    rooms,
                    pickDoctorOnDutyForRoom,
                    getStaffOnDutyForRoom
                )
            );
        } else {
            setDraftSteps([]);
        }
    };

    const handleUpdateDraftStep = (tempId: string, updates: Partial<DraftStep>) => {
        setDraftSteps((prev) =>
            prev.map((step) => {
                if (step.tempId !== tempId) return step;
                if (isDraftPaymentStep(step)) return step;

                const updated = { ...step, ...updates };
                if (updates.specialty_id !== undefined && updates.room_id === undefined) {
                    if (
                        updated.room_id &&
                        !rooms.some(
                            (r) =>
                                r.room_id === updated.room_id &&
                                r.specialty_id === updates.specialty_id
                        )
                    ) {
                        updated.room_id = '';
                        updated.staff_id = '';
                        updated.doctor_name = 'Chưa có bác sĩ';
                    }
                }
                if (updates.room_id !== undefined && updates.staff_id === undefined) {
                    updated.staff_id = pickDoctorOnDutyForRoom(updates.room_id) || '';
                }
                if (updates.room_id !== undefined) {
                    const room = rooms.find((r) => r.room_id === updates.room_id);
                    if (room?.specialty_id) {
                        updated.specialty_id = room.specialty_id;
                    }
                    updated.doctor_name =
                        getStaffOnDutyForRoom(updates.room_id) || 'Chưa có bác sĩ';
                    if (!updated.service_code) {
                        updated.service_code = pickServiceCodeByContext(
                            {
                                roomType: getRoomTypeValue(room),
                                roomName: room?.room_name,
                                specialtyName: room?.specialty?.specialty_name,
                            },
                            serviceOptions
                        );
                    }
                }
                return updated;
            })
        );
    };

    const handleAddDraftStep = (
        specialty_id: string,
        room_id: string,
        staff_id: string,
        service_code: string
    ) => {
        if (!room_id) return;
        if (!service_code) {
            setError('Vui lòng chọn mã dịch vụ cho bước nháp.');
            return;
        }
        const room = rooms.find((r) => r.room_id === room_id);
        if (specialty_id && room?.specialty_id && specialty_id !== room.specialty_id) {
            setError('Phòng đã chọn không thuộc chuyên khoa. Vui lòng chọn lại.');
            return;
        }
        const resolvedSpecialtyId = specialty_id || room?.specialty_id || '';
        if (!resolvedSpecialtyId) {
            setError('Vui lòng chọn chuyên khoa trước.');
            return;
        }
        const resolvedStaffId = staff_id || pickDoctorOnDutyForRoom(room_id);
        if (!resolvedStaffId) {
            setError(
                'Không tìm thấy bác sĩ/nhân viên trực cho phòng đã chọn. Vui lòng chọn phòng khác hoặc phân ca trước.'
            );
            return;
        }
        const doctorName = getStaffOnDutyForRoom(room_id) || 'Chưa có bác sĩ';
        const nextIdx = draftSteps.length;
        const templateStepId = `step_${nextIdx + 1}`;
        const roomType = normalizeRoomType(getRoomTypeValue(room) || 'CLINICAL_ROOM');
        const newStep: DraftStep = {
            tempId: `draft-custom-${Date.now()}`,
            step_name: room?.room_name || 'Chỉ định thêm',
            specialty_id: resolvedSpecialtyId,
            room_type: roomType,
            room_id,
            staff_id: resolvedStaffId,
            service_code,
            doctor_name: doctorName,
            template_id: templateStepId,
            template_step_id: templateStepId,
            step_type: mapRoomTypeToStepType(roomType),
            requires_payment: false,
            depends_on: nextIdx > 0 ? [`step_${nextIdx}`] : [],
        };
        setDraftSteps((prev) => [...prev, newStep]);
    };

    const handleCommitDraft = async () => {
        const flowId = (flowData?.flow_id as string) || patient?.flowId;
        if (!flowId || flowId === 'undefined' || !accessToken) {
            setError('Không tìm thấy Flow ID của bệnh nhân.');
            return;
        }

        const templateId = selectedTemplateId.trim();
        if (!templateId) {
            setError('Vui lòng chọn một template để thêm vào quy trình.');
            return;
        }

        if (draftSteps.length === 0) {
            setError('Quy trình nháp không có bước nào.');
            return;
        }

        const expandedForValidation = expandDraftsWithPaymentSteps(
            draftSteps,
            rooms,
            pickDoctorOnDutyForRoom,
            getStaffOnDutyForRoom
        );

        const serviceDrafts = expandedForValidation.filter((s) => !isDraftPaymentStep(s));
        const missingRoom = serviceDrafts.find((s) => !s.room_id);
        if (missingRoom) {
            setError(`Vui lòng chọn phòng cho bước "${missingRoom.step_name}".`);
            return;
        }

        const invalidSpecialty = serviceDrafts.find((s) => {
            if (!s.room_id || !s.specialty_id) return false;
            const room = rooms.find((r) => r.room_id === s.room_id);
            return Boolean(room?.specialty_id && room.specialty_id !== s.specialty_id);
        });
        if (invalidSpecialty) {
            setError(
                `Phòng của bước "${invalidSpecialty.step_name}" không khớp chuyên khoa đã chọn.`
            );
            return;
        }

        const missingStaff = serviceDrafts.find((s) => !s.staff_id);
        if (missingStaff) {
            setError(`Bước "${missingStaff.step_name}" chưa có bác sĩ/nhân viên phụ trách.`);
            return;
        }

        const missingServiceCode = serviceDrafts.find((s) => !s.service_code);
        if (missingServiceCode) {
            setError(`Bước "${missingServiceCode.step_name}" chưa có mã dịch vụ.`);
            return;
        }

        const beforeStepIds = new Set(
            orderedFlowSteps
                .map((item) => {
                    const live = asRecord(item);
                    return typeof live?.step_id === 'string' ? live.step_id : '';
                })
                .filter(Boolean)
        );

        setIsAssigning(true);
        setError(null);
        try {
            const expandedDrafts = expandedForValidation;
            setDraftSteps(expandedDrafts);

            await clinicalService.assignTemplateToFlow(flowId, templateId, accessToken);

            const flowObj = await reloadFlow();
            const liveRaw = Array.isArray(flowObj?.steps) ? (flowObj!.steps as unknown[]) : [];
            const liveOrdered = orderFlowStepsForTimeline(liveRaw);

            const newLiveSteps = liveOrdered.filter((item) => {
                const live = asRecord(item);
                const id = typeof live?.step_id === 'string' ? live.step_id : '';
                return Boolean(id && !beforeStepIds.has(id));
            });
            const unusedNew = [...newLiveSteps];
            const draftTemplateIdToLiveId = new Map<string, string>();
            const appendedLiveIds: string[] = [];

            for (const draft of expandedDrafts) {
                const draftName = (draft.step_name || '').trim().toLowerCase();
                const matchIdx = unusedNew.findIndex((liveItem) => {
                    const live = asRecord(liveItem);
                    const liveName = String(live?.step_name || '').trim().toLowerCase();
                    return Boolean(draftName && liveName && draftName === liveName);
                });
                const liveItem = matchIdx >= 0 ? unusedNew.splice(matchIdx, 1)[0] : null;
                const live = asRecord(liveItem);
                const stepId = typeof live?.step_id === 'string' ? live.step_id : '';
                const templateStepId = (draft.template_step_id || '').trim();
                if (stepId && templateStepId) {
                    draftTemplateIdToLiveId.set(templateStepId, stepId);
                }
                if (stepId) appendedLiveIds.push(stepId);
                if (!stepId || !draft.room_id) continue;

                try {
                    await updateServiceOrderFromStep(
                        live,
                        {
                            room_id: draft.room_id,
                            assign_by_staff_id: draft.staff_id || undefined,
                            service_code: draft.service_code || undefined,
                        },
                        accessToken
                    );
                } catch (patchErr) {
                    console.warn(
                        'Failed to patch room/staff via service-order for step',
                        stepId,
                        patchErr
                    );
                }
            }

            const examStepId = findLiveExamStepId(liveOrdered);
            const firstAppendedId = appendedLiveIds[0] || '';
            if (examStepId && firstAppendedId && examStepId !== firstAppendedId) {
                try {
                    await clinicalService.createStepDependency(
                        { waiting_step_id: firstAppendedId, required_step_id: examStepId },
                        accessToken
                    );
                } catch (depErr) {
                    console.warn('Failed to link first template step to Khám bệnh', depErr);
                }
            }

            for (const draft of expandedDrafts) {
                const waitingId = draftTemplateIdToLiveId.get(
                    (draft.template_step_id || '').trim()
                );
                if (!waitingId) continue;

                const deps = Array.isArray(draft.depends_on)
                    ? draft.depends_on.filter(Boolean)
                    : [];
                for (const depTemplateId of deps) {
                    const requiredId = draftTemplateIdToLiveId.get(depTemplateId.trim());
                    if (!requiredId || requiredId === waitingId) continue;
                    try {
                        await clinicalService.createStepDependency(
                            { waiting_step_id: waitingId, required_step_id: requiredId },
                            accessToken
                        );
                    } catch (depErr) {
                        console.warn(
                            'Failed to create step dependency',
                            waitingId,
                            requiredId,
                            depErr
                        );
                    }
                }
            }

            setSelectedTemplateId('');
            setDraftSteps([]);
            setIsConfiguringDraft(false);

            await reloadFlow();
        } catch (err) {
            console.error('Failed to commit flow steps:', err);
            setError(
                err instanceof Error ? err.message : 'Không thể lưu quy trình vào cơ sở dữ liệu.'
            );
        } finally {
            setIsAssigning(false);
        }
    };

    const addDraftStepFromSelection = () => {
        handleAddDraftStep(
            selectedSpecialtyId,
            selectedRoomId,
            selectedStaffId,
            selectedDraftServiceCode
        );
        setSelectedSpecialtyId('');
        setSelectedRoomId('');
        setSelectedStaffId('');
        setSelectedDraftServiceCode('');
    };

    return {
        handleCancelStep,
        handleUpdateStep,
        handleAddStep,
        handleSelectTemplateDraft,
        handleUpdateDraftStep,
        handleCommitDraft,
        addDraftStepFromSelection,
    };
}
