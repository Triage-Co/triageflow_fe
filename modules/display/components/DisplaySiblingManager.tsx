'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Power, PowerOff, Save, X, Loader2 } from 'lucide-react';
import { displayScreenService } from '../services/displayScreenService';
import type {
  DisplayScreen,
  DisplayScreenKind,
  DisplayScreenSettings,
} from '../types/display-screen.types';
import { DISPLAY_KIND_LABEL } from '../types/display-screen.types';

interface DisplaySiblingManagerProps {
  kind: DisplayScreenKind;
  currentScreenId?: string;
  onClose: () => void;
  onUpdated?: (screen: DisplayScreen) => void;
}

function nextCode(kind: DisplayScreenKind, existing: DisplayScreen[]): string {
  const prefix =
    kind === 'KIOSK' ? 'KIOSK'
    : kind === 'TV_PHARMACY' ? 'TV-NT'
    : kind === 'TV_PAYMENT' ? 'TV-TT'
    : 'TV-PK';
  let n = existing.length + 1;
  const codes = new Set(existing.map((s) => s.code));
  while (codes.has(`${prefix}-${n}`) || codes.has(`${prefix}-0${n}`)) n += 1;
  return kind === 'KIOSK' ? `${prefix}-${String(n).padStart(2, '0')}` : `${prefix}-${n}`;
}

export function DisplaySiblingManager({
  kind,
  currentScreenId,
  onClose,
  onUpdated,
}: DisplaySiblingManagerProps) {
  const [screens, setScreens] = useState<DisplayScreen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await displayScreenService.list({ kind });
      setScreens(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách màn hình');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [kind]);

  const patch = async (id: string, payload: { name?: string; status?: 'ENABLED' | 'DISABLED'; settings?: DisplayScreenSettings }) => {
    setSavingId(id);
    setError(null);
    try {
      const updated = await displayScreenService.update(id, payload);
      setScreens((prev) => prev.map((s) => (s.display_screen_id === id ? updated : s)));
      onUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được thay đổi');
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async () => {
    const name = draftName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const created = await displayScreenService.create({
        code: nextCode(kind, screens),
        name,
        kind,
        settings:
          kind === 'TV_PHARMACY'
            ? { media_enabled: true, sound_enabled: true }
            : kind === 'KIOSK'
              ? { enable_otp: true, floor_number: 1, start_room_code: '', start_room_label: '' }
              : {},
      });
      setScreens((prev) => [...prev, created]);
      setDraftName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được màn hình');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900">Cấu hình {DISPLAY_KIND_LABEL[kind]}</h3>
            <p className="text-xs font-semibold text-slate-500">
              Thêm, đổi tên hoặc tắt màn hình cùng loại. PIN JWT đủ để lưu từ thiết bị.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : (
            screens.map((screen) => (
              <SiblingRow
                key={screen.display_screen_id}
                screen={screen}
                isCurrent={screen.display_screen_id === currentScreenId}
                saving={savingId === screen.display_screen_id}
                onRename={(name) => void patch(screen.display_screen_id, { name })}
                onToggle={() =>
                  void patch(screen.display_screen_id, {
                    status: screen.status === 'ENABLED' ? 'DISABLED' : 'ENABLED',
                  })
                }
                onSettings={(settings) => void patch(screen.display_screen_id, { settings })}
              />
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-2">
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder={`Tên ${DISPLAY_KIND_LABEL[kind]} mới`}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold"
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating || !draftName.trim()}
            className="px-4 py-2.5 rounded-xl bg-[#155DFC] text-white text-sm font-black flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Thêm
          </button>
        </div>
      </div>
    </div>
  );
}

function SiblingRow({
  screen,
  isCurrent,
  saving,
  onRename,
  onToggle,
  onSettings,
}: {
  screen: DisplayScreen;
  isCurrent: boolean;
  saving: boolean;
  onRename: (name: string) => void;
  onToggle: () => void;
  onSettings: (settings: DisplayScreenSettings) => void;
}) {
  const [name, setName] = useState(screen.name);
  useEffect(() => setName(screen.name), [screen.name]);

  const mediaEnabled = screen.settings.media_enabled !== false;
  const soundEnabled = screen.settings.sound_enabled !== false;

  return (
    <div
      className={`rounded-2xl border p-4 space-y-2 ${
        isCurrent ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-100 bg-slate-50/60'
      }`}
    >
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold"
        />
        <button
          type="button"
          disabled={saving || name.trim() === screen.name}
          onClick={() => onRename(name.trim())}
          className="p-2 rounded-xl bg-white border border-slate-200 text-indigo-600 disabled:opacity-40 cursor-pointer"
          title="Lưu tên"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={onToggle}
          disabled={saving}
          className={`p-2 rounded-xl border cursor-pointer ${
            screen.status === 'ENABLED'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
          title={screen.status === 'ENABLED' ? 'Tắt màn hình' : 'Bật lại'}
        >
          {screen.status === 'ENABLED' ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-[11px] font-semibold text-slate-400">
        {screen.code}
        {isCurrent ? ' · đang mở' : ''}
        {screen.status === 'DISABLED' ? ' · đã tắt' : ''}
      </p>
      {screen.kind === 'TV_PHARMACY' && (
        <div className="flex gap-2">
          <ToggleChip
            label="Truyền thông"
            on={mediaEnabled}
            onClick={() => onSettings({ ...screen.settings, media_enabled: !mediaEnabled })}
          />
          <ToggleChip
            label="Âm thanh"
            on={soundEnabled}
            onClick={() => onSettings({ ...screen.settings, sound_enabled: !soundEnabled })}
          />
        </div>
      )}
    </div>
  );
}

function ToggleChip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] font-extrabold px-3 py-1 rounded-full border cursor-pointer ${
        on ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}
    >
      {label}: {on ? 'Bật' : 'Tắt'}
    </button>
  );
}
