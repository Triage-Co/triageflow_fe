import React, { useState } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export const BodySelector: React.FC = () => {
  const selectedBodyParts = useKioskStore((state) => state.selectedBodyParts);
  const toggleBodyPart = useKioskStore((state) => state.toggleBodyPart);
  const [isBackView, setIsBackView] = useState<boolean>(false);

  const bodyParts = [
    { id: 'Đầu & Cổ', label: 'Đầu & Cổ', top: '12%', left: '50%' },
    { id: 'Ngực', label: 'Ngực', top: '28%', left: '50%' },
    { id: 'Cánh tay trái', label: 'Cánh tay trái', top: '34%', left: '26%' },
    { id: 'Cánh tay phải', label: 'Cánh tay phải', top: '34%', left: '74%' },
    { id: 'Bụng', label: 'Bụng', top: '42%', left: '50%' },
    { id: 'Đùi / Chân trái', label: 'Chân trái', top: '68%', left: '42%' },
    { id: 'Đùi / Chân phải', label: 'Chân phải', top: '68%', left: '58%' },
  ];

  return (
    <div className="flex-1 bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 flex flex-col items-center justify-between relative min-h-[440px]">
      {/* 3D Model Canvas Graphic */}
      <div className="relative w-full h-[360px] flex items-center justify-center">
        {/* Human Body Blue SVG Illustration */}
        <svg 
          className="h-full max-h-[340px] text-[#4F80E1] drop-shadow-sm transition-transform duration-500" 
          viewBox="0 0 200 400" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          style={{ transform: isBackView ? 'scaleX(-1)' : 'scaleX(1)' }}
        >
          {/* Head */}
          <ellipse cx="100" cy="45" rx="22" ry="28" stroke="currentColor" strokeWidth="2.5" fill="#E8F0FE" fillOpacity="0.4" />
          {/* Neck */}
          <path d="M92 73 L92 85 M108 73 L108 85" stroke="currentColor" strokeWidth="2.5" />
          {/* Torso & Shoulders */}
          <path d="M65 95 C65 85, 135 85, 135 95 L130 200 C125 210, 75 210, 70 200 Z" stroke="currentColor" strokeWidth="2.5" fill="#E8F0FE" fillOpacity="0.3" />
          {/* Left Arm */}
          <path d="M65 95 L40 160 L32 230 C30 240, 24 240, 24 230 L35 155 L60 92" stroke="currentColor" strokeWidth="2.5" fill="#E8F0FE" fillOpacity="0.3" />
          {/* Right Arm */}
          <path d="M135 95 L160 160 L168 230 C170 240, 176 240, 176 230 L165 155 L140 92" stroke="currentColor" strokeWidth="2.5" fill="#E8F0FE" fillOpacity="0.3" />
          {/* Legs */}
          <path d="M72 205 L76 310 L70 375 C70 385, 84 385, 84 375 L92 305 L96 205" stroke="currentColor" strokeWidth="2.5" fill="#E8F0FE" fillOpacity="0.3" />
          <path d="M128 205 L124 310 L130 375 C130 385, 116 385, 116 375 L108 305 L104 205" stroke="currentColor" strokeWidth="2.5" fill="#E8F0FE" fillOpacity="0.3" />
        </svg>

        {/* Interactive Click Targets */}
        {bodyParts.map((part) => {
          const isSelected = selectedBodyParts.includes(part.id);
          return (
            <button
              key={part.id}
              onClick={() => toggleBodyPart(part.id)}
              style={{ top: part.top, left: part.left }}
              className={cn(
                "-translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 shadow-md cursor-pointer border",
                isSelected 
                  ? "bg-[#155DFC] text-white border-[#155DFC] ring-4 ring-blue-200 scale-110" 
                  : "bg-white/90 text-neutral-700 border-neutral-200 hover:border-[#155DFC] hover:text-[#155DFC]"
              )}
            >
              {isSelected ? '✓ ' : ''}{part.label}
            </button>
          );
        })}
      </div>

      {/* Rotate button */}
      <button 
        onClick={() => setIsBackView(!isBackView)}
        className="flex items-center gap-2 text-[#155DFC] hover:text-blue-700 font-bold text-xs bg-blue-50 px-4 py-2 rounded-full border border-blue-100/60 transition-colors cursor-pointer"
      >
        <RotateCw className="w-4 h-4" /> Rotate model ({isBackView ? 'Mặt sau' : 'Mặt trước'})
      </button>
    </div>
  );
};
