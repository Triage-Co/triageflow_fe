import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { PrimaryButton } from '../components/PrimaryButton';
import { 
  ArrowLeft, 
  Printer, 
  Navigation, 
  QrCode, 
  User, 
  Clock, 
  MapPin 
} from 'lucide-react';

export const TicketView: React.FC = () => {
  const activeTicket = useKioskStore((state) => state.activeTicket);
  const patientInfo = useKioskStore((state) => state.patientInfo);
  const goHome = useKioskStore((state) => state.goHome);
  const selectHomeOption = useKioskStore((state) => state.selectHomeOption);
  const showToast = useKioskStore((state) => state.showToast);

  const handlePrintTicket = () => {
    showToast('Đang phát lệnh in phiếu khám...', 'info');
  };

  const handleNavigateMap = () => {
    // Navigate directly to Map view without scanning CCCD again
    useKioskStore.setState({ currentView: 'map' });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-6 z-10 space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-white/90 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/40 shadow-sm">
        <button 
          onClick={goHome} 
          className="flex items-center gap-2 text-[#4A5565] hover:text-[#1E2939] font-bold text-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Về trang chủ
        </button>
        <span className="text-xs font-bold text-[#155DFC]">THÔNG TIN PHIẾU KHÁM & HÀNG ĐỢI</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ticket card */}
        <div className="bg-white rounded-[32px] p-8 shadow-xl border border-neutral-100 flex flex-col items-center text-center space-y-4">
          <div className="flex items-center gap-2 text-[#155DFC] font-bold text-sm">
            <QrCode className="w-5 h-5" /> PHIẾU ĐẮNG KÝ HIỆN TẠI
          </div>

          <div className="w-full bg-neutral-50 rounded-2xl border border-neutral-200 p-6 font-mono text-xs text-left space-y-3 shadow-inner">
            <div className="text-center font-bold text-sm border-b border-dashed border-neutral-300 pb-2">
              PHIẾU KHÁM BỆNH
              <p className="text-[10px] text-neutral-400 font-normal">Mã tra cứu: TF-2026-X9</p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between"><span className="text-neutral-500">Họ tên:</span> <span className="font-bold text-[#1E2939]">{patientInfo?.fullName || 'NGUYỄN VĂN A'}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Ngày sinh:</span> <span className="font-bold text-[#1E2939]">{patientInfo?.dob || '15/10/1995'}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Chuyên khoa:</span> <span className="font-bold text-[#1E2939]">{activeTicket?.clinicName || 'Phòng khám Nội Tổng Quát'}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Vị trí:</span> <span className="font-bold text-[#1E2939]">{activeTicket?.roomNumber || 'P.101 - Tầng 1'}</span></div>
            </div>

            <div className="border-t border-b border-dashed border-neutral-300 py-3 text-center my-2">
              <span className="text-[10px] text-neutral-400 block font-normal uppercase">Số thứ tự khám</span>
              <span className="text-4xl font-black text-[#155DFC] tracking-wider">{activeTicket?.ticketNumber || 'A - 105'}</span>
            </div>

            <div className="text-center text-[11px] text-neutral-500 font-medium">
              Vui lòng theo dõi số thứ tự hiển thị tại sảnh chờ.
            </div>
          </div>

          {/* Action buttons */}
          <div className="w-full flex flex-col sm:flex-row gap-3 pt-2">
            <PrimaryButton onClick={handlePrintTicket} variant="outline" className="flex-1">
              <Printer className="w-4 h-4" /> In phiếu khám
            </PrimaryButton>
            <PrimaryButton onClick={handleNavigateMap} className="flex-1">
              <Navigation className="w-4 h-4 rotate-45" /> Xem lộ trình khám
            </PrimaryButton>
          </div>
        </div>

        {/* Live Queue info */}
        <div className="bg-white rounded-[32px] p-8 shadow-xl border border-neutral-100 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#155DFC] font-bold text-sm">
              <Clock className="w-5 h-5" /> TRẠNG THÁI HÀNG ĐỢI
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#155DFC] text-white flex items-center justify-center font-black text-lg">
                  {activeTicket?.ticketNumber || 'A - 105'}
                </div>
                <div>
                  <h4 className="font-extrabold text-[#1E2939]">Số thứ tự của bạn</h4>
                  <p className="text-xs text-neutral-500 font-medium">Đã đăng ký lúc {new Date().toLocaleTimeString('vi-VN')}</p>
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-lg">
                  A - 102
                </div>
                <div>
                  <h4 className="font-extrabold text-[#1E2939]">Số thứ tự đang khám</h4>
                  <p className="text-xs text-amber-700 font-medium">Còn 3 người trước bạn</p>
                </div>
              </div>

              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-100 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-neutral-700">
                  <MapPin className="w-4 h-4 text-[#155DFC]" /> Vị trí phòng khám:
                </div>
                <p className="text-neutral-600 leading-relaxed font-medium">
                  {activeTicket?.roomNumber || 'Phòng 101 - Tầng 1'}, Khu A (Cách vị trí Kiosk 30m về bên trái).
                </p>
              </div>
            </div>
          </div>

          <PrimaryButton onClick={goHome} variant="secondary" className="w-full">
            Hoàn tất xem thông tin
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};
