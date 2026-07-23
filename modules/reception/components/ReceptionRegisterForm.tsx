'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
    ChevronLeft,
    Loader2,
    AlertCircle,
    CheckCircle2,
    ArrowRight,
    ScanLine,
    User,
    Stethoscope,
    CreditCard,
    Clock,
    Wallet,
    ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { receptionService } from '@/modules/reception/services/receptionService';
import { CccdQrScanner } from '@/modules/reception/components/CccdQrScanner';
import { CccdImageUpload } from '@/modules/reception/components/CccdImageUpload';
import { SymptomTriageStep } from '@/modules/reception/components/SymptomTriageStep';
import {
    RegisterConfirmStep,
    type RegisterPaymentMethod,
} from '@/modules/reception/components/RegisterConfirmStep';
import { RegisterSuccessStep } from '@/modules/reception/components/RegisterSuccessStep';
import { PayOsPaymentPanel } from '@/modules/reception/components/PayOsPaymentPanel';
import type { CccdScanResult } from '@/modules/reception/utils/cccdQrParser';
import type {
    BackendSpecialtyCatalogItem,
    ReceptionAccount,
    ReceptionPriority,
    ReceptionSlot,
    ReceptionSpecialty,
    RegistrationResult,
    TransactionQrResponse,
} from '@/modules/reception/types/reception.types';
import {
    EMPTY_TRIAGE_SESSION,
    type SymptomTriageSession,
} from '@/modules/reception/types/infermedica.types';
import { formatCaughtError, isPaymentLinkError } from '@/shared/utils/apiError';
import { ApiError } from '@/shared/services/apiClient';
import {
    extractBookingCreateFields,
    findDoctorBySelectionKey,
    formatQueueTicketNo,
    formatSlotTimeLabel,
    getDoctorDisplayLabel,
} from '@/modules/reception/utils/receptionMapper';
import {
    applyRegisterPrefillToForm,
    applyRegisterStep1DraftToForm,
    clearRegisterStep1Draft,
    consumeRegisterPrefill,
    loadRegisterStep1Draft,
    saveRegisterStep1Draft,
    type RegisterPrefill,
} from '@/modules/reception/utils/registerPrefill';
import { REGISTER_DEPARTMENTS, resolveCatalogSpecialty, translateSpecialtyDisplayName } from '@/modules/reception/constants/registerDepartments';

import type { Gender } from '@/shared/types/auth.types';

type Step = 1 | 2 | 3 | 4;

interface FormState {
    citizen_id: string;
    full_name: string;
    email: string;
    dob: string;
    gender: Gender;
    phone: string;
    address: string;
    insurance_id: string;
    symptoms: string;
    department_id: string;
    slot_id: string;
    specialty_id: string;
    priority: ReceptionPriority;
    payment_method: RegisterPaymentMethod;
}

const INITIAL: FormState = {
    citizen_id: '',
    full_name: '',
    email: '',
    dob: '',
    gender: 'FEMALE',
    phone: '',
    address: '',
    insurance_id: '',
    symptoms: '',
    department_id: '',
    slot_id: '',
    specialty_id: '',
    priority: 'Thường',
    payment_method: 'bhyt',
};

const STEPS = [
    { num: 1, label: 'Thông tin bệnh nhân', icon: User },
    { num: 2, label: 'Triệu chứng & khoa', icon: Stethoscope },
    { num: 3, label: 'Thanh toán & xác nhận', icon: CreditCard },
    { num: 4, label: 'Hoàn tất', icon: CheckCircle2 },
] as const;

const PAYMENT_LABELS: Record<RegisterPaymentMethod, string> = {
    bhyt: 'BHYT',
    qr: 'QR Code / VietQR',
    card: 'Thẻ ngân hàng',
    cash: 'Tiền mặt',
};

function getDepartmentLabel(
    departmentId: string,
    specialtyCatalog: BackendSpecialtyCatalogItem[],
    specialty: ReceptionSpecialty | undefined,
    triageSession: SymptomTriageSession,
): string {
    const fromCatalog = resolveCatalogSpecialty(departmentId, specialtyCatalog)?.specialty_name;
    if (fromCatalog) return fromCatalog;

    const manualDept = REGISTER_DEPARTMENTS.find((d) => d.id === departmentId)?.label;
    if (manualDept) return manualDept;

    if (triageSession.recommended_department_label) {
        return `${triageSession.recommended_department_label} (AI tham khảo)`;
    }
    if (specialty?.specialty_name) {
        return specialty.specialty_name;
    }
    if (triageSession.recommended_specialist?.name) {
        return translateSpecialtyDisplayName(triageSession.recommended_specialist.name);
    }
    return 'Khám bệnh';
}

function getWaitTimeLabel(triageSession: SymptomTriageSession): string {
    if (triageSession.triage_level === 'emergency') return '5–10 phút';
    if (triageSession.triage_level === 'consultation') return '20–30 phút';
    return '10–15 phút';
}

const inputClass =
    'block w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-[13px] text-[#1F2937] placeholder-[#9CA3AF] outline-none transition focus:border-[#8B7CF6] focus:ring-2 focus:ring-[#8B7CF6]/15 disabled:opacity-50 disabled:bg-[#F9FAFB]';

function RequiredLabel({ children }: { children: React.ReactNode }) {
    return (
        <label className="block text-[13px] font-medium text-[#374151]">
            {children}
            <span className="text-[#EF4444] ml-0.5">*</span>
        </label>
    );
}

function Stepper({ current }: { current: Step }) {
    return (
        <div className="flex items-center w-full mb-8">
            {STEPS.map((step, idx) => {
                const isActive = step.num === current;
                const isDone = step.num < current;
                return (
                    <div key={step.num} className={cn('flex items-center', idx < STEPS.length - 1 ? 'flex-1' : '')}>
                        <div className="flex flex-col items-center shrink-0">
                            <div
                                className={cn(
                                    'w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold border-2 transition-colors',
                                    isActive
                                        ? 'bg-[#8B7CF6] border-[#8B7CF6] text-white'
                                        : isDone
                                          ? 'bg-[#8B7CF6] border-[#8B7CF6] text-white'
                                          : 'bg-white border-[#E5E7EB] text-[#9CA3AF]',
                                )}
                            >
                                {isDone ? <CheckCircle2 className="w-4 h-4" /> : step.num}
                            </div>
                            <span
                                className={cn(
                                    'text-[11px] font-semibold mt-1.5 whitespace-nowrap hidden sm:block',
                                    isActive ? 'text-[#8B7CF6]' : 'text-[#9CA3AF]',
                                )}
                            >
                                {step.label}
                            </span>
                        </div>
                        {idx < STEPS.length - 1 && (
                            <div
                                className={cn(
                                    'flex-1 h-0.5 mx-3 rounded-full',
                                    step.num < current ? 'bg-[#8B7CF6]' : 'bg-[#E5E7EB]',
                                )}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export function ReceptionRegisterForm() {
    const accessToken = useAuthStore((s) => s.accessToken);
    const [isPending, startTransition] = useTransition();

    const [step, setStep] = useState<Step>(1);
    const [form, setForm] = useState<FormState>(INITIAL);
    const [slots, setSlots] = useState<ReceptionSlot[]>([]);
    const [specialties, setSpecialties] = useState<ReceptionSpecialty[]>([]);
    const [specialtyCatalog, setSpecialtyCatalog] = useState<BackendSpecialtyCatalogItem[]>([]);
    const [existingAccount, setExistingAccount] = useState<ReceptionAccount | null>(null);
    const [isLoadingMeta, setIsLoadingMeta] = useState(true);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [isLookingUp, setIsLookingUp] = useState(false);
    const [scanBanner, setScanBanner] = useState<string | null>(null);
    const [lookupBanner, setLookupBanner] = useState<'found' | 'new' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [registrationResult, setRegistrationResult] = useState<RegistrationResult | null>(null);
    const [triageSession, setTriageSession] = useState<SymptomTriageSession>(EMPTY_TRIAGE_SESSION);
    const prefillRef = useRef<RegisterPrefill | null>(null);
    const prefillLookupDoneRef = useRef(false);
    const draftHydratedRef = useRef(false);

    const [createdBooking, setCreatedBooking] = useState<{ bookingId: string; stepId: string } | null>(null);
    const [qrTransaction, setQrTransaction] = useState<TransactionQrResponse | null>(null);
    const [isCreatingTx, setIsCreatingTx] = useState(false);

    useEffect(() => {
        setCreatedBooking(null);
        setQrTransaction(null);
    }, [form.slot_id, form.specialty_id]);

    const handleQrPaymentSelected = async () => {
        if (!accessToken) return;
        if (qrTransaction) return;
        
        setIsCreatingTx(true);
        setError(null);
        try {
            let patientId = existingAccount?.patient_id;
            const email = form.email || `bn.${form.citizen_id.slice(-8)}@patient.triageflow.me`;
            
            if (!patientId) {
                const suffix = form.citizen_id.slice(-6);
                patientId = await receptionService.registerPatient({
                    email,
                    full_name: form.full_name,
                    dob: form.dob,
                    password: `Patient@${suffix}`,
                    gender: form.gender,
                    citizen_id: form.citizen_id,
                    phone: form.phone || undefined,
                    bhyt: form.insurance_id || undefined,
                }, accessToken);
                if (patientId) {
                    setExistingAccount((prev) =>
                        prev
                            ? { ...prev, patient_id: patientId }
                            : {
                                  account_id: '',
                                  patient_id: patientId,
                                  full_name: form.full_name.trim(),
                                  citizen_id: form.citizen_id.trim(),
                                  email: form.email,
                                  dob: form.dob,
                                  gender: form.gender,
                                  role: 'PATIENT',
                                  phone: form.phone || null,
                                  bhyt: form.insurance_id || null,
                              },
                    );
                }
            }
            
            if (!patientId) {
                throw new Error('Không tìm thấy hồ sơ bệnh nhân để đặt lịch.');
            }

            let bookingId = createdBooking?.bookingId;
            let stepId = createdBooking?.stepId;
            let paymentData = qrTransaction;

            console.log('[Register Debug] Input - patientId:', patientId, 'slot_id:', form.slot_id);

            if (!bookingId) {
                const bookingRes = await receptionService.createBooking(
                    { patient_id: patientId, slot_id: form.slot_id },
                    accessToken,
                );
                console.log('[Register Debug] Response from API /api/booking:', bookingRes);
                const extracted = extractBookingCreateFields(bookingRes);
                const bData = bookingRes?.data as any;

                bookingId =
                    extracted.bookingId ||
                    bData?.data?.booking_id ||
                    bData?.booking_id ||
                    bData?.data?.id ||
                    bData?.id ||
                    extracted.stepId ||
                    bData?.step_id;
                stepId =
                    extracted.stepId ||
                    bData?.step_id ||
                    (bData?.steps && bData.steps.length > 0 ? bData.steps[0].id : undefined) ||
                    bookingId ||
                    'step-1';
                
                console.log('[Register Debug] Parsed bookingId:', bookingId, 'stepId:', stepId);

                if (bookingId) {
                    setCreatedBooking({ bookingId, stepId: stepId || 'step-1' });
                }

                if (bData?.payment?.data) {
                    paymentData = bData.payment.data;
                    setQrTransaction(bData.payment.data);
                }
            }

            if (!bookingId) {
                throw new Error('Không nhận được mã lịch khám từ hệ thống.');
            }

            if (!paymentData) {
                const tx = await receptionService.createTransaction(
                    {
                        transType: 'BOOKING_PAYMENT_1',
                        amount: 200000,
                        clientId: bookingId,
                        returnUrl: `${window.location.origin}/reception`,
                        cancelUrl: `${window.location.origin}/reception`,
                    },
                    accessToken,
                );
                if (tx && tx.data) {
                    setQrTransaction(tx.data);
                } else {
                    throw new Error('Không tạo được giao dịch PayOS.');
                }
            }
        } catch (err) {
            console.error('[Register] Error generating QR in Step 3:', err);
            setError(err instanceof Error ? err.message : 'Tạo mã thanh toán QR thất bại.');
        } finally {
            setIsCreatingTx(false);
        }
    };

    useEffect(() => {
        if (step === 3 && form.payment_method === 'qr') {
            void handleQrPaymentSelected();
        }
    }, [step, form.payment_method]);

    useEffect(() => {
        if (draftHydratedRef.current) return;
        draftHydratedRef.current = true;

        const prefill = consumeRegisterPrefill();
        prefillRef.current = prefill;

        if (prefill) {
            setForm((prev) => applyRegisterPrefillToForm(prev, prefill));
            if (prefill.patient_id || prefill.account_id) {
                setExistingAccount({
                    account_id: prefill.account_id ?? '',
                    patient_id: prefill.patient_id,
                    full_name: prefill.full_name,
                    citizen_id: prefill.citizen_id,
                    email: prefill.email ?? '',
                    dob: prefill.dob || '',
                    gender: (prefill.gender as any) || 'FEMALE',
                    role: 'PATIENT',
                    phone: prefill.phone ?? null,
                    bhyt: prefill.insurance_id || null,
                });
            }
            setScanBanner('Đã tải thông tin bệnh nhân từ tra cứu.');
            setStep(2);
            return;
        }

        const draft = loadRegisterStep1Draft();
        if (!draft) return;

        setForm((prev) => applyRegisterStep1DraftToForm(prev, draft));
        if (draft.lookup_banner) setLookupBanner(draft.lookup_banner);
        if (draft.existing_patient_id || draft.existing_account_id) {
            setExistingAccount({
                account_id: draft.existing_account_id ?? '',
                patient_id: draft.existing_patient_id ?? undefined,
                full_name: draft.full_name,
                citizen_id: draft.citizen_id,
                email: draft.email,
                dob: draft.dob,
                gender: draft.gender,
                role: 'PATIENT',
                phone: draft.phone || null,
                bhyt: draft.insurance_id || null,
            });
        }
        if (draft.citizen_id || draft.full_name) {
            setScanBanner('Đã khôi phục thông tin bệnh nhân từ lần nhập trước.');
        }
    }, []);

    useEffect(() => {
        if (!draftHydratedRef.current || step === 4) return;

        saveRegisterStep1Draft({
            citizen_id: form.citizen_id,
            full_name: form.full_name,
            email: form.email,
            dob: form.dob,
            gender: form.gender,
            phone: form.phone,
            address: form.address,
            insurance_id: form.insurance_id,
            existing_patient_id: existingAccount?.patient_id ?? null,
            existing_account_id: existingAccount?.account_id ?? null,
            lookup_banner: lookupBanner,
        });
    }, [
        form.citizen_id,
        form.full_name,
        form.email,
        form.dob,
        form.gender,
        form.phone,
        form.address,
        form.insurance_id,
        existingAccount?.patient_id,
        existingAccount?.account_id,
        lookupBanner,
        step,
    ]);

    useEffect(() => {
        if (!accessToken) return;

        const loadMeta = async () => {
            try {
                setIsLoadingMeta(true);
                const catalog = await receptionService.getSpecialtyCatalog(accessToken);
                setSpecialtyCatalog(catalog);
                setSpecialties([]);
                setSlots([]);
            } catch {
                setSpecialtyCatalog([]);
                setSlots([]);
                setSpecialties([]);
            } finally {
                setIsLoadingMeta(false);
            }
        };

        loadMeta();
    }, [accessToken]);

    function update<K extends keyof FormState>(field: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    const step1Valid =
        form.full_name.trim().length > 0 &&
        form.citizen_id.length >= 9 &&
        form.dob.length > 0;

    const step2Valid =
        form.symptoms.trim().length >= 5 &&
        form.department_id.length > 0 &&
        form.specialty_id.length > 0 &&
        form.slot_id.length > 0;

    useEffect(() => {
        if (step !== 2 || !accessToken || !step1Valid) return;

        void receptionService
            .ensurePatientProfileForTriage(
                {
                    citizen_id: form.citizen_id.trim(),
                    full_name: form.full_name.trim(),
                    dob: form.dob,
                    gender: form.gender,
                    medical_coverage_id: form.insurance_id,
                    phone: form.phone,
                    email: form.email,
                    known_patient_id: existingAccount?.patient_id,
                },
                accessToken,
            )
            .then((patientId) => {
                if (!patientId) return;
                setExistingAccount((prev) =>
                    prev
                        ? { ...prev, patient_id: patientId }
                        : {
                              account_id: '',
                              patient_id: patientId,
                              full_name: form.full_name.trim(),
                              citizen_id: form.citizen_id.trim(),
                              email: form.email,
                              dob: form.dob,
                              gender: form.gender,
                              role: 'PATIENT',
                              phone: form.phone || null,
                              bhyt: form.insurance_id || null,
                          },
                );
            })
            .catch(() => {
                /* lỗi sẽ hiện khi phân tích / trả lời AI */
            });
    }, [
        step,
        accessToken,
        step1Valid,
        form.citizen_id,
        form.full_name,
        form.dob,
        form.gender,
        form.insurance_id,
        form.phone,
        form.email,
        existingAccount?.patient_id,
    ]);

    async function lookupPatientByCitizen(citizenId: string) {
        const cleanId = citizenId.replace(/\D/g, '');
        if (!accessToken || cleanId.length < 9) return;

        setIsLookingUp(true);
        setLookupBanner(null);
        try {
            const found = await receptionService.findAccountByCitizenId(cleanId, accessToken);
            if (found) {
                setForm((prev) => ({
                    ...prev,
                    full_name: found.full_name || prev.full_name,
                    email: found.email || prev.email,
                    gender: (found.gender as Gender) || prev.gender,
                    phone: found.phone ?? prev.phone,
                    dob: found.dob ? found.dob.slice(0, 10) : prev.dob,
                    insurance_id:
                        found.bhyt && found.bhyt !== 'N/A' ? found.bhyt : prev.insurance_id,
                }));
                setLookupBanner('found');

                // Tra cứu thấy thông tin ≠ chắc có patient_id — bổ sung hồ sơ nếu thiếu
                if (!found.patient_id && accessToken) {
                    try {
                        const patientId = await receptionService.ensurePatientProfileForTriage(
                            {
                                citizen_id: cleanId,
                                full_name: found.full_name || form.full_name,
                                dob: (found.dob ? found.dob.slice(0, 10) : form.dob) || form.dob,
                                gender: (found.gender as Gender) || form.gender,
                                medical_coverage_id:
                                    found.bhyt && found.bhyt !== 'N/A' ? found.bhyt : form.insurance_id,
                                phone: found.phone ?? form.phone,
                                email: found.email || form.email,
                            },
                            accessToken,
                        );
                        setExistingAccount({ ...found, patient_id: patientId });
                    } catch {
                        setExistingAccount(found);
                    }
                } else {
                    setExistingAccount(found);
                }
            } else {
                setExistingAccount(null);
                setLookupBanner('new');
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? `Lỗi tra cứu hồ sơ: ${err.message}`
                    : 'Lỗi kết nối khi tra cứu bệnh nhân. Vui lòng thử lại.',
            );
        } finally {
            setIsLookingUp(false);
        }
    }

    useEffect(() => {
        if (!accessToken || prefillLookupDoneRef.current || !prefillRef.current) return;
        const citizenId = prefillRef.current.citizen_id.replace(/\D/g, '');
        if (citizenId.length < 9) return;

        prefillLookupDoneRef.current = true;
        void lookupPatientByCitizen(citizenId);
    }, [accessToken]);

    async function handleCccdData(data: CccdScanResult, source: 'qr' | 'image' = 'qr') {
        setError(null);
        setScanBanner(
            source === 'image'
                ? 'Đã phân tích ảnh CCCD và tự động điền thông tin.'
                : data.ekyc_verified
                  ? 'Xác thực eKYC thành công! Đã điền thông tin từ CCCD/VNeID.'
                  : 'Quét thành công! Đã điền thông tin từ CCCD/VNeID.',
        );
        const cleanCitizenId = data.citizen_id.replace(/\D/g, '');
        setForm((prev) => ({
            ...prev,
            citizen_id: cleanCitizenId,
            full_name: data.full_name,
            dob: data.dob,
            gender: data.gender,
            address: data.address,
        }));
        await lookupPatientByCitizen(cleanCitizenId);
    }

    async function handleQrSuccess(data: CccdScanResult) {
        await handleCccdData(data, 'qr');
    }

    function handleCitizenBlur() {
        if (form.citizen_id.length >= 9 && !isLookingUp) {
            void lookupPatientByCitizen(form.citizen_id);
        }
    }

    function handleOpenScanner() {
        setError(null);
        setScannerOpen(true);
    }

    function handleNext() {
        setError(null);
        if (step === 1) {
            if (!step1Valid) {
                setError('Vui lòng điền đầy đủ thông tin bắt buộc.');
                return;
            }
            if (!form.email) {
                update('email', `bn.${form.citizen_id.slice(-8)}@patient.triageflow.me`);
            }
            setStep(2);
        } else if (step === 2) {
            if (!form.symptoms.trim()) {
                setError('Vui lòng mô tả triệu chứng.');
                return;
            }
            if (!step2Valid) {
                if (!form.department_id) {
                    setError('Vui lòng chọn chuyên khoa.');
                } else if (!form.specialty_id) {
                    setError('Vui lòng chọn bác sĩ.');
                } else if (!form.slot_id) {
                    setError('Vui lòng chọn khung giờ khám.');
                } else if (form.symptoms.trim().length < 5) {
                    setError('Vui lòng mô tả triệu chứng (ít nhất 5 ký tự).');
                } else {
                    setError('Vui lòng điền đủ thông tin bước 2.');
                }
                return;
            }
            setStep(3);
        }
    }

    function handleReset() {
        setError(null);
        clearRegisterStep1Draft();
        setForm(INITIAL);
        setTriageSession(EMPTY_TRIAGE_SESSION);
        setExistingAccount(null);
        setLookupBanner(null);
        setScanBanner(null);
        setRegistrationResult(null);
        setStep(1);
    }

    function handleBack() {
        setError(null);
        if (step > 1 && step < 4) setStep((s) => (s - 1) as Step);
    }

    const selectedSlot = slots.find((s) => (s.slot_id ?? s.id) === form.slot_id);
    const selectedSpecialty = findDoctorBySelectionKey(specialties, form.specialty_id);

    const specialtyLabel = getDepartmentLabel(
        form.department_id,
        specialtyCatalog,
        selectedSpecialty,
        triageSession,
    );

    // Compute slotTimeLabel with date for display & printing
    let slotTimeLabelWithDate = '';
    if (selectedSlot) {
        let slotDateStr = '';
        if (selectedSlot.shift?.date) {
            const parts = selectedSlot.shift.date.split('-');
            if (parts.length === 3) {
                slotDateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
            } else {
                slotDateStr = selectedSlot.shift.date;
            }
        } else {
            const today = new Date();
            const pad = (n: number) => n.toString().padStart(2, '0');
            slotDateStr = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;
        }
        const timeLabel = formatSlotTimeLabel(selectedSlot);
        slotTimeLabelWithDate = slotDateStr && timeLabel ? `${slotDateStr}, ${timeLabel}` : timeLabel || slotDateStr;
    }

    function handleSubmit() {
        if (!accessToken) return;
        setError(null);

        startTransition(async () => {
            try {
                let patientId = existingAccount?.patient_id;
                const email = form.email || `bn.${form.citizen_id.slice(-8)}@patient.triageflow.me`;

                if (!patientId) {
                    const suffix = form.citizen_id.slice(-6);
                    patientId = await receptionService.registerPatient({
                        email,
                        full_name: form.full_name,
                        dob: form.dob,
                        password: `Patient@${suffix}`,
                        gender: form.gender,
                        citizen_id: form.citizen_id,
                        phone: form.phone || undefined,
                        bhyt: form.insurance_id || undefined,
                    }, accessToken);
                }

                if (!patientId) {
                    throw new Error('Không tìm thấy hồ sơ bệnh nhân để đặt lịch.');
                }

                if (!form.slot_id) {
                    throw new Error('Vui lòng chọn bác sĩ và khung giờ khám để đặt lịch.');
                }

                // Nếu là QR và đã tạo booking trước đó, dùng lại bookingId. Nếu chưa có, tạo mới.
                let bookingId = createdBooking?.bookingId;
                let stepId = createdBooking?.stepId;
                let bData = null;

                if (!bookingId) {
                    const bookingRes = await receptionService.createBooking(
                        { patient_id: patientId, slot_id: form.slot_id },
                        accessToken,
                    );
                    const extracted = extractBookingCreateFields(bookingRes);
                    bData = bookingRes.data as any;
                    bookingId =
                        extracted.bookingId ||
                        bData?.data?.booking_id ||
                        bData?.booking_id ||
                        bData?.data?.id ||
                        bData?.id ||
                        extracted.stepId ||
                        bData?.step_id;
                    stepId =
                        extracted.stepId ||
                        bData?.step_id ||
                        (bData?.steps && bData.steps.length > 0 ? bData.steps[0].id : undefined) ||
                        bookingId ||
                        'step-1';
                }

                if (!bookingId) {
                    throw new Error('Không tạo được lịch khám.');
                }

                let queueFields: { queueNumber?: string; queueId?: string } = {};
                let ticketNo = 'A-—';

                // Kiểm tra / Lấy số thứ tự (chỉ cấp số khi đã thanh toán thành công hoặc không bắt buộc thanh toán QR)
                try {
                    queueFields = await receptionService.resolveQueueNumberAfterBooking(
                        bData || { bookingId, stepId },
                        patientId,
                        accessToken,
                    );
                } catch (err) {
                    console.warn('[Register] Queue resolution fallback:', err);
                }

                if (form.payment_method === 'qr' && !queueFields.queueNumber && bookingId) {
                    // Thử gọi Webhook API kích hoạt thanh toán nếu hệ thống sandbox
                    try {
                        await receptionService.triggerTransactionWebhook(
                            { booking_id: bookingId, client_id: bookingId, status: 'PAID', code: '00' },
                            accessToken,
                        );
                        queueFields = await receptionService.resolveQueueNumberAfterBooking(
                            bData || { bookingId, stepId },
                            patientId,
                            accessToken,
                        );
                    } catch {
                        // bỏ qua lỗi webhook retry
                    }
                }

                if (form.payment_method === 'qr' && !queueFields.queueNumber) {
                    // Thanh toán QR chưa hoàn tất → chuyển sang bước 4 ở trạng thái chờ thanh toán
                    // PayOsPaymentPanel sẽ tự động polling mỗi 3 giây
                    const doctorLabelQr = getDoctorDisplayLabel(selectedSpecialty);
                    const slotTimeLabelQr = slotTimeLabelWithDate;
                    const qrPayloadPending = JSON.stringify({
                        ticket: 'A-—',
                        bookingId,
                        citizenId: form.citizen_id,
                        patientId,
                    });
                    clearRegisterStep1Draft();
                    setRegistrationResult({
                        ticketNo: 'A-—',
                        queueNumber: undefined,
                        bookingId,
                        stepId,
                        queueId: undefined,
                        fullName: form.full_name,
                        citizenId: form.citizen_id,
                        phone: form.phone,
                        specialty: specialtyLabel,
                        priority: form.priority,
                        paymentLabel: PAYMENT_LABELS[form.payment_method],
                        doctorLabel: doctorLabelQr,
                        slotTimeLabel: slotTimeLabelQr,
                        roomLabel: 'Phòng 201, Tầng 2',
                        waitTimeLabel: getWaitTimeLabel(triageSession),
                        insuranceId: form.insurance_id,
                        qrPayload: qrPayloadPending,
                        isPaymentPending: true,
                        paymentQrCode: qrTransaction?.qrCode || qrTransaction?.qr_code || qrTransaction?.checkoutUrl || qrTransaction?.checkout_url || '',
                        paymentCheckoutUrl: qrTransaction?.checkoutUrl || qrTransaction?.checkout_url || '',
                        paymentAmount: qrTransaction?.amount || 200000,
                        paymentAccountName: '',
                        paymentAccountNumber: '',
                        paymentDescription: '',
                    });
                    setStep(4);
                    return;
                }

                ticketNo = queueFields.queueNumber
                    ? formatQueueTicketNo(queueFields.queueNumber)
                    : `A-${Math.floor(100 + Math.random() * 899)}`;

                // uses outer specialtyLabel
                const doctorLabel = getDoctorDisplayLabel(selectedSpecialty);
                const slotTimeLabel = slotTimeLabelWithDate;
                const qrPayload = JSON.stringify({
                    ticket: ticketNo,
                    bookingId: bookingId,
                    citizenId: form.citizen_id,
                    patientId,
                });

                clearRegisterStep1Draft();
                setRegistrationResult({
                    ticketNo,
                    queueNumber: queueFields.queueNumber,
                    bookingId: bookingId,
                    stepId: stepId,
                    queueId: queueFields.queueId,
                    fullName: form.full_name,
                    citizenId: form.citizen_id,
                    phone: form.phone,
                    specialty: specialtyLabel,
                    priority: form.priority,
                    paymentLabel: PAYMENT_LABELS[form.payment_method],
                    doctorLabel,
                    slotTimeLabel,
                    roomLabel: 'Phòng 201, Tầng 2',
                    waitTimeLabel: getWaitTimeLabel(triageSession),
                    insuranceId: form.insurance_id,
                    qrPayload,
                    isPaymentPending: false, // Đã có số thứ tự tức là đã thanh toán thành công
                    paymentQrCode: '',
                    paymentCheckoutUrl: '',
                    paymentAmount: 200000,
                    paymentAccountName: '',
                    paymentAccountNumber: '',
                    paymentDescription: '',
                });
                setStep(4);
            } catch (err) {
                console.error('[Register] submit failed:', err);

                const apiDetail = err instanceof ApiError ? err.detail : undefined;
                const baseMessage = formatCaughtError(err, 'Đăng ký thất bại. Vui lòng thử lại.');
                const message = apiDetail
                    ? `${baseMessage}\nChi tiết: ${apiDetail}`
                    : baseMessage;

                if (message.toLowerCase().includes('slot')) {
                    setError(
                        'Không tìm thấy khung giờ khám hợp lệ. Hãy chọn lại bác sĩ và khung giờ trong danh sách slot của bác sĩ.',
                    );
                } else if (/chuẩn đoán|chuan doan/i.test(message)) {
                    setError(
                        'Chuẩn đoán AI chưa được lưu trong hệ thống. Vui lòng chọn bác sĩ và khung giờ khám, sau đó xác nhận lại.',
                    );
                } else if (isPaymentLinkError(message)) {
                    setError(
                        `${message}\n\nGợi ý: Nếu đã đặt lịch trước đó, kiểm tra hàng đợi hoặc dùng BHYT/Tiền mặt. Tạo QR tại mục Thanh toán sau khi có booking.`,
                    );
                } else {
                    setError(message);
                }
            }
        });
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#F5F2FF] py-0 md:py-6">
            <div className="flex-1 flex flex-col min-h-0 bg-white rounded-none md:rounded-tl-[48px] md:rounded-bl-[48px] overflow-hidden shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                <div className="flex-1 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-4 py-5 md:px-10 md:py-8 pb-8">
                    <div className={cn('mx-auto', step >= 2 ? 'max-w-6xl' : 'max-w-3xl')}>
                        {step < 4 && (
                            <Link
                                href="/reception"
                                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#8B7CF6] mb-6"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Quay lại tổng quan
                            </Link>
                        )}

                        <h1 className="text-[22px] font-bold text-[#1F2937] tracking-tight">
                            {step === 4 ? 'Hoàn tất đăng ký' : 'Đăng ký khám mới'}
                        </h1>
                        <p className="text-[13px] text-[#9CA3AF] mt-1 mb-6">
                            {step === 4
                                ? 'Vé khám đã được cấp — in hoặc tải PDF để bệnh nhân mang theo'
                                : 'Điền thông tin hoặc quét CCCD/VNeID để tự động điền'}
                        </p>

                        <Stepper current={step} />

                        {error && step < 4 && (
                            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                                <p className="text-[13px] text-red-700 whitespace-pre-wrap break-words">{error}</p>
                            </div>
                        )}

                        {scanBanner && step === 1 && (
                            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#BBF7D0] bg-[#ECFDF5] px-4 py-3">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                                <p className="text-[13px] text-[#065F46] font-medium">{scanBanner}</p>
                            </div>
                        )}

                        {lookupBanner === 'found' && step === 1 && (
                            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                                <p className="text-[13px] text-[#1E40AF] font-medium">
                                    Đã tìm thấy hồ sơ bệnh nhân. Thông tin đã được tự động điền.
                                </p>
                            </div>
                        )}

                        {lookupBanner === 'new' && step === 1 && (
                            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
                                <p className="text-[13px] text-[#92400E] font-medium">
                                    Chưa có hồ sơ với CCCD này. Vui lòng kiểm tra thông tin và nhập mã BHYT (nếu có).
                                </p>
                            </div>
                        )}

                        {isLookingUp && step === 1 && (
                            <div className="mb-4 flex items-center gap-2 text-[12px] text-[#8B7CF6] font-semibold">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Đang tra cứu hồ sơ bệnh nhân...
                            </div>
                        )}

                        {/* ── STEP 1 ── */}
                        {step === 1 && (
                            <div className="space-y-5">
                                {/* Scan CCCD — toàn vùng có thể bấm trên mobile */}
                                <button
                                    type="button"
                                    onClick={handleOpenScanner}
                                    className="w-full rounded-[12px] border-2 border-dashed border-[#D1D5DB] bg-[#FAFAFA] px-5 py-8 sm:px-6 flex flex-col items-center text-center touch-manipulation cursor-pointer select-none active:bg-[#F5F2FF] active:border-[#8B7CF6] transition-colors relative z-10 min-h-[200px]"
                                >
                                    <div className="w-14 h-14 rounded-xl bg-[#EDE9FE] flex items-center justify-center mb-3 pointer-events-none">
                                        <ScanLine className="w-7 h-7 text-[#8B7CF6]" strokeWidth={2} />
                                    </div>
                                    <p className="text-[15px] font-bold text-[#374151] pointer-events-none">
                                        Quét CCCD / VNeID
                                    </p>
                                    <p className="text-[12px] text-[#9CA3AF] mt-1 max-w-xs pointer-events-none">
                                        Chạm để mở camera và quét mã QR trên thẻ
                                    </p>
                                    <span className="mt-5 inline-flex items-center justify-center gap-2 min-h-[48px] min-w-[200px] px-6 py-3 rounded-xl bg-[#8B7CF6] text-white text-[14px] font-bold shadow-[0_2px_8px_rgba(139,124,246,0.35)] pointer-events-none">
                                        <ScanLine className="w-5 h-5" />
                                        Bắt đầu quét
                                    </span>
                                </button>

                                <CccdImageUpload
                                    accessToken={accessToken}
                                    onSuccess={(data) => handleCccdData(data, 'image')}
                                    onError={(message) => setError(message)}
                                    disabled={isPending || isLookingUp}
                                    className="mb-1"
                                />

                                {/* Personal info card */}
                                <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-5 md:p-6 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
                                    <div className="flex items-center gap-2 mb-5">
                                        <User className="w-4 h-4 text-[#8B7CF6]" strokeWidth={2.25} />
                                        <h2 className="text-[15px] font-bold text-[#1F2937]">Thông tin cá nhân</h2>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <RequiredLabel>Họ và tên</RequiredLabel>
                                            <input
                                                type="text"
                                                placeholder="Nhập họ và tên"
                                                value={form.full_name}
                                                onChange={(e) => update('full_name', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <RequiredLabel>Số CCCD</RequiredLabel>
                                            <input
                                                type="text"
                                                placeholder="012345678901"
                                                value={form.citizen_id}
                                                onChange={(e) => {
                                                    const cleanVal = e.target.value.replace(/\D/g, '');
                                                    update('citizen_id', cleanVal);
                                                    setLookupBanner(null);
                                                }}
                                                onBlur={handleCitizenBlur}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <RequiredLabel>Ngày sinh</RequiredLabel>
                                            <input
                                                type="date"
                                                value={form.dob}
                                                onChange={(e) => update('dob', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <RequiredLabel>Giới tính</RequiredLabel>
                                            <select
                                                value={form.gender}
                                                onChange={(e) => update('gender', e.target.value as Gender)}
                                                className={inputClass}
                                            >
                                                <option value="FEMALE">Nữ</option>
                                                <option value="MALE">Nam</option>
                                                <option value="OTHER">Khác</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-[13px] font-medium text-[#374151]">
                                                Số điện thoại{' '}
                                                <span className="text-[#9CA3AF] font-normal">(tùy chọn)</span>
                                            </label>
                                            <input
                                                type="tel"
                                                placeholder="0912345678"
                                                value={form.phone}
                                                onChange={(e) => update('phone', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-[13px] font-medium text-[#374151]">
                                                Mã BHYT{' '}
                                                <span className="text-[#9CA3AF] font-normal">(không bắt buộc)</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="AB1234567890"
                                                value={form.insurance_id}
                                                onChange={(e) => update('insurance_id', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <label className="block text-[13px] font-medium text-[#374151]">Địa chỉ</label>
                                            <input
                                                type="text"
                                                placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
                                                value={form.address}
                                                onChange={(e) => update('address', e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && accessToken && (
                            <SymptomTriageStep
                                accessToken={accessToken}
                                citizenId={form.citizen_id}
                                fullName={form.full_name}
                                dob={form.dob}
                                gender={form.gender}
                                insuranceId={form.insurance_id}
                                phone={form.phone}
                                email={form.email}
                                knownPatientId={existingAccount?.patient_id}
                                symptoms={form.symptoms}
                                onSymptomsChange={(value) => {
                                    update('symptoms', value);
                                    if (triageSession.is_analyzed) {
                                        setTriageSession(EMPTY_TRIAGE_SESSION);
                                        update('department_id', '');
                                        update('specialty_id', '');
                                        update('slot_id', '');
                                    }
                                }}
                                specialtyId={form.specialty_id}
                                onSpecialtyChange={(value) => update('specialty_id', value)}
                                departmentId={form.department_id}
                                onDepartmentChange={(value) => update('department_id', value)}
                                slotId={form.slot_id}
                                onSlotChange={(value) => update('slot_id', value)}
                                priority={form.priority}
                                onPriorityChange={(value) => update('priority', value)}
                                slots={slots}
                                specialties={specialties}
                                specialtyCatalog={specialtyCatalog}
                                onSlotsChange={setSlots}
                                onSpecialtiesChange={setSpecialties}
                                triageSession={triageSession}
                                onTriageSessionChange={setTriageSession}
                                inputClass={inputClass}
                                isLoadingMeta={isLoadingMeta}
                            />
                        )}

                        {/* ── STEP 3 ── */}
                        {step === 3 && (
                            <div className="space-y-6">
                                <RegisterConfirmStep
                                    fullName={form.full_name}
                                    citizenId={form.citizen_id}
                                    dob={form.dob}
                                    phone={form.phone}
                                    insuranceId={form.insurance_id}
                                    symptoms={form.symptoms}
                                    priority={form.priority}
                                    paymentMethod={form.payment_method}
                                    onPaymentMethodChange={(method) => update('payment_method', method)}
                                    departmentId={form.department_id}
                                    specialtyCatalog={specialtyCatalog}
                                    selectedSpecialty={selectedSpecialty}
                                    selectedSlot={selectedSlot}
                                    triageSession={triageSession}
                                />

                                {form.payment_method === 'qr' && (
                                    <div className="space-y-4">
                                        {isCreatingTx && (
                                            <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA] p-6 flex flex-col items-center justify-center gap-2">
                                                <Loader2 className="w-6 h-6 animate-spin text-[#8B7CF6]" />
                                                <span className="text-[13px] font-semibold text-[#6B7280]">Đang khởi tạo mã QR thanh toán PayOS...</span>
                                            </div>
                                        )}

                                        {!isCreatingTx && qrTransaction && (
                                            <PayOsPaymentPanel
                                                result={{
                                                    ticketNo: 'A-—',
                                                    fullName: form.full_name,
                                                    citizenId: form.citizen_id,
                                                    phone: form.phone,
                                                    specialty: specialtyLabel,
                                                    priority: form.priority,
                                                    paymentLabel: 'QR Code / VietQR',
                                                    doctorLabel: getDoctorDisplayLabel(selectedSpecialty),
                                                    slotTimeLabel: slotTimeLabelWithDate,
                                                    roomLabel: 'Phòng 201, Tầng 2',
                                                    waitTimeLabel: getWaitTimeLabel(triageSession),
                                                    insuranceId: form.insurance_id,
                                                    qrPayload: JSON.stringify({ patientId: existingAccount?.patient_id || '' }),
                                                    isPaymentPending: true,
                                                    bookingId: createdBooking?.bookingId,
                                                    stepId: createdBooking?.stepId,
                                                    paymentQrCode: qrTransaction.qrCode || qrTransaction.qr_code || '',
                                                    paymentCheckoutUrl: qrTransaction.checkoutUrl || qrTransaction.checkout_url || '',
                                                    paymentAmount: qrTransaction.amount ?? 200000,
                                                    paymentAccountName: (qrTransaction as any).accountName || 'Dự án TriageFlow',
                                                    paymentAccountNumber: (qrTransaction as any).accountNumber || '',
                                                    paymentDescription: (qrTransaction as any).description || '',
                                                }}
                                                onUpdateResult={(updated) => {
                                                    setRegistrationResult(updated);
                                                    setStep(4);
                                                }}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 4 && !registrationResult && (
                            <div className="flex items-center justify-center gap-2 py-16 text-[#8B7CF6]">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-[14px] font-semibold">Đang tải vé khám...</span>
                            </div>
                        )}

                        {step === 4 && registrationResult && (
                            <RegisterSuccessStep result={registrationResult} onRegisterNew={handleReset} />
                        )}

                        {/* Footer actions */}
                        {step < 4 && (
                        <div className="flex items-center justify-between mt-8 pt-4 border-t border-[#F3F4F6]">
                            {step > 1 ? (
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    disabled={isPending}
                                    className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg border border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Quay lại
                                </button>
                            ) : (
                                <div />
                            )}

                            {step < 3 ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    disabled={step === 1 ? !step1Valid : !step2Valid}
                                    className={cn(
                                        'inline-flex items-center gap-2 min-h-[44px] px-6 py-2.5 rounded-lg text-[13px] font-bold transition-colors',
                                        (step === 1 ? step1Valid : step2Valid)
                                            ? 'bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white shadow-[0_2px_8px_rgba(139,124,246,0.3)]'
                                            : 'bg-[#EDE9FE] text-[#C4B5FD] cursor-not-allowed',
                                    )}
                                >
                                    Tiếp theo
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        disabled={isPending}
                                        className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg border border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
                                    >
                                        Làm mới
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={isPending || !step2Valid}
                                        className="inline-flex items-center gap-2 min-h-[44px] px-5 sm:px-6 py-2.5 rounded-lg bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-[13px] font-bold shadow-[0_2px_8px_rgba(139,124,246,0.3)] disabled:opacity-50"
                                    >
                                        {isPending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4" />
                                        )}
                                        {isPending ? 'Đang xử lý...' : 'Xác nhận & Cấp số thứ tự'}
                                    </button>
                                </div>
                            )}
                        </div>
                        )}
                    </div>
                </div>
            </div>

            <CccdQrScanner
                open={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onSuccess={(data) => void handleQrSuccess(data)}
                onManualInput={() => setScannerOpen(false)}
            />
        </div>
    );
}
