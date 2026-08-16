import React, { useState, useEffect } from 'react';
import { useTriageStore } from '../../store/triageStore';
import { HelpCircle, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const QuizDetailStep: React.FC = () => {
  const isApiLoading = useTriageStore((state) => state.isApiLoading);
  const currentQuestion = useTriageStore((state) => state.currentQuestion);
  const submitAnswersBatch = useTriageStore((state) => state.submitAnswersBatch);
  const restoredAnswers = useTriageStore((state) => state.restoredAnswers);
  const clearRestoredAnswers = useTriageStore((state) => state.clearRestoredAnswers);

  const [localAnswers, setLocalAnswers] = useState<Record<string, 'present' | 'absent' | 'unknown' | undefined>>({});

  const isGroupSingle = currentQuestion?.type === 'group_single';
  const isGroupMultiple = currentQuestion?.type === 'group_multiple';

  useEffect(() => {
    if (restoredAnswers) {
      setLocalAnswers(restoredAnswers);
      clearRestoredAnswers();
    } else {
      setLocalAnswers({});
    }
  }, [currentQuestion, restoredAnswers, clearRestoredAnswers]);

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
    submitAnswersBatch(formattedAnswers, localAnswers);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
      <div className="bg-white rounded-[28px] sm:rounded-[36px] p-4 sm:p-6 lg:p-8 shadow-sm border border-neutral-100/80 flex-1 min-h-0 flex flex-col justify-between items-center relative overflow-hidden">

        {isApiLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-[32px]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-10 h-10 text-[#74A4F6] animate-spin" />
              <span className="text-xs font-bold text-neutral-500">Hệ thống AI đang phân tích...</span>
            </div>
          </div>
        )}

        {currentQuestion ? (
          <div className="w-full max-w-4xl flex-1 min-h-0 flex flex-col justify-center items-center text-center animate-in fade-in duration-300 overflow-hidden">

            {currentQuestion.items && currentQuestion.items.length === 1 ? (
              <div className="my-auto flex flex-col items-center justify-center gap-6 sm:gap-8 w-full max-w-2xl px-4 animate-in fade-in zoom-in-95 duration-300">
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1E2939] leading-snug tracking-tight text-center">
                  {currentQuestion.text}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                  {currentQuestion.items[0].choices.map((choice: any) => {
                    const isSelected = localAnswers[currentQuestion.items[0].id] === choice.id;
                    const isYes = choice.label === 'Yes' || choice.id === 'present';
                    const isNo = choice.label === 'No' || choice.id === 'absent';
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => setLocalAnswers({ [currentQuestion.items[0].id]: choice.id })}
                        className={cn(
                          "py-5 px-4 rounded-2xl text-base sm:text-lg font-extrabold border-2 shadow-sm transition-all cursor-pointer active:scale-98 text-center flex flex-col items-center justify-center gap-3",
                          isSelected
                            ? "bg-[#2563EB] border-[#2563EB] text-white hover:bg-blue-700 shadow-lg shadow-blue-200 scale-[1.02]"
                            : "bg-neutral-50/70 border-neutral-200 text-neutral-700 hover:bg-blue-50 hover:border-[#74A4F6] hover:text-[#2563EB]"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                          isSelected
                            ? "bg-white/20 text-white"
                            : isYes
                              ? "bg-emerald-100 text-emerald-600"
                              : isNo
                                ? "bg-rose-100 text-rose-600"
                                : "bg-amber-100 text-amber-600"
                        )}>
                          {isYes ? <Check className="w-5 h-5" /> : isNo ? <X className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
                        </div>
                        <span className="leading-tight">
                          {isYes ? 'Đúng' : isNo ? 'Không' : 'Không rõ'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : isGroupSingle ? (
              <div className="w-full flex-1 min-h-0 flex flex-col justify-center items-center gap-4 py-2 animate-in fade-in duration-300 overflow-hidden">
                <h3 className="text-lg sm:text-2xl font-black text-[#1E2939] leading-snug tracking-tight px-4 text-center shrink-0">
                  {currentQuestion.text}
                </h3>
                <div className="w-full max-w-2xl overflow-y-auto max-h-[380px] custom-scrollbar px-2 space-y-3">
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
              </div>
            ) : isGroupMultiple ? (
              <div className="w-full flex-1 min-h-0 flex flex-col justify-center items-center gap-4 py-2 animate-in fade-in duration-300 overflow-hidden">
                <h3 className="text-lg sm:text-2xl font-black text-[#1E2939] leading-snug tracking-tight px-4 text-center shrink-0">
                  {currentQuestion.text}
                </h3>
                <div className="w-full max-w-2xl overflow-y-auto max-h-[380px] custom-scrollbar px-2 space-y-3">
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
              </div>
            ) : (
              <div className="w-full flex-1 min-h-0 flex flex-col justify-center items-center gap-4 py-2 animate-in fade-in duration-300 overflow-hidden">
                <h3 className="text-lg sm:text-2xl font-black text-[#1E2939] leading-snug tracking-tight px-4 text-center shrink-0">
                  {currentQuestion.text}
                </h3>
                <div className="w-full max-w-3xl overflow-y-auto max-h-[380px] custom-scrollbar px-2 space-y-3.5">
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
              </div>
            )}
          </div>
        ) : (
          <div className="text-center italic text-neutral-400 text-xs my-auto">
            Không tìm thấy câu hỏi tiếp theo từ máy chủ.
          </div>
        )}

        {currentQuestion && (
          <div className="w-full max-w-lg pt-4 shrink-0 border-t border-neutral-100/80 mt-auto">
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
