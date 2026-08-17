'use client';

import { ChevronRight, Loader2, Plus } from 'lucide-react';
import type { HospitalRoom } from '@/modules/admin/types/room.types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/Dialog';
import type { FlowNode, ServiceOption, SpecialtyOption } from '@/modules/clinical/workflow/types';
import {
    formatFlowStepLabel,
    formatStepStatusVi,
    isPaymentFlowNode,
    shouldHideLiveFlowStep,
} from '@/modules/clinical/workflow/stepIdentity';

interface CustomizeFlowDialogProps {
    open: boolean;
    orderedFlowSteps: unknown[];
    dynamicSteps: FlowNode[];
    unlabeledPaymentStepIds: Set<string>;
    specialties: SpecialtyOption[];
    serviceOptions: ServiceOption[];
    isLoadingServices: boolean;
    isActionLoading: boolean;
    selectedSpecialtyId: string;
    selectedRoomId: string;
    selectedServiceCode: string;
    getRoomsBySpecialty: (specialtyId: string) => HospitalRoom[];
    onOpenChange: (open: boolean) => void;
    onOpenStep: (stepId: string) => void;
    onSpecialtyChange: (specialtyId: string) => void;
    onRoomChange: (roomId: string) => void;
    onServiceCodeChange: (code: string) => void;
    onAddStep: () => void;
}

export function CustomizeFlowDialog({
    open,
    orderedFlowSteps,
    dynamicSteps,
    unlabeledPaymentStepIds,
    specialties,
    serviceOptions,
    isLoadingServices,
    isActionLoading,
    selectedSpecialtyId,
    selectedRoomId,
    selectedServiceCode,
    getRoomsBySpecialty,
    onOpenChange,
    onOpenStep,
    onSpecialtyChange,
    onRoomChange,
    onServiceCodeChange,
    onAddStep,
}: CustomizeFlowDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-2xl max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <DialogHeader>
                    <DialogTitle>Tùy chỉnh Quy trình của Bệnh nhân</DialogTitle>
                    <DialogDescription>
                        Xem danh sách bước hiện tại (nhấn vào bước để sửa/xóa) hoặc thêm bước khám
                        mới bên dưới.
                    </DialogDescription>
                </DialogHeader>

                <div className="my-6 space-y-4">
                    <div className="border border-neutral-100 rounded-2xl overflow-hidden divide-y divide-neutral-100 bg-neutral-50/50">
                        {orderedFlowSteps.map((stepItem, idx) => {
                            const step = stepItem as Record<string, unknown>;
                            const stepId = (step.step_id as string) || `step-${idx}`;
                            const stepStatus = ((step.step_status as string) || '').toUpperCase();
                            if (shouldHideLiveFlowStep(step)) return null;

                            const roomInfo = step.room_info as Record<string, unknown> | undefined;
                            const specialtyInfo = step.specialty_info as
                                | Record<string, unknown>
                                | undefined;
                            const roomName = (roomInfo?.room_name as string) || '';
                            const specialtyName = (specialtyInfo?.specialty_name as string) || '';
                            const rawStepName =
                                (step.step_name as string) || roomName || `Bước ${idx + 1}`;
                            const stepName =
                                dynamicSteps.find((n) => n.id === stepId)?.label ||
                                formatFlowStepLabel(rawStepName, {
                                    forcePayment:
                                        unlabeledPaymentStepIds.has(stepId) ||
                                        String(step.step_type || '').toUpperCase() === 'PAYMENT',
                                });

                            const isPayment =
                                unlabeledPaymentStepIds.has(stepId) ||
                                isPaymentFlowNode({
                                    label: stepName,
                                    stepType: String(step.step_type || ''),
                                    roomType: String(step.room_type || ''),
                                });

                            return (
                                <button
                                    key={stepId}
                                    type="button"
                                    onClick={() => onOpenStep(stepId)}
                                    className="w-full p-4 flex items-center justify-between gap-4 bg-white text-left hover:bg-neutral-50/80 transition-colors cursor-pointer"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-neutral-800 text-sm">
                                            {stepName}
                                        </p>
                                        {isPayment ? (
                                            <div className="flex gap-4 text-xs text-neutral-400 mt-1 font-medium">
                                                <span>
                                                    Thanh toán
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex gap-4 text-xs text-neutral-400 mt-1 font-medium flex-wrap">
                                                <span>
                                                    Phòng:{' '}
                                                    <strong className="text-neutral-600 font-semibold">
                                                        {roomName || 'Chưa phân công'}
                                                    </strong>
                                                </span>
                                                <span>
                                                    Chuyên khoa:{' '}
                                                    <strong className="text-neutral-600 font-semibold">
                                                        {specialtyName || 'Chưa phân khoa'}
                                                    </strong>
                                                </span>
                                                <span>
                                                    Bác sĩ trực:{' '}
                                                    <strong className="text-[#5B4ED6] font-semibold">
                                                        {dynamicSteps.find((n) => n.id === stepId)
                                                            ?.staffName || 'Chưa có bác sĩ'}
                                                    </strong>
                                                </span>
                                                <span>
                                                    Trạng thái:{' '}
                                                    <strong className="text-neutral-600 font-semibold">
                                                        {formatStepStatusVi(stepStatus)}
                                                    </strong>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-neutral-300 shrink-0" />
                                </button>
                            );
                        })}
                    </div>

                    <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4">
                        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                            <Plus className="w-4 h-4 text-brand-500" />
                            Thêm bước khám mới
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">
                                    Chuyên khoa
                                </label>
                                <select
                                    value={selectedSpecialtyId}
                                    onChange={(e) => onSpecialtyChange(e.target.value)}
                                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white"
                                >
                                    <option value="">Chọn chuyên khoa</option>
                                    {specialties.map((specialty) => (
                                        <option key={specialty.id} value={specialty.id}>
                                            {specialty.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">
                                    Phòng khám
                                </label>
                                <select
                                    value={selectedRoomId}
                                    onChange={(e) => onRoomChange(e.target.value)}
                                    disabled={!selectedSpecialtyId}
                                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white disabled:bg-neutral-50 disabled:text-neutral-400"
                                >
                                    <option value="">Chọn phòng</option>
                                    {getRoomsBySpecialty(selectedSpecialtyId).map((r) => (
                                        <option key={r.room_id} value={r.room_id}>
                                            {r.room_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">
                                    Dịch vụ
                                </label>
                                <select
                                    value={selectedServiceCode}
                                    onChange={(e) => onServiceCodeChange(e.target.value)}
                                    disabled={isLoadingServices || serviceOptions.length === 0}
                                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white disabled:bg-neutral-50 disabled:text-neutral-400"
                                >
                                    {serviceOptions.map((service) => (
                                        <option
                                            key={service.service_id || service.service_code}
                                            value={service.service_code}
                                        >
                                            {service.service_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button
                            onClick={onAddStep}
                            disabled={!selectedRoomId || !selectedServiceCode}
                            className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {isActionLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Tạo service order
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
