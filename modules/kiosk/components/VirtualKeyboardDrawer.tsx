'use client';

import React from 'react';
import { useVirtualKeyboardStore } from '../store/virtualKeyboardStore';
import { Delete, Check, Space, RotateCcw, ChevronDown } from 'lucide-react';

export const VirtualKeyboardDrawer: React.FC = () => {
  const {
    isOpen,
    closeKeyboard,
    appendChar,
    backspace,
    clear,
    submit,
  } = useVirtualKeyboardStore();

  if (!isOpen) return null;

  const row1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
  const row2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
  const row3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end bg-transparent select-none pointer-events-none">
      {/* Backdrop touch to close */}
      <div className="flex-1 w-full pointer-events-auto" onClick={closeKeyboard} />

      {/* Main Keyboard Panel */}
      <div className="w-full max-w-5xl mx-auto bg-white/98 backdrop-blur-md border-t border-x border-neutral-200/90 rounded-t-[36px] shadow-[0_-16px_48px_rgba(0,0,0,0.22)] p-4 sm:p-5 flex flex-col gap-2.5 animate-in slide-in-from-bottom-full duration-300 pointer-events-auto">
        {/* Top Handle / Close Pill */}
        <div className="flex items-center justify-center -mt-1 pb-1">
          <button
            type="button"
            onClick={closeKeyboard}
            className="flex items-center gap-1.5 px-4 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-500 hover:text-neutral-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Đóng bàn phím"
          >
            <ChevronDown className="w-4 h-4" />
            <span>Thu gọn bàn phím</span>
          </button>
        </div>

        {/* Keyboard Keys Layout */}
        <div className="flex flex-col gap-2">
          {/* Row 1: QWERTY */}
          <div className="flex justify-center gap-1.5 sm:gap-2">
            {row1.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => appendChar(char.toLowerCase())}
                className="flex-1 h-12 sm:h-14 bg-white hover:bg-blue-50 active:bg-blue-200 active:scale-90 border border-neutral-200/90 rounded-2xl text-base sm:text-lg font-black text-[#1E2939] transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                {char}
              </button>
            ))}
          </div>

          {/* Row 2: ASDFGHJKL */}
          <div className="flex justify-center gap-1.5 sm:gap-2 px-3 sm:px-6">
            {row2.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => appendChar(char.toLowerCase())}
                className="flex-1 h-12 sm:h-14 bg-white hover:bg-blue-50 active:bg-blue-200 active:scale-90 border border-neutral-200/90 rounded-2xl text-base sm:text-lg font-black text-[#1E2939] transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                {char}
              </button>
            ))}
          </div>

          {/* Row 3: ZXCVBNM */}
          <div className="flex justify-center gap-1.5 sm:gap-2 px-8 sm:px-12">
            {row3.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => appendChar(char.toLowerCase())}
                className="flex-1 h-12 sm:h-14 bg-white hover:bg-blue-50 active:bg-blue-200 active:scale-90 border border-neutral-200/90 rounded-2xl text-base sm:text-lg font-black text-[#1E2939] transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                {char}
              </button>
            ))}
          </div>

          {/* Row 4: Space, Backspace, Clear, Submit */}
          <div className="flex justify-center items-center gap-2 pt-1">
            <button
              type="button"
              onClick={clear}
              className="px-4 sm:px-6 h-12 sm:h-14 bg-neutral-100 hover:bg-neutral-200 active:scale-95 border border-neutral-200 rounded-2xl text-xs sm:text-sm font-extrabold text-neutral-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Xóa hết</span>
            </button>

            <button
              type="button"
              onClick={() => appendChar(' ')}
              className="flex-1 h-12 sm:h-14 bg-white hover:bg-blue-50 active:bg-blue-100 active:scale-95 border border-neutral-300 rounded-2xl text-sm font-black text-neutral-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Space className="w-5 h-5 text-neutral-400" />
              <span>Dấu cách (Space)</span>
            </button>

            <button
              type="button"
              onClick={backspace}
              className="px-5 sm:px-8 h-12 sm:h-14 bg-neutral-100 hover:bg-rose-50 active:bg-rose-100 active:scale-95 border border-neutral-200 text-neutral-700 hover:text-rose-600 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Delete className="w-5 h-5" />
              <span>Xóa</span>
            </button>

            <button
              type="button"
              onClick={submit}
              className="px-6 sm:px-10 h-12 sm:h-14 bg-[#155DFC] hover:bg-blue-700 active:scale-95 text-white rounded-2xl text-xs sm:text-base font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/25"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>Xác nhận</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
