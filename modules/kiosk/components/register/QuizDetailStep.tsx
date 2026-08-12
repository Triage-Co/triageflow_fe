import React, { useState, useEffect } from 'react';
import { useTriageStore } from '../../store/triageStore';
import { HelpCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const QuizDetailStep: React.FC = () => {
  const isApiLoading = useTriageStore((state) => state.isApiLoading);
  const currentQuestion = useTriageStore((state) => state.currentQuestion);
  const submitAnswersBatch = useTriageStore((state) => state.submitAnswersBatch);

  const [localAnswers, setLocalAnswers] = useState<Record<string, 'present' | 'absent' | 'unknown' | undefined>>({});

  const isGroupSingle = currentQuestion?.type === 'group_single';
  const isGroupMultiple = currentQuestion?.type === 'group_multiple';

  useEffect(() => {
    setLocalAnswers({});
  }, [currentQuestion]);

  const isAllAnswered = currentQuestion?.items
    ? (isGroupSingle
      ? currentQuestion.items.some((item: any) => localAnswers[item.id] === 'present') ||
      currentQuestion.items.every((item: any) => localAnswers[item.id] === 'absent')
      : isGroupMultiple
        ? true
        : currentQuestion.items.every((item: any) => localAnswers[item.id])
    )
    : false;

  const handleNextQuestion = () => {
    let formattedAnswers: any[] = [];
    if (isGroupSingle && currentQuestion?.items) {
      const selectedItem = currentQuestion.items.find((item: any) => localAnswers[item.id] === 'present');
      if (selectedItem) {
        formattedAnswers = [{
          id: selectedItem.id,
          choice_id: 'present' as const
        }];
      } else {
        formattedAnswers = currentQuestion.items.map((item: any) => ({
          id: item.id,
          choice_id: 'absent' as const
        }));
      }
    } else if (isGroupMultiple && currentQuestion?.items) {
      formattedAnswers = currentQuestion.items.map((item: any) => ({
        id: item.id,
        choice_id: localAnswers[item.id] === 'present' ? ('present' as const) : ('absent' as const)
      }));
    } else {
      formattedAnswers = Object.entries(localAnswers)
        .filter((entry): entry is [string, 'present' | 'absent' | 'unknown'] => entry[1] !== undefined)
        .map(([id, choiceId]) => ({
          id,
          choice_id: choiceId
        }));
    }
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
          <div className="w-full max-w-4xl space-y-6 text-center animate-in fade-in duration-300 flex-1 flex flex-col justify-center">

            <h3 className="text-2xl sm:text-3xl font-black text-[#1E2939] leading-snug tracking-tight px-4 mb-4">
              {currentQuestion.text}
            </h3>

            {currentQuestion.items && currentQuestion.items.length === 1 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4 max-w-2xl mx-auto w-full">
                {currentQuestion.items[0].choices.map((choice: any) => {
                  const isSelected = localAnswers[currentQuestion.items[0].id] === choice.id;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => setLocalAnswers({ [currentQuestion.items[0].id]: choice.id })}
                      className={cn(
                        "py-4 px-6 rounded-2xl text-base font-extrabold border shadow-sm transition-all cursor-pointer active:scale-98 text-center",
                        isSelected
                          ? "bg-[#2563EB] border-[#2563EB] text-white hover:bg-blue-700 shadow-blue-200"
                          : "bg-white border-neutral-200 text-neutral-700 hover:bg-blue-50 hover:border-[#74A4F6] hover:text-[#2563EB]"
                      )}
                    >
                      {choice.label === 'Yes' || choice.id === 'present' ? 'Có / Đúng' : choice.label === 'No' || choice.id === 'absent' ? 'Không' : 'Không rõ / Chưa biết'}
                    </button>
                  );
                })}
              </div>
            ) : isGroupSingle ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pt-1 px-4 custom-scrollbar max-w-2xl mx-auto w-full">
                {currentQuestion.items && currentQuestion.items.map((item: any) => {
                  const isSelected = localAnswers[item.id] === 'present';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        const newAnswers: Record<string, 'present' | 'absent'> = {};
                        currentQuestion.items.forEach((it: any) => {
                          newAnswers[it.id] = it.id === item.id ? 'present' : 'absent';
                        });
                        setLocalAnswers(newAnswers);
                      }}
                      className={cn(
                        "w-full py-4 px-6 rounded-2xl text-base font-extrabold border shadow-sm transition-all cursor-pointer active:scale-98 text-left flex items-center justify-between gap-4",
                        isSelected
                          ? "bg-[#2563EB] border-[#2563EB] text-white hover:bg-blue-700 shadow-md shadow-blue-200"
                          : "bg-white border-neutral-200 text-neutral-700 hover:bg-blue-50 hover:border-[#74A4F6] hover:text-[#2563EB]"
                      )}
                    >
                      <span className="leading-snug">{item.name}</span>
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                        isSelected ? "border-white bg-white" : "border-neutral-300 bg-white"
                      )}>
                        {isSelected && <div className="w-3 h-3 rounded-full bg-[#2563EB]" />}
                      </div>
                    </button>
                  );
                })}

                {(() => {
                  const isNoneSelected = currentQuestion.items && currentQuestion.items.every((it: any) => localAnswers[it.id] === 'absent');
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        const newAnswers: Record<string, 'absent'> = {};
                        currentQuestion.items.forEach((it: any) => {
                          newAnswers[it.id] = 'absent';
                        });
                        setLocalAnswers(newAnswers);
                      }}
                      className={cn(
                        "w-full py-4 px-6 rounded-2xl text-base font-extrabold border shadow-sm transition-all cursor-pointer active:scale-98 text-left flex items-center justify-between gap-4",
                        isNoneSelected
                          ? "bg-neutral-800 border-neutral-800 text-white hover:bg-neutral-900 shadow-md shadow-neutral-200"
                          : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 hover:text-neutral-900"
                      )}
                    >
                      <span className="leading-snug">Không có triệu chứng nào nêu trên</span>
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                        isNoneSelected ? "border-white bg-white" : "border-neutral-300 bg-white"
                      )}>
                        {isNoneSelected && <div className="w-3 h-3 rounded-full bg-neutral-800" />}
                      </div>
                    </button>
                  );
                })()}
              </div>
            ) : isGroupMultiple ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pt-1 px-4 custom-scrollbar max-w-2xl mx-auto w-full">
                {currentQuestion.items && currentQuestion.items.map((item: any) => {
                  const isSelected = localAnswers[item.id] === 'present';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setLocalAnswers(prev => ({
                          ...prev,
                          [item.id]: prev[item.id] === 'present' ? 'absent' : 'present'
                        }));
                      }}
                      className={cn(
                        "w-full py-4 px-6 rounded-2xl text-base font-extrabold border shadow-sm transition-all cursor-pointer active:scale-98 text-left flex items-center justify-between gap-4",
                        isSelected
                          ? "bg-[#2563EB] border-[#2563EB] text-white hover:bg-blue-700 shadow-md shadow-blue-200"
                          : "bg-white border-neutral-200 text-neutral-700 hover:bg-blue-50 hover:border-[#74A4F6] hover:text-[#2563EB]"
                      )}
                    >
                      <span className="leading-snug">{item.name}</span>
                      <div className={cn(
                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all",
                        isSelected ? "border-white bg-white text-[#2563EB]" : "border-neutral-300 bg-white"
                      )}>
                        {isSelected && (
                          <svg className="w-4 h-4 fill-current text-[#2563EB]" viewBox="0 0 20 20">
                            <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}

                {(() => {
                  const isNoneSelected = currentQuestion.items && currentQuestion.items.every((it: any) => localAnswers[it.id] === 'absent');
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        const newAnswers: Record<string, 'absent'> = {};
                        currentQuestion.items.forEach((it: any) => {
                          newAnswers[it.id] = 'absent';
                        });
                        setLocalAnswers(newAnswers);
                      }}
                      className={cn(
                        "w-full py-4 px-6 rounded-2xl text-base font-extrabold border shadow-sm transition-all cursor-pointer active:scale-98 text-left flex items-center justify-between gap-4",
                        isNoneSelected
                          ? "bg-neutral-800 border-neutral-800 text-white hover:bg-neutral-900 shadow-md shadow-neutral-200"
                          : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 hover:text-neutral-900"
                      )}
                    >
                      <span className="leading-snug">Không có triệu chứng nào nêu trên</span>
                      <div className={cn(
                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all",
                        isNoneSelected ? "border-white bg-white text-neutral-800" : "border-neutral-300 bg-white"
                      )}>
                        {isNoneSelected && (
                          <svg className="w-4 h-4 fill-current text-neutral-800" viewBox="0 0 20 20">
                            <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[420px] overflow-y-auto pt-2 px-4 custom-scrollbar">
                {currentQuestion.items && currentQuestion.items.map((item: any) => (
                  <div
                    key={item.id}
                    className="bg-neutral-50/80 p-5 rounded-2xl border border-neutral-200/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all hover:bg-white hover:border-[#74A4F6]/40 hover:shadow-sm"
                  >
                    <span className="font-extrabold text-neutral-800 text-base text-left leading-relaxed flex-1">
                      {item.name}
                    </span>
                    <div className="grid grid-cols-3 gap-3 shrink-0 w-full sm:w-auto">
                      {item.choices.map((choice: any) => {
                        const isSelected = localAnswers[item.id] === choice.id;
                        return (
                          <button
                            key={choice.id}
                            type="button"
                            onClick={() => setLocalAnswers(prev => ({ ...prev, [item.id]: choice.id }))}
                            className={cn(
                              "py-3 px-5 rounded-xl text-sm font-black border shadow-sm transition-all cursor-pointer active:scale-95 text-center min-w-[90px]",
                              isSelected
                                ? "bg-[#2563EB] border-[#2563EB] text-white hover:bg-blue-700 shadow-md shadow-blue-200"
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
          <div className="w-full max-w-lg pt-4 shrink-0">
            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={!isAllAnswered || isApiLoading}
              className={cn(
                "w-full py-4 rounded-full text-white font-black text-lg shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                isAllAnswered && !isApiLoading ? "bg-[#2563EB] hover:bg-blue-700 shadow-blue-200" : "bg-neutral-300 cursor-not-allowed shadow-none"
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
    </div>
  );
};
