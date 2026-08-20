'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    Check,
    CheckCircle2,
    Clock,
    Loader2,
    Package,
    Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
    BackendSpecialtyCatalogItem,
    ExamPackage,
    ExamPackageDetail,
    ReceptionSlot,
    ReceptionSpecialty,
    RoomSlot,
} from '@/modules/reception/types/reception.types';
import { receptionService } from '@/modules/reception/services/receptionService';

interface PackagePickStepProps {
    accessToken: string;
    departmentId: string;
    onDepartmentChange: (departmentId: string) => void;
    specialtyId: string;
    onSpecialtyChange: (specialtyId: string) => void;
    slotId: string;
    onSlotChange: (slotId: string) => void;
    packageId?: string;
    onPackageChange?: (packageId: string) => void;
    slots: ReceptionSlot[];
    onSlotsChange: (slots: ReceptionSlot[]) => void;
    specialties: ReceptionSpecialty[];
    onSpecialtiesChange: (specialties: ReceptionSpecialty[]) => void;
    specialtyCatalog: BackendSpecialtyCatalogItem[];
    isLoadingMeta?: boolean;
    onChangeMode?: () => void;
}

export function PackagePickStep({
    accessToken,
    departmentId,
    onDepartmentChange,
    specialtyId,
    onSpecialtyChange,
    slotId,
    onSlotChange,
    packageId,
    onPackageChange,
    slots,
    onSlotsChange,
    specialties,
    onSpecialtiesChange,
    specialtyCatalog,
    isLoadingMeta = false,
    onChangeMode,
}: PackagePickStepProps) {
    const [packages, setPackages] = useState<ExamPackage[]>([]);
    const [isLoadingPackages, setIsLoadingPackages] = useState(true);
    const [packagesError, setPackagesError] = useState<string | null>(null);

    const [selectedPkgId, setSelectedPkgId] = useState<string>(packageId || '');
    const [packageDetail, setPackageDetail] = useState<ExamPackageDetail | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    const [selectedDate, setSelectedDate] = useState<string>('');
    const [roomSlots, setRoomSlots] = useState<RoomSlot[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);

    // 8-day date list
    const daysList = useMemo(() => {
        const days = [];
        const now = new Date();
        for (let i = 0; i < 8; i++) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const formatted = `${year}-${month}-${day}`;

            let dayLabel = '';
            if (i === 0) dayLabel = 'Hôm nay';
            else if (i === 1) dayLabel = 'Ngày mai';
            else {
                const dayOfWeek = d.getDay();
                const vietnameseDays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
                dayLabel = vietnameseDays[dayOfWeek];
            }

            days.push({
                dateValue: formatted,
                dayLabel,
                dateStr: `${day}/${month}`,
            });
        }
        return days;
    }, []);

    // Load package list from GET /api/exam-package
    useEffect(() => {
        let mounted = true;
        const loadPackages = async () => {
            try {
                setIsLoadingPackages(true);
                setPackagesError(null);
                const list = await receptionService.getExamPackages(accessToken);
                if (mounted) {
                    setPackages(list.filter((pkg) => pkg.is_active !== false));
                    if (packageId) {
                        setSelectedPkgId(packageId);
                    }
                }
            } catch (err) {
                if (mounted) {
                    setPackagesError('Không thể tải danh sách gói khám từ máy chủ.');
                    setPackages([]);
                }
            } finally {
                if (mounted) setIsLoadingPackages(false);
            }
        };

        loadPackages();
        return () => {
            mounted = false;
        };
    }, [accessToken, packageId]);

    // Initial date
    useEffect(() => {
        if (!selectedDate && daysList.length > 0) {
            setSelectedDate(daysList[0].dateValue);
        }
    }, [selectedDate, daysList]);

    // Load package detail when package selected
    useEffect(() => {
        if (!selectedPkgId) {
            setPackageDetail(null);
            return;
        }

        let mounted = true;
        const loadDetail = async () => {
            try {
                setIsLoadingDetail(true);
                const detail = await receptionService.getExamPackageDetail(selectedPkgId, accessToken);
                if (mounted) {
                    setPackageDetail(detail);
                }
            } catch {
                if (mounted) setPackageDetail(null);
            } finally {
                if (mounted) setIsLoadingDetail(false);
            }
        };

        loadDetail();
        return () => {
            mounted = false;
        };
    }, [selectedPkgId, accessToken]);

    // Load room slots when date changes
    useEffect(() => {
        if (!selectedDate || !selectedPkgId) {
            setRoomSlots([]);
            return;
        }

        let mounted = true;
        const loadSlots = async () => {
            try {
                setIsLoadingSlots(true);
                const slotsData = await receptionService.getRoomSlots(selectedDate, accessToken);
                if (mounted) {
                    let available = slotsData.filter((s) => s.status === 'AVAILABLE' || !s.status);
                    const now = new Date();
                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    if (selectedDate === todayStr) {
                        const currentHour = now.getHours();
                        const currentMinute = now.getMinutes();
                        available = available.filter(s => {
                            if (!s.start_time) return true;
                            const [hourStr, minStr] = s.start_time.split(':');
                            const hour = parseInt(hourStr, 10);
                            const min = parseInt(minStr, 10);
                            return hour > currentHour || (hour === currentHour && min > currentMinute);
                        });
                    }
                    setRoomSlots(available);

                    // Map to ReceptionSlot format for parent form
                    const mappedReceptionSlots: ReceptionSlot[] = available.map((s) => ({
                        slot_id: s.slot_id,
                        start_time: s.start_time,
                        end_time: s.end_time,
                        room_name: 'Phòng Khám Tổng Quát & Gói Dịch Vụ',
                        capacity: s.capacity,
                        max_capacity: s.max_capacity,
                        shift: {
                            date: selectedDate,
                        },
                    }));
                    onSlotsChange(mappedReceptionSlots);
                }
            } catch {
                if (mounted) {
                    setRoomSlots([]);
                    onSlotsChange([]);
                }
            } finally {
                if (mounted) setIsLoadingSlots(false);
            }
        };

        loadSlots();
        return () => {
            mounted = false;
        };
    }, [selectedDate, selectedPkgId, accessToken]);

    function handleSelectPackage(pkg: ExamPackage) {
        setSelectedPkgId(pkg.package_id);
        onPackageChange?.(pkg.package_id);
        onSlotChange('');

        // Provide dummy specialty for form compatibility
        if (specialtyCatalog.length > 0) {
            onDepartmentChange(specialtyCatalog[0].specialty_id);
        }
        onSpecialtiesChange([
            {
                specialty_id: pkg.package_id,
                name: pkg.package_name,
                specialty_name: pkg.package_name,
                room_name: 'Phòng Khám Gói Dịch Vụ',
            },
        ]);
    }

    const selectedPkg = packages.find((p) => p.package_id === selectedPkgId) || packageDetail;

    return (
        <div className="space-y-6">
            {/* Header with back button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                        <Package className="w-5 h-5 text-[#D97706]" />
                    </div>
                    <div>
                        <h2 className="text-[16px] font-bold text-[#1F2937]">Gói khám sức khỏe định sẵn</h2>
                        <p className="text-[12px] text-[#6B7280]">
                            Chọn gói dịch vụ y tế được cấu hình sẵn trên hệ thống
                        </p>
                    </div>
                </div>

                {onChangeMode && (
                    <button
                        type="button"
                        onClick={onChangeMode}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[12px] font-bold text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1F2937] transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Đổi hướng khám
                    </button>
                )}
            </div>

            {/* 1. Package Selection */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[15px] font-bold text-[#1F2937]">
                        1. Lựa chọn gói khám <span className="text-[#EF4444]">*</span>
                    </h3>
                    {packages.length > 0 && (
                        <span className="text-[12px] text-neutral-500 font-medium">
                            {packages.length} gói khả dụng
                        </span>
                    )}
                </div>

                {isLoadingPackages ? (
                    <div className="flex flex-col items-center justify-center py-10 text-neutral-400 bg-neutral-50/50 rounded-2xl border border-neutral-100">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
                        <p className="text-xs font-semibold">Đang tải danh sách gói khám...</p>
                    </div>
                ) : packagesError ? (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{packagesError}</span>
                    </div>
                ) : packages.length === 0 ? (
                    <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-neutral-200/60">
                        <Package className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                        <p className="text-sm font-bold text-neutral-700">Chưa có gói khám nào</p>
                        <p className="text-xs text-neutral-400 mt-1">Hiện tại hệ thống chưa cập nhật gói khám dịch vụ.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {packages.map((pkg) => {
                            const isSelected = selectedPkgId === pkg.package_id;
                            return (
                                <button
                                    key={pkg.package_id}
                                    type="button"
                                    onClick={() => handleSelectPackage(pkg)}
                                    className={cn(
                                        'relative flex flex-col justify-between p-4 rounded-2xl border text-left transition-all group touch-manipulation',
                                        isSelected
                                            ? 'bg-gradient-to-br from-[#FFFBEB] to-white border-[#F59E0B] shadow-[0_4px_16px_rgba(245,158,11,0.18)] ring-2 ring-[#F59E0B]'
                                            : 'bg-white border-[#E5E7EB] hover:border-[#FCD34D] hover:shadow-sm',
                                    )}
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-md">
                                                Gói dịch vụ
                                            </span>
                                            <span className="text-[14px] font-extrabold text-[#D97706]">
                                                {pkg.price ? `${pkg.price.toLocaleString('vi-VN')} đ` : 'Miễn phí'}
                                            </span>
                                        </div>

                                        <h4 className="text-[14px] font-bold text-[#1F2937] group-hover:text-[#D97706] transition-colors leading-snug">
                                            {pkg.package_name}
                                        </h4>

                                        <p className="text-[11px] text-[#6B7280] leading-relaxed line-clamp-3">
                                            {pkg.description || 'Gói khám dịch vụ toàn diện.'}
                                        </p>
                                    </div>

                                    <div className="mt-4 pt-2.5 border-t border-[#F3F4F6] flex items-center justify-between text-[11px] font-bold">
                                        <span className={isSelected ? 'text-[#D97706]' : 'text-[#9CA3AF]'}>
                                            {isSelected ? '✓ Đã chọn gói này' : 'Bấm để chọn'}
                                        </span>
                                    </div>

                                    {isSelected && (
                                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#F59E0B] text-white flex items-center justify-center shadow-sm">
                                            <Check className="w-3 h-3" strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 2. Package Details & Steps (if detail loaded) */}
            {selectedPkg && packageDetail?.template?.steps && packageDetail.template.steps.length > 0 && (
                <div className="bg-amber-50/50 border border-amber-200/70 rounded-2xl p-4">
                    <h4 className="text-[13px] font-bold text-amber-900 mb-2.5 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        Các danh mục & bước khám trong gói:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {packageDetail.template.steps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-white/90 border border-amber-100 rounded-xl p-2.5 text-[12px] text-neutral-800">
                                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                                <span className="font-semibold">{step.step_name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. Slot Picker for Package */}
            {selectedPkg && (
                <div className="space-y-4 pt-2 border-t border-[#E5E7EB]">
                    <div>
                        <h3 className="text-[15px] font-bold text-[#1F2937]">
                            2. Chọn ngày & khung giờ khám cho gói &ldquo;{selectedPkg.package_name}&rdquo; <span className="text-[#EF4444]">*</span>
                        </h3>
                        <p className="text-[12px] text-[#6B7280] mt-0.5">
                            Chọn ngày và giờ phù hợp để bệnh nhân đến tiếp nhận khám
                        </p>
                    </div>

                    {/* Date Picker Bar */}
                    <div className="space-y-2">
                        <span className="text-[12px] font-bold text-neutral-600 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-600" /> Chọn ngày khám:
                        </span>
                        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            {daysList.map((day) => {
                                const isActive = selectedDate === day.dateValue;
                                return (
                                    <button
                                        key={day.dateValue}
                                        type="button"
                                        onClick={() => {
                                            setSelectedDate(day.dateValue);
                                            onSlotChange('');
                                        }}
                                        className={cn(
                                            'min-w-[100px] py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all',
                                            isActive
                                                ? 'bg-[#D97706] border-[#D97706] text-white font-extrabold shadow-sm'
                                                : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-semibold',
                                        )}
                                    >
                                        <span className="text-[12px]">{day.dayLabel}</span>
                                        <span className={cn('text-[10px]', isActive ? 'text-white/80' : 'text-neutral-400 font-mono')}>
                                            {day.dateStr}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Slots Grid */}
                    <div className="space-y-2">
                        <span className="text-[12px] font-bold text-neutral-600 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> Chọn khung giờ khám:
                        </span>

                        {isLoadingSlots ? (
                            <div className="flex items-center justify-center py-6 text-neutral-400 bg-neutral-50/50 rounded-xl border border-neutral-100">
                                <Loader2 className="w-5 h-5 animate-spin text-amber-500 mr-2" />
                                <span className="text-xs">Đang kiểm tra khung giờ trống...</span>
                            </div>
                        ) : roomSlots.length === 0 ? (
                            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-center text-xs text-neutral-400">
                                Không có khung giờ trống nào cho ngày này. Vui lòng chọn ngày khác.
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {roomSlots.map((slot) => {
                                    const isSelected = slotId === slot.slot_id;
                                    return (
                                        <button
                                            key={slot.slot_id}
                                            type="button"
                                            onClick={() => onSlotChange(slot.slot_id)}
                                            className={cn(
                                                'py-2.5 px-3 rounded-xl border text-center font-bold text-[13px] transition-all flex flex-col items-center justify-center gap-0.5',
                                                isSelected
                                                    ? 'bg-amber-600 border-amber-600 text-white shadow-md'
                                                    : 'bg-white border-neutral-200 hover:border-amber-300 hover:bg-amber-50/30 text-neutral-800',
                                            )}
                                        >
                                            <span className="font-mono">{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>
                                            <span className={cn('text-[10px]', isSelected ? 'text-white/80' : 'text-neutral-400')}>
                                                Trống
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
