'use client';

import { useEffect, useState } from 'react';
import { PatientPaymentDisplay } from '@/modules/payment/components/PatientPaymentDisplay';
import { useDisplayScreen } from '@/modules/display/hooks/useDisplayScreen';
import { useFiveTap } from '@/modules/display/hooks/useFiveTap';
import { DisplayPinModal } from '@/modules/display/components/DisplayPinModal';
import { DisplaySiblingManager } from '@/modules/display/components/DisplaySiblingManager';

interface PaymentTvHostProps {
  screenId: string;
}

export function PaymentTvHost({ screenId }: PaymentTvHostProps) {
  const { screen, reload } = useDisplayScreen({
    screenId,
    expectedKind: 'TV_PAYMENT',
    selectorPath: '/display/payment',
  });
  const [pinOpen, setPinOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const handleFiveTap = useFiveTap(() => setPinOpen(true));

  return (
    <div className="bg-[#FAF9FF] dark:bg-neutral-950 h-screen w-screen max-h-screen overflow-hidden p-3 md:p-4 flex flex-col font-['Be_Vietnam_Pro']">
      <button
        type="button"
        onClick={handleFiveTap}
        className="shrink-0 text-center text-sm font-black text-slate-700 pb-2 cursor-pointer"
        title="Chạm 5 lần để cấu hình"
      >
        {screen?.name || 'TV Thanh toán'}
      </button>
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <PatientPaymentDisplay isStandalonePage={true} />
      </div>
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
          kind="TV_PAYMENT"
          currentScreenId={screen?.display_screen_id}
          onClose={() => {
            setSettingsOpen(false);
            void reload();
          }}
          onUpdated={() => void reload()}
        />
      )}
    </div>
  );
}
