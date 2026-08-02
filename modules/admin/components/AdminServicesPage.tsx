'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Loader2,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { ROOM_TYPE_OPTIONS } from '../types/process.types';
import type { CatalogService, CreateServiceReqDto } from '../types/service.types';
import { getServiceId } from '../types/service.types';
import {
    extractServiceList,
    serviceCatalogService,
} from '../services/serviceCatalogService';

const EMPTY_FORM: CreateServiceReqDto = {
    service_code: '',
    service_name: '',
    price: 0,
    room_type: 'LABORATORY',
};

function roomTypeLabel(value?: string): string {
    if (!value) return '—';
    return ROOM_TYPE_OPTIONS.find((o) => o.value === value)?.label || value;
}

export function AdminServicesPage() {
    const accessToken = useAuthStore((s) => s.accessToken);

    const [services, setServices] = useState<CatalogService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<CatalogService | null>(null);
    const [form, setForm] = useState<CreateServiceReqDto>(EMPTY_FORM);
    const [formActive, setFormActive] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [deleting, setDeleting] = useState<CatalogService | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadServices = useCallback(async () => {
        if (!accessToken) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await serviceCatalogService.getServices(accessToken, 1, 200);
            setServices(extractServiceList(res?.data));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể tải danh mục dịch vụ.');
        } finally {
            setIsLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        void loadServices();
    }, [loadServices]);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return services;
        return services.filter((s) => {
            const code = (s.service_code || '').toLowerCase();
            const name = (s.service_name || '').toLowerCase();
            return code.includes(q) || name.includes(q);
        });
    }, [services, searchQuery]);

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setFormActive(true);
        setFormError(null);
        setIsModalOpen(true);
    };

    const openEdit = (service: CatalogService) => {
        setEditing(service);
        setForm({
            service_code: service.service_code || '',
            service_name: service.service_name || '',
            price: Number(service.price) || 0,
            room_type: service.room_type || 'OTHER',
        });
        setFormActive(service.is_active !== false);
        setFormError(null);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!accessToken) return;
        const name = form.service_name.trim();
        if (!name) {
            setFormError('Vui lòng nhập tên dịch vụ.');
            return;
        }
        if (!Number.isFinite(form.price) || form.price < 0) {
            setFormError('Giá dịch vụ không hợp lệ.');
            return;
        }

        setIsSaving(true);
        setFormError(null);
        try {
            if (editing) {
                const id = getServiceId(editing);
                if (!id) throw new Error('Thiếu service_id.');
                await serviceCatalogService.updateService(
                    id,
                    {
                        service_code: form.service_code?.trim() || undefined,
                        service_name: name,
                        price: form.price,
                        room_type: form.room_type || undefined,
                        is_active: formActive,
                    },
                    accessToken
                );
            } else {
                await serviceCatalogService.createService(
                    {
                        service_code: form.service_code?.trim() || undefined,
                        service_name: name,
                        price: form.price,
                        room_type: form.room_type || undefined,
                    },
                    accessToken
                );
            }
            setIsModalOpen(false);
            await loadServices();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Không thể lưu dịch vụ.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!accessToken || !deleting) return;
        const id = getServiceId(deleting);
        if (!id) return;
        setIsDeleting(true);
        try {
            await serviceCatalogService.deleteService(id, accessToken);
            setDeleting(null);
            await loadServices();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể xóa dịch vụ.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                    <div className="flex-1 min-h-0 overflow-y-auto p-6">
                        <div className="max-w-6xl mx-auto space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-bold text-neutral-900">Quản lý dịch vụ</h1>
                </div>
                <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold"
                >
                    <Plus className="w-4 h-4" />
                    Thêm dịch vụ
                </button>
            </div>

            <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 py-2 max-w-md">
                <Search className="w-4 h-4 text-neutral-400" />
                <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo mã hoặc tên..."
                    className="flex-1 text-sm outline-none bg-transparent"
                />
            </div>

            {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex flex-col items-center gap-2 text-neutral-500">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                        <span className="text-sm font-medium">Đang tải...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center text-sm text-neutral-500">Chưa có dịch vụ nào.</div>
                ) : (
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50 border-b border-neutral-200 text-left text-xs font-bold text-neutral-500 uppercase tracking-wide sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3">Mã</th>
                                <th className="px-4 py-3">Tên dịch vụ</th>
                                <th className="px-4 py-3 text-right">Giá</th>
                                <th className="px-4 py-3">Loại phòng</th>
                                <th className="px-4 py-3">Trạng thái</th>
                                <th className="px-4 py-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {filtered.map((service) => {
                                const id = getServiceId(service);
                                const active = service.is_active !== false;
                                return (
                                    <tr key={id || service.service_code || service.service_name} className="hover:bg-neutral-50/80">
                                        <td className="px-4 py-3 font-mono text-xs text-neutral-600">
                                            {service.service_code || '—'}
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-neutral-800">
                                            {service.service_name}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium">
                                            {Number(service.price || 0).toLocaleString('vi-VN')}₫
                                        </td>
                                        <td className="px-4 py-3 text-neutral-600">
                                            {roomTypeLabel(service.room_type)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={cn(
                                                    'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                                    active
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                        : 'bg-neutral-50 text-neutral-500 border-neutral-200'
                                                )}
                                            >
                                                {active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(service)}
                                                    className="p-2 rounded-lg text-neutral-400 hover:text-brand-500 hover:bg-neutral-50"
                                                    title="Sửa"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleting(service)}
                                                    className="p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-neutral-50"
                                                    title="Xóa"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    </div>
                )}
            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-neutral-100">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                            <h2 className="font-bold text-neutral-900">
                                {editing ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ'}
                            </h2>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {formError && (
                                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                                    {formError}
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                                    Tên dịch vụ *
                                </label>
                                <input
                                    value={form.service_name}
                                    onChange={(e) => setForm((f) => ({ ...f, service_name: e.target.value }))}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                                    placeholder="VD: Tổng phân tích tế bào máu"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                                        Mã dịch vụ
                                    </label>
                                    <input
                                        value={form.service_code || ''}
                                        onChange={(e) => setForm((f) => ({ ...f, service_code: e.target.value }))}
                                        className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                                        placeholder="XET_NGHIEM_CBC"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                                        Giá *
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={form.price}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, price: Number(e.target.value) }))
                                        }
                                        className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                                    Loại phòng
                                </label>
                                <select
                                    value={form.room_type || 'OTHER'}
                                    onChange={(e) => setForm((f) => ({ ...f, room_type: e.target.value }))}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-white"
                                >
                                    {ROOM_TYPE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {editing && (
                                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                                    <input
                                        type="checkbox"
                                        checked={formActive}
                                        onChange={(e) => setFormActive(e.target.checked)}
                                    />
                                    Đang hoạt động (`is_active`)
                                </label>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-neutral-100 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-bold"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleSave()}
                                disabled={isSaving}
                                className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2"
                            >
                                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-5 border border-neutral-100 shadow-xl space-y-4">
                        <h3 className="font-bold text-neutral-900">Xóa dịch vụ?</h3>
                        <p className="text-sm text-neutral-600">
                            Xóa <strong>{deleting.service_name}</strong> khỏi danh mục. Thao tác có thể bị từ chối nếu đang được dùng.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDeleting(null)}
                                className="px-4 py-2 rounded-xl bg-neutral-100 text-sm font-bold"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleDelete()}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-50"
                            >
                                {isDeleting ? 'Đang xóa...' : 'Xóa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
