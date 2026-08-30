'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { displayScreenService } from '@/modules/display/services/displayScreenService';
import { useDisplayBindStore } from '@/modules/display/store/displayBindStore';
import { DisplayScreenSelector } from '@/modules/display/components/DisplayScreenSelector';
import { screenHref } from '@/modules/display/types/display-screen.types';

export function KioskEntryClient() {
  const router = useRouter();
  const boundId = useDisplayBindStore((s) => (s.kind === 'KIOSK' ? s.display_screen_id : ''));
  const [ready, setReady] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const enabled = await displayScreenService.list({ kind: 'KIOSK', status: 'ENABLED' });
      if (cancelled) return;
      if (boundId && enabled.some((s) => s.display_screen_id === boundId)) {
        router.replace(`/kiosk/${boundId}`);
        return;
      }
      if (enabled.length === 1) {
        router.replace(screenHref(enabled[0]));
        return;
      }
      setShowSelector(true);
      setReady(true);
    };
    void run().catch(() => {
      if (!cancelled) {
        setShowSelector(true);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [boundId, router]);

  if (!ready && !showSelector) {
    return (
      <div className="h-screen w-screen flex items-center justify-center text-indigo-900 font-bold">
        Đang mở kiosk...
      </div>
    );
  }

  return (
    <DisplayScreenSelector
      kind="KIOSK"
      title="Chọn kiosk"
      emptyHint="Chưa có kiosk nào. Chạm 5 lần tiêu đề để thêm kiosk mới."
    />
  );
}
