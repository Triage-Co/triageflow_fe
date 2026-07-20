import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { RegisterStepper } from '../components/RegisterStepper';
import { ArrowLeft } from 'lucide-react';
import { BodySelectStep } from '../components/register/BodySelectStep';
import { QuizDetailStep } from '../components/register/QuizDetailStep';
import { AiResultStep } from '../components/register/AiResultStep';
import { DoctorSelectStep } from '../components/register/DoctorSelectStep';

export const RegisterView: React.FC = () => {
  const aiRegisterStep = useKioskStore((state) => state.aiRegisterStep);
  const goHome = useKioskStore((state) => state.goHome);

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

        {/* Dynamic Step Components */}
        {aiRegisterStep === 'body_select' && <BodySelectStep />}
        {aiRegisterStep === 'quiz_detail' && <QuizDetailStep />}
        {aiRegisterStep === 'ai_result' && <AiResultStep />}
        {aiRegisterStep === 'doctor_select' && <DoctorSelectStep />}
      </div>
    </div>
  );
};