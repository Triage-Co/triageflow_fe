'use client';

import { Trash2 } from 'lucide-react';
import type { HospitalRoom } from '@/modules/admin/types/room.types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/Dialog';
import type { FlowNode } from '@/modules/clinical/workflow/types';
import { STEP_STATUS_EDIT_OPTIONS } from '@/modules/clinical/workflow/types';
import { asRecord } from '@/modules/clinical/workflow/flowPickers';
import {
    isExamPaymentStepName,
    isPaymentStepName,
    isProtectedBaseStep,
    isStepContentLocked,
    normalizeStepStatusForApi,
} from '@/modules/clinical/workflow/stepIdentity';

interface StepDetailDialogProps {
    selectedStepNode: FlowNode | null;
    editingStepId: string | null;
    orderedFlowSteps: unknown[];
    rooms: HospitalRoom[];
    editingRoomId: string;
    editingStaffId: string;
    editingSpecialtyId: string;
    editingStepStatus: string;
    isActionLoading: boolean;
    getRoomsBySpecialty: (specialtyId: string) => HospitalRoom[];
    canCurrentDoctorEditStepStatus: (step: Record<string, unknown>) => boolean;
    resolveStaffNameById: (staffId: string) => string;
    getStaffOnDutyForRoom: (roomId: string) => string;
    onClose: () => void;
    onRoomChange: (roomId: string) => void;
    onSpecialtyIdChange: (specialtyId: string) => void;
    onStatusChange: (status: string) => void;
    onSave: (stepId: string) => void;
    onDelete: (stepId: string) => void;
}

export function StepDetailDialog({
    selectedStepNode,
    editingStepId,
    orderedFlowSteps,
    rooms,
    editingRoomId,
    editingStaffId,
    editingSpecialtyId,
    editingStepStatus,
    isActionLoading,
    getRoomsBySpecialty,
    canCurrentDoctorEditStepStatus,
    resolveStaffNameById,
    getStaffOnDutyForRoom,
    onClose,
    onRoomChange,
    onSpecialtyIdChange,
    onStatusChange,
    onSave,
    onDelete,
}: StepDetailDialogProps) {
    const detailStepId = editingStepId || selectedStepNode?.id || '';
    const liveStep = orderedFlowSteps
        .map((item) => asRecord(item))
        .find((s) => s && String(s.step_id || '') === detailStepId);
    const liveStatus =
        (typeof liveStep?.step_status === 'string' && liveStep.step_status) ||
        selectedStepNode?.detail?.stepStatus ||
        '';
    const contentLocked = isStepContentLocked(liveStatus);
    const canEditStatus = liveStep ? canCurrentDoctorEditStepStatus(liveStep) : true;
    const isPaymentDetail =
        Boolean(selectedStepNode?.isPayment) ||
        isPaymentStepName(selectedStepNode?.label || '') ||
        isExamPaymentStepName(selectedStepNode?.label || '');
    const canDelete =
        Boolean(liveStep) &&
        !contentLocked &&
        !isPaymentDetail &&
        !isProtectedBaseStep(liveStep!);
    const dutyStaffName =
        (editingStaffId && resolveStaffNameById(editingStaffId)) ||
        (editingRoomId && getStaffOnDutyForRoom(editingRoomId)) ||
        selectedStepNode?.staffName ||
        'Chưa phân công';
    const roomOptions = editingSpecialtyId ? getRoomsBySpecialty(editingSpecialtyId) : rooms;

    return (
        <Dialog open={!!selectedStepNode} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg" onClick={(e) => e.stopPropagation()}>
                <DialogHeader className="mb-5 pb-1">
                    <DialogTitle>Chi tiết bước quy trình</DialogTitle>
                </DialogHeader>

                {selectedStepNode ? (
                    <div className="space-y-3 text-sm">
                        <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
                            <p className="text-xs text-neutral-500 font-semibold">Tên bước</p>
                            <p className="font-bold text-neutral-800 mt-0.5">
                                {selectedStepNode.label}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-neutral-200 p-2.5">
                                <p className="text-[11px] text-neutral-500 font-semibold mb-1">
                                    Trạng thái
                                </p>
                                <select
                                    value={
                                        editingStepStatus || normalizeStepStatusForApi(liveStatus)
                                    }
                                    onChange={(e) => onStatusChange(e.target.value)}
                                    disabled={isActionLoading || !canEditStatus}
                                    className="w-full text-xs font-bold p-2 rounded-lg border border-neutral-200 bg-white disabled:bg-neutral-50 disabled:text-neutral-400"
                                >
                                    {STEP_STATUS_EDIT_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                {!canEditStatus ? (
                                    <p className="text-[10px] text-amber-600 mt-1 font-medium">
                                        Chỉ sửa trạng thái ở bước bạn phụ trách.
                                    </p>
                                ) : null}
                            </div>

                            <div className="rounded-lg border border-neutral-200 p-2.5">
                                <p className="text-[11px] text-neutral-500 font-semibold mb-1">
                                    Phòng
                                </p>
                                {contentLocked ? (
                                    <p className="font-semibold text-neutral-800">
                                        {selectedStepNode.roomName ||
                                            selectedStepNode.detail?.roomId ||
                                            'Chưa gán phòng'}
                                    </p>
                                ) : (
                                    <select
                                        value={editingRoomId}
                                        onChange={(e) => {
                                            const roomId = e.target.value;
                                            onRoomChange(roomId);
                                            const room = rooms.find((r) => r.room_id === roomId);
                                            if (room?.specialty_id) {
                                                onSpecialtyIdChange(room.specialty_id);
                                            }
                                        }}
                                        disabled={isActionLoading}
                                        className="w-full text-xs font-bold p-2 rounded-lg border border-neutral-200 bg-white"
                                    >
                                        <option value="">Chọn phòng</option>
                                        {roomOptions.map((r) => (
                                            <option key={r.room_id} value={r.room_id}>
                                                {r.room_name}
                                                {r.specialty?.specialty_name
                                                    ? ` · ${r.specialty.specialty_name}`
                                                    : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {!isPaymentDetail ? (
                                <div className="rounded-lg border border-neutral-200 p-2.5 col-span-2">
                                    <p className="text-[11px] text-neutral-500 font-semibold mb-1">
                                        Bác sĩ / Nhân viên
                                    </p>
                                    <p className="font-semibold text-neutral-800">{dutyStaffName}</p>
                                    {!contentLocked ? (
                                        <p className="text-[10px] text-neutral-400 mt-1">
                                            Tự động theo ca trực của phòng đã chọn.
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2">
                            {canDelete ? (
                                <button
                                    type="button"
                                    onClick={() => void onDelete(detailStepId)}
                                    disabled={isActionLoading}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Xóa bước
                                </button>
                            ) : null}

                            <div className="flex items-center gap-2 ml-auto">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-3 py-2 rounded-xl text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void onSave(detailStepId)}
                                    disabled={isActionLoading || (!canEditStatus && contentLocked)}
                                    className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 transition-colors disabled:opacity-50"
                                >
                                    {isActionLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
