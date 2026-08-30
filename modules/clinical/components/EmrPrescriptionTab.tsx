'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Loader2,
    Pencil,
    Pill,
    Plus,
    Printer,
    Save,
    Trash2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { clinicalService } from '@/modules/clinical/services/clinicalService';
import { doctorPrescriptionService } from '@/modules/clinical/services/doctorPrescriptionService';
import { MedicineSlideOverPanel } from '@/modules/clinical/components/MedicineSlideOverPanel';
import {
    buildPrescriptionForPrint,
    printPrescription,
} from '@/modules/clinical/components/PrescriptionPrintView';
import { useAuthStore } from '@/store/authStore';
import type {
    CreatePrescriptionDetailDto,
    Medicine,
    Prescription,
    PrescriptionStatusEnum,
} from '@/shared/types/prescription.types';
import { cn } from '@/lib/utils';

interface DraftItem {
    medicine: Medicine;
    quantity: number;
    dosage_instruction: string;
    note: string;
}

type TabMode =
    | 'loading'
    | 'no-session'
    | 'empty'
    | 'view-editable'
    | 'view-readonly'
    | 'editing';

const STATUS_LABEL: Record<PrescriptionStatusEnum, string> = {
    PENDING: 'Chờ xử lý',
    PROCESSING: 'Đang soạn',
    PREPARED: 'Đã soạn',
    DISPENSED: 'Đã phát',
    CANCELLED: 'Đã hủy',
    EXPIRED: 'Hết hạn',
};

function statusBadgeClass(status: PrescriptionStatusEnum): string {
    switch (status) {
        case 'PENDING':
            return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'PROCESSING':
            return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'PREPARED':
            return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        case 'DISPENSED':
            return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'CANCELLED':
        case 'EXPIRED':
            return 'bg-neutral-100 text-neutral-600 border-neutral-200';
        default:
            return 'bg-neutral-100 text-neutral-600 border-neutral-200';
    }
}

function medicineFromDetail(detail: Prescription['prescriptionDetails'][number]): Medicine {
    return {
        medicine_id: detail.medicine_id,
        medicine_code: detail.medicine?.medicine_code || '',
        medicine_name: detail.medicine?.medicine_name || 'Thuốc',
        active_ingredient: detail.medicine?.active_ingredient || '',
        unit: detail.medicine?.unit || '',
        usage_route: detail.medicine?.usage_route || '',
        unit_price: detail.unit_price || 0,
        is_active: true,
        created_at: '',
        updated_at: '',
    };
}

function toDetailsDto(items: DraftItem[]): CreatePrescriptionDetailDto[] {
    return items.map((item) => ({
        medicine_id: item.medicine.medicine_id,
        quantity: Number(item.quantity) || 1,
        dosage_instruction: item.dosage_instruction,
        note: item.note || undefined,
    }));
}

function pickVisitSessionId(raw: unknown): string | null {
    let list: Array<Record<string, unknown>> = [];
    if (Array.isArray(raw)) {
        list = raw as Array<Record<string, unknown>>;
    } else if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        if (Array.isArray(obj.data)) {
            list = obj.data as Array<Record<string, unknown>>;
        } else if (obj.data && typeof obj.data === 'object') {
            const nested = obj.data as Record<string, unknown>;
            if (Array.isArray(nested.data)) {
                list = nested.data as Array<Record<string, unknown>>;
            } else if (typeof nested.visit_session_id === 'string') {
                return nested.visit_session_id;
            }
        } else if (typeof obj.visit_session_id === 'string') {
            return obj.visit_session_id;
        }
    }
    if (list.length === 0) return null;
    const sorted = [...list].sort((a, b) => {
        const da = new Date(String(a.visit_date || a.created_at || 0)).getTime();
        const db = new Date(String(b.visit_date || b.created_at || 0)).getTime();
        return db - da;
    });
    const id = sorted[0]?.visit_session_id;
    return typeof id === 'string' && id ? id : null;
}

function qrPayload(prescription: Prescription): string {
    return prescription.qr_code || prescription.prescription_code;
}

export interface EmrPrescriptionTabProps {
    patient: Patient;
    visitSessionId?: string;
    onFlowChanged?: () => void;
    refreshKey?: number;
}

export function EmrPrescriptionTab({
    patient,
    visitSessionId: visitSessionIdProp,
    onFlowChanged,
    refreshKey = 0,
}: EmrPrescriptionTabProps) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const authUser = useAuthStore((s) => s.user);
    const authProfile = useAuthStore((s) => s.profile);

    const [mode, setMode] = useState<TabMode>('loading');
    const [resolvedSessionId, setResolvedSessionId] = useState<string | null>(null);
    const [prescription, setPrescription] = useState<Prescription | null>(null);
    const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
    const [diagnosisNote, setDiagnosisNote] = useState('Uống thuốc đúng giờ, đủ liều');
    const [slideOpen, setSlideOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const patientId = patient.patientId || '';

    const showToast = useCallback((message: string) => {
        setToast(message);
        window.setTimeout(() => setToast(null), 2800);
    }, []);

    const loadPrescription = useCallback(
        async (sessionId: string) => {
            setError(null);
            const rx = await doctorPrescriptionService.getByVisitSession(sessionId);
            if (!rx) {
                setPrescription(null);
                setDraftItems([]);
                setDiagnosisNote('Uống thuốc đúng giờ, đủ liều');
                setMode('empty');
                return;
            }
            setPrescription(rx);
            setDiagnosisNote(rx.diagnosis_note || '');
            const items = (rx.prescriptionDetails || []).map((d) => ({
                medicine: medicineFromDetail(d),
                quantity: d.quantity,
                dosage_instruction: d.dosage_instruction || '',
                note: d.note || '',
            }));
            setDraftItems(items);
            setMode(rx.status === 'PENDING' ? 'view-editable' : 'view-readonly');
        },
        []
    );

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            if (!accessToken) {
                setMode('no-session');
                setError('Chưa đăng nhập');
                return;
            }

            setMode('loading');
            setError(null);

            try {
                let sessionId = (visitSessionIdProp || '').trim();

                if (!sessionId && patientId) {
                    const res = await clinicalService.getVisitSessionByPatientId(
                        patientId,
                        accessToken
                    );
                    sessionId = pickVisitSessionId(res) || '';
                }

                if (cancelled) return;

                if (!sessionId) {
                    setResolvedSessionId(null);
                    setPrescription(null);
                    setMode('no-session');
                    return;
                }

                setResolvedSessionId(sessionId);
                await loadPrescription(sessionId);
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'Không thể tải đơn thuốc');
                setMode('no-session');
            }
        };

        void run();
        return () => {
            cancelled = true;
        };
    }, [accessToken, patientId, visitSessionIdProp, refreshKey, loadPrescription]);

    const selectedMedicineIds = useMemo(
        () => draftItems.map((i) => i.medicine.medicine_id),
        [draftItems]
    );

    const totalAmount = useMemo(
        () =>
            draftItems.reduce(
                (sum, item) => sum + (item.medicine.unit_price || 0) * (Number(item.quantity) || 0),
                0
            ),
        [draftItems]
    );

    const handleAddMedicine = (med: Medicine) => {
        setDraftItems((prev) => {
            const idx = prev.findIndex((p) => p.medicine.medicine_id === med.medicine_id);
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
                return next;
            }
            return [
                ...prev,
                {
                    medicine: med,
                    quantity: 10,
                    dosage_instruction: 'Sáng 1 viên, tối 1 viên sau ăn',
                    note: '',
                },
            ];
        });
        if (mode === 'view-editable') setMode('editing');
    };

    const updateDraftItem = (index: number, patch: Partial<DraftItem>) => {
        setDraftItems((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], ...patch };
            return next;
        });
    };

    const removeDraftItem = (index: number) => {
        setDraftItems((prev) => prev.filter((_, i) => i !== index));
        if (mode === 'view-editable') setMode('editing');
    };

    const handleCreate = async () => {
        if (!resolvedSessionId) return;
        if (draftItems.length === 0) {
            setError('Vui lòng thêm ít nhất một loại thuốc');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const created = await doctorPrescriptionService.create({
                visit_session_id: resolvedSessionId,
                diagnosis_note: diagnosisNote,
                details: toDetailsDto(draftItems),
            });
            setPrescription(created);
            setMode(created.status === 'PENDING' ? 'view-editable' : 'view-readonly');
            showToast('Đã lưu đơn thuốc');
            // BE đã gắn bước DISPENSING — refresh flow EMR
            onFlowChanged?.();
            await loadPrescription(resolvedSessionId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể tạo đơn thuốc');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!prescription || !resolvedSessionId) return;
        if (draftItems.length === 0) {
            setError('Đơn thuốc phải còn ít nhất một loại thuốc');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const updated = await doctorPrescriptionService.update(prescription.prescription_id, {
                diagnosis_note: diagnosisNote,
                details: toDetailsDto(draftItems),
            });
            setPrescription(updated);
            setMode('view-editable');
            showToast('Đã cập nhật đơn thuốc');
            onFlowChanged?.();
            await loadPrescription(resolvedSessionId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể cập nhật đơn thuốc');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePrescription = async () => {
        if (!prescription || !resolvedSessionId) return;
        if (!window.confirm(`Xóa đơn ${prescription.prescription_code}? Thao tác không hoàn tác.`)) {
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await doctorPrescriptionService.remove(prescription.prescription_id);
            setPrescription(null);
            setDraftItems([]);
            setDiagnosisNote('Uống thuốc đúng giờ, đủ liều');
            setMode('empty');
            showToast('Đã xóa đơn thuốc');
            onFlowChanged?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể xóa đơn thuốc');
        } finally {
            setSubmitting(false);
        }
    };

    const doctorDisplayName =
        authProfile?.user_name || authUser?.fullName || prescription?.prescribed_by_name;

    const handlePrint = () => {
        if (draftItems.length === 0) {
            setError('Thêm ít nhất một loại thuốc trước khi in đơn');
            return;
        }

        try {
            const printable = buildPrescriptionForPrint({
                patient,
                draftItems,
                diagnosisNote,
                visitSessionId: resolvedSessionId,
                prescribedByName: doctorDisplayName,
                existingPrescription:
                    prescription && mode !== 'empty' ? prescription : null,
            });
            printPrescription(printable, patient);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể mở bản in');
        }
    };

    const isEditable = mode === 'empty' || mode === 'editing';
    const showDraftTable = mode === 'empty' || mode === 'editing' || mode === 'view-editable';
    const canMutateRows = mode === 'empty' || mode === 'editing' || mode === 'view-editable';

    if (mode === 'loading') {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#9C9C9C]">
                <Loader2 className="h-5 w-5 animate-spin text-[#8B7CF6]" />
                Đang tải đơn thuốc...
            </div>
        );
    }

    if (mode === 'no-session') {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                        <p className="font-bold">Chưa có phiên khám</p>
                        <p className="mt-1 text-xs">
                            {error || 'Không tìm thấy visit session để kê đơn cho bệnh nhân này.'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative space-y-4">
            {toast && (
                <div className="fixed right-6 top-20 z-50 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg">
                    {toast}
                </div>
            )}

            <div className="rounded-2xl border border-[#EBEBEB] bg-white p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-bold text-[#2D2D2D]">
                            <Pill className="h-4 w-4 text-[#8B7CF6]" />
                            Đơn thuốc ngoại trú
                        </h3>
                        <p className="mt-0.5 text-xs text-[#9C9C9C]">
                            Kê đơn theo danh mục thuốc · QR dùng tại nhà thuốc
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {prescription && (
                            <>
                                <span className="rounded-full border border-[#E8E7F5] bg-[#F5F2FF] px-2.5 py-0.5 text-[10px] font-bold text-[#6B5FD6]">
                                    {prescription.prescription_code}
                                </span>
                                <span
                                    className={cn(
                                        'rounded-full border px-2.5 py-0.5 text-[10px] font-bold',
                                        statusBadgeClass(prescription.status)
                                    )}
                                >
                                    {STATUS_LABEL[prescription.status] || prescription.status}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        {error}
                    </div>
                )}

                {mode === 'view-readonly' && prescription && (
                    <ReadonlyPrescriptionBody
                        prescription={prescription}
                        onPrint={handlePrint}
                    />
                )}

                {showDraftTable && (
                    <>
                        <div className="overflow-x-auto rounded-xl border border-[#EBEBEB]">
                            <table className="w-full min-w-[640px] text-left text-xs">
                                <thead className="bg-[#F8F7FC] text-[10px] uppercase tracking-wide text-[#7C7C8A]">
                                    <tr>
                                        <th className="px-3 py-2 font-bold">STT</th>
                                        <th className="px-3 py-2 font-bold">Tên thuốc</th>
                                        <th className="px-3 py-2 font-bold">Liều dùng</th>
                                        <th className="px-3 py-2 font-bold">SL</th>
                                        <th className="px-3 py-2 font-bold">Thành tiền</th>
                                        {canMutateRows && (
                                            <th className="px-3 py-2 font-bold" />
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {draftItems.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-3 py-8 text-center text-[#9C9C9C]"
                                            >
                                                Chưa có thuốc. Bấm &quot;Thêm thuốc&quot; để bắt đầu.
                                            </td>
                                        </tr>
                                    ) : (
                                        draftItems.map((item, index) => {
                                            const lineTotal =
                                                (item.medicine.unit_price || 0) *
                                                (Number(item.quantity) || 0);
                                            const canEditRow = isEditable;
                                            return (
                                                <tr
                                                    key={`${item.medicine.medicine_id}-${index}`}
                                                    className="border-t border-[#F0F0F0]"
                                                >
                                                    <td className="px-3 py-2 text-[#9C9C9C]">{index + 1}</td>
                                                    <td className="px-3 py-2">
                                                        <p className="font-semibold text-[#2D2D2D]">
                                                            {item.medicine.medicine_name}
                                                        </p>
                                                        <p className="text-[10px] text-[#9C9C9C]">
                                                            {item.medicine.medicine_code} ·{' '}
                                                            {(item.medicine.unit_price || 0).toLocaleString(
                                                                'vi-VN'
                                                            )}{' '}
                                                            đ/{item.medicine.unit || 'ĐV'}
                                                        </p>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {canEditRow ? (
                                                            <input
                                                                value={item.dosage_instruction}
                                                                onChange={(e) =>
                                                                    updateDraftItem(index, {
                                                                        dosage_instruction: e.target.value,
                                                                    })
                                                                }
                                                                className="w-full min-w-[140px] rounded-lg border border-[#E8E7F5] px-2 py-1.5 outline-none focus:border-[#8B7CF6]"
                                                            />
                                                        ) : (
                                                            item.dosage_instruction || '—'
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {canEditRow ? (
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                value={item.quantity}
                                                                onChange={(e) =>
                                                                    updateDraftItem(index, {
                                                                        quantity: Number(e.target.value) || 1,
                                                                    })
                                                                }
                                                                className="w-16 rounded-lg border border-[#E8E7F5] px-2 py-1.5 outline-none focus:border-[#8B7CF6]"
                                                            />
                                                        ) : (
                                                            item.quantity
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 font-semibold">
                                                        {lineTotal.toLocaleString('vi-VN')} đ
                                                    </td>
                                                    {(canEditRow || mode === 'view-editable') && (
                                                        <td className="px-3 py-2 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (mode === 'view-editable') {
                                                                        setMode('editing');
                                                                    }
                                                                    removeDraftItem(index);
                                                                }}
                                                                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 cursor-pointer"
                                                                title="Xóa thuốc"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {(mode === 'empty' || mode === 'editing' || mode === 'view-editable') && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (mode === 'view-editable') setMode('editing');
                                    setSlideOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#8B7CF6]/50 bg-[#F5F2FF] px-3 py-2 text-xs font-bold text-[#6B5FD6] hover:bg-[#EFEAFF] cursor-pointer"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Thêm thuốc
                            </button>
                        )}

                        <div>
                            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#7C7C8A]">
                                Lời dặn bác sĩ
                            </label>
                            <textarea
                                value={diagnosisNote}
                                onChange={(e) => {
                                    setDiagnosisNote(e.target.value);
                                    if (mode === 'view-editable') setMode('editing');
                                }}
                                disabled={false}
                                rows={3}
                                className="w-full rounded-xl border border-[#E8E7F5] bg-[#F5F5F8] px-3 py-2 text-sm outline-none focus:border-[#8B7CF6] focus:bg-white disabled:opacity-70"
                            />
                        </div>

                        {(prescription || draftItems.length > 0) && (
                            <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-[#EBEBEB] bg-[#FAFAFC] p-4">
                                <div className="flex items-center gap-3">
                                    {prescription ? (
                                        <>
                                            <div className="rounded-xl border border-white bg-white p-2 shadow-sm">
                                                <QRCodeSVG
                                                    value={qrPayload(prescription)}
                                                    size={96}
                                                    level="M"
                                                    includeMargin={false}
                                                />
                                            </div>
                                            <p className="max-w-[120px] text-[11px] font-semibold text-[#7C7C8A]">
                                                Quét tại nhà thuốc để nhận thuốc
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-xs text-[#9C9C9C]">
                                            QR sẽ hiện sau khi lưu đơn.
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-bold uppercase text-[#9C9C9C]">Tổng tiền</p>
                                    <p className="text-lg font-bold text-[#2D2D2D]">
                                        {(prescription && mode !== 'editing'
                                            ? prescription.total_amount
                                            : totalAmount
                                        ).toLocaleString('vi-VN')}{' '}
                                        đ
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap justify-end gap-2">
                            {mode === 'empty' && (
                                <>
                                    <button
                                        type="button"
                                        disabled={draftItems.length === 0}
                                        onClick={handlePrint}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8E7F5] bg-white px-4 py-2 text-xs font-bold text-[#555] hover:bg-[#F5F5F8] disabled:opacity-50 cursor-pointer"
                                    >
                                        <Printer className="h-3.5 w-3.5" />
                                        In đơn thuốc
                                    </button>
                                    <button
                                        type="button"
                                        disabled={submitting || draftItems.length === 0}
                                        onClick={() => void handleCreate()}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B7CF6] px-4 py-2 text-xs font-bold text-white hover:bg-[#7A6BE8] disabled:opacity-50 cursor-pointer"
                                    >
                                        {submitting ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Save className="h-3.5 w-3.5" />
                                        )}
                                        Lưu đơn thuốc
                                    </button>
                                </>
                            )}

                            {mode === 'view-editable' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setMode('editing')}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8E7F5] bg-white px-4 py-2 text-xs font-bold text-[#555] hover:bg-[#F5F5F8] cursor-pointer"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                        Sửa đơn
                                    </button>
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => void handleDeletePrescription()}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50 cursor-pointer"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Xóa đơn
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePrint}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8E7F5] bg-white px-4 py-2 text-xs font-bold text-[#555] hover:bg-[#F5F5F8] cursor-pointer"
                                    >
                                        <Printer className="h-3.5 w-3.5" />
                                        In đơn thuốc
                                    </button>
                                </>
                            )}

                            {mode === 'editing' && (
                                <>
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => {
                                            if (prescription) {
                                                void loadPrescription(resolvedSessionId!);
                                            } else {
                                                setMode('empty');
                                            }
                                        }}
                                        className="rounded-xl border border-[#E8E7F5] bg-white px-4 py-2 text-xs font-bold text-[#555] hover:bg-[#F5F5F8] cursor-pointer"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        disabled={draftItems.length === 0}
                                        onClick={handlePrint}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8E7F5] bg-white px-4 py-2 text-xs font-bold text-[#555] hover:bg-[#F5F5F8] disabled:opacity-50 cursor-pointer"
                                    >
                                        <Printer className="h-3.5 w-3.5" />
                                        In đơn thuốc
                                    </button>
                                    <button
                                        type="button"
                                        disabled={submitting || draftItems.length === 0}
                                        onClick={() => void handleSaveEdit()}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B7CF6] px-4 py-2 text-xs font-bold text-white hover:bg-[#7A6BE8] disabled:opacity-50 cursor-pointer"
                                    >
                                        {submitting ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Save className="h-3.5 w-3.5" />
                                        )}
                                        Lưu thay đổi
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            <MedicineSlideOverPanel
                isOpen={slideOpen}
                onClose={() => setSlideOpen(false)}
                onSelectMedicine={handleAddMedicine}
                selectedMedicineIds={selectedMedicineIds}
            />

            {submitting && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/60">
                    <Loader2 className="h-6 w-6 animate-spin text-[#8B7CF6]" />
                </div>
            )}
        </div>
    );
}

function ReadonlyPrescriptionBody({
    prescription,
    onPrint,
}: {
    prescription: Prescription;
    onPrint: () => void;
}) {
    return (
        <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-[#EBEBEB]">
                <table className="w-full min-w-[560px] text-left text-xs">
                    <thead className="bg-[#F8F7FC] text-[10px] uppercase tracking-wide text-[#7C7C8A]">
                        <tr>
                            <th className="px-3 py-2 font-bold">STT</th>
                            <th className="px-3 py-2 font-bold">Tên thuốc</th>
                            <th className="px-3 py-2 font-bold">Liều dùng</th>
                            <th className="px-3 py-2 font-bold">SL</th>
                            <th className="px-3 py-2 font-bold">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(prescription.prescriptionDetails || []).map((d, index) => (
                            <tr
                                key={d.prescription_detail_id || `${d.medicine_id}-${index}`}
                                className="border-t border-[#F0F0F0]"
                            >
                                <td className="px-3 py-2 text-[#9C9C9C]">{index + 1}</td>
                                <td className="px-3 py-2 font-semibold text-[#2D2D2D]">
                                    {d.medicine?.medicine_name || d.medicine_id}
                                </td>
                                <td className="px-3 py-2">{d.dosage_instruction || '—'}</td>
                                <td className="px-3 py-2">{d.quantity}</td>
                                <td className="px-3 py-2 font-semibold">
                                    {(d.sub_total || 0).toLocaleString('vi-VN')} đ
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {prescription.diagnosis_note && (
                <p className="text-xs text-[#555]">
                    <span className="font-bold">Lời dặn:</span> {prescription.diagnosis_note}
                </p>
            )}

            <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-[#EBEBEB] bg-[#FAFAFC] p-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-white bg-white p-2 shadow-sm">
                        <QRCodeSVG value={qrPayload(prescription)} size={96} level="M" includeMargin={false} />
                    </div>
                    <p className="max-w-[120px] text-[11px] font-semibold text-[#7C7C8A]">
                        Quét tại nhà thuốc để nhận thuốc
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[11px] font-bold uppercase text-[#9C9C9C]">Tổng tiền</p>
                    <p className="text-lg font-bold text-[#2D2D2D]">
                        {(prescription.total_amount || 0).toLocaleString('vi-VN')} đ
                    </p>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={onPrint}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8E7F5] bg-white px-4 py-2 text-xs font-bold text-[#555] hover:bg-[#F5F5F8] cursor-pointer"
                >
                    <Printer className="h-3.5 w-3.5" />
                    In đơn thuốc
                </button>
            </div>
        </div>
    );
}
