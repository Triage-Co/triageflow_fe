'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Home,
    Loader2,
    Pencil,
    Plus,
    Power,
    PowerOff,
    Search,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { useRoomStore } from '../store/roomStore';
import { ROOM_TYPE_OPTIONS } from '../types/process.types';
import type {
    CatalogService,
    CreateServiceReqDto,
    QueryServiceParams,
} from '../types/service.types';
import {
    SERVICE_TYPE_OPTIONS,
    defaultServiceTypeForRoom,
    getServiceId,
    serviceTypeLabel,
} from '../types/service.types';
import {
    extractServiceList,
    serviceCatalogService,
} from '../services/serviceCatalogService';
import { getCompactPages } from '../utils/pagination';
import { getErrorMessage } from '../utils/errorMessage';
import { SoftDisableConfirmDialog } from './SoftDisableConfirmDialog';
import { ServiceRoomsDrawer } from './ServiceRoomsDrawer';

const ITEMS_PER_PAGE = 7;

const EMPTY_FORM: CreateServiceReqDto = {
    service_code: '',
    service_name: '',
    price: 0,
    service_type: 'CLINICAL_EXAMINATION',
    room_type: 'CLINICAL_ROOM',
};

function roomTypeLabel(value?: string | null): string {
    if (!value) return '—';
    return ROOM_TYPE_OPTIONS.find((o) => o.value === value)?.label || value;
}

export function AdminServicesPage() {
    const accessToken = useAuthStore((s) => s.accessToken);
    const { rooms, fetchRooms } = useRoomStore();

    const [services, setServices] = useState<CatalogService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const [filterServiceType, setFilterServiceType] = useState<string>('');
    const [filterRoomType, setFilterRoomType] = useState<string>('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<CatalogService | null>(null);
    const [form, setForm] = useState<CreateServiceReqDto>(EMPTY_FORM);
    const [formActive, setFormActive] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [togglingTarget, setTogglingTarget] = useState<CatalogService | null>(null);
    const [isToggling, setIsToggling] = useState(false);
    const [toggleError, setToggleError] = useState<string | null>(null);

    const [roomsDrawerFor, setRoomsDrawerFor] = useState<CatalogService | null>(null);

    useEffect(() => {
        if (accessToken && rooms.length === 0) fetchRooms(accessToken);
    }, [accessToken, rooms.length, fetchRooms]);

    const loadServices = useCallback(async () => {
        if (!accessToken) return;
        setIsLoading(true);
        setError(null);
        try {
            const params: QueryServiceParams = { limit: 500 };
            if (filterServiceType) params.service_type = filterServiceType;
            if (filterRoomType) params.room_type = filterRoomType;
            params.is_active = true;
            if (searchQuery.trim()) params.search = searchQuery.trim();
            const res = await serviceCatalogService.getServices(accessToken, params);
            setServices(extractServiceList(res?.data));
        } catch (err) {
            setError(getErrorMessage(err, 'Không thể tải danh mục dịch vụ.'));
        } finally {
            setIsLoading(false);
        }
    }, [accessToken, filterServiceType, filterRoomType, searchQuery]);

    useEffect(() => {
        void loadServices();
    }, [loadServices]);

    // Fallback client-side filtering in case BE ignores unsupported query params.
    const filtered = useMemo(() => {
        let list = services;
        const q = searchQuery.trim().toLowerCase();
        if (q) {
            list = list.filter((s) => {
                const code = (s.service_code || '').toLowerCase();
                const name = (s.service_name || '').toLowerCase();
                return code.includes(q) || name.includes(q);
            });
        }
        if (filterServiceType) list = list.filter((s) => s.service_type === filterServiceType);
        if (filterRoomType) list = list.filter((s) => s.room_type === filterRoomType);
        list = list.filter((s) => s.is_active !== false);
        return list;
    }, [services, searchQuery, filterServiceType, filterRoomType]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const paginated = useMemo(
        () =>
            filtered.slice(
                (safePage - 1) * ITEMS_PER_PAGE,
                safePage * ITEMS_PER_PAGE
            ),
        [filtered, safePage]
    );

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
            service_type:
                service.service_type ||
                defaultServiceTypeForRoom(service.room_type) ||
                'CLINICAL_EXAMINATION',
            room_type: service.room_type || 'OTHER',
        });
        setFormActive(service.is_active !== false);
        setFormError(null);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!accessToken) return;
        const name = form.service_name.trim();
        const code = form.service_code?.trim();
        if (!code) {
            setFormError('Vui lòng nhập mã dịch vụ.');
            return;
        }
        if (!name) {
            setFormError('Vui lòng nhập tên dịch vụ.');
            return;
        }
        if (!form.service_type) {
            setFormError('Vui lòng chọn loại dịch vụ.');
            return;
        }
        if (!Number.isFinite(form.price) || form.price < 0) {
            setFormError('Giá dịch vụ không hợp lệ.');
            return;
        }
        if (!form.service_type) {
            setFormError('Vui lòng chọn loại dịch vụ.');
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
                        service_code: code,
                        service_name: name,
                        price: form.price,
                        service_type: form.service_type,
                        room_type: form.room_type || undefined,
                        is_active: formActive,
                    },
                    accessToken
                );
            } else {
                await serviceCatalogService.createService(
                    {
                        service_code: code,
                        service_name: name,
                        price: form.price,
                        service_type: form.service_type,
                        room_type: form.room_type || undefined,
                    },
                    accessToken
                );
            }
            setIsModalOpen(false);
            await loadServices();
        } catch (err) {
            setFormError(getErrorMessage(err, 'Không thể lưu dịch vụ.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async () => {
        if (!accessToken || !togglingTarget) return;
        setIsToggling(true);
        setToggleError(null);
        try {
            const id = getServiceId(togglingTarget);
            if (togglingTarget.is_active !== false) {
                await serviceCatalogService.deleteService(id, accessToken);
            } else {
                await serviceCatalogService.updateService(id, { is_active: true }, accessToken);
            }
            setTogglingTarget(null);
            await loadServices();
        } catch (err) {
            setToggleError(getErrorMessage(err, 'Không thể cập nhật trạng thái dịch vụ.'));
        } finally {
            setIsToggling(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 flex flex-col overflow-hidden bg-transparent pt-6 pb-5">
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] rounded-bl-[48px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                    <div className="flex-1 min-h-0 overflow-y-auto p-6">
                        {/* ── Title + Actions ── */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                    Quản lý dịch vụ
                                </h1>
                                <p className="text-[13px] text-[#7B7B7B] font-medium mt-1">
                                    Danh mục dịch vụ khám, xét nghiệm, thủ thuật và đơn thuốc
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={openCreate}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm dịch vụ
                            </button>
                        </div>

                        {/* ── Toolbar: Search & Filters ── */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                            {/* Search Bar */}
                            <div className="flex items-center gap-2.5 bg-[#F5F5F8] rounded-xl px-3.5 py-2.5 text-[12.5px] w-full sm:w-80 border border-neutral-200/60 shadow-xs focus-within:border-[#8B7CF6] focus-within:bg-white transition-all">
                                <Search className="w-4 h-4 shrink-0 text-[#9CA3AF]" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="Tìm theo mã hoặc tên dịch vụ..."
                                    className="bg-transparent flex-1 outline-none text-[#1F2937] placeholder-[#9CA3AF] font-medium"
                                />
                            </div>

                            {/* Inline Filters */}
                            <div className="flex flex-wrap items-center gap-2.5">
                                <div className={cn(
                                    "flex items-center gap-2 bg-[#F5F5F8] border rounded-xl px-3.5 py-2 text-[12.5px] transition-all shadow-xs",
                                    filterServiceType !== ''
                                        ? "border-[#8B7CF6] bg-[#8B7CF6]/5"
                                        : "border-neutral-200/60 hover:border-neutral-300 focus-within:border-[#8B7CF6] focus-within:bg-white"
                                )}>
                                    <span className="text-[11.5px] font-bold text-neutral-400 uppercase tracking-wider shrink-0">Loại DV:</span>
                                    <select
                                        value={filterServiceType}
                                        onChange={(e) => {
                                            setFilterServiceType(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="bg-transparent font-bold text-[#2D2D2D] outline-none cursor-pointer max-w-[170px] truncate pr-1"
                                    >
                                        <option value="">Tất cả loại DV</option>
                                        {SERVICE_TYPE_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={cn(
                                    "flex items-center gap-2 bg-[#F5F5F8] border rounded-xl px-3.5 py-2 text-[12.5px] transition-all shadow-xs",
                                    filterRoomType !== ''
                                        ? "border-[#8B7CF6] bg-[#8B7CF6]/5"
                                        : "border-neutral-200/60 hover:border-neutral-300 focus-within:border-[#8B7CF6] focus-within:bg-white"
                                )}>
                                    <span className="text-[11.5px] font-bold text-neutral-400 uppercase tracking-wider shrink-0">Loại phòng:</span>
                                    <select
                                        value={filterRoomType}
                                        onChange={(e) => {
                                            setFilterRoomType(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="bg-transparent font-bold text-[#2D2D2D] outline-none cursor-pointer max-w-[170px] truncate pr-1"
                                    >
                                        <option value="">Tất cả loại phòng</option>
                                        {ROOM_TYPE_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {(filterServiceType || filterRoomType || searchQuery) && (
                                    <button
                                        onClick={() => {
                                            setFilterServiceType('');
                                            setFilterRoomType('');
                                            setSearchQuery('');
                                            setCurrentPage(1);
                                        }}
                                        className="text-[11.5px] font-bold text-[#8B7CF6] hover:underline cursor-pointer px-2 py-1"
                                    >
                                        Xoá lọc
                                    </button>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 whitespace-pre-line mb-6">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* ── Table Content ── */}
                        <div className="bg-white border border-[#EBEBEB] rounded-2xl overflow-hidden shadow-sm">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                                    <span className="text-[13px] text-[#7B7B7B] font-bold">Đang tải danh mục dịch vụ...</span>
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="flex items-center justify-center py-16">
                                    <p className="text-[13px] text-[#ADADAD] font-medium">Không tìm thấy dịch vụ phù hợp.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-neutral-50/80 border-b border-[#EBEBEB]">
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider w-[64px] whitespace-nowrap">STT</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider w-[120px] whitespace-nowrap">Mã</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Tên dịch vụ</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider text-right whitespace-nowrap">Giá</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider whitespace-nowrap">Loại dịch vụ</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider whitespace-nowrap">Loại phòng</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider whitespace-nowrap w-[140px]">Trạng thái</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider text-right w-[110px] whitespace-nowrap">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        {paginated.map((service, index) => {
                                            const id = getServiceId(service);
                                            const active = service.is_active !== false;
                                            return (
                                                <tr key={id || service.service_code || service.service_name} className="hover:bg-neutral-50/50 transition-colors group">
                                                    <td className="px-5 py-4 text-[13px] font-semibold text-[#7B7B7B] whitespace-nowrap">
                                                        {(safePage - 1) * ITEMS_PER_PAGE + index + 1}
                                                    </td>
                                                    <td className="px-5 py-4 font-mono text-[12px] text-[#7B7B7B] whitespace-nowrap">
                                                        {service.service_code || '—'}
                                                    </td>
                                                    <td className="px-5 py-4 font-bold text-[13px] text-[#2D2D2D]">
                                                        {service.service_name}
                                                    </td>
                                                    <td className="px-5 py-4 text-right text-[12.5px] font-bold text-[#2D2D2D] whitespace-nowrap">
                                                        {Number(service.price || 0).toLocaleString('vi-VN')}₫
                                                    </td>
                                                    <td className="px-5 py-4 text-[12px] text-[#7B7B7B] whitespace-nowrap">
                                                        {serviceTypeLabel(service.service_type)}
                                                    </td>
                                                    <td className="px-5 py-4 text-[12px] text-[#7B7B7B] whitespace-nowrap">
                                                        {roomTypeLabel(service.room_type)}
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <span
                                                            className={cn(
                                                                'text-[10px] font-bold px-3 py-1 rounded-full border whitespace-nowrap inline-flex items-center',
                                                                active
                                                                    ? 'bg-[#E8F9EE] text-[#10B981] border-[#C6F6D5]'
                                                                    : 'bg-[#FFEBEE] text-[#E53935] border-[#FFCDD2]'
                                                            )}
                                                        >
                                                            {active ? 'Đang hoạt động' : 'Đã tắt'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-2 text-neutral-400">
                                                            <button
                                                                type="button"
                                                                onClick={() => setRoomsDrawerFor(service)}
                                                                className="p-1 hover:text-[#8B7CF6] transition-colors cursor-pointer"
                                                                title="Phòng thực hiện"
                                                            >
                                                                <Home className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openEdit(service)}
                                                                className="p-1 hover:text-[#8B7CF6] transition-colors cursor-pointer"
                                                                title="Chỉnh sửa dịch vụ"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setToggleError(null);
                                                                    setTogglingTarget(service);
                                                                }}
                                                                className={cn(
                                                                    'p-1 transition-colors cursor-pointer',
                                                                    active ? 'hover:text-red-600' : 'hover:text-emerald-600'
                                                                )}
                                                                title={active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                                            >
                                                                {active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                    </div>

                    {/* ── Fixed Bottom Pagination Controls ── */}
                    {filtered.length > 0 && (
                        <div className="px-6 py-4 border-t border-neutral-100 bg-white flex items-center justify-between shrink-0">
                            <p className="text-[12px] text-[#ADADAD] font-bold">
                                Hiển thị {Math.min(filtered.length, (safePage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filtered.length, safePage * ITEMS_PER_PAGE)} trong số {filtered.length} dịch vụ
                            </p>
                            {totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                        disabled={safePage === 1}
                                        className="px-3 py-1.5 text-xs font-bold border border-[#EBEBEB] rounded-lg bg-white text-[#7B7B7B] hover:bg-[#8B7CF6]/5 hover:text-[#8B7CF6] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                                    >
                                        Trước
                                    </button>
                                    {getCompactPages(safePage, totalPages).map((page, idx) =>
                                        page === 'ellipsis' ? (
                                            <span
                                                key={`ellipsis-${idx}`}
                                                className="px-1 text-sm font-bold text-[#ADADAD] select-none"
                                            >
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={cn(
                                                    'w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg border transition cursor-pointer',
                                                    safePage === page
                                                        ? 'bg-[#8B7CF6] border-[#8B7CF6] text-white'
                                                        : 'bg-white border-[#EBEBEB] text-[#7B7B7B] hover:bg-[#8B7CF6]/5 hover:text-[#8B7CF6]'
                                                )}
                                            >
                                                {page}
                                            </button>
                                        )
                                    )}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                                        }
                                        disabled={safePage === totalPages}
                                        className="px-3 py-1.5 text-xs font-bold border border-[#EBEBEB] rounded-lg bg-white text-[#7B7B7B] hover:bg-[#8B7CF6]/5 hover:text-[#8B7CF6] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                                    >
                                        Sau
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-neutral-100">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                            <h2 className="font-bold text-neutral-900">
                                {editing ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ'}
                            </h2>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {formError && (
                                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 whitespace-pre-line">
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
                                        Mã dịch vụ *
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
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                                        Loại dịch vụ *
                                    </label>
                                    <select
                                        value={form.service_type || ''}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                service_type: e.target.value,
                                            }))
                                        }
                                        className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-white"
                                    >
                                        {SERVICE_TYPE_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                                        Loại phòng
                                    </label>
                                    <select
                                        value={form.room_type || 'OTHER'}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, room_type: e.target.value }))
                                        }
                                        className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-white"
                                    >
                                        {ROOM_TYPE_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                            </div>
                            {editing && (
                                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                                    <input
                                        type="checkbox"
                                        checked={formActive}
                                        onChange={(e) => setFormActive(e.target.checked)}
                                        className="accent-[#8B7CF6]"
                                    />
                                    Đang hoạt động
                                </label>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-neutral-100 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-bold cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleSave()}
                                disabled={isSaving}
                                className="px-4 py-2 rounded-xl bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                            >
                                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {togglingTarget && (
                <SoftDisableConfirmDialog
                    entityName={togglingTarget.service_name}
                    isActive={togglingTarget.is_active !== false}
                    isSubmitting={isToggling}
                    error={toggleError}
                    onConfirm={() => void handleToggleActive()}
                    onCancel={() => setTogglingTarget(null)}
                />
            )}

            {roomsDrawerFor && (
                <ServiceRoomsDrawer
                    service={roomsDrawerFor}
                    serviceId={getServiceId(roomsDrawerFor)}
                    allRooms={rooms}
                    accessToken={accessToken}
                    onClose={() => setRoomsDrawerFor(null)}
                />
            )}
        </div>
    );
}
