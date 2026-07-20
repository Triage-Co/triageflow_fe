import React from 'react';
import { useKioskStore } from '../../store/kioskStore';
import { useTriageStore } from '../../store/triageStore';
import { BodyMapSelector } from '../BodyMapSelector';
import { SymptomSelectorModal } from '../../modals/SymptomSelectorModal';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const BodySelectStep: React.FC = () => {
  const selectedGender = useKioskStore((state) => state.selectedGender);
  const modalBodyPart = useKioskStore((state) => state.selectedBodyPart);
  const setModalBodyPart = useKioskStore((state) => state.setSelectedBodyPart);

  const selectedSymptoms = useTriageStore((state) => state.selectedSymptoms);
  const removeSymptom = useTriageStore((state) => state.removeSymptom);
  const fetchAndMergeSymptoms = useTriageStore((state) => state.fetchAndMergeSymptoms);
  const isApiLoading = useTriageStore((state) => state.isApiLoading);
  const startDiagnosisFlow = useTriageStore((state) => state.startDiagnosisFlow);

  const [isSymptomModalOpen, setIsSymptomModalOpen] = React.useState<boolean>(false);

  const handleOpenRegionModal = (partId: string) => {
    setModalBodyPart(partId);
    setIsSymptomModalOpen(true);
    fetchAndMergeSymptoms(partId);
  };

  return (
    <>
      <div className="flex-1 flex flex-col self-stretch">
        <BodyMapSelector onRegionClick={handleOpenRegionModal} />
      </div>

      {/* Right Sidebar Area */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col justify-between space-y-5 h-full">
        <div className="bg-white rounded-[36px] p-6 shadow-sm border border-neutral-100/80 space-y-4">
          <h3 className="font-extrabold text-[#1E2939] text-base">
            Triệu chứng đã chọn ({selectedSymptoms.length})
          </h3>

          <div className="space-y-3 max-h-56 overflow-y-auto">
            {selectedSymptoms.length > 0 ? (
              selectedSymptoms.map((item, idx) => (
                <div
                  key={item.id ? `sym-${item.id}` : `sym-idx-${idx}`}
                  className="flex items-center justify-between bg-[#D8E6FE] px-5 py-3.5 rounded-2xl text-xs font-extrabold text-[#1E2939]"
                >
                  <span className="truncate max-w-[180px]">{item.labelVn}</span>
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

        <div className="bg-[#EBF3FF] rounded-[28px] p-6 text-xs text-neutral-600 font-semibold text-center leading-relaxed">
          <strong>Lưu ý:</strong> Bạn có thể chọn nhiều triệu chứng đau. Hệ thống AI sẽ phân tích và đề xuất chuyên khoa phù hợp.
        </div>

        <button
          type="button"
          onClick={startDiagnosisFlow}
          disabled={selectedSymptoms.length === 0 || isApiLoading}
          className={cn(
            "w-full py-4 rounded-full text-white font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer",
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
