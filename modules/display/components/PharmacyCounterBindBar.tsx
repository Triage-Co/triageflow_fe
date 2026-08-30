'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Monitor } from 'lucide-react';
import { displayScreenService } from '@/modules/display/services/displayScreenService';
import { usePharmacyCounterStore } from '@/modules/display/store/pharmacyCounterStore';
import type { DisplayScreen } from '@/modules/display/types/display-screen.types';

export function PharmacyCounterBindBar() {
    const boundId = usePharmacyCounterStore((s) => s.display_screen_id);
    const setCounter = usePharmacyCounterStore((s) => s.setCounter);
    const [screens, setScreens] = useState<DisplayScreen[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        displayScreenService
            .list({ kind: 'TV_PHARMACY', status: 'ENABLED' })
            .then((list) => {
                if (cancelled) return;
                setScreens(list);
                const stillValid = list.some((s) => s.display_screen_id === boundId);
                if (boundId && !stillValid) {
                    usePharmacyCounterStore.getState().clear();
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [boundId]);

    const missing = !boundId;

    return (
        <div
            className={`mb-3 rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
                missing
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-white border-neutral-200'
            }`}
        >
            <div className="flex items-center gap-2 min-w-0">
                <Monitor className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="min-w-0">
                    <p className="text-xs font-black text-neutral-800">Quầy TV nhà thuốc</p>
                    <p className="text-[11px] text-neutral-500">
                        Số soạn xong sẽ hiện trên đúng quầy này. Bắt buộc chọn trước khi soạn thuốc.
                    </p>
                </div>
            </div>
            <div className="sm:ml-auto flex items-center gap-2">
                {missing && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5" /> Chưa chọn quầy
                    </span>
                )}
                <select
                    value={boundId || ''}
                    disabled={loading}
                    onChange={(e) => {
                        if (e.target.value) setCounter(e.target.value);
                    }}
                    className="min-w-52 px-3 py-2 rounded-xl border border-neutral-200 bg-white text-xs font-bold text-neutral-800"
                >
                    <option value="">— Chọn quầy —</option>
                    {screens.map((screen) => (
                        <option key={screen.display_screen_id} value={screen.display_screen_id}>
                            {screen.name} ({screen.code})
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
