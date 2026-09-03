'use client';

import React from 'react';
import { useVirtualKeyboardStore } from '../store/virtualKeyboardStore';
import {
  Delete,
  Check,
  Space,
  RotateCcw,
  ChevronDown,
  ArrowUp,
  Languages,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export const VirtualKeyboardDrawer: React.FC = () => {
  const {
    isOpen,
    title,
    value,
    placeholder,
    isVietnameseMode,
    isCapsLock,
    closeKeyboard,
    appendChar,
    toggleVietnameseMode,
    toggleCapsLock,
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
      <div className="w-full max-w-5xl mx-auto bg-white/98 backdrop-blur-md border-t border-x border-neutral-200/90 rounded-t-[36px] shadow-[0_-16px_48px_rgba(0,0,0,0.25)] p-4 sm:p-5 flex flex-col gap-2 animate-in slide-in-from-bottom-full duration-300 pointer-events-auto">
        {/* Top Bar: Title & Handle */}
        <div className="flex items-center justify-between px-2 pb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight">
              {title || 'Bàn phím ảo Kiosk'}
            </span>
            {isVietnameseMode && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-[#155DFC] border border-blue-200">
                TELEX BẬT
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={closeKeyboard}
            className="flex items-center gap-1.5 px-4 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-600 hover:text-neutral-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Đóng bàn phím"
          >
            <ChevronDown className="w-4 h-4" />
            <span>Thu gọn</span>
          </button>
        </div>

        {/* Live Input Preview Box */}
        <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-inner">
          <div className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap">
            {value ? (
              <span className="text-base sm:text-lg font-black text-slate-900 tracking-wide font-sans">
                {value}
                <span className="inline-block w-0.5 h-5 bg-[#155DFC] ml-0.5 animate-pulse align-middle" />
              </span>
            ) : (
              <span className="text-sm font-semibold text-slate-400 italic">
                {placeholder || 'Chạm các phím bên dưới để nhập...'}
                <span className="inline-block w-0.5 h-4 bg-slate-300 ml-0.5 animate-pulse align-middle" />
              </span>
            )}
          </div>

          {value && (
            <button
              type="button"
              onClick={clear}
              className="px-2.5 py-1 text-xs font-bold text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shrink-0 transition-all cursor-pointer"
            >
              Xóa trắng
            </button>
          )}
        </div>

        {/* Keyboard Keys Layout */}
        <div className="flex flex-col gap-1.5 sm:gap-2">
          {/* Row 1: QWERTY */}
          <div className="flex justify-center gap-1 sm:gap-1.5">
            {row1.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => appendChar(char)}
                className="flex-1 h-11 sm:h-13 bg-white hover:bg-blue-50 active:bg-blue-200 active:scale-95 border border-neutral-200/90 rounded-2xl text-base sm:text-lg font-black text-[#1E2939] transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                {isCapsLock ? char.toUpperCase() : char.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Row 2: ASDFGHJKL */}
          <div className="flex justify-center gap-1 sm:gap-1.5 px-2 sm:px-5">
            {row2.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => appendChar(char)}
                className="flex-1 h-11 sm:h-13 bg-white hover:bg-blue-50 active:bg-blue-200 active:scale-95 border border-neutral-200/90 rounded-2xl text-base sm:text-lg font-black text-[#1E2939] transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                {isCapsLock ? char.toUpperCase() : char.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Row 3: Shift + ZXCVBNM + Backspace */}
          <div className="flex justify-center gap-1 sm:gap-1.5">
            {/* Shift / CapsLock Button */}
            <button
              type="button"
              onClick={toggleCapsLock}
              className={cn(
                'w-14 sm:w-20 h-11 sm:h-13 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1 cursor-pointer border shadow-xs active:scale-95',
                isCapsLock
                  ? 'bg-[#155DFC] text-white border-[#155DFC] shadow-md shadow-blue-500/20'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-200'
              )}
              title="Khóa chữ hoa"
            >
              <ArrowUp className={cn('w-4 h-4', isCapsLock && 'stroke-[3]')} />
              <span className="hidden sm:inline">Hoa</span>
            </button>

            {row3.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => appendChar(char)}
                className="flex-1 h-11 sm:h-13 bg-white hover:bg-blue-50 active:bg-blue-200 active:scale-95 border border-neutral-200/90 rounded-2xl text-base sm:text-lg font-black text-[#1E2939] transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                {isCapsLock ? char.toUpperCase() : char.toLowerCase()}
              </button>
            ))}

            {/* Backspace Key */}
            <button
              type="button"
              onClick={backspace}
              className="w-14 sm:w-20 h-11 sm:h-13 bg-neutral-100 hover:bg-rose-50 active:bg-rose-100 active:scale-95 border border-neutral-200 text-neutral-700 hover:text-rose-600 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              title="Xóa ký tự cuối"
            >
              <Delete className="w-5 h-5" />
              <span className="hidden sm:inline">Xóa</span>
            </button>
          </div>

          {/* Row 4: Mode Toggle, Space, Clear, Submit */}
          <div className="flex justify-center items-center gap-1.5 sm:gap-2 pt-1">
            {/* Vietnamese Telex Toggle Button */}
            <button
              type="button"
              onClick={toggleVietnameseMode}
              className={cn(
                'px-3 sm:px-5 h-12 sm:h-14 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 cursor-pointer border shadow-xs active:scale-95 shrink-0',
                isVietnameseMode
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
              )}
              title="Bật/Tắt gõ tiếng Việt Telex"
            >
              <Languages className="w-4 h-4 text-emerald-600" />
              <span>{isVietnameseMode ? 'Tiếng Việt: BẬT' : 'Tiếng Việt: TẮT'}</span>
            </button>

            {/* Space Bar */}
            <button
              type="button"
              onClick={() => appendChar(' ')}
              className="flex-1 h-12 sm:h-14 bg-white hover:bg-blue-50 active:bg-blue-100 active:scale-95 border border-neutral-300 rounded-2xl text-xs sm:text-sm font-black text-neutral-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Space className="w-5 h-5 text-neutral-400" />
              <span>Dấu cách (Space)</span>
            </button>

            {/* Submit / Confirm Button */}
            <button
              type="button"
              onClick={submit}
              className="px-6 sm:px-10 h-12 sm:h-14 bg-[#155DFC] hover:bg-blue-700 active:scale-95 text-white rounded-2xl text-xs sm:text-base font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/25 shrink-0"
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
