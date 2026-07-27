'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

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
}

const MOCK_PATIENTS: PatientRx[] = [
    {
        id: 'P001',
        code: 'P001',
        rxCode: 'RX-2024-001',
        patientName: 'Nguyễn Văn An',
        insuranceRate: 0.8,
        medicines: [
            { id: 'm1', name: 'Amoxicillin 500mg', dosage: '500mg', unitPrice: 2500, quantity: 50, stock: 50 },
            { id: 'm2', name: 'Paracetamol 500mg', dosage: '500mg', unitPrice: 2500, quantity: 50, stock: 50 },
            { id: 'm3', name: 'Vitamin C 1000mg', dosage: '1000mg', unitPrice: 2500, quantity: 50, stock: 50 },
            { id: 'm4', name: 'Ibuprofen 400mg', dosage: '400mg', unitPrice: 2500, quantity: 50, stock: 50 },
        ],
    },
    {
        id: 'P002',
        code: 'P002',
        rxCode: 'RX-2024-002',
        patientName: 'Trần Thị Mai',
        insuranceRate: 0.8,
        medicines: [
            { id: 'm5', name: 'Nexium Mups 40mg', dosage: '40mg', unitPrice: 12000, quantity: 14, stock: 14 },
            { id: 'm6', name: 'Gaviscon Dual Action', dosage: '10ml', unitPrice: 8500, quantity: 20, stock: 20 },
        ],
    },
    {
        id: 'P003',
        code: 'P003',
        rxCode: 'RX-2024-003',
        patientName: 'Phạm Minh Đức',
        insuranceRate: 0.8,
        medicines: [
            { id: 'm7', name: 'Amlodipine 5mg', dosage: '5mg', unitPrice: 3000, quantity: 30, stock: 30 },
            { id: 'm8', name: 'Metformin 850mg', dosage: '850mg', unitPrice: 4500, quantity: 60, stock: 60 },
        ],
    },
];

export function PaymentWorkflowPanel() {
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedPatientId, setSelectedPatientId] = useState<string>('P001');
    const [paymentMethod, setPaymentMethod] = useState<'qr' | 'card' | 'cash'>('qr');
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    // Current selected patient data
    const activePatient = MOCK_PATIENTS.find((p) => p.id === selectedPatientId) || MOCK_PATIENTS[0];

    // Local mutable state for medicine quantities
    const [quantities, setQuantities] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        MOCK_PATIENTS.forEach((p) => {
            p.medicines.forEach((m) => {
                initial[m.id] = m.quantity;
            });
        });
        return initial;
    });

    const updateQuantity = (id: string, delta: number) => {
        setQuantities((prev) => {
            const current = prev[id] || 0;
            const updated = Math.max(1, current + delta);
            return { ...prev, [id]: updated };
        });
    };

    // Calculate totals
    const subtotal = activePatient.medicines.reduce((sum, med) => {
        const qty = quantities[med.id] ?? med.quantity;
        return sum + med.unitPrice * qty;
    }, 0);

    const insuranceDiscount = Math.round(subtotal * activePatient.insuranceRate);
    const totalAmount = Math.max(0, subtotal - insuranceDiscount);

    // Format currency VND
    const formatVND = (amount: number) => {
        return amount.toLocaleString('vi-VN') + ' đ';
    };

    const handleProceedToStep2 = () => {
        setStep(2);
    };

    const handleConfirmPayment = () => {
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            setPaymentSuccess(true);
        }, 1200);
    };

    const handleReset = () => {
        setStep(1);
        setPaymentSuccess(false);
    };

    return (
        <div className="flex-1 flex flex-col overflow-y-auto bg-white rounded-tl-[48px] rounded-bl-[48px] p-6 md:p-10">
            <div className="max-w-6xl w-full mx-auto space-y-6">
                {/* ── Page Header Title ── */}
                <div>
                    <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight">
                        Thanh Toán
                    </h1>
                    <p className="text-xs lg:text-sm text-slate-400 font-medium mt-1">
                        {step === 1 ? 'Quản lý thanh toán đơn thuốc' : 'Quầy phát thuốc - Thu ngân'}
                    </p>
                </div>

                {/* Success Modal Notification Overlay */}
                {paymentSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-[24px] p-6 text-emerald-900 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-emerald-500/20">
                                <Check className="w-7 h-7 stroke-[3]" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-lg text-emerald-900">
                                    Thanh Toán Thành Công!
                                </h3>
                                <p className="text-xs text-emerald-700 font-medium mt-0.5">
                                    Đã xác nhận thanh toán đơn thuốc cho bệnh nhân <span className="font-bold">{activePatient.patientName}</span> ({activePatient.rxCode}). Hóa đơn điện tử đã lưu vào EMR.
                                </p>
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
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* LEFT COLUMN (~65%): Patient Selection & Medicine List */}
                        <div className="lg:col-span-7 space-y-6">
                            {/* Card 1: Chọn Bệnh Nhân */}
                            <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-4">
                                <h3 className="text-sm font-bold text-slate-800">Chọn Bệnh Nhân</h3>

                                {/* Select Dropdown */}
                                <div className="relative">
                                    <select
                                        value={selectedPatientId}
                                        onChange={(e) => setSelectedPatientId(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-[16px] px-4 py-3.5 text-sm font-bold text-slate-800 appearance-none outline-none focus:border-[#8B7CF6] focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition cursor-pointer"
                                    >
                                        {MOCK_PATIENTS.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.code} - {p.patientName} ({p.rxCode})
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>

                                {/* Active Patient Selected Pill matching Screenshot 1 */}
                                <div className="bg-[#EDE9FE]/80 border border-purple-200/70 rounded-[20px] p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{activePatient.patientName}</p>
                                        <p className="text-xs text-[#7C6CF5] font-semibold mt-0.5">Mã: {activePatient.rxCode}</p>
                                    </div>
                                    <span className="px-3 py-1.5 rounded-full bg-[#7C6CF5] text-white text-xs font-black shadow-sm">
                                        {activePatient.code}
                                    </span>
                                </div>
                            </div>

                            {/* Card 2: Danh sách thuốc mua */}
                            <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-4">
                                <h3 className="text-sm font-bold text-slate-800">Danh sách thuốc mua</h3>

                                {/* 2x2 Grid matching Screenshot 1 */}
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
                                                        <p className="text-xs text-slate-400 font-medium mt-1">Số lượng: {med.stock} viên</p>
                                                        <p className="text-xs text-slate-400 font-medium">{med.dosage}</p>
                                                    </div>

                                                    {/* Quantity Control Buttons */}
                                                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm shrink-0">
                                                        <button
                                                            onClick={() => updateQuantity(med.id, -1)}
                                                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition"
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="text-xs font-bold text-slate-800 w-6 text-center tabular-nums">
                                                            {currentQty}
                                                        </span>
                                                        <button
                                                            onClick={() => updateQuantity(med.id, 1)}
                                                            className="w-6 h-6 rounded-lg bg-purple-100 hover:bg-purple-200 text-[#7C6CF5] flex items-center justify-center text-xs font-bold transition"
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
                        <div className="lg:col-span-5 space-y-6">
                            {/* Card 1: Phương Thức Thanh Toán */}
                            <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-4">
                                <h3 className="text-sm font-bold text-slate-800">Phương Thức Thanh Toán</h3>

                                <div className="space-y-2.5">
                                    {/* Option 1: Cash */}
                                    <button
                                        onClick={() => setPaymentMethod('cash')}
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
                                        onClick={() => setPaymentMethod('qr')}
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

                                {/* Insurance Coverage Pill matching Screenshot 1 */}
                                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[16px] p-3 text-center text-xs font-bold text-blue-700 shadow-inner">
                                    Tỷ Lệ Bảo Hiểm: {Math.round(activePatient.insuranceRate * 100)}%
                                </div>
                            </div>

                            {/* Card 2: Solid Purple Total Card matching Screenshot 1 */}
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

                                <button
                                    onClick={handleProceedToStep2}
                                    className="w-full bg-white hover:bg-slate-50 text-[#7C6CF5] py-4 rounded-[16px] font-black text-sm shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer mt-2"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    <span>Thanh Toán</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: Quầy phát thuốc - Thu ngân (QR Confirmation Screen) ── */}
                {step === 2 && (
                    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4">
                        {/* Top Total Amount Banner matching Screenshot 2 */}
                        <div className="bg-[#EDE9FE]/90 border border-purple-200/80 rounded-[24px] p-6 text-center shadow-sm space-y-1">
                            <p className="text-xs font-semibold text-purple-600">Tổng tiền cần thanh toán</p>
                            <p className="text-3xl lg:text-4xl font-black text-[#7C6CF5] tracking-tight">
                                {formatVND(totalAmount)}
                            </p>
                            <p className="text-xs font-semibold text-purple-600">
                                BHYT chi trả: {formatVND(insuranceDiscount)}
                            </p>
                        </div>

                        {/* Payment Method Selector Grid matching Screenshot 2 */}
                        <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-4">
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Chọn phương thức thanh toán
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Card 1: QR Code */}
                                <button
                                    onClick={() => setPaymentMethod('qr')}
                                    className={`p-4 rounded-[20px] border text-center transition cursor-pointer flex flex-col items-center justify-between min-h-[120px] ${
                                        paymentMethod === 'qr'
                                            ? 'border-2 border-[#8B7CF6] bg-purple-50/40 shadow-md'
                                            : 'border-slate-200 bg-white hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#7C6CF5] flex items-center justify-center font-bold mb-2">
                                        <QrCode className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-xs">QR / Chuyển khoản</p>
                                        <p className="text-[10px] text-slate-400 font-medium">VietQR, Momo, ZaloPay</p>
                                    </div>
                                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center mt-2 ${
                                        paymentMethod === 'qr' ? 'border-[#8B7CF6] bg-[#8B7CF6]' : 'border-slate-300'
                                    }`}>
                                        {paymentMethod === 'qr' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </span>
                                </button>

                                {/* Card 2: Card */}
                                <button
                                    onClick={() => setPaymentMethod('card')}
                                    className={`p-4 rounded-[20px] border text-center transition cursor-pointer flex flex-col items-center justify-between min-h-[120px] ${
                                        paymentMethod === 'card'
                                            ? 'border-2 border-amber-500 bg-amber-50/40 shadow-md'
                                            : 'border-amber-200/80 bg-amber-50/20 hover:bg-amber-50/40'
                                    }`}
                                >
                                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold mb-2">
                                        <CreditCard className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-xs">Thẻ ngân hàng</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Visa, Mastercard, Napas</p>
                                    </div>
                                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center mt-2 ${
                                        paymentMethod === 'card' ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
                                    }`}>
                                        {paymentMethod === 'card' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </span>
                                </button>

                                {/* Card 3: Cash */}
                                <button
                                    onClick={() => setPaymentMethod('cash')}
                                    className={`p-4 rounded-[20px] border text-center transition cursor-pointer flex flex-col items-center justify-between min-h-[120px] ${
                                        paymentMethod === 'cash'
                                            ? 'border-2 border-emerald-500 bg-emerald-50/40 shadow-md'
                                            : 'border-emerald-200/80 bg-emerald-50/20 hover:bg-emerald-50/40'
                                    }`}
                                >
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold mb-2">
                                        <Banknote className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-xs">Tiền mặt</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Thu trực tiếp tại quầy</p>
                                    </div>
                                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center mt-2 ${
                                        paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                                    }`}>
                                        {paymentMethod === 'cash' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Center Display Container matching Screenshot 2 */}
                        <div className="bg-white rounded-[24px] border border-slate-200/80 p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] flex flex-col items-center text-center space-y-4">
                            {/* Graphic Box */}
                            <div className="relative bg-slate-50 rounded-[20px] p-6 border border-slate-200/70 flex items-center justify-center w-48 h-48 shadow-inner">
                                <QrCode className="w-32 h-32 text-slate-800" />
                                <div className="absolute bottom-2 right-2 w-7 h-7 rounded-xl bg-[#7C6CF5] text-white flex items-center justify-center font-bold text-xs shadow">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                            </div>

                            <div>
                                <h4 className="font-extrabold text-slate-800 text-base">
                                    {paymentMethod === 'qr' ? 'Quét mã QR để thanh toán' : paymentMethod === 'card' ? 'Quẹt thẻ tại thiết bị POS' : 'Thu tiền mặt tại quầy'}
                                </h4>
                                <p className="text-xs text-slate-400 font-medium mt-1">
                                    Hiển thị mã QR cho bệnh nhân quét qua ứng dụng ngân hàng
                                </p>
                            </div>

                            <p className="text-xs font-bold text-emerald-600 flex items-center justify-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                Đang chờ thanh toán...
                            </p>

                            {/* Supported Apps Strip */}
                            <div className="w-full bg-[#F3F4F6] text-[#7C6CF5] py-3 px-4 rounded-[16px] text-xs font-bold border border-purple-100">
                                Hỗ trợ: VietQR, Momo, ZaloPay, VNPay, các app ngân hàng
                            </div>
                        </div>

                        {/* Bottom Footer Actions matching Screenshot 2 */}
                        <div className="flex items-center justify-between gap-4 pt-2">
                            <button
                                onClick={() => setStep(1)}
                                className="px-6 py-3.5 rounded-[14px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Quay lại</span>
                            </button>

                            <button
                                onClick={handleConfirmPayment}
                                disabled={isProcessing}
                                className="px-8 py-3.5 rounded-[14px] bg-[#8B7CF6] hover:bg-[#7C6CF5] text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition active:scale-[0.98] flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Đang xử lý...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Xác nhận thanh toán</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
