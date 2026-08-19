import React, { useState } from 'react';
import { X, Search, Keyboard } from 'lucide-react';
import { ApiFloor, ApiRoom } from '../../navigation/types/navigation.types';
import { useVirtualKeyboardStore } from '../store/virtualKeyboardStore';
import { removeVietnameseTones } from '../utils/kioskHelpers';

interface RoomPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  floors: ApiFloor[];
  onSelect: (room: ApiRoom & { floorNumber: number }) => void;
}

export const RoomPickerModal: React.FC<RoomPickerModalProps> = ({
  isOpen,
  onClose,
  title,
  floors,
  onSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const openKeyboard = useVirtualKeyboardStore((state) => state.openKeyboard);

  const handleOpenVirtualKeyboard = () => {
    openKeyboard({
      inputId: 'room-search',
      title: 'Tìm kiếm phòng khám trên bản đồ',
      initialValue: searchTerm,
      placeholder: 'Nhập tên phòng hoặc mã phòng...',
      onChange: (val) => setSearchTerm(val),
      onSubmit: (val) => setSearchTerm(val),
    });
  };

  if (!isOpen) return null;

  const filteredFloors = floors.map((floor) => {
    const normSearch = removeVietnameseTones(searchTerm);
    const matchedRooms = floor.rooms.filter((room) => {
      if (!normSearch) return true;
      const normLabel = removeVietnameseTones(room.roomLabel);
      const normCode = removeVietnameseTones(room.roomCode);
      return normLabel.includes(normSearch) || normCode.includes(normSearch);
    });
    return { ...floor, rooms: matchedRooms };
  }).filter((floor) => floor.rooms.length > 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input with Virtual Keyboard */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative flex items-center">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onClick={handleOpenVirtualKeyboard}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm tên phòng hoặc mã phòng..."
              className="w-full pl-11 pr-20 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
            />
            <div className="absolute right-3 flex items-center gap-1.5">
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer px-1.5 py-0.5"
                >
                  Xóa
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenVirtualKeyboard}
                className="p-1.5 rounded-xl bg-blue-50 text-[#155DFC] hover:bg-blue-100 transition-colors cursor-pointer"
                title="Mở bàn phím ảo"
              >
                <Keyboard className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* List of rooms */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {filteredFloors.length > 0 ? (
            filteredFloors.map((floor) => (
              <div key={floor.id} className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
                  Tầng {floor.floorNumber}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {floor.rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => {
                        onSelect({ ...room, floorNumber: floor.floorNumber });
                        onClose();
                      }}
                      className="text-left px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50/40 hover:border-blue-200 text-slate-700 hover:text-blue-700 font-bold transition-all text-xs truncate cursor-pointer active:scale-[0.98]"
                    >
                      {room.roomLabel}
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-slate-400 text-xs font-semibold">
              Không tìm thấy phòng nào phù hợp
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
