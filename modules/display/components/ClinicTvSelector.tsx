'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FlaskConical,
  FolderKanban,
  Monitor,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
  Syringe,
  FileImage,
  Activity,
} from 'lucide-react';
import { displayScreenService } from '../services/displayScreenService';
import { useDisplayBindStore } from '../store/displayBindStore';
import { useFiveTap } from '../hooks/useFiveTap';
import { DisplayPinModal } from './DisplayPinModal';
import { DisplaySiblingManager } from './DisplaySiblingManager';
import { ROOM_CATEGORY_CONFIGS } from '@/modules/queue/services/roomService';
import { screenHref, type DisplayScreen } from '../types/display-screen.types';

function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function roomTypeLabel(roomType?: string): string {
  const raw = (roomType || '').toUpperCase();
  const match = ROOM_CATEGORY_CONFIGS.find((config) => config.types.includes(raw));
  return match?.name || 'Khác';
}

function groupForScreen(screen: DisplayScreen): { id: string; name: string } {
  const specialty = screen.room?.specialty;
  if (specialty?.specialty_id && specialty.specialty_name) {
    return { id: `spec-${specialty.specialty_id}`, name: specialty.specialty_name };
  }
  const typeName = roomTypeLabel(screen.room?.room_type);
  return { id: `type-${(screen.room?.room_type || 'OTHER').toUpperCase()}`, name: typeName };
}

function matchesQuery(screen: DisplayScreen, query: string): boolean {
  if (!query) return true;
  const haystack = foldText(
    [
      screen.name,
      screen.code,
      screen.room?.room_name ?? '',
      screen.room?.specialty?.specialty_name ?? '',
      screen.room?.specialty?.specialty_code ?? '',
      roomTypeLabel(screen.room?.room_type),
    ].join(' '),
  );
  return query.split(/\s+/).every((token) => haystack.includes(token));
}

function RoomTypeIcon({ roomType }: { roomType?: string }) {
  switch ((roomType || '').toUpperCase()) {
    case 'PROCEDURE_ROOM':
      return <Syringe className="w-7 h-7" />;
    case 'LABORATORY':
      return <FlaskConical className="w-7 h-7" />;
    case 'IMAGING_ROOM':
      return <FileImage className="w-7 h-7" />;
    case 'FUNCTIONAL_EXPLORATION':
      return <Activity className="w-7 h-7" />;
    default:
      return <Stethoscope className="w-7 h-7" />;
  }
}

export function ClinicTvSelector() {
  const router = useRouter();
  const bind = useDisplayBindStore((s) => s.bind);
  const lastId = useDisplayBindStore((s) =>
    s.kind === 'TV_CLINIC' ? s.display_screen_id : '',
  );
  const [screens, setScreens] = useState<DisplayScreen[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [pinOpen, setPinOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const handleFiveTap = useFiveTap(() => setPinOpen(true));

  const load = async () => {
    setLoading(true);
    try {
      const list = await displayScreenService.list({ kind: 'TV_CLINIC', status: 'ENABLED' });
      setScreens(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const foldedQuery = foldText(query);
  const lastScreen = screens.find((s) => s.display_screen_id === lastId);

  const groups = useMemo(() => {
    const filtered = screens.filter((screen) => matchesQuery(screen, foldedQuery));
    const map = new Map<string, { id: string; name: string; screens: DisplayScreen[] }>();
    for (const screen of filtered) {
      const group = groupForScreen(screen);
      const current = map.get(group.id) ?? { ...group, screens: [] };
      current.screens.push(screen);
      map.set(group.id, current);
    }
    return Array.from(map.values())
      .map((group) => ({
        ...group,
        screens: [...group.screens].sort((a, b) =>
          a.name.localeCompare(b.name, 'vi'),
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [screens, foldedQuery]);

  const totalVisible = groups.reduce((sum, group) => sum + group.screens.length, 0);

  const openScreen = (screen: DisplayScreen) => {
    bind(screen.display_screen_id, screen.kind);
    router.push(screenHref(screen));
  };

  const jumpToGroup = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className="relative h-screen w-screen flex flex-col font-sans select-none overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #DFE1FF 0%, #DFE1FF 45%, #F0D2C1 100%)' }}
    >
      <div className="shrink-0 bg-gradient-to-r from-[#709CE4] via-[#7DA7EC] to-[#709CE4] text-white px-6 sm:px-8 py-5 shadow-md">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleFiveTap}
            className="flex items-center gap-3 text-left cursor-pointer min-w-0"
            title="Chạm 5 lần để cấu hình"
          >
            <Monitor className="w-8 h-8 text-white shrink-0" />
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide uppercase leading-tight">
                Chọn TV phòng khám
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-white/80 mt-0.5">
                {loading ? 'Đang tải...' : `${screens.length} màn hình · chia theo khoa`}
              </p>
            </div>
          </button>
          {lastScreen && (
            <button
              type="button"
              onClick={() => openScreen(lastScreen)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm shrink-0"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline">Mở gần nhất:</span> {lastScreen.name}
            </button>
          )}
        </div>

        <div className="mt-4 relative max-w-3xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo khoa, tên phòng, mã TV (ví dụ: tim mạch, P12, siêu âm)..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white text-indigo-950 font-semibold text-sm sm:text-base placeholder:text-slate-400 border-0 shadow-md focus:outline-none focus:ring-2 focus:ring-white/80"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full px-6 sm:px-8 py-5">
          {loading ? (
            <div className="flex items-center justify-center flex-col gap-3 py-20">
              <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
              <span className="text-indigo-900 font-bold text-lg">Đang tải danh sách TV theo khoa...</span>
            </div>
          ) : screens.length === 0 ? (
            <div className="text-center py-20 text-indigo-900/70 font-semibold">
              Chưa có TV phòng khám. Chạm 5 lần tiêu đề để thêm, hoặc chạy seed TV_CLINIC.
            </div>
          ) : totalVisible === 0 ? (
            <div className="text-center py-16 text-indigo-900/70 font-semibold">
              Không có màn hình khớp &quot;{query.trim()}&quot;. Thử tên khoa hoặc tên phòng.
            </div>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar sticky top-0 z-10 bg-gradient-to-b from-[#DFE1FF] via-[#DFE1FF]/95 to-transparent pt-1">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => jumpToGroup(group.id)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 hover:bg-white border border-indigo-100 text-indigo-900 text-xs font-bold shadow-sm cursor-pointer"
                  >
                    <FolderKanban className="w-3.5 h-3.5 text-indigo-500" />
                    {group.name}
                    <span className="text-indigo-400">{group.screens.length}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-8 pb-10">
                {groups.map((group) => (
                  <section key={group.id} id={group.id} className="scroll-mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FolderKanban className="w-5 h-5 text-indigo-600" />
                      <h2 className="text-lg sm:text-xl font-black text-indigo-950 tracking-tight">
                        {group.name}
                      </h2>
                      <span className="text-xs font-bold text-indigo-500 bg-white/70 border border-indigo-100 px-2 py-0.5 rounded-lg">
                        {group.screens.length} TV
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {group.screens.map((screen) => (
                        <div
                          key={screen.display_screen_id}
                          onClick={() => openScreen(screen)}
                          className="bg-white/90 backdrop-blur-md hover:bg-white border-2 border-transparent hover:border-indigo-500 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-indigo-500 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
                            <RoomTypeIcon roomType={screen.room?.room_type} />
                          </div>
                          <h4 className="font-black text-lg text-indigo-950 tracking-tight leading-snug">
                            {screen.name.replace(/^TV\s+/i, '')}
                          </h4>
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                            {screen.code}
                            {screen.room?.room_type
                              ? ` · ${roomTypeLabel(screen.room.room_type)}`
                              : ''}
                          </span>
                          <button
                            type="button"
                            className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition shadow-sm"
                          >
                            Mở màn hình
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
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
          kind="TV_CLINIC"
          onClose={() => {
            setSettingsOpen(false);
            void load();
          }}
        />
      )}
    </div>
  );
}
