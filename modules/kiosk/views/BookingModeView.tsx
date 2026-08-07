import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { useBookingStore } from '../store/bookingStore';
import { usePackageBookingStore } from '../store/packageBookingStore';
import { ArrowLeft, CalendarCheck, Sparkles, ChevronRight, Stethoscope, BriefcaseMedical } from 'lucide-react';

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
    <div className="w-full h-screen p-6 lg:p-10 z-10 select-none flex flex-col justify-center  max-w-7xl mx-auto space-y-8 lg:ml-50">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between h-10">
        <div className="flex items-center gap-4">
          <button
            onClick={goHome}
            className="flex items-center gap-2 px-6 py-1 bg-white hover:bg-neutral-50 active:scale-95 rounded-2xl text-md font-bold text-neutral-800 shadow-md border border-neutral-100 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-12 h-12 text-neutral-600" /> Trang chủ
          </button>
          <div className="ml-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1E2939] tracking-tight">
              Lựa chọn hình thức đăng ký khám
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-neutral-500 mt-1">
              Vui lòng chọn một trong các phương thức đăng ký bên dưới
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 grid md:grid-cols-9 gap-3 h-full">

        {/* Option 2: Gợi ý chẩn đoán AI */}
        <button
          onClick={handleSelectAIBooking}
          className="group relative bg-white/95 backdrop-blur-xl hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/50 rounded-[36px] p-6 border border-neutral-200/80 hover:border-indigo-300 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between text-left cursor-pointer active:scale-[0.98] overflow-hidden lg:size-165 lg:col-span-5"
        >
          {/* Subtle Top Badge */}
          <div className="flex items-center justify-between w-full">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-inner group-hover:shadow-lg group-hover:shadow-indigo-500/30">
              <Sparkles className="w-8 h-8" strokeWidth={2} />
            </div>
          </div>

          <div className="space-y-3 my-6 flex flex-col items-center">
            <h3 className="text-xl sm:text-4xl font-black text-[#1E2939] group-hover:text-indigo-600 transition-colors leading-snug">
              Đặt khám theo gợi ý
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium leading-relaxed">
              Hệ thống AI sẽ phân tích và đề xuất chuyên khoa phù hợp.
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-neutral-100 w-full group-hover:border-indigo-200 transition-colors">
            <span className="text-xs sm:text-sm font-black text-indigo-600 flex items-center gap-1">
              Bắt đầu đánh giá
            </span>
            <div className="w-8 h-8 rounded-xl bg-neutral-100 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all text-neutral-600">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </button>
        <div className=' gap-3 flex flex-col h-full col-span-4'>
          {/* Option 1: Đặt lịch khám trực tiếp */}
          <button
            onClick={handleSelectDirectBooking}
            className="group relative bg-white/95 backdrop-blur-xl hover:bg-gradient-to-br hover:from-white hover:to-blue-50/50 rounded-[36px] p-6 border border-neutral-200/80 hover:border-blue-300 shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between text-left cursor-pointer active:scale-[0.98] overflow-hidden lg:size-81"
          >
            {/* Subtle Top Badge */}
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-3xl bg-blue-50 text-[#155DFC] group-hover:bg-[#155DFC] group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-inner group-hover:shadow-lg group-hover:shadow-blue-500/30">
                <CalendarCheck className="w-5 h-5" strokeWidth={2} />
              </div>
            </div>

            <div className="space-y-3 my-6">
              <h3 className="text-xl sm:text-2xl font-black text-[#1E2939] group-hover:text-[#155DFC] transition-colors leading-snug">
                Đặt lịch khám theo chuyên khoa
              </h3>
              <p className="text-xs sm:text-sm text-neutral-500 font-medium leading-relaxed">
                Chọn trực tiếp chuyên khoa bạn cần đăng ký khám trong danh sách chuyên khoa của bệnh viện.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 w-full group-hover:border-blue-200 transition-colors">
              <span className="text-xs sm:text-sm font-black text-[#155DFC] flex items-center gap-1">
                Chọn chuyên khoa
              </span>
              <div className="w-8 h-8 rounded-xl bg-neutral-100 group-hover:bg-[#155DFC] group-hover:text-white flex items-center justify-center transition-all text-neutral-600">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </button>

          {/* Option 3: Đặt lịch khám theo gói dịch vụ */}
          <button
            onClick={handleSelectPackageBooking}
            className="group relative bg-white/95 backdrop-blur-xl hover:bg-gradient-to-br hover:from-white hover:to-teal-50/50 rounded-[36px] p-6 border border-neutral-200/80 hover:border-teal-300 shadow-xl hover:shadow-2xl hover:shadow-teal-500/10 transition-all duration-300 flex flex-col justify-between text-left cursor-pointer active:scale-[0.98] overflow-hidden size-81"
          >
            {/* Subtle Top Badge */}
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-3xl bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-inner group-hover:shadow-lg group-hover:shadow-teal-500/30">
                <BriefcaseMedical className="w-5 h-5" strokeWidth={2} />
              </div>
            </div>

            <div className="space-y-3 my-6">
              <h3 className="text-xl sm:text-2xl font-black text-[#1E2939] group-hover:text-teal-600 transition-colors leading-snug">
                Đặt khám sức khỏe
              </h3>
              <p className="text-xs sm:text-sm text-neutral-500 font-medium leading-relaxed">
                Lựa chọn các gói khám trọn gói thiết kế sẵn (tổng quát, VIP, chuyên sâu) tối ưu chi phí.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 w-full group-hover:border-teal-200 transition-colors">
              <span className="text-xs sm:text-sm font-black text-teal-600 flex items-center gap-1">
                Xem gói dịch vụ
              </span>
              <div className="w-8 h-8 rounded-xl bg-neutral-100 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center transition-all text-neutral-600">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
