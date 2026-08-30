'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Monitor,
  RefreshCw,
  Sparkles,
  Pill,
  Stethoscope,
  CreditCard,
  TabletSmartphone,
} from 'lucide-react';
import { displayScreenService } from '../services/displayScreenService';
import { useDisplayBindStore } from '../store/displayBindStore';
import { useFiveTap } from '../hooks/useFiveTap';
import { DisplayPinModal } from './DisplayPinModal';
import { DisplaySiblingManager } from './DisplaySiblingManager';
import {
  DISPLAY_KIND_LABEL,
  screenHref,
  type DisplayScreen,
  type DisplayScreenKind,
} from '../types/display-screen.types';

const KIND_ICON: Record<DisplayScreenKind, React.ReactNode> = {
  KIOSK: <TabletSmartphone className="w-8 h-8" />,
  TV_CLINIC: <Stethoscope className="w-8 h-8" />,
  TV_PHARMACY: <Pill className="w-8 h-8" />,
  TV_PAYMENT: <CreditCard className="w-8 h-8" />,
};

interface DisplayScreenSelectorProps {
  kind: DisplayScreenKind;
  title: string;
  emptyHint?: string;
}

export function DisplayScreenSelector({ kind, title, emptyHint }: DisplayScreenSelectorProps) {
  const router = useRouter();
  const bind = useDisplayBindStore((s) => s.bind);
  const lastId = useDisplayBindStore((s) =>
    s.kind === kind ? s.display_screen_id : '',
  );
  const [screens, setScreens] = useState<DisplayScreen[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinOpen, setPinOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const handleFiveTap = useFiveTap(() => setPinOpen(true));

  const load = async () => {
    setLoading(true);
    try {
      const list = await displayScreenService.list({ kind, status: 'ENABLED' });
      setScreens(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [kind]);

  const lastScreen = screens.find((s) => s.display_screen_id === lastId);

  const openScreen = (screen: DisplayScreen) => {
    bind(screen.display_screen_id, screen.kind);
    router.push(screenHref(screen));
  };

  return (
    <div
      className="relative h-screen w-screen flex flex-col font-sans select-none overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #DFE1FF 0%, #DFE1FF 45%, #F0D2C1 100%)' }}
    >
      <div className="shrink-0 bg-gradient-to-r from-[#709CE4] via-[#7DA7EC] to-[#709CE4] text-white px-8 py-6 flex items-center justify-between shadow-md">
        <button
          type="button"
          onClick={handleFiveTap}
          className="flex items-center gap-3 text-left cursor-pointer"
          title="Chạm 5 lần để cấu hình"
        >
          <Monitor className="w-8 h-8 text-white" />
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide uppercase">{title}</h1>
        </button>
        {lastScreen && (
          <button
            onClick={() => openScreen(lastScreen)}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            Mở gần nhất: {lastScreen.name}
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full">
          {loading ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-3 py-20">
              <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
              <span className="text-indigo-900 font-bold text-lg">Đang tải danh sách màn hình...</span>
            </div>
          ) : screens.length === 0 ? (
            <div className="text-center py-20 text-indigo-900/70 font-semibold">
              {emptyHint || `Chưa có ${DISPLAY_KIND_LABEL[kind]} nào đang bật. Chạm 5 lần tiêu đề để thêm.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {screens.map((screen) => (
                <div
                  key={screen.display_screen_id}
                  onClick={() => openScreen(screen)}
                  className="bg-white/90 backdrop-blur-md hover:bg-white border-2 border-transparent hover:border-indigo-500 rounded-2xl p-6 shadow-sm hover:shadow-2xl transition-all cursor-pointer flex flex-col justify-between group text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500 text-white mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
                    {KIND_ICON[kind]}
                  </div>
                  <h4 className="font-black text-2xl text-indigo-950 uppercase tracking-tight mb-1">
                    {screen.name}
                  </h4>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-4">
                    {screen.code}
                    {screen.room?.room_name ? ` · ${screen.room.room_name}` : ''}
                  </span>
                  <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-sm">
                    Mở màn hình
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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
          kind={kind}
          onClose={() => {
            setSettingsOpen(false);
            void load();
          }}
        />
      )}
    </div>
  );
}
