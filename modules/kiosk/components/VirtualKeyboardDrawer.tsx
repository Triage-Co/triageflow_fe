'use client';

import React from 'react';
import { useVirtualKeyboardStore } from '../store/virtualKeyboardStore';
import { Delete, Search, X, Check, Space, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export const VirtualKeyboardDrawer: React.FC = () => {
  const {
    isOpen,
    title,
    value,
    placeholder,
    closeKeyboard,
    appendChar,
    backspace,
    clear,
    submit,
  } = useVirtualKeyboardStore();

  if (!isOpen) return null;

  const vnKeys = ['Ă', 'Â', 'Đ', 'Ê', 'Ô', 'Ơ', 'Ư'];
  const numberKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const row1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
  const row2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
  const row3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in-0 duration-200 select-none">
      {/* Backdrop touch to close */}
      <div className="flex-1 w-full" onClick={closeKeyboard} />

      {/* Main Keyboard Panel */}
      <div className="w-full max-w-5xl mx-auto bg-white/95 backdrop-blur-xl border-t border-x border-neutral-200/80 rounded-t-[36px] shadow-2xl p-4 sm:p-6 flex flex-col gap-3.5 animate-in slide-in-from-bottom-full duration-300">
        {/* Header & Live Input Field */}
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#155DFC] flex items-center justify-center font-bold">
              <Search className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-black text-[#1E2939] uppercase tracking-wide">
              {title}
            </span>
          </div>

          <button
            type="button"
            onClick={closeKeyboard}
            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-600 rounded-full font-bold text-xs transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Đóng bàn phím</span>
          </button>
        </div>

        {/* Current Value Display Box */}
        <div className="relative flex items-center bg-neutral-50 rounded-2xl border-2 border-blue-200 px-4 py-3 shadow-inner">
          <input
            type="text"
            readOnly
            value={value}
            placeholder={placeholder}
            className="w-full bg-transparent text-base sm:text-lg font-black text-[#1E2939] placeholder:text-neutral-400 focus:outline-none"
          />
          {value && (
            <button
              type="button"
              onClick={clear}
              className="px-3 py-1 bg-neutral-200 hover:bg-neutral-300 rounded-lg text-xs font-extrabold text-neutral-600 cursor-pointer transition-all"
            >
              Xóa
            </button>
          )}
        </div>

        {/* Keyboard Keys Layout */}
        <div className="flex flex-col gap-2 pt-1">
          {/* Row 0: Vietnamese quick characters + numbers */}
          <div className="flex justify-center gap-1.5 sm:gap-2">
            {vnKeys.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => appendChar(char.toLowerCase())}
                className="flex-1 max-w-[48px] h-11 sm:h-12 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 active:scale-90 border border-amber-200 rounded-xl text-sm sm:text-base font-black text-amber-900 transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                {char}
              </button>
            ))}
            <div className="w-[1px] bg-neutral-200 mx-0.5" />
            {numberKeys.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => appendChar(num)}
                className="flex-1 max-w-[44px] h-11 sm:h-12 bg-white hover:bg-neutral-100 active:bg-blue-100 active:scale-90 border border-neutral-200 rounded-xl text-xs sm:text-sm font-extrabold text-neutral-700 transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                {num}
              </button>
            ))}
          </div>

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
