'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Home, Loader2, Plus, Power, PowerOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HospitalRoom } from '../types/room.types';
import type { CatalogService } from '../types/service.types';
import type { RoomServiceMapping } from '../types/roomService.types';
import { extractRoomServiceList, roomServiceMappingService } from '../services/roomServiceMappingService';
import { getErrorMessage } from '../utils/errorMessage';

function getMappingRoomId(m: RoomServiceMapping): string {
    return m.room_id || m.room?.room_id || '';
}

interface ServiceRoomsDrawerProps {
    service: CatalogService;
    serviceId: string;
    allRooms: HospitalRoom[];
    accessToken: string | null;
    onClose: () => void;
}

export function ServiceRoomsDrawer({ service, serviceId, allRooms, accessToken, onClose }: ServiceRoomsDrawerProps) {
    const [mappings, setMappings] = useState<RoomServiceMapping[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isAdding, setIsAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

    const [togglingId, setTogglingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!accessToken || !serviceId) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await roomServiceMappingService.getByService(serviceId, accessToken);
            setMappings(extractRoomServiceList(res?.data));
        } catch (err) {
            setError(getErrorMessage(err, 'Không thể tải danh sách phòng thực hiện.'));
        } finally {
            setIsLoading(false);
        }
    }, [accessToken, serviceId]);

    useEffect(() => {
        void load();
    }, [load]);

    const activeRoomIds = useMemo(
        () => new Set(mappings.filter((m) => m.is_active).map(getMappingRoomId)),
        [mappings]
    );

    const availableRooms = useMemo(
        () => allRooms.filter((r) => !activeRoomIds.has(r.room_id)),
        [allRooms, activeRoomIds]
    );

    const openAdd = () => {
        setAddError(null);
        setSelectedRoomId(availableRooms[0]?.room_id || '');
        setIsAdding(true);
    };

    const handleAdd = async () => {
        if (!accessToken || !selectedRoomId) return;
        setIsSubmittingAdd(true);
        setAddError(null);
        try {
            const existing = mappings.find((m) => getMappingRoomId(m) === selectedRoomId);
            if (existing && !existing.is_active) {
                await roomServiceMappingService.setActive(existing.id, true, accessToken);
            } else {
                await roomServiceMappingService.create({ room_id: selectedRoomId, service_id: serviceId }, accessToken);
            }
            setIsAdding(false);
            await load();
        } catch (err) {
            setAddError(getErrorMessage(err, 'Không thể gán phòng cho dịch vụ.'));
        } finally {
            setIsSubmittingAdd(false);
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
            setError(getErrorMessage(err, 'Không thể cập nhật trạng thái.'));
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                    <div>
                        <h2 className="font-bold text-neutral-900">Phòng thực hiện dịch vụ</h2>
                        <p className="text-xs text-neutral-500 font-medium mt-0.5">{service.service_name}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {error && (
                        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 whitespace-pre-line">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span className="text-[12px] text-red-700 font-semibold">{error}</span>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={openAdd}
                        disabled={availableRooms.length === 0}
                        className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="w-4 h-4" />
                        Gán phòng thực hiện
                    </button>

                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin text-[#8B7CF6]" />
                        </div>
                    ) : mappings.length === 0 ? (
                        <p className="text-sm text-neutral-500 text-center py-8">Chưa có phòng nào thực hiện dịch vụ này.</p>
                    ) : (
                        <div className="space-y-2">
                            {mappings.map((m) => {
                                const room = allRooms.find((r) => r.room_id === getMappingRoomId(m));
                                const name = m.room?.room_name || room?.room_name || getMappingRoomId(m);
                                return (
                                    <div
                                        key={m.id}
                                        className="flex items-center justify-between gap-3 border border-neutral-200 rounded-xl px-3.5 py-2.5"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-[#F5F2FF] border border-[#E0DCFB] flex items-center justify-center text-[#8B7CF6] shrink-0">
                                                <Home className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-neutral-800 truncate">{name}</p>
                                                <span
                                                    className={cn(
                                                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full border',
                                                        m.is_active
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                            : 'bg-neutral-50 text-neutral-500 border-neutral-200'
                                                    )}
                                                >
                                                    {m.is_active ? 'Đang hoạt động' : 'Ngừng'}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => void handleToggle(m)}
                                            disabled={togglingId === m.id}
                                            className={cn(
                                                'w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition cursor-pointer disabled:opacity-50 shrink-0',
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
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {isAdding && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setIsAdding(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-neutral-100" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                            <h3 className="font-bold text-neutral-900">Gán phòng</h3>
                            <button type="button" onClick={() => setIsAdding(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            {addError && (
                                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 whitespace-pre-line">
                                    {addError}
                                </div>
                            )}
                            {availableRooms.length === 0 ? (
                                <p className="text-sm text-neutral-500">Không còn phòng nào để gán.</p>
                            ) : (
                                <select
                                    value={selectedRoomId}
                                    onChange={(e) => setSelectedRoomId(e.target.value)}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-white"
                                >
                                    {availableRooms.map((r) => (
                                        <option key={r.room_id} value={r.room_id}>
                                            {r.room_name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-neutral-100 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-bold cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleAdd()}
                                disabled={isSubmittingAdd || !selectedRoomId}
                                className="px-4 py-2 rounded-xl bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                            >
                                {isSubmittingAdd && <Loader2 className="w-4 h-4 animate-spin" />}
                                Gán
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
