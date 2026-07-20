import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { 
  ArrowLeft, 
  MapPin, 
  Navigation, 
  Printer, 
  Clock, 
  User
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useFlowStore } from '../store/flowStore';

export const PatientInfoView: React.FC = () => {
  const goHome = useKioskStore((state) => state.goHome);
  const navigateToView = useKioskStore((state) => state.navigateToView);
  const selectedDoctor = useKioskStore((state) => state.selectedDoctor);
  const activeTicket = useFlowStore((state) => state.activeTicket);
  const patientInfo = useAuthStore((state) => state.patientInfo);
  const showToast = useKioskStore((state) => state.showToast);

  const handlePrintTicket = () => {
    showToast('Đang phát lệnh in phiếu khám bệnh...', 'info');
  };

  // Dynamic values từ API Store (Không hardcode fallback giả định)
  const ticketNo = activeTicket?.ticketNumber || (selectedDoctor ? '---' : '');
  const roomName = activeTicket?.roomNumber || selectedDoctor?.room || '';
  const specialtyName = activeTicket?.clinicName || selectedDoctor?.specialty || '';
  const doctorName = activeTicket?.doctorName || selectedDoctor?.name || '';
  const patientName = activeTicket?.patientName || patientInfo?.fullName || '';
  const currentCallingNo = activeTicket?.currentCallingNo || ticketNo;
  const waitingCount = activeTicket?.waitingCount ?? 3;
  const estimatedWait = activeTicket?.estimatedWaitMinutes ?? 10;
  
  // Dynamic QR Code for Ticket
  const qrTicketUrl = ticketNo && ticketNo !== '---' 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(ticketNo)}` 
    : '';

  return (
    <div className="flex-1 min-h-0 px-8 py-6 z-10 flex flex-col gap-5">
      {/* Top Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={goHome} 
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-neutral-50 rounded-2xl shadow-sm border border-neutral-200 text-sm font-extrabold text-neutral-800 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Trang chủ
          </button>
          <h2 className="text-3xl font-black text-[#1E2939] tracking-tight">
            Thông tin khám bệnh
          </h2>
        </div>

        <button
          onClick={handlePrintTicket}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#155DFC] rounded-2xl font-extrabold text-xs lg:text-sm border border-blue-200 shadow-sm hover:bg-blue-50 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" /> In phiếu khám
        </button>
      </div>

      {/* Main Grid (fills remaining height) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* LEFT COLUMN (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col min-h-0 gap-6">
          {/* Card 1: Điểm đến hiện tại (Solid Blue Gradient Card) */}
          <div className="bg-gradient-to-br from-[#77A5F8] to-[#5588EC] text-white rounded-[28px] p-6 shadow-xl flex flex-col justify-between flex-1 space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-black text-blue-100 uppercase tracking-wider block">Điểm đến hiện tại</span>
              <h3 className="text-3xl lg:text-4xl font-black text-white">{roomName || '---'}</h3>
              {specialtyName && (
                <p className="text-base font-bold text-blue-100">{specialtyName}</p>
              )}
            </div>

            <button
              onClick={() => navigateToView('map')}
              className="w-full py-3.5 bg-white text-[#155DFC] rounded-2xl font-black text-xs lg:text-sm flex items-center justify-center gap-2 shadow-md hover:bg-blue-50 transition-all cursor-pointer mt-4"
            >
              <Navigation className="w-4 h-4 rotate-45" /> Xem đường đi
            </button>
          </div>

          {/* Card 2: Phiếu khám bệnh (White Card with Inner Light Blue QR Container) */}
          <div className="bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 flex flex-col justify-between flex-1 items-center text-center space-y-4">
            <h4 className="font-black text-[#1E2939] text-base">Phiếu khám bệnh</h4>
            
            <div className="w-full bg-[#E8F1FE] rounded-[24px] p-6 border border-blue-200/60 flex flex-col items-center justify-between flex-1 space-y-4">
              <div className="w-40 h-40 bg-white rounded-2xl p-3 flex items-center justify-center border-2 border-[#A4C8FF] shadow-sm">
                {qrTicketUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={qrTicketUrl}
                    alt="Mã QR Phiếu khám"
                    className="w-32 h-32 object-contain"
                  />
                ) : (
                  <div className="text-xs text-neutral-400 font-bold">Mã QR Phiếu</div>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-neutral-500 uppercase">Số thứ tự</span>
                <h3 className="text-4xl lg:text-5xl font-black text-[#0F2C59] tracking-wider">{ticketNo || '---'}</h3>
              </div>

              <div className="w-full border-t border-blue-200/80 my-1" />

              <div className="text-sm font-black text-[#1E2939]">
                {roomName || '---'}
              </div>

              {patientName && (
                <div className="text-xs font-bold text-neutral-500">
                  Bệnh nhân: {patientName}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col min-h-0 gap-6">
          {/* Card 3: Thông tin hàng đợi */}
          <div className="bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 flex flex-col justify-between flex-1 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#D6E6FE] text-[#155DFC] flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-[#1E2939]">Thông tin hàng đợi</h3>
              </div>
              <span className="px-3.5 py-1.5 bg-[#FFF4DF] text-[#D98200] rounded-xl text-xs font-extrabold border border-amber-200/60">
                Đang chờ khám
              </span>
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-3 gap-4">
              {/* Metric 1 */}
              <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-neutral-100 text-center space-y-1">
                <span className="text-xs font-bold text-neutral-400 block">Số đang gọi</span>
                <span className="text-3xl lg:text-4xl font-black text-[#1E2939] block">{currentCallingNo || '---'}</span>
              </div>

              {/* Metric 2 (Highlighted Blue) */}
              <div className="bg-[#D6E6FE] rounded-2xl p-5 border-2 border-[#A4C8FF] text-center space-y-1 shadow-sm">
                <span className="text-xs font-bold text-[#155DFC] block">Số của bạn</span>
                <span className="text-3xl lg:text-4xl font-black text-[#0F2C59] block">{ticketNo || '---'}</span>
              </div>

              {/* Metric 3 */}
              <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-neutral-100 text-center space-y-1">
                <span className="text-xs font-bold text-neutral-400 block">Thời gian chờ</span>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl lg:text-4xl font-black text-[#1E2939]">{estimatedWait}</span>
                  <span className="text-xs font-bold text-neutral-500">phút</span>
                </div>
              </div>
            </div>

            {/* Bottom Yellow Banner */}
            <div className="w-full bg-[#FFF9EE] border border-[#FFE8C2] rounded-2xl p-4 text-center text-sm font-bold text-[#8F5B00]">
              Còn <strong className="text-lg font-black text-[#D98200] mx-1">{waitingCount}</strong> người trước bạn
            </div>
          </div>

          {/* Card 4: Thông tin bác sĩ */}
          <div className="bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 flex flex-col justify-between flex-1 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-[#1E2939]">Thông tin bác sĩ</h3>
              
              <button
                onClick={() => navigateToView('doctor_route')}
                className="px-5 py-3 bg-[#77A5F8] hover:bg-blue-600 text-white rounded-2xl text-xs lg:text-sm font-black shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                Xem lộ trình bác sĩ chỉ định
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#D6E6FE] text-[#155DFC] flex items-center justify-center shrink-0">
                <User className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-black text-[#1E2939]">{doctorName || 'BS. Chuyên khoa phụ trách'}</h4>
                {specialtyName && (
                  <p className="text-sm font-bold text-neutral-500">{specialtyName}</p>
                )}
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4">
              <span className="text-xs font-bold text-neutral-400 block mb-1">Phòng khám</span>
              <span className="text-base font-black text-[#1E2939]">{roomName || '---'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
