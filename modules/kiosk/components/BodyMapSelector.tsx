import React, { useState } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { RotateCcw } from 'lucide-react';
import MaleFront from './body-maps/MaleFront';
import MaleBack from './body-maps/MaleBack';
import FemaleFront from './body-maps/FemaleFront';
import FemaleBack from './body-maps/FemaleBack';

interface BodyMapSelectorProps {
  onRegionClick?: (partId: string) => void;
}

export const BodyMapSelector: React.FC<BodyMapSelectorProps> = ({ onRegionClick }) => {
  const selectedGender = useKioskStore((state) => state.selectedGender);
  const setGender = useKioskStore((state) => state.setGender);
  const selectedBodyPart = useKioskStore((state) => state.selectedBodyPart);
  const setSelectedBodyPart = useKioskStore((state) => state.setSelectedBodyPart);

  const [isBackView, setIsBackView] = useState<boolean>(false);

  const handleSelectPart = (partId: string) => {
    setSelectedBodyPart(partId);
    if (onRegionClick) {
      onRegionClick(partId);
    }
  };

  return (
    <div className="w-full h-full min-h-0 flex-1 bg-white rounded-[28px] sm:rounded-[36px] p-4 sm:p-6 shadow-sm border border-neutral-100/80 flex flex-col items-center justify-between select-none overflow-hidden">
      {/* Top Gender Switcher Pill */}
      <div className="w-full flex items-center justify-center pb-1.5 shrink-0">
        <div className="inline-flex p-1 bg-slate-100/90 rounded-full border border-slate-200/80 shadow-2xs">
          <button
            type="button"
            onClick={() => setGender('male')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-black transition-all cursor-pointer select-none active:scale-95 ${selectedGender === 'male'
                ? 'bg-[#155DFC] text-white shadow-sm shadow-blue-500/25'
                : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            Nam
          </button>
          <button
            type="button"
            onClick={() => setGender('female')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-black transition-all cursor-pointer select-none active:scale-95 ${selectedGender === 'female'
                ? 'bg-[#E11D48] text-white shadow-sm shadow-rose-500/25'
                : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            Nữ
          </button>
        </div>
      </div>

      {/* Main SVG Interactive Map Canvas */}
      <div className="relative w-full flex-1 min-h-0 flex items-center justify-center py-2 overflow-hidden [&>svg]:max-h-full [&>svg]:w-auto">
        {selectedGender === 'male' ? (
          isBackView ? (
            <MaleBack selectedBodyPart={selectedBodyPart} onSelectBodyPart={handleSelectPart} />
          ) : (
            <MaleFront selectedBodyPart={selectedBodyPart} onSelectBodyPart={handleSelectPart} />
          )
        ) : (
          isBackView ? (
            <FemaleBack selectedBodyPart={selectedBodyPart} onSelectBodyPart={handleSelectPart} />
          ) : (
            <FemaleFront selectedBodyPart={selectedBodyPart} onSelectBodyPart={handleSelectPart} />
          )
        )}
      </div>

      {/* Bottom Rotate Model Button */}
      <div className="w-full pt-2 pb-1 flex items-center justify-center shrink-0">
        <button
          type="button"
          onClick={() => setIsBackView(!isBackView)}
          className="flex items-center gap-2 text-[#4F80E1] hover:text-[#155DFC] font-bold text-sm sm:text-base transition-colors cursor-pointer select-none active:scale-95"
        >
          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" /> Đổi góc nhìn (Trước / Sau)
        </button>
      </div>
    </div>
  );
};
