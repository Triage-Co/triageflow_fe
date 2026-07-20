import React, { useState, useEffect } from 'react';
import { useTriageStore } from '../../store/triageStore';
import { HelpCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const QuizDetailStep: React.FC = () => {
  const isApiLoading = useTriageStore((state) => state.isApiLoading);
  const currentQuestion = useTriageStore((state) => state.currentQuestion);
  const submitAnswersBatch = useTriageStore((state) => state.submitAnswersBatch);

  // Trạng thái lưu trữ cục bộ các câu trả lời trên màn hình hiện tại
  const [localAnswers, setLocalAnswers] = useState<Record<string, 'present' | 'absent' | 'unknown'>>({});

  // Tự động làm sạch form câu trả lời cũ mỗi khi máy chủ trả về nhóm câu hỏi mới
  useEffect(() => {
    setLocalAnswers({});
  }, [currentQuestion]);

  // Kiểm tra xem tất cả câu hỏi con hiển thị trên màn hình đã được tích chọn hay chưa
  const isAllAnswered = currentQuestion?.items
    ? currentQuestion.items.every((item: any) => localAnswers[item.id])
    : false;

  // Thực hiện đóng gói dữ liệu và đẩy lên API khi nhấn nút "Tiếp tục"
  const handleNextQuestion = () => {
    const formattedAnswers = Object.entries(localAnswers).map(([id, choiceId]) => ({
      id,
      choice_id: choiceId
    }));
    submitAnswersBatch(formattedAnswers);
  };

  return (
    <div className="flex-1 flex flex-col justify-between space-y-6">
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-neutral-100/80 space-y-6 flex-1 flex flex-col justify-between items-center relative min-h-[460px]">

        {isApiLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-[32px]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-10 h-10 text-[#74A4F6] animate-spin" />
              <span className="text-xs font-bold text-neutral-500">Hệ thống AI đang phân tích...</span>
            </div>
          </div>
        )}

        {currentQuestion ? (
          <div className="w-full max-w-2xl space-y-6 text-center animate-in fade-in duration-300 flex-1 flex flex-col justify-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-[#74A4F6] flex items-center justify-center mx-auto shadow-sm mb-2">
              <HelpCircle className="w-8 h-8" />
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[#1E2939] leading-snug tracking-tight px-4 mb-4">
              {currentQuestion.text}
            </h3>

            {currentQuestion.items && currentQuestion.items.length === 1 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4">
                {currentQuestion.items[0].choices.map((choice: any) => {
                  const isSelected = localAnswers[currentQuestion.items[0].id] === choice.id;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => setLocalAnswers({ [currentQuestion.items[0].id]: choice.id })}
                      className={cn(
                        "py-4 px-6 rounded-2xl text-sm font-extrabold border shadow-sm transition-all cursor-pointer active:scale-98 text-center",
                        isSelected
                          ? "bg-[#2563EB] border-[#2563EB] text-white hover:bg-blue-700"
                          : "bg-white border-neutral-200 text-neutral-700 hover:bg-blue-50 hover:border-[#74A4F6] hover:text-[#2563EB]"
                      )}
                    >
                      {choice.label === 'Yes' || choice.id === 'present' ? 'Có / Đúng' : choice.label === 'No' || choice.id === 'absent' ? 'Không' : 'Không rõ / Chưa biết'}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pt-2 px-2 custom-scrollbar">
                {currentQuestion.items && currentQuestion.items.map((item: any) => (
                  <div
                    key={item.id}
                    className="bg-neutral-50/70 p-4 rounded-2xl border border-neutral-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all hover:bg-neutral-50 hover:border-neutral-200"
                  >
                    <span className="font-extrabold text-neutral-700 text-sm text-left leading-snug flex-1">
                      {item.name}
                    </span>
                    <div className="grid grid-cols-3 gap-2 shrink-0 w-full sm:w-auto">
                      {item.choices.map((choice: any) => {
                        const isSelected = localAnswers[item.id] === choice.id;
                        return (
                          <button
                            key={choice.id}
                            type="button"
                            onClick={() => setLocalAnswers(prev => ({ ...prev, [item.id]: choice.id }))}
                            className={cn(
                              "py-2.5 px-3 rounded-xl text-xs font-black border shadow-sm transition-all cursor-pointer active:scale-95 text-center min-w-[75px]",
                              isSelected
                                ? "bg-[#2563EB] border-[#2563EB] text-white hover:bg-blue-700"
                                : "bg-white border-neutral-200 text-neutral-600 hover:bg-blue-50 hover:border-[#74A4F6] hover:text-[#2563EB]"
                            )}
                          >
                            {choice.label === 'Yes' || choice.id === 'present' ? 'Có' : choice.label === 'No' || choice.id === 'absent' ? 'Không' : 'Không rõ'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center italic text-neutral-400 text-xs my-auto">
            Không tìm thấy câu hỏi tiếp theo từ máy chủ.
          </div>
        )}

        {currentQuestion && (
          <div className="w-full max-w-md pt-4 shrink-0">
            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={!isAllAnswered || isApiLoading}
              className={cn(
                "w-full py-3.5 rounded-full text-white font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer",
                isAllAnswered && !isApiLoading ? "bg-[#74A4F6] hover:bg-[#2563EB]" : "bg-neutral-300 cursor-not-allowed"
              )}
            >
              {isApiLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Đang gửi đáp án...
                </>
              ) : (
                "Tiếp tục câu hỏi →"
              )}
            </button>
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-neutral-400 font-medium shrink-0">
        * Vui lòng trả lời trung thực để hệ thống hỗ trợ chỉ định chuyên khoa chính xác nhất.
      </div>
    </div>
  );
};
