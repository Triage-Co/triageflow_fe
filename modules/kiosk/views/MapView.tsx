'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { useFlowStore } from '../store/flowStore';
import { FloorMap } from '@/modules/navigation/components/FloorMap';
import { useBuildingMap } from '@/modules/navigation/hooks/useWayfinding';
import { fetchRoute } from '@/modules/navigation/services/navigationService';
import { RoomPickerModal } from '../modals/RoomPickerModal';
import { useNavigationStore } from '@/modules/navigation/store/navigationStore';
import { ArrowLeft, MapPin, Search, Navigation, RotateCcw, Loader2 } from 'lucide-react';

interface RoomOption {
  id: string;
  roomCode: string;
  roomLabel: string;
  floorNumber: number;
  type?: string;
  areaId?: string | null;
}

export const MapView: React.FC = () => {
  const goHome = useKioskStore((state) => state.goHome);
  const navigateToView = useKioskStore((state) => state.navigateToView);
  const mapNavigationRoomId = useKioskStore((state) => state.mapNavigationRoomId);
  const showToast = useKioskStore((state) => state.showToast);
  const toastTriggeredRef = useRef<string | null>(null);

  // Map data and states for routing
  const { rawMap } = useBuildingMap(2);
  const [startRoom, setStartRoom] = useState<RoomOption | null>(null);
  const [targetRoom, setTargetRoom] = useState<RoomOption | null>(null);
  const [routeData, setRouteData] = useState<any>(null);
  const [modalType, setModalType] = useState<'start' | 'target' | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [activeField, setActiveField] = useState<'start' | 'target'>('target');

  const targetRoomCode = targetRoom?.roomCode || mapNavigationRoomId || null;
  const targetAreaId = targetRoom?.areaId || null;

  const KIOSK_RECEPTION_A_ID = 'ce336956-b026-4979-8094-2c7bf7a5a53a';

  // Tự động thiết lập điểm xuất phát là Sảnh Tiếp Đón A và điểm đích dựa trên phiếu khám
  useEffect(() => {
    console.log('MapView Auto-Routing Debug:', {
      mapNavigationRoomId,
      rawMap: !!rawMap
    });

    if (rawMap && rawMap.floors) {
      let foundStart: RoomOption | null = null;
      let foundTarget: RoomOption | null = null;

      // Tìm Sảnh Tiếp Đón A mặc định
      for (const floor of rawMap.floors) {
        const room = floor.rooms.find((r) => r.id === KIOSK_RECEPTION_A_ID);
        if (room) {
          foundStart = {
            id: room.id,
            roomCode: room.roomCode,
            roomLabel: room.roomLabel,
            floorNumber: floor.floorNumber,
            type: (room as any).type || '',
            areaId: room.areaId,
          };
          break;
        }
      }

      // Tìm Phòng khám đích dựa trên mapNavigationRoomId (stripped label)
      if (mapNavigationRoomId) {
        const targetLabel = mapNavigationRoomId.toLowerCase().trim();

        for (const floor of rawMap.floors) {
          const room = floor.rooms.find(
            (r) => r.roomLabel.toLowerCase().trim() === targetLabel
          );
          if (room) {
            foundTarget = {
              id: room.id,
              roomCode: room.roomCode,
              roomLabel: room.roomLabel,
              floorNumber: floor.floorNumber,
              type: (room as any).type || '',
              areaId: room.areaId,
            };
            break;
          }
        }

        if (!foundTarget && toastTriggeredRef.current !== mapNavigationRoomId) {
          showToast(`Không tìm thấy phòng khám "${mapNavigationRoomId}" trên bản đồ. Vui lòng chọn thủ công!`, 'error');
          toastTriggeredRef.current = mapNavigationRoomId;
        }
      }

      if (foundStart) {
        setStartRoom(foundStart);
      }
      if (foundTarget) {
        setTargetRoom(foundTarget);
        useNavigationStore.getState().setActiveFloor(foundTarget.floorNumber);
      } else if (foundStart) {
        useNavigationStore.getState().setActiveFloor(foundStart.floorNumber);
      }
    }
  }, [rawMap, mapNavigationRoomId, showToast]);

  // Fetch route when both start and target are selected
  useEffect(() => {
    if (startRoom && targetRoom) {
      setRouteLoading(true);
      fetchRoute({ startId: startRoom.id, startType: 'ROOM', targetId: targetRoom.id, targetType: 'ROOM' })
        .then((data) => {
          setRouteData(data);
        })
        .catch((err) => {
          console.error('Lỗi khi lấy chỉ đường:', err);
        })
        .finally(() => {
          setRouteLoading(false);
        });
    } else {
      setRouteData(null);
    }
  }, [startRoom, targetRoom]);

  const handleBack = () => {
    const previousView = useKioskStore.getState().previousView;
    if (previousView && previousView !== 'map') {
      navigateToView(previousView);
    } else {
      navigateToView('patient_info');
    }
  };

  const handleReset = () => {
    setStartRoom(null);
    setTargetRoom(null);
    setRouteData(null);
    setActiveField('start'); // Sau khi reset, ưu tiên click tiếp theo chọn điểm đi
  };

  const handleSelectRoomFromMap = (roomId: string) => {
    if (!rawMap || !rawMap.floors) return;

    let selectedRoom: RoomOption | null = null;
    for (const floor of rawMap.floors) {
      const room = floor.rooms.find((r) => r.id === roomId);
      if (room) {
        selectedRoom = {
          id: room.id,
          roomCode: room.roomCode,
          roomLabel: room.roomLabel,
          floorNumber: floor.floorNumber,
          type: (room as any).type || '',
          areaId: room.areaId,
        };
        break;
      }
    }

    if (!selectedRoom) return;

    if (!startRoom) {
      // 1. Chưa có điểm xuất phát
      setStartRoom(selectedRoom);
      setActiveField('target');
      useNavigationStore.getState().setActiveFloor(selectedRoom.floorNumber);
    } else if (!targetRoom) {
      // 2. Có điểm xuất phát nhưng chưa có điểm đến
      setTargetRoom(selectedRoom);
      useNavigationStore.getState().setActiveFloor(selectedRoom.floorNumber);
    } else {
      // 3. Đã có cả hai, ghi đè theo activeField hiện tại
      if (activeField === 'start') {
        setStartRoom(selectedRoom);
        setActiveField('target');
      } else {
        setTargetRoom(selectedRoom);
      }
      useNavigationStore.getState().setActiveFloor(selectedRoom.floorNumber);
    }
  };

  const routePath = routeData?.path || undefined;

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-50">
      {/* 3D Map Canvas full-screen */}
      <FloorMap
        highlightRoomCode={targetRoomCode}
        highlightAreaId={targetAreaId}
        startRoomId={startRoom?.id}
        targetRoomId={targetRoom?.id}
        routePath={routePath}
        onSelectRoom={handleSelectRoomFromMap}
      />

      {/* Floating Header Bar */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-4 pointer-events-auto">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-5 py-2.5 bg-white/95 backdrop-blur-md rounded-full text-xs font-bold text-slate-700 shadow-md border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" /> Quay lại
        </button>

        <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-md flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#155DFC] flex items-center justify-center font-bold">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-extrabold text-slate-800 tracking-tight">
              Sơ đồ bệnh viện 3D
            </h2>
            <p className="text-[11px] font-semibold text-slate-500">
              Tòa G2 – Khoa Khám Bệnh
            </p>
          </div>
        </div>
      </div>

      {/* Top Right Floating Action: Reset Button */}
      {(startRoom || targetRoom) && (
        <div className="absolute top-6 right-6 z-20 pointer-events-auto">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/95 backdrop-blur-md rounded-full text-xs font-extrabold text-rose-600 hover:text-rose-700 shadow-md border border-slate-200 hover:bg-rose-50/50 transition-all cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-4 h-4" /> Reset chỉ đường
          </button>
        </div>
      )}

      {/* Left Panel: Find Route Interface */}
      <div className="absolute top-24 left-6 z-20 w-80 bg-white/90 backdrop-blur-md p-5 rounded-[28px] border border-slate-200 shadow-xl flex flex-col gap-4 pointer-events-auto">
        <div>
          <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Navigation className="w-4 h-4 text-[#155DFC] rotate-45" /> Chỉ đường đi
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
            Thiết lập điểm xuất phát và đích
          </p>
        </div>

        {/* Start Point Input Button */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Điểm xuất phát
          </label>
          <button
            onClick={() => {
              setActiveField('start');
              setModalType('start');
            }}
            className={`w-full text-left px-4 py-3 rounded-2xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${activeField === 'start'
                ? 'ring-2 ring-blue-500 border-transparent bg-blue-50/20'
                : 'border-slate-200'
              } ${startRoom
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800 font-bold'
                : 'bg-slate-50/60 hover:bg-slate-100/50 text-slate-400'
              }`}
          >
            <span className="truncate">
              {startRoom ? `Tầng ${startRoom.floorNumber} - ${startRoom.roomLabel}` : 'Chọn điểm đi...'}
            </span>
            <Search className={`w-3.5 h-3.5 shrink-0 ${startRoom ? 'text-emerald-600' : 'text-slate-400'}`} />
          </button>
        </div>

        {/* Target Point Input Button */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Điểm cần đến
          </label>
          <button
            onClick={() => {
              setActiveField('target');
              setModalType('target');
            }}
            className={`w-full text-left px-4 py-3 rounded-2xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${activeField === 'target'
                ? 'ring-2 ring-blue-500 border-transparent bg-blue-50/20'
                : 'border-slate-200'
              } ${targetRoom
                ? 'bg-rose-50/50 border-rose-200 text-rose-800 font-bold'
                : 'bg-slate-50/60 hover:bg-slate-100/50 text-slate-400'
              }`}
          >
            <span className="truncate">
              {targetRoom ? `Tầng ${targetRoom.floorNumber} - ${targetRoom.roomLabel}` : 'Chọn điểm đến...'}
            </span>
            <Search className={`w-3.5 h-3.5 shrink-0 ${targetRoom ? 'text-rose-600' : 'text-slate-400'}`} />
          </button>
        </div>

        {/* Route Calculation Result */}
        {routeLoading && (
          <div className="flex items-center justify-center gap-2 py-3 bg-slate-50/50 rounded-2xl border border-slate-100">
            <Loader2 className="w-4 h-4 text-[#155DFC] animate-spin" />
            <span className="text-[11px] font-semibold text-slate-500">Đang tìm đường tối ưu...</span>
          </div>
        )}

        {routeData && !routeLoading && (
          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2">
            <p className="text-[10px] font-black text-blue-800 uppercase tracking-wider">
              Kết quả đường đi
            </p>
            <div className="text-xs">
              <span className="text-slate-400 block text-[10px] font-bold">Tổng quãng đường</span>
              <span className="font-black text-slate-800 text-sm">
                ~{Math.round(routeData.totalDistance)} mét
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Room Selection Popup Modal */}
      {rawMap && (
        <RoomPickerModal
          isOpen={modalType !== null}
          onClose={() => setModalType(null)}
          title={modalType === 'start' ? 'Chọn điểm xuất phát' : 'Chọn điểm đến'}
          floors={rawMap.floors}
          onSelect={(room) => {
            if (modalType === 'start') {
              setStartRoom(room);
              useNavigationStore.getState().setActiveFloor(room.floorNumber);
              setActiveField('target');
            } else {
              setTargetRoom(room);
              useNavigationStore.getState().setActiveFloor(room.floorNumber);
            }
          }}
        />
      )}
    </div>
  );
};
