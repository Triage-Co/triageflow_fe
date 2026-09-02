import React, { useState } from 'react';
import { useKioskStore } from '../../store/kioskStore';
import { useTriageStore } from '../../store/triageStore';
import { useVirtualKeyboardStore } from '../../store/virtualKeyboardStore';
import { BodyMapSelector } from '../BodyMapSelector';
import { SymptomSelectorModal } from '../../modals/SymptomSelectorModal';
import { Loader2, Keyboard as KeyboardIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const BodySelectStep: React.FC = () => {
  const selectedGender = useKioskStore((state) => state.selectedGender);
  const modalBodyPart = useKioskStore((state) => state.selectedBodyPart);
  const setModalBodyPart = useKioskStore((state) => state.setSelectedBodyPart);

  const selectedSymptoms = useTriageStore((state) => state.selectedSymptoms);
  const removeSymptom = useTriageStore((state) => state.removeSymptom);
  const fetchAndMergeSymptoms = useTriageStore((state) => state.fetchAndMergeSymptoms);
  const parseAndAddSymptoms = useTriageStore((state) => state.parseAndAddSymptoms);
  const isApiLoading = useTriageStore((state) => state.isApiLoading);
  const startDiagnosisFlow = useTriageStore((state) => state.startDiagnosisFlow);

  const [isSymptomModalOpen, setIsSymptomModalOpen] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);

  const openKeyboard = useVirtualKeyboardStore((state) => state.openKeyboard);

  const handleOpenRegionModal = (partId: string) => {
    setModalBodyPart(partId);
    setIsSymptomModalOpen(true);
    fetchAndMergeSymptoms(partId);
  };

  const handleOpenVirtualKeyboard = () => {
    openKeyboard({
      inputId: 'kiosk-ai-symptom-input',
      title: 'Nhập mô tả triệu chứng của bạn',
      initialValue: inputText,
      placeholder: 'VD: đau đầu, sốt nhẹ, đau quặn bụng dưới...',
      onChange: (val) => setInputText(val),
      onSubmit: (val) => {
        setInputText(val);
        handleParse(val);
      },
    });
  };

  const handleParse = async (textToParse?: string) => {
    const text = (typeof textToParse === 'string' ? textToParse : inputText).trim();
    if (!text || isParsing) return;

    setIsParsing(true);
    try {
      const res = await parseAndAddSymptoms(text);
      if (res.addedCount > 0) {
        setInputText('');
      }
    } catch (err) {
      console.error('Lỗi khi phân tích triệu chứng:', err);
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <>
      <div className="flex-1 min-h-[420px] sm:min-h-[480px] md:min-h-0 flex flex-col self-stretch overflow-hidden">
        <BodyMapSelector onRegionClick={handleOpenRegionModal} />
      </div>

      {/* Right Sidebar Area */}
      <div className="w-full md:w-72 lg:w-80 shrink-0 flex flex-col justify-between gap-3 sm:gap-4 h-auto md:h-full min-h-0 pb-2 md:pb-0">
        <div className="bg-white rounded-[28px] sm:rounded-[36px] p-5 sm:p-6 shadow-sm border border-neutral-100/80 flex-1 min-h-0 flex flex-col space-y-3">
          <div className="flex items-center justify-between shrink-0">
            <h3 className="font-extrabold text-[#1E2939] text-sm sm:text-base">
              Triệu chứng đã chọn ({selectedSymptoms.length})
            </h3>
            {isParsing && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" /> Đang nhận diện...
              </span>
            )}
          </div>

          {/* Ô nhập mô tả triệu chứng bằng AI (giống MO) */}
          <div className="flex items-center gap-1.5 p-1.5 bg-neutral-50 rounded-2xl border border-neutral-200/90 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all shrink-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleParse();
              }}
              onClick={handleOpenVirtualKeyboard}
              placeholder="Nhập triệu chứng (VD: đau đầu, sốt...)"
              className="flex-1 bg-transparent px-2.5 py-1 text-xs font-semibold text-neutral-800 placeholder-neutral-400 outline-none min-w-0"
              disabled={isParsing}
            />
            <button
              type="button"
              onClick={handleOpenVirtualKeyboard}
              title="Bật bàn phím ảo cảm ứng"
              className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-200/60 transition-all shrink-0 cursor-pointer"
            >
              <KeyboardIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleParse()}
              disabled={!inputText.trim() || isParsing}
              title="Phân tích triệu chứng"
              className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-neutral-300 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed active:scale-95 shadow-xs"
            >
              {isParsing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Gửi</span>
            </button>
          </div>

          <div className="space-y-2.5 flex-1 min-h-0 overflow-y-auto pr-1">
            {selectedSymptoms.length > 0 ? (
              selectedSymptoms.map((item, idx) => (
                <div
                  key={item.id ? `sym-${item.id}` : `sym-idx-${idx}`}
                  className="flex items-center justify-between bg-[#D8E6FE] px-4 py-2.5 rounded-2xl text-xs font-extrabold text-[#1E2939]"
                >
                  <span className="truncate max-w-[170px]">{item.labelVn}</span>
                  <button
                    type="button"
                    onClick={() => removeSymptom(item.id)}
                    className="text-neutral-600 hover:text-rose-600 font-bold cursor-pointer text-xs ml-2 shrink-0"
                  >
                    Xóa
                  </button>
                </div>
              ))
            ) : (
              <div className="text-xs text-neutral-400 italic bg-neutral-50 p-4 rounded-2xl border border-neutral-100 text-center">
                Chưa chọn triệu chứng nào. Nhấp vào hình cơ thể để chọn triệu chứng.
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#EBF3FF] rounded-[24px] p-4 text-xs text-neutral-600 font-semibold text-center leading-relaxed shrink-0">
          <strong>Lưu ý:</strong> Bạn có thể chọn nhiều triệu chứng đau. Hệ thống AI sẽ phân tích và đề xuất chuyên khoa phù hợp.
        </div>

        <button
          type="button"
          onClick={startDiagnosisFlow}
          disabled={selectedSymptoms.length === 0 || isApiLoading}
          className={cn(
            "w-full py-3.5 sm:py-4 rounded-full text-white font-bold text-sm sm:text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95",
            selectedSymptoms.length > 0 && !isApiLoading ? "bg-[#74A4F6] hover:bg-[#2563EB]" : "bg-neutral-300 cursor-not-allowed"
          )}
        >
          {isApiLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Đang chuẩn bị khảo sát...
            </>
          ) : (
            "Tiếp tục →"
          )}
        </button>
      </div>

      <SymptomSelectorModal
        isOpen={isSymptomModalOpen}
        onClose={() => setIsSymptomModalOpen(false)}
        bodyPartIdOrName={modalBodyPart}
        gender={selectedGender}
      />
    </>
  );
};
