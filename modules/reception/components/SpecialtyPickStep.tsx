'use client';

import { useMemo, useState } from 'react';
import {
    ArrowLeft,
    Building2,
    Check,
    Search,
    Sparkles,
    Stethoscope,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DoctorSlotPicker } from '@/modules/reception/components/DoctorSlotPicker';
import type {
    BackendSpecialtyCatalogItem,
    ReceptionSlot,
    ReceptionSpecialty,
} from '@/modules/reception/types/reception.types';
import { resolveCatalogSpecialty } from '@/modules/reception/constants/registerDepartments';

interface SpecialtyPickStepProps {
    accessToken: string;
    departmentId: string;
    onDepartmentChange: (departmentId: string) => void;
    specialtyId: string;
    onSpecialtyChange: (specialtyId: string) => void;
    slotId: string;
    onSlotChange: (slotId: string) => void;
    slots: ReceptionSlot[];
    onSlotsChange: (slots: ReceptionSlot[]) => void;
    specialties: ReceptionSpecialty[];
    onSpecialtiesChange: (specialties: ReceptionSpecialty[]) => void;
    specialtyCatalog: BackendSpecialtyCatalogItem[];
    isLoadingMeta?: boolean;
    onChangeMode?: () => void;
}

export function SpecialtyPickStep({
    accessToken,
    departmentId,
    onDepartmentChange,
    specialtyId,
    onSpecialtyChange,
    slotId,
    onSlotChange,
    slots,
    onSlotsChange,
    specialties,
    onSpecialtiesChange,
    specialtyCatalog,
    isLoadingMeta = false,
    onChangeMode,
}: SpecialtyPickStepProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCatalog = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return specialtyCatalog;
        return specialtyCatalog.filter((item) =>
            item.specialty_name.toLowerCase().includes(query) ||
            (item.specialty_code && item.specialty_code.toLowerCase().includes(query))
        );
    }, [specialtyCatalog, searchQuery]);

    const selectedSpecialty = useMemo(
        () => resolveCatalogSpecialty(departmentId, specialtyCatalog),
        [departmentId, specialtyCatalog]
    );

    function handleDepartmentSelect(id: string) {
        onDepartmentChange(id);
        onSpecialtyChange('');
        onSlotChange('');
        onSlotsChange([]);
        onSpecialtiesChange([]);
    }

    return (
        <div className="space-y-5">
            {/* Header with back to mode selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#EDE9FE] flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-[#8B7CF6]" />
                    </div>
                    <div>
                        <h2 className="text-[16px] font-bold text-[#1F2937]">Khám theo chuyên khoa</h2>
                        <p className="text-[12px] text-[#6B7280]">
                            Chọn chuyên khoa cần khám, sau đó chọn bác sĩ và giờ khám phù hợp
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

            {/* Specialty Selection Grid */}
            <div className="rounded-[16px] border border-[#EBEBEB] bg-white p-5 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-[#8B7CF6]" strokeWidth={2.25} />
                        <h3 className="text-[15px] font-bold text-[#1F2937]">
                            1. Chọn chuyên khoa khám <span className="text-[#EF4444]">*</span>
                        </h3>
                    </div>

                    {/* Search box for departments */}
                    <div className="relative min-w-[200px] sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
                        <input
                            type="text"
                            placeholder="Tìm tên chuyên khoa..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-[12px] rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] focus:bg-white focus:border-[#8B7CF6] outline-none transition"
                        />
                    </div>
                </div>

                {isLoadingMeta && specialtyCatalog.length === 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-14 rounded-xl bg-[#F3F4F6] animate-pulse" />
                        ))}
                    </div>
                ) : filteredCatalog.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[480px] overflow-y-auto pr-1">
                        {filteredCatalog.map((item) => {
                            const isSelected = departmentId === item.specialty_id;
                            return (
                                <button
                                    key={item.specialty_id}
                                    type="button"
                                    onClick={() => handleDepartmentSelect(item.specialty_id)}
                                    className={cn(
                                        'flex items-center justify-between p-3 rounded-xl border text-left transition-all touch-manipulation',
                                        isSelected
                                            ? 'border-[#8B7CF6] bg-[#8B7CF6] text-white shadow-[0_2px_10px_rgba(139,124,246,0.3)] ring-1 ring-[#8B7CF6]'
                                            : 'border-[#E5E7EB] bg-[#FAFAFA] text-[#374151] hover:border-[#C4B5FD] hover:bg-[#F5F3FF]',
                                    )}
                                >
                                    <div className="min-w-0 pr-1">
                                        <p className="text-[13px] font-bold truncate">
                                            {item.specialty_name}
                                        </p>

                                    </div>
                                    {isSelected && (
                                        <div className="w-5 h-5 rounded-full bg-white text-[#8B7CF6] flex items-center justify-center shrink-0">
                                            <Check className="w-3 h-3" strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-[12px] text-[#9CA3AF] py-6 text-center">
                        Không tìm thấy chuyên khoa nào phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.
                    </p>
                )}

                {selectedSpecialty && (
                    <div className="mt-3.5 pt-3 border-t border-[#F3F4F6] flex items-center justify-between text-[12px]">
                        <span className="text-[#6B7280]">
                            Chuyên khoa đã chọn:{' '}
                            <strong className="text-[#8B7CF6]">{selectedSpecialty.specialty_name}</strong>
                        </span>
                    </div>
                )}
            </div>

            {/* Doctor & Slot Picker */}
            {departmentId && (
                <div>
                    <div className="mb-3">
                        <h3 className="text-[15px] font-bold text-[#1F2937]">2. Chọn bác sĩ và khung giờ</h3>
                    </div>
                    <DoctorSlotPicker
                        accessToken={accessToken}
                        departmentId={departmentId}
                        specialtyCatalog={specialtyCatalog}
                        specialtyId={specialtyId}
                        onSpecialtyChange={onSpecialtyChange}
                        slotId={slotId}
                        onSlotChange={onSlotChange}
                        slots={slots}
                        onSlotsChange={onSlotsChange}
                        specialties={specialties}
                        onSpecialtiesChange={onSpecialtiesChange}
                        isLoadingMeta={isLoadingMeta}
                    />
                </div>
            )}
        </div>
    );
}
