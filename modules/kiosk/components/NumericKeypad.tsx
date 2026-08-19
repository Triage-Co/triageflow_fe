import React from 'react';
import { Delete, CheckCircle2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NumericKeypadProps {
  onKeyPress: (num: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  isSubmitDisabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  onKeyPress,
  onDelete,
  onClear,
  onSubmit,
  submitLabel = 'Xác nhận',
  isSubmitDisabled = false,
  isLoading = false,
  className,
}) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className={cn('w-full max-w-sm mx-auto flex flex-col gap-3 select-none', className)}>
      {/* 3x3 Grid for numbers 1-9 */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {keys.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onKeyPress(num)}
            className="h-14 sm:h-16 rounded-2xl bg-white hover:bg-blue-50/60 active:bg-blue-100/80 active:scale-95 border border-neutral-200 shadow-sm text-2xl sm:text-3xl font-black text-[#1E2939] hover:text-[#155DFC] transition-all flex items-center justify-center cursor-pointer"
          >
            {num}
          </button>
        ))}

        {/* Bottom Row: Clear, 0, Backspace */}
        <button
          type="button"
          onClick={onClear}
          className="h-14 sm:h-16 rounded-2xl bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-600 font-extrabold text-xs sm:text-sm transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
          title="Xóa tất cả"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Xóa hết</span>
        </button>

        <button
          type="button"
          onClick={() => onKeyPress('0')}
          className="h-14 sm:h-16 rounded-2xl bg-white hover:bg-blue-50/60 active:bg-blue-100/80 active:scale-95 border border-neutral-200 shadow-sm text-2xl sm:text-3xl font-black text-[#1E2939] hover:text-[#155DFC] transition-all flex items-center justify-center cursor-pointer"
        >
          0
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="h-14 sm:h-16 rounded-2xl bg-neutral-100 hover:bg-rose-100/60 active:scale-95 text-neutral-700 hover:text-rose-600 font-extrabold text-xs sm:text-sm transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
          title="Xóa 1 ký tự"
        >
          <Delete className="w-5 h-5" />
          <span>Xóa</span>
        </button>
      </div>

      {/* Optional Submit Button */}
      {onSubmit && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitDisabled || isLoading}
          className={cn(
            'w-full py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer mt-1',
            !isSubmitDisabled && !isLoading
              ? 'bg-[#155DFC] hover:bg-blue-700 active:scale-95 text-white shadow-blue-500/25'
              : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
          )}
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>{isLoading ? 'Đang xử lý...' : submitLabel}</span>
        </button>
      )}
    </div>
  );
};
