import React from 'react';
import { useKioskStore, MOCK_DOCTORS } from '../store/kioskStore';
import { RegisterStepper } from '../components/RegisterStepper';
import { BodySelector } from '../components/BodySelector';
import { PrimaryButton } from '../components/PrimaryButton';
import { 
  ArrowLeft, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  User, 
  Clock, 
  MapPin,
  Flame,
  Zap,
  Activity,
  HeartPulse
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const RegisterView: React.FC = () => {
  const aiRegisterStep = useKioskStore((state) => state.aiRegisterStep);
  const setAIRegisterStep = useKioskStore((state) => state.setAIRegisterStep);
  const selectedBodyParts = useKioskStore((state) => state.selectedBodyParts);
  const removeBodyPart = useKioskStore((state) => state.removeBodyPart);
  const selectedSymptoms = useKioskStore((state) => state.selectedSymptoms);
  const toggleSymptom = useKioskStore((state) => state.toggleSymptom);
  const removeSymptom = useKioskStore((state) => state.removeSymptom);
  const symptomDuration = useKioskStore((state) => state.symptomDuration);
  const setSymptomDuration = useKioskStore((state) => state.setSymptomDuration);
  const painLevel = useKioskStore((state) => state.painLevel);
  const setPainLevel = useKioskStore((state) => state.setPainLevel);
  const hasEmergency = useKioskStore((state) => state.hasEmergency);
  const setHasEmergency = useKioskStore((state) => state.setHasEmergency);
  const aiAnalysisResult = useKioskStore((state) => state.aiAnalysisResult);
  const selectedDoctor = useKioskStore((state) => state.selectedDoctor);
  const setSelectedDoctor = useKioskStore((state) => state.setSelectedDoctor);
  const runAIAnalysis = useKioskStore((state) => state.runAIAnalysis);
  const confirmRegistration = useKioskStore((state) => state.confirmRegistration);
  const goHome = useKioskStore((state) => state.goHome);
  const navigateToView = useKioskStore((state) => state.navigateToView);

  const commonSymptoms = [
    { name: 'Nổi mẩn đỏ', icon: Flame },
    { name: 'Rát', icon: Zap },
    { name: 'Tê bì', icon: Activity },
    { name: 'Sưng tấy', icon: HeartPulse },
    { name: 'Đau Nhức', icon: Activity },
    { name: 'Bầm tím', icon: HeartPulse }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-6 z-10 space-y-5">
      {/* Header bar */}
      <div className="flex items-center gap-4">
        <button 
          onClick={goHome} 
          className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full text-xs font-bold text-neutral-700 shadow-sm border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <h2 className="text-2xl font-black text-[#1E2939] tracking-tight">
          {aiRegisterStep === 'confirm_info' ? 'Xác nhận thông tin' : 'Phân loại triệu chứng AI'}
        </h2>
      </div>

      {/* Main Container Layout with Stepper Sidebar */}
      {aiRegisterStep !== 'confirm_info' ? (
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Stepper Sidebar */}
          <RegisterStepper currentStep={aiRegisterStep} />

          {/* Right Main Step Content */}
          <div className="flex-1 space-y-6">

            {/* STEP 1: CHỌN VÙNG ĐAU */}
            {aiRegisterStep === 'body_select' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <BodySelector />
                </div>

                <div className="lg:col-span-4 bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <h3 className="font-extrabold text-[#1E2939] text-sm">Vùng đã chọn ({selectedBodyParts.length})</h3>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedBodyParts.map((part) => (
                        <div key={part} className="flex items-center justify-between bg-blue-50/70 border border-blue-100 px-4 py-2.5 rounded-2xl text-xs font-bold text-[#1E2939]">
                          <span>{part}</span>
                          <button onClick={() => removeBodyPart(part)} className="text-neutral-400 hover:text-rose-500 cursor-pointer">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 text-[11px] text-neutral-500 font-medium leading-relaxed">
                      Lưu ý: Bạn có thể chọn nhiều vùng đau. Hệ thống AI sẽ phân tích và đề xuất chuyên khoa phù hợp.
                    </div>
                  </div>

                  <PrimaryButton 
                    onClick={() => setAIRegisterStep('symptom_select')}
                    disabled={selectedBodyParts.length === 0}
                    className="w-full"
                  >
                    Tiếp tục →
                  </PrimaryButton>
                </div>
              </div>
            )}

            {/* STEP 2: MÔ TẢ TRIỆU CHỨNG */}
            {aiRegisterStep === 'symptom_select' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 space-y-4">
                  <h3 className="font-extrabold text-[#1E2939] text-base">Triệu chứng thường gặp</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {commonSymptoms.map((sym) => {
                      const isSelected = selectedSymptoms.includes(sym.name);
                      const IconComp = sym.icon;
                      return (
                        <button
                          key={sym.name}
                          onClick={() => toggleSymptom(sym.name)}
                          className={cn(
                            "p-5 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer aspect-square",
                            isSelected 
                              ? "bg-blue-50 border-[#155DFC] text-[#155DFC] ring-2 ring-blue-200" 
                              : "bg-white border-neutral-200 hover:border-neutral-300 text-neutral-700"
                          )}
                        >
                          <IconComp className="w-6 h-6" />
                          <span className="text-xs font-bold">{sym.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-4 bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <h3 className="font-extrabold text-[#1E2939] text-sm">Triệu chứng đã chọn ({selectedSymptoms.length})</h3>
                    <div className="space-y-2">
                      {selectedSymptoms.map((sym) => (
                        <div key={sym} className="flex items-center justify-between bg-blue-50/70 border border-blue-100 px-4 py-2.5 rounded-2xl text-xs font-bold text-[#1E2939]">
                          <span>{sym}</span>
                          <button onClick={() => removeSymptom(sym)} className="text-neutral-400 hover:text-rose-500 cursor-pointer">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold text-neutral-400">Vùng đau đã chọn:</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedBodyParts.map((part) => (
                          <span key={part} className="px-2.5 py-1 bg-neutral-100 border border-neutral-200 rounded-lg text-[10px] font-bold text-neutral-600">
                            {part}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <PrimaryButton variant="outline" onClick={() => setAIRegisterStep('body_select')}>
                      Quay lại
                    </PrimaryButton>
                    <PrimaryButton onClick={() => setAIRegisterStep('quiz_detail')} className="flex-1">
                      Tiếp tục →
                    </PrimaryButton>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: CÂU HỎI CHI TIẾT */}
            {aiRegisterStep === 'quiz_detail' && (
              <div className="bg-white rounded-[28px] p-8 shadow-md border border-neutral-100 space-y-6">
                <h3 className="font-extrabold text-[#1E2939] text-lg">Chi tiết triệu chứng</h3>

                {/* Q1: Triệu chứng kéo dài bao lâu? */}
                <div className="bg-neutral-50/80 rounded-2xl p-5 border border-neutral-100 space-y-3">
                  <h4 className="font-bold text-sm text-[#1E2939]">1. Triệu chứng kéo dài bao lâu?</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['Vài giờ', '1-2 ngày', '3-7 ngày', 'Hơn 1 tuần'].map((dur) => (
                      <button
                        key={dur}
                        onClick={() => setSymptomDuration(dur)}
                        className={cn(
                          "py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                          symptomDuration === dur
                            ? "bg-[#155DFC] text-white border-[#155DFC] shadow-md shadow-blue-500/20"
                            : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                        )}
                      >
                        {dur}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q2: Mức độ đau từ 1-10 */}
                <div className="bg-neutral-50/80 rounded-2xl p-5 border border-neutral-100 space-y-3">
                  <div className="flex justify-between items-center text-sm font-bold text-[#1E2939]">
                    <span>2. Mức độ đau từ 1-10</span>
                    <span className="text-[#155DFC] bg-blue-50 px-3 py-1 rounded-full border border-blue-100 text-xs">
                      Đau mức {painLevel}/10
                    </span>
                  </div>
                  <div className="flex items-center gap-4 pt-2">
                    <span className="text-xs font-bold text-neutral-400">Nhẹ (1)</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={painLevel} 
                      onChange={(e) => setPainLevel(parseInt(e.target.value))}
                      className="flex-1 accent-[#155DFC] h-2 bg-neutral-200 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs font-bold text-neutral-400">Nặng (10)</span>
                  </div>
                </div>

                {/* Q3: Dấu hiệu khẩn cấp */}
                <div className="bg-rose-50/50 rounded-2xl p-5 border border-rose-100 space-y-3">
                  <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    <span>3. Bạn có gặp các triệu chứng khẩn cấp sau không?</span>
                  </div>
                  <p className="text-xs text-neutral-500">Đau ngực dữ dội, khó thở nghiêm trọng, mất ý thức, co giật</p>
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <button
                      onClick={() => setHasEmergency(true)}
                      className={cn(
                        "py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                        hasEmergency 
                          ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20" 
                          : "bg-white text-rose-600 border-rose-200 hover:bg-rose-50"
                      )}
                    >
                      Có - Cần cấp cứu ngay
                    </button>
                    <button
                      onClick={() => setHasEmergency(false)}
                      className={cn(
                        "py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                        !hasEmergency 
                          ? "bg-[#1E2939] text-white border-[#1E2939]" 
                          : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                      )}
                    >
                      Không
                    </button>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <PrimaryButton variant="outline" onClick={() => setAIRegisterStep('symptom_select')}>
                    Quay lại
                  </PrimaryButton>
                  <PrimaryButton onClick={runAIAnalysis}>
                    <Sparkles className="w-4 h-4" /> Phân tích AI →
                  </PrimaryButton>
                </div>
              </div>
            )}

            {/* STEP 4: PHÂN TÍCH AI */}
            {aiRegisterStep === 'ai_result' && (
              <div className="space-y-6">
                {/* Recommendation Banner */}
                <div className="bg-[#4F80E1] text-white rounded-[28px] p-8 shadow-xl flex flex-col items-center text-center space-y-3 relative overflow-hidden">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-md mb-1">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">
                    Khuyến nghị: {aiAnalysisResult?.recommendedSpecialty || 'Nội Tổng Quát'}
                  </h2>
                  <p className="text-xs font-semibold text-blue-100 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/20">
                    Mức độ ưu tiên: {aiAnalysisResult?.priority || 'Thường'}
                  </p>
                </div>

                {/* AI Analysis Details */}
                <div className="bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 space-y-4">
                  <div className="flex items-center gap-2 font-bold text-[#1E2939] border-b border-neutral-100 pb-3">
                    <Sparkles className="w-5 h-5 text-[#155DFC]" />
                    <span>Phân tích của AI</span>
                  </div>

                  <div className="space-y-3 text-xs font-semibold text-neutral-700">
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#155DFC]" /> Triệu chứng chính: {selectedSymptoms.join(', ') || 'đau đầu, sốt'}</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#155DFC]" /> Mức độ đau: {painLevel}/10</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#155DFC]" /> Thời gian: {symptomDuration}</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#155DFC]" /> {hasEmergency ? '⚠️ Có dấu hiệu khẩn cấp' : 'Không có dấu hiệu khẩn cấp'}</div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <PrimaryButton onClick={() => setAIRegisterStep('doctor_select')} className="flex-1">
                    Chọn bác sĩ →
                  </PrimaryButton>
                  <PrimaryButton onClick={confirmRegistration} variant="secondary" className="flex-1">
                    Bỏ qua →
                  </PrimaryButton>
                </div>
              </div>
            )}

            {/* STEP 5: CHỌN BÁC SĨ */}
            {aiRegisterStep === 'doctor_select' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Doctor List */}
                <div className="lg:col-span-7 space-y-4">
                  <h3 className="font-extrabold text-[#1E2939] text-base">Danh sách Bác sĩ sẵn sàng</h3>
                  {MOCK_DOCTORS.map((doc) => {
                    const isSelected = selectedDoctor?.id === doc.id;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedDoctor(doc)}
                        className={cn(
                          "w-full p-5 rounded-[24px] border text-left flex items-start gap-4 transition-all cursor-pointer",
                          isSelected
                            ? "bg-blue-50/80 border-[#155DFC] ring-2 ring-blue-200 shadow-md"
                            : "bg-white border-neutral-100 hover:border-neutral-200"
                        )}
                      >
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-[#155DFC] flex items-center justify-center font-bold text-lg shrink-0">
                          👨‍⚕️
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-[#1E2939] text-sm">{doc.name}</h4>
                          <p className="text-xs text-neutral-500 font-medium">{doc.specialty}</p>
                          <p className="text-[11px] text-neutral-400">Phòng {doc.room} • {doc.location}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Doctor Card */}
                <div className="lg:col-span-5 bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-extrabold text-[#1E2939] text-sm">Bác sĩ đã chọn</h3>

                    {selectedDoctor && (
                      <div className="flex flex-col items-center text-center space-y-3 p-6 bg-neutral-50 rounded-2xl border border-neutral-100">
                        <div className="w-16 h-16 rounded-full bg-blue-100 text-[#155DFC] flex items-center justify-center font-bold text-2xl">
                          👨‍⚕️
                        </div>
                        <div>
                          <h4 className="font-black text-[#1E2939] text-base">{selectedDoctor.name}</h4>
                          <p className="text-xs text-neutral-500 font-bold">{selectedDoctor.specialty}</p>
                        </div>
                        <div className="w-full border-t border-neutral-200 pt-3 text-xs space-y-1">
                          <div className="flex justify-between"><span className="text-neutral-400">Phòng:</span> <span className="font-bold text-[#1E2939]">{selectedDoctor.room}</span></div>
                          <div className="flex justify-between"><span className="text-neutral-400">Vị trí:</span> <span className="font-bold text-[#1E2939]">{selectedDoctor.location}</span></div>
                        </div>
                        <span className="text-xs font-bold bg-blue-50 text-[#155DFC] px-3.5 py-1 rounded-full border border-blue-100">
                          {selectedDoctor.specialty}
                        </span>
                      </div>
                    )}
                  </div>

                  <PrimaryButton onClick={confirmRegistration} className="w-full">
                    Xác nhận →
                  </PrimaryButton>
                </div>
              </div>
            )}

          </div>
        </div>
      ) : (
        /* STEP 6: XÁC NHẬN THÔNG TIN & THANH TOÁN (Full Width) */
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Banner Đăng ký thành công */}
          <div className="bg-[#4F80E1] text-white rounded-[28px] p-6 shadow-xl flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-black tracking-tight">Đăng ký thành công!</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Info Card */}
            <div className="bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 space-y-4">
              <span className="inline-block text-xs font-bold bg-blue-50 text-[#155DFC] px-3.5 py-1.5 rounded-full border border-blue-100">
                Chuyên khoa đề xuất: <strong className="font-black">Nội Tổng Quát</strong>
              </span>

              <div className="flex items-center gap-4 pt-2">
                <div className="w-14 h-14 rounded-full bg-blue-100 text-[#155DFC] flex items-center justify-center text-2xl font-bold">
                  👨‍⚕️
                </div>
                <div>
                  <h4 className="font-black text-[#1E2939] text-base">{selectedDoctor?.name || 'BS. Nguyễn Minh Tuấn'}</h4>
                  <p className="text-xs text-neutral-500 font-bold">{selectedDoctor?.specialty || 'Nội Tổng Quát'}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-neutral-100 text-xs font-semibold text-neutral-700">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#155DFC]" /> Phòng khám: {selectedDoctor?.room || 'P.204'} - {selectedDoctor?.location || 'Tầng 2 - Khu B'}</div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-[#155DFC]" /> Thời gian chờ dự kiến: ~15 phút</div>
                <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-[#155DFC]" /> Ngày khám: Hôm nay - {new Date().toLocaleDateString('vi-VN')}</div>
              </div>

              <div className="pt-4">
                <PrimaryButton variant="outline" onClick={() => setAIRegisterStep('doctor_select')} className="w-full">
                  ← Chọn lại bác sĩ
                </PrimaryButton>
              </div>
            </div>

            {/* Right Payment Card */}
            <div className="bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="font-extrabold text-[#1E2939] text-base border-b border-neutral-100 pb-3">Thông tin thanh toán</h3>
                <div className="space-y-3 text-xs font-semibold text-neutral-600">
                  <div className="flex justify-between"><span>Phí khám bệnh:</span> <span className="font-bold text-[#1E2939]">150.000 đ</span></div>
                  <div className="flex justify-between"><span>Phí dịch vụ:</span> <span className="font-bold text-[#1E2939]">50.000 đ</span></div>
                  <div className="flex justify-between border-t border-neutral-200 pt-3 text-base font-black text-[#1E2939]">
                    <span>Tổng cộng:</span>
                    <span className="text-xl text-[#155DFC]">200.000 đ</span>
                  </div>
                </div>
              </div>

              <PrimaryButton onClick={() => navigateToView('payment')} className="w-full">
                Tiếp tục thanh toán →
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
