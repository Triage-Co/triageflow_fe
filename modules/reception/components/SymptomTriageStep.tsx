'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
    AlertCircle,
    AlertTriangle,
    Brain,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Clock,
    Loader2,
    Sparkles,
    Star,
    Stethoscope,
    User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    resolveAiCatalogSpecialty,
    resolveCatalogSpecialty,
    translateSpecialtyDisplayName,
} from '@/modules/reception/constants/registerDepartments';
import {
    symptomTriageService,
    type SymptomTriageResult,
} from '@/modules/reception/services/symptomTriageService';
import { receptionService } from '@/modules/reception/services/receptionService';
import {
    EMPTY_TRIAGE_SESSION,
    type InfermedicaSearchItem,
    type SymptomTriageSession,
} from '@/modules/reception/types/infermedica.types';
import { dobToAge } from '@/modules/reception/utils/infermedicaMapper';
import { formatCaughtError } from '@/shared/utils/apiError';
import type {
    BackendSpecialtyCatalogItem,
    ReceptionPriority,
    ReceptionSlot,
    ReceptionSpecialty,
} from '@/modules/reception/types/reception.types';
import {
    getActiveQuestionItem,
    getChoiceButtonLabel,
    getGroupSingleOptionLabel,
    getQuestionType,
    isGroupMultipleQuestion,
    isGroupSingleQuestion,
} from '@/modules/reception/utils/infermedicaInterviewI18n';
import {
    buildUpcomingDateOptions,
    formatSlotTimeRange,
    getDoctorSelectionKey,
    getTodayDateString,
} from '@/modules/reception/utils/receptionMapper';
import type { Gender } from '@/shared/types/auth.types';

const PRIORITY_OPTIONS: Array<{ value: ReceptionPriority; label: string; hint: string }> = [
    { value: 'Khẩn cấp', label: 'Khẩn cấp', hint: 'Cần xử lý ngay' },
    { value: 'Ưu tiên', label: 'Ưu tiên cao', hint: 'Chờ < 15 phút' },
    { value: 'Người cao tuổi', label: 'Người cao tuổi', hint: 'Ưu tiên hàng đợi' },
    { value: 'Thường', label: 'Thông thường', hint: 'Khám theo thứ tự' },
];

const DATE_OPTIONS = buildUpcomingDateOptions(7);
const TIME_GROUPS = [
    { id: 'morning', label: 'Buổi sáng', fromHour: 0, toHour: 12 },
    { id: 'afternoon', label: 'Buổi chiều', fromHour: 12, toHour: 17 },
    { id: 'evening', label: 'Buổi tối', fromHour: 17, toHour: 24 },
] as const;

const DEFAULT_DOCTOR_AVATAR =
    `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
            <rect width="96" height="96" rx="24" fill="#EDE9FE"/>
            <circle cx="48" cy="35" r="17" fill="#A78BFA"/>
            <path d="M18 88c2-20 13-30 30-30s28 10 30 30" fill="#8B5CF6"/>
            <path d="M42 58h12v17H42z" fill="#fff"/>
            <path d="M34 66h28v7H34z" fill="#fff"/>
        </svg>
    `)}`;

interface SymptomTriageStepProps {
    accessToken: string;
    citizenId: string;
    fullName: string;
    dob: string;
    gender: Gender;
    insuranceId?: string;
    phone?: string;
    email?: string;
    knownPatientId?: string | null;
    symptoms: string;
    onSymptomsChange: (value: string) => void;
    specialtyId: string;
    onSpecialtyChange: (value: string) => void;
    departmentId: string;
    onDepartmentChange: (value: string) => void;
    slotId: string;
    onSlotChange: (value: string) => void;
    priority: ReceptionPriority;
    onPriorityChange: (value: ReceptionPriority) => void;
    slots: ReceptionSlot[];
    specialties: ReceptionSpecialty[];
    specialtyCatalog: BackendSpecialtyCatalogItem[];
    onSlotsChange: (slots: ReceptionSlot[]) => void;
    onSpecialtiesChange: (specialties: ReceptionSpecialty[]) => void;
    triageSession: SymptomTriageSession;
    onTriageSessionChange: (session: SymptomTriageSession) => void;
    inputClass: string;
    isLoadingMeta: boolean;
}

function getDoctorKey(specialty: ReceptionSpecialty, index: number): string {
    return getDoctorSelectionKey(specialty, index);
}

function getDoctorName(specialty: ReceptionSpecialty): string {
    const raw = specialty.name ?? specialty.specialty_name ?? '';
    if (raw.toLowerCase().startsWith('bs')) return raw;
    return raw ? `BS. ${raw}` : 'Bác sĩ';
}

function getDoctorDegree(doctor: ReceptionSpecialty): string {
    return doctor.academic_degree?.trim() || 'Bác sĩ';
}

function parseHour(time?: string): number {
    if (!time) return 0;
    const hour = Number.parseInt(time.slice(0, 2), 10);
    return Number.isNaN(hour) ? 0 : hour;
}

function groupSlotsByPeriod(slots: ReceptionSlot[]) {
    return TIME_GROUPS.map((group) => ({
        ...group,
        slots: slots.filter((slot) => {
            const hour = parseHour(slot.start_time);
            return hour >= group.fromHour && hour < group.toHour;
        }),
    })).filter((group) => group.slots.length > 0);
}

export function SymptomTriageStep({
    accessToken,
    citizenId,
    fullName,
    dob,
    gender,
    insuranceId,
    phone,
    email,
    knownPatientId,
    symptoms,
    onSymptomsChange,
    specialtyId,
    onSpecialtyChange,
    departmentId,
    onDepartmentChange,
    slotId,
    onSlotChange,
    priority,
    onPriorityChange,
    slots,
    specialties,
    specialtyCatalog,
    onSlotsChange,
    onSpecialtiesChange,
    triageSession,
    onTriageSessionChange,
    inputClass,
    isLoadingMeta,
}: SymptomTriageStepProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<InfermedicaSearchItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedDate, setSelectedDate] = useState(getTodayDateString());
    const [dateScrollIndex, setDateScrollIndex] = useState(0);
    const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
    const userPickedDepartmentRef = useRef(false);

    const patientAge = useMemo(() => dobToAge(dob), [dob]);
    const canAnalyze =
        symptoms.trim().length >= 5 &&
        citizenId.length >= 9 &&
        dob.length > 0 &&
        fullName.trim().length > 0;

    const selectedCatalogSpecialty = useMemo(
        () => resolveCatalogSpecialty(departmentId, specialtyCatalog),
        [departmentId, specialtyCatalog],
    );

    const aiReferenceSpecialtyId = useMemo(
        () => resolveAiCatalogSpecialty(triageSession, specialtyCatalog)?.specialty_id ?? null,
        [triageSession, specialtyCatalog],
    );

    const filteredDoctors = useMemo(
        () => specialties.filter((s) => Boolean(s.doctor_id)),
        [specialties],
    );

    const selectedDoctor = useMemo(
        () => filteredDoctors.find((doctor, index) => getDoctorKey(doctor, index) === specialtyId),
        [filteredDoctors, specialtyId],
    );

    const doctorSlots = useMemo(() => {
        if (!selectedDoctor?.doctor_id) return [];
        return slots
            .filter((slot) => !slot.doctor_id || slot.doctor_id === selectedDoctor.doctor_id)
            .filter((slot) => !slot.shift?.date || slot.shift.date === selectedDate)
            .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));
    }, [slots, selectedDoctor, selectedDate]);

    const groupedSlots = useMemo(() => groupSlotsByPeriod(doctorSlots), [doctorSlots]);
    const visibleDates = useMemo(() => DATE_OPTIONS.slice(dateScrollIndex, dateScrollIndex + 5), [dateScrollIndex]);
    const selectedDateMeta = DATE_OPTIONS.find((d) => d.value === selectedDate);
    const selectedSlot = doctorSlots.find((s) => (s.slot_id ?? s.id) === slotId);
    const recommendedLabel =
        triageSession.recommended_department_label ??
        translateSpecialtyDisplayName(triageSession.recommended_specialist?.name);
    const showDoctors = Boolean(departmentId) && (isLoadingDoctors || filteredDoctors.length > 0);

    async function loadDoctorsForSpecialty(item: BackendSpecialtyCatalogItem, date = selectedDate) {
        setIsLoadingDoctors(true);
        try {
            const doctors = await receptionService.getDoctorsBySpecialtyCode(
                item.specialty_code,
                date,
                accessToken,
            );
            onSpecialtiesChange(doctors);
        } catch {
            onSpecialtiesChange([]);
        } finally {
            setIsLoadingDoctors(false);
        }
    }

    function applyAiSuggestedDepartment(session: SymptomTriageSession) {
        const suggested = resolveAiCatalogSpecialty(session, specialtyCatalog);
        if (!suggested) return;
        onDepartmentChange(suggested.specialty_id);
        onSpecialtyChange('');
        onSlotChange('');
        onSlotsChange([]);
        onSpecialtiesChange([]);
    }

    function applyRoutingResult(result: SymptomTriageResult) {
        setError(null);
        onTriageSessionChange(result.session);
        if (result.session.is_analyzed) {
            userPickedDepartmentRef.current = false;
            onSpecialtyChange('');
            onSlotChange('');
            applyAiSuggestedDepartment(result.session);
        }
        if (result.session.is_emergency) onPriorityChange('Khẩn cấp');
    }

    useEffect(() => {
        if (!triageSession.is_analyzed || userPickedDepartmentRef.current) return;
        if (specialtyCatalog.length === 0) return;

        const suggested = resolveAiCatalogSpecialty(triageSession, specialtyCatalog);
        if (!suggested || departmentId === suggested.specialty_id) return;

        applyAiSuggestedDepartment(triageSession);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ sync khi AI xong / catalog load
    }, [
        triageSession.is_analyzed,
        triageSession.recommended_department_id,
        triageSession.recommended_department_label,
        triageSession.recommended_specialist,
        specialtyCatalog,
        departmentId,
    ]);

    useEffect(() => {
        const phrase = symptoms.trim();
        const timer = window.setTimeout(() => {
            if (phrase.length < 2) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            void symptomTriageService.searchSymptoms(phrase, patientAge).then((items) => {
                setSearchResults(items.slice(0, 8));
                setIsSearching(false);
            });
        }, phrase.length < 2 ? 0 : 350);
        return () => window.clearTimeout(timer);
    }, [symptoms, patientAge]);

    useEffect(() => {
        if (!departmentId || specialtyCatalog.length === 0) return;
        const item = resolveCatalogSpecialty(departmentId, specialtyCatalog);
        if (!item) return;
        void loadDoctorsForSpecialty(item);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ reload khi đổi chuyên khoa
    }, [departmentId, specialtyCatalog]);

    const activeQuestionItem = triageSession.pending_question
        ? getActiveQuestionItem(triageSession.pending_question, triageSession.pending_item_index ?? 0)
        : null;
    const pendingQuestion = triageSession.pending_question;
    const questionType = pendingQuestion ? getQuestionType(pendingQuestion) : null;

    useEffect(() => {
        if (!selectedDoctor?.doctor_id) return;
        startTransition(async () => {
            try {
                const loaded = await receptionService.getDoctorSlots(
                    selectedDoctor.doctor_id!,
                    selectedDate,
                    accessToken,
                );
                onSlotsChange(
                    loaded.map((slot) => ({
                        ...slot,
                        doctor_id: slot.doctor_id ?? selectedDoctor.doctor_id,
                        shift: { ...slot.shift, date: selectedDate },
                    })),
                );
            } catch {
                onSlotsChange([]);
            }
        });
    }, [selectedDoctor?.doctor_id, selectedDate, accessToken, onSlotsChange]);

    function appendSymptomSuggestion(label: string) {
        const trimmed = symptoms.trim();
        onSymptomsChange(trimmed ? `${trimmed}, ${label}` : label);
        setSearchResults([]);
    }

    function runAnalysis() {
        if (!canAnalyze) {
            setError('Nhập ít nhất 5 ký tự triệu chứng và đảm bảo đã có CCCD + ngày sinh ở bước 1.');
            return;
        }
        setError(null);
        userPickedDepartmentRef.current = false;
        onTriageSessionChange(EMPTY_TRIAGE_SESSION);
        startTransition(async () => {
            try {
                const result = await symptomTriageService.startAnalysis({
                    symptoms,
                    citizenId,
                    fullName,
                    dob,
                    gender,
                    accessToken,
                    insuranceId,
                    phone,
                    email,
                    knownPatientId,
                });
                applyRoutingResult(result);
            } catch (err) {
                setError(formatCaughtError(err, 'Không phân tích được triệu chứng.'));
            }
        });
    }

    function answerQuestion(itemId: string, choiceId: string) {
        setError(null);
        startTransition(async () => {
            try {
                const result = await symptomTriageService.answerQuestion({
                    session: triageSession,
                    citizenId,
                    fullName,
                    dob,
                    gender,
                    accessToken,
                    symptoms,
                    insuranceId,
                    phone,
                    email,
                    knownPatientId,
                    itemId,
                    choiceId,
                });
                applyRoutingResult(result);
            } catch (err) {
                setError(formatCaughtError(err, 'Không gửi được câu trả lời phỏng vấn.'));
            }
        });
    }

    function handleDepartmentSelect(specialtyCatalogId: string) {
        userPickedDepartmentRef.current = true;
        onDepartmentChange(specialtyCatalogId);
        onSpecialtyChange('');
        onSlotChange('');
        onSlotsChange([]);
        onSpecialtiesChange([]);
        if (triageSession.pending_question) {
            onTriageSessionChange({
                ...triageSession,
                pending_question: null,
                pending_item_index: 0,
                routing_note: 'Đã bỏ qua phỏng vấn AI và chọn chuyên khoa thủ công.',
            });
            setError(null);
        }
        setSelectedDate(getTodayDateString());
        setDateScrollIndex(0);
    }

    function handleDoctorSelect(key: string) {
        onSpecialtyChange(key);
        onSlotChange('');
        setSelectedDate(getTodayDateString());
        setDateScrollIndex(0);
    }

    return (
        <div className="space-y-4">
            <div className="rounded-[14px] border border-[#EBEBEB] bg-white p-5 md:p-6 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-2 mb-4">
                    <ClipboardList className="w-4 h-4 text-[#8B7CF6]" strokeWidth={2.25} />
                    <h2 className="text-[15px] font-bold text-[#1F2937]">Triệu chứng & lý do khám</h2>
                </div>
                <textarea
                    rows={3}
                    placeholder="Mô tả triệu chứng bệnh nhân (đau đầu, sốt, khó thở...)"
                    value={symptoms}
                    onChange={(e) => onSymptomsChange(e.target.value)}
                    disabled={isPending}
                    className={cn(inputClass, 'resize-none min-h-[88px]')}
                />

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <button
                        type="button"
                        disabled={isPending || !canAnalyze}
                        onClick={runAnalysis}
                        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-[13px] font-bold shadow-[0_2px_8px_rgba(22,163,74,0.28)]"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                        Phân tích AI & gợi ý khoa
                    </button>
                    <p className="text-[11px] text-[#6B7280]">
                        AI hỏi thêm để làm rõ triệu chứng, rồi gợi ý mức độ và chuyên khoa.
                    </p>
                </div>
                {error && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-3 text-[12px] text-[#DC2626]">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}
            </div>

            {pendingQuestion && (
                <div className="rounded-[16px] border border-[#86EFAC] bg-gradient-to-br from-[#ECFDF5] via-[#F0FDF4] to-[#DCFCE7] p-5 shadow-[0_2px_14px_rgba(22,163,74,0.12)]">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#16A34A] flex items-center justify-center shadow-[0_2px_8px_rgba(22,163,74,0.3)]">
                                <Brain className="w-5 h-5 text-white" strokeWidth={2.25} />
                            </div>
                            <div>
                                <h2 className="text-[15px] font-bold text-[#14532D]">AI đang chẩn đoán</h2>
                                <p className="text-[11px] text-[#3F6212] mt-0.5">
                                    Trả lời để AI làm rõ tình trạng trước khi gợi ý khoa
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center rounded-full bg-white/90 border border-[#BBF7D0] px-2.5 py-1 text-[11px] font-bold text-[#166534]">
                                Câu {triageSession.questions_answered + 1}/{triageSession.required_questions || '—'}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-white/90 border border-[#BBF7D0] px-2.5 py-1 text-[11px] font-semibold text-[#166534]">
                                {triageSession.evidence.length} triệu chứng đã ghi nhận
                            </span>
                            {questionType && (
                                <span className="inline-flex items-center rounded-full bg-[#166534]/10 border border-[#86EFAC] px-2.5 py-1 text-[11px] font-semibold text-[#14532D]">
                                    {questionType === 'group_single'
                                        ? 'Chọn 1 mức án'
                                        : questionType === 'group_multiple'
                                          ? 'Trả lời từng mục'
                                          : 'Có / Không / Không rõ'}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="mb-4 h-2 rounded-full bg-white/80 border border-[#BBF7D0] overflow-hidden">
                        <div
                            className="h-full rounded-full bg-[#16A34A] transition-all duration-300"
                            style={{
                                width: `${Math.min(
                                    100,
                                    ((triageSession.questions_answered + 1) /
                                        Math.max(triageSession.required_questions || 1, 1)) *
                                        100,
                                )}%`,
                            }}
                        />
                    </div>

                    {isGroupMultipleQuestion(pendingQuestion) && pendingQuestion.items.length > 1 && (
                        <p className="mb-2 text-[11px] font-semibold text-[#3F6212]">
                            Mục {(triageSession.pending_item_index ?? 0) + 1}/{pendingQuestion.items.length} trong câu hỏi này
                        </p>
                    )}

                    <p className="text-[15px] font-bold text-[#14532D] leading-snug mb-4">
                        {pendingQuestion.text || 'Câu hỏi bổ sung từ AI'}
                    </p>

                    {isGroupSingleQuestion(pendingQuestion) ? (
                        <div className="flex flex-col gap-2">
                            {pendingQuestion.items.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => answerQuestion(item.id, 'present')}
                                    className="w-full text-left px-4 py-3 rounded-xl border border-[#86EFAC] bg-white text-[13px] font-semibold text-[#14532D] hover:bg-[#F0FDF4] hover:border-[#4ADE80] disabled:opacity-50"
                                >
                                    {getGroupSingleOptionLabel(item)}
                                </button>
                            ))}
                        </div>
                    ) : activeQuestionItem ? (
                        <div className="space-y-3">
                            {questionType === 'group_multiple' && activeQuestionItem.name && (
                                <p className="text-[13px] font-semibold text-[#166534]">
                                    {activeQuestionItem.name}
                                </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                                {activeQuestionItem.choices.map((choice) => (
                                    <button
                                        key={choice.id}
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => answerQuestion(activeQuestionItem.id, choice.id)}
                                        className="min-w-[96px] px-4 py-2.5 rounded-xl border border-[#86EFAC] bg-white text-[13px] font-bold text-[#14532D] hover:bg-[#F0FDF4] hover:border-[#4ADE80] disabled:opacity-50"
                                    >
                                        {getChoiceButtonLabel(choice.id, choice.label)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {isPending && (
                        <div className="mt-4 flex items-center gap-2 text-[12px] font-medium text-[#166534]">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            AI đang cập nhật chẩn đoán...
                        </div>
                    )}
                </div>
            )}

            {triageSession.is_analyzed && !pendingQuestion && (
                <div className="rounded-[16px] border border-[#86EFAC] bg-gradient-to-br from-[#ECFDF5] via-[#F0FDF4] to-[#DCFCE7] p-5 shadow-[0_2px_14px_rgba(22,163,74,0.12)]">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-[#16A34A] flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2.25} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-[15px] font-bold text-[#14532D]">Kết quả AI chẩn đoán</h2>
                            <p className="text-[12px] text-[#3F6212] mt-0.5">
                                Đã hoàn tất phỏng vấn. Bạn vẫn có thể chọn chuyên khoa thủ công bên dưới.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                        <div className="rounded-xl border border-[#BBF7D0] bg-white/90 px-3.5 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-[#65A30D]">Mức độ</p>
                            <p className="mt-1 text-[13px] font-bold text-[#14532D]">
                                {triageSession.triage_label || triageSession.triage_level || '—'}
                            </p>
                        </div>
                        <div className="rounded-xl border border-[#BBF7D0] bg-white/90 px-3.5 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-[#65A30D]">Khoa gợi ý</p>
                            <p className="mt-1 text-[13px] font-bold text-[#14532D]">
                                {recommendedLabel || triageSession.recommended_department_label || '—'}
                            </p>
                        </div>
                    </div>

                    {triageSession.is_emergency && (
                        <div className="mb-3 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-3 text-[12px] text-[#B91C1C]">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            AI phát hiện dấu hiệu cần ưu tiên / cấp cứu. Kiểm tra lại mức ưu tiên bên dưới.
                        </div>
                    )}

                    {triageSession.routing_note && (
                        <p className="text-[12px] text-[#3F6212] bg-white/70 border border-[#BBF7D0] rounded-xl px-3.5 py-2.5">
                            {triageSession.routing_note}
                        </p>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-[14px] border border-[#EBEBEB] bg-white p-5 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-2 mb-4">
                        <Stethoscope className="w-4 h-4 text-[#8B7CF6]" strokeWidth={2.25} />
                        <h2 className="text-[15px] font-bold text-[#1F2937]">Chọn chuyên khoa</h2>
                    </div>
                    <p className="mb-3 text-[11px] text-[#6B7280]">
                        Chọn chuyên khoa để hệ thống chỉ hiển thị bác sĩ phụ trách khoa đó.
                    </p>
                    {isLoadingMeta && specialtyCatalog.length === 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-9 w-24 rounded-xl bg-[#F3F4F6] animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto pr-1">
                            {specialtyCatalog.map((item) => {
                                const isSelected = departmentId === item.specialty_id;
                                const isAiReference = aiReferenceSpecialtyId === item.specialty_id;
                                return (
                                    <button
                                        key={item.specialty_id}
                                        type="button"
                                        disabled={isPending || isLoadingDoctors}
                                        onClick={() => handleDepartmentSelect(item.specialty_id)}
                                        className={cn(
                                            'px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-colors',
                                            isSelected
                                                ? 'bg-[#8B7CF6] text-white shadow-[0_2px_8px_rgba(139,124,246,0.25)]'
                                                : isAiReference
                                                  ? 'bg-[#FAFAFF] text-[#5B21B6] border border-dashed border-[#C4B5FD]'
                                                  : 'bg-[#F9FAFB] text-[#374151] border border-[#E5E7EB] hover:border-[#C4B5FD] hover:bg-[#F5F3FF]',
                                        )}
                                    >
                                        {item.specialty_name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {selectedCatalogSpecialty && (
                        <p className="mt-3 text-[11px] text-[#6B7280]">
                            Đã chọn: <strong>{selectedCatalogSpecialty.specialty_name}</strong>
                            {selectedCatalogSpecialty.specialty_code && (
                                <span className="text-[#9CA3AF]"> ({selectedCatalogSpecialty.specialty_code})</span>
                            )}
                        </p>
                    )}
                    {recommendedLabel && triageSession.is_analyzed && (
                        <div className="mt-4 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3.5 py-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-[#16A34A] shrink-0" />
                                <p className="text-[12px] text-[#166534]">
                                    AI gợi ý khoa: <strong className="text-[#14532D]">{recommendedLabel}</strong>
                                    {' — '}có thể chọn khác nếu cần.
                                </p>
                            </div>
                            {aiReferenceSpecialtyId && departmentId !== aiReferenceSpecialtyId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        userPickedDepartmentRef.current = false;
                                        applyAiSuggestedDepartment(triageSession);
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-bold text-[#15803D] bg-white border border-[#86EFAC] rounded-lg hover:bg-[#DCFCE7] shadow-sm transition shrink-0"
                                >
                                    Chọn khoa AI gợi ý
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="rounded-[16px] border border-[#EBEBEB] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] flex items-center justify-center">
                                <User className="w-4 h-4 text-[#8B7CF6]" strokeWidth={2.25} />
                            </div>
                            <div>
                                <h2 className="text-[15px] font-bold text-[#1F2937]">
                                    Chọn bác sĩ <span className="text-[#EF4444]">*</span>
                                </h2>
                                <p className="text-[11px] text-[#9CA3AF] mt-0.5">Chọn bác sĩ phù hợp với chuyên khoa</p>
                            </div>
                        </div>
                        {showDoctors && (
                            <span className="text-[11px] font-semibold text-[#8B7CF6] bg-[#F5F3FF] px-2.5 py-1 rounded-full">
                                {isLoadingDoctors ? 'Đang tải...' : `${filteredDoctors.length} bác sĩ`}
                            </span>
                        )}
                    </div>
                    {isLoadingMeta || isLoadingDoctors ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-[88px] rounded-2xl bg-[#F3F4F6] animate-pulse" />
                            ))}
                        </div>
                    ) : showDoctors ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                            {filteredDoctors.map((doctor, index) => {
                                const key = getDoctorKey(doctor, index);
                                const isSelected = specialtyId === key;
                                const name = getDoctorName(doctor);
                                const degree = getDoctorDegree(doctor);
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => handleDoctorSelect(key)}
                                        className={cn(
                                            'flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all',
                                            isSelected
                                                ? 'border-[#8B7CF6] bg-gradient-to-br from-[#FAFAFF] to-[#F5F3FF] shadow-[0_4px_16px_rgba(139,124,246,0.18)] ring-1 ring-[#8B7CF6]/25'
                                                : 'border-[#F3F4F6] bg-[#FAFAFA] hover:border-[#DDD6FE] hover:bg-white',
                                        )}
                                    >
                                        <div
                                            role="img"
                                            aria-label={`Ảnh ${name}`}
                                            className="w-14 h-14 rounded-2xl shrink-0 bg-cover bg-center border border-[#EDE9FE]"
                                            style={{
                                                backgroundImage: `url("${doctor.avatar_url || DEFAULT_DOCTOR_AVATAR}"), url("${DEFAULT_DOCTOR_AVATAR}")`,
                                            }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-[#8B7CF6] truncate">
                                                {degree}
                                            </p>
                                            <p className="text-[13px] font-bold text-[#1F2937] truncate mt-0.5">{name}</p>
                                            <p className="text-[11px] text-[#6B7280] truncate mt-0.5">
                                                {doctor.specialty_name ?? 'Bác sĩ điều trị'}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                                                {doctor.rating !== undefined && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#B45309]">
                                                        <Star className="w-3 h-3 fill-[#FBBF24] text-[#F59E0B]" />
                                                        {doctor.rating.toFixed(1)}
                                                        {doctor.review_count !== undefined && (
                                                            <span className="font-medium text-[#9CA3AF]">
                                                                ({doctor.review_count})
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                                {doctor.experience_years !== undefined && (
                                                    <span className="text-[10px] font-medium text-[#6B7280]">
                                                        {doctor.experience_years} năm KN
                                                    </span>
                                                )}
                                                {doctor.license_number && (
                                                    <span className="text-[10px] text-[#9CA3AF]">
                                                        CCHN {doctor.license_number}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="w-6 h-6 rounded-full bg-[#8B7CF6] flex items-center justify-center shrink-0">
                                                <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-[12px] text-[#9CA3AF] py-4 text-center">
                            {!departmentId
                                ? 'Chọn chuyên khoa trước để xem danh sách bác sĩ.'
                                : isLoadingDoctors
                                  ? 'Đang tải bác sĩ theo chuyên khoa...'
                                  : 'Chưa có bác sĩ trực cho chuyên khoa này hôm nay.'}
                        </p>
                    )}
                </div>
            </div>

            {specialtyId && (
                <div className="rounded-[16px] border border-[#EBEBEB] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] flex items-center justify-center">
                            <CalendarDays className="w-4 h-4 text-[#8B7CF6]" strokeWidth={2.25} />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-bold text-[#1F2937]">
                                Chọn ngày & giờ khám <span className="text-[#EF4444]">*</span>
                            </h2>
                            <p className="text-[11px] text-[#9CA3AF] mt-0.5">{getDoctorName(selectedDoctor ?? {})}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-5">
                        <button
                            type="button"
                            disabled={dateScrollIndex <= 0 || isPending}
                            onClick={() => setDateScrollIndex((i) => Math.max(0, i - 1))}
                            className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center disabled:opacity-30 shrink-0"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex-1 grid grid-cols-5 gap-2">
                            {visibleDates.map((date) => {
                                const isSelected = selectedDate === date.value;
                                return (
                                    <button
                                        key={date.value}
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => {
                                            setSelectedDate(date.value);
                                            onSlotChange('');
                                        }}
                                        className={cn(
                                            'flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border transition-all min-h-[72px]',
                                            isSelected
                                                ? 'border-[#8B7CF6] bg-[#8B7CF6] text-white shadow-[0_4px_12px_rgba(139,124,246,0.35)]'
                                                : 'border-[#F3F4F6] bg-[#FAFAFA] text-[#374151] hover:border-[#DDD6FE] hover:bg-[#F5F3FF]',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'text-[10px] font-bold uppercase',
                                                isSelected ? 'text-white/85' : 'text-[#9CA3AF]',
                                            )}
                                        >
                                            {date.isToday ? 'Hôm nay' : date.weekday}
                                        </span>
                                        <span className="text-[18px] font-extrabold leading-none mt-1">{date.day}</span>
                                        <span
                                            className={cn(
                                                'text-[10px] font-medium mt-0.5',
                                                isSelected ? 'text-white/80' : 'text-[#9CA3AF]',
                                            )}
                                        >
                                            Th{date.month}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            disabled={dateScrollIndex + 5 >= DATE_OPTIONS.length || isPending}
                            onClick={() => setDateScrollIndex((i) => Math.min(DATE_OPTIONS.length - 5, i + 1))}
                            className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center disabled:opacity-30 shrink-0"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {isPending ? (
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-11 rounded-xl bg-[#F3F4F6] animate-pulse" />
                            ))}
                        </div>
                    ) : doctorSlots.length > 0 ? (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#6B7280]">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded border border-[#D1D5DB] bg-white" />
                                    Còn chỗ
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded border border-[#FCA5A5] bg-[#FEE2E2]" />
                                    Đã đầy
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded bg-[#16A34A]" />
                                    Đang chọn
                                </span>
                            </div>
                            {groupedSlots.map((group) => (
                                <div key={group.id}>
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <Clock className="w-3.5 h-3.5 text-[#8B7CF6]" />
                                        <p className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wide">
                                            {group.label}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                        {group.slots.map((slot, i) => {
                                            const id = slot.slot_id ?? slot.id ?? String(i);
                                            const isSelected = slotId === id;
                                            const isFull = Boolean(slot.is_full);
                                            
                                            // Kiểm tra nếu là khung giờ đã qua so với thời gian hiện tại
                                            let isPast = false;
                                            if (selectedDate === getTodayDateString()) {
                                                const now = new Date();
                                                const currentHours = now.getHours();
                                                const currentMinutes = now.getMinutes();
                                                if (slot.start_time) {
                                                    const [h, m] = slot.start_time.split(':').map(Number);
                                                    if (h < currentHours || (h === currentHours && m <= currentMinutes)) {
                                                        isPast = true;
                                                    }
                                                }
                                            }

                                            return (
                                                <button
                                                    key={id}
                                                    type="button"
                                                    disabled={isFull || isPast}
                                                    onClick={() => {
                                                        if (!isFull && !isPast) onSlotChange(id);
                                                    }}
                                                    className={cn(
                                                        'relative px-3 py-3 rounded-xl border text-center transition-all disabled:cursor-not-allowed',
                                                        isSelected
                                                            ? 'border-[#16A34A] bg-[#16A34A] text-white shadow-[0_4px_12px_rgba(22,163,74,0.3)]'
                                                            : isPast
                                                              ? 'border-neutral-200 bg-neutral-100 text-neutral-400 opacity-60'
                                                              : isFull
                                                                ? 'border-[#FCA5A5] bg-[#FEE2E2] text-[#B91C1C]'
                                                                : 'border-[#E5E7EB] bg-white text-[#374151] hover:border-[#86EFAC] hover:bg-[#F0FDF4]',
                                                    )}
                                                >
                                                    <span className="text-[13px] font-bold block">
                                                        {slot.start_time?.slice(0, 5)}
                                                    </span>
                                                    {slot.end_time && (
                                                        <span
                                                            className={cn(
                                                                'text-[10px] block mt-0.5',
                                                                isSelected
                                                                    ? 'text-white/80'
                                                                    : isPast
                                                                      ? 'text-neutral-400'
                                                                      : isFull
                                                                        ? 'text-[#DC2626]'
                                                                        : 'text-[#9CA3AF]',
                                                            )}
                                                        >
                                                            đến {slot.end_time.slice(0, 5)}
                                                        </span>
                                                    )}
                                                    <span
                                                        className={cn(
                                                            'text-[9px] font-semibold block mt-1',
                                                            isSelected
                                                                ? 'text-white'
                                                                : isPast
                                                                  ? 'text-neutral-400'
                                                                  : isFull
                                                                    ? 'text-[#B91C1C]'
                                                                    : 'text-[#16A34A]',
                                                        )}
                                                    >
                                                        {isPast
                                                            ? 'Đã qua'
                                                            : isFull
                                                              ? 'Đã đầy'
                                                              : slot.capacity !== undefined
                                                                ? `Còn ${slot.capacity} chỗ`
                                                                : 'Còn chỗ'}
                                                    </span>
                                                    {isSelected && (
                                                        <Check
                                                            className="w-3 h-3 absolute top-1.5 right-1.5 text-white"
                                                            strokeWidth={3}
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            {slotId && selectedSlot && (
                                <div className="rounded-xl border border-[#86EFAC] bg-[#F0FDF4] px-4 py-3 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-[#16A34A] flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-bold text-[#166534]">Đã chọn lịch khám</p>
                                        <p className="text-[11px] text-[#15803D] mt-0.5">
                                            {selectedDateMeta?.isToday ? 'Hôm nay' : selectedDateMeta?.weekday} ·{' '}
                                            {formatSlotTimeRange(selectedSlot.start_time, selectedSlot.end_time)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA] px-4 py-8 text-center">
                            <CalendarDays className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
                            <p className="text-[12px] text-[#9CA3AF]">Không có khung giờ trống cho ngày này.</p>
                            <p className="text-[11px] text-[#C4B5FD] mt-1">Thử chọn ngày khác hoặc bác sĩ khác.</p>
                        </div>
                    )}
                </div>
            )}

            <div className="rounded-[14px] border border-[#EBEBEB] bg-white p-5 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-[#8B7CF6]" strokeWidth={2.25} />
                    <h2 className="text-[15px] font-bold text-[#1F2937]">Mức độ ưu tiên</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PRIORITY_OPTIONS.map((option) => {
                        const isSelected = priority === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                disabled={isPending}
                                onClick={() => onPriorityChange(option.value)}
                                className={cn(
                                    'flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-colors',
                                    isSelected
                                        ? 'border-[#8B7CF6] bg-[#FAFAFF] ring-1 ring-[#8B7CF6]/20'
                                        : 'border-[#F3F4F6] bg-white hover:border-[#E5E7EB]',
                                )}
                            >
                                <span className="text-[13px] font-semibold text-[#374151]">{option.label}</span>
                                <span className="text-[11px] text-[#9CA3AF] shrink-0">{option.hint}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
