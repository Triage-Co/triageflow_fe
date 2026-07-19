import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { ArrowLeft, Clock, MapPin, Navigation, QrCode, Printer, Users } from 'lucide-react';

export const PatientInfoView: React.FC = () => {
  const goHome = useKioskStore((state) => state.goHome);
  const navigateToView = useKioskStore((state) => state.navigateToView);

  // Dynamic ticket state from Kiosk Store
  const activeTicket = useKioskStore((state) => state.activeTicket);
  const selectedDoctor = useKioskStore((state) => state.selectedDoctor);
  const patientInfo = useKioskStore((state) => state.patientInfo);
  const showToast = useKioskStore((state) => state.showToast);

  const handlePrintTicket = () => {
    showToast('Đang phát lệnh in phiếu khám bệnh...', 'info');
  };

  // Dynamic values
  const ticketNo = activeTicket?.ticketNumber || 'A01';
  const roomName = activeTicket?.roomNumber || selectedDoctor?.room || 'Phòng khám';
  const specialtyName = activeTicket?.clinicName || selectedDoctor?.specialty || 'Chuyên khoa';
  const locationName = activeTicket?.location || selectedDoctor?.location || 'Tầng 2 - Khu B';
  const doctorName = activeTicket?.doctorName || selectedDoctor?.name || 'BS. Chuyên khoa phụ trách';
  const patientName = activeTicket?.patientName || patientInfo?.fullName || 'Bệnh nhân Khám Kiosk';
  
  // Dynamic QR Code for Ticket
  const qrTicketUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticketNo)}`;

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-6 z-10 space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={goHome} 
            className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full text-xs font-bold text-neutral-700 shadow-sm border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Trang chủ
          </button>
          <h2 className="text-2xl font-black text-[#1E2939] tracking-tight">
            Thông tin phiếu khám
          </h2>
        </div>

        {/* 2 Main Action Buttons inside Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrintTicket}
            className="flex items-center gap-2 px-4 py-2 bg-white text-[#155DFC] rounded-2xl font-extrabold text-xs border border-blue-200 shadow-sm hover:bg-blue-50 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> In phiếu khám
          </button>
          <button
            onClick={() => navigateToView('queue')}
            className="flex items-center gap-2 px-4 py-2 bg-[#155DFC] text-white rounded-2xl font-extrabold text-xs shadow-md hover:bg-blue-700 transition-all cursor-pointer"
          >
            <Users className="w-4 h-4" /> Xem hàng đợi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Top-left Blue Card: Điểm đến phòng khám */}
          <div className="bg-[#4F80E1] text-white rounded-[28px] p-6 shadow-xl space-y-4 relative overflow-hidden">
            <div className="space-y-1">
              <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">Điểm đến phòng khám</span>
              <h3 className="text-3xl font-black">{roomName}</h3>
              <p className="text-sm font-semibold text-blue-100">{specialtyName}</p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-blue-100">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{locationName}</span>
            </div>

            <button
              onClick={() => navigateToView('map')}
              className="w-full py-3 bg-white text-[#155DFC] rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:bg-blue-50 transition-all cursor-pointer"
            >
              <Navigation className="w-4 h-4 rotate-45" /> Xem đường đi trên sơ đồ
            </button>
          </div>

          {/* Bottom-left White Card: Thẻ Số Thứ Tự */}
          <div className="bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 flex flex-col items-center text-center space-y-4">
            <h4 className="font-extrabold text-[#1E2939] text-sm">Phiếu khám bệnh của bạn</h4>
            <div className="w-full bg-[#E8F0FE]/60 rounded-2xl p-6 border border-blue-100/60 flex flex-col items-center space-y-3">
              <div className="w-32 h-32 bg-white rounded-xl p-2 flex items-center justify-center border border-blue-200 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrTicketUrl}
                  alt="Mã QR Phiếu khám"
                  className="w-24 h-24 object-contain"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Số thứ tự (STT)</span>
                <h3 className="text-4xl font-black text-[#155DFC] tracking-wider">{ticketNo}</h3>
              </div>
              <div className="text-xs font-bold text-neutral-600">
                {roomName} • {locationName}
              </div>
              <div className="text-[11px] font-bold text-neutral-400">
                Bệnh nhân: {patientName}
              </div>
            </div>

            {/* 2 Action Buttons */}
            <div className="w-full grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={handlePrintTicket}
                className="py-2.5 px-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl font-bold text-xs text-neutral-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#155DFC]" /> In phiếu khám
              </button>
              <button
                onClick={() => navigateToView('queue')}
                className="py-2.5 px-3 bg-[#155DFC] hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Clock className="w-4 h-4" /> Tra cứu hàng đợi
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Top-right Card: Thông tin hàng đợi */}
          <div className="bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-extrabold text-[#1E2939]">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-[#155DFC] flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <span>Trạng thái hàng đợi hiện tại</span>
              </div>
              <button 
                onClick={() => navigateToView('queue')}
                className="text-xs font-bold text-[#155DFC] bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full border border-blue-200 transition-colors cursor-pointer"
              >
                Xem chi tiết hàng đợi →
              </button>
            </div>

            {/* 3 Stat Columns */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-100">
                <span className="text-[11px] font-semibold text-neutral-400 block mb-1">Số đang gọi</span>
                <span className="text-2xl font-black text-[#1E2939]">{activeTicket?.currentCallingNo || 'A01'}</span>
              </div>
              <div className="bg-blue-50 p-3.5 rounded-2xl border border-[#155DFC]/30 shadow-sm">
                <span className="text-[11px] font-semibold text-[#155DFC] block mb-1">Số của bạn</span>
                <span className="text-2xl font-black text-[#155DFC]">{ticketNo}</span>
              </div>
              <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-100">
                <span className="text-[11px] font-semibold text-neutral-400 block mb-1">Dự kiến chờ</span>
                <span className="text-xl font-black text-[#1E2939]">{activeTicket?.estimatedWaitMinutes || 10} <span className="text-xs font-normal">phút</span></span>
              </div>
            </div>

            {/* Status notification bar */}
            <div className="bg-amber-50/80 border border-amber-200/80 text-amber-900 rounded-2xl p-3 text-center text-xs font-bold">
              Còn <span className="text-amber-700 font-extrabold text-sm">{activeTicket?.waitingCount || 3}</span> bệnh nhân trước bạn
            </div>
          </div>

          {/* Bottom-right Card: Thông tin bác sĩ phụ trách */}
          <div className="bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-[#1E2939] text-base">Thông tin Bác sĩ phụ trách</h4>
              <button
                onClick={() => navigateToView('doctor_route')}
                className="px-4 py-2 bg-[#4F80E1] text-white rounded-xl font-bold text-xs shadow-md hover:bg-blue-600 transition-all cursor-pointer"
              >
                Xem lộ trình khám chi tiết
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 text-[#155DFC] flex items-center justify-center text-2xl font-bold">
                👨‍⚕️
              </div>
              <div>
                <h4 className="font-black text-[#1E2939] text-base">{doctorName}</h4>
                <p className="text-xs text-neutral-500 font-bold">{specialtyName}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-neutral-100 pt-4 text-xs font-semibold text-neutral-600">
              <div>
                <span className="text-neutral-400 block mb-1">Phòng khám</span>
                <span className="font-bold text-[#1E2939] text-sm">{roomName}</span>
              </div>
              <div>
                <span className="text-neutral-400 block mb-1">Vị trí phòng khám</span>
                <span className="font-bold text-[#1E2939] text-sm">{locationName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
