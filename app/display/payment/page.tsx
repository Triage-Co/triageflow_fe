'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { displayScreenService } from '@/modules/display/services/displayScreenService';
import { DisplayScreenSelector } from '@/modules/display/components/DisplayScreenSelector';
import { useDisplayBindStore } from '@/modules/display/store/displayBindStore';
import { screenHref } from '@/modules/display/types/display-screen.types';

export default function CashierDisplayPage() {
  const router = useRouter();
  const boundId = useDisplayBindStore((s) => (s.kind === 'TV_PAYMENT' ? s.display_screen_id : ''));
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const enabled = await displayScreenService.list({
        kind: 'TV_PAYMENT',
        status: 'ENABLED',
      });
      if (cancelled) return;
      if (boundId && enabled.some((s) => s.display_screen_id === boundId)) {
        router.replace(`/display/payment/${boundId}`);
        return;
      }
      if (enabled.length === 1) {
        router.replace(screenHref(enabled[0]));
        return;
      }
      if (enabled.length === 0) {
        const created = await displayScreenService.findOrCreatePayment();
        if (!cancelled) router.replace(screenHref(created));
        return;
      }
      setShowSelector(true);
    };
    void run().catch(() => {
      if (!cancelled) setShowSelector(true);
    });
    return () => {
      cancelled = true;
    };
  }, [boundId, router]);

  if (!showSelector) {
    return (
      <div className="h-screen w-screen flex items-center justify-center font-bold text-indigo-900">
        Đang mở TV thanh toán...
      </div>
    );
  }

  return (
    <DisplayScreenSelector
      kind="TV_PAYMENT"
      title="Chọn TV thanh toán"
    />
  );
}
