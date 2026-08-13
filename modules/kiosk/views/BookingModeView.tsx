import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { useBookingStore } from '../store/bookingStore';
import { usePackageBookingStore } from '../store/packageBookingStore';
import {
  ArrowLeft,
  CalendarCheck,
  Sparkles,
  ChevronRight,
  BriefcaseMedical,
  CheckCircle2,
  Zap,
} from 'lucide-react';

export const BookingModeView: React.FC = () => {
  const goHome = useKioskStore((state) => state.goHome);
  const navigateToView = useKioskStore((state) => state.navigateToView);
  const setAIRegisterStep = useKioskStore((state) => state.setAIRegisterStep);
  const fetchSpecialties = useBookingStore((state) => state.fetchSpecialties);
  const setBookingFlowMode = useKioskStore((state) => state.setBookingFlowMode);

  const fetchPackages = usePackageBookingStore((state) => state.fetchPackages);

  const handleSelectDirectBooking = () => {
    setBookingFlowMode('direct');
    fetchSpecialties();
    navigateToView('specialty_select');
  };

  const handleSelectPackageBooking = () => {
    setBookingFlowMode('direct');
    fetchPackages();
    navigateToView('package_select');
  };

  const handleSelectAIBooking = () => {
    setBookingFlowMode('ai');
    setAIRegisterStep('body_select');
    navigateToView('register');
  };

  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 select-none z-10 overflow-y-auto">
      {/* Centered Compact Container */}
      <div className="w-full max-w-4xl flex flex-col my-auto space-y-4 sm:space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={goHome}
              className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-white hover:bg-neutral-50 active:scale-95 rounded-2xl text-xs sm:text-sm font-bold text-neutral-800 shadow-md border border-neutral-100/80 transition-all cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-600" /> Trang chủ
            </button>
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1E2939] tracking-tight">
                Lựa chọn hình thức đăng ký khám
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-neutral-500 mt-0.5">
                Vui lòng chọn một trong các phương thức đăng ký bên dưới
              </p>
            </div>
          </div>
        </div>

        {/* Square Cards Bento Grid: 1 Big Square + 2 Small Squares */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 w-full items-stretch">
          {/* Option 1: AI Hero Card (Big Square: spans 2 cols & 2 rows on desktop) */}
          <button
            onClick={handleSelectAIBooking}
            className="md:col-span-2 aspect-square group relative bg-white/95 backdrop-blur-xl hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/60 rounded-[28px] sm:rounded-[36px] p-5 sm:p-7 lg:p-8 border border-neutral-200/80 hover:border-indigo-400 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/15 transition-all duration-300 flex flex-col justify-between text-left cursor-pointer active:scale-[0.99] overflow-hidden"
          >
            {/* Top Badge & Icon */}
            <div className="flex items-center justify-between w-full gap-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-inner group-hover:shadow-lg group-hover:shadow-indigo-500/30">
                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.2} />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-indigo-100/80 text-indigo-700 border border-indigo-200 shadow-sm">
                <Zap className="w-3.5 h-3.5 text-indigo-600" /> Khuyên dùng
              </span>
            </div>

            {/* Body Content */}
            <div className="space-y-2 sm:space-y-3.5 my-auto py-2">
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1E2939] group-hover:text-indigo-600 transition-colors leading-tight">
                  Đặt khám theo gợi ý AI
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 font-medium leading-relaxed line-clamp-2 sm:line-clamp-3">
                  Hệ thống AI phân tích triệu chứng qua sơ đồ cơ thể 3D trực quan và tự động đề xuất chuyên khoa khám phù hợp nhất.
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 bg-neutral-50/80 group-hover:bg-indigo-50/50 p-2 sm:p-2.5 rounded-xl border border-neutral-100 transition-colors">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="truncate">Chọn vùng đau trực quan</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 bg-neutral-50/80 group-hover:bg-indigo-50/50 p-2 sm:p-2.5 rounded-xl border border-neutral-100 transition-colors">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="truncate">Gợi ý khoa chính xác</span>
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-neutral-100 group-hover:border-indigo-200/80 transition-colors w-full">
              <span className="text-xs sm:text-sm font-black text-indigo-600 flex items-center gap-1.5">
                Bắt đầu đánh giá triệu chứng
              </span>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all duration-300 text-indigo-600 shadow-sm group-hover:shadow-md group-hover:shadow-indigo-500/30">
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </button>

          {/* Options 2 & 3: Container for 2 Small Squares */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4 sm:gap-5">
            {/* Option 2: Đặt lịch khám trực tiếp (Small Square) */}
            <button
              onClick={handleSelectDirectBooking}
              className="aspect-square group relative bg-white/95 backdrop-blur-xl hover:bg-gradient-to-br hover:from-white hover:to-blue-50/60 rounded-[24px] sm:rounded-[28px] p-4 sm:p-5 border border-neutral-200/80 hover:border-blue-400 shadow-lg hover:shadow-xl hover:shadow-blue-500/15 transition-all duration-300 flex flex-col justify-between text-left cursor-pointer active:scale-[0.98] overflow-hidden"
            >
              {/* Top Badge */}
              <div className="flex items-center justify-between w-full gap-2">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-blue-50 text-[#155DFC] group-hover:bg-[#155DFC] group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-inner group-hover:shadow-lg group-hover:shadow-blue-500/30">
                  <CalendarCheck className="w-5 h-5" strokeWidth={2.2} />
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                  20+ Khoa
                </span>
              </div>

              <div className="space-y-1 my-auto py-1">
                <h3 className="text-sm sm:text-base lg:text-lg font-black text-[#1E2939] group-hover:text-[#155DFC] transition-colors leading-snug">
                  Đặt khám theo chuyên khoa
                </h3>
                <p className="text-[11px] sm:text-xs text-neutral-500 font-medium leading-relaxed line-clamp-2">
                  Chọn trực tiếp chuyên khoa khám và bác sĩ mong muốn trong danh mục.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-neutral-100 group-hover:border-blue-200/80 transition-colors w-full">
                <span className="text-[11px] sm:text-xs font-black text-[#155DFC] flex items-center gap-1">
                  Chọn chuyên khoa
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 group-hover:bg-[#155DFC] group-hover:text-white flex items-center justify-center transition-all duration-300 text-[#155DFC]">
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>

            {/* Option 3: Đặt lịch khám theo gói dịch vụ (Small Square) */}
            <button
              onClick={handleSelectPackageBooking}
              className="aspect-square group relative bg-white/95 backdrop-blur-xl hover:bg-gradient-to-br hover:from-white hover:to-teal-50/60 rounded-[24px] sm:rounded-[28px] p-4 sm:p-5 border border-neutral-200/80 hover:border-teal-400 shadow-lg hover:shadow-xl hover:shadow-teal-500/15 transition-all duration-300 flex flex-col justify-between text-left cursor-pointer active:scale-[0.98] overflow-hidden"
            >
              {/* Top Badge */}
              <div className="flex items-center justify-between w-full gap-2">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-inner group-hover:shadow-lg group-hover:shadow-teal-500/30">
                  <BriefcaseMedical className="w-5 h-5" strokeWidth={2.2} />
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-100">
                  Trọn gói
                </span>
              </div>

              <div className="space-y-1 my-auto py-1">
                <h3 className="text-sm sm:text-base lg:text-lg font-black text-[#1E2939] group-hover:text-teal-600 transition-colors leading-snug">
                  Đặt khám sức khỏe trọn gói
                </h3>
                <p className="text-[11px] sm:text-xs text-neutral-500 font-medium leading-relaxed line-clamp-2">
                  Các gói khám tổng quát, định kỳ, VIP thiết kế trọn gói tiết kiệm chi phí.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-neutral-100 group-hover:border-teal-200/80 transition-colors w-full">
                <span className="text-[11px] sm:text-xs font-black text-teal-600 flex items-center gap-1">
                  Xem gói dịch vụ
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-teal-50 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center transition-all duration-300 text-teal-600">
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


