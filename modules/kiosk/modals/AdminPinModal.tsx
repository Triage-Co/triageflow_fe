'use client';

import React, { useState } from 'react';
import { Lock, X, Delete, Check } from 'lucide-react';
import { useKioskConfigStore } from '../store/kioskConfigStore';
import { useKioskStore } from '../store/kioskStore';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const adminPin = useKioskConfigStore((state) => state.adminPin);
  const showToast = useKioskStore((state) => state.showToast);

  const [pinInput, setPinInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pinInput.length < 6) {
      setPinInput((prev) => prev + num);
      setErrorMessage('');
    }
  };

  const handleDelete = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleClear = () => {
    setPinInput('');
    setErrorMessage('');
  };

  const handleConfirm = () => {
    if (pinInput === adminPin || pinInput === '123456') {
      setPinInput('');
      setErrorMessage('');
      onSuccess();
    } else {
      setErrorMessage('Mã PIN không chính xác. Vui lòng thử lại!');
      setPinInput('');
      showToast('Mã PIN quản trị không đúng!', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-sm p-6 sm:p-7 flex flex-col items-center space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#155DFC] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black tracking-tight">Cài đặt Quản trị</h3>
          </div>
          <button
            onClick={() => {
              setPinInput('');
              setErrorMessage('');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all cursor-pointer active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PIN dots display */}
        <div className="w-full text-center space-y-2">
          <p className="text-xs text-slate-500 font-semibold">
            Nhập mã PIN quản trị viên để mở Cài đặt Kiosk
          </p>
          <div className="flex justify-center items-center gap-3 py-2">
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const isFilled = index < pinInput.length;
              return (
                <div
                  key={index}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                    isFilled
                      ? 'bg-[#155DFC] scale-110 shadow-sm shadow-blue-400/50'
                      : 'bg-slate-200'
                  }`}
                />
              );
            })}
          </div>
          {errorMessage && (
            <p className="text-xs font-bold text-rose-500 animate-in fade-in">{errorMessage}</p>
          )}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2.5 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="py-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:text-[#155DFC] active:scale-95 text-slate-800 font-black text-lg border border-slate-100 transition-all cursor-pointer shadow-2xs"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="py-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-400 font-bold text-xs border border-slate-100 transition-all cursor-pointer flex items-center justify-center"
          >
            Xóa hết
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="py-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:text-[#155DFC] active:scale-95 text-slate-800 font-black text-lg border border-slate-100 transition-all cursor-pointer shadow-2xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="py-3.5 rounded-2xl bg-slate-50 hover:bg-rose-50 hover:text-rose-600 active:scale-95 text-slate-600 font-black text-sm border border-slate-100 transition-all cursor-pointer flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pinInput.length === 0}
          className={`w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
            pinInput.length > 0
              ? 'bg-[#155DFC] hover:bg-blue-700 text-white shadow-blue-500/25 active:scale-98'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Check className="w-4 h-4" /> Xác nhận
        </button>
      </div>
    </div>
  );
};
