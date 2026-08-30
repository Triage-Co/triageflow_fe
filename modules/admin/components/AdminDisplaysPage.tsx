'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { KeyRound, Loader2, Monitor, Plus, Power, PowerOff, Save } from 'lucide-react';
import { displayScreenService } from '@/modules/display/services/displayScreenService';
import {
  DISPLAY_KIND_LABEL,
  type DisplayScreen,
  type DisplayScreenKind,
  type DisplayScreenSettings,
} from '@/modules/display/types/display-screen.types';
import { roomService, type BackendRoom } from '@/modules/queue/services/roomService';

const KINDS: DisplayScreenKind[] = ['KIOSK', 'TV_CLINIC', 'TV_PHARMACY', 'TV_PAYMENT'];

export function AdminDisplaysPage() {
  const [screens, setScreens] = useState<DisplayScreen[]>([]);
  const [rooms, setRooms] = useState<BackendRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creatingKind, setCreatingKind] = useState<DisplayScreenKind | null>(null);
  const [pinOpen, setPinOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, roomList] = await Promise.all([
        displayScreenService.list(),
        roomService.getRooms().catch(() => [] as BackendRoom[]),
      ]);
      setScreens(list);
      setRooms(roomList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách màn hình');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map: Record<DisplayScreenKind, DisplayScreen[]> = {
      KIOSK: [],
      TV_CLINIC: [],
      TV_PHARMACY: [],
      TV_PAYMENT: [],
    };
    for (const screen of screens) {
      map[screen.kind].push(screen);
    }
    return map;
  }, [screens]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-neutral-900">Màn hình kiosk & TV</h1>
              <p className="text-[13px] text-[#7B7B7B] font-medium mt-1">
                Quản lý Display_Screen theo loại, bật/tắt thiết bị và đổi PIN toàn hệ thống (mặc định 123456).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPinOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
            >
              <KeyRound className="w-4 h-4" />
              Đổi PIN toàn hệ thống
            </button>
          </div>

          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
          {notice && <p className="text-sm font-semibold text-emerald-700">{notice}</p>}

          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
            </div>
          ) : (
            KINDS.map((kind) => (
              <section key={kind} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-neutral-800 uppercase tracking-wide">
                    {DISPLAY_KIND_LABEL[kind]}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setCreatingKind(kind)}
                    className="flex items-center gap-1.5 text-[12px] font-bold text-brand-500 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Thêm
                  </button>
                </div>
                {grouped[kind].length === 0 ? (
                  <p className="text-xs text-neutral-400 font-medium">Chưa có màn hình loại này.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {grouped[kind].map((screen) => (
                      <AdminScreenCard
                        key={screen.display_screen_id}
                        screen={screen}
                        rooms={rooms}
                        onChanged={(updated) =>
                          setScreens((prev) =>
                            prev.map((s) =>
                              s.display_screen_id === updated.display_screen_id ? updated : s,
                            ),
                          )
                        }
                        onError={setError}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))
          )}
        </div>
      </div>

      {creatingKind && (
        <CreateScreenModal
          kind={creatingKind}
          rooms={rooms}
          onClose={() => setCreatingKind(null)}
          onCreated={(screen) => {
            setScreens((prev) => [...prev, screen]);
            setCreatingKind(null);
          }}
        />
      )}
      {pinOpen && (
        <ChangePinModal
          onClose={() => setPinOpen(false)}
          onSuccess={() => {
            setPinOpen(false);
            setNotice('Đã đổi PIN toàn hệ thống.');
          }}
        />
      )}
    </div>
  );
}

function AdminScreenCard({
  screen,
  rooms,
  onChanged,
  onError,
}: {
  screen: DisplayScreen;
  rooms: BackendRoom[];
  onChanged: (screen: DisplayScreen) => void;
  onError: (message: string | null) => void;
}) {
  const [name, setName] = useState(screen.name);
  const [saving, setSaving] = useState(false);
  const mediaEnabled = screen.settings.media_enabled !== false;
  const otpEnabled = screen.settings.enable_otp !== false;

  const save = async (payload: {
    name?: string;
    status?: 'ENABLED' | 'DISABLED';
    settings?: DisplayScreenSettings;
  }) => {
    setSaving(true);
    onError(null);
    try {
      const updated = await displayScreenService.update(screen.display_screen_id, payload);
      onChanged(updated);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Không lưu được màn hình');
    } finally {
      setSaving(false);
    }
  };

  const roomLabel =
    screen.room?.room_name ||
    rooms.find((r) => r.room_id === screen.room_id)?.room_name ||
    'Chưa gắn phòng';

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <Monitor className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm font-bold text-neutral-900 bg-transparent border-b border-transparent focus:border-neutral-200 outline-none"
          />
          <p className="text-[11px] font-semibold text-neutral-400 mt-0.5">
            {screen.code} · {roomLabel}
          </p>
        </div>
        <span
          className={`text-[10px] font-black px-2 py-1 rounded-full ${
            screen.status === 'ENABLED'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {screen.status}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving || name.trim() === screen.name}
          onClick={() => void save({ name: name.trim() })}
          className="px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Lưu tên
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            void save({ status: screen.status === 'ENABLED' ? 'DISABLED' : 'ENABLED' })
          }
          className="px-3 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer"
        >
          {screen.status === 'ENABLED' ? (
            <>
              <PowerOff className="w-3 h-3" /> Tắt
            </>
          ) : (
            <>
              <Power className="w-3 h-3" /> Bật
            </>
          )}
        </button>
        {screen.kind === 'KIOSK' && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void save({ settings: { ...screen.settings, enable_otp: !otpEnabled } })}
            className="px-3 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer"
          >
            OTP: {otpEnabled ? 'Bật' : 'Tắt'}
          </button>
        )}
        {screen.kind === 'TV_PHARMACY' && (
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void save({ settings: { ...screen.settings, media_enabled: !mediaEnabled } })
            }
            className="px-3 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer"
          >
            Truyền thông: {mediaEnabled ? 'Bật' : 'Tắt'}
          </button>
        )}
      </div>
    </div>
  );
}

function CreateScreenModal({
  kind,
  rooms,
  onClose,
  onCreated,
}: {
  kind: DisplayScreenKind;
  rooms: BackendRoom[];
  onClose: () => void;
  onCreated: (screen: DisplayScreen) => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roomOptions = rooms.filter((room) => {
    if (kind === 'TV_PHARMACY') return room.room_type === 'PHARMACY';
    if (kind === 'TV_PAYMENT') return room.room_type === 'CASHIER';
    return true;
  });

  const submit = async () => {
    if (!code.trim() || !name.trim()) {
      setError('Nhập mã và tên màn hình');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await displayScreenService.create({
        code: code.trim(),
        name: name.trim(),
        kind,
        room_id: roomId || undefined,
        settings:
          kind === 'TV_PHARMACY'
            ? { media_enabled: true, sound_enabled: true }
            : kind === 'KIOSK'
              ? { enable_otp: true, floor_number: 1, start_room_code: '', start_room_label: '' }
              : {},
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được màn hình');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={`Thêm ${DISPLAY_KIND_LABEL[kind]}`} onClose={onClose}>
      {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
      <label className="text-[11px] font-black text-neutral-500 uppercase">Mã</label>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="TV-NT-4"
        className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm font-bold"
      />
      <label className="text-[11px] font-black text-neutral-500 uppercase">Tên</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Quầy 4"
        className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm font-bold"
      />
      <label className="text-[11px] font-black text-neutral-500 uppercase">Phòng (tuỳ chọn)</label>
      <select
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm font-bold"
      >
        <option value="">— Không gắn —</option>
        {roomOptions.map((room) => (
          <option key={room.room_id} value={room.room_id}>
            {room.room_name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => void submit()}
        disabled={saving}
        className="w-full py-2.5 rounded-xl bg-[#8B7CF6] text-white text-sm font-black cursor-pointer disabled:opacity-50"
      >
        {saving ? 'Đang tạo...' : 'Tạo màn hình'}
      </button>
    </ModalShell>
  );
}

function ChangePinModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await displayScreenService.changePin(currentPin, newPin);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đổi được PIN');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Đổi PIN toàn hệ thống" onClose={onClose}>
      {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
      <label className="text-[11px] font-black text-neutral-500 uppercase">PIN hiện tại</label>
      <input
        type="password"
        value={currentPin}
        onChange={(e) => setCurrentPin(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm font-bold"
      />
      <label className="text-[11px] font-black text-neutral-500 uppercase">PIN mới (4–8 số)</label>
      <input
        type="password"
        value={newPin}
        onChange={(e) => setNewPin(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm font-bold"
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={saving}
        className="w-full py-2.5 rounded-xl bg-[#8B7CF6] text-white text-sm font-black cursor-pointer disabled:opacity-50"
      >
        {saving ? 'Đang lưu...' : 'Đổi PIN'}
      </button>
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-neutral-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-xs font-bold text-neutral-400 cursor-pointer">
            Đóng
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
