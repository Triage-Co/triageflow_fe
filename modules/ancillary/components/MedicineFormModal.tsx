'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, Pill, AlertCircle } from 'lucide-react';
import { Medicine, CreateMedicineDto, UpdateMedicineDto } from '@/shared/types/prescription.types';
import { medicineService } from '../services/medicineService';

interface MedicineFormModalProps {
    isOpen: boolean;
    medicine?: Medicine | null; // If provided, mode is EDIT, else CREATE
    onClose: () => void;
    onSuccess: (savedMedicine: Medicine) => void;
}

const COMMON_UNITS = ['Viên', 'Vỉ', 'Hộp', 'Chai', 'Gói', 'Ống', 'Tuýp', 'Lọ', 'Túi'];
const COMMON_ROUTES = ['Uống', 'Tiêm', 'Bôi', 'Nhỏ mắt', 'Nhỏ mũi', 'Xịt', 'Khí dung', 'Đặt'];

export function MedicineFormModal({
    isOpen,
    medicine,
    onClose,
    onSuccess
}: MedicineFormModalProps) {
    const isEdit = !!medicine;

    const [form, setForm] = useState<CreateMedicineDto>({
        medicine_code: '',
        medicine_name: '',
        active_ingredient: '',
        unit: 'Viên',
        usage_route: 'Uống',
        unit_price: 5000,
        manufacturer: '',
        description: ''
    });

    const [isActive, setIsActive] = useState<boolean>(true);
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (medicine) {
            setForm({
                medicine_code: medicine.medicine_code || '',
                medicine_name: medicine.medicine_name || '',
                active_ingredient: medicine.active_ingredient || '',
                unit: medicine.unit || 'Viên',
                usage_route: medicine.usage_route || 'Uống',
                unit_price: Number(medicine.unit_price) || 0,
                manufacturer: medicine.manufacturer || '',
                description: medicine.description || ''
            });
            setIsActive(medicine.is_active !== false);
        } else {
            setForm({
                medicine_code: '',
                medicine_name: '',
                active_ingredient: '',
                unit: 'Viên',
                usage_route: 'Uống',
                unit_price: 5000,
                manufacturer: '',
                description: ''
            });
            setIsActive(true);
        }
        setFormError(null);
    }, [medicine, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        // Validation
        const code = form.medicine_code.trim().toUpperCase();
        const name = form.medicine_name.trim();

        if (!code) {
            setFormError('Vui lòng nhập Mã Thuốc (Ví dụ: MED-PAR-500)');
            return;
        }
        if (!/^[A-Z0-9_-]+$/.test(code)) {
            setFormError('Mã thuốc chỉ gồm chữ cái viết hoa, chữ số, dấu gạch ngang hoặc gạch dưới');
            return;
        }
        if (!name) {
            setFormError('Vui lòng nhập Tên Thuốc');
            return;
        }
        const price = Number(form.unit_price);
        if (isNaN(price) || price < 0) {
            setFormError('Đơn giá phải là số lớn hơn hoặc bằng 0');
            return;
        }

        setLoading(true);

        try {
            let savedMed: Medicine;
            if (isEdit && medicine) {
                const updateData: UpdateMedicineDto = {
                    medicine_code: code,
                    medicine_name: name,
                    active_ingredient: form.active_ingredient?.trim() || undefined,
                    unit: form.unit?.trim() || 'Viên',
                    usage_route: form.usage_route?.trim() || 'Uống',
                    unit_price: price,
                    manufacturer: form.manufacturer?.trim() || undefined,
                    description: form.description?.trim() || undefined,
                    is_active: isActive
                };
                savedMed = await medicineService.updateMedicine(medicine.medicine_id, updateData);
            } else {
                const createData: CreateMedicineDto = {
                    medicine_code: code,
                    medicine_name: name,
                    active_ingredient: form.active_ingredient?.trim() || '',
                    unit: form.unit?.trim() || 'Viên',
                    usage_route: form.usage_route?.trim() || 'Uống',
                    unit_price: price,
                    manufacturer: form.manufacturer?.trim() || '',
                    description: form.description?.trim() || ''
                };
                savedMed = await medicineService.createMedicine(createData);
            }

            onSuccess(savedMed);
            onClose();
        } catch (err: any) {
            setFormError(err?.message || 'Lỗi khi lưu thông tin loại thuốc');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[92vh]">
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/80 dark:bg-neutral-900/80 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Pill className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                                {isEdit ? 'Cập Nhật Thông Tin Dược Phẩm' : 'Thêm Dược Phẩm Mới'}
                            </h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {isEdit ? `Mã: ${medicine?.medicine_code}` : 'Nhập thông tin thuốc mới vào danh mục hệ thống'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    {formError && (
                        <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{formError}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Code */}
                        <div>
                            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                                Mã Thuốc (Medicine Code) *
                            </label>
                            <input
                                type="text"
                                value={form.medicine_code}
                                onChange={(e) => setForm({ ...form, medicine_code: e.target.value.toUpperCase() })}
                                placeholder="MED-PAR-500"
                                className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Price */}
                        <div>
                            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                                Đơn Giá (VNĐ / Đơn Vị) *
                            </label>
                            <input
                                type="number"
                                min={0}
                                step={500}
                                value={form.unit_price}
                                onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })}
                                placeholder="5000"
                                className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                            Tên Biệt Dược / Thương Hiệu (Trade Name) *
                        </label>
                        <input
                            type="text"
                            value={form.medicine_name}
                            onChange={(e) => setForm({ ...form, medicine_name: e.target.value })}
                            placeholder="Paracetamol 500mg"
                            className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Active Ingredient */}
                    <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                            Hoạt Chất Chính (Active Ingredient)
                        </label>
                        <input
                            type="text"
                            value={form.active_ingredient || ''}
                            onChange={(e) => setForm({ ...form, active_ingredient: e.target.value })}
                            placeholder="Paracetamol"
                            className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Unit */}
                        <div>
                            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                                Đơn Vị Tính (Unit) *
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={form.unit}
                                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <select
                                    value=""
                                    onChange={(e) => e.target.value && setForm({ ...form, unit: e.target.value })}
                                    className="px-2 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 cursor-pointer"
                                >
                                    <option value="">Chọn nhanh...</option>
                                    {COMMON_UNITS.map((u) => (
                                        <option key={u} value={u}>{u}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Usage Route */}
                        <div>
                            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                                Đường Dùng (Usage Route) *
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={form.usage_route}
                                    onChange={(e) => setForm({ ...form, usage_route: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <select
                                    value=""
                                    onChange={(e) => e.target.value && setForm({ ...form, usage_route: e.target.value })}
                                    className="px-2 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 cursor-pointer"
                                >
                                    <option value="">Chọn nhanh...</option>
                                    {COMMON_ROUTES.map((r) => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Manufacturer */}
                    <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                            Nhà Sản Xuất / Hãng Dược (Manufacturer)
                        </label>
                        <input
                            type="text"
                            value={form.manufacturer || ''}
                            onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                            placeholder="Dược Hậu Giang, Sanofi, GSK..."
                            className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                            Ghi Chú / Chỉ Định / Hướng Dẫn Sử Dụng
                        </label>
                        <textarea
                            rows={3}
                            value={form.description || ''}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="Chỉ định hạ sốt, giảm đau nhẹ đến vừa. Uống sau khi ăn..."
                            className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                    </div>

                    {/* Active Checkbox if Editing */}
                    {isEdit && (
                        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                                    Đang hoạt động (Kê đơn & Cấp phát)
                                </span>
                            </label>
                        </div>
                    )}

                    <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span>{isEdit ? 'Lưu Thay Đổi' : 'Thêm Dược Phẩm'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
