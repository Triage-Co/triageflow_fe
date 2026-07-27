'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

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

const INITIAL_PATIENT_LIST: PatientRecord[] = [
    {
        stt: 'P001',
        name: 'Nguyễn Văn An',
        rxCode: 'RX-2024-001',
        paymentStatus: 'Đã Thanh Toán',
        status: 'Đang Chuẩn Bị',
        doctorName: 'BS. Trần Thị B',
        waitTime: '15 phút',
        medicines: [
            { name: 'Amoxicillin 500mg', dosage: 'Liều lượng: 500mg', usage: 'Hướng dẫn: Uống 2 lần/ngày sau ăn', quantity: '20 viên' },
            { name: 'Paracetamol 500mg', dosage: 'Liều lượng: 500mg', usage: 'Hướng dẫn: Uống 1 viên khi sốt > 38.5°C', quantity: '20 viên' },
            { name: 'Vitamin C 500mg', dosage: 'Liều lượng: 500mg', usage: 'Hướng dẫn: Uống 1 viên/ngày sáng', quantity: '20 viên' },
        ],
    },
    {
        stt: 'P002',
        name: 'Trần Thị Mai',
        rxCode: 'RX-2024-002',
        paymentStatus: 'Đã Xác Nhận',
        status: 'Sẵn Sàng',
        doctorName: 'BS. Nguyễn Văn A',
        waitTime: '10 phút',
        medicines: [
            { name: 'Nexium Mups 40mg', dosage: 'Liều lượng: 40mg', usage: 'Hướng dẫn: Uống trước ăn sáng 30 phút', quantity: '14 viên' },
            { name: 'Gaviscon Dual Action', dosage: 'Liều lượng: 10ml', usage: 'Hướng dẫn: Uống 1 gói sau ăn 1 tiếng', quantity: '20 gói' },
        ],
    },
    {
        stt: 'P003',
        name: 'Phạm Văn Đức',
        rxCode: 'RX-2024-003',
        paymentStatus: 'Đã Thanh Toán',
        status: 'Đang Chờ',
        doctorName: 'BS. Lê Văn C',
        waitTime: '20 phút',
        medicines: [
            { name: 'Amlodipine 5mg', dosage: 'Liều lượng: 5mg', usage: 'Hướng dẫn: Uống 1 viên vào buổi sáng', quantity: '30 viên' },
        ],
    },
    {
        stt: 'E001',
        name: 'Lê Thị Hương',
        rxCode: 'RX-2024-004',
        paymentStatus: 'Đã Xác Nhận',
        status: 'Đã Check-in',
        doctorName: 'BS. Phạm Thị D',
        waitTime: '5 phút',
        medicines: [
            { name: 'Ibuprofen 400mg', dosage: 'Liều lượng: 400mg', usage: 'Hướng dẫn: Uống 1 viên sau ăn', quantity: '10 viên' },
        ],
    },
    {
        stt: 'D001',
        name: 'Nguyễn Thành Trung',
        rxCode: 'RX-2026-004',
        paymentStatus: 'Đã Xác Nhận',
        status: 'Đã Check-in',
        doctorName: 'BS. Hoàn Văn E',
        waitTime: '8 phút',
        medicines: [
            { name: 'Paracetamol 500mg', dosage: 'Liều lượng: 500mg', usage: 'Hướng dẫn: Uống 1 viên khi đau', quantity: '10 viên' },
        ],
    },
];

interface PatientCheckinPanelProps {
    moduleType?: 'LAB' | 'PHARMACY';
    title?: string;
    subtitle?: string;
}

export function PatientCheckinPanel({
    moduleType = 'PHARMACY',
    title = 'Check-in Bệnh Nhân',
    subtitle = 'Quét mã QR hoặc nhập mã khám bệnh',
}: PatientCheckinPanelProps) {
    const [patientList, setPatientList] = useState<PatientRecord[]>(INITIAL_PATIENT_LIST);
    const [searchCode, setSearchCode] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [selectedPatientForModal, setSelectedPatientForModal] = useState<PatientRecord | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const handleStartScan = () => {
        setIsScanning(true);
        setTimeout(() => {
            setIsScanning(false);
            const found = patientList[0];
            setSelectedPatientForModal(found);
        }, 1200);
    };

    const handleManualSearch = () => {
        if (!searchCode.trim()) return;
        const found = patientList.find(
            (p) => p.stt.toLowerCase() === searchCode.trim().toLowerCase() || p.rxCode.toLowerCase() === searchCode.trim().toLowerCase()
        ) || patientList[0];
        setSelectedPatientForModal(found);
    };

    const handleReadyToDeliver = () => {
        if (!selectedPatientForModal) return;

        setPatientList((prev) =>
            prev.map((p) =>
                p.stt === selectedPatientForModal.stt
                    ? { ...p, status: 'Sẵn Sàng' }
                    : p
            )
        );

        setToastMessage(`Đã cập nhật đơn thuốc ${selectedPatientForModal.rxCode} sang trạng thái Sẵn Sàng Giao Thuốc!`);
        setSelectedPatientForModal(null);
        setTimeout(() => setToastMessage(null), 3500);
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

            {/* ── Top Section (2 Cards: QR Scanner & Manual Input) matching Image 1 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Left Card: QR Scanner Container */}
                <div className="lg:col-span-7 bg-[#9382F6] rounded-[28px] p-6 md:p-8 text-white flex flex-col items-center justify-center text-center shadow-lg shadow-purple-500/20 space-y-6">
                    {/* White Dotted Card holding QR */}
                    <div className="bg-white rounded-[22px] p-6 text-slate-800 flex flex-col items-center justify-center border-2 border-dashed border-purple-200 shadow-md w-56 h-56 relative overflow-hidden">
                        {isScanning && (
                            <div className="absolute inset-x-0 h-1 bg-[#7C6CF5] shadow-[0_0_15px_#7C6CF5] animate-bounce top-1/3 z-20" />
                        )}
                        <QrCode className={`w-28 h-28 text-[#7C6CF5] ${isScanning ? 'animate-pulse' : ''}`} />
                        <span className="text-xs font-bold text-slate-500 mt-2">
                            {isScanning ? 'Đang đọc mã QR...' : 'Sẵn sàng quét'}
                        </span>
                    </div>

                    {/* Scan Button */}
                    <button
                        onClick={handleStartScan}
                        disabled={isScanning}
                        className="w-full max-w-sm bg-[#6B57E6] hover:bg-[#5b47d6] text-white py-3.5 rounded-[16px] font-bold text-sm shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {isScanning ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <span>Bắt Đầu Quét QR</span>
                        )}
                    </button>
                </div>

                {/* Right Card: Manual Lookup Container */}
                <div className="lg:col-span-5 bg-white rounded-[28px] border border-slate-200/80 p-6 md:p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-6">
                    <div>
                        <h2 className="text-base font-extrabold text-slate-800 tracking-tight">
                            Nhập Mã Thủ Công
                        </h2>
                        <p className="text-xs text-slate-400 font-medium mt-1">Mã Khám Bệnh</p>

                        <div className="relative mt-3">
                            <input
                                type="text"
                                value={searchCode}
                                onChange={(e) => setSearchCode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                                placeholder="Nhập mã khám bệnh"
                                className="w-full bg-white border border-slate-200 rounded-[16px] px-4 py-3.5 pr-11 text-xs font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#7C6CF5] transition shadow-inner"
                            />
                            <Search className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>

                    <button
                        onClick={handleManualSearch}
                        className={`w-full py-3.5 rounded-[16px] font-bold text-xs transition active:scale-[0.98] shadow-sm flex items-center justify-center cursor-pointer ${
                            searchCode.trim()
                                ? 'bg-[#7C6CF5] hover:bg-[#6b5be3] text-white shadow-purple-500/20'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        Check-in Bệnh Nhân
                    </button>
                </div>
            </div>

            {/* ── Bottom Section: Danh Sách Bệnh Nhân Table matching Image 1 ── */}
            <div className="bg-white rounded-[28px] border border-slate-200/80 p-6 md:p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-6">
                <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">
                    Danh Sách Bệnh Nhân
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                                <th className="pb-3 px-2">STT</th>
                                <th className="pb-3 px-2">BỆNH NHÂN</th>
                                <th className="pb-3 px-2">MÃ ĐƠN</th>
                                <th className="pb-3 px-2">THANH TOÁN</th>
                                <th className="pb-3 px-2">TRẠNG THÁI</th>
                                <th className="pb-3 px-2 text-right">THAO TÁC</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {patientList.map((patient) => (
                                <tr key={patient.stt} className="hover:bg-slate-50/60 transition">
                                    <td className="py-4 px-2 font-bold text-slate-800">{patient.stt}</td>
                                    <td className="py-4 px-2 font-bold text-slate-800">{patient.name}</td>
                                    <td className="py-4 px-2 font-semibold text-slate-400">{patient.rxCode}</td>
                                    <td className="py-4 px-2">
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold border ${
                                            patient.paymentStatus === 'Đã Thanh Toán'
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                : 'bg-blue-50 text-blue-600 border-blue-200'
                                        }`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                            {patient.paymentStatus}
                                        </span>
                                    </td>
                                    <td className="py-4 px-2">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${
                                            patient.status === 'Đang Chuẩn Bị'
                                                ? 'bg-amber-100 text-amber-800'
                                                : patient.status === 'Sẵn Sàng'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : patient.status === 'Đang Chờ'
                                                ? 'bg-slate-100 text-slate-700'
                                                : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {patient.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-2 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Action 1: Eye View */}
                                            <button
                                                onClick={() => setSelectedPatientForModal(patient)}
                                                className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition cursor-pointer"
                                                title="Xem chi tiết"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Action 2: Box / Package Icon 📦 (Trại Thùng Hàng) -> Opens Image 2 Modal! */}
                                            <button
                                                onClick={() => setSelectedPatientForModal(patient)}
                                                className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition cursor-pointer shadow-sm"
                                                title="Xem đơn thuốc (Icon thùng hàng)"
                                            >
                                                <Package className="w-3.5 h-3.5 text-blue-600" />
                                            </button>

                                            {/* Action 3: Confirm Check */}
                                            <button
                                                onClick={() => {
                                                    setPatientList((prev) =>
                                                        prev.map((p) => (p.stt === patient.stt ? { ...p, status: 'Sẵn Sàng' } : p))
                                                    );
                                                    setToastMessage(`Đã cập nhật ${patient.name} sang trạng thái Sẵn Sàng!`);
                                                    setTimeout(() => setToastMessage(null), 3500);
                                                }}
                                                className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition cursor-pointer"
                                                title="Xác nhận tiếp nhận"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── MODAL: Chi Tiết Đơn Thuốc matching Image 2 ── */}
            {selectedPatientForModal && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-800">Chi Tiết Đơn Thuốc</h3>
                                <p className="text-xs text-slate-400 font-semibold mt-0.5">{selectedPatientForModal.rxCode}</p>
                            </div>
                            <button
                                onClick={() => setSelectedPatientForModal(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Patient Info Banner Card matching Image 2 */}
                        <div className="bg-[#F5F3FF] rounded-[20px] p-4 flex items-center justify-between border border-purple-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#8B7CF6] text-white flex items-center justify-center font-bold text-sm">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">{selectedPatientForModal.name}</p>
                                    <p className="text-xs text-slate-400 font-semibold">Số thứ tự: {selectedPatientForModal.stt}</p>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="text-[11px] text-slate-400 font-semibold">Bác sĩ kê đơn</p>
                                <p className="text-xs font-bold text-slate-800">{selectedPatientForModal.doctorName}</p>
                            </div>
                        </div>

                        {/* 3 Metric Cards Grid matching Image 2 */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white rounded-[18px] border border-slate-200/80 p-3.5 space-y-1">
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                                    <CreditCard className="w-3.5 h-3.5" />
                                    <span>Thanh Toán</span>
                                </div>
                                <p className="text-xs font-extrabold text-[#7C6CF5]">{selectedPatientForModal.paymentStatus}</p>
                            </div>

                            <div className="bg-white rounded-[18px] border border-slate-200/80 p-3.5 space-y-1">
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Trạng Thái</span>
                                </div>
                                <p className="text-xs font-extrabold text-blue-600">{selectedPatientForModal.status}</p>
                            </div>

                            <div className="bg-white rounded-[18px] border border-slate-200/80 p-3.5 space-y-1">
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Thời Gian Chờ</span>
                                </div>
                                <p className="text-xs font-extrabold text-slate-800">{selectedPatientForModal.waitTime}</p>
                            </div>
                        </div>

                        {/* Section Title: Danh Sách Thuốc */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-[#7C6CF5]" />
                                <h4 className="font-extrabold text-slate-800 text-xs">Danh Sách Thuốc</h4>
                            </div>

                            <div className="space-y-2.5">
                                {selectedPatientForModal.medicines.map((med, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3.5 rounded-[16px] border border-slate-100 bg-slate-50/40 flex items-center justify-between gap-3"
                                    >
                                        <div>
                                            <p className="font-extrabold text-slate-800 text-xs">{med.name}</p>
                                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{med.dosage}</p>
                                            <p className="text-[11px] text-slate-500 font-bold">{med.usage}</p>
                                        </div>

                                        <span className="px-3 py-1.5 rounded-full bg-purple-100 text-[#7C6CF5] font-extrabold text-xs shrink-0">
                                            {med.quantity}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom Primary Button matching Image 2 */}
                        <button
                            onClick={handleReadyToDeliver}
                            className="w-full py-4 rounded-[20px] bg-[#7C6CF5] hover:bg-[#6b5be3] text-white font-extrabold text-sm shadow-lg shadow-purple-500/25 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Sẵn Sàng Giao Thuốc</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
