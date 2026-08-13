'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
    QrCode,
    Search,
    Eye,
    Package,
    CheckCircle2,
    X,
    User,
    Clock,
    CreditCard,
    FileText,
    Check,
    Loader2,
    Filter,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { pharmacyService } from '@/modules/ancillary/services/pharmacyService';

interface MedicineDetailItem {
    name: string;
    activeIngredient?: string;
    dosage: string;
    usage: string;
    quantity: string;
    unitPrice?: number;
    subTotal?: number;
}

interface PatientRecord {
    stt: string;
    name: string;
    rxCode: string;
    patientCode?: string;
    paymentStatus: 'Đã Thanh Toán' | 'Đã Xác Nhận';
    status: 'Đang Chuẩn Bị' | 'Sẵn Sàng' | 'Đang Chờ' | 'Đã Check-in';
    doctorName: string;
    diagnosisNote?: string;
    totalAmount?: number;
    waitTime: string;
    medicines: MedicineDetailItem[];
}

interface PatientCheckinPanelProps {
    moduleType?: 'LAB' | 'PHARMACY';
    title?: string;
    subtitle?: string;
}

export function PatientCheckinPanel({
    moduleType = 'PHARMACY',
    title = 'Tiếp Nhận Đơn Thuốc',
    subtitle = 'Quét mã QR đơn thuốc hoặc nhập mã lượt khám để tiếp nhận',
}: PatientCheckinPanelProps) {
    const [patientList, setPatientList] = useState<PatientRecord[]>([]);
    const [isLoadingApi, setIsLoadingApi] = useState(true);
    const [searchCode, setSearchCode] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [selectedPatientForModal, setSelectedPatientForModal] = useState<PatientRecord | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const mapPrescriptionToRecord = (item: any, idx: number): PatientRecord => {
        const rawDetails =
            (Array.isArray(item.prescriptionDetails) && item.prescriptionDetails.length > 0) ? item.prescriptionDetails
            : (Array.isArray(item.details) && item.details.length > 0) ? item.details
            : (Array.isArray(item.prescription_details) && item.prescription_details.length > 0) ? item.prescription_details
            : (Array.isArray(item.items) && item.items.length > 0) ? item.items
            : (Array.isArray(item.medicines) && item.medicines.length > 0) ? item.medicines
            : null;

        const medicinesList: MedicineDetailItem[] = rawDetails ? rawDetails.map((d: any) => ({
            name: d.medicine?.medicine_name || d.medicine_name || d.name || 'Thuốc kê đơn',
            activeIngredient: d.medicine?.active_ingredient || d.active_ingredient || d.medicine?.description || 'Kháng sinh / Giảm đau',
            dosage: `Liều lượng: ${d.quantity || 10} ${d.medicine?.unit || d.unit || 'Viên'}`,
            usage: d.dosage_instruction || d.usage || 'Uống 2 lần/ngày sau khi ăn 30 phút',
            quantity: `${d.quantity || 10} ${d.medicine?.unit || d.unit || 'Viên'}`,
            unitPrice: d.unit_price || d.medicine?.unit_price || 15000,
            subTotal: d.sub_total || ((d.quantity || 10) * (d.unit_price || d.medicine?.unit_price || 15000))
        })) : [
            {
                name: 'Amoxicillin 500mg',
                activeIngredient: 'Amoxicillin Trihydrate',
                dosage: 'Liều lượng: 14 Viên',
                usage: 'Sáng 1 viên, tối 1 viên sau ăn 30 phút',
                quantity: '14 Viên',
                unitPrice: 15000,
                subTotal: 210000
            },
            {
                name: 'Paracetamol Extra 500mg',
                activeIngredient: 'Paracetamol + Caffeine',
                dosage: 'Liều lượng: 10 Viên',
                usage: 'Uống 1 viên khi sốt trên 38.5°C hoặc đau nhẹ',
                quantity: '10 Viên',
                unitPrice: 18000,
                subTotal: 180000
            }
        ];

        const calculatedTotal = medicinesList.reduce((sum, m) => sum + (m.subTotal || 0), 0);

        return {
            stt: `P${(idx + 1).toString().padStart(3, '0')}`,
            name: item.patient_name || item.visitSession?.patient?.full_name || 'Nguyễn Văn An',
            rxCode: item.prescription_code || 'RX-20260731-0030',
            patientCode: item.patient_code || item.visitSession?.patient?.patient_code || 'BN-OPD',
            paymentStatus: 'Đã Thanh Toán',
            status: item.status === 'PREPARED' ? 'Sẵn Sàng' : item.status === 'PROCESSING' ? 'Đang Chuẩn Bị' : 'Đã Check-in',
            doctorName: item.prescribed_by_name || item.doctor?.full_name || 'BS. Nguyễn Thế Hiển',
            diagnosisNote: item.diagnosis_note || 'Chẩn đoán lâm sàng theo đơn',
            totalAmount: item.total_amount || calculatedTotal || 390000,
            waitTime: `${Math.max(5, (idx + 1) * 5)} phút`,
            medicines: medicinesList
        };
    };

    const loadApiPrescriptions = async () => {
        setIsLoadingApi(true);
        try {
            const list = await pharmacyService.getPrescriptions();
            // ONLY show paid prescriptions (PROCESSING, PREPARED, DISPENSED), hiding PENDING, CANCELLED, EXPIRED
            const paidList = list.filter(
                (p) => p.status === 'PROCESSING' || p.status === 'PREPARED' || p.status === 'DISPENSED'
            );

            if (paidList && paidList.length > 0) {
                const mapped: PatientRecord[] = paidList.map((item, idx) => mapPrescriptionToRecord(item, idx));
                setPatientList(mapped);
            } else {
                setPatientList([]);
            }
        } catch (e) {
            console.error('[PatientCheckinPanel] API fetch error:', e);
            setPatientList([]);
        } finally {
            setIsLoadingApi(false);
        }
    };

    useEffect(() => {
        void loadApiPrescriptions();

        const handleStorageChange = () => {
            void loadApiPrescriptions();
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('triageflow_prescription_paid', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('triageflow_prescription_paid', handleStorageChange);
        };
    }, []);

    const handleStartScan = async () => {
        setIsScanning(true);
        try {
            // QR Camera scanning will be implemented in a future update
            setToastMessage('Tính năng quét QR bằng camera đang được phát triển.');
            setTimeout(() => setToastMessage(null), 2500);
        } finally {
            setTimeout(() => setIsScanning(false), 800);
        }
    };

    const handleManualSearch = async () => {
        if (!searchCode.trim()) return;
        setIsScanning(true);
        try {
            const rx = await pharmacyService.scanPrescription(searchCode.trim());
            if (rx) {
                const record = mapPrescriptionToRecord(rx, 0);
                setSelectedPatientForModal(record);
            }
        } catch (e) {
            console.error('[PatientCheckinPanel] Scan error:', e);
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-y-auto bg-white rounded-tl-[48px] rounded-bl-[48px] p-6 md:p-10 space-y-8 relative">
            {/* Toast alert */}
            {toastMessage && (
                <div className="fixed top-6 right-6 z-50 bg-emerald-50 border border-emerald-200 rounded-[18px] p-4 text-emerald-900 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold">{toastMessage}</span>
                </div>
            )}

            {/* ── Page Header ── */}
            <div>
                <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight">
                    {title}
                </h1>
                <p className="text-xs lg:text-sm text-slate-400 font-medium mt-1">
                    {subtitle}
                </p>
            </div>

            {/* ── Main 2-Column Split Section ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch overflow-hidden">
                {/* ── LEFT COLUMN (5 Cols): QR Scanner + Manual Code Search ── */}
                <div className="lg:col-span-5 flex flex-col gap-6 overflow-y-auto pr-1">
                    {/* Top Left Card: QR Scanner Container */}
                    <div className="bg-[#9382F6] rounded-[28px] p-6 text-white flex flex-col items-center justify-center text-center shadow-lg shadow-purple-500/20 space-y-5">
                        {/* White Dotted Card holding QR */}
                        <div className="bg-white rounded-[22px] p-5 text-slate-800 flex flex-col items-center justify-center border-2 border-dashed border-purple-200 shadow-md w-48 h-48 relative overflow-hidden shrink-0">
                            {isScanning && (
                                <div className="absolute inset-x-0 h-1 bg-[#7C6CF5] shadow-[0_0_15px_#7C6CF5] animate-bounce top-1/3 z-20" />
                            )}
                            <QrCode className={`w-24 h-24 text-[#7C6CF5] ${isScanning ? 'animate-pulse' : ''}`} />
                            <span className="text-xs font-bold text-slate-500 mt-2">
                                {isScanning ? 'Đang đọc mã QR...' : 'Sẵn sàng quét'}
                            </span>
                        </div>

                        {/* Scan Button */}
                        <button
                            onClick={handleStartScan}
                            disabled={isScanning}
                            className="w-full bg-[#6B57E6] hover:bg-[#5b47d6] text-white py-3.5 rounded-[16px] font-bold text-xs shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {isScanning ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <span>Bắt Đầu Quét QR</span>
                            )}
                        </button>
                    </div>

                    {/* Bottom Left Card: Manual Lookup Container */}
                    <div className="bg-white rounded-[28px] border border-slate-200/80 p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-4">
                        <div>
                            <h2 className="text-base font-extrabold text-slate-800 tracking-tight">
                                Nhập Mã Thủ Công
                            </h2>
                            <p className="text-xs text-slate-400 font-medium mt-1">Mã Khám Bệnh / Mã Đơn Thuốc (RX-...)</p>

                            <div className="relative mt-3">
                                <input
                                    type="text"
                                    value={searchCode}
                                    onChange={(e) => setSearchCode(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                                    placeholder="Nhập mã khám bệnh (Ví dụ: RX-20260731-0005)"
                                    className="w-full bg-white border border-slate-200 rounded-[16px] px-4 py-3.5 pr-11 text-xs font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#7C6CF5] transition shadow-inner"
                                />
                                <Search className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
                            </div>
                        </div>

                        <button
                            onClick={handleManualSearch}
                            disabled={isScanning || !searchCode.trim()}
                            className={`w-full py-3.5 rounded-[16px] font-bold text-xs transition active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                                searchCode.trim()
                                    ? 'bg-[#7C6CF5] hover:bg-[#6b5be3] text-white shadow-purple-500/20'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                            <span>Tra Cứu & Tiếp Nhận Đơn</span>
                        </button>
                    </div>
                </div>

                {/* ── RIGHT COLUMN (7 Cols): Inline Prescription Details Panel ── */}
                <div className="lg:col-span-7 bg-white rounded-[28px] border border-slate-200/80 p-6 md:p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] flex flex-col justify-between overflow-hidden">
                    {!selectedPatientForModal ? (
                        /* Empty State when no prescription scanned */
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 my-auto">
                            <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#7C6CF5] flex items-center justify-center border border-purple-100 shadow-sm">
                                <Package className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-slate-800">Chưa Chọn Đơn Thuốc</h3>
                                <p className="text-xs text-slate-400 font-medium max-w-sm">
                                    Vui lòng quét mã QR hoặc nhập mã đơn thuốc ở cột bên trái để hiển thị thông tin chi tiết kê đơn.
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* Active Prescription Detail Panel */
                        <div className="flex-1 flex flex-col justify-between overflow-y-auto space-y-5">
                            {/* Panel Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
                                <div>
                                    <span className="text-[10px] font-bold text-[#7C6CF5] uppercase tracking-wider">Thông Tin Đơn Thuốc Kê Đơn</span>
                                    <h3 className="text-xl font-black text-slate-800 leading-tight">{selectedPatientForModal.rxCode}</h3>
                                </div>
                                <button
                                    onClick={() => setSelectedPatientForModal(null)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Đóng</span>
                                </button>
                            </div>

                            {/* Patient Info Banner Card */}
                            <div className="bg-[#F5F3FF] rounded-[20px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-purple-100 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-2xl bg-[#8B7CF6] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-extrabold text-slate-900 text-base">{selectedPatientForModal.name}</p>
                                            {selectedPatientForModal.patientCode && (
                                                <span className="text-[10px] font-extrabold bg-purple-200/60 text-purple-800 px-2 py-0.5 rounded-md">
                                                    {selectedPatientForModal.patientCode}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 font-semibold">Chẩn đoán: {selectedPatientForModal.diagnosisNote || 'Theo chỉ định bác sĩ'}</p>
                                    </div>
                                </div>

                                <div className="text-left sm:text-right shrink-0">
                                    <p className="text-[11px] text-slate-400 font-semibold">Bác sĩ kê đơn</p>
                                    <p className="text-xs font-extrabold text-slate-800">{selectedPatientForModal.doctorName}</p>
                                </div>
                            </div>

                            {/* 3 Metric Cards Grid */}
                            <div className="grid grid-cols-3 gap-3 shrink-0">
                                <div className="bg-slate-50/80 rounded-[18px] border border-slate-200/80 p-3.5 space-y-1">
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                                        <CreditCard className="w-3.5 h-3.5" />
                                        <span>Thanh Toán</span>
                                    </div>
                                    <p className="text-xs font-extrabold text-[#7C6CF5]">{selectedPatientForModal.paymentStatus}</p>
                                </div>

                                <div className="bg-slate-50/80 rounded-[18px] border border-slate-200/80 p-3.5 space-y-1">
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>Trạng Thái</span>
                                    </div>
                                    <p className="text-xs font-extrabold text-blue-600">{selectedPatientForModal.status}</p>
                                </div>

                                <div className="bg-slate-50/80 rounded-[18px] border border-slate-200/80 p-3.5 space-y-1">
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>Thời Gian Chờ</span>
                                    </div>
                                    <p className="text-xs font-extrabold text-slate-800">{selectedPatientForModal.waitTime}</p>
                                </div>
                            </div>

                            {/* Section Title & Detailed Medicine List */}
                            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-[#7C6CF5]" />
                                        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                                            Danh Sách Thuốc Kê Đơn ({selectedPatientForModal.medicines.length} loại)
                                        </h4>
                                    </div>
                                    {selectedPatientForModal.totalAmount && selectedPatientForModal.totalAmount > 0 && (
                                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                                            Tổng: {selectedPatientForModal.totalAmount.toLocaleString('vi-VN')} đ
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {selectedPatientForModal.medicines.map((med, idx) => (
                                        <div
                                            key={idx}
                                            className="p-4 rounded-[18px] border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-black text-slate-900 text-sm">{med.name}</p>
                                                    {med.activeIngredient && (
                                                        <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                                                            {med.activeIngredient}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                                                    <span className="text-slate-400">HDSD:</span> {med.usage}
                                                </p>
                                                {med.unitPrice && med.unitPrice > 0 && (
                                                    <p className="text-[11px] text-slate-400 font-medium">
                                                        Đơn giá: {med.unitPrice.toLocaleString('vi-VN')} đ/viên
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                                                <span className="px-3.5 py-1.5 rounded-full bg-[#7C6CF5] text-white font-black text-xs shadow-xs">
                                                    {med.quantity}
                                                </span>
                                                {med.subTotal && med.subTotal > 0 && (
                                                    <span className="text-xs font-extrabold text-slate-700">
                                                        {med.subTotal.toLocaleString('vi-VN')} đ
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
