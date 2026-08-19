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
    <div className="flex-1 min-h-0 flex flex-col justify-between gap-3 sm:gap-4 overflow-hidden">
      {/* Top Banner (Fixed Tier 1) */}
      <div className="bg-[#74A4F6] text-white rounded-[28px] sm:rounded-[36px] p-4 sm:p-6 shadow-md flex flex-col items-center text-center space-y-2 relative overflow-hidden shrink-0">
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-md">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight">Phân tích hoàn tất!</h2>
        <p className="text-xs font-extrabold text-blue-100 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/20">
          Đã xác định được chuyên khoa khám phù hợp nhất
        </p>
      </div>

      {/* Recommendations List (Scrollable Tier 2) */}
      <div className="bg-white rounded-[28px] sm:rounded-[36px] p-4 sm:p-6 shadow-sm border border-neutral-100 flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
        <div className="flex items-center gap-2 font-black text-[#1E2939] border-b border-neutral-100 pb-3 text-sm sm:text-base shrink-0">
          <Sparkles className="w-4 h-4 text-[#74A4F6]" />
          <span>Chuyên khoa gợi ý ưu tiên cho bạn:</span>
        </div>

        <div className="space-y-2.5 flex-1 min-h-0 overflow-y-auto pr-1">
          {recommendedSpecialists.length > 0 ? (
            recommendedSpecialists.map((spec, idx) => (
              <div
                key={spec.id || idx}
                className="p-4 rounded-2xl border flex items-center justify-between transition-all bg-emerald-50/50 border-emerald-200 text-emerald-900 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base tracking-tight">{spec.name}</h4>
                    <p className="text-[11px] text-neutral-400 font-semibold mt-0.5">
                      Chẩn đoán ưu tiên cao nhất dựa trên thuật toán AI
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center gap-3">
              <span className="text-xl">👨‍⚕️</span>
              <div>
                <h4 className="font-extrabold text-base">Nội Tổng Quát</h4>
                <p className="text-[11px] text-blue-500 font-bold mt-0.5">Hệ thống tự động điều hướng sang chuyên khoa Nội Tổng Quát</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions (Fixed Tier 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
        <button
          type="button"
          onClick={executeAutoBooking}
          disabled={isBookingProcessing}
          className="w-full py-3.5 sm:py-4 rounded-full bg-[#155DFC] hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          {isBookingProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Đang xếp phòng tự động...
            </>
          ) : (
            <>
              Xếp phòng tự động
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleGoToDoctorSelect}
          disabled={isBookingProcessing}
          className="w-full py-3.5 sm:py-4 rounded-full bg-white text-[#155DFC] border border-blue-200 font-extrabold text-xs sm:text-sm shadow-sm hover:bg-blue-50 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          Tự chọn Bác sĩ & Khung giờ
        </button>
      </div>
    </div>
  );
};
