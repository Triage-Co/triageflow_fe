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
  FileText,
  Map
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useFlowStore } from '../store/flowStore';
import { stripRoomName, QUEUE_TYPE_MAP } from '../utils/flowHelpers';
import { cn } from '@/lib/utils';

export const PatientInfoView: React.FC = () => {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const goHome = useKioskStore((state) => state.goHome);
  const navigateToView = useKioskStore((state) => state.navigateToView);
  const navigateToMap = useKioskStore((state) => state.navigateToMap);
  const selectedDoctor = useKioskStore((state) => state.selectedDoctor);
  const activeTicket = useFlowStore((state) => state.activeTicket);
  const patientInfo = useAuthStore((state) => state.patientInfo);
  const patientId = useAuthStore((state) => state.patientId);
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
  const startTime = activeTicket?.startTime || '';

  const isPaymentStep = activeTicket?.stepName?.toLowerCase().trim().startsWith('thanh toán') || false;

  // Dynamic QR Code for Ticket - Gen từ activeTicket?.ticketCode (nếu có), fallback ticketNo
  const ticketCode = activeTicket?.ticketCode || '';
  const queueType = activeTicket?.queueType || '';
  const queueTypeLabel = QUEUE_TYPE_MAP[queueType] || (activeTicket ? QUEUE_TYPE_MAP.NEW : '');
  const qrTicketUrl = ticketCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(ticketCode)}`
    : (ticketNo && ticketNo !== '---'
      ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(ticketNo)}`
      : '');

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

        <div className="text-left text-xs space-y-1 my-3 font-bold">
          <p>Thời gian chờ ước tính: {estimatedWait} phút</p>
          {startTime && <p>Giờ khám dự kiến: {startTime}</p>}
        </div>

        {/* Notice */}
        <p className="text-xs font-bold my-3 text-center">
          Vui lòng giữ phiếu khám và chờ đến lượt!
        </p>

        {/* Dashed Line */}
        <div className="border-t-2 border-dashed border-black my-3" />

        {/* Footer Date & Time */}
        <div className="flex justify-between text-xs font-bold mt-3">
          <span>Ngày: {currentDateStr}</span>
          <span>Giờ: {currentTimeStr}</span>
        </div>
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

              {patientName && (
                <div className="text-left text-xs font-bold text-neutral-700 border-b border-neutral-200 pb-1.5 space-y-0.5">
                  <p>Bệnh nhân: {patientName}</p>
                  <p className="text-[11px] text-neutral-500">Mã bệnh nhân: {patientInfo?.idNumber || patientId || '---'}</p>
                </div>
              )}

              <div className="space-y-1 text-sm font-bold text-neutral-700">
                {roomName && roomName !== '---' && <p className="text-lg font-black text-[#1E2939]">Phòng: {roomName}</p>}
                {specialtyName && <p>{specialtyName}</p>}
                {doctorName && <p className="text-xs text-neutral-500">Bác sĩ: {doctorName}</p>}
              </div>

              <div className="py-3 border-y-2 border-neutral-400 border-dashed bg-white rounded-xl shadow-sm">
                <span className="text-xs font-bold text-neutral-500 block uppercase">Số thứ tự</span>
                <span className="text-4xl font-black text-[#155DFC] tracking-wider block my-1">{ticketNo}</span>
              </div>

              <div className="text-left text-xs space-y-1 font-bold text-neutral-600">
                <p>Thời gian chờ ước tính: {estimatedWait} phút</p>
                {startTime && <p>Giờ khám dự kiến: {startTime}</p>}
              </div>

              <p className="text-xs font-bold text-neutral-500">
                Vui lòng giữ phiếu khám và chờ đến lượt!
              </p>

              <div className="border-t border-dashed border-neutral-300 pt-3 flex justify-between text-[11px] font-bold text-neutral-500">
                <span>Ngày: {currentDateStr}</span>
                <span>Giờ: {currentTimeStr}</span>
              </div>
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

      {/* ── Top Header bar ── */}
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

      {/* ── Empty State ── */}
      {!activeTicket && !selectedDoctor ? (
        <div className="flex-1 flex flex-col items-center justify-center p-14 bg-white/90 backdrop-blur-xl rounded-[36px] border border-neutral-100 shadow-2xl space-y-6 text-center max-w-2xl mx-auto w-full my-auto">
          <div className="w-24 h-24 rounded-3xl bg-blue-50 text-[#155DFC] flex items-center justify-center shadow-inner">
            <FileText className="w-12 h-12" strokeWidth={2.2} />
          </div>

          <div className="space-y-2 max-w-lg">
            <h3 className="text-2xl sm:text-3xl font-black text-[#1E2939] tracking-tight">
              Bạn chưa có phiếu khám hôm nay
            </h3>
            <p className="text-sm sm:text-base text-neutral-500 font-bold leading-relaxed">
              Hệ thống không tìm thấy lượt khám nào đang diễn ra của bạn. Vui lòng đăng ký khám bệnh mới để nhận phiếu khám.
            </p>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              onClick={goHome}
              className="px-8 py-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-2xl font-extrabold text-base transition-all cursor-pointer"
            >
              Về trang chủ Kiosk
            </button>
            <button
              onClick={() => navigateToView('register')}
              className="px-8 py-4 bg-[#155DFC] hover:bg-blue-700 active:scale-95 text-white rounded-2xl font-black text-base shadow-xl shadow-blue-500/25 transition-all cursor-pointer"
            >
              Đăng ký khám ngay →
            </button>
          </div>
        </div>
      ) : (
        /* ── Main 2-Column Layout ── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">

          {/* ════════════════════════════════
              LEFT COLUMN — Phiếu khám bệnh
              ════════════════════════════════ */}
          <div className="flex flex-col min-h-0">
            {/* Ticket card */}
            <div className="bg-white rounded-[28px] shadow-lg border border-neutral-100 flex flex-col flex-1 overflow-hidden">
              {/* Card header */}
              <div className="bg-gradient-to-r from-[#155DFC] to-[#4F80E1] px-6 py-4">
                <h3 className="text-white font-black text-lg tracking-wide text-center uppercase">
                  Phiếu khám bệnh
                </h3>
              </div>

              {/* Card body */}
              <div className="flex flex-col flex-1 p-6 gap-5">
                {/* QR + ticket code */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-40 h-40 bg-[#EEF4FF] rounded-2xl p-3 flex items-center justify-center border-2 border-[#A4C8FF] shadow-sm">
                    {qrTicketUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrTicketUrl}
                        alt="Mã QR Phiếu khám"
                        className="w-32 h-32 object-contain"
                      />
                    ) : (
                      <div className="text-xs text-neutral-400 font-bold text-center">Mã QR Phiếu</div>
                    )}
                  </div>
                  {ticketCode && ticketCode !== '---' && (
                    <span className="text-sm font-black text-[#1E2939] tracking-widest font-mono bg-neutral-100 px-3 py-1 rounded-xl">
                      Mã vé: {ticketCode}
                    </span>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-neutral-100" />

                {/* Info rows */}
                <div className="flex flex-col gap-3 text-sm">
                  {/* Bệnh nhân */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-500">Bệnh nhân</span>
                    <span className="font-black text-[#1E2939]">{patientName || '---'}</span>
                  </div>

                  {/* Mã bệnh nhân */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-500">Mã bệnh nhân</span>
                    <span className="font-mono font-black text-[#1E2939]">{patientInfo?.idNumber || patientId || '---'}</span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-neutral-100 my-1" />

                  {/* Số thứ tự */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-500">Số thứ tự</span>
                    <span className="text-2xl font-black text-[#155DFC]">{ticketNo || '---'}</span>
                  </div>

                  {/* Trạng thái */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-500">Trạng thái</span>
                    {activeTicket?.status === 'completed' ? (
                      <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-extrabold">
                        Đã khám xong
                      </span>
                    ) : activeTicket?.status === 'in_consultation' ? (
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-extrabold">
                        Đang khám
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-extrabold">
                        Đang chờ khám
                      </span>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-neutral-100 my-1" />

                  {/* Thời gian chờ */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-500">Thời gian chờ</span>
                    <span className="font-black text-[#1E2939]">
                      {estimatedWait} <span className="text-xs font-bold text-neutral-400">phút</span>
                    </span>
                  </div>

                  {/* Giờ khám dự kiến */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-500">Giờ khám dự kiến</span>
                    <span className="font-black text-[#1E2939]">{startTime || '---'}</span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-neutral-100 my-1" />

                  {/* Phòng khám */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-500">Phòng khám</span>
                    <span className="font-black text-[#1E2939]">{roomName || '---'}</span>
                  </div>

                  {/* Khoa */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-500">Khoa</span>
                    <span className="font-black text-[#1E2939]">{specialtyName || '---'}</span>
                  </div>

                  {/* Bác sĩ */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-500">Bác sĩ</span>
                    <span className="font-black text-[#1E2939]">{doctorName || '---'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════
              RIGHT COLUMN — Print + Destination
              ════════════════════════════════ */}
          <div className="flex flex-col min-h-0 gap-5">

            {/* ── Print Button (large, prominent) ── */}
            <div
              style={{ flex: '4 4 0%' }}
              className="bg-white rounded-[28px] shadow-lg border border-neutral-100 p-6 flex flex-col items-center justify-center gap-4 min-h-0"
            >
              <button
                onClick={handleOpenPrintModal}
                className="w-full flex items-center justify-center gap-3 px-8 py-4.5 bg-gradient-to-r from-[#155DFC] to-[#4F80E1] hover:from-[#1250d6] hover:to-[#3a6ad4] active:scale-95 text-white rounded-2xl font-black text-base transition-all cursor-pointer"
              >
                <Printer className="w-5 h-5" />
                IN PHIẾU KHÁM
              </button>

              {/* ── View doctor route shortcut (inside print card) ── */}
              <button
                onClick={() => navigateToView('doctor_route')}
                className="w-full flex items-center justify-center gap-2 py-4.5 bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-[#155DFC] rounded-2xl font-black text-base transition-all cursor-pointer"
              >
                <Navigation className="w-5 h-5 rotate-45" />
                Xem lộ trình bác sĩ chỉ định
              </button>
            </div>

            {/* ── Điểm đến hiện tại ── */}
            <div
              style={{ flex: '6 6 0%' }}
              className="bg-gradient-to-br from-[#4F80E1] to-[#2563EB] rounded-[28px] shadow-xl flex flex-col justify-between p-8 gap-5 min-h-0"
            >
              {/* Card label */}
              <div>
                <span className="text-xs font-black text-blue-100 uppercase tracking-widest block mb-3">
                  {isPaymentStep ? 'Thanh toán hiện tại' : 'Điểm đến hiện tại'}
                </span>

                <div className="space-y-1">
                  <h3 className="text-3xl font-black text-white leading-tight">
                    {roomName || '---'}
                  </h3>
                  {specialtyName && (
                    <p className="text-base font-bold text-blue-100">{specialtyName}</p>
                  )}
                </div>
              </div>

              {/* Map button */}
              <button
                onClick={() => !isPaymentStep && navigateToMap(stripRoomName(activeTicket?.roomNumber || ''))}
                disabled={isPaymentStep}
                className={cn(
                  'w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all',
                  isPaymentStep
                    ? 'bg-blue-300/30 text-blue-100/50 border border-blue-300/20 cursor-not-allowed'
                    : 'bg-white text-[#155DFC] hover:bg-blue-50 active:scale-95 shadow-md cursor-pointer'
                )}
              >
                <Map className="w-4 h-4" />
                Xem đường đi
              </button>
            </div>


          </div>
        </div>
      )}
    </div>
  );
};
