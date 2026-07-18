'use client';

import {
    Banknote,
    Check,
    CreditCard,
    IdCard,
    QrCode,
    Sparkles,
    WalletCards,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { REGISTER_DEPARTMENTS, resolveCatalogSpecialty, translateSpecialtyDisplayName } from '@/modules/reception/constants/registerDepartments';
import {
    formatSlotTimeLabel,
    getDoctorDisplayLabel,
} from '@/modules/reception/utils/receptionMapper';
import type { SymptomTriageSession } from '@/modules/reception/types/infermedica.types';
import type { BackendSpecialtyCatalogItem, ReceptionPriority, ReceptionSlot, ReceptionSpecialty } from '@/modules/reception/types/reception.types';

export type RegisterPaymentMethod = 'bhyt' | 'qr' | 'card' | 'cash';

const PAYMENT_OPTIONS: Array<{
    id: RegisterPaymentMethod;
    label: string;
    hint: string;
    icon: typeof IdCard;
}> = [
    { id: 'bhyt', label: 'Bảo hiểm y tế', hint: 'Áp dụng BHYT', icon: IdCard },
    { id: 'qr', label: 'QR Code / VietQR', hint: 'MoMo, ZaloPay, VietQR', icon: QrCode },
    { id: 'card', label: 'Thẻ ngân hàng', hint: 'ATM, Visa, Mastercard', icon: CreditCard },
    { id: 'cash', label: 'Tiền mặt', hint: 'Thanh toán tại quầy thu ngân', icon: Banknote },
];

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5 border-b border-[#F3F4F6] last:border-0">
            <span className="text-[13px] text-[#9CA3AF] font-medium shrink-0">{label}</span>
            <span className="text-[13px] font-semibold text-[#374151] text-right">{value || '—'}</span>
        </div>
    );
}

interface RegisterConfirmStepProps {
    fullName: string;
    citizenId: string;
    dob: string;
    phone: string;
    insuranceId: string;
    priority: ReceptionPriority;
    symptoms?: string;
    paymentMethod: RegisterPaymentMethod;
    onPaymentMethodChange: (method: RegisterPaymentMethod) => void;
    departmentId: string;
    specialtyCatalog: BackendSpecialtyCatalogItem[];
    selectedSpecialty: ReceptionSpecialty | undefined;
    selectedSlot: ReceptionSlot | undefined;
    triageSession: SymptomTriageSession;
}

function formatDob(dob: string): string {
    if (!dob) return '—';
    const [y, m, d] = dob.slice(0, 10).split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
    return dob;
}

function getDepartmentLabel(
    departmentId: string,
    specialtyCatalog: BackendSpecialtyCatalogItem[],
    specialty: ReceptionSpecialty | undefined,
    triageSession: SymptomTriageSession,
): string {
    const fromCatalog = resolveCatalogSpecialty(departmentId, specialtyCatalog)?.specialty_name;
    if (fromCatalog) return fromCatalog;

    const manualDept = REGISTER_DEPARTMENTS.find((d) => d.id === departmentId)?.label;
    if (manualDept) return manualDept;

    if (specialty?.specialty_name || specialty?.name) {
        const raw = specialty.specialty_name ?? specialty.name ?? '';
        if (!raw.toLowerCase().startsWith('bs')) return raw;
    }
    return '—';
}

function getAiReferenceLabel(triageSession: SymptomTriageSession): string | null {
    if (triageSession.recommended_department_label) {
        return triageSession.recommended_department_label;
    }
    if (triageSession.recommended_specialist?.name) {
        return translateSpecialtyDisplayName(triageSession.recommended_specialist.name);
    }
    return null;
}

function getDoctorLabel(specialty: ReceptionSpecialty | undefined): string {
    return getDoctorDisplayLabel(specialty);
}

function getAiSuggestion(
    triageSession: SymptomTriageSession,
    aiReference: string | null,
): string {
    const dept = aiReference || 'Khám theo triệu chứng';

    const waitHint =
        triageSession.triage_level === 'emergency'
            ? 'Ưu tiên ngay'
            : triageSession.triage_level === 'consultation'
              ? '~20–30 phút'
              : '~15–25 phút';

    return `Gợi ý tham khảo AI: **${dept}** – Thời gian chờ dự kiến: ${waitHint}. Lễ tân đã chọn chuyên khoa chính thức ở bước trước.`;
}

export function RegisterConfirmStep({
    fullName,
    citizenId,
    dob,
    phone,
    insuranceId,
    priority,
    paymentMethod,
    onPaymentMethodChange,
    departmentId,
    specialtyCatalog,
    selectedSpecialty,
    selectedSlot,
    triageSession,
}: RegisterConfirmStepProps) {
    const departmentLabel = getDepartmentLabel(departmentId, specialtyCatalog, selectedSpecialty, triageSession);
    const aiReference = getAiReferenceLabel(triageSession);
    const doctorLabel = getDoctorLabel(selectedSpecialty);
    const bhytLabel = insuranceId.trim() ? insuranceId : 'Không có';
    const aiText = getAiSuggestion(triageSession, aiReference);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Xác nhận thông tin */}
                <div className="rounded-[14px] border border-[#EBEBEB] bg-white p-5 md:p-6 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
                    <h2 className="text-[15px] font-bold text-[#1F2937] mb-4">Xác nhận thông tin</h2>
                    <div>
                        <SummaryRow label="Họ tên" value={fullName} />
                        <SummaryRow label="CCCD" value={citizenId} />
                        <SummaryRow label="Ngày sinh" value={formatDob(dob)} />
                        <SummaryRow label="Điện thoại" value={phone} />
                        <SummaryRow label="Chuyên khoa" value={departmentLabel} />
                        {aiReference && aiReference !== departmentLabel && (
                            <SummaryRow label="AI tham khảo" value={aiReference} />
                        )}
                        <SummaryRow label="BHYT" value={bhytLabel} />
                        <SummaryRow label="Bác sĩ" value={doctorLabel} />
                        <SummaryRow label="Ưu tiên" value={priority} />
                        <SummaryRow
                            label="Giờ khám"
                            value={formatSlotTimeLabel(selectedSlot) || '—'}
                        />
                    </div>
                </div>

                {/* Hình thức thanh toán */}
                <div className="rounded-[14px] border border-[#EBEBEB] bg-white p-5 md:p-6 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
                    <h2 className="text-[15px] font-bold text-[#1F2937] mb-4">Hình thức thanh toán</h2>
                    <div className="space-y-2.5">
                        {PAYMENT_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            const isSelected = paymentMethod === option.id;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => onPaymentMethodChange(option.id)}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-colors touch-manipulation',
                                        isSelected
                                            ? 'border-[#8B7CF6] bg-[#F5F3FF] ring-1 ring-[#8B7CF6]/15'
                                            : 'border-[#F3F4F6] bg-white hover:border-[#E5E7EB]',
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                                            isSelected ? 'bg-[#8B7CF6] text-white' : 'bg-[#F3F4F6] text-[#6B7280]',
                                        )}
                                    >
                                        <Icon className="w-5 h-5" strokeWidth={2} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-bold text-[#374151]">{option.label}</p>
                                        <p className="text-[11px] text-[#9CA3AF] mt-0.5">{option.hint}</p>
                                    </div>
                                    {isSelected && (
                                        <Check className="w-5 h-5 text-[#8B7CF6] shrink-0" strokeWidth={2.5} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* AI banner */}
            <div className="rounded-[14px] border border-[#E0E7FF] bg-[#F5F3FF] px-5 py-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#8B7CF6] flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                    <p className="text-[14px] font-bold text-[#5B21B6]">Kết quả phân loại AI</p>
                    <p className="text-[12px] text-[#6D28D9] mt-1 leading-relaxed">
                        {triageSession.is_analyzed || triageSession.recommended_specialist ? (
                            aiText.split('**').map((part, i) =>
                                i % 2 === 1 ? (
                                    <strong key={i} className="font-bold text-[#5B21B6]">
                                        {part}
                                    </strong>
                                ) : (
                                    <span key={i}>{part}</span>
                                ),
                            )
                        ) : (
                            <>
                                Chưa có kết quả AI chi tiết. Chuyên khoa đề xuất:{' '}
                                <strong className="font-bold text-[#5B21B6]">
                                    {departmentLabel !== '—' ? departmentLabel : 'theo triệu chứng'}
                                </strong>
                                . Số thứ tự sẽ được cấp sau khi xác nhận.
                            </>
                        )}
                    </p>
                </div>
            </div>

            {paymentMethod === 'qr' && (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-3 flex items-center gap-2 text-[12px] text-[#6B7280]">
                    <WalletCards className="w-4 h-4 text-[#8B7CF6]" />
                    Sau khi cấp số thứ tự, chuyển tới mục Thanh toán QR để quét VietQR.
                </div>
            )}
        </div>
    );
}
