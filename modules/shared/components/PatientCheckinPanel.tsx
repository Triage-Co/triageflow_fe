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

interface PatientRecord {
    stt: string;
    name: string;
    rxCode: string;
    paymentStatus: 'Đã Thanh Toán' | 'Đã Xác Nhận';
    status: 'Đang Chuẩn Bị' | 'Sẵn Sàng' | 'Đang Chờ' | 'Đã Check-in';
    doctorName: string;
    waitTime: string;
    medicines: {
        name: string;
        dosage: string;
        usage: string;
        quantity: string;
    }[];
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



    const loadApiPrescriptions = async () => {
        setIsLoadingApi(true);
        try {
            const list = await pharmacyService.getPrescriptions();
            // ONLY show paid prescriptions (PROCESSING, PREPARED, DISPENSED), hiding PENDING, CANCELLED, EXPIRED
            const paidList = list.filter(
                (p) => p.status === 'PROCESSING' || p.status === 'PREPARED' || p.status === 'DISPENSED'
            );

            if (paidList && paidList.length > 0) {
                const mapped: PatientRecord[] = paidList.map((item, idx) => ({
                    stt: `P${(idx + 1).toString().padStart(3, '0')}`,
                    name: item.patient_name || 'Bệnh nhân',
                    rxCode: item.prescription_code,
                    paymentStatus: 'Đã Thanh Toán',
                    status: item.status === 'PREPARED' ? 'Sẵn Sàng' : item.status === 'PROCESSING' ? 'Đang Chuẩn Bị' : 'Đã Check-in',
                    doctorName: item.prescribed_by_name || 'BS. Thăm Khám',
                    waitTime: `${Math.max(5, (idx + 1) * 5)} phút`,
                    medicines: item.prescriptionDetails?.map((d) => ({
                        name: d.medicine?.medicine_name || 'Thuốc kê đơn',
                        dosage: `Liều lượng: ${d.quantity} ${d.medicine?.unit || 'Viên'}`,
                        usage: `Hướng dẫn: ${d.dosage_instruction || 'Dùng theo chỉ định'}`,
                        quantity: `${d.quantity} ${d.medicine?.unit || 'Viên'}`
                    })) || []
                }));
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
            if (patientList.length > 0) {
                const found = patientList[0];
                setSelectedPatientForModal(found);
            }
        } finally {
            setIsScanning(false);
        }
    };

    const handleManualSearch = async () => {
        if (!searchCode.trim()) return;
        setIsScanning(true);
        try {
            const rx = await pharmacyService.scanPrescription(searchCode.trim());
            if (rx) {
                const record: PatientRecord = {
                    stt: `P-SCAN`,
                    name: rx.patient_name || 'Bệnh nhân',
                    rxCode: rx.prescription_code,
                    paymentStatus: 'Đã Thanh Toán',
                    status: rx.status === 'PREPARED' ? 'Sẵn Sàng' : rx.status === 'PROCESSING' ? 'Đang Chuẩn Bị' : 'Đã Check-in',
                    doctorName: rx.prescribed_by_name || 'BS. Thăm Khám',
                    waitTime: 'Vừa tiếp nhận',
                    medicines: rx.prescriptionDetails?.map((d) => ({
                        name: d.medicine?.medicine_name || 'Thuốc kê đơn',
                        dosage: `Liều lượng: ${d.quantity} ${d.medicine?.unit || 'Viên'}`,
                        usage: `Hướng dẫn: ${d.dosage_instruction || 'Dùng theo chỉ định'}`,
                        quantity: `${d.quantity} ${d.medicine?.unit || 'Viên'}`
                    })) || []
                };
                setSelectedPatientForModal(record);
            }
        } catch (e) {
            console.error('[PatientCheckinPanel] Scan error:', e);
        } finally {
            setIsScanning(false);
        }
    };

    const handleReadyToDeliver = async () => {
        if (!selectedPatientForModal) return;

        try {
            // CALL REAL BACKEND API ENDPOINT
            await pharmacyService.preparePrescription(selectedPatientForModal.rxCode);

            setPatientList((prev) =>
                prev.map((p) =>
                    p.rxCode === selectedPatientForModal.rxCode || p.stt === selectedPatientForModal.stt
                        ? { ...p, status: 'Sẵn Sàng' }
                        : p
                )
            );

            setToastMessage(`Đã cập nhật đơn thuốc ${selectedPatientForModal.rxCode} sang trạng thái Sẵn Sàng Giao Thuốc!`);
            setSelectedPatientForModal(null);
            setTimeout(() => setToastMessage(null), 3500);
        } catch (err: any) {
            console.error('[PatientCheckinPanel] Prepare API error:', err);
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
                        <div className="flex-1 flex flex-col justify-between overflow-y-auto space-y-6">
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
                            <div className="bg-[#F5F3FF] rounded-[20px] p-4 flex items-center justify-between border border-purple-100 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-2xl bg-[#8B7CF6] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-extrabold text-slate-900 text-base">{selectedPatientForModal.name}</p>
                                        <p className="text-xs text-slate-500 font-semibold">Mã STT: {selectedPatientForModal.stt}</p>
                                    </div>
                                </div>

                                <div className="text-right">
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

                            {/* Section Title: Danh Sách Thuốc */}
                            <div className="space-y-3 flex-1 overflow-y-auto">
                                <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-[#7C6CF5]" />
                                    <h4 className="font-extrabold text-slate-800 text-xs">Danh Sách Thuốc Kê Đơn ({selectedPatientForModal.medicines.length} loại)</h4>
                                </div>

                                <div className="space-y-2.5">
                                    {selectedPatientForModal.medicines.map((med, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3.5 rounded-[16px] border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3"
                                        >
                                            <div>
                                                <p className="font-extrabold text-slate-800 text-xs">{med.name}</p>
                                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{med.dosage}</p>
                                                <p className="text-[11px] text-slate-600 font-bold">{med.usage}</p>
                                            </div>

                                            <span className="px-3 py-1.5 rounded-full bg-purple-100 text-[#7C6CF5] font-extrabold text-xs shrink-0">
                                                {med.quantity}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bottom Primary Button */}
                            <button
                                onClick={handleReadyToDeliver}
                                className="w-full py-4 rounded-[20px] bg-[#7C6CF5] hover:bg-[#6b5be3] text-white font-extrabold text-sm shadow-lg shadow-purple-500/25 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shrink-0"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                <span>Xác Nhận Sẵn Sàng Giao Thuốc</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
