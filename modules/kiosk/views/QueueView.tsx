import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { ArrowLeft, Clock, MapPin } from 'lucide-react';

import { useFlowStore } from '../store/flowStore';
import { stripRoomName } from '../utils/flowHelpers';

export const QueueView: React.FC = () => {
  const goHome = useKioskStore((state) => state.goHome);
  const navigateToView = useKioskStore((state) => state.navigateToView);
  const navigateToMap = useKioskStore((state) => state.navigateToMap);

  // Dynamic ticket state from Flow Store
  const activeTicket = useFlowStore((state) => state.activeTicket);
  const selectedDoctor = useKioskStore((state) => state.selectedDoctor);

  const roomName = activeTicket?.roomNumber || selectedDoctor?.room || '';
  const specialtyName = activeTicket?.clinicName || selectedDoctor?.specialty || '';
  const ticketNo = activeTicket?.ticketNumber || '';
  const callingNo = activeTicket?.currentCallingNo || ticketNo;
  const waitingCount = activeTicket?.waitingCount ?? 0;
  const estimatedWait = activeTicket?.estimatedWaitMinutes ?? 5;

  return (
    <div className="w-full h-full min-h-0 p-4 sm:p-6 lg:p-8 z-10 select-none flex flex-col gap-4 sm:gap-6 max-w-5xl mx-auto overflow-y-auto">
      {/* Header bar */}
      <div className="flex items-center gap-4 shrink-0">
        <button 
          onClick={goHome} 
          className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-white hover:bg-neutral-50 active:scale-95 rounded-2xl shadow-sm border border-neutral-200 text-xs sm:text-sm font-extrabold text-neutral-800 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1E2939] tracking-tight">
          Theo dõi hàng đợi khám bệnh
        </h2>
      </div>

      <div className="space-y-6">
        {/* Top Blue Card: Hàng đợi của bạn */}
        <div className="bg-[#4F80E1] text-white rounded-[28px] p-8 shadow-xl space-y-6 relative overflow-hidden text-center">
          <div className="space-y-1">
            <h3 className="text-2xl font-black tracking-tight">Hàng đợi của bạn</h3>
            <p className="text-xs font-bold text-blue-100">{roomName} - {specialtyName}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-6 max-w-xl mx-auto">
            <div className="border-r border-white/20">
              <span className="text-[11px] font-bold text-blue-100 uppercase block mb-1">Số của bạn</span>
              <span className="text-3xl font-black">{ticketNo}</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-blue-100 uppercase block mb-1">Ước tính chờ</span>
              <span className="text-3xl font-black">{estimatedWait} <span className="text-xs font-normal">phút</span></span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-xs font-extrabold text-blue-100 max-w-md mx-auto">
            Còn <span className="text-white text-sm font-black">{waitingCount}</span> bệnh nhân trước bạn
          </div>
        </div>

        {/* Middle Row: Vị trí phòng & Trạng thái */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Card: Vị trí phòng */}
          <div className="bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#155DFC] flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-[#1E2939] text-sm">Phòng khám</h4>
                <p className="text-xs text-neutral-500 font-semibold">{roomName} {specialtyName ? `(${specialtyName})` : ''}</p>
              </div>
            </div>

            <button 
              onClick={() => navigateToMap(stripRoomName(activeTicket?.roomNumber || ''))}
              className="px-4 py-2.5 bg-[#4F80E1] text-white rounded-xl font-bold text-xs shadow-md hover:bg-blue-600 transition-colors cursor-pointer"
            >
              Xem đường đi
            </button>
          </div>

          {/* Right Card: Trạng thái */}
          <div className="bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-[#1E2939] text-sm">Trạng thái hàng đợi</h4>
                <span className="text-[10px] font-bold bg-blue-50 text-[#155DFC] px-2.5 py-0.5 rounded-full border border-blue-100">
                  Đang chờ gọi số
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                Vui lòng giữ phiếu khám và chờ tại sảnh chờ. Hệ thống loa và màn hình LED sẽ thông báo khi đến lượt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
