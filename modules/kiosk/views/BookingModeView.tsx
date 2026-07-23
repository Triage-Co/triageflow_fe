import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { useBookingStore } from '../store/bookingStore';
import { ArrowLeft, CalendarCheck, Sparkles, ChevronRight, Stethoscope } from 'lucide-react';

export const BookingModeView: React.FC = () => {
  const goHome = useKioskStore((state) => state.goHome);
  const navigateToView = useKioskStore((state) => state.navigateToView);
  const setAIRegisterStep = useKioskStore((state) => state.setAIRegisterStep);
  const fetchSpecialties = useBookingStore((state) => state.fetchSpecialties);

  const setBookingFlowMode = useKioskStore((state) => state.setBookingFlowMode);

  const handleSelectDirectBooking = () => {
    setBookingFlowMode('direct');
    fetchSpecialties();
    navigateToView('specialty_select');
  };

  const handleSelectAIBooking = () => {
    setBookingFlowMode('ai');
    setAIRegisterStep('body_select');
    navigateToView('register');
  };

  return (
    <div className="w-full min-h-screen p-6 lg:p-10 z-10 select-none flex flex-col justify-between max-w-7xl mx-auto space-y-8">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={goHome}
            className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-neutral-50 active:scale-95 rounded-2xl text-sm font-bold text-neutral-800 shadow-md border border-neutral-100 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600" /> Trang chủ
          </button>
          <div className="ml-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1E2939] tracking-tight">
              Lựa chọn hình thức đăng ký khám
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-neutral-500 mt-1">
              Vui lòng chọn một trong hai phương thức đăng ký bên dưới
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-blue-50/80 px-4 py-2 rounded-2xl border border-blue-100/60">
          <Stethoscope className="w-5 h-5 text-[#155DFC]" />
          <span className="text-xs font-extrabold text-[#155DFC]">Kiosk Đăng Ký Khám</span>
        </div>
      </div>

      {/* Main Options Grid (Widescreen Kiosk Touch Cards) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch my-auto py-4">
        {/* Option 1: Đặt lịch khám trực tiếp */}
        <button
          onClick={handleSelectDirectBooking}
          className="group relative bg-white/95 backdrop-blur-xl hover:bg-gradient-to-br hover:from-white hover:to-blue-50/50 rounded-[36px] p-8 sm:p-10 border border-neutral-200/80 hover:border-blue-300 shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between text-left cursor-pointer active:scale-[0.98] overflow-hidden"
        >
          {/* Subtle Top Badge */}
          <div className="flex items-center justify-between w-full">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-blue-50 text-[#155DFC] group-hover:bg-[#155DFC] group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-inner group-hover:shadow-lg group-hover:shadow-blue-500/30">
              <CalendarCheck className="w-10 h-10 sm:w-12 sm:h-12" strokeWidth={2} />
            </div>
            <span className="px-4 py-1.5 rounded-full bg-blue-50 text-[#155DFC] font-extrabold text-xs uppercase tracking-wider border border-blue-100">
              Nhanh chóng
            </span>
          </div>

          <div className="space-y-3 my-8">
            <h3 className="text-2xl sm:text-3xl font-black text-[#1E2939] group-hover:text-[#155DFC] transition-colors leading-snug">
              Đặt lịch khám theo chuyên khoa
            </h3>
            <p className="text-sm sm:text-base text-neutral-500 font-medium leading-relaxed">
              Chọn trực tiếp chuyên khoa bạn cần đăng ký khám trong danh sách chuyên khoa của bệnh viện.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-neutral-100 w-full group-hover:border-blue-200 transition-colors">
            <span className="text-sm sm:text-base font-black text-[#155DFC] flex items-center gap-1">
              Chọn chuyên khoa
            </span>
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 group-hover:bg-[#155DFC] group-hover:text-white flex items-center justify-center transition-all text-neutral-600">
              <ChevronRight className="w-6 h-6" />
            </div>
          </div>
        </button>

        {/* Option 2: Gợi ý chẩn đoán AI */}
        <button
          onClick={handleSelectAIBooking}
          className="group relative bg-white/95 backdrop-blur-xl hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/50 rounded-[36px] p-8 sm:p-10 border border-neutral-200/80 hover:border-indigo-300 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between text-left cursor-pointer active:scale-[0.98] overflow-hidden"
        >
          {/* Subtle Top Badge */}
          <div className="flex items-center justify-between w-full">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-inner group-hover:shadow-lg group-hover:shadow-indigo-500/30">
              <Sparkles className="w-10 h-10 sm:w-12 sm:h-12" strokeWidth={2} />
            </div>
            <span className="px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 font-extrabold text-xs uppercase tracking-wider border border-indigo-100">
              Khuyên dùng
            </span>
          </div>

          <div className="space-y-3 my-8">
            <h3 className="text-2xl sm:text-3xl font-black text-[#1E2939] group-hover:text-indigo-600 transition-colors leading-snug">
              Gợi ý chẩn đoán AI trước khi đặt
            </h3>
            <p className="text-sm sm:text-base text-neutral-500 font-medium leading-relaxed">
              Chọn vùng đau và trả lời khảo sát ngắn. Hệ thống AI sẽ phân tích và đề xuất chuyên khoa phù hợp nhất với bạn.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-neutral-100 w-full group-hover:border-indigo-200 transition-colors">
            <span className="text-sm sm:text-base font-black text-indigo-600 flex items-center gap-1">
              Bắt đầu đánh giá triệu chứng
            </span>
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all text-neutral-600">
              <ChevronRight className="w-6 h-6" />
            </div>
          </div>
        </button>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs font-semibold text-neutral-400 pb-2">
        Hệ thống Kiosk tự động • Vui lòng chạm vào thẻ để tiếp tục
      </div>
    </div>
  );
};
