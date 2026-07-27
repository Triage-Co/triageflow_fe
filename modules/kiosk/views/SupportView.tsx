import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { PrimaryButton } from '../components/PrimaryButton';
import { ArrowLeft, PhoneCall, HelpCircle, ShieldAlert, FileText, Info } from 'lucide-react';

export const SupportView: React.FC = () => {
  const goHome = useKioskStore((state) => state.goHome);

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
        <span className="text-xs font-bold text-[#155DFC]">TRUNG TÂM HỖ TRỢ KHÁCH HÀNG</span>
      </div>

      <div className="bg-white rounded-[32px] p-8 shadow-xl border border-neutral-100 space-y-6">
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
          <HelpCircle className="w-6 h-6 text-[#155DFC]" />
          <h2 className="text-xl font-extrabold text-[#1E2939]">Thông tin trợ giúp & Hướng dẫn sử dụng Kiosk</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Support Hotlines */}
          <div className="bg-blue-50/60 rounded-2xl p-6 border border-blue-100 space-y-4">
            <div className="flex items-center gap-3 text-[#155DFC] font-bold">
              <PhoneCall className="w-5 h-5" />
              <h4>Tổng đài hỗ trợ 24/7</h4>
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex justify-between"><span className="text-neutral-600">Hotline Bệnh viện:</span> <span className="font-extrabold text-[#1E2939]">1900 1234</span></p>
              <p className="flex justify-between"><span className="text-neutral-600">Cấp cứu trực tiếp:</span> <span className="font-extrabold text-rose-600">(028) 3838 9999</span></p>
              <p className="flex justify-between"><span className="text-neutral-600">Hỗ trợ BHYT:</span> <span className="font-extrabold text-[#1E2939]">1900 5678</span></p>
            </div>
          </div>

          {/* Quick FAQ */}
          <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-100 space-y-4">
            <div className="flex items-center gap-3 text-neutral-800 font-bold">
              <FileText className="w-5 h-5 text-[#155DFC]" />
              <h4>Câu hỏi thường gặp</h4>
            </div>
            <div className="space-y-2 text-xs text-neutral-600 font-medium">
              <p>• <strong>Không có thẻ CCCD?</strong> Bạn có thể sử dụng mã QR trên ứng dụng VNeID mức độ 2.</p>
              <p>• <strong>Phiếu khám bị mờ / mất?</strong> Đến quầy đón tiếp số 01 để nhân viên in lại miễn phí.</p>
              <p>• <strong>Muốn đổi phòng khám?</strong> Vui lòng hủy số thứ tự hiện tại tại quầy dịch vụ.</p>
            </div>
          </div>
        </div>

        {/* Emergency Notice */}
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex items-start gap-4 text-rose-900 text-xs font-semibold leading-relaxed">
          <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-bold text-sm text-rose-800 mb-1">TRƯỜNG HỢP CẤP CỨU KHẨN CẤP</h5>
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
