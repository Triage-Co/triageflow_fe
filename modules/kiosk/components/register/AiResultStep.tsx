import { useKioskStore } from '../../store/kioskStore';
import { useTriageStore } from '../../store/triageStore';
import { useBookingStore } from '../../store/bookingStore';
import { AIRegisterStep } from '../../types/kiosk.types';
import { CheckCircle2, Sparkles, Loader2 } from 'lucide-react';

export const AiResultStep: React.FC = () => {
  const recommendedSpecialists = useTriageStore((state) => state.recommendedSpecialists);
  const isBookingProcessing = useBookingStore((state) => state.isBookingProcessing);
  const executeAutoBooking = useBookingStore((state) => state.executeAutoBooking);
  const fetchDoctorsAndSlots = useBookingStore((state) => state.fetchDoctorsAndSlots);
  const setAIRegisterStep = useKioskStore((state) => state.setAIRegisterStep);

  const handleGoToDoctorSelect = () => {
    const mainSpecialtyCode = recommendedSpecialists[0]?.specialty_code || 'SP_20';
    fetchDoctorsAndSlots(mainSpecialtyCode);
    setAIRegisterStep('doctor_select' as AIRegisterStep);
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col justify-between">
      <div className="bg-[#74A4F6] text-white rounded-[36px] p-8 shadow-xl flex flex-col items-center text-center space-y-3 relative overflow-hidden">
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-md mb-1">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Phân tích hoàn tất!</h2>
        <p className="text-xs font-extrabold text-blue-100 bg-white/10 px-5 py-2 rounded-full backdrop-blur-md border border-white/20">
          Đã xác định được chuyên khoa khám phù hợp nhất
        </p>
      </div>

      <div className="bg-white rounded-[36px] p-8 shadow-sm border border-neutral-100 space-y-5 flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 font-black text-[#1E2939] border-b border-neutral-100 pb-4 text-base">
          <Sparkles className="w-5 h-5 text-[#74A4F6]" />
          <span>Chuyên khoa gợi ý ưu tiên cho bạn:</span>
        </div>

        <div className="space-y-3">
          {recommendedSpecialists.length > 0 ? (
            recommendedSpecialists.map((spec, idx) => (
              <div
                key={spec.id || idx}
                className="p-5 rounded-2xl border flex items-center justify-between transition-all bg-emerald-50/50 border-emerald-200 text-emerald-900 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xs">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base tracking-tight">{spec.name}</h4>
                    <p className="text-[11px] text-neutral-400 font-semibold mt-0.5">
                      Chẩn đoán ưu tiên cao nhất dựa trên thuật toán AI
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-4 py-1.5 bg-white text-emerald-700 rounded-full border border-emerald-100 shadow-2xs">
                  {spec.specialty_code || 'Chuyên khoa'}
                </span>
              </div>
            ))
          ) : (
            <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center gap-3">
              <span className="text-xl">👨‍⚕️</span>
              <div>
                <h4 className="font-extrabold text-base">Nội Tổng Quát</h4>
                <p className="text-[11px] text-blue-500 font-bold mt-0.5">Hệ thống tự động điều hướng sang chuyên khoa Nội Tổng Quát</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2 LỰA CHỌN: XẾP PHÒNG TỰ ĐỘNG HOẶC TỰ CHỌN BÁC SĨ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={executeAutoBooking}
          disabled={isBookingProcessing}
          className="w-full py-4 rounded-full bg-[#155DFC] hover:bg-blue-700 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isBookingProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Đang xếp phòng tự động...
            </>
          ) : (
            <>
              ⚡ Xếp phòng tự động (Khuyên dùng)
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleGoToDoctorSelect}
          disabled={isBookingProcessing}
          className="w-full py-4 rounded-full bg-white text-[#155DFC] border border-blue-200 font-extrabold text-sm shadow-sm hover:bg-blue-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          👨‍⚕️ Tự chọn Bác sĩ & Khung giờ
        </button>
      </div>
    </div>
  );
};
