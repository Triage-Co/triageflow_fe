import React, { useState } from 'react';
import { useKioskStore } from '../store/kioskStore';
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Printer,
  User,
  X,
  FileText,
  Map,
  Pill,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useFlowStore } from '../store/flowStore';
import { stripRoomName, QUEUE_TYPE_MAP } from '../utils/flowHelpers';
import { printKioskTicket } from '../utils/kioskTicketPrinter';
import { prescriptionService } from '../services/prescriptionService';
import { PrescriptionDetailModal } from '../modals/PrescriptionDetailModal';
import { ServicePaymentQrModal } from '../modals/ServicePaymentQrModal';
import { PrescriptionData } from '../types/prescription.types';
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
  const citizenIdVal = patientInfo?.idNumber || (patientInfo as any)?.citizenId || patientId || '---';
  const currentCallingNo = activeTicket?.currentCallingNo || ticketNo;
  const waitingCount = activeTicket?.waitingCount ?? 3;
  const startTime = activeTicket?.startTime || '';

  const isPaymentStep = activeTicket?.stepName?.toLowerCase().trim().startsWith('thanh toán') || false;

  // Dynamic QR Code for Ticket - Gen từ activeTicket?.ticketCode (nếu có), fallback ticketNo
  const ticketCode = activeTicket?.ticketCode || '';
  const queueType = activeTicket?.queueType || '';
  const queueTypeLabel = QUEUE_TYPE_MAP[queueType] || (activeTicket ? QUEUE_TYPE_MAP.NEW : '');
  const qrPayload = ticketCode || ticketNo || 'TRIAGEFLOW-TICKET';
  const qrTicketUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrPayload)}`;

  const currentDateStr = new Date().toLocaleDateString('vi-VN');
  const currentTimeStr = activeTicket?.createdAt || new Date().toLocaleTimeString('vi-VN');

  // States cho Modal Xem đơn thuốc & Thanh toán đơn thuốc
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [activePrescription, setActivePrescription] = useState<PrescriptionData | null>(null);
  const [isLoadingPrescription, setIsLoadingPrescription] = useState(false);

  const [isPrescriptionQrModalOpen, setIsPrescriptionQrModalOpen] = useState(false);
  const [prescriptionQrData, setPrescriptionQrData] = useState<{ qrCode: string; amount: number } | null>(null);
  const [payingServiceOrderId, setPayingServiceOrderId] = useState<string>('');

  const handleOpenPrescriptionModal = async () => {
    setIsPrescriptionModalOpen(true);
    setIsLoadingPrescription(true);

    try {
      // 1. Tra cứu đơn thuốc theo mã phiếu khám (ticketCode)
      if (ticketCode) {
        const ticketRes = await prescriptionService.getPrescriptionByTicketCode(ticketCode);
        const presList = (ticketRes as any)?.data?.prescriptions || (ticketRes as any)?.prescriptions;
        if (Array.isArray(presList) && presList.length > 0) {
          setActivePrescription(presList[0]);
          return;
        }
      }

      // 2. Tra cứu theo patientId nếu có
      if (patientId) {
        const patientRes = await prescriptionService.getPrescriptionsByPatient(patientId);
        const presList =
          (patientRes as any)?.data?.items ||
          (patientRes as any)?.data ||
          (patientRes as any)?.items ||
          patientRes;

        if (Array.isArray(presList) && presList.length > 0) {
          const matched = activeTicket?.bookingId
            ? presList.find((p: any) => p.booking_id === activeTicket.bookingId)
            : null;
          setActivePrescription(matched || presList[0]);
          return;
        }
      }

      setActivePrescription(null);
    } catch (error) {
      console.warn('Lỗi khi tra cứu đơn thuốc:', error);
      setActivePrescription(null);
    } finally {
      setIsLoadingPrescription(false);
    }
  };

  const handlePayPrescription = (pres: PrescriptionData) => {
    const qr = pres.serviceOrder?.qr_code || pres.qr_code;
    const amount = pres.serviceOrder?.total_price || pres.total_amount || 0;
    const soId = pres.serviceOrder?.service_order_id || pres.prescription_id || '';

    if (qr && soId) {
      setPrescriptionQrData({ qrCode: qr, amount });
      setPayingServiceOrderId(soId);
      setIsPrescriptionQrModalOpen(true);
    } else {
      showToast('Đơn thuốc chưa sẵn sàng thanh toán QR trực tiếp.', 'info');
    }
  };

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
      printKioskTicket({
        ticketNo: String(ticketNo || '---'),
        fullName: String(patientName || '---'),
        citizenId: String(citizenIdVal),
        specialty: String(specialtyName || '---'),
        doctorLabel: String(doctorName || '---'),
        roomLabel: String(roomName || '---'),
        appointmentDate: currentDateStr,
        slotTimeLabel: startTime ? `${currentDateStr}, ${startTime}` : `${currentDateStr}, ${currentTimeStr}`,
        qrPayload: qrPayload,
      });
    }, 200);
  };

  return (
    <div className="w-full h-full min-h-0 p-4 sm:p-6 lg:p-8 z-10 select-none flex flex-col justify-between gap-4 max-w-7xl mx-auto overflow-hidden">
      {/* Interactive Print Preview Modal on Kiosk Screen */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-6 lg:p-8 max-w-lg w-full shadow-2xl border border-neutral-200 flex flex-col space-y-5 transform animate-in zoom-in-95 duration-200 max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#155DFC] flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#1E2939]">Xem trước phiếu khám</h3>
                  <p className="text-xs text-neutral-500 font-medium">Định dạng in nhiệt chuẩn máy in POS 56mm / 80mm</p>
                </div>
              </div>

              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thermal Ticket Card Preview - Exact Match with Reception */}
            <div className="overflow-y-auto px-1 py-1 shrink min-h-0">
              <div className="w-full max-w-sm mx-auto bg-white border border-black p-4 font-mono text-black text-center shadow-md select-text">
                <div className="font-bold text-sm uppercase tracking-wide">BỆNH VIỆN</div>
                <div className="font-bold text-xs uppercase leading-tight my-1">
                  HỆ THỐNG QUẢN LÝ KHÁM BỆNH<br />TRIAGEFLOW OPD
                </div>
                <div className="font-bold text-[11px] uppercase tracking-wide my-1">--- PHIẾU ĐĂNG KÝ KHÁM ---</div>

                <div className="border-t border-dashed border-black my-2.5 w-full" />

                {/* Ticket Number Box */}
                <div className="border border-black py-2 px-1 my-2 w-[98%] mx-auto">
                  <div className="text-xs font-bold uppercase tracking-wider mb-0.5">Số thứ tự khám</div>
                  <div className="text-5xl font-black tracking-widest leading-none my-1">{ticketNo}</div>
                </div>

                <div className="border-t border-dashed border-black my-2.5 w-full" />

                {/* Patient Info Table */}
                <table className="w-full text-xs font-bold text-left border-collapse">
                  <tbody>
                    <tr>
                      <td className="w-2/5 py-0.5 text-left text-neutral-800">HỌ VÀ TÊN:</td>
                      <td className="w-3/5 py-0.5 text-right font-black break-words">{patientName ? patientName.toUpperCase() : '---'}</td>
                    </tr>
                    <tr>
                      <td className="w-2/5 py-0.5 text-left text-neutral-800">CCCD/CMND:</td>
                      <td className="w-3/5 py-0.5 text-right font-black break-words">{citizenIdVal}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="border-t border-dashed border-black my-2.5 w-full" />

                {/* Examination Info Table */}
                <table className="w-full text-xs font-bold text-left border-collapse">
                  <tbody>
                    <tr>
                      <td className="w-2/5 py-0.5 text-left text-neutral-800">KHOA KHÁM:</td>
                      <td className="w-3/5 py-0.5 text-right font-black break-words">{specialtyName ? specialtyName.toUpperCase() : '---'}</td>
                    </tr>
                    <tr>
                      <td className="w-2/5 py-0.5 text-left text-neutral-800">BÁC SĨ:</td>
                      <td className="w-3/5 py-0.5 text-right font-black break-words">{doctorName || '---'}</td>
                    </tr>
                    <tr>
                      <td className="w-2/5 py-0.5 text-left text-neutral-800">PHÒNG KHÁM:</td>
                      <td className="w-3/5 py-0.5 text-right font-black break-words">{roomName || '---'}</td>
                    </tr>
                    <tr>
                      <td className="w-2/5 py-0.5 text-left text-neutral-800">NGÀY KHÁM:</td>
                      <td className="w-3/5 py-0.5 text-right font-black break-words">{currentDateStr}</td>
                    </tr>
                    <tr>
                      <td className="w-2/5 py-0.5 text-left text-neutral-800">GIỜ KHÁM:</td>
                      <td className="w-3/5 py-0.5 text-right font-black break-words">{startTime || currentTimeStr}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="border-t border-dashed border-black my-2.5 w-full" />

                {/* QR Code */}
                <div className="my-2.5 text-center">
                  <img
                    src={qrTicketUrl}
                    alt="Mã QR Phiếu khám"
                    className="w-36 h-36 mx-auto border border-black p-1 block mb-1.5 bg-white"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  {ticketCode && ticketCode !== '---' && (
                    <div className="text-[11px] font-black tracking-wider text-black mt-1">
                      Mã phiếu: {ticketCode}
                    </div>
                  )}
                </div>

                <div className="border-t border-solid border-black my-2 w-full" />

                {/* Footer Notes */}
                <div className="text-[10px] font-bold uppercase leading-tight mb-1">
                  VUI LÒNG GIỮ PHIẾU NÀY TRONG SUỐT QUÁ TRÌNH KHÁM
                </div>
                <div className="text-[10px] font-bold uppercase leading-tight mb-1">
                  CHÚC QUÝ KHÁCH NHIỀU SỨC KHỎE!
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 shrink-0 border-t border-neutral-100">
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
      <div className="flex items-center gap-4 shrink-0">
        <button
          onClick={goHome}
          className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-neutral-50 rounded-2xl shadow-sm border border-neutral-200 text-sm font-extrabold text-neutral-800 transition-all cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" /> Trang chủ
        </button>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1E2939] tracking-tight">
          Thông tin khám bệnh
        </h2>
      </div>

      {/* ── Empty State ── */}
      {!activeTicket && !selectedDoctor ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-14 bg-white/90 backdrop-blur-xl rounded-[36px] border border-neutral-100 shadow-2xl space-y-6 text-center max-w-2xl mx-auto w-full my-auto">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-blue-50 text-[#155DFC] flex items-center justify-center shadow-inner">
            <FileText className="w-10 h-10 sm:w-12 sm:h-12" strokeWidth={2.2} />
          </div>

          <div className="space-y-2 max-w-lg">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1E2939] tracking-tight">
              Bạn chưa có phiếu khám hôm nay
            </h3>
            <p className="text-xs sm:text-sm lg:text-base text-neutral-500 font-bold leading-relaxed">
              Hệ thống không tìm thấy lượt khám nào đang diễn ra của bạn. Vui lòng đăng ký khám bệnh mới để nhận phiếu khám.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 pt-2">
            <button
              onClick={goHome}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-2xl font-extrabold text-xs sm:text-base transition-all cursor-pointer"
            >
              Về trang chủ Kiosk
            </button>
            <button
              onClick={() => navigateToView('booking_mode')}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-[#155DFC] hover:bg-blue-700 active:scale-95 text-white rounded-2xl font-black text-xs sm:text-base shadow-xl shadow-blue-500/25 transition-all cursor-pointer"
            >
              Đăng ký khám ngay →
            </button>
          </div>
        </div>
      ) : (
        /* ── Main 2-Column Layout ── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 flex-1 min-h-0 overflow-hidden">

          {/* ════════════════════════════════
              LEFT COLUMN — Phiếu khám bệnh
              ════════════════════════════════ */}
          <div className="flex flex-col min-h-0 overflow-hidden">
            {/* Ticket card */}
            <div className="bg-white rounded-[28px] shadow-lg border border-neutral-100 flex flex-col flex-1 overflow-hidden">
              {/* Card header */}
              <div className="bg-gradient-to-r from-[#155DFC] to-[#4F80E1] px-6 py-3.5 shrink-0">
                <h3 className="text-white font-black text-base sm:text-lg tracking-wide text-center uppercase">
                  Phiếu khám bệnh
                </h3>
              </div>

              {/* Card body */}
              <div className="flex flex-col flex-1 p-4 sm:p-6 gap-3 sm:gap-4 overflow-y-auto">
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
                      <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-extrabold whitespace-nowrap">
                        Đã khám xong
                      </span>
                    ) : activeTicket?.status === 'in_consultation' ? (
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-extrabold whitespace-nowrap">
                        Đang khám
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-extrabold whitespace-nowrap">
                        Đang chờ khám
                      </span>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-neutral-100 my-1" />

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

            {/* ── Print Button & Actions Card (large, prominent) ── */}
            <div
              style={{ flex: '5 5 0%' }}
              className="bg-white rounded-[28px] shadow-lg border border-neutral-100 p-6 flex flex-col items-center justify-center gap-3.5 min-h-0"
            >
              <button
                onClick={handleOpenPrintModal}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-[#155DFC] to-[#4F80E1] hover:from-[#1250d6] hover:to-[#3a6ad4] active:scale-95 text-white rounded-2xl font-black text-base transition-all cursor-pointer shadow-md shadow-blue-500/10"
              >
                <Printer className="w-5 h-5" />
                IN PHIẾU KHÁM
              </button>

              {/* ── View prescription button ── */}
              <button
                onClick={handleOpenPrescriptionModal}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 border border-emerald-200/80 rounded-2xl font-black text-sm sm:text-base transition-all cursor-pointer shadow-sm"
              >
                <Pill className="w-5 h-5 text-emerald-600" />
                Xem đơn thuốc
              </button>

              {/* ── View doctor route shortcut (inside print card) ── */}
              <button
                onClick={() => navigateToView('doctor_route')}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-[#155DFC] rounded-2xl font-black text-sm sm:text-base transition-all cursor-pointer"
              >
                <Navigation className="w-5 h-5 rotate-45" />
                Xem lộ trình bác sĩ chỉ định
              </button>
            </div>

            {/* ── Điểm đến hiện tại ── */}
            <div
              style={{ flex: '5 5 0%' }}
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

      {/* Modal Chi tiết đơn thuốc */}
      <PrescriptionDetailModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        prescription={activePrescription}
        isLoading={isLoadingPrescription}
        onSelectPay={handlePayPrescription}
      />

      {/* Modal Thanh toán QR nếu thanh toán trực tiếp đơn thuốc */}
      {isPrescriptionQrModalOpen && prescriptionQrData && patientId && (
        <ServicePaymentQrModal
          isOpen={isPrescriptionQrModalOpen}
          onClose={() => {
            setIsPrescriptionQrModalOpen(false);
            setPrescriptionQrData(null);
          }}
          qrResult={{
            qrCode: prescriptionQrData.qrCode,
            amount: prescriptionQrData.amount,
          }}
          patientId={patientId}
          serviceOrderId={payingServiceOrderId}
          onPaymentSuccess={() => {
            setIsPrescriptionQrModalOpen(false);
            showToast('Thanh toán đơn thuốc thành công!', 'success');
            handleOpenPrescriptionModal();
          }}
        />
      )}
    </div>
  );
};
