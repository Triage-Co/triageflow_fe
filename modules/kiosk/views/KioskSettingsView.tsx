'use client';

import React, { useState } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { useKioskConfigStore } from '../store/kioskConfigStore';
import { displayScreenService } from '@/modules/display/services/displayScreenService';
import { DisplaySiblingManager } from '@/modules/display/components/DisplaySiblingManager';
import { FloorMap } from '@/modules/navigation/components/FloorMap';
import { useBuildingMap } from '@/modules/navigation/hooks/useWayfinding';
import { RoomPickerModal } from '../modals/RoomPickerModal';
import {
  ArrowLeft,
  MapPin,
  Save,
  Search,
  Monitor,
  Sparkles,
  Settings,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const KioskSettingsView: React.FC = () => {
  const goHome = useKioskStore((state) => state.goHome);
  const showToast = useKioskStore((state) => state.showToast);

  // Active Admin Sub-view: 'menu' | 'basic' | 'location'
  const [adminTab, setAdminTab] = useState<'menu' | 'basic' | 'location'>('menu');
  const [siblingOpen, setSiblingOpen] = useState(false);

  // Kiosk Config Store
  const kioskName = useKioskConfigStore((state) => state.kioskName);
  const kioskId = useKioskConfigStore((state) => state.kioskId);
  const displayScreenId = useKioskConfigStore((state) => state.display_screen_id);
  const currentStartRoomId = useKioskConfigStore((state) => state.startRoomId);
  const currentStartRoomLabel = useKioskConfigStore((state) => state.startRoomLabel);
  const currentFloorNumber = useKioskConfigStore((state) => state.floorNumber);
  const enableOtp = useKioskConfigStore((state) => state.enableOtp);

  const setKioskLocation = useKioskConfigStore((state) => state.setKioskLocation);
  const setKioskName = useKioskConfigStore((state) => state.setKioskName);
  const setEnableOtp = useKioskConfigStore((state) => state.setEnableOtp);
  const hydrateFromScreen = useKioskConfigStore((state) => state.hydrateFromScreen);

  // Local state for Basic Settings
  const [localEnableOtp, setLocalEnableOtp] = useState<boolean>(enableOtp);
  const [editingName, setEditingName] = useState(kioskName);

  // Local state for Location Setup
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

  // Save Basic Settings
  const handleSaveBasicSettings = async () => {
    if (!editingName.trim()) {
      showToast('Tên Kiosk không được để trống!', 'error');
      return;
    }
    if (!displayScreenId) {
      showToast('Chưa gắn màn hình kiosk. Mở lại từ danh sách kiosk.', 'error');
      return;
    }

    try {
      const updated = await displayScreenService.update(displayScreenId, {
        name: editingName.trim(),
        settings: { enable_otp: localEnableOtp },
      });
      setKioskName(editingName.trim());
      setEnableOtp(localEnableOtp);
      hydrateFromScreen(updated);
      showToast('Lưu Cài đặt cơ bản thành công!', 'success');
      setAdminTab('menu');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không lưu được cài đặt', 'error');
    }
  };

  const handleSaveLocationConfig = async () => {
    if (!selectedRoom.id) {
      showToast('Vui lòng chọn vị trí phòng/sảnh cho Kiosk!', 'error');
      return;
    }
    if (!displayScreenId) {
      showToast('Chưa gắn màn hình kiosk. Mở lại từ danh sách kiosk.', 'error');
      return;
    }

    try {
      let updated;
      try {
        updated = await displayScreenService.update(displayScreenId, {
          room_id: selectedRoom.id,
          settings: {
            floor_number: selectedRoom.floorNumber,
            start_room_code: selectedRoom.roomCode,
            start_room_label: selectedRoom.roomLabel,
            start_room_id: selectedRoom.id,
          },
        });
      } catch {
        updated = await displayScreenService.update(displayScreenId, {
          settings: {
            floor_number: selectedRoom.floorNumber,
            start_room_code: selectedRoom.roomCode,
            start_room_label: selectedRoom.roomLabel,
            start_room_id: selectedRoom.id,
          },
        });
      }
      setKioskLocation(selectedRoom, kioskName);
      hydrateFromScreen(updated);
      showToast('Lưu vị trí Kiosk thành công!', 'success');
      setAdminTab('menu');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không lưu được vị trí', 'error');
    }
  };

  // ==========================================
  // VIEW 1: MENU CHÍNH (2 MỤC LỰA CHỌN)
  // ==========================================
  if (adminTab === 'menu') {
    return (
      <div className="w-full h-full min-h-0 p-4 sm:p-6 lg:p-8 z-10 select-none flex flex-col justify-between max-w-5xl mx-auto gap-6 animate-in fade-in duration-200">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={goHome}
              className="flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-white hover:bg-neutral-50 active:scale-95 rounded-2xl text-xs sm:text-sm font-bold text-neutral-800 shadow-sm border border-neutral-100 transition-all cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-neutral-600" /> Thoát Quản Trị
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-[#155DFC] border border-blue-100">
                  {kioskId}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-[#1E2939] tracking-tight">
                  Trung tâm Cài đặt Kiosk
                </h2>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-neutral-500 mt-0.5">
                Chọn mục cài đặt bên dưới để quản trị thiết bị Kiosk này
              </p>
            </div>
          </div>
        </div>

        {/* 2 Main Setting Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 items-center max-w-4xl mx-auto w-full">
          {/* Card 1: Cài đặt cơ bản */}
          <button
            onClick={() => {
              setLocalEnableOtp(enableOtp);
              setEditingName(kioskName);
              setAdminTab('basic');
            }}
            className="group relative bg-white hover:bg-gradient-to-br hover:from-white hover:to-blue-50/40 rounded-[32px] p-7 sm:p-8 border border-neutral-100/90 hover:border-blue-300 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between text-left cursor-pointer active:scale-[0.98] min-h-[260px]"
          >
            <div className="space-y-4 w-full">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#155DFC] flex items-center justify-center font-bold shadow-2xs group-hover:scale-110 transition-transform">
                  <Settings className="w-7 h-7" />
                </div>
                <div className="w-10 h-10 rounded-2xl bg-neutral-50 group-hover:bg-[#155DFC] group-hover:text-white flex items-center justify-center transition-all text-neutral-600 shadow-2xs">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black text-[#1E2939] group-hover:text-[#155DFC] transition-colors">
                  Cài đặt cơ bản
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 font-medium leading-relaxed mt-1">
                  Bật/tắt tính năng xác thực OTP và đổi tên Kiosk. PIN toàn hệ thống đổi ở trang Admin.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-neutral-100 w-full mt-4">
              <span className={cn(
                "text-[11px] font-extrabold px-3 py-1 rounded-full border",
                enableOtp
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              )}>
                OTP: {enableOtp ? 'Đang Bật' : 'Đang Tắt'}
              </span>
              <span className="text-[11px] font-bold text-neutral-400">
                • {kioskName}
              </span>
            </div>
          </button>

          {/* Card 2: Thiết lập Vị trí Kiosk */}
          <button
            onClick={() => setAdminTab('location')}
            className="group relative bg-white hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 rounded-[32px] p-7 sm:p-8 border border-neutral-100/90 hover:border-indigo-300 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between text-left cursor-pointer active:scale-[0.98] min-h-[260px]"
          >
            <div className="space-y-4 w-full">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-2xs group-hover:scale-110 transition-transform">
                  <MapPin className="w-7 h-7" />
                </div>
                <div className="w-10 h-10 rounded-2xl bg-neutral-50 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all text-neutral-600 shadow-2xs">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black text-[#1E2939] group-hover:text-indigo-600 transition-colors">
                  Thiết Lập Vị trí Kiosk
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 font-medium leading-relaxed mt-1">
                  Định vị vị trí đặt cây Kiosk này trên Bản đồ 3D để tính toán đường đi chính xác cho bệnh nhân.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-neutral-100 w-full mt-4">
              <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {currentStartRoomLabel || 'Chưa thiết lập'} (Tầng {currentFloorNumber})
              </span>
            </div>
          </button>
        </div>

        {/* Footer Info */}
        <div className="text-center text-xs font-semibold text-neutral-400 pb-2 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setSiblingOpen(true)}
            className="px-4 py-2 rounded-xl bg-white border border-neutral-200 text-xs font-bold text-neutral-700 cursor-pointer"
          >
            Quản lý các kiosk khác
          </button>
          Hệ thống Quản trị Kiosk TriageFlow • Thiết bị: {kioskId}
        </div>
        {siblingOpen && (
          <DisplaySiblingManager
            kind="KIOSK"
            currentScreenId={displayScreenId ?? undefined}
            onClose={() => setSiblingOpen(false)}
            onUpdated={(screen) => {
              if (screen.display_screen_id === displayScreenId) hydrateFromScreen(screen);
            }}
          />
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: CÀI ĐẶT CƠ BẢN (BẬT / TẮT OTP)
  // ==========================================
  if (adminTab === 'basic') {
    return (
      <div className="w-full h-full min-h-0 p-4 sm:p-6 lg:p-8 z-10 select-none flex flex-col justify-between max-w-4xl mx-auto gap-6 animate-in fade-in duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setAdminTab('menu')}
              className="flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-white hover:bg-neutral-50 active:scale-95 rounded-2xl text-xs sm:text-sm font-bold text-neutral-800 shadow-sm border border-neutral-100 transition-all cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-neutral-600" /> Quay lại Menu
            </button>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#1E2939] tracking-tight">
                Cài đặt cơ bản Kiosk
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-neutral-500 mt-0.5">
                Cấu hình xác thực OTP và thông tin thiết bị
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveBasicSettings}
            className="flex items-center gap-2 px-7 py-3 bg-[#155DFC] hover:bg-[#2563EB] active:scale-95 text-white rounded-full text-xs sm:text-sm font-extrabold shadow-sm shadow-blue-500/25 transition-all cursor-pointer shrink-0"
          >
            <Save className="w-4 h-4" /> Lưu cài đặt
          </button>
        </div>

        {/* Setting Form Container */}
        <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-neutral-100/90 shadow-sm space-y-6 flex-1 overflow-y-auto no-scrollbar">
          {/* Item 1: BẬT / TẮT OTP (Mục quan trọng nhất) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-neutral-50/80 border border-neutral-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-[#155DFC] rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h4 className="text-base font-extrabold text-[#1E2939]">
                  Xác thực mã OTP khi Đăng ký bằng CCCD
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 font-medium leading-relaxed">
                {localEnableOtp ? (
                  <span className="text-emerald-700 font-bold">
                    ✓ ĐANG BẬT: Bệnh nhân quét/nhập CCCD sẽ nhận mã OTP qua SMS và cần xác thực 2 bước để đăng nhập.
                  </span>
                ) : (
                  <span className="text-amber-700 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>ĐANG TẮT: Bệnh nhân quét/nhập CCCD sẽ đăng nhập thẳng trực tiếp vào hệ thống (bỏ qua bước nhập OTP).</span>
                  </span>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setLocalEnableOtp(!localEnableOtp)}
              className={cn(
                "relative inline-flex h-10 w-20 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner",
                localEnableOtp ? "bg-[#155DFC]" : "bg-neutral-300"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-9 w-9 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                  localEnableOtp ? "translate-x-10" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Item 2: Tên cây Kiosk */}
          <div className="space-y-2">
            <label className="text-xs font-black text-neutral-600 uppercase tracking-wider">
              Tên cây Kiosk
            </label>
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              placeholder="VD: Kiosk Sảnh Tiếp Đón A"
              className="w-full px-4 py-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-sm font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: THIẾT LẬP VỊ TRÍ KIOSK (BẢN ĐỒ 3D)
  // ==========================================
  return (
    <div className="relative w-full h-full min-h-0 flex-1 flex flex-col bg-slate-900 overflow-hidden select-none animate-in fade-in duration-200">
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
          onClick={() => setAdminTab('menu')}
          className="flex items-center gap-2 px-5 py-2.5 bg-white/95 backdrop-blur-md rounded-full text-xs font-bold text-slate-700 shadow-md border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" /> Quay lại Menu Cài đặt
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

        {/* Selected Room Status */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Phòng / Sảnh đặt Kiosk
          </label>
          <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-blue-900">
                {selectedRoom.roomLabel || 'Chưa chọn'}
              </p>
              <p className="text-[10px] font-semibold text-blue-600">
                Mã: {selectedRoom.roomCode || 'N/A'} • Tầng {selectedRoom.floorNumber}
              </p>
            </div>
            <button
              onClick={() => setIsRoomPickerOpen(true)}
              className="p-2 bg-white rounded-xl text-blue-600 hover:bg-blue-100 transition-colors shadow-xs cursor-pointer"
              title="Chọn từ danh sách"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Floor Selection Buttons */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Chọn tầng hiển thị
          </label>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {floors.map((floor) => (
              <button
                key={floor.floorNumber}
                onClick={() => setSelectedFloor(floor.floorNumber)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  selectedFloor === floor.floorNumber
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                Tầng {floor.floorNumber}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-slate-100 flex gap-2">
          <button
            onClick={handleSaveLocationConfig}
            className="flex-1 py-3 bg-[#155DFC] hover:bg-blue-700 active:scale-95 text-white rounded-xl font-black text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> Lưu vị trí Kiosk
          </button>
        </div>
      </div>

      {/* Room Picker Modal */}
      <RoomPickerModal
        isOpen={isRoomPickerOpen}
        onClose={() => setIsRoomPickerOpen(false)}
        title="Chọn phòng / sảnh đặt Kiosk"
        floors={floors}
        onSelect={(room) => {
          setSelectedRoom({
            id: room.id,
            roomCode: room.roomCode,
            roomLabel: room.roomLabel,
            floorNumber: room.floorNumber,
          });
          setSelectedFloor(room.floorNumber);
          showToast(`Đã chọn: ${room.roomLabel}`, 'info');
        }}
      />
    </div>
  );
};
