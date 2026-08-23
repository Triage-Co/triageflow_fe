import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { useTriageStore } from '../store/triageStore';
import { RegisterStepper } from '../components/RegisterStepper';
import { ArrowLeft } from 'lucide-react';
import { BodySelectStep } from '../components/register/BodySelectStep';
import { QuizDetailStep } from '../components/register/QuizDetailStep';
import { AiResultStep } from '../components/register/AiResultStep';
import { DoctorSelectStep } from '../components/register/DoctorSelectStep';

export const RegisterView: React.FC = () => {
  const aiRegisterStep = useKioskStore((state) => state.aiRegisterStep);
  const setAIRegisterStep = useKioskStore((state) => state.setAIRegisterStep);
  const bookingFlowMode = useKioskStore((state) => state.bookingFlowMode);
  const navigateToView = useKioskStore((state) => state.navigateToView);
  const goToPreviousQuestion = useTriageStore((state) => state.goToPreviousQuestion);

  const isDirect = bookingFlowMode === 'direct';

  const handleBack = () => {
    if (isDirect) {
      navigateToView('specialty_select');
    } else {
      switch (aiRegisterStep) {
        case 'doctor_select':
          setAIRegisterStep('ai_result');
          break;
        case 'ai_result': {
          const hasPrev = goToPreviousQuestion();
          if (hasPrev) {
            setAIRegisterStep('quiz_detail');
          } else {
            setAIRegisterStep('body_select');
          }
          break;
        }
        case 'quiz_detail': {
          const hasPrev = goToPreviousQuestion();
          if (!hasPrev) {
            setAIRegisterStep('body_select');
          }
          break;
        }
        case 'body_select':
        default:
          navigateToView('booking_mode');
          break;
      }
    }
  };

  return (
    <div className="w-full h-full min-h-0 p-4 sm:p-6 lg:p-8 z-10 select-none flex flex-col justify-between gap-4 max-w-7xl mx-auto overflow-hidden">

      {/* Top Header Bar */}
      <div className="flex items-center gap-4 shrink-0">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-neutral-50 active:scale-95 rounded-2xl text-xs font-bold text-neutral-800 shadow-sm border border-neutral-100/80 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1E2939] tracking-tight ml-2 truncate">
          {isDirect
            ? 'Chọn Bác sĩ & Khung giờ khám'
            : aiRegisterStep === 'quiz_detail'
              ? 'Khảo sát triệu chứng nâng cao'
              : aiRegisterStep === 'ai_result'
                ? 'Kết quả khuyến nghị chuyên khoa'
                : aiRegisterStep === 'doctor_select'
                  ? 'Chọn Bác sĩ & Khung giờ khám'
                  : 'Chọn vùng & triệu chứng đau'}
        </h2>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col md:flex-row gap-4 sm:gap-6 flex-1 min-h-0 items-stretch overflow-y-auto md:overflow-hidden pr-0.5 custom-scrollbar">
        {/* Left Stepper Sidebar */}
        {!isDirect && <RegisterStepper currentStep={aiRegisterStep} />}

        {/* Dynamic Step Components */}
        {aiRegisterStep === 'body_select' && <BodySelectStep />}
        {aiRegisterStep === 'quiz_detail' && <QuizDetailStep />}
        {aiRegisterStep === 'ai_result' && <AiResultStep />}
        {aiRegisterStep === 'doctor_select' && <DoctorSelectStep />}
      </div>
    </div>
  );
};