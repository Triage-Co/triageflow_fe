import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { PrimaryButton } from '../components/PrimaryButton';
import { ArrowLeft, PhoneCall, HelpCircle, ShieldAlert, FileText, Info } from 'lucide-react';

export const SupportView: React.FC = () => {
  const goHome = useKioskStore((state) => state.goHome);

  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-4 sm:py-8 z-10 overflow-y-auto max-w-4xl mx-auto">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-xl border border-neutral-100 space-y-5 sm:space-y-6 w-full my-auto">
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
          <HelpCircle className="w-6 h-6 text-[#155DFC]" />
          <h2 className="text-lg sm:text-xl font-extrabold text-[#1E2939]">Thông tin trợ giúp & Hướng dẫn sử dụng Kiosk</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {/* Support Hotlines */}
          <div className="bg-blue-50/60 rounded-2xl p-5 sm:p-6 border border-blue-100 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-3 text-[#155DFC] font-bold">
              <PhoneCall className="w-5 h-5" />
              <h4>Tổng đài hỗ trợ 24/7</h4>
            </div>
            <div className="space-y-2 text-xs sm:text-sm">
              <p className="flex justify-between"><span className="text-neutral-600">Hotline Bệnh viện:</span> <span className="font-extrabold text-[#1E2939]">1900 1234</span></p>
              <p className="flex justify-between"><span className="text-neutral-600">Cấp cứu trực tiếp:</span> <span className="font-extrabold text-rose-600">(028) 3838 9999</span></p>
              <p className="flex justify-between"><span className="text-neutral-600">Hỗ trợ BHYT:</span> <span className="font-extrabold text-[#1E2939]">1900 5678</span></p>
            </div>
          </div>
        </div>

        {/* Emergency Notice */}
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 sm:p-5 flex items-start gap-3 sm:gap-4 text-rose-900 text-xs font-semibold leading-relaxed">
          <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-bold text-xs sm:text-sm text-rose-800 mb-1">TRƯỜNG HỢP CẤP CỨU KHẨN CẤP</h5>
            <p>
              Nếu bệnh nhân có biểu hiện khó thở nặng, đau ngực dữ dội, ngất xỉu hoặc chấn thương nặng, vui lòng báo ngay cho nhân viên y tế trực gần nhất hoặc đến thẳng **Phòng Cấp cứu (P.100)** mà không cần bấm số qua Kiosk.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <PrimaryButton onClick={goHome}>
            Quay về trang chủ
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};
