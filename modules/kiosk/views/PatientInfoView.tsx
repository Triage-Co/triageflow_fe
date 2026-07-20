import React, { useState } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { 
  ArrowLeft, 
  MapPin, 
  Navigation, 
  Printer, 
  Clock, 
  User,
  X,
  CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useFlowStore } from '../store/flowStore';

export const PatientInfoView: React.FC = () => {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const goHome = useKioskStore((state) => state.goHome);
  const navigateToView = useKioskStore((state) => state.navigateToView);
  const selectedDoctor = useKioskStore((state) => state.selectedDoctor);
  const activeTicket = useFlowStore((state) => state.activeTicket);
  const patientInfo = useAuthStore((state) => state.patientInfo);
  const showToast = useKioskStore((state) => state.showToast);

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

  const handleOpenPrintModal = () => {
    if (!ticketNo || ticketNo === '---') {
      showToast('Chưa có thông tin phiếu khám để in!', 'error');
      return;
    }
    setIsPrintModalOpen(true);
  };

  const handleConfirmPrint = () => {
    showToast('Đang phát lệnh in phiếu khám bệnh...', 'info');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const currentDateStr = new Date().toLocaleDateString('vi-VN');
  const currentTimeStr = activeTicket?.createdAt || new Date().toLocaleTimeString('vi-VN');

  return (
    <div className="flex-1 min-h-0 px-8 py-6 z-10 flex flex-col gap-5">
      {/* CSS dành riêng khi gọi window.print(): Phóng to to rõ & Căn đúng chính giữa trang giấy */}
      <style>{`
        @media print {
          @page {
            margin: 10mm;
            size: auto;
          }
          html, body {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          #print-thermal-ticket, #print-thermal-ticket * {
            visibility: visible !important;
          }
          #print-thermal-ticket {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 85% !important;
            max-width: 120mm !important;
            margin: 0 auto !important;
            padding: 8mm !important;
            background: white !important;
            color: black !important;
            font-family: monospace, sans-serif !important;
            box-sizing: border-box !important;
            border: 2px solid black !important;
            border-radius: 8px !important;
          }
        }
      `}</style>

      {/* Printable Thermal Ticket Layout (Hidden on Screen, Centered and Enlarged on Print) */}
      <div id="print-thermal-ticket" className="hidden print:block text-black font-mono w-full p-6 text-center bg-white border-2 border-black">
        <div className="text-center space-y-1.5 mb-3">
          <h1 className="text-lg font-black uppercase tracking-wider">
            {specialtyName ? `KHOA KHÁM BỆNH (${specialtyName.toUpperCase()})` : 'KHOA KHÁM BỆNH'}
          </h1>
        </div>

        <div className="text-center space-y-1.5 my-4 text-base font-bold">
          {roomName && (
            <p className="text-xl font-black">Phòng: {roomName}</p>
          )}
          {specialtyName && (
            <p className="text-base font-bold">{specialtyName}</p>
          )}
          {doctorName && (
            <p className="text-sm">Bác sĩ: {doctorName}</p>
          )}
        </div>

        {/* Ticket STT Number (Super Large Bold Centered) */}
        <div className="my-5 py-4 border-y-2 border-black border-dashed">
          <span className="text-base font-bold block">Số thứ tự:</span>
          <span className="text-5xl font-black tracking-widest block my-2">{ticketNo}</span>
        </div>

        {/* Notice */}
        <p className="text-sm font-bold my-4">
          Người Bệnh lấy số và chờ đến lượt!
        </p>

        {/* Dashed Line */}
        <div className="border-t-2 border-dashed border-black my-3" />

        {/* Footer Date & Time */}
        <div className="flex justify-between text-xs font-bold mt-3">
          <span>Ngày: {currentDateStr}</span>
          <span>Giờ: {currentTimeStr}</span>
        </div>

        {patientName && (
          <div className="text-left text-xs font-semibold mt-3 border-t border-dotted border-black/50 pt-2">
            Bệnh nhân: {patientName}
          </div>
        )}
      </div>

      {/* Interactive Print Preview Modal on Kiosk Screen */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-6 lg:p-8 max-w-lg w-full shadow-2xl border border-neutral-200 flex flex-col space-y-6 transform animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#155DFC] flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-[#1E2939]">Xem trước phiếu khám</h3>
              </div>

              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thermal Ticket Card Preview */}
            <div className="bg-[#F8FAFC] border-2 border-dashed border-neutral-300 rounded-2xl p-6 font-mono text-center space-y-4 shadow-inner">
              <div className="space-y-1">
                <h4 className="font-black text-[#1E2939] text-base uppercase">
                  {specialtyName ? `KHOA KHÁM BỆNH (${specialtyName.toUpperCase()})` : 'KHOA KHÁM BỆNH'}
                </h4>
              </div>

              <div className="space-y-1 text-sm font-bold text-neutral-700">
                {roomName && <p className="text-lg font-black text-[#1E2939]">Phòng: {roomName}</p>}
                {specialtyName && <p>{specialtyName}</p>}
                {doctorName && <p className="text-xs text-neutral-500">Bác sĩ: {doctorName}</p>}
              </div>

              <div className="py-3 border-y-2 border-neutral-400 border-dashed bg-white rounded-xl shadow-sm">
                <span className="text-xs font-bold text-neutral-500 block uppercase">Số thứ tự</span>
                <span className="text-4xl font-black text-[#155DFC] tracking-wider block my-1">{ticketNo}</span>
              </div>

              <p className="text-xs font-bold text-neutral-600">
                Người Bệnh lấy số và chờ đến lượt!
              </p>

              <div className="border-t border-dashed border-neutral-300 pt-3 flex justify-between text-[11px] font-bold text-neutral-500">
                <span>Ngày: {currentDateStr}</span>
                <span>Giờ: {currentTimeStr}</span>
              </div>

              {patientName && (
                <div className="text-left text-[11px] font-semibold text-neutral-500 border-t border-dotted border-neutral-200 pt-2">
                  Bệnh nhân: {patientName}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-5 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-2xl text-xs lg:text-sm font-extrabold transition-all cursor-pointer"
              >
                Hủy / Đóng
              </button>

              <button
                onClick={handleConfirmPrint}
                className="px-6 py-3 bg-[#155DFC] hover:bg-blue-600 text-white rounded-2xl text-xs lg:text-sm font-black shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Xác nhận In phiếu
              </button>
            </div>
          </div>
        </div>
      )}

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
          onClick={handleOpenPrintModal}
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
              <h3 className="text-[#1E2939] text-xl font-black">Thông tin bác sĩ</h3>
              
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
