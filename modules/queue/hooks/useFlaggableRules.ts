'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { queueService } from '../services/queueService';
import type { FlaggableRule } from '../types/ruleFlag.types';

export function useFlaggableRules() {
    const accessToken = useAuthStore((s) => s.accessToken);
    const [rules, setRules] = useState<FlaggableRule[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(
        async (opts?: { silent?: boolean }) => {
            if (!accessToken) return;
            if (!opts?.silent) setIsLoading(true);
            try {
                const list = await queueService.getFlaggableRules(accessToken);
                setRules(list);
                setError(null);
            } catch (e: unknown) {
                setError(
                    e instanceof Error ? e.message : 'Không tải được danh sách cờ ưu tiên',
                );
            } finally {
                if (!opts?.silent) setIsLoading(false);
            }
        },
        [accessToken],
    );

    useEffect(() => {
        void refetch();
    }, [refetch]);

    return { rules, isLoading, error, refetch };
}
