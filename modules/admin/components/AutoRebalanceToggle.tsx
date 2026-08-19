'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { Switch } from '@/shared/components/ui/Switch';
import { useRebalanceConfigStore } from '../store/rebalanceConfigStore';

interface AutoRebalanceToggleProps {
    variant: 'toolbar' | 'panel';
}

export function AutoRebalanceToggle({ variant }: AutoRebalanceToggleProps) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const config = useRebalanceConfigStore((s) => s.config);
    const isLoading = useRebalanceConfigStore((s) => s.isLoading);
    const isSaving = useRebalanceConfigStore((s) => s.isSaving);
    const error = useRebalanceConfigStore((s) => s.error);
    const fetchConfig = useRebalanceConfigStore((s) => s.fetchConfig);
    const setEnabled = useRebalanceConfigStore((s) => s.setEnabled);

    useEffect(() => {
        if (accessToken) {
            void fetchConfig(accessToken);
        }
    }, [accessToken, fetchConfig]);

    const checked = config?.enabled ?? true;
    const busy = isSaving || !accessToken || (isLoading && !config);

    const onToggle = (next: boolean) => {
        if (!accessToken) return;
        void setEnabled(next, accessToken).catch(() => undefined);
    };

    const isToolbar = variant === 'toolbar';

    return (
        <div
            className={cn(
                'flex items-center gap-2',
                isToolbar ? 'whitespace-nowrap' : 'shrink-0',
            )}
            title={
                error ??
                'Tự động đề xuất chuyển bệnh nhân giữa các phòng cùng dịch vụ khi chênh lệch thời gian chờ vượt ngưỡng'
            }
        >
            <Switch
                checked={checked}
                onCheckedChange={onToggle}
                disabled={busy}
                aria-label="Tự sắp xếp hàng chờ"
            />
            <span
                className={cn(
                    'font-bold text-[#2D2D2D]',
                    isToolbar ? 'text-[11px]' : 'text-[13px]',
                )}
            >
                Tự sắp xếp hàng chờ
            </span>
            {busy && (
                <Loader2
                    className={cn(
                        'animate-spin text-[#8B7CF6]',
                        isToolbar ? 'w-3 h-3' : 'w-3.5 h-3.5',
                    )}
                />
            )}
            {error && !isToolbar && (
                <span className="text-[11px] font-medium text-red-500 max-w-[220px] truncate">
                    {error}
                </span>
            )}
        </div>
    );
}
