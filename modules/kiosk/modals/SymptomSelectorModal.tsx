import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Check, Activity, Loader2, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTriageStore } from '../store/triageStore';
import { useVirtualKeyboardStore } from '../store/virtualKeyboardStore';
import { SymptomItem } from '../types/triage.types';
import { removeVietnameseTones } from '../utils/kioskHelpers';

interface SymptomSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  bodyPartIdOrName: string | null;
  gender: 'male' | 'female';
}

export const SymptomSelectorModal: React.FC<SymptomSelectorModalProps> = ({
  isOpen,
  onClose,
  bodyPartIdOrName
}) => {
  // Đọc dữ liệu công khai từ TriageStore
  const addSymptomsBatch = useTriageStore((state) => state.addSymptomsBatch);
  const selectedSymptomsStore = useTriageStore((state) => state.selectedSymptoms);
  const availableSymptoms = useTriageStore((state) => state.currentRegionSymptoms);
  const isApiLoading = useTriageStore((state) => state.isApiLoading);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const isKeyboardOpen = useVirtualKeyboardStore((state) => state.isOpen);

  // SỬA: Chuyển đổi kiểu dữ liệu từ string[] sang SymptomItem[] để đồng bộ với Store
  const [tempSelected, setTempSelected] = useState<SymptomItem[]>([]);

  // Đồng bộ giỏ hàng tạm thời khi mở Modal
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTempSelected([...selectedSymptomsStore]);
    }
  }, [isOpen, selectedSymptomsStore]);

  // Bộ lọc tìm kiếm triệu chứng (không phân biệt dấu tiếng Việt)
  const filteredSymptoms = useMemo(() => {
    const normQ = removeVietnameseTones(searchQuery);
    if (!normQ) return availableSymptoms;

    return availableSymptoms.filter((s) => {
      const normVn = removeVietnameseTones(s.labelVn);
      const normEn = removeVietnameseTones(s.labelEn || '');
      return normVn.includes(normQ) || normEn.includes(normQ);
    });
  }, [availableSymptoms, searchQuery]);

  const openKeyboard = useVirtualKeyboardStore((state) => state.openKeyboard);

  const handleOpenVirtualKeyboard = () => {
    openKeyboard({
      inputId: 'symptom-search',
      title: `Tìm kiếm triệu chứng (${bodyPartIdOrName})`,
      initialValue: searchQuery,
      placeholder: 'Nhập tên triệu chứng đau (VD: đau nhói, buốt, sưng...)',
      onChange: (val) => setSearchQuery(val),
      onSubmit: (val) => setSearchQuery(val),
    });
  };

  if (!isOpen || !bodyPartIdOrName) return null;

  // SỬA: Cập nhật hàm toggle xử lý so sánh qua thuộc tính .id của Object triệu chứng
  const handleToggleSymptom = (symptom: SymptomItem) => {
    setTempSelected((prev) =>
      prev.some((item) => item.id === symptom.id)
        ? prev.filter((item) => item.id !== symptom.id)
        : [...prev, symptom]
    );
  };

  const handleConfirm = () => {
    addSymptomsBatch(tempSelected);
    onClose();
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 transition-all",
        isKeyboardOpen ? "items-start pt-3 sm:pt-4" : "items-center"
      )}
    >
      <div
        className={cn(
          "relative w-full max-w-4xl bg-white rounded-[36px] shadow-2xl border border-neutral-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 transition-all",
          isKeyboardOpen ? "max-h-[48vh] sm:max-h-[50vh] shadow-xl" : "max-h-[85vh]"
        )}
      >

        {/* Modal Header */}
        <div
          className={cn(
            "px-8 flex items-center justify-between border-b border-neutral-100 shrink-0 bg-white z-10 transition-all",
            isKeyboardOpen ? "pt-4 pb-3" : "pt-8 pb-4"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold shadow-sm shrink-0">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-3xl font-black text-[#1E2939] tracking-tight">
                {bodyPartIdOrName}
              </h2>
              {isApiLoading && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full border border-amber-200 text-amber-700 animate-in fade-in">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[10px] font-bold">Đang tải gợi ý...</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar with Virtual Keyboard */}
        <div className="px-8 py-2.5 sm:py-3 bg-neutral-50/80 border-b border-neutral-100 shrink-0">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-neutral-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onClick={handleOpenVirtualKeyboard}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm nhanh triệu chứng..."
              className="w-full pl-11 pr-24 py-2.5 sm:py-3 bg-white rounded-2xl border border-neutral-200 text-sm font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] shadow-sm transition-all cursor-pointer"
            />
            <div className="absolute right-3 flex items-center gap-1.5">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-bold text-neutral-400 hover:text-neutral-600 cursor-pointer px-2 py-1"
                >
                  Xóa
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenVirtualKeyboard}
                className="p-2 rounded-xl bg-blue-50 text-[#2563EB] hover:bg-blue-100 transition-colors cursor-pointer"
                title="Mở bàn phím ảo"
              >
                <Keyboard className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Symptom Grid Content */}
        <div
          className={cn(
            "px-8 overflow-y-auto flex-1 space-y-3",
            isKeyboardOpen ? "py-3 max-h-[26vh]" : "py-8 max-h-[50vh]"
          )}
        >
          {filteredSymptoms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredSymptoms.map((symptom) => {
                // SỬA: Xác định trạng thái chọn qua phương thức .some() dựa trên trường id
                const isSelected = tempSelected.some((item) => item.id === symptom.id);
                return (
                  <button
                    key={symptom.id}
                    type="button"
                    // SỬA: Truyền nguyên vẹn Object symptom thay vì chuỗi nhãn văn bản tiếng Việt
                    onClick={() => handleToggleSymptom(symptom)}
                    className={cn(
                      "p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer select-none",
                      isSelected
                        ? "bg-blue-50/80 border-[#2563EB] ring-2 ring-blue-300/40 shadow-sm"
                        : "bg-white border-neutral-200/90 hover:border-blue-300 hover:bg-blue-50/30"
                    )}
                  >
                    <div className="pr-2 flex-1 my-auto">
                      <p className={cn("text-sm font-extrabold leading-snug", isSelected ? "text-[#1E2939]" : "text-neutral-800")}>
                        {symptom.labelVn}
                      </p>
                    </div>

                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all",
                        isSelected
                          ? "bg-[#2563EB] text-white shadow-sm"
                          : "border-2 border-neutral-300 bg-white"
                      )}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 space-y-2">
              <p className="text-base font-bold text-neutral-600">Không tìm thấy triệu chứng phù hợp từ khóa</p>
              <p className="text-xs text-neutral-400">Thử tìm bằng từ khóa khác hoặc quay lại danh sách đầy đủ</p>
            </div>
          )}
        </div>

        {/* Modal Footer / Action Bar */}
        <div
          className={cn(
            "px-8 bg-white border-t border-neutral-100 flex items-center justify-between shrink-0 transition-all",
            isKeyboardOpen ? "py-3" : "py-5"
          )}
        >
          <div className="text-xs font-bold text-neutral-500">
            Đã chọn: <span className="text-[#2563EB] font-black text-sm">{tempSelected.length}</span> triệu chứng
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-full border border-neutral-300 font-bold text-xs hover:bg-neutral-100 text-neutral-700 transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-8 py-3.5 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> Xác nhận ({tempSelected.length})
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};