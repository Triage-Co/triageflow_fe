'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { queueService } from '../services/queueService';
import type { FlaggableRule } from '../types/ruleFlag.types';

export function useFlaggableRules() {
    const accessToken = useAuthStore((s) => s.accessToken);
    const [rules, setRules] = useState<FlaggableRule[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!accessToken) return;

        let cancelled = false;

        void queueService
            .getFlaggableRules(accessToken)
            .then((list) => {
                if (!cancelled) {
                    setRules(list);
                    setError(null);
                }
            })
            .catch((e: unknown) => {
                if (cancelled) return;
                setRules([]);
                setError(e instanceof Error ? e.message : 'Không tải được danh sách cờ ưu tiên');
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [accessToken]);

    return { rules, isLoading, error };
}
