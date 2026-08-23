'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Star,
    User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { receptionService } from '@/modules/reception/services/receptionService';
import type {
    BackendSpecialtyCatalogItem,
    ReceptionSlot,
    ReceptionSpecialty,
} from '@/modules/reception/types/reception.types';
import {
    buildUpcomingDateOptions,
    formatSlotTimeRange,
    getDoctorSelectionKey,
    getTodayDateString,
} from '@/modules/reception/utils/receptionMapper';
import { resolveCatalogSpecialty } from '@/modules/reception/constants/registerDepartments';

const DATE_OPTIONS = buildUpcomingDateOptions(7);
const TIME_GROUPS = [
    { id: 'morning', label: 'Buổi sáng', fromHour: 0, toHour: 12 },
    { id: 'afternoon', label: 'Buổi chiều', fromHour: 12, toHour: 17 },
    { id: 'evening', label: 'Buổi tối', fromHour: 17, toHour: 24 },
] as const;

const DEFAULT_DOCTOR_AVATAR =
    `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
            <rect width="96" height="96" rx="24" fill="#EDE9FE"/>
            <circle cx="48" cy="35" r="17" fill="#A78BFA"/>
            <path d="M18 88c2-20 13-30 30-30s28 10 30 30" fill="#8B5CF6"/>
            <path d="M42 58h12v17H42z" fill="#fff"/>
            <path d="M34 66h28v7H34z" fill="#fff"/>
        </svg>
    `)}`;

function getDoctorKey(specialty: ReceptionSpecialty, index: number): string {
    return getDoctorSelectionKey(specialty, index);
}

function getDoctorName(specialty: ReceptionSpecialty): string {
    const raw = specialty.name ?? specialty.specialty_name ?? '';
    if (raw.toLowerCase().startsWith('bs')) return raw;
    return raw ? `BS. ${raw}` : 'Bác sĩ';
}

function getDoctorDegree(doctor: ReceptionSpecialty): string {
    return doctor.academic_degree?.trim() || 'Bác sĩ';
}

function parseHour(time?: string): number {
    if (!time) return 0;
    const hour = Number.parseInt(time.slice(0, 2), 10);
    return Number.isNaN(hour) ? 0 : hour;
}

function groupSlotsByPeriod(slots: ReceptionSlot[]) {
    return TIME_GROUPS.map((group) => ({
        ...group,
        slots: slots.filter((slot) => {
            const hour = parseHour(slot.start_time);
            return hour >= group.fromHour && hour < group.toHour;
        }),
    })).filter((group) => group.slots.length > 0);
}

export interface DoctorSlotPickerProps {
    accessToken: string;
    departmentId: string;
    specialtyCatalog: BackendSpecialtyCatalogItem[];
    specialtyId: string;
    onSpecialtyChange: (value: string) => void;
    slotId: string;
    onSlotChange: (value: string) => void;
    slots: ReceptionSlot[];
    onSlotsChange: (slots: ReceptionSlot[]) => void;
    specialties: ReceptionSpecialty[];
    onSpecialtiesChange: (specialties: ReceptionSpecialty[]) => void;
    isLoadingMeta?: boolean;
}

export function DoctorSlotPicker({
    accessToken,
    departmentId,
    specialtyCatalog,
    specialtyId,
    onSpecialtyChange,
    slotId,
    onSlotChange,
    slots,
    onSlotsChange,
    specialties,
    onSpecialtiesChange,
    isLoadingMeta = false,
}: DoctorSlotPickerProps) {
    const [isPending, startTransition] = useTransition();
    const [selectedDate, setSelectedDate] = useState(getTodayDateString());
    const [dateScrollIndex, setDateScrollIndex] = useState(0);
    const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);

    const filteredDoctors = useMemo(
        () => specialties.filter((s) => Boolean(s.doctor_id)),
        [specialties],
    );

    const selectedDoctor = useMemo(
        () => filteredDoctors.find((doctor, index) => getDoctorKey(doctor, index) === specialtyId),
        [filteredDoctors, specialtyId],
    );

    const doctorSlots = useMemo(() => {
        if (!selectedDoctor?.doctor_id) return [];
        return slots
            .filter((slot) => !slot.doctor_id || slot.doctor_id === selectedDoctor.doctor_id)
            .filter((slot) => !slot.shift?.date || slot.shift.date === selectedDate)
            .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));
    }, [slots, selectedDoctor, selectedDate]);

    const groupedSlots = useMemo(() => groupSlotsByPeriod(doctorSlots), [doctorSlots]);
    const visibleDates = useMemo(() => DATE_OPTIONS.slice(dateScrollIndex, dateScrollIndex + 5), [dateScrollIndex]);
    const selectedDateMeta = DATE_OPTIONS.find((d) => d.value === selectedDate);
    const selectedSlot = doctorSlots.find((s) => (s.slot_id ?? s.id) === slotId);
    const showDoctors = Boolean(departmentId) && (isLoadingDoctors || filteredDoctors.length > 0);

    // Load doctors when department changes
    useEffect(() => {
        if (!departmentId || specialtyCatalog.length === 0 || !accessToken) return;
        const item = resolveCatalogSpecialty(departmentId, specialtyCatalog);
        if (!item) return;

        let isMounted = true;
        setIsLoadingDoctors(true);

        receptionService
            .getDoctorsBySpecialtyCode(item.specialty_code, selectedDate, accessToken)
            .then((doctors) => {
                if (isMounted) onSpecialtiesChange(doctors);
            })
            .catch(() => {
                if (isMounted) onSpecialtiesChange([]);
            })
            .finally(() => {
                if (isMounted) setIsLoadingDoctors(false);
            });

        return () => {
            isMounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [departmentId, specialtyCatalog, accessToken]);

    // Load slots when doctor or date changes
    useEffect(() => {
        if (!selectedDoctor?.doctor_id || !accessToken) return;
        startTransition(async () => {
            try {
                const loaded = await receptionService.getDoctorSlots(
                    selectedDoctor.doctor_id!,
                    selectedDate,
                    accessToken,
                );
                onSlotsChange(
                    loaded.map((slot) => ({
                        ...slot,
                        doctor_id: slot.doctor_id ?? selectedDoctor.doctor_id,
                        shift: { ...slot.shift, date: selectedDate },
                    })),
                );
            } catch {
                onSlotsChange([]);
            }
        });
    }, [selectedDoctor?.doctor_id, selectedDate, accessToken, onSlotsChange]);

    function handleDoctorSelect(key: string) {
        onSpecialtyChange(key);
        onSlotChange('');
        setSelectedDate(getTodayDateString());
        setDateScrollIndex(0);
    }

    return (
        <div className="space-y-4">
            {/* Doctor Selection Card */}
            <div className="rounded-[16px] border border-[#EBEBEB] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] flex items-center justify-center">
                            <User className="w-4 h-4 text-[#8B7CF6]" strokeWidth={2.25} />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-bold text-[#1F2937]">
                                Chọn bác sĩ <span className="text-[#EF4444]">*</span>
                            </h2>
                            <p className="text-[11px] text-[#9CA3AF] mt-0.5">Chọn bác sĩ phụ trách khám</p>
                        </div>
                    </div>
                    {showDoctors && (
                        <span className="text-[11px] font-semibold text-[#8B7CF6] bg-[#F5F3FF] px-2.5 py-1 rounded-full">
                            {isLoadingDoctors ? 'Đang tải...' : `${filteredDoctors.length} bác sĩ`}
                        </span>
                    )}
                </div>

                {isLoadingMeta || isLoadingDoctors ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-[88px] rounded-2xl bg-[#F3F4F6] animate-pulse" />
                        ))}
                    </div>
                ) : showDoctors ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                        {filteredDoctors.map((doctor, index) => {
                            const key = getDoctorKey(doctor, index);
                            const isSelected = specialtyId === key;
                            const name = getDoctorName(doctor);
                            const degree = getDoctorDegree(doctor);
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => handleDoctorSelect(key)}
                                    className={cn(
                                        'flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all',
                                        isSelected
                                            ? 'border-[#8B7CF6] bg-gradient-to-br from-[#FAFAFF] to-[#F5F3FF] shadow-[0_4px_16px_rgba(139,124,246,0.18)] ring-1 ring-[#8B7CF6]/25'
                                            : 'border-[#F3F4F6] bg-[#FAFAFA] hover:border-[#DDD6FE] hover:bg-white',
                                    )}
                                >
                                    <div
                                        role="img"
                                        aria-label={`Ảnh ${name}`}
                                        className="w-14 h-14 rounded-2xl shrink-0 bg-cover bg-center border border-[#EDE9FE]"
                                        style={{
                                            backgroundImage: `url("${doctor.avatar_url || DEFAULT_DOCTOR_AVATAR}"), url("${DEFAULT_DOCTOR_AVATAR}")`,
                                        }}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-[#8B7CF6] truncate">
                                            {degree}
                                        </p>
                                        <p className="text-[13px] font-bold text-[#1F2937] truncate mt-0.5">{name}</p>
                                        <p className="text-[11px] text-[#6B7280] truncate mt-0.5">
                                            {doctor.specialty_name ?? 'Bác sĩ điều trị'}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                                            {doctor.rating !== undefined && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#B45309]">
                                                    <Star className="w-3 h-3 fill-[#FBBF24] text-[#F59E0B]" />
                                                    {doctor.rating.toFixed(1)}
                                                    {doctor.review_count !== undefined && (
                                                        <span className="font-medium text-[#9CA3AF]">
                                                            ({doctor.review_count})
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                            {doctor.experience_years !== undefined && (
                                                <span className="text-[10px] font-medium text-[#6B7280]">
                                                    {doctor.experience_years} năm KN
                                                </span>
                                            )}
                                            {doctor.license_number && (
                                                <span className="text-[10px] text-[#9CA3AF]">
                                                    CCHN {doctor.license_number}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <div className="w-6 h-6 rounded-full bg-[#8B7CF6] flex items-center justify-center shrink-0">
                                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-[12px] text-[#9CA3AF] py-4 text-center">
                        {!departmentId
                            ? 'Chọn chuyên khoa trước để xem danh sách bác sĩ.'
                            : isLoadingDoctors
                                ? 'Đang tải bác sĩ theo chuyên khoa...'
                                : 'Chưa có bác sĩ trực cho chuyên khoa này hôm nay.'}
                    </p>
                )}
            </div>

            {/* Date & Slot Selection Card */}
            {specialtyId && (
                <div className="rounded-[16px] border border-[#EBEBEB] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] flex items-center justify-center">
                            <CalendarDays className="w-4 h-4 text-[#8B7CF6]" strokeWidth={2.25} />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-bold text-[#1F2937]">
                                Chọn ngày & giờ khám <span className="text-[#EF4444]">*</span>
                            </h2>
                            <p className="text-[11px] text-[#9CA3AF] mt-0.5">{getDoctorName(selectedDoctor ?? {})}</p>
                        </div>
                    </div>

                    {/* Date Scroll Tabs */}
                    <div className="flex items-center gap-2 mb-5">
                        <button
                            type="button"
                            disabled={dateScrollIndex <= 0 || isPending}
                            onClick={() => setDateScrollIndex((i) => Math.max(0, i - 1))}
                            className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center disabled:opacity-30 shrink-0 hover:bg-[#F9FAFB]"
                        >
                            <ChevronLeft className="w-4 h-4 text-[#6B7280]" />
                        </button>
                        <div className="flex-1 grid grid-cols-5 gap-2">
                            {visibleDates.map((date) => {
                                const isSelected = selectedDate === date.value;
                                return (
                                    <button
                                        key={date.value}
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => {
                                            setSelectedDate(date.value);
                                            onSlotChange('');
                                        }}
                                        className={cn(
                                            'flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border transition-all min-h-[72px]',
                                            isSelected
                                                ? 'border-[#8B7CF6] bg-[#8B7CF6] text-white shadow-[0_4px_12px_rgba(139,124,246,0.35)]'
                                                : 'border-[#F3F4F6] bg-[#FAFAFA] text-[#374151] hover:border-[#DDD6FE] hover:bg-[#F5F3FF]',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'text-[10px] font-bold uppercase',
                                                isSelected ? 'text-white/85' : 'text-[#9CA3AF]',
                                            )}
                                        >
                                            {date.isToday ? 'Hôm nay' : date.weekday}
                                        </span>
                                        <span className="text-[18px] font-extrabold leading-none mt-1">{date.day}</span>
                                        <span
                                            className={cn(
                                                'text-[10px] font-medium mt-0.5',
                                                isSelected ? 'text-white/80' : 'text-[#9CA3AF]',
                                            )}
                                        >
                                            Th{date.month}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            disabled={dateScrollIndex + 5 >= DATE_OPTIONS.length || isPending}
                            onClick={() => setDateScrollIndex((i) => Math.min(DATE_OPTIONS.length - 5, i + 1))}
                            className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center disabled:opacity-30 shrink-0 hover:bg-[#F9FAFB]"
                        >
                            <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                        </button>
                    </div>

                    {/* Slots */}
                    {isPending ? (
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-11 rounded-xl bg-[#F3F4F6] animate-pulse" />
                            ))}
                        </div>
                    ) : doctorSlots.length > 0 ? (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#6B7280]">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded border border-[#D1D5DB] bg-white" />
                                    Còn chỗ
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded border border-[#FCA5A5] bg-[#FEE2E2]" />
                                    Đã đầy
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded bg-[#16A34A]" />
                                    Đang chọn
                                </span>
                            </div>
                            {groupedSlots.map((group) => (
                                <div key={group.id}>
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <Clock className="w-3.5 h-3.5 text-[#8B7CF6]" />
                                        <p className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wide">
                                            {group.label}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                        {group.slots.map((slot, i) => {
                                            const id = slot.slot_id ?? slot.id ?? String(i);
                                            const isSelected = slotId === id;
                                            const isFull = Boolean(slot.is_full);

                                            let isPast = false;
                                            if (selectedDate === getTodayDateString()) {
                                                const now = new Date();
                                                const currentHours = now.getHours();
                                                const currentMinutes = now.getMinutes();
                                                if (slot.start_time) {
                                                    const [h, m] = slot.start_time.split(':').map(Number);
                                                    if (h < currentHours || (h === currentHours && m <= currentMinutes)) {
                                                        isPast = true;
                                                    }
                                                }
                                            }

                                            return (
                                                <button
                                                    key={id}
                                                    type="button"
                                                    disabled={isFull || isPast}
                                                    onClick={() => {
                                                        if (!isFull && !isPast) onSlotChange(id);
                                                    }}
                                                    className={cn(
                                                        'relative px-3 py-3 rounded-xl border text-center transition-all disabled:cursor-not-allowed',
                                                        isSelected
                                                            ? 'border-[#16A34A] bg-[#16A34A] text-white shadow-[0_4px_12px_rgba(22,163,74,0.3)]'
                                                            : isPast
                                                                ? 'border-neutral-200 bg-neutral-100 text-neutral-400 opacity-60'
                                                                : isFull
                                                                    ? 'border-[#FCA5A5] bg-[#FEE2E2] text-[#B91C1C]'
                                                                    : 'border-[#E5E7EB] bg-white text-[#374151] hover:border-[#86EFAC] hover:bg-[#F0FDF4]',
                                                    )}
                                                >
                                                    <span className="text-[13px] font-bold block">
                                                        {slot.start_time?.slice(0, 5)}
                                                    </span>
                                                    {slot.end_time && (
                                                        <span
                                                            className={cn(
                                                                'text-[10px] block mt-0.5',
                                                                isSelected
                                                                    ? 'text-white/80'
                                                                    : isPast
                                                                        ? 'text-neutral-400'
                                                                        : isFull
                                                                            ? 'text-[#DC2626]'
                                                                            : 'text-[#9CA3AF]',
                                                            )}
                                                        >
                                                            đến {slot.end_time.slice(0, 5)}
                                                        </span>
                                                    )}
                                                    <span
                                                        className={cn(
                                                            'text-[9px] font-semibold block mt-1',
                                                            isSelected
                                                                ? 'text-white'
                                                                : isPast
                                                                    ? 'text-neutral-400'
                                                                    : isFull
                                                                        ? 'text-[#B91C1C]'
                                                                        : 'text-[#16A34A]',
                                                        )}
                                                    >
                                                        {isPast
                                                            ? 'Đã qua'
                                                            : isFull
                                                                ? 'Đã đầy'
                                                                : slot.capacity !== undefined
                                                                    ? `Còn ${slot.capacity} chỗ`
                                                                    : 'Còn chỗ'}
                                                    </span>
                                                    {isSelected && (
                                                        <Check
                                                            className="w-3 h-3 absolute top-1.5 right-1.5 text-white"
                                                            strokeWidth={3}
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {slotId && selectedSlot && (
                                <div className="rounded-xl border border-[#86EFAC] bg-[#F0FDF4] px-4 py-3 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-[#16A34A] flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-bold text-[#166534]">Đã chọn lịch khám</p>
                                        <p className="text-[11px] text-[#15803D] mt-0.5">
                                            {selectedDateMeta?.isToday ? 'Hôm nay' : selectedDateMeta?.weekday} ·{' '}
                                            {formatSlotTimeRange(selectedSlot.start_time, selectedSlot.end_time)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA] px-4 py-8 text-center">
                            <CalendarDays className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
                            <p className="text-[12px] text-[#9CA3AF]">Không có khung giờ trống cho ngày này.</p>
                            <p className="text-[11px] text-[#C4B5FD] mt-1">Thử chọn ngày khác hoặc bác sĩ khác.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
