import React from 'react';
import { AIRegisterStep } from '../types/kiosk.types';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RegisterStepperProps {
  currentStep: AIRegisterStep;
  onStepClick?: (step: AIRegisterStep) => void;
}

const STEPS: { id: AIRegisterStep; stepNo: number; label: string }[] = [
  { id: 'body_select', stepNo: 1, label: 'Chọn vùng đau' },
  { id: 'symptom_select', stepNo: 2, label: 'Mô tả triệu chứng' },
  { id: 'quiz_detail', stepNo: 3, label: 'Câu hỏi chi tiết' },
  { id: 'ai_result', stepNo: 4, label: 'Phân tích AI' },
  { id: 'doctor_select', stepNo: 5, label: 'Chọn bác sĩ' },
];

const STEP_ORDER: Record<AIRegisterStep, number> = {
  body_select: 1,
  symptom_select: 2,
  quiz_detail: 3,
  ai_result: 4,
  doctor_select: 5,
  confirm_info: 6
};

export const RegisterStepper: React.FC<RegisterStepperProps> = ({ currentStep }) => {
  const currentStepNum = STEP_ORDER[currentStep] || 1;

  return (
    <div className="w-56 bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 flex flex-col gap-6 shrink-0 select-none">
      {STEPS.map((step, idx) => {
        const isCompleted = step.stepNo < currentStepNum;
        const isActive = step.stepNo === currentStepNum;
        const isLast = idx === STEPS.length - 1;

        return (
          <div key={step.id} className="relative flex items-center gap-3.5">
            {/* Connecting line */}
            {!isLast && (
              <div 
                className={cn(
                  "absolute left-4 top-8 w-0.5 h-7 transition-colors duration-300",
                  isCompleted ? "bg-[#155DFC]" : "bg-neutral-200"
                )} 
              />
            )}

            {/* Circle Badge */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0 z-10",
                isCompleted && "bg-[#155DFC] text-white shadow-sm shadow-blue-500/30",
                isActive && "bg-[#155DFC] text-white ring-4 ring-blue-100 shadow-md shadow-blue-500/20",
                !isCompleted && !isActive && "bg-neutral-200 text-neutral-500"
              )}
            >
              {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : step.stepNo}
            </div>

            {/* Label */}
            <span 
              className={cn(
                "text-xs font-bold transition-colors leading-snug",
                isActive && "text-[#155DFC]",
                isCompleted && "text-neutral-700",
                !isActive && !isCompleted && "text-neutral-400 font-medium"
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
