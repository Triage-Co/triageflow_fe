"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Brain,
  Building2,
  CalendarDays,
  ChevronRight,
  CreditCard,
  FileText,
  IdCard,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Mail,
  Package,
  Phone,
  ScanLine,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/modules/auth/store/authStore";
import { receptionService } from "@/modules/reception/services/receptionService";
import { CccdQrScanner } from "@/modules/reception/components/CccdQrScanner";
import {
  BookingModeSelector,
  type BookingMode,
} from "@/modules/reception/components/BookingModeSelector";
import { SpecialtyPickStep } from "@/modules/reception/components/SpecialtyPickStep";
import { PackagePickStep } from "@/modules/reception/components/PackagePickStep";
import { SymptomTriageStep } from "@/modules/reception/components/SymptomTriageStep";
import {
  RegisterConfirmStep,
  type RegisterPaymentMethod,
} from "@/modules/reception/components/RegisterConfirmStep";
import { RegisterSuccessStep } from "@/modules/reception/components/RegisterSuccessStep";
import { PayOsPaymentPanel } from "@/modules/reception/components/PayOsPaymentPanel";
import type { CccdScanResult } from "@/modules/reception/utils/cccdQrParser";
import type {
  BackendSpecialtyCatalogItem,
  ReceptionAccount,
  ReceptionSlot,
  ReceptionSpecialty,
  RegistrationResult,
} from "@/modules/reception/types/reception.types";
import {
  EMPTY_TRIAGE_SESSION,
  type SymptomTriageSession,
} from "@/modules/reception/types/infermedica.types";
import { formatCaughtError, isPaymentLinkError } from "@/shared/utils/apiError";
import { ApiError } from "@/shared/services/apiClient";
import {
  extractBookingCreateFields,
  findDoctorBySelectionKey,
  formatQueueTicketNo,
  formatSlotTimeLabel,
  getDoctorDisplayLabel,
  getTodayDateString,
} from "@/modules/reception/utils/receptionMapper";
import {
  applyRegisterPrefillToForm,
  consumeRegisterPrefill,
  type RegisterPrefill,
} from "@/modules/reception/utils/registerPrefill";
import {
  REGISTER_DEPARTMENTS,
  resolveCatalogSpecialty,
  translateSpecialtyDisplayName,
} from "@/modules/reception/constants/registerDepartments";
import { mapActiveFlowsList } from "@/modules/reception/utils/receptionFlowMapper";
import { isValidPhone } from "@/shared/utils/validators";

import type { Gender } from "@/shared/types/auth.types";

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
  package_id: string;
  payment_method: RegisterPaymentMethod;
}

const INITIAL: FormState = {
  citizen_id: "",
  full_name: "",
  email: "",
  dob: "",
  gender: "FEMALE",
  phone: "",
  address: "",
  insurance_id: "",
  symptoms: "",
  department_id: "",
  slot_id: "",
  specialty_id: "",
  package_id: "",
  payment_method: "qr",
};

const STEPS = [
  { num: 1, label: "Thông tin bệnh nhân", icon: User },
  { num: 2, label: "Chọn khám & Lịch hẹn", icon: Stethoscope },
  { num: 3, label: "Thanh toán & xác nhận", icon: CreditCard },
  { num: 4, label: "Hoàn tất", icon: CheckCircle2 },
] as const;

const PAYMENT_LABELS: Record<RegisterPaymentMethod, string> = {
  qr: "QR Code / VietQR",
  cash: "Tiền mặt",
};

function getDepartmentLabel(
  departmentId: string,
  specialtyCatalog: BackendSpecialtyCatalogItem[],
  specialty: ReceptionSpecialty | undefined,
  triageSession: SymptomTriageSession,
): string {
  const fromCatalog = resolveCatalogSpecialty(
    departmentId,
    specialtyCatalog,
  )?.specialty_name;
  if (fromCatalog) return fromCatalog;

  const manualDept = REGISTER_DEPARTMENTS.find(
    (d) => d.id === departmentId,
  )?.label;
  if (manualDept) return manualDept;

  if (triageSession.recommended_department_label) {
    return `${triageSession.recommended_department_label} (AI tham khảo)`;
  }
  if (specialty?.specialty_name) {
    return specialty.specialty_name;
  }
  if (triageSession.recommended_specialist?.name) {
    return translateSpecialtyDisplayName(
      triageSession.recommended_specialist.name,
    );
  }
  return "Khám bệnh";
}

function getWaitTimeLabel(triageSession: SymptomTriageSession): string {
  if (triageSession.triage_level === "emergency") return "5–10 phút";
  if (triageSession.triage_level === "consultation") return "20–30 phút";
  return "10–15 phút";
}

function validateStep1Field(field: keyof FormState, value: string): string | null {
  const str = (value || "").trim();
  switch (field) {
    case "full_name":
      if (!str) return "Vui lòng nhập họ và tên.";
      if (str.length < 2) return "Họ và tên phải có ít nhất 2 ký tự.";
      return null;

    case "citizen_id": {
      const clean = str.replace(/\D/g, "");
      if (!clean) return "Vui lòng nhập số CCCD/CMND.";
      if (clean.length !== 9 && clean.length !== 12) {
        return "Số CCCD/CMND không hợp lệ (gồm 12 số CCCD hoặc 9 số CMND).";
      }
      return null;
    }

    case "dob": {
      if (!str) return "Vui lòng chọn ngày sinh.";
      const dobDate = new Date(str);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (isNaN(dobDate.getTime())) return "Ngày sinh không hợp lệ.";
      if (dobDate > today) return "Ngày sinh không được lớn hơn ngày hiện tại.";
      const age = today.getFullYear() - dobDate.getFullYear();
      if (age > 130) return "Năm sinh không hợp lệ.";
      return null;
    }

    case "phone": {
      if (!str) return null; // Tùy chọn
      const cleanPhone = str.replace(/[\s.-]/g, "");
      if (!isValidPhone(cleanPhone)) {
        return "Số điện thoại không hợp lệ (gồm 10 số, VD: 0912345678).";
      }
      return null;
    }

    case "insurance_id": {
      if (!str) return null; // Tùy chọn
      if (str.length < 10 || str.length > 15) {
        return "Mã BHYT không hợp lệ (từ 10 đến 15 ký tự).";
      }
      return null;
    }

    default:
      return null;
  }
}

function getInputClass(hasError?: boolean) {
  return cn(
    "block w-full rounded-lg border bg-white px-3.5 py-2.5 text-[13px] text-[#1F2937] placeholder-[#9CA3AF] outline-none transition disabled:opacity-50 disabled:bg-[#F9FAFB]",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
      : "border-[#E5E7EB] focus:border-[#8B7CF6] focus:ring-2 focus:ring-[#8B7CF6]/15",
  );
}

const inputClass = getInputClass(false);

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
          <div
            key={step.num}
            className={cn(
              "flex items-center",
              idx < STEPS.length - 1 ? "flex-1" : "",
            )}
          >
            <div className="flex flex-col items-center shrink-0">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold border-2 transition-colors",
                  isActive
                    ? "bg-[#8B7CF6] border-[#8B7CF6] text-white"
                    : isDone
                      ? "bg-[#8B7CF6] border-[#8B7CF6] text-white"
                      : "bg-white border-[#E5E7EB] text-[#9CA3AF]",
                )}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : step.num}
              </div>
              <span
                className={cn(
                  "text-[11px] font-semibold mt-1.5 whitespace-nowrap hidden sm:block",
                  isActive ? "text-[#8B7CF6]" : "text-[#9CA3AF]",
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-3 rounded-full",
                  step.num < current ? "bg-[#8B7CF6]" : "bg-[#E5E7EB]",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  highlight,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  badge?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70 border border-[#F3F4F6]">
      <span className="text-[#9CA3AF] shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-0.5">
          {label}
        </p>
        {badge ? (
          <span className="inline-flex text-[12px] font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded-md">
            {value}
          </span>
        ) : (
          <p
            className={cn(
              "text-[13px] font-semibold truncate",
              highlight ? "text-[#8B7CF6]" : "text-[#1F2937]",
            )}
          >
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

export function ReceptionRegisterForm() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<Step>(1);
  const [bookingMode, setBookingMode] = useState<BookingMode | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [slots, setSlots] = useState<ReceptionSlot[]>([]);
  const [specialties, setSpecialties] = useState<ReceptionSpecialty[]>([]);
  const [specialtyCatalog, setSpecialtyCatalog] = useState<
    BackendSpecialtyCatalogItem[]
  >([]);
  const [existingAccount, setExistingAccount] =
    useState<ReceptionAccount | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [scanBanner, setScanBanner] = useState<string | null>(null);
  const [lookupBanner, setLookupBanner] = useState<"found" | "new" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [registrationResult, setRegistrationResult] =
    useState<RegistrationResult | null>(null);
  const [triageSession, setTriageSession] =
    useState<SymptomTriageSession>(EMPTY_TRIAGE_SESSION);
  const [touched, setTouched] = useState<
    Partial<Record<keyof FormState, boolean>>
  >({});
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const prefillRef = useRef<RegisterPrefill | null>(null);
  const prefillHydratedRef = useRef(false);
  const patientPromiseRef = useRef<Promise<string | undefined> | null>(null);

  const [createdBooking, setCreatedBooking] = useState<{
    bookingId: string;
    stepId: string;
  } | null>(null);

  useEffect(() => {
    setCreatedBooking(null);
  }, [form.slot_id, form.specialty_id]);

  useEffect(() => {
    if (prefillHydratedRef.current) return;
    prefillHydratedRef.current = true;

    const prefill = consumeRegisterPrefill();
    prefillRef.current = prefill;

    if (prefill) {
      setForm((prev) => applyRegisterPrefillToForm(prev, prefill));
      if (prefill.patient_id || prefill.account_id) {
        const acc: ReceptionAccount = {
          account_id: prefill.account_id ?? "",
          patient_id: prefill.patient_id,
          full_name: prefill.full_name,
          citizen_id: prefill.citizen_id,
          email: prefill.email ?? "",
          dob: prefill.dob ?? "",
          gender: prefill.gender ?? "FEMALE",
          role: "PATIENT",
          phone: prefill.phone ?? null,
          bhyt: prefill.insurance_id || null,
        };
        setExistingAccount(acc);
        if (prefill.patient_id) {
          patientPromiseRef.current = Promise.resolve(prefill.patient_id);
        }
      }
      setLookupBanner("found");
      setScanBanner(
        `Đã tải hồ sơ bệnh nhân ${prefill.full_name}. Vui lòng chọn phương thức khám.`,
      );
      // Chuyển thẳng sang bước 2 (mục chọn 3 loại khám Kiosk)
      setStep(2);
      setBookingMode(null);
    }
  }, []);

  // Chỉ tải danh mục chuyên khoa khi người dùng chọn chế độ "Đăng ký theo chuyên khoa"
  useEffect(() => {
    if (!accessToken || bookingMode !== "specialty") return;
    if (specialtyCatalog.length > 0) return;

    const loadMeta = async () => {
      try {
        setIsLoadingMeta(true);
        const catalog = await receptionService.getSpecialtyCatalog(accessToken);
        setSpecialtyCatalog(catalog);
      } catch {
        setSpecialtyCatalog([]);
      } finally {
        setIsLoadingMeta(false);
      }
    };

    loadMeta();
  }, [accessToken, bookingMode, specialtyCatalog.length]);

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const err = validateStep1Field(field, String(value ?? ""));
      setFieldErrors((prev) => ({ ...prev, [field]: err || undefined }));
    }
  }

  function handleBlur(field: keyof FormState) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateStep1Field(field, String(form[field] ?? ""));
    setFieldErrors((prev) => ({ ...prev, [field]: err || undefined }));
  }

  function validateAllStep1(): boolean {
    const fieldsToValidate: (keyof FormState)[] = [
      "full_name",
      "citizen_id",
      "dob",
      "phone",
      "insurance_id",
    ];
    const newTouched: Partial<Record<keyof FormState, boolean>> = { ...touched };
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    let hasError = false;

    fieldsToValidate.forEach((f) => {
      newTouched[f] = true;
      const err = validateStep1Field(f, String(form[f] ?? ""));
      if (err) {
        newErrors[f] = err;
        hasError = true;
      }
    });

    setTouched(newTouched);
    setFieldErrors((prev) => ({ ...prev, ...newErrors }));
    return !hasError;
  }

  const cleanCccd = form.citizen_id.replace(/\D/g, "");
  const step1Valid =
    form.full_name.trim().length >= 2 &&
    (cleanCccd.length === 9 || cleanCccd.length === 12) &&
    form.dob.length > 0 &&
    (!form.phone.trim() ||
      isValidPhone(form.phone.trim().replace(/[\s.-]/g, ""))) &&
    (!form.insurance_id.trim() ||
      (form.insurance_id.trim().length >= 10 &&
        form.insurance_id.trim().length <= 15));

  const step2Valid = Boolean(
    bookingMode &&
      (bookingMode === "ai_triage"
        ? triageSession.is_analyzed &&
          (form.slot_id.length > 0 || Boolean(triageSession.best_slot_id))
        : bookingMode === "package"
          ? form.package_id.length > 0 && form.slot_id.length > 0
          : form.department_id.length > 0 &&
            form.specialty_id.length > 0 &&
            form.slot_id.length > 0),
  );

  async function lookupPatientByCitizen(citizenId: string) {
    const cleanId = citizenId.replace(/\D/g, "");
    if (!accessToken || cleanId.length < 9) return;

    setIsLookingUp(true);
    setLookupBanner(null);
    try {
      const found = await receptionService.findAccountByCitizenId(
        cleanId,
        accessToken,
      );
      if (found) {
        setForm((prev) => ({
          ...prev,
          full_name: prev.full_name || found.full_name || "",
          email: found.email || prev.email,
          gender: (prev.gender as Gender) || (found.gender as Gender) || "FEMALE",
          phone: found.phone ?? prev.phone,
          dob: prev.dob || (found.dob ? found.dob.slice(0, 10) : ""),
          insurance_id:
            found.bhyt && found.bhyt !== "N/A" ? found.bhyt : prev.insurance_id,
        }));
        setLookupBanner("found");

        // Tra cứu thấy thông tin ≠ chắc có patient_id — bổ sung hồ sơ nếu thiếu
        if (!found.patient_id && accessToken) {
          try {
            const patientId =
              await receptionService.ensurePatientProfileForTriage(
                {
                  citizen_id: cleanId,
                  full_name: form.full_name || found.full_name,
                  dob:
                    form.dob || (found.dob ? found.dob.slice(0, 10) : ""),
                  gender: form.gender || (found.gender as Gender),
                  medical_coverage_id:
                    found.bhyt && found.bhyt !== "N/A"
                      ? found.bhyt
                      : form.insurance_id,
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
        setLookupBanner("new");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Lỗi tra cứu hồ sơ: ${err.message}`
          : "Lỗi kết nối khi tra cứu bệnh nhân. Vui lòng thử lại.",
      );
    } finally {
      setIsLookingUp(false);
    }
  }

  async function handleCccdData(data: CccdScanResult) {
    setError(null);
    const cleanCitizenId = data.citizen_id.replace(/\D/g, "");
    setScanBanner(
      `Quét CCCD thành công! Đã điền thông tin: ${data.full_name || cleanCitizenId}`,
    );
    setForm((prev) => ({
      ...prev,
      citizen_id: cleanCitizenId,
      full_name: data.full_name || prev.full_name,
      dob: data.dob || prev.dob,
      gender: data.gender || prev.gender,
      address: data.address || prev.address,
    }));
    await lookupPatientByCitizen(cleanCitizenId);
  }

  async function handleQrSuccess(data: CccdScanResult) {
    await handleCccdData(data);
  }

  function handleCitizenBlur() {
    handleBlur("citizen_id");
    const cleanId = form.citizen_id.replace(/\D/g, "");
    if ((cleanId.length === 9 || cleanId.length === 12) && !isLookingUp) {
      void lookupPatientByCitizen(cleanId);
    }
  }

  function handleOpenScanner() {
    setError(null);
    setScannerOpen(true);
  }

  function handleNext() {
    setError(null);
    if (step === 1) {
      const isValid = validateAllStep1();
      if (!isValid) {
        setError("Vui lòng kiểm tra lại các thông tin bắt buộc chưa hợp lệ.");
        return;
      }
      const cleanEmail =
        form.email || `bn.${form.citizen_id.slice(-8)}@patient.triageflow.me`;
      if (!form.email) {
        update("email", cleanEmail);
      }
      // Chuyển màn hình ngay lập tức (không chờ đợi API)
      setStep(2);

      // Chạy API tạo / kiểm tra hồ sơ bệnh nhân ở chế độ chạy ngầm
      if (accessToken) {
        patientPromiseRef.current = receptionService
          .ensurePatientProfileForTriage(
            {
              citizen_id: form.citizen_id.trim(),
              full_name: form.full_name.trim(),
              dob: form.dob,
              gender: form.gender,
              medical_coverage_id: form.insurance_id,
              phone: form.phone,
              email: cleanEmail,
              known_patient_id: existingAccount?.patient_id,
            },
            accessToken,
          )
          .then((patientId) => {
            if (patientId) {
              setExistingAccount((prev) =>
                prev
                  ? { ...prev, patient_id: patientId }
                  : {
                      account_id: "",
                      patient_id: patientId,
                      full_name: form.full_name.trim(),
                      citizen_id: form.citizen_id.trim(),
                      email: cleanEmail,
                      dob: form.dob,
                      gender: form.gender,
                      role: "PATIENT",
                      phone: form.phone || null,
                      bhyt: form.insurance_id || null,
                    },
              );
            }
            return patientId;
          })
          .catch(() => existingAccount?.patient_id);
      }
    } else if (step === 2) {
      if (!bookingMode) {
        setError("Vui lòng chọn 1 trong 3 phương thức tiếp nhận khám.");
        return;
      }
      if (bookingMode === "ai_triage") {
        if (!triageSession.is_analyzed) {
          setError("Vui lòng hoàn thành phỏng vấn triệu chứng với AI.");
          return;
        }
        if (!form.slot_id && triageSession.best_slot_id) {
          update("slot_id", triageSession.best_slot_id);
        }
        if (!form.department_id && triageSession.recommended_department_id) {
          update("department_id", triageSession.recommended_department_id);
        }
      }
      if (bookingMode !== "package" && !form.department_id && !triageSession.recommended_department_id) {
        setError("Vui lòng chọn chuyên khoa khám.");
        return;
      }
      if (bookingMode !== "package" && bookingMode !== "ai_triage" && !form.specialty_id) {
        setError("Vui lòng chọn bác sĩ khám.");
        return;
      }
      if (bookingMode === "package" && !form.package_id) {
        setError("Vui lòng chọn gói khám.");
        return;
      }
      if (!form.slot_id && !triageSession.best_slot_id) {
        setError("Vui lòng chọn khung giờ khám hoặc chọn Xếp phòng tự động.");
        return;
      }
      if (bookingMode === "ai_triage" && form.symptoms.trim().length < 5) {
        setError(
          "Vui lòng mô tả triệu chứng (ít nhất 5 ký tự) để AI chẩn đoán.",
        );
        return;
      }
      if (!form.symptoms.trim()) {
        if (bookingMode === "package") {
          update("symptoms", "Đăng ký khám theo gói sức khỏe");
        } else if (bookingMode === "specialty") {
          update("symptoms", "Đăng ký khám theo chuyên khoa");
        }
      }
      setStep(3);
    }
  }

  function handleReset() {
    setError(null);
    setTouched({});
    setFieldErrors({});
    setForm(INITIAL);
    setBookingMode(null);
    setTriageSession(EMPTY_TRIAGE_SESSION);
    setExistingAccount(null);
    setLookupBanner(null);
    setScanBanner(null);
    setRegistrationResult(null);
    patientPromiseRef.current = null;
    setStep(1);
  }

  const selectedSlot = slots.find((s) => (s.slot_id ?? s.id) === form.slot_id);
  const selectedSpecialty = findDoctorBySelectionKey(
    specialties,
    form.specialty_id,
  );

  const specialtyLabel = getDepartmentLabel(
    form.department_id,
    specialtyCatalog,
    selectedSpecialty,
    triageSession,
  );

  // Compute slotTimeLabel with date for display & printing
  let slotTimeLabelWithDate = "";
  if (selectedSlot) {
    let slotDateStr = "";
    if (selectedSlot.shift?.date) {
      const parts = selectedSlot.shift.date.split("-");
      if (parts.length === 3) {
        slotDateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        slotDateStr = selectedSlot.shift.date;
      }
    } else {
      const today = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      slotDateStr = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;
    }
    const timeLabel = formatSlotTimeLabel(selectedSlot);
    slotTimeLabelWithDate =
      slotDateStr && timeLabel
        ? `${slotDateStr}, ${timeLabel}`
        : timeLabel || slotDateStr;
  }

  function handleSubmit() {
    if (!accessToken) return;
    setError(null);

    startTransition(async () => {
      try {
        let patientId = existingAccount?.patient_id;
        if (!patientId && patientPromiseRef.current) {
          try {
            patientId = await patientPromiseRef.current;
          } catch {
            // ignore
          }
        }
        if (!patientId) {
          patientId = await receptionService.registerPatient(
            {
              full_name: form.full_name,
              dob: form.dob,
              gender: form.gender,
              citizen_id: form.citizen_id,
              phone: form.phone || undefined,
              bhyt: form.insurance_id || undefined,
            },
            accessToken,
          );
        }

        if (!patientId) {
          throw new Error("Không tìm thấy hồ sơ bệnh nhân để đặt lịch.");
        }

        const effectiveSlotId =
          form.slot_id ||
          (bookingMode === "ai_triage" ? triageSession.best_slot_id : "") ||
          "";

        if (
          !effectiveSlotId &&
          !(bookingMode === "ai_triage" && triageSession.interview_token)
        ) {
          throw new Error(
            "Vui lòng chọn bác sĩ và khung giờ khám để đặt lịch.",
          );
        }

        // Nếu là QR và đã tạo booking trước đó, dùng lại bookingId. Nếu chưa có, tạo mới.
        let bookingId = createdBooking?.bookingId;
        let stepId = createdBooking?.stepId;
        let bData: any = null;
        let paymentObj: any = null;

        if (!bookingId) {
          let bookingRes;
          if (
            bookingMode === "package" &&
            form.package_id &&
            effectiveSlotId
          ) {
            bookingRes = await receptionService.createBookingWithPackage(
              {
                patient_id: patientId,
                slot_id: effectiveSlotId,
                package_id: form.package_id,
              },
              accessToken,
            );
          } else if (form.payment_method === "cash" && effectiveSlotId) {
            bookingRes = await receptionService.createBookingCash(
              {
                patient_id: patientId,
                slot_id: effectiveSlotId,
              },
              accessToken,
            );
          } else if (
            bookingMode === "ai_triage" &&
            triageSession.interview_token &&
            !effectiveSlotId
          ) {
            bookingRes = await receptionService.createBookingRecommend(
              {
                patient_id: patientId,
                interview_token: triageSession.interview_token,
              },
              accessToken,
            );
          } else {
            bookingRes = await receptionService.createBooking(
              {
                patient_id: patientId,
                slot_id: effectiveSlotId,
              },
              accessToken,
            );
          }

          const extracted = extractBookingCreateFields(bookingRes);
          bData = (bookingRes?.data as any) || (bookingRes as any);
          const dataBody = bData?.data || bData;

          bookingId =
            extracted.bookingId ||
            dataBody?.booking_id ||
            bData?.booking_id ||
            dataBody?.id ||
            bData?.id ||
            extracted.stepId ||
            dataBody?.step_id;
          stepId =
            extracted.stepId ||
            dataBody?.step_id ||
            (dataBody?.steps && dataBody.steps.length > 0
              ? dataBody.steps[0].id
              : undefined) ||
            bookingId ||
            "step-1";

          paymentObj =
            dataBody?.payment?.data ||
            dataBody?.payment ||
            bData?.payment?.data ||
            bData?.payment;
        }

        if (!bookingId) {
          throw new Error("Không tạo được lịch khám.");
        }

        let ticketCode: string | undefined;
        if (bData) {
          const dataBody = (bData as Record<string, unknown>)?.data ?? bData;
          const flowObj =
            (dataBody as Record<string, unknown>)?.flow ??
            (bData as Record<string, unknown>)?.flow;
          const codeFromBooking =
            (flowObj as Record<string, unknown>)?.ticket_code ??
            (dataBody as Record<string, unknown>)?.ticket_code ??
            (bData as Record<string, unknown>)?.ticket_code;
          if (codeFromBooking) {
            ticketCode = String(codeFromBooking).trim();
          }
        }

        let roomLabel =
          selectedSpecialty?.room_name ||
          selectedSlot?.room_name ||
          (selectedSlot?.room as any)?.name ||
          (selectedSlot?.room as any)?.room_name ||
          `Phòng khám ${specialtyLabel}`;
        let currentSpecialty = specialtyLabel;

        if (form.payment_method === "qr") {
          const qrCode = paymentObj?.qrCode || paymentObj?.qr_code || "";
          const checkoutUrl =
            paymentObj?.checkoutUrl || paymentObj?.checkout_url || "";
          const amount = paymentObj?.amount;
          const accountName = paymentObj?.accountName || "";
          const accountNumber = paymentObj?.accountNumber || "";
          const description = paymentObj?.description || "";

          // Thanh toán QR → chuyển sang bước 4 ở trạng thái chờ thanh toán để quét mã VietQR PayOS
          const doctorLabelQr = getDoctorDisplayLabel(selectedSpecialty);
          const slotTimeLabelQr = slotTimeLabelWithDate;
          const qrPayloadPending = JSON.stringify({
            ticket: "Chờ thanh toán",
            bookingId,
            citizenId: form.citizen_id,
            patientId,
          });
          setRegistrationResult({
            ticketNo: "Chờ thanh toán",
            appointmentDate: selectedSlot?.shift?.date
              ? String(selectedSlot.shift.date).slice(0, 10)
              : getTodayDateString(),
            queueNumber: undefined,
            bookingId,
            stepId,
            queueId: undefined,
            fullName: form.full_name,
            citizenId: form.citizen_id,
            phone: form.phone,
            specialty: currentSpecialty,
            paymentLabel: PAYMENT_LABELS[form.payment_method],
            doctorLabel: doctorLabelQr,
            slotTimeLabel: slotTimeLabelQr,
            roomLabel,
            waitTimeLabel: getWaitTimeLabel(triageSession),
            insuranceId: form.insurance_id,
            qrPayload: qrPayloadPending,
            isPaymentPending: true,
            paymentQrCode: qrCode,
            paymentCheckoutUrl: checkoutUrl,
            paymentAmount: amount,
            paymentAccountName: accountName,
            paymentAccountNumber: accountNumber,
            paymentDescription: description,
          });
          setStep(4);
          return;
        }

        let queueFields: { queueNumber?: string; queueId?: string } = {};
        let ticketNo = "—";

        // Với các phương thức khác (Tiền mặt, BHYT, Thẻ), cấp số thứ tự
        try {
          queueFields = await receptionService.resolveQueueNumberAfterBooking(
            bData || { bookingId, stepId },
            patientId,
            accessToken,
          );
        } catch (err) {
          console.warn("[Register] Queue resolution fallback:", err);
        }

        ticketNo = queueFields.queueNumber
          ? String(queueFields.queueNumber).trim()
          : "—";

        // uses outer specialtyLabel
        let doctorLabel = getDoctorDisplayLabel(selectedSpecialty);
        let slotTimeLabel = slotTimeLabelWithDate;

        // Đồng bộ từ Active Flow thực tế của Backend (giống Kiosk)
        try {
          const rawFlows = await receptionService.getPatientActiveFlows(
            patientId,
            accessToken,
            getTodayDateString(),
          );
          const mappedFlows = mapActiveFlowsList(rawFlows);
          const matchedFlow =
            mappedFlows.find((f) => f.bookingId === bookingId) ||
            mappedFlows[0];
          if (matchedFlow) {
            if (matchedFlow.ticketNo && matchedFlow.ticketNo !== "—") {
              ticketNo = matchedFlow.ticketNo;
            }
            if (matchedFlow.queueNumber) {
              queueFields.queueNumber = matchedFlow.queueNumber;
            }
            if (
              matchedFlow.doctorLabel &&
              matchedFlow.doctorLabel !== "Bác sĩ phụ trách"
            ) {
              doctorLabel = matchedFlow.doctorLabel;
            }
            if (matchedFlow.roomLabel) {
              roomLabel = matchedFlow.roomLabel;
            }
            if (matchedFlow.specialty) {
              currentSpecialty = matchedFlow.specialty;
            }
            if (matchedFlow.slotTimeLabel) {
              slotTimeLabel = matchedFlow.slotTimeLabel;
            }
            if (matchedFlow.ticketCode) {
              ticketCode = matchedFlow.ticketCode;
            }
          }
        } catch {
          // ignore
        }

        const qrPayload = JSON.stringify({
          ticket: ticketNo,
          bookingId: bookingId,
          citizenId: form.citizen_id,
          patientId,
        });

        setRegistrationResult({
          ticketNo,
          ticketCode,
          appointmentDate: selectedSlot?.shift?.date
            ? String(selectedSlot.shift.date).slice(0, 10)
            : getTodayDateString(),
          queueNumber: queueFields.queueNumber,
          bookingId: bookingId,
          stepId: stepId,
          queueId: queueFields.queueId,
          fullName: form.full_name,
          citizenId: form.citizen_id,
          phone: form.phone,
          specialty: currentSpecialty,
          paymentLabel: PAYMENT_LABELS[form.payment_method],
          doctorLabel,
          slotTimeLabel,
          roomLabel,
          waitTimeLabel: getWaitTimeLabel(triageSession),
          insuranceId: form.insurance_id,
          qrPayload,
          isPaymentPending: false, // Đã có số thứ tự tức là đã thanh toán thành công
          paymentQrCode: "",
          paymentCheckoutUrl: "",
          paymentAmount: undefined,
          paymentAccountName: "",
          paymentAccountNumber: "",
          paymentDescription: "",
        });
        setStep(4);
      } catch (err) {
        console.error("[Register] submit failed:", err);

        const apiDetail = err instanceof ApiError ? err.detail : undefined;
        const baseMessage = formatCaughtError(
          err,
          "Đăng ký thất bại. Vui lòng thử lại.",
        );
        const message = apiDetail
          ? `${baseMessage}\nChi tiết: ${apiDetail}`
          : baseMessage;

        if (message.toLowerCase().includes("slot")) {
          setError(
            "Không tìm thấy khung giờ khám hợp lệ. Hãy chọn lại bác sĩ và khung giờ trong danh sách slot của bác sĩ.",
          );
        } else if (/chuẩn đoán|chuan doan/i.test(message)) {
          setError(
            "Chuẩn đoán AI chưa được lưu trong hệ thống. Vui lòng chọn bác sĩ và khung giờ khám, sau đó xác nhận lại.",
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
          <div className={cn("mx-auto", step >= 2 ? "max-w-6xl" : "max-w-3xl")}>
            <h1 className="text-[22px] font-bold text-[#1F2937] tracking-tight">
              {step === 4 ? "Hoàn tất đăng ký" : "Tiếp Nhận Bệnh Nhân"}
            </h1>
            <p className="text-[13px] text-[#9CA3AF] mt-1 mb-6">
              {step === 4
                ? "Vé khám đã được cấp — in hoặc  để bệnh nhân mang theo"
                : "Đăng ký khám mới"}
            </p>

            <Stepper current={step} />

            {error && step < 4 && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-[13px] text-red-700 whitespace-pre-wrap break-words">
                  {error}
                </p>
              </div>
            )}

            {scanBanner && step === 1 && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#BBF7D0] bg-[#ECFDF5] px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                <p className="text-[13px] text-[#065F46] font-medium">
                  {scanBanner}
                </p>
              </div>
            )}

            {lookupBanner === "found" && step === 1 && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                <p className="text-[13px] text-[#1E40AF] font-medium">
                  Đã tìm thấy hồ sơ bệnh nhân. Thông tin đã được tự động điền.
                </p>
              </div>
            )}

            {lookupBanner === "new" && step === 1 && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
                <p className="text-[13px] text-[#92400E] font-medium">
                  Chưa có hồ sơ với CCCD này. Vui lòng kiểm tra thông tin và
                  nhập mã BHYT (nếu có).
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
                  className="w-full rounded-[12px] border-2 border-dashed border-[#D1D5DB] bg-[#FAFAFA] px-5 py-8 sm:px-6 flex flex-col items-center text-center touch-manipulation cursor-pointer select-none active:bg-[#F5F2FF] active:border-[#8B7CF6] transition-colors relative z-10 min-h-[200px] mb-6"
                >
                  <div className="w-14 h-14 rounded-xl bg-[#EDE9FE] flex items-center justify-center mb-3 pointer-events-none">
                    <ScanLine
                      className="w-7 h-7 text-[#8B7CF6]"
                      strokeWidth={2}
                    />
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

                {/* Personal info card */}
                <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-5 md:p-6 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2 mb-5">
                    <User
                      className="w-4 h-4 text-[#8B7CF6]"
                      strokeWidth={2.25}
                    />
                    <h2 className="text-[15px] font-bold text-[#1F2937]">
                      Thông tin cá nhân
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Họ và tên */}
                    <div className="space-y-1.5">
                      <RequiredLabel>Họ và tên</RequiredLabel>
                      <input
                        type="text"
                        placeholder="Nhập họ và tên"
                        value={form.full_name}
                        onChange={(e) => update("full_name", e.target.value)}
                        onBlur={() => handleBlur("full_name")}
                        className={getInputClass(
                          Boolean(touched.full_name && fieldErrors.full_name),
                        )}
                      />
                      {touched.full_name && fieldErrors.full_name && (
                        <p className="text-[12px] text-red-500 flex items-center gap-1 mt-1 font-medium">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {fieldErrors.full_name}
                        </p>
                      )}
                    </div>

                    {/* Số CCCD */}
                    <div className="space-y-1.5">
                      <RequiredLabel>Số CCCD / CMND</RequiredLabel>
                      <input
                        type="text"
                        maxLength={12}
                        placeholder="012345678901 (12 số hoặc 9 số CMND)"
                        value={form.citizen_id}
                        onChange={(e) => {
                          const cleanVal = e.target.value.replace(/\D/g, "");
                          update("citizen_id", cleanVal);
                          setLookupBanner(null);
                        }}
                        onBlur={handleCitizenBlur}
                        className={getInputClass(
                          Boolean(touched.citizen_id && fieldErrors.citizen_id),
                        )}
                      />
                      {touched.citizen_id && fieldErrors.citizen_id && (
                        <p className="text-[12px] text-red-500 flex items-center gap-1 mt-1 font-medium">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {fieldErrors.citizen_id}
                        </p>
                      )}
                    </div>

                    {/* Ngày sinh */}
                    <div className="space-y-1.5">
                      <RequiredLabel>Ngày sinh</RequiredLabel>
                      <input
                        type="date"
                        max={new Date().toISOString().split("T")[0]}
                        value={form.dob}
                        onChange={(e) => update("dob", e.target.value)}
                        onBlur={() => handleBlur("dob")}
                        className={getInputClass(
                          Boolean(touched.dob && fieldErrors.dob),
                        )}
                      />
                      {touched.dob && fieldErrors.dob && (
                        <p className="text-[12px] text-red-500 flex items-center gap-1 mt-1 font-medium">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {fieldErrors.dob}
                        </p>
                      )}
                    </div>

                    {/* Giới tính */}
                    <div className="space-y-1.5">
                      <RequiredLabel>Giới tính</RequiredLabel>
                      <select
                        value={form.gender}
                        onChange={(e) =>
                          update("gender", e.target.value as Gender)
                        }
                        className={getInputClass(false)}
                      >
                        <option value="FEMALE">Nữ</option>
                        <option value="MALE">Nam</option>
                        <option value="OTHER">Khác</option>
                      </select>
                    </div>

                    {/* Số điện thoại (tùy chọn) */}
                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-medium text-[#374151]">
                        Số điện thoại{" "}
                        <span className="text-[#9CA3AF] font-normal">
                          (tùy chọn)
                        </span>
                      </label>
                      <input
                        type="tel"
                        maxLength={11}
                        placeholder="0912345678"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        onBlur={() => handleBlur("phone")}
                        className={getInputClass(
                          Boolean(touched.phone && fieldErrors.phone),
                        )}
                      />
                      {touched.phone && fieldErrors.phone && (
                        <p className="text-[12px] text-red-500 flex items-center gap-1 mt-1 font-medium">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {fieldErrors.phone}
                        </p>
                      )}
                    </div>

                    {/* Mã BHYT (tùy chọn) */}
                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-medium text-[#374151]">
                        Mã BHYT{" "}
                        <span className="text-[#9CA3AF] font-normal">
                          (không bắt buộc)
                        </span>
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        placeholder="AB1234567890"
                        value={form.insurance_id}
                        onChange={(e) =>
                          update("insurance_id", e.target.value.toUpperCase())
                        }
                        onBlur={() => handleBlur("insurance_id")}
                        className={getInputClass(
                          Boolean(
                            touched.insurance_id && fieldErrors.insurance_id,
                          ),
                        )}
                      />
                      {touched.insurance_id && fieldErrors.insurance_id && (
                        <p className="text-[12px] text-red-500 flex items-center gap-1 mt-1 font-medium">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {fieldErrors.insurance_id}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && accessToken && (
              <div>
                {bookingMode === null ? (
                  /* Layout 2 cột: 2/3 thông tin bệnh nhân | 1/3 chọn phương án */
                  <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* ─── CỘT TRÁI: Thông tin bệnh nhân (2/3) ─── */}
                    <div className="w-full lg:w-2/3 space-y-4">
                      {/* Header */}
                      <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-8 h-8 rounded-xl bg-[#8B7CF6] flex items-center justify-center shadow-sm">
                          <User
                            className="w-4 h-4 text-white"
                            strokeWidth={2.5}
                          />
                        </div>
                        <div>
                          <h2 className="text-[16px] font-bold text-[#1F2937] leading-tight">
                            Thông tin bệnh nhân
                          </h2>
                          <p className="text-[12px] text-[#9CA3AF]">
                            Đã tải từ hồ sơ hệ thống
                          </p>
                        </div>
                      </div>

                      {/* Main info card */}
                      <div className="rounded-2xl border border-[#EDE9FE] bg-gradient-to-br from-[#FAF5FF] to-white p-5 shadow-sm">
                        {/* Avatar + tên */}
                        <div className="flex items-center gap-4 mb-5 pb-4 border-b border-[#F3F4F6]">
                          <div className="w-14 h-14 rounded-2xl bg-[#8B7CF6] text-white flex items-center justify-center text-[20px] font-bold shadow-md shrink-0">
                            {form.full_name
                              ? form.full_name
                                  .trim()
                                  .split(" ")
                                  .slice(-2)
                                  .map((w) => w[0])
                                  .join("")
                                  .toUpperCase()
                              : "?"}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-[18px] font-bold text-[#1F2937] leading-tight truncate">
                              {form.full_name || "—"}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              {form.gender && (
                                <span
                                  className={cn(
                                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                    form.gender.toUpperCase() === "FEMALE"
                                      ? "bg-[#FCE7F3] text-[#DB2777]"
                                      : "bg-[#E0F2FE] text-[#0369A1]",
                                  )}
                                >
                                  {form.gender.toUpperCase() === "FEMALE"
                                    ? "Nữ"
                                    : "Nam"}
                                </span>
                              )}
                              <span className="text-[11px] font-semibold text-[#8B7CF6] bg-[#EDE9FE] px-2.5 py-0.5 rounded-full">
                                Bệnh nhân tiếp nhận
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Thông tin chi tiết dạng grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <InfoRow
                            icon={<IdCard className="w-3.5 h-3.5" />}
                            label="Số CCCD"
                            value={form.citizen_id || "—"}
                            highlight
                          />
                          <InfoRow
                            icon={<CalendarDays className="w-3.5 h-3.5" />}
                            label="Ngày sinh"
                            value={
                              form.dob
                                ? new Date(form.dob).toLocaleDateString(
                                    "vi-VN",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    },
                                  )
                                : "—"
                            }
                          />
                          {form.phone && (
                            <InfoRow
                              icon={<Phone className="w-3.5 h-3.5" />}
                              label="Số điện thoại"
                              value={form.phone}
                            />
                          )}
                          {form.email && (
                            <InfoRow
                              icon={<Mail className="w-3.5 h-3.5" />}
                              label="Email"
                              value={form.email}
                            />
                          )}
                          {form.insurance_id && (
                            <InfoRow
                              icon={<ShieldCheck className="w-3.5 h-3.5" />}
                              label="Mã BHYT"
                              value={form.insurance_id}
                              badge
                            />
                          )}
                          {existingAccount?.patient_id && (
                            <InfoRow
                              icon={<FileText className="w-3.5 h-3.5" />}
                              label="Mã bệnh nhân"
                              value={
                                existingAccount.patient_id.slice(0, 16) +
                                (existingAccount.patient_id.length > 16
                                  ? "…"
                                  : "")
                              }
                            />
                          )}
                        </div>
                      </div>

                      {/* Scan banner */}
                      {scanBanner && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-[#BBF7D0] bg-[#ECFDF5] px-4 py-3">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                          <p className="text-[13px] text-[#065F46] font-medium">
                            {scanBanner}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ─── CỘT PHẢI: Chọn phương án (1/3) ─── */}
                    <div className="w-full lg:w-1/3 lg:sticky lg:top-0">
                      <div className="mb-4">
                        <h2 className="text-[15px] font-bold text-[#1F2937]">
                          Chọn phương thức khám
                        </h2>
                        <p className="text-[12px] text-[#9CA3AF] mt-0.5">
                          Chọn 1 trong 3 cách thức phù hợp
                        </p>
                      </div>

                      {/* 3 card dọc */}
                      <div className="flex flex-col gap-3">
                        {(
                          [
                            {
                              id: "specialty" as const,
                              title: "Theo chuyên khoa",
                              description:
                                "Chọn trực tiếp chuyên khoa cần khám",
                              badge: "Trực tiếp",
                              iconBg: "bg-[#EDE9FE]",
                              iconColor: "text-[#8B7CF6]",
                              Icon: Building2,
                            },
                            {
                              id: "ai_triage" as const,
                              title: "Gợi ý từ AI",
                              description:
                                "Nhập triệu chứng, AI phân tích và gợi ý chuyên khoa",
                              badge: "AI Triage",
                              iconBg: "bg-[#DCFCE7]",
                              iconColor: "text-[#16A34A]",
                              Icon: Brain,
                            },
                            {
                              id: "package" as const,
                              title: "Gói khám định sẵn",
                              description:
                                "Khám tổng quát, tầm soát theo gói cấu hình sẵn",
                              badge: "Gói tổng hợp",
                              iconBg: "bg-[#FEF3C7]",
                              iconColor: "text-[#D97706]",
                              Icon: Package,
                            },
                          ] as const
                        ).map((mode) => (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => {
                              setBookingMode(mode.id);
                              if (mode.id === "package")
                                update(
                                  "symptoms",
                                  "Đăng ký khám theo gói sức khỏe",
                                );
                              else if (mode.id === "specialty")
                                update(
                                  "symptoms",
                                  "Đăng ký khám theo chuyên khoa",
                                );
                            }}
                            className="group relative flex items-start gap-3 p-4 rounded-2xl border border-[#E5E7EB] bg-white text-left transition-all hover:border-[#C4B5FD] hover:shadow-[0_4px_16px_rgba(139,124,246,0.12)] hover:-translate-y-0.5 active:translate-y-0 touch-manipulation cursor-pointer"
                          >
                            <div
                              className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                                mode.iconBg,
                              )}
                            >
                              <mode.Icon
                                className={cn("w-5 h-5", mode.iconColor)}
                                strokeWidth={2.25}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className="text-[14px] font-bold text-[#1F2937] group-hover:text-[#8B7CF6] transition-colors leading-tight">
                                  {mode.title}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#6B7280] leading-relaxed line-clamp-1">
                                {mode.description}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#9CA3AF] shrink-0 self-center transition-transform group-hover:translate-x-0.5 group-hover:text-[#8B7CF6]" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : bookingMode === "specialty" ? (
                  <SpecialtyPickStep
                    accessToken={accessToken}
                    departmentId={form.department_id}
                    onDepartmentChange={(val) => update("department_id", val)}
                    specialtyId={form.specialty_id}
                    onSpecialtyChange={(val) => update("specialty_id", val)}
                    slotId={form.slot_id}
                    onSlotChange={(val) => update("slot_id", val)}
                    slots={slots}
                    onSlotsChange={setSlots}
                    specialties={specialties}
                    onSpecialtiesChange={setSpecialties}
                    specialtyCatalog={specialtyCatalog}
                    isLoadingMeta={isLoadingMeta}
                    onChangeMode={() => setBookingMode(null)}
                  />
                ) : bookingMode === "package" ? (
                  <PackagePickStep
                    accessToken={accessToken}
                    departmentId={form.department_id}
                    onDepartmentChange={(val) => update("department_id", val)}
                    specialtyId={form.specialty_id}
                    onSpecialtyChange={(val) => update("specialty_id", val)}
                    slotId={form.slot_id}
                    onSlotChange={(val) => update("slot_id", val)}
                    packageId={form.package_id}
                    onPackageChange={(val) => update("package_id", val)}
                    slots={slots}
                    onSlotsChange={setSlots}
                    specialties={specialties}
                    onSpecialtiesChange={setSpecialties}
                    specialtyCatalog={specialtyCatalog}
                    isLoadingMeta={isLoadingMeta}
                    onChangeMode={() => setBookingMode(null)}
                  />
                ) : (
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
                      update("symptoms", value);
                      if (triageSession.is_analyzed) {
                        setTriageSession(EMPTY_TRIAGE_SESSION);
                        update("department_id", "");
                        update("specialty_id", "");
                        update("slot_id", "");
                      }
                    }}
                    specialtyId={form.specialty_id}
                    onSpecialtyChange={(value) => update("specialty_id", value)}
                    departmentId={form.department_id}
                    onDepartmentChange={(value) =>
                      update("department_id", value)
                    }
                    slotId={form.slot_id}
                    onSlotChange={(value) => update("slot_id", value)}
                    slots={slots}
                    specialties={specialties}
                    specialtyCatalog={specialtyCatalog}
                    onSlotsChange={setSlots}
                    onSpecialtiesChange={setSpecialties}
                    triageSession={triageSession}
                    onTriageSessionChange={setTriageSession}
                    inputClass={inputClass}
                    isLoadingMeta={isLoadingMeta}
                    onChangeMode={() => setBookingMode(null)}
                  />
                )}
              </div>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
              <RegisterConfirmStep
                fullName={form.full_name}
                citizenId={form.citizen_id}
                dob={form.dob}
                phone={form.phone}
                insuranceId={form.insurance_id}
                symptoms={form.symptoms}
                paymentMethod={form.payment_method}
                onPaymentMethodChange={(method) =>
                  update("payment_method", method)
                }
                departmentId={form.department_id}
                specialtyCatalog={specialtyCatalog}
                selectedSpecialty={selectedSpecialty}
                selectedSlot={selectedSlot}
                triageSession={triageSession}
                bookingMode={bookingMode}
              />
            )}

            {step === 4 && !registrationResult && (
              <div className="flex items-center justify-center gap-2 py-16 text-[#8B7CF6]">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-[14px] font-semibold">
                  Đang tải vé khám...
                </span>
              </div>
            )}

            {step === 4 && registrationResult?.isPaymentPending && (
              <PayOsPaymentPanel
                result={registrationResult}
                onUpdateResult={(updated) => {
                  setRegistrationResult(updated);
                }}
              />
            )}

            {step === 4 &&
              registrationResult &&
              !registrationResult.isPaymentPending && (
                <RegisterSuccessStep
                  result={registrationResult}
                  onRegisterNew={handleReset}
                />
              )}

            {/* Footer actions */}
            {step < 4 && (
              <div className="flex items-center justify-end mt-8 pt-4 border-t border-[#F3F4F6]">
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={step === 1 ? !step1Valid : !step2Valid}
                    className={cn(
                      "inline-flex items-center gap-2 min-h-[44px] px-6 py-2.5 rounded-lg text-[13px] font-bold transition-colors",
                      (step === 1 ? step1Valid : step2Valid)
                        ? "bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white shadow-[0_2px_8px_rgba(139,124,246,0.3)]"
                        : "bg-[#EDE9FE] text-[#C4B5FD] cursor-not-allowed",
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
                      {isPending
                        ? "Đang xử lý..."
                        : form.payment_method === "qr"
                          ? "Tiếp tục & Tạo mã QR"
                          : "Xác nhận & Cấp số thứ tự"}
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
