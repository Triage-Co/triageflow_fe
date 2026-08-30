'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoomWaitingScreen } from '@/modules/queue/components/RoomWaitingScreen';
import { displayScreenService } from '@/modules/display/services/displayScreenService';
import { useDisplayBindStore } from '@/modules/display/store/displayBindStore';
import { useFiveTap } from '@/modules/display/hooks/useFiveTap';
import { DisplayPinModal } from '@/modules/display/components/DisplayPinModal';
import { DisplaySiblingManager } from '@/modules/display/components/DisplaySiblingManager';
import type { DisplayScreen } from '@/modules/display/types/display-screen.types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface ClinicTvHostProps {
  rawId: string;
}

export function ClinicTvHost({ rawId }: ClinicTvHostProps) {
  const router = useRouter();
  const bind = useDisplayBindStore((s) => s.bind);
  const [screen, setScreen] = useState<DisplayScreen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const handleFiveTap = useFiveTap(() => setPinOpen(true));

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      if (!UUID_RE.test(rawId)) {
        setError('Mã màn hình/phòng không hợp lệ');
        return;
      }
      try {
        const existing = await displayScreenService.getById(rawId);
        if (cancelled) return;
        if (existing.kind !== 'TV_CLINIC') {
          router.replace('/display/room');
          return;
        }
        if (existing.status === 'DISABLED') {
          router.replace('/display/room');
          return;
        }
        setScreen(existing);
        bind(existing.display_screen_id, 'TV_CLINIC');
        return;
      } catch {
        // Compatibility: /display/room/{roomUuid}
      }
      try {
        const created = await displayScreenService.findOrCreateClinic(rawId);
        if (cancelled) return;
        if (created.status === 'DISABLED') {
          router.replace('/display/room');
          return;
        }
        setScreen(created);
        bind(created.display_screen_id, 'TV_CLINIC');
        if (created.display_screen_id !== rawId) {
          router.replace(`/display/room/${created.display_screen_id}`);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Không mở được TV phòng khám');
        }
      }
    };
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [bind, rawId, router]);

  useEffect(() => {
    if (!screen) return;
    const timer = window.setInterval(() => {
      void displayScreenService
        .getById(screen.display_screen_id)
        .then((data) => {
          if (data.status === 'DISABLED') router.replace('/display/room');
        })
        .catch(() => undefined);
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [router, screen]);

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center font-bold text-rose-700">
        {error}
      </div>
    );
  }

  if (!screen?.room_id) {
    return (
      <div className="h-screen w-screen flex items-center justify-center font-bold text-indigo-900">
        Đang mở TV phòng khám...
      </div>
    );
  }

  return (
    <>
      <RoomWaitingScreen roomId={screen.room_id} onHeaderTap={handleFiveTap} />
      <DisplayPinModal
        isOpen={pinOpen}
        onClose={() => setPinOpen(false)}
        onSuccess={() => {
          setPinOpen(false);
          setSettingsOpen(true);
        }}
      />
      {settingsOpen && (
        <DisplaySiblingManager
          kind="TV_CLINIC"
          currentScreenId={screen.display_screen_id}
          onClose={() => setSettingsOpen(false)}
          onUpdated={(updated) => {
            if (updated.status === 'DISABLED') router.replace('/display/room');
            else setScreen(updated);
          }}
        />
      )}
    </>
  );
}
