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
  { id: 'quiz_detail', stepNo: 2, label: 'Câu hỏi chi tiết' },
  { id: 'ai_result', stepNo: 3, label: 'Phân tích AI' },
  { id: 'doctor_select', stepNo: 4, label: 'Chọn bác sĩ' },
];

const STEP_ORDER: Record<AIRegisterStep, number> = {
  body_select: 1,
  symptom_select: 1,
  quiz_detail: 2,
  ai_result: 3,
  doctor_select: 4,
  confirm_info: 5
};

export const RegisterStepper: React.FC<RegisterStepperProps> = ({ currentStep }) => {
  const currentStepNum = STEP_ORDER[currentStep] || 1;

  return (
    <div className="w-64 bg-white rounded-[36px] p-8 shadow-sm border border-neutral-100/80 flex flex-col justify-between shrink-0 self-stretch select-none">
      {STEPS.map((step, idx) => {
        const isCompleted = step.stepNo < currentStepNum;
        const isActive = step.stepNo === currentStepNum;
        const isLast = idx === STEPS.length - 1;

        return (
          <div key={step.id} className="relative flex items-center gap-4 py-2">
            {/* Connecting vertical line (Matching Figma thin soft blue) */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-5 top-12 w-0.5 h-16 transition-colors duration-300",
                  (isCompleted || isActive) ? "bg-[#A0C2F9]" : "bg-neutral-200"
                )}
              />
            )}

            {/* Circle Badge (Matching Figma double blue ring icon for step 1) */}
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold transition-all duration-300 shrink-0 z-10",
                (isCompleted || isActive)
                  ? "bg-[#5E96F6] text-white shadow-sm shadow-blue-400/30 ring-4 ring-[#D8E6FE]"
                  : "bg-[#8D95A5] text-white font-extrabold"
              )}
            >
              {(isCompleted || isActive) ? <Check className="w-5 h-5 stroke-[3]" /> : step.stepNo}
            </div>

            {/* Step Label */}
            <span
              className={cn(
                "text-xs font-extrabold transition-colors leading-snug",
                isActive && "text-[#2563EB]",
                isCompleted && "text-neutral-800",
                !isActive && !isCompleted && "text-[#8D95A5]"
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
