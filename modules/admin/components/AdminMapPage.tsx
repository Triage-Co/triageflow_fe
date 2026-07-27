'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Eye,
  Pencil,
  Maximize2,
  Minimize2,
  Navigation,
  Loader2,
  X,
  MapPin,
  Route,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FloorMap } from '@/modules/navigation/components/FloorMap';
import { useBuildingMap } from '@/modules/navigation/hooks/useWayfinding';
import { fetchRoute } from '@/modules/navigation/services/navigationService';
import type { RouteResult } from '@/modules/navigation/types/navigation.types';
import { ApiError } from '@/shared/services/apiClient';

type MapMode = 'watch' | 'edit';

export function AdminMapPage() {
  const [mode, setMode] = useState<MapMode>('watch');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [startRoomId, setStartRoomId] = useState<string>('');
  const [targetRoomId, setTargetRoomId] = useState<string>('');
  const [pickStep, setPickStep] = useState<'start' | 'target'>('start');
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const { rawMap } = useBuildingMap(1);

  const rooms = useMemo(() => {
    const floor =
      rawMap?.floors.find((f) => f.floorNumber === 1) || rawMap?.floors[0];
    if (!floor) return [];
    return [...floor.rooms]
      .filter((r) => r.roomCode?.trim())
      .sort((a, b) => a.roomLabel.localeCompare(b.roomLabel, 'vi'));
  }, [rawMap]);

  const buildingName = rawMap?.building?.name || 'Tòa G2 – Khoa Khám Bệnh';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  const clearRoute = useCallback(() => {
    setRouteResult(null);
    setRouteError(null);
  }, []);

  const handleSelectRoom = useCallback(
    (roomId: string) => {
      if (mode !== 'watch') return;

      clearRoute();

      if (pickStep === 'start') {
        setStartRoomId(roomId);
        if (roomId === targetRoomId) setTargetRoomId('');
        setPickStep('target');
      } else {
        if (roomId === startRoomId) return;
        setTargetRoomId(roomId);
        setPickStep('start');
      }
    },
    [mode, pickStep, startRoomId, targetRoomId, clearRoute]
  );

  const handleFindRoute = async () => {
    if (!startRoomId || !targetRoomId) {
      setRouteError('Vui lòng chọn điểm xuất phát và điểm đến.');
      return;
    }
    if (startRoomId === targetRoomId) {
      setRouteError('Điểm xuất phát và điểm đến không được trùng nhau.');
      return;
    }

    setRouteLoading(true);
    setRouteError(null);

    try {
      const result = await fetchRoute({
        startType: 'ROOM',
        startId: startRoomId,
        targetType: 'ROOM',
        targetId: targetRoomId,
      });
      setRouteResult(result);
    } catch (err) {
      setRouteResult(null);
      if (err instanceof ApiError) {
        setRouteError(
          err.message ||
            'Không tìm thấy đường đi. Đồ thị có thể chưa được sinh.'
        );
      } else {
        setRouteError(
          err instanceof Error ? err.message : 'Không thể tính đường đi.'
        );
      }
    } finally {
      setRouteLoading(false);
    }
  };

  const mapContent = (
    <FloorMap
      floorNumber={1}
      startRoomId={startRoomId || null}
      targetRoomId={targetRoomId || null}
      routePath={routeResult?.path ?? null}
      onSelectRoom={mode === 'watch' ? handleSelectRoom : undefined}
    />
  );

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      {/* Mode toggle */}
      <div className="inline-flex rounded-xl border border-[#EBEBEB] bg-[#F8F8FB] p-1">
        <button
          type="button"
          onClick={() => setMode('watch')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors cursor-pointer',
            mode === 'watch'
              ? 'bg-white text-[#2D2D2D] shadow-sm'
              : 'text-[#7B7B7B] hover:text-[#2D2D2D]'
          )}
        >
          <Eye className="w-3.5 h-3.5" />
          Watch
        </button>
        <button
          type="button"
          onClick={() => setMode('edit')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors cursor-pointer',
            mode === 'edit'
              ? 'bg-white text-[#2D2D2D] shadow-sm'
              : 'text-[#7B7B7B] hover:text-[#2D2D2D]'
          )}
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
      </div>

      <button
        type="button"
        onClick={() => setIsFullscreen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EBEBEB] bg-white text-[12px] font-bold text-[#2D2D2D] hover:bg-[#F8F8FB] transition-colors cursor-pointer"
      >
        {isFullscreen ? (
          <>
            <Minimize2 className="w-3.5 h-3.5" />
            Thoát toàn màn hình
          </>
        ) : (
          <>
            <Maximize2 className="w-3.5 h-3.5" />
            Toàn màn hình
          </>
        )}
      </button>
    </div>
  );

  const routePanel =
    mode === 'watch' ? (
      <div className="flex flex-col gap-3 p-4 rounded-2xl border border-[#EBEBEB] bg-white/95 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#155DFC] flex items-center justify-center">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[12px] font-extrabold text-[#2D2D2D]">Dẫn đường</p>
            <p className="text-[10px] font-semibold text-[#9C9C9C]">
              Chọn từ danh sách hoặc click phòng trên map
              {pickStep === 'start' ? ' (điểm đi)' : ' (điểm đến)'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600">
              Điểm đi
            </span>
            <select
              value={startRoomId}
              onChange={(e) => {
                clearRoute();
                setStartRoomId(e.target.value);
                setPickStep('target');
              }}
              className="h-9 rounded-xl border border-[#EBEBEB] bg-white px-3 text-[12px] font-semibold text-[#2D2D2D] outline-none focus:border-[#8B7CF6]"
            >
              <option value="">Chọn phòng...</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomLabel} ({r.roomCode})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#ef476f]">
              Điểm đến
            </span>
            <select
              value={targetRoomId}
              onChange={(e) => {
                clearRoute();
                setTargetRoomId(e.target.value);
                setPickStep('start');
              }}
              className="h-9 rounded-xl border border-[#EBEBEB] bg-white px-3 text-[12px] font-semibold text-[#2D2D2D] outline-none focus:border-[#8B7CF6]"
            >
              <option value="">Chọn phòng...</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id} disabled={r.id === startRoomId}>
                  {r.roomLabel} ({r.roomCode})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleFindRoute}
            disabled={routeLoading || !startRoomId || !targetRoomId}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-colors cursor-pointer',
              routeLoading || !startRoomId || !targetRoomId
                ? 'bg-[#B8B0F0] cursor-not-allowed'
                : 'bg-[#8B7CF6] hover:bg-[#7A6BE8]'
            )}
          >
            {routeLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            Tìm đường
          </button>

          {(routeResult || startRoomId || targetRoomId) && (
            <button
              type="button"
              onClick={() => {
                setStartRoomId('');
                setTargetRoomId('');
                setPickStep('start');
                clearRoute();
              }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-[#EBEBEB] text-[12px] font-bold text-[#7B7B7B] hover:bg-[#F8F8FB] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Xóa
            </button>
          )}
        </div>

        {routeResult && (
          <p className="text-[12px] font-semibold text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
            Quãng đường: {routeResult.totalDistance.toFixed(1)} m ·{' '}
            {routeResult.path.length} điểm
          </p>
        )}
        {routeError && (
          <p className="text-[12px] font-semibold text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
            {routeError}
          </p>
        )}
      </div>
    ) : (
      <div className="p-4 rounded-2xl border border-dashed border-[#D4D0F5] bg-[#F8F7FF]">
        <p className="text-[13px] font-bold text-[#2D2D2D]">Chế độ Edit</p>
        <p className="text-[12px] text-[#7B7B7B] mt-1 font-medium">
          Chế độ chỉnh sửa bản đồ sẽ được triển khai sau. Hiện tại chỉ xem và dẫn
          đường ở Watch mode.
        </p>
      </div>
    );

  const pageBody = (
    <div className="relative flex-1 min-h-0 overflow-hidden">
      {mapContent}

      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-3 pointer-events-none max-w-xl">
        <div className="pointer-events-auto flex flex-wrap items-center gap-3">
          <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-md flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#155DFC] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-extrabold text-slate-800 tracking-tight">
                Sơ đồ bệnh viện 3D
              </h2>
              <p className="text-[11px] font-semibold text-slate-500">{buildingName}</p>
            </div>
          </div>
          <div className="pointer-events-auto">{toolbar}</div>
        </div>

        <div className="pointer-events-auto">{routePanel}</div>
      </div>
    </div>
  );

  const fullscreenOverlay =
    mounted &&
    isFullscreen &&
    createPortal(
      <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col">
        {pageBody}
      </div>,
      document.body
    );

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
          <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
            <div className="px-6 pt-6 pb-3 shrink-0">
              <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                Cấu hình bản đồ
              </h1>
              <p className="text-[13px] text-[#7B7B7B] mt-1 font-medium">
                Xem sơ đồ 3D, dẫn đường giữa các phòng, và chỉnh sửa (sắp có).
              </p>
            </div>

            <div className="flex-1 min-h-0 px-6 pb-6">
              <div className="h-full rounded-2xl border border-[#EBEBEB] overflow-hidden relative">
                {!isFullscreen && pageBody}
                {isFullscreen && (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50 text-[13px] font-semibold text-[#7B7B7B]">
                    Đang xem toàn màn hình — nhấn Esc hoặc nút thoát để quay lại.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {fullscreenOverlay}
    </>
  );
}
