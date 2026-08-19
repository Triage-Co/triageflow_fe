'use client';

import {
    Brain,
    Building2,
    Check,
    ChevronRight,
    Package,
    Sparkles,
    Stethoscope,
    User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type BookingMode = 'specialty' | 'ai_triage' | 'package';

interface BookingModeOption {
    id: BookingMode;
    title: string;
    description: string;
    badge: string;
    icon: typeof Stethoscope;
    iconBg: string;
    iconColor: string;
    accentColor: string;
    examples: string[];
}

const MODES: BookingModeOption[] = [
    {
        id: 'specialty',
        title: 'Theo chuyên khoa',
        description: 'Lễ tân hoặc bệnh nhân đã xác định rõ chuyên khoa cần khám (Nội, Ngoại, Tim mạch, Da liễu...).',
        badge: 'Trực tiếp & Nhanh',
        icon: Building2,
        iconBg: 'bg-[#EDE9FE]',
        iconColor: 'text-[#8B7CF6]',
        accentColor: 'border-[#8B7CF6]',
        examples: ['Nội tổng quát', 'Tim mạch', 'Tai mũi họng', 'Nhi khoa'],
    },
    {
        id: 'ai_triage',
        title: 'Gợi ý từ AI (Triage)',
        description: 'Nhập triệu chứng để AI (Infermedica) phân tích tình trạng, hỏi đáp và gợi ý chuyên khoa phù hợp.',
        badge: 'Phân luồng AI',
        icon: Brain,
        iconBg: 'bg-[#DCFCE7]',
        iconColor: 'text-[#16A34A]',
        accentColor: 'border-[#16A34A]',
        examples: ['Đau đầu chóng mặt', 'Sốt cao ho đờm', 'Đau ngực khó thở'],
    },
    {
        id: 'package',
        title: 'Gói khám định sẵn',
        description: 'Lựa chọn gói khám sức khỏe tổng quát, khám nhi, tầm soát tim mạch được cấu hình trọn gói.',
        badge: 'Gói tổng hợp',
        icon: Package,
        iconBg: 'bg-[#FEF3C7]',
        iconColor: 'text-[#D97706]',
        accentColor: 'border-[#F59E0B]',
        examples: ['Khám tổng quát', 'Tầm soát tim mạch', 'Khám sức khỏe nhi'],
    },
];

interface BookingModeSelectorProps {
    selectedMode: BookingMode | null;
    onSelectMode: (mode: BookingMode) => void;
    patientName?: string;
    patientCitizenId?: string;
    patientDob?: string;
}

export function BookingModeSelector({
    selectedMode,
    onSelectMode,
    patientName,
    patientCitizenId,
    patientDob,
}: BookingModeSelectorProps) {
    return (
        <div className="space-y-5">
            {/* Patient banner if available */}
            {patientName && (
                <div className="rounded-2xl border border-[#EDE9FE] bg-gradient-to-r from-[#FAF5FF] to-white p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#8B7CF6] text-white flex items-center justify-center font-bold text-[14px] shadow-sm">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B7CF6]">
                                    Bệnh nhân tiếp nhận
                                </span>
                            </div>
                            <h3 className="text-[15px] font-bold text-[#1F2937] leading-tight">
                                {patientName}
                            </h3>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#6B7280]">
                        {patientCitizenId && (
                            <span className="bg-white border border-[#E5E7EB] px-2.5 py-1 rounded-lg">
                                CCCD: <strong>{patientCitizenId}</strong>
                            </span>
                        )}
                        {patientDob && (
                            <span className="bg-white border border-[#E5E7EB] px-2.5 py-1 rounded-lg">
                                NS: <strong>{patientDob}</strong>
                            </span>
                        )}
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-[16px] font-bold text-[#1F2937]">Chọn phương thức tiếp nhận khám</h2>
                <p className="text-[13px] text-[#9CA3AF] mt-0.5">
                    Chọn 1 trong 3 cách thức để phân bổ phòng khám và bác sĩ phù hợp
                </p>
            </div>

            {/* 3 Kiosk cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {MODES.map((mode) => {
                    const isSelected = selectedMode === mode.id;
                    const Icon = mode.icon;
                    return (
                        <button
                            key={mode.id}
                            type="button"
                            onClick={() => onSelectMode(mode.id)}
                            className={cn(
                                'relative flex flex-col justify-between p-5 rounded-2xl border text-left transition-all group touch-manipulation min-h-[220px]',
                                isSelected
                                    ? 'bg-gradient-to-br from-white to-[#FAF5FF] border-[#8B7CF6] shadow-[0_8px_24px_rgba(139,124,246,0.18)] ring-2 ring-[#8B7CF6]'
                                    : 'bg-white border-[#E5E7EB] hover:border-[#C4B5FD] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5',
                            )}
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-4">
                                    <div
                                        className={cn(
                                            'w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105',
                                            mode.iconBg,
                                        )}
                                    >
                                        <Icon className={cn('w-6 h-6', mode.iconColor)} strokeWidth={2.25} />
                                    </div>
                                    <span
                                        className={cn(
                                            'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border',
                                            isSelected
                                                ? 'bg-[#8B7CF6] text-white border-[#8B7CF6]'
                                                : 'bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]',
                                        )}
                                    >
                                        {mode.badge}
                                    </span>
                                </div>

                                <h3 className="text-[16px] font-bold text-[#1F2937] group-hover:text-[#8B7CF6] transition-colors">
                                    {mode.title}
                                </h3>

                                <p className="text-[12px] text-[#6B7280] mt-1.5 leading-relaxed line-clamp-3">
                                    {mode.description}
                                </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-[#F3F4F6]">
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {mode.examples.slice(0, 3).map((ex, i) => (
                                        <span
                                            key={i}
                                            className="text-[10px] bg-[#F3F4F6] text-[#4B5563] px-2 py-0.5 rounded-md font-medium"
                                        >
                                            {ex}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between text-[12px] font-bold text-[#8B7CF6] mt-2">
                                    <span>{isSelected ? '✓ Đang chọn' : 'Bắt đầu chọn'}</span>
                                    <ChevronRight
                                        className={cn(
                                            'w-4 h-4 transition-transform',
                                            isSelected ? 'translate-x-0' : 'group-hover:translate-x-1',
                                        )}
                                    />
                                </div>
                            </div>

                            {isSelected && (
                                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#8B7CF6] text-white flex items-center justify-center shadow-sm">
                                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
