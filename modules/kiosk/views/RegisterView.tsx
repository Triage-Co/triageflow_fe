import React, { useState, useEffect } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { useTriageStore } from '../store/triageStore';
import { RegisterStepper } from '../components/RegisterStepper';
import { BodyMapSelector } from '../components/BodyMapSelector';
import { SymptomSelectorModal } from '../modals/SymptomSelectorModal';
import {
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Loader2,
  HelpCircle,
  Clock,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIRegisterStep, DoctorItem, DoctorSlotItem } from '../types/kiosk.types';

export const RegisterView: React.FC = () => {
  // 1. KioskStore điều phối chung
  const aiRegisterStep = useKioskStore((state) => state.aiRegisterStep);
  const setAIRegisterStep = useKioskStore((state) => state.setAIRegisterStep);
  const selectedGender = useKioskStore((state) => state.selectedGender);
  const modalBodyPart = useKioskStore((state) => state.selectedBodyPart);
  const setModalBodyPart = useKioskStore((state) => state.setSelectedBodyPart);
  const goHome = useKioskStore((state) => state.goHome);

  // Dynamic Booking & Doctor State từ KioskStore
  const availableDoctors = useKioskStore((state) => state.availableDoctors);
  const availableSlots = useKioskStore((state) => state.availableSlots);
  const isDoctorLoading = useKioskStore((state) => state.isDoctorLoading);
  const isBookingProcessing = useKioskStore((state) => state.isBookingProcessing);

  const executeAutoBooking = useKioskStore((state) => state.executeAutoBooking);
  const fetchDoctorsAndSlots = useKioskStore((state) => state.fetchDoctorsAndSlots);
  const fetchSlotsForDoctor = useKioskStore((state) => state.fetchSlotsForDoctor);
  const executeManualBooking = useKioskStore((state) => state.executeManualBooking);

  // 2. TriageStore quản lý luồng hỏi động nâng cao
  const selectedSymptoms = useTriageStore((state) => state.selectedSymptoms);
  const removeSymptom = useTriageStore((state) => state.removeSymptom);
  const fetchAndMergeSymptoms = useTriageStore((state) => state.fetchAndMergeSymptoms);

  const isApiLoading = useTriageStore((state) => state.isApiLoading);
  const currentQuestion = useTriageStore((state) => state.currentQuestion);
  const recommendedSpecialists = useTriageStore((state) => state.recommendedSpecialists);
  const startDiagnosisFlow = useTriageStore((state) => state.startDiagnosisFlow);
  const submitAnswersBatch = useTriageStore((state) => state.submitAnswersBatch);

  // Local selection state cho chọn bác sĩ & khung giờ
  const [selectedDoctorObj, setSelectedDoctorObj] = useState<DoctorItem | null>(null);
  const [selectedSlotObj, setSelectedSlotObj] = useState<DoctorSlotItem | null>(null);

  // Modal Control Local
  const [isSymptomModalOpen, setIsSymptomModalOpen] = useState<boolean>(false);

  // Trạng thái lưu trữ cục bộ các câu trả lời trên màn hình hiện tại
  const [localAnswers, setLocalAnswers] = useState<Record<string, 'present' | 'absent' | 'unknown'>>({});

  // Tự động làm sạch form câu trả lời cũ mỗi khi máy chủ trả về nhóm câu hỏi mới
  useEffect(() => {
    setLocalAnswers({});
  }, [currentQuestion]);

  const handleOpenRegionModal = (partId: string) => {
    setModalBodyPart(partId);
    setIsSymptomModalOpen(true);
    fetchAndMergeSymptoms(partId);
  };

  // Tải danh sách Bác sĩ động khi chuyển sang bước doctor_select
  const handleGoToDoctorSelect = () => {
    const mainSpecialtyCode = recommendedSpecialists[0]?.specialty_code || 'SP_20';
    fetchDoctorsAndSlots(mainSpecialtyCode);
    setAIRegisterStep('doctor_select' as AIRegisterStep);
  };

  // Chọn Bác sĩ -> Lấy ngay khung giờ trống
  const handleSelectDoctor = (doc: DoctorItem) => {
    setSelectedDoctorObj(doc);
    setSelectedSlotObj(null);
    fetchSlotsForDoctor(doc.doctor_id);
  };

  // Kiểm tra xem tất cả câu hỏi con hiển thị trên màn hình đã được tích chọn hay chưa
  const isAllAnswered = currentQuestion?.items
    ? currentQuestion.items.every((item: any) => localAnswers[item.id])
    : false;

  // Thực hiện đóng gói dữ liệu và đẩy lên API khi nhấn nút "Tiếp tục" cuối trang
  const handleNextQuestion = () => {
    const formattedAnswers = Object.entries(localAnswers).map(([id, choiceId]) => ({
      id,
      choice_id: choiceId
    }));
    submitAnswersBatch(formattedAnswers);
  };

  return (
    <div className="w-full min-h-screen p-6 lg:p-8 z-10 select-none flex flex-col justify-between space-y-6">

      {/* Top Header Bar */}
      <div className="flex items-center gap-4">
        <button
          onClick={goHome}
          className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-xl text-xs font-bold text-neutral-800 shadow-sm border border-neutral-100/80 hover:bg-neutral-50 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <h2 className="text-2xl lg:text-3xl font-black text-[#1E2939] tracking-tight ml-2">
          {aiRegisterStep === 'quiz_detail'
            ? 'Khảo sát triệu chứng nâng cao'
            : aiRegisterStep === 'ai_result'
              ? 'Kết quả khuyến nghị chuyên khoa'
              : aiRegisterStep === 'doctor_select'
                ? 'Chọn Bác sĩ & Khung giờ khám'
                : 'Chọn vùng & triệu chứng đau'}
        </h2>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 items-stretch min-h-[580px]">
        {/* Left Stepper Sidebar */}
        <RegisterStepper currentStep={aiRegisterStep} />

        {/* STEP 1: BODY SELECT CANVAS */}
        {aiRegisterStep === 'body_select' && (
          <>
            <div className="flex-1 flex flex-col self-stretch">
              <BodyMapSelector onRegionClick={handleOpenRegionModal} />
            </div>

            {/* Right Sidebar Area */}
            <div className="w-full lg:w-80 shrink-0 flex flex-col justify-between space-y-5 h-full">
              <div className="bg-white rounded-[36px] p-6 shadow-sm border border-neutral-100/80 space-y-4">
                <h3 className="font-extrabold text-[#1E2939] text-base">
                  Triệu chứng đã chọn ({selectedSymptoms.length})
                </h3>

                <div className="space-y-3 max-h-56 overflow-y-auto">
                  {selectedSymptoms.length > 0 ? (
                    selectedSymptoms.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-[#D8E6FE] px-5 py-3.5 rounded-2xl text-xs font-extrabold text-[#1E2939]"
                      >
                        <span className="truncate max-w-[180px]">{item.labelVn}</span>
                        <button
                          type="button"
                          onClick={() => removeSymptom(item.id)}
                          className="text-neutral-600 hover:text-rose-600 font-bold cursor-pointer text-xs ml-2 shrink-0"
                        >
                          Xóa
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-neutral-400 italic bg-neutral-50 p-4 rounded-2xl border border-neutral-100 text-center">
                      Chưa chọn triệu chứng nào. Nhấp vào hình cơ thể để chọn triệu chứng.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#EBF3FF] rounded-[28px] p-6 text-xs text-neutral-600 font-semibold text-center leading-relaxed">
                <strong>Lưu ý:</strong> Bạn có thể chọn nhiều triệu chứng đau. Hệ thống AI sẽ phân tích và đề xuất chuyên khoa phù hợp.
              </div>

              <button
                type="button"
                onClick={startDiagnosisFlow}
                disabled={selectedSymptoms.length === 0 || isApiLoading}
                className={cn(
                  "w-full py-4 rounded-full text-white font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer",
                  selectedSymptoms.length > 0 && !isApiLoading ? "bg-[#74A4F6] hover:bg-[#2563EB]" : "bg-neutral-300 cursor-not-allowed"
                )}
              >
                {isApiLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang chuẩn bị khảo sát...
                  </>
                ) : (
                  "Tiếp tục →"
                )}
              </button>
            </div>
          </>
        )}

        {/* STEP 2: CÂU HỎI ĐỘNG */}
        {aiRegisterStep === 'quiz_detail' && (
          <div className="flex-1 flex flex-col justify-between space-y-6">
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-neutral-100/80 space-y-6 flex-1 flex flex-col justify-between items-center relative min-h-[460px]">

              {isApiLoading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-[32px]">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-10 h-10 text-[#74A4F6] animate-spin" />
                    <span className="text-xs font-bold text-neutral-500">Hệ thống AI đang phân tích...</span>
                  </div>
                </div>
              )}

              {currentQuestion ? (
                <div className="w-full max-w-2xl space-y-6 text-center animate-in fade-in duration-300 flex-1 flex flex-col justify-center">
                  <div className="w-16 h-16 rounded-full bg-blue-50 text-[#74A4F6] flex items-center justify-center mx-auto shadow-sm mb-2">
                    <HelpCircle className="w-8 h-8" />
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-[#1E2939] leading-snug tracking-tight px-4 mb-4">
                    {currentQuestion.text}
                  </h3>

                  {currentQuestion.items && currentQuestion.items.length === 1 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4">
                      {currentQuestion.items[0].choices.map((choice: any) => {
                        const isSelected = localAnswers[currentQuestion.items[0].id] === choice.id;
                        return (
                          <button
                            key={choice.id}
                            type="button"
                            onClick={() => setLocalAnswers({ [currentQuestion.items[0].id]: choice.id })}
                            className={cn(
                              "py-4 px-6 rounded-2xl text-sm font-extrabold border shadow-sm transition-all cursor-pointer active:scale-98 text-center",
                              isSelected
                                ? "bg-[#2563EB] border-[#2563EB] text-white hover:bg-blue-700"
                                : "bg-white border-neutral-200 text-neutral-700 hover:bg-blue-50 hover:border-[#74A4F6] hover:text-[#2563EB]"
                            )}
                          >
                            {choice.label === 'Yes' || choice.id === 'present' ? 'Có / Đúng' : choice.label === 'No' || choice.id === 'absent' ? 'Không' : 'Không rõ / Chưa biết'}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pt-2 px-2 custom-scrollbar">
                      {currentQuestion.items && currentQuestion.items.map((item: any) => (
                        <div
                          key={item.id}
                          className="bg-neutral-50/70 p-4 rounded-2xl border border-neutral-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all hover:bg-neutral-50 hover:border-neutral-200"
                        >
                          <span className="font-extrabold text-neutral-700 text-sm text-left leading-snug flex-1">
                            {item.name}
                          </span>
                          <div className="grid grid-cols-3 gap-2 shrink-0 w-full sm:w-auto">
                            {item.choices.map((choice: any) => {
                              const isSelected = localAnswers[item.id] === choice.id;
                              return (
                                <button
                                  key={choice.id}
                                  type="button"
                                  onClick={() => setLocalAnswers(prev => ({ ...prev, [item.id]: choice.id }))}
                                  className={cn(
                                    "py-2.5 px-3 rounded-xl text-xs font-black border shadow-sm transition-all cursor-pointer active:scale-95 text-center min-w-[75px]",
                                    isSelected
                                      ? "bg-[#2563EB] border-[#2563EB] text-white hover:bg-blue-700"
                                      : "bg-white border-neutral-200 text-neutral-600 hover:bg-blue-50 hover:border-[#74A4F6] hover:text-[#2563EB]"
                                  )}
                                >
                                  {choice.label === 'Yes' || choice.id === 'present' ? 'Có' : choice.label === 'No' || choice.id === 'absent' ? 'Không' : 'Không rõ'}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center italic text-neutral-400 text-xs my-auto">
                  Không tìm thấy câu hỏi tiếp theo từ máy chủ.
                </div>
              )}

              {currentQuestion && (
                <div className="w-full max-w-md pt-4 shrink-0">
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    disabled={!isAllAnswered || isApiLoading}
                    className={cn(
                      "w-full py-3.5 rounded-full text-white font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer",
                      isAllAnswered && !isApiLoading ? "bg-[#74A4F6] hover:bg-[#2563EB]" : "bg-neutral-300 cursor-not-allowed"
                    )}
                  >
                    {isApiLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Đang gửi đáp án...
                      </>
                    ) : (
                      "Tiếp tục câu hỏi →"
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="text-center text-[11px] text-neutral-400 font-medium shrink-0">
              * Vui lòng trả lời trung thực để hệ thống hỗ trợ chỉ định chuyên khoa chính xác nhất.
            </div>
          </div>
        )}

        {/* STEP 3: KẾT QUẢ ĐỀ XUẤT CHUYÊN KHOA AI & NÚT XẾP PHÒNG TỰ ĐỘNG */}
        {aiRegisterStep === 'ai_result' && (
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
        )}

        {/* STEP 4: CHỌN BÁC SĨ & KHUNG GIỜ ĐỘNG TỪ API */}
        {aiRegisterStep === 'doctor_select' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            {/* Cột trái: Danh sách Bác sĩ thực tế */}
            <div className="lg:col-span-7 space-y-4 overflow-y-auto max-h-[500px] pr-1">
              <h3 className="font-extrabold text-[#1E2939] text-base">Danh sách Bác sĩ sẵn sàng</h3>
              
              {isDoctorLoading && availableDoctors.length === 0 ? (
                <div className="flex items-center justify-center p-12 bg-white rounded-3xl border border-neutral-100">
                  <Loader2 className="w-8 h-8 text-[#155DFC] animate-spin" />
                  <span className="text-xs font-bold text-neutral-500 ml-2">Đang tải danh sách Bác sĩ...</span>
                </div>
              ) : availableDoctors.length > 0 ? (
                availableDoctors.map((doc) => {
                  const isSelected = selectedDoctorObj?.doctor_id === doc.doctor_id;
                  return (
                    <button
                      key={doc.doctor_id}
                      onClick={() => handleSelectDoctor(doc)}
                      className={cn(
                        "w-full p-5 rounded-[24px] border text-left flex items-start gap-4 transition-all cursor-pointer",
                        isSelected
                          ? "bg-blue-50/80 border-[#74A4F6] ring-2 ring-blue-200 shadow-md"
                          : "bg-white border-neutral-100 hover:border-neutral-200"
                      )}
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-[#74A4F6] flex items-center justify-center font-bold text-lg shrink-0">👨‍⚕️</div>
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-[#1E2939] text-sm">{doc.full_name}</h4>
                        <p className="text-xs text-neutral-500 font-medium">{doc.specialty_name || 'Chuyên khoa'}</p>
                        <p className="text-[11px] text-neutral-400">Phòng {doc.room_name || 'Đang xếp'} • Giấy phép: {doc.license_number || '--'}</p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-8 bg-neutral-50 rounded-3xl border border-neutral-100 text-center text-xs font-bold text-neutral-500">
                  Không tìm thấy bác sĩ khả dụng cho chuyên khoa này. Bạn có thể sử dụng tính năng Xếp phòng tự động.
                  <button
                    onClick={executeAutoBooking}
                    className="mt-3 block mx-auto px-4 py-2 bg-[#155DFC] text-white rounded-xl font-bold text-xs"
                  >
                    ⚡ Xếp phòng tự động ngay
                  </button>
                </div>
              )}
            </div>

            {/* Cột phải: Bác sĩ đã chọn & Khung giờ trống */}
            <div className="lg:col-span-5 bg-white rounded-[36px] p-6 shadow-sm border border-neutral-100 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="font-extrabold text-[#1E2939] text-sm">Bác sĩ & Khung giờ đã chọn</h3>

                {selectedDoctorObj ? (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center text-center space-y-2 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-[#74A4F6] flex items-center justify-center font-bold text-xl">👨‍⚕️</div>
                      <div>
                        <h4 className="font-black text-[#1E2939] text-sm">{selectedDoctorObj.full_name}</h4>
                        <p className="text-xs text-neutral-500 font-bold">{selectedDoctorObj.specialty_name || 'Chuyên khoa'}</p>
                      </div>
                    </div>

                    {/* Danh sách Khung giờ trống của Bác sĩ */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-600 block">Chọn khung giờ khám:</label>
                      
                      {isDoctorLoading ? (
                        <div className="text-center py-4 text-xs font-bold text-neutral-400">Đang tải khung giờ...</div>
                      ) : availableSlots.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1">
                          {availableSlots.map((slot) => {
                            const isSlotSelected = selectedSlotObj?.slot_id === slot.slot_id;
                            return (
                              <button
                                key={slot.slot_id}
                                onClick={() => setSelectedSlotObj(slot)}
                                className={cn(
                                  "py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1 cursor-pointer",
                                  isSlotSelected
                                    ? "bg-[#155DFC] text-white border-[#155DFC]"
                                    : "bg-white border-neutral-200 text-neutral-700 hover:bg-blue-50"
                                )}
                              >
                                <Clock className="w-3.5 h-3.5" /> {slot.start_time || '08:00'}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-neutral-400 italic p-3 bg-neutral-50 rounded-xl text-center">
                          Vẫn còn suất khám mặc định cho ngày hôm nay.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-neutral-400 italic p-6 bg-neutral-50 rounded-2xl text-center border border-neutral-100">
                    Vui lòng chọn một bác sĩ từ danh sách bên trái.
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  if (selectedSlotObj?.slot_id) {
                    executeManualBooking(selectedSlotObj.slot_id);
                  } else {
                    executeAutoBooking();
                  }
                }}
                disabled={!selectedDoctorObj || isBookingProcessing}
                className={cn(
                  "w-full py-4 rounded-full text-white font-bold text-base shadow-md transition-all cursor-pointer flex items-center justify-center gap-2",
                  selectedDoctorObj && !isBookingProcessing ? "bg-[#74A4F6] hover:bg-[#2563EB]" : "bg-neutral-300 cursor-not-allowed"
                )}
              >
                {isBookingProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang đăng ký...
                  </>
                ) : (
                  "Xác nhận đặt lịch →"
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <SymptomSelectorModal
        isOpen={isSymptomModalOpen}
        onClose={() => setIsSymptomModalOpen(false)}
        bodyPartIdOrName={modalBodyPart}
        gender={selectedGender}
      />
    </div>
  );
};