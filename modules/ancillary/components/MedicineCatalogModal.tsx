'use client';

import React, { useState, useEffect } from 'react';
import {
    Pill,
    Plus,
    Search,
    X,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Building2,
    Tag,
    DollarSign
} from 'lucide-react';
import { Medicine, CreateMedicineDto } from '@/shared/types/prescription.types';
import { medicineService } from '../services/medicineService';
import { MedicineManagementTable } from './MedicineManagementTable';
import { cn } from '@/lib/utils';

interface MedicineCatalogModalProps {
    isOpen?: boolean;
    onClose?: () => void;
    onSelectMedicine?: (medicine: Medicine) => void;
    isPage?: boolean;
}

export function MedicineCatalogModal({
    isOpen = true,
    onClose,
    onSelectMedicine,
    isPage = false
}: MedicineCatalogModalProps) {
    const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Form state for creating medicine
    const [formData, setFormData] = useState<CreateMedicineDto>({
        medicine_code: '',
        medicine_name: '',
        active_ingredient: '',
        unit: 'Viên',
        usage_route: 'Uống',
        unit_price: 1000,
        manufacturer: '',
        description: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // If this is used as a standalone page (e.g. Dược sĩ page), render MedicineManagementTable
    if (isPage) {
        return (
            <div className="w-full">
                <MedicineManagementTable />
            </div>
        );
    }

    const fetchMedicines = async (search?: string) => {
        setLoading(true);
        setError(null);
        try {
            const list = await medicineService.getMedicines({
                search: search ?? searchQuery,
                is_active: true
            });
            setMedicines(list);
        } catch (err: any) {
            setError(err?.message || 'Không thể tải danh sách thuốc');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchMedicines();
        }
    }, [isOpen]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchMedicines(searchQuery);
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccessMsg(null);

        try {
            const newMed = await medicineService.createMedicine({
                ...formData,
                unit_price: Number(formData.unit_price)
            });
            setSuccessMsg(`Đã thêm thuốc "${newMed.medicine_name}" thành công!`);
            // Reset form
            setFormData({
                medicine_code: '',
                medicine_name: '',
                active_ingredient: '',
                unit: 'Viên',
                usage_route: 'Uống',
                unit_price: 1000,
                manufacturer: '',
                description: ''
            });
            fetchMedicines();
            setTimeout(() => {
                setActiveTab('LIST');
                setSuccessMsg(null);
            }, 1200);
        } catch (err: any) {
            setError(err?.message || 'Không thể tạo loại thuốc mới');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80 rounded-t-3xl shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Pill className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg md:text-xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                                Tra Cứu & Chọn Dược Phẩm
                            </h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                                Tìm kiếm loại thuốc cần kê đơn từ danh mục
                            </p>
                        </div>
                    </div>

                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Sub-header Tabs */}
                <div className="flex gap-6 px-6 pt-3 border-b border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('LIST')}
                        className={`pb-3 text-xs md:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                            activeTab === 'LIST'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                        }`}
                    >
                        <Search className="w-4 h-4" />
                        Tra cứu Thuốc ({medicines.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('CREATE')}
                        className={`pb-3 text-xs md:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                            activeTab === 'CREATE'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                        }`}
                    >
                        <Plus className="w-4 h-4" />
                        Thêm Thuốc Mới
                    </button>
                </div>

                {/* Status Messages */}
                {error && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {successMsg && (
                    <div className="mx-6 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{successMsg}</span>
                    </div>
                )}

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'LIST' ? (
                        <div className="space-y-4">
                            {/* Search Bar */}
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    <input
                                        type="text"
                                        placeholder="Tìm theo tên thuốc, hoạt chất, mã thuốc..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer shadow-sm"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tìm kiếm'}
                                </button>
                            </form>

                            {/* Medicines List */}
                            {loading ? (
                                <div className="py-16 flex flex-col items-center justify-center text-neutral-400">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                                    <p className="text-xs font-semibold">Đang tải danh sách thuốc...</p>
                                </div>
                            ) : medicines.length === 0 ? (
                                <div className="py-16 text-center text-neutral-400 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
                                    <Pill className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Không tìm thấy loại thuốc nào</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {medicines.map((med) => (
                                        <div
                                            key={med.medicine_id}
                                            onClick={() => onSelectMedicine && onSelectMedicine(med)}
                                            className={`p-4 bg-white dark:bg-neutral-800/60 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 hover:border-indigo-500 hover:shadow-md transition-all space-y-2.5 ${
                                                onSelectMedicine ? 'cursor-pointer' : ''
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono">
                                                        {med.medicine_code}
                                                    </span>
                                                    <h4 className="text-sm font-extrabold text-neutral-900 dark:text-white mt-1 leading-tight">
                                                        {med.medicine_name}
                                                    </h4>
                                                </div>
                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-lg shrink-0">
                                                    {med.unit_price?.toLocaleString('vi-VN')} đ / {med.unit}
                                                </span>
                                            </div>

                                            <div className="space-y-1 text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                                                <p className="flex items-center gap-1.5">
                                                    <Tag className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                                    <span>Hoạt chất: <strong>{med.active_ingredient || '—'}</strong></span>
                                                </p>
                                                <p className="flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                                    <span>Đường dùng: {med.usage_route} {med.manufacturer ? `· NSX: ${med.manufacturer}` : ''}</span>
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* CREATE FORM FOR MODAL SELECTOR */
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                                        Mã thuốc *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="MED-PAR-500"
                                        value={formData.medicine_code}
                                        onChange={(e) => setFormData({ ...formData, medicine_code: e.target.value.toUpperCase() })}
                                        className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono font-bold text-neutral-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                                        Tên biệt dược *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Paracetamol 500mg"
                                        value={formData.medicine_name}
                                        onChange={(e) => setFormData({ ...formData, medicine_name: e.target.value })}
                                        className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                                        Hoạt chất chính *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Paracetamol"
                                        value={formData.active_ingredient}
                                        onChange={(e) => setFormData({ ...formData, active_ingredient: e.target.value })}
                                        className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                                        Đơn giá (VNĐ) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        value={formData.unit_price}
                                        onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
                                        className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-neutral-200 dark:border-neutral-800">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('LIST')}
                                    className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Lưu Loại Thuốc
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
