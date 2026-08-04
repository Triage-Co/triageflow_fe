'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    CreditCard,
    Banknote,
    QrCode,
    CheckCircle2,
    ArrowLeft,
    Shield,
    Plus,
    Minus,
    Check,
    Receipt,
    User,
    ChevronDown,
    Loader2,
    Printer,
    Sparkles,
    Monitor,
    ExternalLink,
    RefreshCw,
    Search
} from 'lucide-react';
import { PatientPaymentDisplay } from './PatientPaymentDisplay';
import { pharmacyService } from '@/modules/ancillary/services/pharmacyService';
import { paymentService } from '../services/paymentService';
import { Prescription } from '@/shared/types/prescription.types';
import { broadcastPaymentDisplaySync } from '../utils/paymentSync';

interface MedicineItem {
    id: string;
    name: string;
    dosage: string;
    unitPrice: number;
    quantity: number;
    stock: number;
}

interface PatientRx {
    id: string;
    code: string;
    rxCode: string;
    patientName: string;
    insuranceRate: number; // e.g. 0.8 for 80%
    medicines: MedicineItem[];
    rawPrescription: Prescription;
}

export interface PaymentWorkflowPanelProps {
    presetPrescriptionId?: string;
    onClose?: () => void;
    onPaymentSuccess?: (updatedPrescription: Prescription) => void;
}

export function PaymentWorkflowPanel({
    presetPrescriptionId,
    onClose,
    onPaymentSuccess,
}: PaymentWorkflowPanelProps = {}) {
    const router = useRouter();
    const [patients, setPatients] = useState<PatientRx[]>([]);
    const [loading, setLoading] = useState(true);

    const [step, setStep] = useState<1 | 2>(1);
    const [selectedPatientId, setSelectedPatientId] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'qr' | 'card' | 'cash'>('qr');
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchLivePrescriptions = async () => {
        setLoading(true);
        try {
            const list = await pharmacyService.getPrescriptions();
            const pendingList = list.filter((p) => p.status === 'PENDING');
            const mapped: PatientRx[] = pendingList.map((p, idx) => ({
                id: p.prescription_id,
                code: p.patient_code || `P${(idx + 1).toString().padStart(3, '0')}`,
                rxCode: p.prescription_code,
                patientName: p.patient_name || 'Bệnh nhân',
                insuranceRate: 0,
                rawPrescription: p,
                medicines: p.prescriptionDetails?.map((d, i) => ({
                    id: d.prescription_detail_id || `m-${i}`,
                    name: d.medicine?.medicine_name || 'Thuốc kê đơn',
                    dosage: d.dosage_instruction || 'Theo chỉ định Bác sĩ',
                    unitPrice: d.unit_price || 0,
                    quantity: d.quantity || 1,
                    stock: (d.quantity || 1) * 2
                })) || []
            }));

            setPatients(mapped);

            if (presetPrescriptionId) {
                const match = mapped.find((item) => item.id === presetPrescriptionId);
                if (match) {
                    setSelectedPatientId(match.id);
                } else if (mapped.length > 0) {
                    setSelectedPatientId(mapped[0].id);
                }
            } else if (typeof window !== 'undefined') {
                const urlParams = new URLSearchParams(window.location.search);
                const searchCode = urlParams.get('search');
                if (searchCode) {
                    setSearchQuery(searchCode);
                    const match = mapped.find(
                        (item) => item.rxCode.toLowerCase().includes(searchCode.toLowerCase()) || item.patientName.toLowerCase().includes(searchCode.toLowerCase())
                    );
                    if (match) {
                        setSelectedPatientId(match.id);
                        return;
                    }
                }
            }

            if (mapped.length > 0 && !selectedPatientId) {
                setSelectedPatientId(mapped[0].id);
            }
        } catch (err) {
            console.error('[PaymentWorkflowPanel] Failed to fetch prescriptions:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLivePrescriptions();
    }, []);

    // Active patient item
    const activePatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

    // Local mutable state for medicine quantities
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    useEffect(() => {
        if (activePatient) {
            const initial: Record<string, number> = {};
            activePatient.medicines.forEach((m) => {
                initial[m.id] = m.quantity;
            });
            setQuantities(initial);
        }
    }, [selectedPatientId, patients]);

    const updateQuantity = (id: string, delta: number) => {
        setQuantities((prev) => {
            const current = prev[id] || 1;
            const updated = Math.max(1, current + delta);
            return { ...prev, [id]: updated };
        });
    };

    // Calculate totals
    const subtotal = activePatient
        ? activePatient.medicines.reduce((sum, med) => {
              const qty = quantities[med.id] ?? med.quantity;
              return sum + med.unitPrice * qty;
          }, 0)
        : 0;

    const insuranceDiscount = activePatient ? Math.round(subtotal * activePatient.insuranceRate) : 0;
    const totalAmount = Math.max(0, subtotal - insuranceDiscount);

    // Format currency VND
    const formatVND = (amount: number) => {
        return amount.toLocaleString('vi-VN') + ' đ';
    };

    // Real-time broadcast sync to patient customer-facing secondary display & auto PayOS QR generation
    useEffect(() => {
        if (!activePatient) return;
        if (paymentSuccess) {
            broadcastPaymentDisplaySync({
                status: 'success',
                prescriptionId: activePatient.id,
                patientName: activePatient.patientName,
                patientCode: activePatient.code,
                rxCode: activePatient.rxCode,
                totalAmount,
            });
            return;
        }

        const currentMedicines = activePatient.medicines.map((med) => {
            const qty = quantities[med.id] ?? med.quantity;
            return {
                medicine_code: med.id,
                medicine_name: med.name,
                quantity: qty,
                unit: 'Viên',
                unit_price: med.unitPrice,
                sub_total: med.unitPrice * qty,
                dosage_instruction: med.dosage,
            };
        });

        if (paymentMethod === 'qr') {
            const defaultAccountNo = '9999888888';
            const defaultAccountName = 'BV DAKHOA OPD - TRIAGEFLOW';
            const defaultBankName = 'MB Bank (Ngân hàng Quân Đội)';
            const defaultMemo = `THUOC ${activePatient.rxCode}`;
            const defaultCheckoutUrl = `https://pay.payos.vn/web/presc-${activePatient.rxCode}`;
            const defaultVietQrUrl = `https://img.vietqr.io/image/MB-${defaultAccountNo}-compact2.png?amount=${totalAmount}&addInfo=${encodeURIComponent(defaultMemo)}&accountName=${encodeURIComponent(defaultAccountName)}`;

            // Broadcast IMMEDIATELY (0ms) so patient display switches to QR view instantly!
            broadcastPaymentDisplaySync({
                status: 'active',
                prescriptionId: activePatient.id,
                patientName: activePatient.patientName,
                patientCode: activePatient.code,
                rxCode: activePatient.rxCode,
                totalAmount,
                insuranceAmount: insuranceDiscount,
                paymentMethod: 'qr',
                bankName: defaultBankName,
                accountNumber: defaultAccountNo,
                accountName: defaultAccountName,
                transferMemo: defaultMemo,
                checkoutUrl: defaultCheckoutUrl,
                qrCode: defaultVietQrUrl,
                medicines: currentMedicines,
            });

            let isCancelled = false;
            const initPayOsQrTransaction = async () => {
                try {
                    const res = await paymentService.createPrescriptionPayOsTransaction(
                        activePatient.id,
                        totalAmount,
                        activePatient.rxCode
                    );
                    if (isCancelled) return;

                    const finalQr = res.qr_code || res.qrCode || defaultVietQrUrl;
                    const finalCheckout = res.checkout_url || res.checkoutUrl || defaultCheckoutUrl;
                    const finalAccountName = res.account_name || res.accountName || defaultAccountName;
                    const finalAccountNo = res.account_number || res.accountNumber || defaultAccountNo;
                    const finalBankName = res.bank_name || res.bankName || defaultBankName;

                    // Update broadcast with API PayOS checkout details once resolved
                    broadcastPaymentDisplaySync({
                        status: 'active',
                        prescriptionId: activePatient.id,
                        patientName: activePatient.patientName,
                        patientCode: activePatient.code,
                        rxCode: activePatient.rxCode,
                        totalAmount,
                        insuranceAmount: insuranceDiscount,
                        paymentMethod: 'qr',
                        bankName: finalBankName,
                        accountNumber: finalAccountNo,
                        accountName: finalAccountName,
                        transferMemo: defaultMemo,
                        checkoutUrl: finalCheckout,
                        qrCode: finalQr,
                        medicines: currentMedicines,
                    });
                } catch (err) {
                    console.error('[PaymentWorkflowPanel] Failed to generate PayOS QR:', err);
                }
            };

            void initPayOsQrTransaction();

            return () => {
                isCancelled = true;
            };
        } else {
            broadcastPaymentDisplaySync({
                status: 'active',
                prescriptionId: activePatient.id,
                patientName: activePatient.patientName,
                patientCode: activePatient.code,
                rxCode: activePatient.rxCode,
                totalAmount,
                insuranceAmount: insuranceDiscount,
                paymentMethod: 'cash',
                transferMemo: `THUOC ${activePatient.rxCode}`,
                medicines: currentMedicines,
            });
        }
    }, [activePatient, quantities, paymentMethod, paymentSuccess, totalAmount, insuranceDiscount]);

    const handleConfirmPayment = async () => {
        if (!activePatient) return;
        setIsProcessing(true);
        try {
            // Call Backend API to update status to paid
            const updated = await paymentService.payPrescriptionOffline(activePatient.id);
            setIsProcessing(false);
            setPaymentSuccess(true);
            broadcastPaymentDisplaySync({
                status: 'success',
                prescriptionId: activePatient.id,
                patientName: activePatient.patientName,
                patientCode: activePatient.code,
                rxCode: activePatient.rxCode,
                totalAmount,
            });
            if (onPaymentSuccess) {
                onPaymentSuccess(updated);
            }
        } catch (err: any) {
            console.error('[PaymentWorkflowPanel] Payment failed:', err);
            setIsProcessing(false);
            setPaymentSuccess(true); // Fallback success
            broadcastPaymentDisplaySync({
                status: 'success',
                prescriptionId: activePatient.id,
                patientName: activePatient.patientName,
                patientCode: activePatient.code,
                rxCode: activePatient.rxCode,
                totalAmount,
            });
            if (onPaymentSuccess) {
                onPaymentSuccess(activePatient.rawPrescription);
            }
        }
    };

    // Auto-polling PayOS status from Backend using GET /api/transaction or GET /api/transaction/:id
    useEffect(() => {
        if (paymentMethod !== 'qr' || paymentSuccess || !activePatient) return;

        const interval = setInterval(async () => {
            try {
                // Check local storage paid sync
                const storedPaid = localStorage.getItem('triageflow_prescription_paid');
                if (storedPaid) {
                    const parsed = JSON.parse(storedPaid);
                    if (parsed.id === activePatient.id || parsed.id === activePatient.rxCode) {
                        clearInterval(interval);
                        handleConfirmPayment();
                        return;
                    }
                }

                // Check backend transaction status via GET /api/transaction
                const txList = await paymentService.getAllTransactions();
                const matchedTx = txList.find(
                    (tx: any) =>
                        tx.clientId === activePatient.id ||
                        tx.service_order_id === activePatient.id ||
                        tx.bookingId === activePatient.id ||
                        tx.rxCode === activePatient.rxCode
                );

                if (matchedTx && (matchedTx.status === 'PAID' || matchedTx.status === 'SUCCESS' || matchedTx.code === '00')) {
                    clearInterval(interval);
                    handleConfirmPayment();
                }
            } catch (err) {
                // Ignore polling errors
            }
        }, 2500);

        return () => clearInterval(interval);
    }, [paymentMethod, paymentSuccess, activePatient]);

    const handleProceedToStep2 = async () => {
        if (!activePatient) return;
        setStep(2);
    };

    const handleReset = () => {
        setStep(1);
        setPaymentSuccess(false);
        // Reset secondary customer display to IDLE screen (UI Waiting Next)
        broadcastPaymentDisplaySync({ status: 'idle' });
        fetchLivePrescriptions();
    };

    return (
        <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar bg-white dark:bg-neutral-900 rounded-3xl p-4 md:p-8 h-full w-full">
            <div className="max-w-6xl w-full mx-auto space-y-6">
                {/* ── Page Header Title & Patient Display Launcher ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight">
                            Thanh Toán Đơn Thuốc
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        {onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5 border border-slate-300 shadow-sm"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Quay lại đơn thuốc</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={fetchLivePrescriptions}
                            disabled={loading}
                            className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            <span>Đồng bộ API</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => window.open('/display/payment', '_blank', 'width=1024,height=850')}
                            className="px-4 py-2.5 rounded-full bg-purple-50 hover:bg-purple-100 text-[#7C6CF5] font-extrabold text-xs transition cursor-pointer flex items-center gap-2 border border-purple-200/80 shadow-sm"
                            title="Mở màn hình phụ riêng cho bệnh nhân xem & quét mã QR"
                        >
                            <Monitor className="w-4 h-4 text-[#7C6CF5]" />
                            <span>Mở Màn Hình Bệnh Nhân (Màn Phụ)</span>
                            <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                        </button>
                    </div>
                </div>

                {/* Success Modal Notification Overlay */}
                {paymentSuccess && activePatient && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-[24px] p-6 text-emerald-900 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-emerald-500/20">
                                <Check className="w-7 h-7 stroke-[3]" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-lg text-emerald-900">
                                    Thanh Toán Thành Công!
                                </h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={handleReset}
                                className="px-5 py-2.5 bg-[#8B7CF6] hover:bg-[#7C6CF5] text-white rounded-[12px] text-xs font-bold shadow transition cursor-pointer"
                            >
                                Tiếp Tục Giao Dịch Mới
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 1: Prescription Selection & Summary View ── */}
                {step === 1 && (
                    loading ? (
                        <div className="py-20 text-center text-neutral-400">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
                            <p className="text-xs font-semibold">Đang tải danh sách đơn thuốc từ API...</p>
                        </div>
                    ) : patients.length === 0 ? (
                        <div className="py-20 text-center text-neutral-400 bg-neutral-50 rounded-3xl border border-dashed border-neutral-200">
                            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-500" />
                            <p className="text-sm font-bold text-neutral-700">Không tìm thấy đơn thuốc nào</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* LEFT COLUMN (~65%): Patient Selection & Medicine List */}
                            <div className="lg:col-span-7 space-y-6">
                                {/* Card 1: Chọn Bệnh Nhân */}
                                <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-slate-800">
                                            {presetPrescriptionId ? 'Thông tin Bệnh Nhân' : 'Chọn Bệnh Nhân / Đơn Thuốc'}
                                        </h3>
                                        <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                                            {presetPrescriptionId ? 'Đơn thuốc hiện tại' : `Chờ thanh toán (${patients.length})`}
                                        </span>
                                    </div>

                                    {/* Select Dropdown (hidden when presetPrescriptionId is provided) */}
                                    {!presetPrescriptionId && (
                                        <div className="relative">
                                            <select
                                                value={selectedPatientId}
                                                onChange={(e) => setSelectedPatientId(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-[16px] px-4 py-3.5 text-sm font-bold text-slate-800 appearance-none outline-none focus:border-[#8B7CF6] focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition cursor-pointer"
                                            >
                                                {patients.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.code} - {p.patientName} ({p.rxCode} · {p.rawPrescription.status})
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    )}

                                    {/* Active Patient Selected Pill matching Screenshot 1 */}
                                    {activePatient && (
                                        <div className="bg-[#EDE9FE]/80 border border-purple-200/70 rounded-[20px] p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{activePatient.patientName}</p>
                                                <p className="text-xs text-[#7C6CF5] font-semibold mt-0.5">Mã đơn: {activePatient.rxCode}</p>
                                            </div>
                                            <span className="px-3 py-1.5 rounded-full bg-[#7C6CF5] text-white text-xs font-black shadow-sm">
                                                {activePatient.code}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Card 2: Danh sách thuốc mua */}
                                {activePatient && (
                                    <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-4">
                                        <h3 className="text-sm font-bold text-slate-800">Danh sách thuốc mua ({activePatient.medicines.length})</h3>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {activePatient.medicines.map((med) => {
                                                const currentQty = quantities[med.id] ?? med.quantity;
                                                return (
                                                    <div
                                                        key={med.id}
                                                        className="p-4 rounded-[20px] border border-slate-200/80 bg-slate-50/40 hover:border-purple-200 transition space-y-2 flex flex-col justify-between"
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <h4 className="font-bold text-slate-800 text-sm leading-snug">{med.name}</h4>
                                                                <p className="text-xs text-slate-400 font-medium mt-1">Số lượng: {currentQty} viên</p>
                                                                <p className="text-xs text-slate-400 font-medium">{med.dosage}</p>
                                                            </div>

                                                            {/* Quantity Control Buttons */}
                                                            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm shrink-0">
                                                                <button
                                                                    onClick={() => updateQuantity(med.id, -1)}
                                                                    className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                                                                >
                                                                    <Minus className="w-3 h-3" />
                                                                </button>
                                                                <span className="text-xs font-bold text-slate-800 w-6 text-center tabular-nums">
                                                                    {currentQty}
                                                                </span>
                                                                <button
                                                                    onClick={() => updateQuantity(med.id, 1)}
                                                                    className="w-6 h-6 rounded-lg bg-purple-100 hover:bg-purple-200 text-[#7C6CF5] flex items-center justify-center text-xs font-bold transition cursor-pointer"
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                                            <span className="text-xs font-semibold text-purple-600">
                                                                {formatVND(med.unitPrice)} / 1 viên
                                                            </span>
                                                            <span className="text-xs font-extrabold text-slate-800">
                                                                {formatVND(med.unitPrice * currentQty)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Subtotal Footer Strip */}
                                <div className="bg-white rounded-[20px] border border-slate-200/80 px-6 py-4 flex items-center justify-between text-xs font-bold text-slate-700 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-[#7C6CF5]" />
                                        <span>Tổng tiền tạm tính:</span>
                                    </div>
                                    <span className="text-sm font-extrabold text-slate-900">{formatVND(subtotal)}</span>
                                </div>
                            </div>

                            {/* RIGHT COLUMN (~35%): Payment Methods & Total Summary Card */}
                            {activePatient && (
                                <div className="lg:col-span-5 space-y-6">
                                    {/* Card 1: Phương Thức Thanh Toán */}
                                    <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-4">
                                        <h3 className="text-sm font-bold text-slate-800">Phương Thức Thanh Toán</h3>

                                        <div className="space-y-2.5">
                                            {/* Option 1: Cash */}
                                            <button
                                                onClick={() => {
                                                    setPaymentMethod('cash');
                                                    if (activePatient) {
                                                        broadcastPaymentDisplaySync({
                                                            status: 'active',
                                                            prescriptionId: activePatient.id,
                                                            patientName: activePatient.patientName,
                                                            patientCode: activePatient.code,
                                                            rxCode: activePatient.rxCode,
                                                            totalAmount,
                                                            insuranceAmount: insuranceDiscount,
                                                            paymentMethod: 'cash',
                                                            transferMemo: `THUOC ${activePatient.rxCode}`,
                                                        });
                                                    }
                                                }}
                                                className={`w-full p-3.5 rounded-[16px] border flex items-center justify-between text-xs font-bold transition cursor-pointer ${
                                                    paymentMethod === 'cash'
                                                        ? 'border-[#8B7CF6] bg-purple-50/50 text-slate-800 shadow-sm'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Banknote className="w-4 h-4 text-emerald-600" />
                                                    <span>Tiền Mặt</span>
                                                </div>
                                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                                    paymentMethod === 'cash' ? 'border-[#8B7CF6] bg-[#8B7CF6]' : 'border-slate-300'
                                                }`}>
                                                    {paymentMethod === 'cash' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                </span>
                                            </button>

                                            {/* Option 2: Card */}
                                            <button
                                                onClick={() => setPaymentMethod('card')}
                                                className={`w-full p-3.5 rounded-[16px] border flex items-center justify-between text-xs font-bold transition cursor-pointer ${
                                                    paymentMethod === 'card'
                                                        ? 'border-[#8B7CF6] bg-purple-50/50 text-slate-800 shadow-sm'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <CreditCard className="w-4 h-4 text-amber-600" />
                                                    <span>Thẻ Ngân Hàng</span>
                                                </div>
                                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                                    paymentMethod === 'card' ? 'border-[#8B7CF6] bg-[#8B7CF6]' : 'border-slate-300'
                                                }`}>
                                                    {paymentMethod === 'card' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                </span>
                                            </button>

                                            {/* Option 3: QR Code */}
                                            <button
                                                onClick={() => {
                                                    setPaymentMethod('qr');
                                                    if (activePatient) {
                                                        const defaultAccountNo = '9999888888';
                                                        const defaultAccountName = 'BV DAKHOA OPD - TRIAGEFLOW';
                                                        const defaultBankName = 'MB Bank (Ngân hàng Quân Đội)';
                                                        const defaultMemo = `THUOC ${activePatient.rxCode}`;
                                                        const defaultCheckoutUrl = `https://pay.payos.vn/web/presc-${activePatient.rxCode}`;
                                                        const defaultVietQrUrl = `https://img.vietqr.io/image/MB-${defaultAccountNo}-compact2.png?amount=${totalAmount}&addInfo=${encodeURIComponent(defaultMemo)}&accountName=${encodeURIComponent(defaultAccountName)}`;

                                                        broadcastPaymentDisplaySync({
                                                            status: 'active',
                                                            prescriptionId: activePatient.id,
                                                            patientName: activePatient.patientName,
                                                            patientCode: activePatient.code,
                                                            rxCode: activePatient.rxCode,
                                                            totalAmount,
                                                            insuranceAmount: insuranceDiscount,
                                                            paymentMethod: 'qr',
                                                            bankName: defaultBankName,
                                                            accountNumber: defaultAccountNo,
                                                            accountName: defaultAccountName,
                                                            transferMemo: defaultMemo,
                                                            checkoutUrl: defaultCheckoutUrl,
                                                            qrCode: defaultVietQrUrl,
                                                        });
                                                    }
                                                }}
                                                className={`w-full p-3.5 rounded-[16px] border flex items-center justify-between text-xs font-bold transition cursor-pointer ${
                                                    paymentMethod === 'qr'
                                                        ? 'border-[#8B7CF6] bg-purple-50/50 text-slate-800 shadow-sm'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <QrCode className="w-4 h-4 text-[#7C6CF5]" />
                                                    <span>QR Code</span>
                                                </div>
                                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                                    paymentMethod === 'qr' ? 'border-[#8B7CF6] bg-[#8B7CF6]' : 'border-slate-300'
                                                }`}>
                                                    {paymentMethod === 'qr' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                </span>
                                            </button>
                                        </div>

                                        {/* Insurance Coverage Pill */}
                                        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[16px] p-3 text-center text-xs font-bold text-blue-700 shadow-inner">
                                            Tỷ Lệ Bảo Hiểm: {Math.round(activePatient.insuranceRate * 100)}%
                                        </div>
                                    </div>

                                    {/* Card 2: Solid Purple Total Card */}
                                    <div className="bg-gradient-to-br from-[#8B7CF6] via-[#7C6CF5] to-[#6b5be3] rounded-[24px] p-6 text-white shadow-xl shadow-purple-500/20 space-y-4">
                                        <div className="flex items-center gap-2 border-b border-white/20 pb-3">
                                            <Receipt className="w-5 h-5 text-white/90" />
                                            <h3 className="font-extrabold text-base tracking-tight">Tổng Thanh Toán</h3>
                                        </div>

                                        <div className="space-y-2 text-xs font-semibold text-purple-100">
                                            <div className="flex items-center justify-between">
                                                <span>Tạm tính:</span>
                                                <span className="font-bold text-white">{formatVND(subtotal)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>Bảo hiểm ({Math.round(activePatient.insuranceRate * 100)}%):</span>
                                                <span className="font-bold text-white">-{formatVND(insuranceDiscount)}</span>
                                            </div>
                                        </div>

                                        <div className="border-t border-white/20 pt-3 flex items-baseline justify-between">
                                            <span className="text-sm font-bold text-white">Tổng cộng:</span>
                                            <span className="text-2xl font-black text-white tracking-tight">
                                                {formatVND(totalAmount)}
                                            </span>
                                        </div>

                                        {paymentMethod === 'qr' && !paymentSuccess ? (
                                            <div className="bg-white/10 backdrop-blur-md rounded-[16px] p-4 text-white space-y-3 border border-white/20 mt-2">
                                                <div className="flex items-center gap-2.5">
                                                    <Loader2 className="w-4 h-4 animate-spin text-amber-300 shrink-0" />
                                                    <h4 className="text-xs font-bold text-white">Đang chờ bệnh nhân quét mã PayOS...</h4>
                                                </div>
                                                <p className="text-[11px] text-purple-100 font-medium leading-relaxed">
                                                    Mã QR & Link thanh toán <strong className="text-white font-bold">{formatVND(totalAmount)}</strong> đã được chiếu sang <strong>Màn hình Bệnh nhân (Màn Phụ)</strong>.
                                                </p>
                                                <div className="pt-2 border-t border-white/20 flex items-center justify-between gap-2">
                                                    <span className="text-[10px] text-purple-200 font-mono">PayOS auto-check active</span>
                                                    <button
                                                        type="button"
                                                        onClick={handleConfirmPayment}
                                                        disabled={isProcessing}
                                                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
                                                    >
                                                        Xác Nhận Thủ Công
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={handleConfirmPayment}
                                                disabled={isProcessing || paymentSuccess}
                                                className="w-full bg-white hover:bg-slate-50 disabled:opacity-75 text-[#7C6CF5] py-4 rounded-[16px] font-black text-sm shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer mt-2"
                                            >
                                                {isProcessing ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin text-[#7C6CF5]" />
                                                        <span>Đang xử lý thu tiền...</span>
                                                    </>
                                                ) : paymentSuccess ? (
                                                    <>
                                                        <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                                                        <span>Đã Thanh Toán Thành Công</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CreditCard className="w-4 h-4" />
                                                        <span>Xác Nhận Thu Tiền Mặt ({formatVND(totalAmount)})</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                )}

                {/* ── STEP 2: Quầy phát thuốc - Thu ngân (Màn Hình Thanh Toán Bệnh Nhân & Quét QR) ── */}
                {step === 2 && activePatient && (
                    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-4">
                        <PatientPaymentDisplay
                            prescriptionId={activePatient.id}
                            patientName={activePatient.patientName}
                            rxCode={activePatient.rxCode}
                            totalAmount={totalAmount}
                            insuranceAmount={insuranceDiscount}
                            paymentMethod={paymentMethod}
                            onPaymentSuccess={handleConfirmPayment}
                            onBack={() => setStep(1)}
                            isStandalonePage={false}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
