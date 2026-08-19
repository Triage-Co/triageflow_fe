'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Save } from 'lucide-react';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { extractQuestionLimit, triageConfigService } from '../services/triageConfigService';
import { getErrorMessage } from '../utils/errorMessage';

const MIN_QUESTIONS = 1;
const MAX_QUESTIONS = 20;

export function AiQuestionLimitPanel() {
    const accessToken = useAuthStore((s) => s.accessToken);

    const [value, setValue] = useState<number>(5);
    const [savedValue, setSavedValue] = useState<number>(5);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!accessToken) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await triageConfigService.getQuestionLimit(accessToken);
            const config = extractQuestionLimit(res);
            const next = config?.number_of_diagnosis ?? 5;
            setValue(next);
            setSavedValue(next);
        } catch (err) {
            setError(getErrorMessage(err, 'Không thể tải cấu hình số câu hỏi AI.'));
        } finally {
            setIsLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleSave = async () => {
        if (!accessToken) return;
        if (!Number.isInteger(value) || value < MIN_QUESTIONS || value > MAX_QUESTIONS) {
            setError(`Số câu hỏi phải là số nguyên từ ${MIN_QUESTIONS} đến ${MAX_QUESTIONS}.`);
            setSuccess(null);
            return;
        }

        setIsSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await triageConfigService.updateQuestionLimit(value, accessToken);
            const config = extractQuestionLimit(res);
            const next = config?.number_of_diagnosis ?? value;
            setValue(next);
            setSavedValue(next);
            setSuccess('Đã lưu số câu hỏi tối đa cho phiên triage.');
        } catch (err) {
            setError(getErrorMessage(err, 'Không thể lưu cấu hình số câu hỏi AI.'));
        } finally {
            setIsSaving(false);
        }
    };

    const dirty = value !== savedValue;

    return (
        <div className="max-w-xl">
            <div className="bg-white rounded-2xl border border-[#EBEBEB] p-6 space-y-5">
                <div>
                    <h2 className="text-[15px] font-bold text-neutral-900">Số câu hỏi tối đa mỗi phiên triage</h2>
                    <p className="text-[13px] text-[#7B7B7B] font-medium mt-1">
                        Giới hạn số câu Infermedica hỏi bệnh nhân trước khi đưa ra chuyên khoa gợi ý. Cho phép từ {MIN_QUESTIONS} đến{' '}
                        {MAX_QUESTIONS} câu.
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex items-center gap-2 text-neutral-500 py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                        <span className="text-sm font-medium">Đang tải cấu hình...</span>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 whitespace-pre-line">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                        {success && (
                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-700 font-medium">
                                {success}
                            </div>
                        )}

                        <div>
                            <label htmlFor="question-limit" className="text-xs font-bold text-neutral-500 uppercase block mb-1.5">
                                Số câu hỏi
                            </label>
                            <input
                                id="question-limit"
                                type="number"
                                min={MIN_QUESTIONS}
                                max={MAX_QUESTIONS}
                                step={1}
                                value={value}
                                onChange={(e) => {
                                    const next = Number(e.target.value);
                                    setValue(Number.isFinite(next) ? next : MIN_QUESTIONS);
                                    setSuccess(null);
                                }}
                                className="w-32 border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-bold"
                            />
                            <p className="text-[12px] text-neutral-400 font-medium mt-1.5">1–20 câu / phiên triage</p>
                        </div>

                        <button
                            type="button"
                            onClick={() => void handleSave()}
                            disabled={isSaving || !dirty}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Lưu
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
