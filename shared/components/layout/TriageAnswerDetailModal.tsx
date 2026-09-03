'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/shared/components/ui/Dialog';
import {
    Loader2,
    Clock,
    AlertCircle,
    CheckCircle2,
    HelpCircle,
    XCircle,
} from 'lucide-react';
import { clinicalService } from '@/modules/clinical/services/clinicalService';
import { ApiError } from '@/shared/services/apiClient';
import { commonSymptomDataset } from '@/modules/kiosk/data/commonSymptoms';
import { useAuthStore } from '@/store/authStore';
import type {
    LatestTriageAnswerData,
    LatestTriageAnswerResponse,
    TriageHistoryItem,
    TriageAnswerDetail,
} from '@/modules/clinical/types/triageAnswer.types';

interface TriageAnswerDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patientId?: string;
    patientName?: string;
}

interface TranslatedTurn {
    turn: number;
    questionTextVi: string;
    questionType?: string;
    answers?: Array<{
        nameVi: string;
        isPresent: boolean;
    }>;
    answer?: {
        nameVi: string;
        choiceLabelVi: string;
        isAbsent: boolean;
        displayBadgeText: string;
    };
}

const symptomLookup = new Map<string, { labelEn: string; labelVn: string }>();
try {
    Object.values(commonSymptomDataset).forEach((part) => {
        part.symptoms?.forEach((sym) => {
            if (sym.id) {
                symptomLookup.set(sym.id, { labelEn: sym.labelEn, labelVn: sym.labelVn });
            }
        });
    });
} catch {
    // ignore
}

const textTranslationCache = new Map<string, string>();

function isMissingTriageAnswerError(err: unknown): boolean {
    const message =
        err instanceof ApiError || err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : '';
    const normalized = message.toLowerCase();
    if (!normalized) return false;
    if (err instanceof ApiError && err.statusCode === 404) return true;
    return (
        normalized.includes('không tìm thấy câu trả lời') ||
        (normalized.includes('không tìm thấy') && normalized.includes('triage'))
    );
}

/** API đã trả tiếng Việt — giữ nguyên, không gọi Google Translate */
async function translateMedicalBatch(texts: string[]): Promise<Map<string, string>> {
    const resultMap = new Map<string, string>();
    texts.forEach((text) => {
        if (!text || !text.trim()) return;
        const trimmed = text.trim();
        resultMap.set(trimmed, textTranslationCache.get(trimmed) ?? trimmed);
    });
    return resultMap;
}

export function TriageAnswerDetailModal({
    open,
    onOpenChange,
    patientId,
    patientName,
}: TriageAnswerDetailModalProps) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const [data, setData] = useState<LatestTriageAnswerData | null>(null);
    const [translatedTurns, setTranslatedTurns] = useState<TranslatedTurn[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const translateHistory = useCallback(async (history: TriageHistoryItem[]) => {
        const allTextsToTranslate: string[] = [];
        history.forEach((item) => {
            if (item.question_text?.trim()) {
                allTextsToTranslate.push(item.question_text.trim());
            }
            if (Array.isArray(item.answers)) {
                item.answers.forEach((ans) => {
                    if (ans.name?.trim()) allTextsToTranslate.push(ans.name.trim());
                });
            }
            if (item.answer) {
                if (item.answer.name?.trim()) allTextsToTranslate.push(item.answer.name.trim());
                if (item.answer.choice_label?.trim()) allTextsToTranslate.push(item.answer.choice_label.trim());
            }
        });
        const translationMap = await translateMedicalBatch(allTextsToTranslate);
        const results: TranslatedTurn[] = history.map((item, index) => {
            const turn = item.turn ?? index + 1;
            const rawQuestion = (item.question_text || '').trim();
            const questionTextVi = translationMap.get(rawQuestion) || rawQuestion || `Câu hỏi lượt ${turn}`;
            let translatedAnswers: TranslatedTurn['answers'] | undefined = undefined;
            if (Array.isArray(item.answers) && item.answers.length > 0) {
                translatedAnswers = item.answers.map((ans: TriageAnswerDetail) => {
                    const isPresent = ans.choice_id === 'present';
                    const symInfo = symptomLookup.get(ans.id);
                    let nameVn = symInfo?.labelVn || '';

                    if (!nameVn && ans.name) {
                        nameVn = translationMap.get(ans.name.trim()) || ans.name;
                    }

                    if (!nameVn) {
                        nameVn = isPresent ? 'Triệu chứng ban đầu' : '';
                    }

                    return {
                        nameVi: nameVn,
                        isPresent,
                    };
                });
            }
            let translatedAnswer: TranslatedTurn['answer'] | undefined = undefined;
            if (item.answer) {
                const ans = item.answer;
                const isAbsent = ans.choice_id === 'absent' || ans.choice_label === 'No';

                const rawName = ans.name ? ans.name.trim() : '';
                const nameVi = rawName ? (translationMap.get(rawName) || rawName) : '';

                const rawLabel = ans.choice_label ? ans.choice_label.trim() : '';
                const labelVi = rawLabel
                    ? (translationMap.get(rawLabel) || rawLabel)
                    : (ans.choice_id === 'present' ? 'Có' : ans.choice_id === 'absent' ? 'Không' : '');
                const displayBadgeText = labelVi || nameVi || (ans.choice_id === 'present' ? 'Có' : ans.choice_id === 'absent' ? 'Không' : (ans.choice_id || ''));

                translatedAnswer = {
                    nameVi,
                    choiceLabelVi: labelVi,
                    isAbsent,
                    displayBadgeText,
                };
            }

            return {
                turn,
                questionTextVi,
                questionType: item.question_type,
                answers: translatedAnswers,
                answer: translatedAnswer,
            };
        });

        setTranslatedTurns(results);
    }, []);

    const fetchData = useCallback(async () => {
        if (!patientId || !accessToken) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = (await clinicalService.getLatestTriageAnswer(
                patientId,
                accessToken
            )) as LatestTriageAnswerResponse | LatestTriageAnswerData | Record<string, unknown>;

            let answerData: LatestTriageAnswerData | null = null;

            if (res && typeof res === 'object') {
                if ('data' in res && res.data && typeof res.data === 'object') {
                    answerData = res.data as LatestTriageAnswerData;
                } else if ('patient_answer_id' in res) {
                    answerData = res as LatestTriageAnswerData;
                }
            }

            if (answerData && answerData.questionnaire_data) {
                setData(answerData);
                const history = answerData.questionnaire_data.history || [];
                await translateHistory(history);
            } else {
                setData(null);
                setTranslatedTurns([]);
            }
        } catch (err: unknown) {
            if (isMissingTriageAnswerError(err)) {
                setData(null);
                setTranslatedTurns([]);
                setError(null);
                return;
            }
            console.error('Failed to fetch triage latest answer:', err);
            const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu khảo sát Triage';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, [patientId, accessToken, translateHistory]);

    useEffect(() => {
        if (open && patientId) {
            fetchData();
        } else if (!open) {
            setData(null);
            setTranslatedTurns([]);
            setError(null);
        }
    }, [open, patientId, fetchData]);

    const formatDateTime = (isoString?: string) => {
        if (!isoString) return '—';
        try {
            const date = new Date(isoString);
            return date.toLocaleString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
        } catch {
            return isoString;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] p-0 flex flex-col overflow-hidden rounded-[28px] border border-neutral-100 shadow-2xl bg-[#FCFCFD]">
                {/* ── Modal Header ── */}
                <div className="bg-gradient-to-r from-[#8B7CF6]/15 via-[#F5F2FF] to-[#EDE9FE]/50 px-6 py-4.5 border-b border-[#E9E4F8] shrink-0">
                    <div className="flex items-center justify-between gap-3 pr-8">
                        <DialogHeader>
                            <DialogTitle className="text-[17px] font-bold text-neutral-900">
                                Chi tiết
                            </DialogTitle>
                        </DialogHeader>

                        {data?.created_at && (
                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-600 bg-white/80 border border-purple-100 px-3 py-1.5 rounded-full shadow-2xs">
                                <Clock className="w-3.5 h-3.5 text-[#7C5CFC] shrink-0" />
                                <span className="text-neutral-400 font-normal">Thời gian:</span>
                                <span className="font-bold text-neutral-800">{formatDateTime(data.created_at)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Modal Body (Scrollable) ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Loading State */}
                    {isLoading && (
                        <div className="py-14 flex flex-col items-center justify-center text-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-[#7C5CFC]" />
                            <p className="text-[13px] font-semibold text-neutral-600">
                                Đang tải và dịch dữ liệu khảo sát Triage AI...
                            </p>
                        </div>
                    )}

                    {/* Error State */}
                    {!isLoading && error && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-[13px] font-bold">Lỗi khi tải dữ liệu</p>
                                <p className="text-[12px] text-rose-600 mt-0.5">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!isLoading && !error && translatedTurns.length === 0 && (
                        <div className="py-14 text-center flex flex-col items-center justify-center">
                            <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3">
                                <HelpCircle className="w-6 h-6" />
                            </div>
                            <p className="text-[14px] font-bold text-neutral-800">
                                Chưa có câu trả lời từ AI
                            </p>
                            <p className="text-[12px] text-neutral-500 max-w-sm mt-1">
                                Bệnh nhân chưa hoàn thành khảo sát triage hoặc chưa có dữ liệu cập nhật.
                            </p>
                        </div>
                    )}

                    {/* Question & Answer History List */}
                    {!isLoading && !error && translatedTurns.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between pb-1">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7C5CFC]">
                                    Lịch sử phiên hỏi ({translatedTurns.length} câu)
                                </p>
                                <span className="text-[11px] text-neutral-400 font-medium">
                                    Đã hoàn thành
                                </span>
                            </div>

                            {translatedTurns.map((turn) => {
                                return (
                                    <div
                                        key={turn.turn}
                                        className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-2xs hover:border-[#DDD6FE] transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-6 h-6 rounded-full bg-[#F4F0FF] text-[#7C5CFC] font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5 border border-[#DDD6FE]">
                                                {turn.turn}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[11px] font-bold text-neutral-400">
                                                        Lượt {turn.turn}
                                                    </span>
                                                    {turn.questionType && (
                                                        <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                                                            {turn.questionType === 'initial'
                                                                ? 'Khai báo ban đầu'
                                                                : turn.questionType === 'group_single'
                                                                    ? 'Chọn 1'
                                                                    : turn.questionType}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Question Text (Dịch Tiếng Việt) */}
                                                <p className="text-[13px] font-bold text-neutral-900 mt-1 leading-snug">
                                                    {turn.questionTextVi}
                                                </p>

                                                {/* Danh sách triệu chứng ban đầu (Hiển thị tên triệu chứng) */}
                                                {turn.answers && turn.answers.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-2.5">
                                                        {turn.answers.map((ans, idx) => {
                                                            return (
                                                                <span
                                                                    key={idx}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold bg-[#EEEDFC] text-[#6D28D9] border border-[#DDD6FE]"
                                                                >
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#7C5CFC]" />
                                                                    <span>{ans.nameVi}</span>
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Single Answer (Chỉ hiển thị khi không phải initial turn) */}
                                                {turn.questionType !== 'initial' && turn.answer && (
                                                    <div className="mt-2.5">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-bold ${turn.answer.isAbsent
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                : 'bg-[#F4F0FF] text-[#6D28D9] border border-[#DDD6FE]'
                                                                }`}
                                                        >
                                                            {turn.answer.isAbsent ? (
                                                                <XCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                                            ) : (
                                                                <CheckCircle2 className="w-4 h-4 text-[#7C5CFC] shrink-0" />
                                                            )}
                                                            <span>{turn.answer.displayBadgeText}</span>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
