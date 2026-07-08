'use client';

import { useState } from 'react';
import {
    Building2,
    Phone,
    Mail,
    MapPin,
    Clock,
    Users,
    Brain,
    BellRing,
    MessageSquare,
    Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface ToggleProps {
    enabled: boolean;
    onToggle: () => void;
    label: string;
    description?: string;
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function Toggle({ enabled, onToggle, label, description }: ToggleProps) {
    return (
        <div className="flex items-center justify-between py-3">
            <div>
                <p className="text-[13px] font-bold text-[#2D2D2D]">{label}</p>
                {description && <p className="text-[11px] text-[#9C9C9C] font-medium mt-0.5">{description}</p>}
            </div>
            <button
                onClick={onToggle}
                className={cn(
                    'relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer shrink-0',
                    enabled ? 'bg-brand-500' : 'bg-neutral-200'
                )}
            >
                <span className={cn(
                    'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200',
                    enabled ? 'translate-x-5.5' : 'translate-x-0.5'
                )} />
            </button>
        </div>
    );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl border border-[#EBEBEB] p-6">
            <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-brand-500" />
                </div>
                <h3 className="text-[14px] font-bold text-[#2D2D2D]">{title}</h3>
            </div>
            {children}
        </div>
    );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#9C9C9C] uppercase tracking-wider block">{label}</label>
            <div className="px-3.5 py-2.5 bg-[#F5F5F8] rounded-xl text-[13px] text-[#2D2D2D] font-medium border border-transparent">
                {value}
            </div>
        </div>
    );
}

function InputField({ label, value, unit }: { label: string; value: string; unit?: string }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#9C9C9C] uppercase tracking-wider block">{label}</label>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    defaultValue={value}
                    className="flex-1 px-3.5 py-2.5 bg-white rounded-xl text-[13px] text-[#2D2D2D] font-medium border border-[#EBEBEB] outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
                />
                {unit && <span className="text-[11px] text-[#9C9C9C] font-bold shrink-0">{unit}</span>}
            </div>
        </div>
    );
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export function AdminSettingsPage() {
    const [aiEnabled, setAiEnabled] = useState(true);
    const [emailNotif, setEmailNotif] = useState(true);
    const [smsNotif, setSmsNotif] = useState(false);
    const [autoAssign, setAutoAssign] = useState(true);

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* ── Title ── */}
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                    Cài đặt hệ thống
                                </h1>
                                <p className="text-[13px] text-[#7B7B7B] mt-1 font-medium">
                                    Quản lý cấu hình chung cho hệ thống TriageFlowOPD.
                                </p>
                            </div>
                            <button className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white text-[13px] font-bold rounded-xl hover:bg-brand-600 transition-colors shadow-sm shrink-0 cursor-pointer">
                                <Save className="w-4 h-4" />
                                Lưu thay đổi
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* ── Hospital Info ── */}
                            <SectionCard title="Thông tin bệnh viện" icon={Building2}>
                                <div className="space-y-4">
                                    <ReadOnlyField label="Tên bệnh viện" value="Bệnh viện Đa khoa TriageFlow" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-[#9C9C9C] uppercase tracking-wider flex items-center gap-1.5">
                                                <Phone className="w-3 h-3" /> Số điện thoại
                                            </label>
                                            <div className="px-3.5 py-2.5 bg-[#F5F5F8] rounded-xl text-[13px] text-[#2D2D2D] font-medium">
                                                (028) 3822 1234
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-[#9C9C9C] uppercase tracking-wider flex items-center gap-1.5">
                                                <Mail className="w-3 h-3" /> Email
                                            </label>
                                            <div className="px-3.5 py-2.5 bg-[#F5F5F8] rounded-xl text-[13px] text-[#2D2D2D] font-medium">
                                                info@triageflow.vn
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-[#9C9C9C] uppercase tracking-wider flex items-center gap-1.5">
                                            <MapPin className="w-3 h-3" /> Địa chỉ
                                        </label>
                                        <div className="px-3.5 py-2.5 bg-[#F5F5F8] rounded-xl text-[13px] text-[#2D2D2D] font-medium">
                                            268 Lý Thường Kiệt, Quận 10, TP. Hồ Chí Minh
                                        </div>
                                    </div>
                                </div>
                            </SectionCard>

                            {/* ── Queue Settings ── */}
                            <SectionCard title="Cài đặt hàng đợi" icon={Clock}>
                                <div className="space-y-4">
                                    <InputField label="Thời gian chờ tối đa" value="45" unit="phút" />
                                    <InputField label="Số BN tối đa mỗi phòng" value="20" unit="người" />
                                    <InputField label="Thời gian trung bình mỗi lượt khám" value="15" unit="phút" />
                                    <Toggle
                                        enabled={autoAssign}
                                        onToggle={() => setAutoAssign(!autoAssign)}
                                        label="Tự động phân phòng"
                                        description="Tự động phân bệnh nhân vào phòng khám trống."
                                    />
                                </div>
                            </SectionCard>

                            {/* ── AI Triage ── */}
                            <SectionCard title="AI Triage" icon={Brain}>
                                <div className="space-y-4">
                                    <Toggle
                                        enabled={aiEnabled}
                                        onToggle={() => setAiEnabled(!aiEnabled)}
                                        label="Bật AI phân luồng bệnh nhân"
                                        description="Sử dụng AI để tự động đánh giá mức độ ưu tiên và phân luồng khoa."
                                    />
                                    {aiEnabled && (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-[#9C9C9C] uppercase tracking-wider block">
                                                Mức độ nhạy
                                            </label>
                                            <div className="flex items-center gap-2">
                                                {['Thấp', 'Trung bình', 'Cao'].map((level, i) => (
                                                    <button
                                                        key={level}
                                                        className={cn(
                                                            'px-4 py-2 text-[12px] font-bold rounded-xl border transition-all cursor-pointer',
                                                            i === 1
                                                                ? 'bg-brand-500 text-white border-brand-500'
                                                                : 'bg-white text-[#7B7B7B] border-[#EBEBEB] hover:border-brand-300'
                                                        )}
                                                    >
                                                        {level}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-[#9C9C9C] uppercase tracking-wider flex items-center gap-1.5">
                                            <Users className="w-3 h-3" /> Model AI đang dùng
                                        </label>
                                        <div className="px-3.5 py-2.5 bg-[#F5F5F8] rounded-xl text-[13px] text-[#2D2D2D] font-medium">
                                            TriageFlow AI v2.1 — Fine-tuned GPT-4o
                                        </div>
                                    </div>
                                </div>
                            </SectionCard>

                            {/* ── Notifications ── */}
                            <SectionCard title="Thông báo" icon={BellRing}>
                                <div className="space-y-1 divide-y divide-neutral-100">
                                    <Toggle
                                        enabled={emailNotif}
                                        onToggle={() => setEmailNotif(!emailNotif)}
                                        label="Email thông báo"
                                        description="Gửi email thông báo cho nhân viên khi có bệnh nhân mới."
                                    />
                                    <Toggle
                                        enabled={smsNotif}
                                        onToggle={() => setSmsNotif(!smsNotif)}
                                        label="SMS thông báo"
                                        description="Gửi SMS đến bệnh nhân khi đến lượt khám."
                                    />
                                    <div className="pt-3">
                                        <div className="flex items-center gap-2.5 mb-2">
                                            <MessageSquare className="w-3.5 h-3.5 text-[#9C9C9C]" />
                                            <p className="text-[11px] font-bold text-[#9C9C9C] uppercase tracking-wider">Nhà cung cấp SMS</p>
                                        </div>
                                        <div className="px-3.5 py-2.5 bg-[#F5F5F8] rounded-xl text-[13px] text-[#2D2D2D] font-medium">
                                            eSMS.vn — Gói Enterprise
                                        </div>
                                    </div>
                                </div>
                            </SectionCard>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
