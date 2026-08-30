'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Pill,
    Plus,
    Search,
    X,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Building2,
    DollarSign,
    Tag,
    FileText,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { Medicine, CreateMedicineDto } from '@/shared/types/prescription.types';
import { medicineService } from '../services/medicineService';
import { cn } from '@/lib/utils';

interface MedicineCatalogModalProps {
    isOpen?: boolean;
    onClose?: () => void;
    onSelectMedicine?: (medicine: Medicine) => void;
    isPage?: boolean;
}

const ITEMS_PER_PAGE = 6; // 3 cột x 2 hàng

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
    const [currentPage, setCurrentPage] = useState(1);
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

    const fetchMedicines = async (search?: string) => {
        setLoading(true);
        setError(null);
        try {
            const list = await medicineService.getMedicines({
                search: search ?? searchQuery,
                is_active: true
            });
            setMedicines(list);
            setCurrentPage(1);
        } catch (err: any) {
            setError(err?.message || 'Không thể tải danh sách thuốc');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen || isPage) {
            fetchMedicines();
        }
    }, [isOpen, isPage]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchMedicines(searchQuery);
    };

    const totalPages = Math.max(1, Math.ceil(medicines.length / ITEMS_PER_PAGE));

    const paginatedMedicines = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return medicines.slice(start, start + ITEMS_PER_PAGE);
    }, [medicines, currentPage]);

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

    if (!isOpen && !isPage) return null;

    const catalogBody = (
        <div className={cn(
            "w-full flex flex-col overflow-hidden",
            isPage ? "p-0" : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl max-w-3xl max-h-[90vh]"
        )}>
            {/* Header */}
            <div className={cn(
                "flex items-center justify-between",
                isPage ? "pb-4 border-b border-neutral-200/80 dark:border-neutral-800" : "px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80 rounded-2xl"
            )}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Pill className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl md:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                            Danh Mục Thuốc (Medicine Catalog)
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                            Quản lý thông tin và tra cứu dược phẩm hệ thống
                        </p>
                    </div>
                </div>

                {!isPage && onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Sub-header Tabs */}
            <div className={cn(
                "flex gap-6 border-b border-neutral-200/80 dark:border-neutral-800",
                isPage ? "pt-4" : "px-6 pt-3 bg-white dark:bg-neutral-900"
            )}>
                <button
                    onClick={() => setActiveTab('LIST')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                        activeTab === 'LIST'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                            : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                    }`}
                >
                    <Search className="w-4 h-4" />
                    Tra cứu Thuốc ({medicines.length})
                </button>
                <button
                    onClick={() => setActiveTab('CREATE')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
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
                <div className="mt-4 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
            {successMsg && (
                <div className="mt-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                </div>
            )}

            {/* Content Body */}
            <div className={cn("flex-1 overflow-y-auto", isPage ? "py-6" : "p-6")}>
                {activeTab === 'LIST' ? (
                    <div className="space-y-6">
                        {/* Search Bar */}
                        <form onSubmit={handleSearch} className="flex gap-3">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm theo tên thuốc, hoạt chất, mã thuốc..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white font-semibold"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer shadow-sm"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tìm kiếm'}
                            </button>
                        </form>

                        {/* Medicines List */}
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center text-neutral-400">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                                <p className="text-xs font-semibold">Đang tải danh sách thuốc từ hệ thống...</p>
                            </div>
                        ) : medicines.length === 0 ? (
                            <div className="py-20 text-center text-neutral-400 bg-neutral-50 dark:bg-neutral-800/40 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800">
                                <Pill className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm font-bold text-neutral-700">Không tìm thấy loại thuốc nào</p>
                                <p className="text-xs text-neutral-500 mt-1">
                                    Thử thay đổi từ khóa hoặc thêm mới loại thuốc vào danh mục
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {paginatedMedicines.map((med) => (
                                        <div
                                            key={med.medicine_id}
                                            onClick={() => onSelectMedicine && onSelectMedicine(med)}
                                            className={`p-5 bg-white dark:bg-neutral-800/60 rounded-3xl border border-neutral-200/80 dark:border-neutral-700/80 hover:border-indigo-500 hover:shadow-md transition-all space-y-3 ${
                                                onSelectMedicine ? 'cursor-pointer' : ''
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase font-mono">
                                                        {med.medicine_code}
                                                    </span>
                                                    <h4 className="text-base font-extrabold text-neutral-900 dark:text-white mt-2 leading-tight">
                                                        {med.medicine_name}
                                                    </h4>
                                                </div>
                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-xl shrink-0">
                                                    {med.unit_price?.toLocaleString('vi-VN')} đ / {med.unit}
                                                </span>
                                            </div>

                                            <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-300 font-medium pt-1">
                                                <p className="flex items-center gap-1.5">
                                                    <Tag className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                                    <span>Hoạt chất: <strong>{med.active_ingredient}</strong></span>
                                                </p>
                                                <p className="flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                                    <span>Đường dùng: {med.usage_route} {med.manufacturer ? `· NSX: ${med.manufacturer}` : ''}</span>
                                                </p>
                                                {med.description && (
                                                    <p className="text-[11px] text-neutral-400 line-clamp-2 mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-700/50">
                                                        {med.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                                        <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                            Hiển thị <span className="font-bold text-neutral-800 dark:text-neutral-200">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-bold text-neutral-800 dark:text-neutral-200">{Math.min(currentPage * ITEMS_PER_PAGE, medicines.length)}</span> trong tổng số <span className="font-bold text-neutral-800 dark:text-neutral-200">{medicines.length}</span> loại thuốc
                                        </p>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                                title="Trang trước"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>

                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                                                if (
                                                    pageNum === 1 ||
                                                    pageNum === totalPages ||
                                                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                                ) {
                                                    return (
                                                        <button
                                                            key={pageNum}
                                                            type="button"
                                                            onClick={() => setCurrentPage(pageNum)}
                                                            className={cn(
                                                                "w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                                                currentPage === pageNum
                                                                    ? "bg-indigo-600 text-white shadow-xs"
                                                                    : "bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                                                            )}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    );
                                                }
                                                if (
                                                    (pageNum === 2 && currentPage > 3) ||
                                                    (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                                                ) {
                                                    return (
                                                        <span key={pageNum} className="px-1 text-xs text-neutral-400">
                                                            ...
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })}

                                            <button
                                                type="button"
                                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                                title="Trang sau"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    /* CREATE FORM */
                    <form
                        onSubmit={handleCreateSubmit}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                const target = e.target as HTMLElement;
                                if (!target || target.tagName.toLowerCase() === 'textarea' || target.tagName.toLowerCase() === 'button') return;
                                e.preventDefault();
                                const container = e.currentTarget;
                                const focusable = Array.from(
                                    container.querySelectorAll<HTMLElement>(
                                        'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), select:not([disabled]), textarea:not([disabled])'
                                    )
                                );
                                const index = focusable.indexOf(target);
                                if (index > -1 && index + 1 < focusable.length) {
                                    focusable[index + 1].focus();
                                }
                            }
                        }}
                        className="space-y-5 max-w-3xl"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                                    Mã thuốc (Medicine Code) *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: MED-PAR-500"
                                    value={formData.medicine_code}
                                    onChange={(e) => setFormData({ ...formData, medicine_code: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                                    Tên thuốc (Trade Name) *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Paracetamol 500mg"
                                    value={formData.medicine_name}
                                    onChange={(e) => setFormData({ ...formData, medicine_name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                                    Hoạt chất (Active Ingredient) *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Paracetamol"
                                    value={formData.active_ingredient}
                                    onChange={(e) => setFormData({ ...formData, active_ingredient: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                                    Đơn giá (VND / Đơn vị) *
                                </label>
                                <div className="relative">
                                    <DollarSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        step={500}
                                        placeholder="5000"
                                        value={formData.unit_price}
                                        onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
                                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white font-semibold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                                    Đơn vị tính (Unit) *
                                </label>
                                <select
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white font-semibold"
                                >
                                    <option value="Viên">Viên</option>
                                    <option value="Vỉ">Vỉ</option>
                                    <option value="Hộp">Hộp</option>
                                    <option value="Chai">Chai / Lọ</option>
                                    <option value="Gói">Gói</option>
                                    <option value="Ống">Ống</option>
                                    <option value="Tuýp">Tuýp</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                                    Đường dùng (Usage Route) *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Uống, Tiêm, Bôi ngoài da..."
                                    value={formData.usage_route}
                                    onChange={(e) => setFormData({ ...formData, usage_route: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white font-semibold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                                Nhà sản xuất (Manufacturer)
                            </label>
                            <input
                                type="text"
                                placeholder="Ví dụ: Dược Hậu Giang, Sanofi..."
                                value={formData.manufacturer}
                                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white font-semibold"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                                Mô tả / Chỉ định
                            </label>
                            <textarea
                                rows={3}
                                placeholder="Ví dụ: Giảm đau nhẹ đến vừa, hạ sốt..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white font-semibold"
                            />
                        </div>

                        <div className="pt-3 flex justify-end gap-3 border-t border-neutral-200 dark:border-neutral-800">
                            <button
                                type="button"
                                onClick={() => setActiveTab('LIST')}
                                className="px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Lưu Loại Thuốc
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );

    if (isPage) {
        return catalogBody;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            {catalogBody}
        </div>
    );
}
