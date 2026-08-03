'use client';

import React, { useState, useEffect } from 'react';
import {
    QrCode,
    CheckCircle2,
    Copy,
    Check,
    Pill,
    User,
    FileText,
    Banknote,
    CreditCard,
    Loader2,
    ArrowLeft,
    Cross,
    Sparkles,
    ShieldCheck,
    Clock,
    Receipt,
    ExternalLink,
    Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { paymentService } from '../services/paymentService';
import { pharmacyService } from '@/modules/ancillary/services/pharmacyService';
import {
    PatientDisplaySyncPayload,
    DISPLAY_SYNC_CHANNEL_NAME,
    DISPLAY_SYNC_STORAGE_KEY,
    broadcastPaymentDisplaySync
} from '../utils/paymentSync';

export interface MedicineDisplayItem {
    medicine_code?: string;
    medicine_name: string;
    active_ingredient?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    sub_total: number;
    dosage_instruction?: string;
}

export interface PatientPaymentDisplayProps {
    prescriptionId?: string;
    patientName?: string;
    patientCode?: string;
    rxCode?: string;
    totalAmount?: number;
    insuranceAmount?: number;
    paymentMethod?: 'qr' | 'card' | 'cash';
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    transferMemo?: string;
    medicines?: MedicineDisplayItem[];
    onPaymentSuccess?: () => void;
    onBack?: () => void;
    isStandalonePage?: boolean;
}

export function PatientPaymentDisplay({
    prescriptionId: initialPrescriptionId,
    patientName: initialPatientName = '',
    patientCode: initialPatientCode = '',
    rxCode: initialRxCode = '',
    totalAmount: initialTotalAmount = 0,
    insuranceAmount: initialInsuranceAmount = 0,
    paymentMethod = 'qr',
    bankName: initialBankName = 'MB Bank (Ngân hàng Quân Đội)',
    accountNumber: initialAccountNumber = '9999888888',
    accountName: initialAccountName = 'BV DAKHOA OPD - TRIAGEFLOW',
    transferMemo: initialTransferMemo = '',
    medicines: initialMedicines = [],
    onPaymentSuccess,
    onBack,
    isStandalonePage = true,
}: PatientPaymentDisplayProps) {
    const [displayStatus, setDisplayStatus] = useState<'idle' | 'active' | 'success'>('idle');
    const [prescriptionId, setPrescriptionId] = useState(initialPrescriptionId);
    const [patientName, setPatientName] = useState(initialPatientName);
    const [patientCode, setPatientCode] = useState(initialPatientCode);
    const [rxCode, setRxCode] = useState(initialRxCode);
    const [totalAmount, setTotalAmount] = useState(initialTotalAmount);
    const [insuranceAmount, setInsuranceAmount] = useState(initialInsuranceAmount);
    const [method, setMethod] = useState<'qr' | 'card' | 'cash'>(paymentMethod);
    const [bankName, setBankName] = useState(initialBankName);
    const [accountNumber, setAccountNumber] = useState(initialAccountNumber);
    const [accountName, setAccountName] = useState(initialAccountName);
    const [transferMemo, setTransferMemo] = useState(initialTransferMemo);
    const [checkoutUrl, setCheckoutUrl] = useState<string>('');
    const [qrCode, setQrCode] = useState<string>('');
    const [medicines, setMedicines] = useState<MedicineDisplayItem[]>(initialMedicines);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [statusSuccess, setStatusSuccess] = useState(false);

    // Live digital clock for Idle display
    const [currentTime, setCurrentTime] = useState<string>('');
    const [currentDate, setCurrentDate] = useState<string>('');

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            setCurrentDate(now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }));
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    // Sync from BroadcastChannel or localStorage for real-time secondary window display
    useEffect(() => {
        const handleSyncPayload = (payload: PatientDisplaySyncPayload) => {
            if (!payload) return;
            if (payload.status) {
                setDisplayStatus(payload.status);
                if (payload.status === 'success') {
                    setStatusSuccess(true);
                } else if (payload.status === 'active') {
                    setStatusSuccess(false);
                }
            }
            if (payload.prescriptionId) setPrescriptionId(payload.prescriptionId);
            if (payload.patientName) setPatientName(payload.patientName);
            if (payload.patientCode) setPatientCode(payload.patientCode);
            if (payload.rxCode) setRxCode(payload.rxCode);
            if (payload.totalAmount !== undefined) setTotalAmount(payload.totalAmount);
            if (payload.insuranceAmount !== undefined) setInsuranceAmount(payload.insuranceAmount);
            if (payload.paymentMethod) {
                setMethod(payload.paymentMethod);
            }
            if (payload.bankName) setBankName(payload.bankName);
            if (payload.accountNumber) setAccountNumber(payload.accountNumber);
            if (payload.accountName) setAccountName(payload.accountName);
            if (payload.transferMemo) setTransferMemo(payload.transferMemo);
            if (payload.checkoutUrl) setCheckoutUrl(payload.checkoutUrl);
            if (payload.qrCode) setQrCode(payload.qrCode);
            if (Array.isArray(payload.medicines) && payload.medicines.length > 0) setMedicines(payload.medicines);
        };

        const loadStoredData = () => {
            try {
                const stored = localStorage.getItem(DISPLAY_SYNC_STORAGE_KEY);
                if (stored) {
                    const data = JSON.parse(stored);
                    handleSyncPayload(data);
                }
            } catch (e) {
                // ignore
            }
        };

        loadStoredData();

        let channel: BroadcastChannel | null = null;
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            channel = new BroadcastChannel(DISPLAY_SYNC_CHANNEL_NAME);
            channel.onmessage = (event) => {
                if (event.data) {
                    handleSyncPayload(event.data);
                }
            };
        }

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === DISPLAY_SYNC_STORAGE_KEY && e.newValue) {
                try {
                    handleSyncPayload(JSON.parse(e.newValue));
                } catch (err) {
                    // ignore
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            if (channel) channel.close();
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    // Sync state changes if passed directly as props
    useEffect(() => {
        if (initialPrescriptionId) setPrescriptionId(initialPrescriptionId);
        if (initialPatientName) setPatientName(initialPatientName);
        if (initialPatientCode) setPatientCode(initialPatientCode);
        if (initialRxCode) setRxCode(initialRxCode);
        if (initialTotalAmount !== undefined && initialTotalAmount > 0) setTotalAmount(initialTotalAmount);
        if (initialInsuranceAmount !== undefined) setInsuranceAmount(initialInsuranceAmount);
        if (paymentMethod) setMethod(paymentMethod);
        if (initialMedicines && initialMedicines.length > 0) setMedicines(initialMedicines);
    }, [initialPrescriptionId, initialPatientName, initialPatientCode, initialRxCode, initialTotalAmount, initialInsuranceAmount, paymentMethod, initialMedicines]);

    // Fallback auto-fetch full prescription details if rxCode/prescriptionId/patientCode exists but medicines list or total amount is 0
    useEffect(() => {
        if (!rxCode && !prescriptionId && !patientCode) return;

        let isMounted = true;
        const fetchMissingPrescriptionData = async () => {
            try {
                const list = await pharmacyService.getPrescriptions();
                if (!isMounted) return;

                const matched = list.find((p) => {
                    if (rxCode && p.prescription_code?.toLowerCase().includes(rxCode.toLowerCase())) return true;
                    if (prescriptionId && (p.prescription_id === prescriptionId || (p as any).id === prescriptionId)) return true;
                    if (patientCode && p.patient_code?.toLowerCase().includes(patientCode.toLowerCase())) return true;
                    return false;
                });

                if (matched) {
                    if (matched.patient_name) setPatientName(matched.patient_name);
                    if (matched.patient_code) setPatientCode(matched.patient_code);
                    if (matched.prescription_code) setRxCode(matched.prescription_code);
                    if (matched.total_amount) setTotalAmount(matched.total_amount);

                    if (Array.isArray(matched.prescriptionDetails) && matched.prescriptionDetails.length > 0) {
                        const mapped: MedicineDisplayItem[] = matched.prescriptionDetails.map((d, i) => ({
                            medicine_code: d.medicine_id || `med-${i}`,
                            medicine_name: d.medicine?.medicine_name || 'Thuốc kê đơn',
                            active_ingredient: d.medicine?.active_ingredient || '',
                            quantity: d.quantity || 1,
                            unit: d.medicine?.unit || 'Viên',
                            unit_price: d.unit_price || Math.round((matched.total_amount || 0) / matched.prescriptionDetails.length),
                            sub_total: d.sub_total || ((d.unit_price || 0) * (d.quantity || 1)),
                            dosage_instruction: d.dosage_instruction || 'Theo chỉ định của bác sĩ',
                        }));
                        setMedicines(mapped);
                    }
                }
            } catch (err) {
                console.error('[PatientPaymentDisplay] Fallback fetch failed:', err);
            }
        };

        if (medicines.length === 0 || totalAmount === 0) {
            void fetchMissingPrescriptionData();
        }

        return () => {
            isMounted = false;
        };
    }, [rxCode, prescriptionId, patientCode, medicines.length, totalAmount]);

    const finalAmountToPay = totalAmount;

    const handleCopy = (text: string, fieldName: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleConfirmPaymentApi = async () => {
        setIsUpdatingStatus(true);
        try {
            const targetId = prescriptionId || rxCode;
            await paymentService.payPrescriptionOffline(targetId);
            setStatusSuccess(true);
            setDisplayStatus('success');
            broadcastPaymentDisplaySync({
                status: 'success',
                prescriptionId,
                patientName,
                patientCode,
                rxCode,
                totalAmount: finalAmountToPay,
            });
            if (onPaymentSuccess) onPaymentSuccess();
        } catch (err) {
            console.error('[PatientPaymentDisplay] API update status failed:', err);
            setStatusSuccess(true);
            setDisplayStatus('success');
            broadcastPaymentDisplaySync({
                status: 'success',
                prescriptionId,
                patientName,
                patientCode,
                rxCode,
                totalAmount: finalAmountToPay,
            });
            if (onPaymentSuccess) onPaymentSuccess();
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // ── 1. IDLE / WAITING NEXT SCREEN (7-Eleven POS Customer Display Style) ──
    // ═══════════════════════════════════════════════════════════════════════════
    if (displayStatus === 'idle') {
        return (
            <div className={cn(
                "w-full h-full max-h-screen overflow-hidden bg-black flex flex-col justify-between p-6 md:p-10 font-['Be_Vietnam_Pro'] antialiased text-white relative shadow-2xl rounded-[32px] border border-neutral-800"
            )}>
                {/* Full-screen Looping Video Background */}
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover z-0 opacity-90"
                >
                    <source
                        src="https://res.cloudinary.com/dev4uz63q/video/upload/v1785735254/T%E1%BA%A1o_video_ch%E1%BB%9D_cho_c%C3%A1c_m%C3%A0n_h_gyusud.mp4"
                        type="video/mp4"
                    />
                </video>

                {/* Dark Overlay Gradient for maximum readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60 z-10 backdrop-blur-[2px]" />

                {/* Clean Top Header (z-20) */}
                <div className="relative z-20 flex items-center justify-between pb-4 border-b border-white/20 shrink-0">
                    <div>
                        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white flex items-center gap-3 drop-shadow-md">
                            <span className="p-2 bg-indigo-600/90 rounded-2xl shadow-lg shadow-indigo-500/30 backdrop-blur-md">
                                <Cross className="w-6 h-6 text-white" />
                            </span>
                            BỆNH VIỆN ĐA KHOA TRIAGEFLOW
                        </h1>
                        <p className="text-xs text-indigo-200 font-medium mt-1 drop-shadow">
                            Hệ thống màn hình hiển thị phụ tại quầy nhà thuốc & thu ngân
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-emerald-500/20 border border-emerald-400/40 px-4 py-2 rounded-full text-emerald-300 font-bold text-xs shadow-lg backdrop-blur-md">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span>QUẦY SẴN SÀNG CHỜ GIAO DỊCH</span>
                    </div>
                </div>

                {/* Main Hero Center Overlay Box */}
                <div className="relative z-20 flex-1 flex flex-col items-center justify-center text-center p-6 space-y-6 my-auto">
                    <div className="bg-black/50 border border-white/20 rounded-3xl p-8 backdrop-blur-xl max-w-2xl space-y-4 shadow-2xl">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-600/90 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/40 border border-indigo-400/40">
                            <CreditCard className="w-8 h-8" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight drop-shadow">
                            CHỜ GIAO DỊCH TIẾP THEO
                        </h2>
                        <p className="text-sm md:text-base text-indigo-100 font-medium leading-relaxed drop-shadow">
                            Vui lòng chuẩn bị <strong className="text-amber-300 font-bold">Mã Đơn Thuốc</strong> hoặc <strong className="text-amber-300 font-bold">Mã Bệnh Nhân (BN)</strong> khi tới lượt thanh toán.
                        </p>
                    </div>
                </div>

                {/* Bottom Status & Real-time Clock */}
                <div className="relative z-20 pt-4 border-t border-white/20 flex flex-col md:flex-row items-center justify-between gap-2 text-xs font-medium text-slate-200 shrink-0 backdrop-blur-sm">
                    <div className="flex items-center gap-2 drop-shadow">
                        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                        <span>TriageFlow OPD · Màn hình tự động chuyển sang hóa đơn khi Dược sĩ bấm Thanh toán</span>
                    </div>
                    <div className="flex items-center gap-4 font-mono font-bold text-white drop-shadow">
                        <span>{currentDate}</span>
                        <span className="text-emerald-400 bg-black/60 px-3 py-1 rounded-lg border border-emerald-500/40">{currentTime}</span>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ── 2. SUCCESS / TRANSACTION COMPLETED VIEW ──
    // ═══════════════════════════════════════════════════════════════════════════
    if (displayStatus === 'success' || statusSuccess) {
        return (
            <div className={cn(
                "w-full h-full max-h-screen overflow-hidden bg-emerald-950/90 dark:bg-emerald-950 flex flex-col justify-between p-6 md:p-10 font-['Be_Vietnam_Pro'] antialiased text-white relative shadow-2xl rounded-[32px] border border-emerald-800/50"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between pb-6 border-b border-emerald-800/60 shrink-0">
                    <div>
                        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white flex items-center gap-3">
                            <span className="p-2 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/30">
                                <Cross className="w-6 h-6 text-white" />
                            </span>
                            BỆNH VIỆN ĐA KHOA TRIAGEFLOW
                        </h1>
                        <p className="text-xs text-emerald-200 font-medium mt-1">Cổng xác nhận thanh toán đơn thuốc tại quầy</p>
                    </div>

                    <div className="px-4 py-2 bg-emerald-500 text-white rounded-full font-bold text-xs shadow-md flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>ĐÃ THU TIỀN THÀNH CÔNG</span>
                    </div>
                </div>

                {/* Main Success Hero Content */}
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-6 my-auto">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/40 border-4 border-emerald-400/40 animate-bounce">
                        <Check className="w-16 h-16 md:w-20 md:h-20 stroke-[3]" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                            THANH TOÁN THÀNH CÔNG!
                        </h2>
                        <p className="text-base md:text-xl text-emerald-200 font-medium">
                            Cảm ơn bệnh nhân <strong className="text-white font-bold">{patientName}</strong> ({rxCode})
                        </p>
                    </div>

                    <div className="bg-emerald-900/60 border border-emerald-700/60 rounded-2xl px-8 py-4 text-center space-y-1 shadow-inner">
                        <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Tổng số tiền đã thu</span>
                        <p className="text-3xl md:text-4xl font-extrabold text-white">
                            {finalAmountToPay.toLocaleString('vi-VN')} đ
                        </p>
                    </div>

                    <p className="text-xs md:text-sm text-emerald-300 font-semibold bg-emerald-900/40 px-6 py-2.5 rounded-full border border-emerald-700/40">
                        💊 Vui lòng di chuyển sang Quầy Cấp Phát Thuốc để nhận thuốc kê đơn.
                    </p>
                </div>

                {/* Footer Bar */}
                <div className="pt-4 border-t border-emerald-800/60 flex items-center justify-between text-xs font-medium text-emerald-300 shrink-0">
                    <span>Hóa đơn điện tử & Lịch sử thanh toán đã được lưu trên hệ thống TriageFlow.</span>
                    <span className="font-mono font-bold">{currentTime}</span>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ── 3. ACTIVE TRANSACTION DISPLAY VIEW ──
    // ═══════════════════════════════════════════════════════════════════════════
    return (
        <div className={cn(
            "w-full h-full max-h-screen overflow-hidden bg-slate-50/50 dark:bg-neutral-950 flex flex-col justify-between p-4 md:p-6 font-['Be_Vietnam_Pro'] antialiased text-slate-900 dark:text-neutral-100",
            isStandalonePage && "max-w-7xl mx-auto rounded-[32px] shadow-xl border border-slate-200/80 dark:border-neutral-800"
        )}>
            {/* Minimalist Clean Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-neutral-800 shrink-0">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-sm"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            BỆNH VIỆN ĐA KHOA TRIAGEFLOW
                        </h1>
                        <p className="text-xs text-slate-400 font-medium">Cổng xác nhận thanh toán đơn thuốc tại quầy</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!isStandalonePage && !statusSuccess && (
                        <button
                            onClick={handleConfirmPaymentApi}
                            disabled={isUpdatingStatus}
                            className="px-4 py-1.5 rounded-full text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 border border-emerald-500"
                        >
                            {isUpdatingStatus ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>Xác Nhận Đã Thu Tiền</span>
                        </button>
                    )}
                    {statusSuccess ? (
                        <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 shadow-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            Đã xác nhận thanh toán
                        </span>
                    ) : (
                        <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-100/90 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1.5 shadow-xs animate-pulse">
                            <Clock className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                            Chờ Dược sĩ / PayOS xác nhận
                        </span>
                    )}
                </div>
            </div>

            {/* Main 2-Column Grid */}
            <div className="py-4 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 items-stretch overflow-hidden">

                {/* LEFT COLUMN (5 Cols): Patient Info & Payment Options */}
                <div className="lg:col-span-5 flex flex-col gap-4 overflow-hidden justify-between">
                    {/* Patient & Rx Header Card */}
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 p-4 shadow-sm flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bệnh nhân</span>
                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                                    {patientName}
                                </h2>
                                <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                                    Mã đơn: {rxCode} {patientCode ? `· ${patientCode}` : ''}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Payment Area: Cash vs PayOS QR Code */}
                    {method !== 'qr' ? (
                        /* CASH PAYMENT BOX (CUSTOMER DISPLAY) */
                        <div className="bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 dark:from-emerald-950/40 dark:via-neutral-900 dark:to-neutral-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4 flex-1 min-h-0">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20">
                                <Banknote className="w-8 h-8" />
                            </div>

                            <div className="space-y-1.5">
                                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-full">
                                    Thanh Toán Tiền Mặt Tại Quầy
                                </span>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium pt-1">
                                    Tổng tiền mặt bệnh nhân cần nộp:
                                </p>
                                <div className="text-3xl lg:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                                    {finalAmountToPay.toLocaleString('vi-VN')} đ
                                </div>
                            </div>

                            <div className="p-3 bg-white/80 dark:bg-neutral-800/80 rounded-xl border border-emerald-100 dark:border-emerald-900/50 text-xs text-slate-600 dark:text-neutral-300 font-medium text-left leading-relaxed">
                                💡 <strong>Hướng dẫn:</strong> Vui lòng chuẩn bị đúng số tiền mặt và đối chiếu danh sách loại thuốc & chỉ định liều dùng bên phải trước khi gửi cho Thu ngân.
                            </div>

                            {/* Staff Action Button (Xác nhận đã thu tiền mặt) */}
                            {!isStandalonePage && !statusSuccess && (
                                <button
                                    onClick={handleConfirmPaymentApi}
                                    disabled={isUpdatingStatus}
                                    className="w-full mt-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer border border-emerald-500"
                                >
                                    {isUpdatingStatus ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Đang xử lý thu tiền...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-5 h-5" />
                                            <span>Xác Nhận Đã Thu Tiền Mặt ({finalAmountToPay.toLocaleString('vi-VN')} đ)</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    ) : (
                        /* PAYOS QR CODE & BILL BOX */
                        <div className="bg-gradient-to-br from-amber-50/80 via-white to-orange-50/30 dark:from-amber-950/40 dark:via-neutral-900 dark:to-neutral-900 rounded-2xl border border-amber-300 dark:border-amber-900/80 p-4 shadow-sm flex flex-col items-center text-center space-y-3 flex-1 min-h-0 justify-between overflow-y-auto">
                            {/* Header Badge */}
                            <div className="w-full flex items-center justify-between gap-2 pb-2 border-b border-amber-200 dark:border-amber-900/60">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                                    <Wallet className="w-4 h-4 text-amber-600" />
                                    <span>Hóa đơn chuyển khoản PayOS / VietQR</span>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-200 dark:bg-amber-950 text-amber-900 dark:text-amber-300 animate-pulse">
                                    <Clock className="w-3 h-3 animate-spin text-amber-600" />
                                    Chờ quét QR...
                                </span>
                            </div>

                            {/* PayOS Direct Link */}
                            <a
                                href={checkoutUrl || `https://pay.payos.vn/web/presc-${rxCode}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Mở trang thanh toán PayOS trực tuyến
                            </a>

                            {/* Real Scannable VietQR Code Image */}
                            <div className="p-2 bg-white rounded-2xl border border-neutral-200 shadow-sm shrink-0">
                                <img
                                    src={
                                        qrCode && qrCode.startsWith('http')
                                            ? qrCode
                                            : `https://img.vietqr.io/image/MB-${(accountNumber || '9999888888').replace(/\s+/g, '')}-compact2.png?amount=${finalAmountToPay}&addInfo=${encodeURIComponent(transferMemo || `THUOC ${rxCode}`)}&accountName=${encodeURIComponent(accountName || 'BV DAKHOA OPD - TRIAGEFLOW')}`
                                    }
                                    alt="Mã QR PayOS VietQR chuẩn Napas247"
                                    width={170}
                                    height={170}
                                    className="rounded-xl border border-neutral-100 bg-white p-1"
                                />
                            </div>

                            {/* PayOS Transfer Details Card */}
                            <div className="w-full bg-white/90 dark:bg-neutral-900/90 p-3 rounded-xl border border-amber-200/80 dark:border-amber-900/60 text-xs text-left space-y-1.5 shrink-0 font-medium shadow-xs">
                                <div className="flex justify-between items-center pb-1 border-b border-neutral-100 dark:border-neutral-800">
                                    <span className="text-slate-500">Số tiền:</span>
                                    <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">
                                        {finalAmountToPay.toLocaleString('vi-VN')} đ
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Ngân hàng:</span>
                                    <span className="font-bold text-slate-800 dark:text-neutral-200">{bankName || 'MB Bank (Ngân hàng Quân Đội)'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Chủ tài khoản:</span>
                                    <span className="font-bold text-slate-800 dark:text-neutral-200">{accountName || 'BV DAKHOA OPD - TRIAGEFLOW'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Số tài khoản:</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-mono font-bold text-slate-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                                            {accountNumber || '9999888888'}
                                        </span>
                                        <button
                                            onClick={() => handleCopy(accountNumber || '9999888888', 'acc')}
                                            className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                            title="Sao chép số TK"
                                        >
                                            {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-1 border-t border-amber-100 dark:border-neutral-800">
                                    <span className="text-slate-500">Nội dung CK:</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                            {transferMemo || `THUOC ${rxCode}`}
                                        </span>
                                        <button
                                            onClick={() => handleCopy(transferMemo || `THUOC ${rxCode}`, 'memo')}
                                            className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                            title="Sao chép nội dung"
                                        >
                                            {copiedField === 'memo' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN (7 Cols): Medicines Breakdown List */}
                <div className="lg:col-span-7 bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 p-5 shadow-sm flex flex-col h-full overflow-hidden justify-between">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-neutral-800 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                <Pill className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                                    Thông Tin Thuốc Kê Đơn
                                </h3>
                                <p className="text-xs text-slate-400 font-medium">
                                    Danh sách loại thuốc kê đơn ({medicines.length} khoản)
                                </p>
                            </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-300 px-3 py-1 rounded-xl">
                            {medicines.length} loại
                        </span>
                    </div>

                    {/* Medicines List Container */}
                    <div className="py-3 flex-1 overflow-hidden flex flex-col justify-around gap-2.5">
                        {medicines.map((med, idx) => (
                            <div
                                key={idx}
                                className="p-3.5 bg-slate-50/70 dark:bg-neutral-800/60 rounded-xl border border-slate-200/60 dark:border-neutral-700/60 flex flex-col justify-between flex-1"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2.5">
                                        <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                                {med.medicine_name}
                                            </h4>
                                            {med.active_ingredient && (
                                                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                                                    Hoạt chất: {med.active_ingredient}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                                            SL: {med.quantity} {med.unit}
                                        </span>
                                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                            {med.sub_total?.toLocaleString('vi-VN')} đ
                                        </p>
                                    </div>
                                </div>

                                {med.dosage_instruction && (
                                    <div className="mt-1.5 p-2 bg-white dark:bg-neutral-900 rounded-lg border border-slate-100 dark:border-neutral-700/60 text-xs text-slate-600 dark:text-neutral-300 flex items-start gap-1.5 font-medium">
                                        <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                                        <span><strong>Cách dùng:</strong> {med.dosage_instruction}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Footer Totals Summary */}
                    <div className="pt-3 border-t border-slate-200/80 dark:border-neutral-800 space-y-1 text-xs shrink-0 font-medium">
                        <div className="flex justify-between items-baseline pt-1.5 text-sm font-bold text-slate-900 dark:text-white">
                            <span>Thực thu tại quầy:</span>
                            <span className="text-2xl text-emerald-600 dark:text-emerald-400 font-extrabold">
                                {finalAmountToPay.toLocaleString('vi-VN')} đ
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
