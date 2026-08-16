'use client';

import { useState, useEffect } from 'react';
import {
    Pill,
    Trash2,
    Search,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Send,
} from 'lucide-react';
import { Medicine, Prescription, CreatePrescriptionDetailDto } from '@/shared/types/prescription.types';
import { medicineService } from '@/modules/ancillary/services/medicineService';
import { pharmacyService } from '@/modules/ancillary/services/pharmacyService';
import { MedicineCatalogModal } from '@/modules/ancillary/components/MedicineCatalogModal';

interface SelectedPrescriptionItem {
    medicine: Medicine;
    quantity: number;
    dosage_instruction: string;
    note: string;
}

interface DoctorPrescriptionTabProps {
    visitSessionId?: string;
    patientName?: string;
    onPrescriptionCreated?: (prescription: Prescription) => void;
}

export function DoctorPrescriptionTab({
    visitSessionId,
    onPrescriptionCreated,
}: DoctorPrescriptionTabProps) {
    const [selectedItems, setSelectedItems] = useState<SelectedPrescriptionItem[]>([]);
    const [diagnosisNote, setDiagnosisNote] = useState('Uống thuốc đúng giờ, tái khám sau 7 ngày');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Medicine[]>([]);
    const [searching, setSearching] = useState(false);
    const [isCatalogOpen, setIsCatalogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdPrescription, setCreatedPrescription] = useState<Prescription | null>(null);

    // Initial search or search on input change
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const list = await medicineService.getMedicines({ search: searchQuery, is_active: true });
                setSearchResults(list);
            } catch (err) {
                console.error('Failed to search medicines:', err);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleAddMedicine = (med: Medicine) => {
        // Check if already in list
        const existingIdx = selectedItems.findIndex((item) => item.medicine.medicine_id === med.medicine_id);
        if (existingIdx >= 0) {
            const updated = [...selectedItems];
            updated[existingIdx].quantity += 1;
            setSelectedItems(updated);
        } else {
            setSelectedItems((prev) => [
                ...prev,
                {
                    medicine: med,
                    quantity: 10,
                    dosage_instruction: 'Sáng 1 viên, tối 1 viên sau ăn',
                    note: ''
                }
            ]);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleRemoveItem = (index: number) => {
        setSelectedItems((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpdateItem = (
        index: number,
        field: keyof SelectedPrescriptionItem,
        value: SelectedPrescriptionItem[keyof SelectedPrescriptionItem]
    ) => {
        setSelectedItems((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const calculateTotal = () => {
        return selectedItems.reduce((sum, item) => sum + (item.medicine.unit_price || 0) * item.quantity, 0);
    };

    const handleSubmitPrescription = async () => {
        if (selectedItems.length === 0) {
            setError('Vui lòng chọn ít nhất 1 loại thuốc để kê đơn');
            return;
        }

        setSubmitting(true);
        setError(null);

        const detailsDto: CreatePrescriptionDetailDto[] = selectedItems.map((item) => ({
            medicine_id: item.medicine.medicine_id,
            quantity: Number(item.quantity),
            dosage_instruction: item.dosage_instruction,
            note: item.note || undefined
        }));

        try {
            const result = await pharmacyService.createPrescription({
                visit_session_id: visitSessionId || 'c3d4e5f6-a7b8-9012-cdef-3456789012cd',
                diagnosis_note: diagnosisNote,
                details: detailsDto
            });

            setCreatedPrescription(result);
            if (onPrescriptionCreated) onPrescriptionCreated(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể tạo đơn thuốc');
        } finally {
            setSubmitting(false);
        }
    };

    if (createdPrescription) {
        return (
            <div className="p-6 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-3xl space-y-4">
                <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-8 h-8 shrink-0 text-emerald-600" />
                    <div>
                        <h3 className="text-base font-bold">Kê đơn thuốc thành công!</h3>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
                            Mã đơn thuốc: <strong className="font-mono">{createdPrescription.prescription_code}</strong> · Tổng tiền: <strong>{createdPrescription.total_amount?.toLocaleString('vi-VN')} đ</strong>
                        </p>
                    </div>
                </div>

                <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
                    <p className="font-semibold text-neutral-900 dark:text-white">Lời dặn bác sĩ:</p>
                    <p className="text-neutral-600 dark:text-neutral-300 italic">{createdPrescription.diagnosis_note}</p>
                    
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
                            Trạng thái: {createdPrescription.status} (Chờ bệnh nhân thanh toán)
                        </span>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => {
                            setCreatedPrescription(null);
                            setSelectedItems([]);
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-colors"
                    >
                        Kê đơn mới
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl space-y-5">
            {/* Top Bar: Search & Catalog Link */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            <Pill className="w-4 h-4 text-indigo-600" />
                            Kê Đơn Thuốc Ngoại Trú
                        </h4>
                        <p className="text-xs text-neutral-500">
                            Tìm kiếm biệt dược, chọn số lượng và ghi rõ liều dùng cho bệnh nhân
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsCatalogOpen(true)}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                        + Xem danh mục thuốc
                    </button>
                </div>

                {/* Medicine Search Autocomplete */}
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Nhập tên thuốc hoặc hoạt chất để kê đơn (VD: Paracetamol)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
                    />

                    {/* Autocomplete Dropdown */}
                    {searching ? (
                        <div className="absolute left-0 right-0 top-full mt-1 p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl z-20 text-xs text-neutral-400 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                            Đang tìm thuốc...
                        </div>
                    ) : searchResults.length > 0 ? (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl max-h-60 overflow-y-auto z-20 divide-y divide-neutral-100 dark:divide-neutral-800">
                            {searchResults.map((med) => (
                                <div
                                    key={med.medicine_id}
                                    onClick={() => handleAddMedicine(med)}
                                    className="p-3 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 cursor-pointer flex items-center justify-between gap-3 text-xs transition-colors"
                                >
                                    <div>
                                        <span className="font-bold text-neutral-900 dark:text-white">
                                            {med.medicine_name}
                                        </span>
                                        <p className="text-[11px] text-neutral-500">
                                            Hoạt chất: {med.active_ingredient} · {med.usage_route}
                                        </p>
                                    </div>
                                    <span className="font-extrabold text-emerald-600 shrink-0">
                                        {med.unit_price?.toLocaleString('vi-VN')} đ / {med.unit}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Selected Medicines List */}
            <div className="space-y-3">
                <h5 className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Thuốc đã chọn ({selectedItems.length})
                </h5>

                {selectedItems.length === 0 ? (
                    <div className="py-8 text-center text-neutral-400 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 text-xs">
                        <Pill className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Chưa chọn loại thuốc nào. Tìm kiếm tên thuốc ở ô trên để thêm vào đơn.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {selectedItems.map((item, idx) => (
                            <div
                                key={item.medicine.medicine_id}
                                className="p-4 bg-neutral-50/60 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 rounded">
                                            {item.medicine.medicine_code}
                                        </span>
                                        <h6 className="text-sm font-bold text-neutral-900 dark:text-white mt-1">
                                            {item.medicine.medicine_name}
                                        </h6>
                                        <p className="text-xs text-neutral-500">
                                            {item.medicine.active_ingredient} · Đơn giá: {item.medicine.unit_price?.toLocaleString('vi-VN')} đ/{item.medicine.unit}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5">
                                            <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400">SL:</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={item.quantity}
                                                onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                                                className="w-16 px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs text-center font-bold"
                                            />
                                            <span className="text-xs text-neutral-500">{item.medicine.unit}</span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(idx)}
                                            className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        placeholder="Hướng dẫn liều dùng (VD: Sáng 1 viên, tối 1 viên)..."
                                        value={item.dosage_instruction}
                                        onChange={(e) => handleUpdateItem(idx, 'dosage_instruction', e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Ghi chú thêm (VD: Uống sau khi ăn)..."
                                        value={item.note}
                                        onChange={(e) => handleUpdateItem(idx, 'note', e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Doctor Note & Diagnosis */}
            <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Lời dặn bác sĩ / Ghi chú tái khám
                </label>
                <textarea
                    rows={2}
                    value={diagnosisNote}
                    onChange={(e) => setDiagnosisNote(e.target.value)}
                    className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
                />
            </div>

            {/* Total & Submit */}
            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                    <span className="text-xs text-neutral-500">Tổng tiền đơn thuốc:</span>
                    <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                        {calculateTotal().toLocaleString('vi-VN')} đ
                    </p>
                </div>

                <button
                    type="button"
                    disabled={submitting || selectedItems.length === 0}
                    onClick={handleSubmitPrescription}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm"
                >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Lưu & Kê Đơn Thuốc
                </button>
            </div>

            {/* Catalog Modal */}
            <MedicineCatalogModal
                isOpen={isCatalogOpen}
                onClose={() => setIsCatalogOpen(false)}
                onSelectMedicine={(med) => {
                    handleAddMedicine(med);
                    setIsCatalogOpen(false);
                }}
            />
        </div>
    );
}
