'use client';

import {
  MousePointer2,
  Pentagon,
  Minus,
  DoorOpen,
  Trash2,
  Undo2,
  Redo2,
  Save,
  Loader2,
  Waypoints,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ClientValidationError,
  DraftRoom,
  GeometrySelection,
  GeometryTool,
} from '../hooks/useMapGeometryEditor';
import type { ApiArea } from '@/modules/navigation/types/navigation.types';

interface GeometryEditorPanelProps {
  tool: GeometryTool;
  onToolChange: (tool: GeometryTool) => void;
  selection: GeometrySelection;
  selectedRoom: DraftRoom | null;
  areas: ApiArea[];
  changeCount: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onUpdateRoomProps: (
    key: string,
    props: Partial<
      Pick<DraftRoom, 'roomCode' | 'roomLabel' | 'heightMeters' | 'areaId'>
    >,
  ) => void;
  onDeleteSelection: () => void;
  clientErrors: ClientValidationError[];
  saveError: string | null;
  drawHint: string | null;
}

const TOOLS: {
  id: GeometryTool;
  label: string;
  icon: typeof MousePointer2;
}[] = [
  { id: 'select', label: 'Chọn', icon: MousePointer2 },
  { id: 'draw-room', label: 'Vẽ phòng', icon: Pentagon },
  { id: 'draw-wall', label: 'Vẽ tường', icon: Minus },
  { id: 'place-door', label: 'Đặt cửa', icon: DoorOpen },
  { id: 'delete', label: 'Xóa', icon: Trash2 },
];

export function GeometryEditorPanel({
  tool,
  onToolChange,
  selection,
  selectedRoom,
  areas,
  changeCount,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onUpdateRoomProps,
  onDeleteSelection,
  clientErrors,
  saveError,
  drawHint,
}: GeometryEditorPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-[#EBEBEB] bg-white/95 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <Waypoints className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold text-[#2D2D2D]">
              Map editor
            </p>
            <p className="text-[9px] font-semibold text-[#9C9C9C] truncate">
              Phòng · tường · cửa
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const active = tool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onToolChange(t.id)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer',
                  active
                    ? 'bg-[#8B7CF6] border-[#8B7CF6] text-white'
                    : 'bg-white border-[#EBEBEB] text-[#2D2D2D] hover:bg-[#F8F8FB]',
                )}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-[#EBEBEB] text-[10px] font-bold disabled:opacity-40 hover:bg-[#F8F8FB] cursor-pointer"
          >
            <Undo2 className="w-3 h-3" />
            Undo
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-[#EBEBEB] text-[10px] font-bold disabled:opacity-40 hover:bg-[#F8F8FB] cursor-pointer"
          >
            <Redo2 className="w-3 h-3" />
            Redo
          </button>
        </div>

        {changeCount > 0 && (
          <p className="text-[9px] font-semibold text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
            {changeCount} thay đổi chưa lưu
          </p>
        )}

        {drawHint && (
          <p className="text-[9px] font-semibold text-indigo-700 bg-indigo-50 rounded-lg px-2 py-1.5">
            {drawHint}
          </p>
        )}
      </div>

      {selectedRoom && (
        <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-[#EBEBEB] bg-white/95 backdrop-blur-md shadow-sm">
          <p className="text-[11px] font-extrabold text-[#2D2D2D]">
            Thuộc tính phòng
          </p>
          <label className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#9C9C9C]">
              Mã phòng
            </span>
            <input
              value={selectedRoom.roomCode}
              onChange={(e) =>
                onUpdateRoomProps(selectedRoom.key, {
                  roomCode: e.target.value,
                })
              }
              className="h-8 rounded-lg border border-[#EBEBEB] px-2 text-[11px] font-semibold outline-none focus:border-[#8B7CF6]"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#9C9C9C]">
              Tên
            </span>
            <input
              value={selectedRoom.roomLabel}
              onChange={(e) =>
                onUpdateRoomProps(selectedRoom.key, {
                  roomLabel: e.target.value,
                })
              }
              className="h-8 rounded-lg border border-[#EBEBEB] px-2 text-[11px] font-semibold outline-none focus:border-[#8B7CF6]"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#9C9C9C]">
              Chiều cao (m)
            </span>
            <input
              type="number"
              step="0.1"
              min={0.5}
              max={20}
              value={selectedRoom.heightMeters ?? ''}
              onChange={(e) =>
                onUpdateRoomProps(selectedRoom.key, {
                  heightMeters: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
              className="h-8 rounded-lg border border-[#EBEBEB] px-2 text-[11px] font-semibold outline-none focus:border-[#8B7CF6]"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#9C9C9C]">
              Khu vực
            </span>
            <select
              value={selectedRoom.areaId ?? ''}
              onChange={(e) =>
                onUpdateRoomProps(selectedRoom.key, {
                  areaId: e.target.value || null,
                })
              }
              className="h-8 rounded-lg border border-[#EBEBEB] px-2 text-[11px] font-semibold outline-none focus:border-[#8B7CF6]"
            >
              <option value="">— Không —</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.areaLabel} ({a.areaCode})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={onDeleteSelection}
            className="flex items-center justify-center gap-1 w-full px-2.5 py-1.5 rounded-lg bg-rose-500 text-white text-[11px] font-bold cursor-pointer hover:bg-rose-600"
          >
            <Trash2 className="w-3 h-3" />
            Xóa phòng
          </button>
        </div>
      )}

      {selection &&
        (selection.kind === 'wall' || selection.kind === 'door') &&
        !selectedRoom && (
          <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-[#EBEBEB] bg-white/95 backdrop-blur-md shadow-sm">
            <p className="text-[11px] font-extrabold text-[#2D2D2D]">
              {selection.kind === 'door' ? 'Cửa đã chọn' : 'Tường đã chọn'}
            </p>
            <button
              type="button"
              onClick={onDeleteSelection}
              className="flex items-center justify-center gap-1 w-full px-2.5 py-1.5 rounded-lg bg-rose-500 text-white text-[11px] font-bold cursor-pointer hover:bg-rose-600"
            >
              <Trash2 className="w-3 h-3" />
              Xóa
            </button>
          </div>
        )}

      {clientErrors.length > 0 && (
        <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 space-y-1 max-h-32 overflow-y-auto">
          <p className="flex items-center gap-1 text-[10px] font-bold text-rose-700">
            <AlertTriangle className="w-3 h-3" />
            Lỗi validation ({clientErrors.length})
          </p>
          {clientErrors.slice(0, 6).map((err, i) => (
            <p key={`${err.key}-${i}`} className="text-[9px] text-rose-600">
              {err.message}
            </p>
          ))}
        </div>
      )}

      {saveError && (
        <p className="text-[10px] font-semibold text-rose-600 bg-rose-50 rounded-lg px-2 py-1.5">
          {saveError}
        </p>
      )}
    </div>
  );
}

export function GeometrySaveFab({
  disabled,
  saving,
  onSave,
  showGenerate,
  generating,
  onGenerate,
}: {
  disabled: boolean;
  saving: boolean;
  onSave: () => void;
  showGenerate: boolean;
  generating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="absolute bottom-4 right-4 z-30 pointer-events-auto flex flex-col gap-2 items-end">
      {showGenerate && (
        <button
          type="button"
          disabled={generating}
          onClick={onGenerate}
          className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-2xl text-[13px] font-bold shadow-lg transition-colors',
            generating
              ? 'bg-[#C8C2F0] text-white cursor-not-allowed'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer',
          )}
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Waypoints className="w-4 h-4" />
          )}
          Tạo graph
        </button>
      )}
      <button
        type="button"
        disabled={disabled || saving}
        onClick={onSave}
        className={cn(
          'flex items-center gap-2 px-4 py-3 rounded-2xl text-[13px] font-bold shadow-lg transition-colors',
          disabled || saving
            ? 'bg-[#C8C2F0] text-white cursor-not-allowed'
            : 'bg-[#8B7CF6] text-white hover:bg-[#7A6BE8] cursor-pointer',
        )}
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        Lưu
      </button>
    </div>
  );
}
