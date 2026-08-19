'use client';

import { useMemo } from 'react';
import { Loader2, Plus, UserCheck } from 'lucide-react';
import type { HospitalRoom } from '@/modules/admin/types/room.types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/Dialog';
import type { DraftStep, ServiceOption, SpecialtyOption } from '@/modules/clinical/workflow/types';
import { isDraftPaymentStep } from '@/modules/clinical/workflow/stepIdentity';
import { filterServiceOptionsByContext } from '@/modules/clinical/workflow/draftBuilder';
import { getRoomTypeValue } from '@/modules/clinical/workflow/flowPickers';

interface ConfigureDraftDialogProps {
    open: boolean;
    draftSteps: DraftStep[];
    specialties: SpecialtyOption[];
    serviceOptions: ServiceOption[];
    isLoadingServices: boolean;
    isAssigning: boolean;
    selectedSpecialtyId: string;
    selectedRoomId: string;
    selectedDraftServiceCode: string;
    getRoomsBySpecialty: (specialtyId: string) => HospitalRoom[];
    getStaffOnDutyForRoom: (roomId: string) => string;
    pickDoctorOnDutyForRoom: (roomId: string) => string;
    onOpenChange: (open: boolean) => void;
    onSpecialtyChange: (specialtyId: string) => void;
    onRoomChange: (roomId: string) => void;
    onDraftServiceCodeChange: (code: string) => void;
    onUpdateDraftStep: (tempId: string, updates: Partial<DraftStep>) => void;
    onAddDraftStep: () => void;
    onCommit: () => void;
}

export function ConfigureDraftDialog({
    open,
    draftSteps,
    specialties,
    serviceOptions,
    isLoadingServices,
    isAssigning,
    selectedSpecialtyId,
    selectedRoomId,
    selectedDraftServiceCode,
    getRoomsBySpecialty,
    getStaffOnDutyForRoom,
    pickDoctorOnDutyForRoom,
    onOpenChange,
    onSpecialtyChange,
    onRoomChange,
    onDraftServiceCodeChange,
    onUpdateDraftStep,
    onAddDraftStep,
    onCommit,
}: ConfigureDraftDialogProps) {
    const serviceDrafts = draftSteps.filter((s) => !isDraftPaymentStep(s));

    const specialtyNameById = useMemo(
        () => new Map(specialties.map((s) => [s.id, s.name])),
        [specialties]
    );

    /** Chỉ hiện các dịch vụ khớp với chuyên khoa/phòng đã chọn (theo room_type + tên), fallback về toàn bộ danh sách nếu không khớp. */
    const getServiceOptionsForContext = (specialtyId: string, roomId: string): ServiceOption[] => {
        if (!specialtyId) return serviceOptions;
        const room = getRoomsBySpecialty(specialtyId).find((r) => r.room_id === roomId);
        return filterServiceOptionsByContext(
            {
                roomType: getRoomTypeValue(room),
                roomName: room?.room_name,
                specialtyName: specialtyNameById.get(specialtyId),
            },
            serviceOptions
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-2xl max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <DialogHeader>
                    <DialogTitle>Cấu hình & Thêm template</DialogTitle>
                </DialogHeader>

                <div className="my-6 space-y-4">
                    <div className="border border-neutral-100 rounded-2xl overflow-hidden divide-y divide-neutral-100 bg-neutral-50/50">
                        {serviceDrafts.map((step, idx) => (
                            <div key={step.tempId} className="p-4 bg-white">
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-[#F5F2FF] text-[#8B7CF6] font-bold text-[10px] flex items-center justify-center shrink-0">
                                        {idx + 1}
                                    </span>
                                    <p className="font-bold text-neutral-800 text-sm">
                                        {step.step_name}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-3">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">
                                            Chuyên khoa
                                        </label>
                                        <select
                                            value={step.specialty_id}
                                            onChange={(e) => {
                                                onUpdateDraftStep(step.tempId, {
                                                    specialty_id: e.target.value,
                                                    room_id: '',
                                                    staff_id: '',
                                                });
                                            }}
                                            className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white focus:border-[#8B7CF6] focus:outline-none"
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
                                            value={step.room_id}
                                            onChange={(e) => {
                                                const roomId = e.target.value;
                                                onUpdateDraftStep(step.tempId, {
                                                    room_id: roomId,
                                                    staff_id: pickDoctorOnDutyForRoom(roomId),
                                                });
                                            }}
                                            disabled={!step.specialty_id}
                                            className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white focus:border-[#8B7CF6] focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-400"
                                        >
                                            <option value="">Chọn phòng</option>
                                            {getRoomsBySpecialty(step.specialty_id).map((r) => (
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
                                            value={step.service_code}
                                            onChange={(e) => {
                                                onUpdateDraftStep(step.tempId, {
                                                    service_code: e.target.value,
                                                });
                                            }}
                                            className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white focus:border-[#8B7CF6] focus:outline-none"
                                        >
                                            {getServiceOptionsForContext(step.specialty_id, step.room_id).map((service) => (
                                                <option
                                                    key={service.service_id || service.service_code}
                                                    value={service.service_code}
                                                >
                                                    {service.service_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {step.room_id ? (
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">
                                                Bác sĩ đang trực
                                            </label>
                                            <div className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-[#F5F2FF] text-[#5B4ED6] flex items-center gap-2 min-h-[42px]">
                                                <UserCheck className="w-4 h-4 text-[#8B7CF6] shrink-0" />
                                                <span>
                                                    {step.doctor_name ||
                                                        getStaffOnDutyForRoom(step.room_id) ||
                                                        'Chưa có bác sĩ'}
                                                </span>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        ))}

                        {serviceDrafts.length === 0 && (
                            <div className="p-8 text-center text-xs text-neutral-400 font-semibold">
                                Không có bước dịch vụ nào để cấu hình.
                            </div>
                        )}
                    </div>

                    <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4">
                        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                            <Plus className="w-4 h-4 text-brand-500" />
                            Bổ sung bước khám nháp
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
                                    value={selectedDraftServiceCode}
                                    onChange={(e) => onDraftServiceCodeChange(e.target.value)}
                                    disabled={isLoadingServices || serviceOptions.length === 0}
                                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white disabled:bg-neutral-50 disabled:text-neutral-400"
                                >
                                    {getServiceOptionsForContext(selectedSpecialtyId, selectedRoomId).map((service) => (
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
                            onClick={onAddDraftStep}
                            disabled={
                                !selectedSpecialtyId ||
                                !selectedRoomId ||
                                !selectedDraftServiceCode
                            }
                            className="w-full bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 text-neutral-700 font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-neutral-200"
                        >
                            <Plus className="w-4 h-4" />
                            Thêm vào danh sách nháp
                        </button>
                    </div>

                    <div className="pt-4 border-t border-neutral-100 flex gap-3">
                        <button
                            onClick={onCommit}
                            disabled={
                                isAssigning ||
                                serviceDrafts.length === 0 ||
                                serviceDrafts.some((s) => !s.room_id || !s.specialty_id)
                            }
                            className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {isAssigning ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Đang thêm template...
                                </>
                            ) : (
                                <>Thêm quy trình khám bệnh</>
                            )}
                        </button>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="px-5 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                            Hủy
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
