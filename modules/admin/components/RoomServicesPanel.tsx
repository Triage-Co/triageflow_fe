'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Plus, Power, PowerOff, Stethoscope, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CatalogService } from '../types/service.types';
import { getServiceId } from '../types/service.types';
import type { RoomServiceMapping } from '../types/roomService.types';
import { extractRoomServiceList, roomServiceMappingService } from '../services/roomServiceMappingService';
import { getErrorMessage } from '../utils/errorMessage';

function getMappingServiceId(m: RoomServiceMapping): string {
    return m.service_id || m.service?.service_id || '';
}

interface RoomServicesPanelProps {
    roomId: string;
    roomName: string;
    allServices: CatalogService[];
    accessToken: string | null;
}

export function RoomServicesPanel({ roomId, roomName, allServices, accessToken }: RoomServicesPanelProps) {
    const [mappings, setMappings] = useState<RoomServiceMapping[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);

    const [togglingId, setTogglingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!accessToken || !roomId) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await roomServiceMappingService.getByRoom(roomId, accessToken);
            setMappings(extractRoomServiceList(res?.data));
        } catch (err) {
            setError(getErrorMessage(err, 'Không thể tải danh sách dịch vụ của phòng.'));
        } finally {
            setIsLoading(false);
        }
    }, [accessToken, roomId]);

    useEffect(() => {
        void load();
    }, [load]);

    const activeServiceIds = useMemo(
        () => new Set(mappings.filter((m) => m.is_active).map(getMappingServiceId)),
        [mappings]
    );

    const availableServices = useMemo(
        () =>
            allServices.filter(
                (s) => s.is_active !== false && !activeServiceIds.has(getServiceId(s))
            ),
        [allServices, activeServiceIds]
    );

    const openAdd = () => {
        setAddError(null);
        setSelectedServiceId(availableServices[0] ? getServiceId(availableServices[0]) : '');
        setIsAddOpen(true);
    };

    const handleAdd = async () => {
        if (!accessToken || !selectedServiceId) return;
        setIsAdding(true);
        setAddError(null);
        try {
            // Reactivate if a soft-disabled mapping already exists (BE also upserts).
            const existing = mappings.find((m) => getMappingServiceId(m) === selectedServiceId);
            if (existing && !existing.is_active) {
                await roomServiceMappingService.setActive(existing.id, true, accessToken);
            } else {
                await roomServiceMappingService.create({ room_id: roomId, service_id: selectedServiceId }, accessToken);
            }
            setIsAddOpen(false);
            await load();
        } catch (err) {
            setAddError(getErrorMessage(err, 'Không thể gán dịch vụ cho phòng.'));
        } finally {
            setIsAdding(false);
        }
    };

    const handleToggle = async (mapping: RoomServiceMapping) => {
        if (!accessToken) return;
        setTogglingId(mapping.id);
        setError(null);
        try {
            await roomServiceMappingService.setActive(mapping.id, !mapping.is_active, accessToken);
            await load();
        } catch (err) {
            setError(getErrorMessage(err, 'Không thể cập nhật trạng thái dịch vụ.'));
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <div className="lg:col-span-3 bg-white rounded-3xl border border-[#EBEBEB] shadow-sm p-6 flex flex-col mt-6">
            <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                    <h2 className="text-[17px] font-bold text-[#2D2D2D]">Dịch vụ thực hiện tại phòng</h2>
                    <p className="text-[12px] text-[#7B7B7B] font-medium mt-0.5">
                        Danh mục dịch vụ đang gán cho phòng {roomName}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={openAdd}
                    disabled={availableServices.length === 0}
                    className="flex items-center gap-2 px-3.5 py-2 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus className="w-4 h-4" />
                    Thêm dịch vụ
                </button>
            </div>

            {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 mb-4 whitespace-pre-line">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span className="text-[12px] text-red-700 font-semibold">{error}</span>
                </div>
            )}

            <div className="border border-[#EBEBEB] rounded-2xl overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-[#8B7CF6]" />
                    </div>
                ) : mappings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <Stethoscope className="w-8 h-8 text-neutral-300" />
                        <p className="text-[13px] text-[#ADADAD] font-medium">
                            Chưa gán dịch vụ — thêm từ danh mục hoặc kiểm tra dữ liệu seed.
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-neutral-50 border-b border-[#EBEBEB]">
                                <th className="px-4 py-3 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Mã</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Tên dịch vụ</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider text-right">Giá</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Trạng thái</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider text-right w-[100px]">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {mappings.map((m) => {
                                const svc = allServices.find((s) => getServiceId(s) === getMappingServiceId(m));
                                const code = m.service?.service_code || svc?.service_code || '—';
                                const name = m.service?.service_name || svc?.service_name || getMappingServiceId(m);
                                const price = m.service?.price ?? svc?.price ?? 0;
                                return (
                                    <tr key={m.id} className="hover:bg-neutral-50/50">
                                        <td className="px-4 py-3 font-mono text-xs text-neutral-500">{code}</td>
                                        <td className="px-4 py-3 font-semibold text-neutral-800">{name}</td>
                                        <td className="px-4 py-3 text-right font-medium">{Number(price || 0).toLocaleString('vi-VN')}₫</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={cn(
                                                    'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                                    m.is_active
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                        : 'bg-neutral-50 text-neutral-500 border-neutral-200'
                                                )}
                                            >
                                                {m.is_active ? 'Đang hoạt động' : 'Ngừng'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => void handleToggle(m)}
                                                    disabled={togglingId === m.id}
                                                    className={cn(
                                                        'w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition cursor-pointer disabled:opacity-50',
                                                        m.is_active ? 'text-neutral-400 hover:text-red-500' : 'text-neutral-400 hover:text-emerald-600'
                                                    )}
                                                    title={m.is_active ? 'Tắt mapping' : 'Bật mapping'}
                                                >
                                                    {togglingId === m.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : m.is_active ? (
                                                        <PowerOff className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <Power className="w-3.5 h-3.5" />
                                                    )}
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

            {isAddOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setIsAddOpen(false)}>
                    <div
                        className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-neutral-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                            <h3 className="font-bold text-neutral-900">Thêm dịch vụ cho phòng</h3>
                            <button type="button" onClick={() => setIsAddOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            {addError && (
                                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 whitespace-pre-line">
                                    {addError}
                                </div>
                            )}
                            {availableServices.length === 0 ? (
                                <p className="text-sm text-neutral-500">Không còn dịch vụ nào để thêm.</p>
                            ) : (
                                <select
                                    value={selectedServiceId}
                                    onChange={(e) => setSelectedServiceId(e.target.value)}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-white"
                                >
                                    {availableServices.map((s) => (
                                        <option key={getServiceId(s)} value={getServiceId(s)}>
                                            {s.service_code} — {s.service_name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-neutral-100 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsAddOpen(false)}
                                className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-bold cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleAdd()}
                                disabled={isAdding || !selectedServiceId}
                                className="px-4 py-2 rounded-xl bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                            >
                                {isAdding && <Loader2 className="w-4 h-4 animate-spin" />}
                                Thêm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
