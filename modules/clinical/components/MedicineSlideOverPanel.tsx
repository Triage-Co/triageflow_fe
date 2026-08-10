'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Search, X } from 'lucide-react';
import { medicineService } from '@/modules/ancillary/services/medicineService';
import type { Medicine } from '@/shared/types/prescription.types';
import { cn } from '@/lib/utils';

export interface MedicineSlideOverPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectMedicine: (medicine: Medicine) => void;
    selectedMedicineIds?: string[];
}

export function MedicineSlideOverPanel({
    isOpen,
    onClose,
    onSelectMedicine,
    selectedMedicineIds = [],
}: MedicineSlideOverPanelProps) {
    const [search, setSearch] = useState('');
    const [usageRoute, setUsageRoute] = useState('');
    const [manufacturer, setManufacturer] = useState('');
    const [routes, setRoutes] = useState<string[]>([]);
    const [manufacturers, setManufacturers] = useState<string[]>([]);
    const [results, setResults] = useState<Medicine[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        (async () => {
            try {
                const [routeList, mfrList] = await Promise.all([
                    medicineService.getRoutes(),
                    medicineService.getManufacturers(),
                ]);
                if (!cancelled) {
                    setRoutes(routeList);
                    setManufacturers(mfrList);
                }
            } catch {
                // dropdowns optional
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const timer = window.setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const list = await medicineService.getMedicines({
                    search: search.trim() || undefined,
                    usage_route: usageRoute || undefined,
                    manufacturer: manufacturer || undefined,
                    is_active: true,
                    limit: 50,
                });
                setResults(list);
            } catch (err) {
                setResults([]);
                setError(err instanceof Error ? err.message : 'Không thể tải danh mục thuốc');
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => window.clearTimeout(timer);
    }, [isOpen, search, usageRoute, manufacturer]);

    if (!isOpen) return null;

    const selected = new Set(selectedMedicineIds);

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <button
                type="button"
                aria-label="Đóng panel"
                className="absolute inset-0 bg-black/35 cursor-pointer"
                onClick={onClose}
            />
            <aside
                className={cn(
                    'relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl',
                    'animate-in slide-in-from-right duration-200'
                )}
            >
                <div className="flex items-center justify-between border-b border-[#EBEBEB] px-4 py-3">
                    <h3 className="text-sm font-bold text-[#2D2D2D]">Chọn thuốc kê đơn</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[#9C9C9C] hover:bg-[#F5F5F8] hover:text-[#2D2D2D] cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-3 border-b border-[#EBEBEB] px-4 py-3">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ADADAD]" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Tìm theo tên / mã / hoạt chất..."
                            className="w-full rounded-xl border border-[#E8E7F5] bg-[#F5F5F8] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#8B7CF6] focus:bg-white"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <select
                            value={usageRoute}
                            onChange={(e) => setUsageRoute(e.target.value)}
                            className="rounded-xl border border-[#E8E7F5] bg-white px-2.5 py-2 text-xs font-semibold text-[#555] outline-none focus:border-[#8B7CF6]"
                        >
                            <option value="">Đường dùng: Tất cả</option>
                            {routes.map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                        <select
                            value={manufacturer}
                            onChange={(e) => setManufacturer(e.target.value)}
                            className="rounded-xl border border-[#E8E7F5] bg-white px-2.5 py-2 text-xs font-semibold text-[#555] outline-none focus:border-[#8B7CF6]"
                        >
                            <option value="">NSX: Tất cả</option>
                            {manufacturers.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                    {loading && (
                        <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#9C9C9C]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang tìm thuốc...
                        </div>
                    )}
                    {!loading && error && (
                        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                            {error}
                        </p>
                    )}
                    {!loading && !error && results.length === 0 && (
                        <p className="py-10 text-center text-sm text-[#9C9C9C]">Không tìm thấy thuốc phù hợp.</p>
                    )}
                    {!loading &&
                        results.map((med) => {
                            const already = selected.has(med.medicine_id);
                            return (
                                <div
                                    key={med.medicine_id}
                                    className="rounded-2xl border border-[#EBEBEB] bg-white p-3 shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-[#8B7CF6]">
                                                {med.medicine_code}
                                            </p>
                                            <p className="mt-0.5 text-sm font-bold text-[#2D2D2D] truncate">
                                                {med.medicine_name}
                                            </p>
                                            <p className="mt-1 text-[11px] text-[#7C7C8A]">
                                                Hoạt chất: {med.active_ingredient || '—'}
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-[#7C7C8A]">
                                                {med.usage_route || '—'} ·{' '}
                                                {(med.unit_price || 0).toLocaleString('vi-VN')} đ / {med.unit || 'ĐV'}
                                            </p>
                                        </div>
                                        {already ? (
                                            <span className="shrink-0 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 text-[10px] font-bold text-[#16A34A]">
                                                Đã thêm
                                            </span>
                                        ) : null}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onSelectMedicine(med)}
                                        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#8B7CF6] px-3 py-2 text-xs font-bold text-white hover:bg-[#7A6BE8] cursor-pointer"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Thêm vào đơn
                                    </button>
                                </div>
                            );
                        })}
                </div>
            </aside>
        </div>
    );
}
