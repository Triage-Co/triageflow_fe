'use client';

import React, { useState, useEffect } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { useKioskConfigStore } from '../store/kioskConfigStore';
import { FloorMap } from '@/modules/navigation/components/FloorMap';
import { useBuildingMap } from '@/modules/navigation/hooks/useWayfinding';
import { RoomPickerModal } from '../modals/RoomPickerModal';
import {
  ArrowLeft,
  MapPin,
  Save,
  RotateCcw,
  Search,
  Monitor,
  CheckCircle2,
  Layers,
  Sparkles,
} from 'lucide-react';

export const KioskSettingsView: React.FC = () => {
  const goHome = useKioskStore((state) => state.goHome);
  const showToast = useKioskStore((state) => state.showToast);

  // Kiosk Config Store
  const kioskName = useKioskConfigStore((state) => state.kioskName);
  const kioskId = useKioskConfigStore((state) => state.kioskId);
  const currentStartRoomId = useKioskConfigStore((state) => state.startRoomId);
  const currentStartRoomLabel = useKioskConfigStore((state) => state.startRoomLabel);
  const currentFloorNumber = useKioskConfigStore((state) => state.floorNumber);
  const setKioskLocation = useKioskConfigStore((state) => state.setKioskLocation);

  // Local state for editing
  const [editingName, setEditingName] = useState(kioskName);
  const [selectedFloor, setSelectedFloor] = useState<number>(currentFloorNumber || 1);
  const [selectedRoom, setSelectedRoom] = useState<{
    id: string;
    roomCode: string;
    roomLabel: string;
    floorNumber: number;
  }>({
    id: currentStartRoomId,
    roomCode: useKioskConfigStore.getState().startRoomCode || '',
    roomLabel: currentStartRoomLabel,
    floorNumber: currentFloorNumber,
  });

  const [isRoomPickerOpen, setIsRoomPickerOpen] = useState(false);

  // Load building map data
  const { rawMap } = useBuildingMap(2);

  // Available floors list
  const floors = rawMap?.floors || [];

  // When room is clicked directly on 3D FloorMap
  const handleSelectRoomFrom3DMap = (roomId: string) => {
    if (!rawMap || !rawMap.floors) return;

    for (const floor of rawMap.floors) {
      const room = floor.rooms.find((r) => r.id === roomId);
      if (room) {
        setSelectedRoom({
          id: room.id,
          roomCode: room.roomCode,
          roomLabel: room.roomLabel,
          floorNumber: floor.floorNumber,
        });
        setSelectedFloor(floor.floorNumber);
        showToast(`Đã chọn: ${room.roomLabel} (Tầng ${floor.floorNumber})`, 'info');
        break;
      }
    }
  };

  const handleSaveConfig = () => {
    if (!selectedRoom.id) {
      showToast('Vui lòng chọn vị trí phòng/sảnh cho Kiosk!', 'error');
      return;
    }

    setKioskLocation(selectedRoom, editingName.trim() || kioskName);
    showToast('Lưu vị trí Kiosk thành công!', 'success');
    goHome();
  };

  return (
    <div className="relative w-full h-full min-h-0 flex-1 flex flex-col bg-slate-900 overflow-hidden select-none">
      {/* 3D Map Canvas - Three.js */}
      <FloorMap
        floorNumber={selectedFloor}
        startRoomId={selectedRoom.id}
        highlightRoomCode={selectedRoom.roomCode}
        onSelectRoom={handleSelectRoomFrom3DMap}
      />

      {/* Top Floating Header */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-3 pointer-events-auto">
        <button
          onClick={goHome}
          className="flex items-center gap-2 px-5 py-2.5 bg-white/95 backdrop-blur-md rounded-full text-xs font-bold text-slate-700 shadow-md border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" /> Quay lại Trang chủ
        </button>

        <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-md flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#155DFC] flex items-center justify-center font-bold">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-800 tracking-tight">
              Cài đặt Vị trí Kiosk trên Bản đồ 3D
            </h2>
            <p className="text-[11px] font-semibold text-slate-500">
              Chạm trực tiếp vào phòng trên 3D hoặc chọn danh sách
            </p>
          </div>
        </div>
      </div>
      {/* Left Setting Control Panel */}
      <div className="absolute top-24 left-6 z-20 w-84 bg-white/95 backdrop-blur-md p-5 rounded-[28px] border border-slate-200 shadow-xl flex flex-col gap-4 pointer-events-auto">
        {/* Panel Header */}
        <div className="border-b border-slate-100 pb-3">
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1 mb-1.5">
            <Sparkles className="w-3 h-3" /> Thiết bị: {kioskId}
          </span>
          <h3 className="text-sm font-black text-slate-800 tracking-tight">
            Cấu hình Điểm xuất phát Kiosk
          </h3>
        </div>

        {/* Kiosk Name Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Tên cây Kiosk này
          </label>
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            placeholder="VD: Kiosk Sảnh Tiếp Đón A..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>

        {/* Selected Room Display */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Vị trí đặt máy (Điểm xuất phát)</span>
          </label>

          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#155DFC] text-white flex items-center justify-center shrink-0 shadow-sm">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-800 truncate">
                  {selectedRoom.roomLabel || 'Chưa chọn phòng'}
                </p>
                <p className="text-[10px] font-bold text-blue-600">
                  {selectedRoom.roomCode ? `Mã: ${selectedRoom.roomCode} • Tầng ${selectedRoom.floorNumber}` : 'Nhấp lên bản đồ 3D để chọn'}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsRoomPickerOpen(true)}
            className="w-full mt-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 active:scale-98 rounded-xl text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-slate-500" /> Chọn từ danh sách phòng
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSaveConfig}
            className="flex-1 py-3 bg-[#155DFC] hover:bg-blue-700 active:scale-98 text-white rounded-2xl text-xs font-black shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" /> Lưu cấu hình
          </button>
        </div>
      </div>

      {/* Room Picker Modal */}
      <RoomPickerModal
        isOpen={isRoomPickerOpen}
        onClose={() => setIsRoomPickerOpen(false)}
        title="Chọn Vị Trí Đặt Kiosk"
        floors={floors}
        onSelect={(room) => {
          setSelectedRoom({
            id: room.id,
            roomCode: room.roomCode,
            roomLabel: room.roomLabel,
            floorNumber: room.floorNumber,
          });
          setSelectedFloor(room.floorNumber);
          setIsRoomPickerOpen(false);
          showToast(`Đã chọn: ${room.roomLabel}`, 'info');
        }}
      />
    </div>
  );
};
