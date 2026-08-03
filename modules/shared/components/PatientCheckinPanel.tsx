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
    title = 'Tiếp Nhận Đơn Thuốc',
    subtitle = 'Quét mã QR đơn thuốc hoặc nhập mã lượt khám để tiếp nhận',
}: PatientCheckinPanelProps) {
    const [patientList, setPatientList] = useState<PatientRecord[]>(INITIAL_PATIENT_LIST);
    const [searchCode, setSearchCode] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [selectedPatientForModal, setSelectedPatientForModal] = useState<PatientRecord | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Table Filter, Search, Sort & Paging states
    const [tableSearchQuery, setTableSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [filterPayment, setFilterPayment] = useState<string>('ALL');
    const [sortKey, setSortKey] = useState<'stt' | 'name' | 'rxCode' | 'paymentStatus' | 'status'>('stt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const [showFilterPopover, setShowFilterPopover] = useState(false);
    const [showSortPopover, setShowSortPopover] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const loadApiPrescriptions = async () => {
            try {
                const list = await pharmacyService.getPrescriptions();
                // ONLY show paid prescriptions (PROCESSING, PREPARED, DISPENSED), hiding PENDING, CANCELLED, EXPIRED
                const paidList = list.filter(
                    (p) => p.status === 'PROCESSING' || p.status === 'PREPARED' || p.status === 'DISPENSED'
                );

                if (isMounted && paidList && paidList.length > 0) {
                    const mapped: PatientRecord[] = paidList.map((item, idx) => ({
                        stt: `P${(idx + 1).toString().padStart(3, '0')}`,
                        name: item.patient_name || 'Nguyễn Thị Hoa',
                        rxCode: item.prescription_code,
                        paymentStatus: 'Đã Thanh Toán',
                        status: item.status === 'PREPARED' ? 'Sẵn Sàng' : item.status === 'PROCESSING' ? 'Đang Chuẩn Bị' : 'Đã Check-in',
                        doctorName: item.prescribed_by_name || 'BS. Nguyễn Thế Hiển',
                        waitTime: `${10 + idx * 5} phút`,
                        medicines: item.prescriptionDetails?.map((d) => ({
                            name: d.medicine?.medicine_name || 'Thuốc kê đơn',
                            dosage: `Liều lượng: ${d.quantity} ${d.medicine?.unit || 'Viên'}`,
                            usage: `Hướng dẫn: ${d.dosage_instruction || 'Dùng theo chỉ định'}`,
                            quantity: `${d.quantity} ${d.medicine?.unit || 'Viên'}`
                        })) || [
                            { name: 'Paracetamol 500mg', dosage: 'Liều lượng: 500mg', usage: 'Hướng dẫn: Uống sau ăn', quantity: '10 viên' }
                        ]
                    }));
                    setPatientList(mapped);
                }
            } catch (e) {
                // Keep default
            }
        };
        loadApiPrescriptions();
        return () => { isMounted = false; };
    }, []);

    // Filter + Search + Sort + Pagination calculation
    const processedPatients = useMemo(() => {
        let result = [...patientList];

        // 1. Search filter
        if (tableSearchQuery.trim()) {
            const query = tableSearchQuery.trim().toLowerCase();
            result = result.filter(
                (p) =>
                    p.name.toLowerCase().includes(query) ||
                    p.stt.toLowerCase().includes(query) ||
                    p.rxCode.toLowerCase().includes(query) ||
                    p.doctorName.toLowerCase().includes(query),
            );
        }

        // 2. Status filter
        if (filterStatus !== 'ALL') {
            result = result.filter((p) => p.status === filterStatus);
        }

        // 3. Payment filter
        if (filterPayment !== 'ALL') {
            result = result.filter((p) => p.paymentStatus === filterPayment);
        }

        // 4. Sorting
        result.sort((a, b) => {
            let valA = a[sortKey] || '';
            let valB = b[sortKey] || '';

            const comp = valA.localeCompare(valB, 'vi', { numeric: true });
            return sortOrder === 'asc' ? comp : -comp;
        });

        return result;
    }, [patientList, tableSearchQuery, filterStatus, filterPayment, sortKey, sortOrder]);

    const totalPages = Math.max(1, Math.ceil(processedPatients.length / pageSize));
    const validCurrentPage = Math.min(currentPage, totalPages);

    const paginatedPatients = useMemo(() => {
        const start = (validCurrentPage - 1) * pageSize;
        return processedPatients.slice(start, start + pageSize);
    }, [processedPatients, validCurrentPage, pageSize]);

    const handleSortToggle = (key: 'stt' | 'name' | 'rxCode' | 'paymentStatus' | 'status') => {
        if (sortKey === key) {
            setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortOrder('asc');
        }
    };

    const handleResetFilters = () => {
        setTableSearchQuery('');
        setFilterStatus('ALL');
        setFilterPayment('ALL');
        setSortKey('stt');
        setSortOrder('asc');
        setCurrentPage(1);
    };

    const hasActiveFilters = tableSearchQuery || filterStatus !== 'ALL' || filterPayment !== 'ALL';

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

            {/* ── Bottom Section: Danh Sách Bệnh Nhân Table (Clean & Aligned) ── */}
            <div className="bg-white rounded-3xl border border-neutral-100 shadow-[0_2px_16px_rgba(0,0,0,0.02)] p-6 md:p-8 space-y-6">
                {/* ── Top Bar: Search + Active Filter Reset ────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm tên, STT, mã đơn..."
                                value={tableSearchQuery}
                                onChange={(e) => {
                                    setTableSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full h-10 pl-11 pr-8 bg-white border border-neutral-200 hover:border-neutral-300 focus:border-neutral-400 rounded-full text-[13px] text-neutral-800 placeholder-neutral-400 outline-none transition-all"
                            />
                            {tableSearchQuery && (
                                <button
                                    onClick={() => {
                                        setTableSearchQuery('');
                                        setCurrentPage(1);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Active Filter Tags & Reset Button */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {filterPayment !== 'ALL' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E8F2FF] text-[#1A73E8] text-xs font-semibold">
                                Thanh toán: {filterPayment}
                                <button
                                    onClick={() => {
                                        setFilterPayment('ALL');
                                        setCurrentPage(1);
                                    }}
                                    className="hover:text-[#1557B0]"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {filterStatus !== 'ALL' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F0EBFF] text-[#8B7CF6] text-xs font-semibold">
                                Trạng thái: {filterStatus}
                                <button
                                    onClick={() => {
                                        setFilterStatus('ALL');
                                        setCurrentPage(1);
                                    }}
                                    className="hover:text-[#7C6EE6]"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {hasActiveFilters && (
                            <button
                                onClick={handleResetFilters}
                                className="h-9 px-3 rounded-full text-xs font-bold text-neutral-500 hover:bg-neutral-100 inline-flex items-center gap-1 transition-all cursor-pointer"
                                title="Xóa tất cả bộ lọc"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Xóa lọc</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Table Card ─────────────────────────────────── */}
                <div className="overflow-hidden border-t border-neutral-100 pt-2">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="hover:bg-transparent cursor-default border-b border-neutral-100 select-none">
                                <th className="pl-4 py-3.5 text-[13px] font-bold text-neutral-700">
                                    STT
                                </th>
                                <th className="py-3.5 text-[13px] font-bold text-neutral-700">
                                    BỆNH NHÂN
                                </th>
                                <th className="py-3.5 text-[13px] font-bold text-neutral-700">
                                    MÃ ĐƠN
                                </th>

                                {/* 1. THANH TOÁN Column Header with Filter Dropdown */}
                                <th className="py-3.5 text-[13px] font-bold text-neutral-700 relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowFilterPopover(!showFilterPopover);
                                            setShowSortPopover(false);
                                        }}
                                        className={cn(
                                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer',
                                            filterPayment !== 'ALL'
                                                ? 'bg-[#1A73E8]/10 text-[#1A73E8]'
                                                : 'hover:bg-neutral-100 text-neutral-700'
                                        )}
                                    >
                                        <span>THANH TOÁN</span>
                                        <Filter className="w-3.5 h-3.5 text-neutral-400" />
                                    </button>

                                    {/* Dropdown Popover for THANH TOÁN */}
                                    {showFilterPopover && (
                                        <div className="absolute left-0 mt-2 w-48 bg-white rounded-2xl border border-neutral-100 shadow-xl z-30 py-2 animate-in fade-in-0 zoom-in-95 duration-150 font-normal normal-case">
                                            <div className="px-3 py-1.5 text-[11px] font-bold text-neutral-400 uppercase border-b border-neutral-100">
                                                Lọc Thanh Toán
                                            </div>
                                            {[
                                                { label: 'Tất cả thanh toán', value: 'ALL' },
                                                { label: 'Đã Thanh Toán', value: 'Đã Thanh Toán' },
                                                { label: 'Đã Xác Nhận', value: 'Đã Xác Nhận' },
                                            ].map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => {
                                                        setFilterPayment(opt.value);
                                                        setShowFilterPopover(false);
                                                        setCurrentPage(1);
                                                    }}
                                                    className={cn(
                                                        'w-full text-left px-4 py-2 text-xs font-semibold transition-colors',
                                                        filterPayment === opt.value
                                                            ? 'text-[#1A73E8] bg-[#E8F2FF]'
                                                            : 'text-neutral-600 hover:bg-neutral-50'
                                                    )}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </th>

                                {/* 2. TRẠNG THÁI Column Header with Filter Dropdown */}
                                <th className="py-3.5 text-[13px] font-bold text-neutral-700 relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowSortPopover(!showSortPopover);
                                            setShowFilterPopover(false);
                                        }}
                                        className={cn(
                                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer',
                                            filterStatus !== 'ALL'
                                                ? 'bg-[#8B7CF6]/10 text-[#8B7CF6]'
                                                : 'hover:bg-neutral-100 text-neutral-700'
                                        )}
                                    >
                                        <span>TRẠNG THÁI</span>
                                        <Filter className="w-3.5 h-3.5 text-neutral-400" />
                                    </button>

                                    {/* Dropdown Popover for TRẠNG THÁI */}
                                    {showSortPopover && (
                                        <div className="absolute left-0 mt-2 w-48 bg-white rounded-2xl border border-neutral-100 shadow-xl z-30 py-2 animate-in fade-in-0 zoom-in-95 duration-150 font-normal normal-case">
                                            <div className="px-3 py-1.5 text-[11px] font-bold text-neutral-400 uppercase border-b border-neutral-100">
                                                Lọc Trạng Thái
                                            </div>
                                            {[
                                                { label: 'Tất cả trạng thái', value: 'ALL' },
                                                { label: 'Đang Chuẩn Bị', value: 'Đang Chuẩn Bị' },
                                                { label: 'Sẵn Sàng', value: 'Sẵn Sàng' },
                                                { label: 'Đang Chờ', value: 'Đang Chờ' },
                                                { label: 'Đã Check-in', value: 'Đã Check-in' },
                                            ].map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => {
                                                        setFilterStatus(opt.value);
                                                        setShowSortPopover(false);
                                                        setCurrentPage(1);
                                                    }}
                                                    className={cn(
                                                        'w-full text-left px-4 py-2 text-xs font-semibold transition-colors',
                                                        filterStatus === opt.value
                                                            ? 'text-[#8B7CF6] bg-[#F0EBFF]'
                                                            : 'text-neutral-600 hover:bg-neutral-50'
                                                    )}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </th>

                                <th className="py-3.5 pr-4 text-[13px] font-bold text-neutral-700 text-right">
                                    THAO TÁC
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50 font-medium">
                            {paginatedPatients.length > 0 ? (
                                paginatedPatients.map((patient) => (
                                    <tr
                                        key={patient.stt}
                                        className="group hover:bg-[#8B7CF6]/5 transition-colors duration-150 border-b border-neutral-50 last:border-b-0"
                                    >
                                        <td className="py-4 pl-4 text-neutral-500 font-bold text-sm">
                                            {patient.stt}
                                        </td>
                                        <td className="py-4 font-semibold text-neutral-800 text-sm">
                                            {patient.name}
                                        </td>
                                        <td className="py-4 font-semibold text-neutral-400 text-xs">
                                            {patient.rxCode}
                                        </td>
                                        <td className="py-4">
                                            <span className={cn(
                                                'inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1 rounded-full',
                                                patient.paymentStatus === 'Đã Thanh Toán'
                                                    ? 'bg-[#E2F7EB] text-[#0D9448]'
                                                    : 'bg-[#E8F2FF] text-[#1A73E8]'
                                            )}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                {patient.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <span className={cn(
                                                'inline-flex items-center text-[12px] font-semibold px-3 py-1 rounded-full',
                                                patient.status === 'Sẵn Sàng'
                                                    ? 'bg-[#E2F7EB] text-[#0D9448]'
                                                    : patient.status === 'Đang Chuẩn Bị'
                                                    ? 'bg-[#FFEFE2] text-[#F39C12]'
                                                    : patient.status === 'Đã Check-in'
                                                    ? 'bg-[#F0EBFF] text-[#8B7CF6]'
                                                    : 'bg-neutral-100 text-neutral-600'
                                            )}>
                                                {patient.status}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-4 text-right">
                                            <div className="inline-flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => setSelectedPatientForModal(patient)}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#0D9448] hover:bg-[#E2F7EB] transition cursor-pointer"
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={() => setSelectedPatientForModal(patient)}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#1A73E8] hover:bg-[#E8F2FF] transition cursor-pointer"
                                                    title="Xem đơn thuốc"
                                                >
                                                    <Package className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setPatientList((prev) =>
                                                            prev.map((p) => (p.stt === patient.stt ? { ...p, status: 'Sẵn Sàng' } : p))
                                                        );
                                                        setToastMessage(`Đã cập nhật ${patient.name} sang trạng thái Sẵn Sàng!`);
                                                        setTimeout(() => setToastMessage(null), 3500);
                                                    }}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#8B7CF6] hover:bg-[#F0EBFF] transition cursor-pointer"
                                                    title="Xác nhận tiếp nhận"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-neutral-400 text-sm">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Search className="w-8 h-8 text-neutral-300 stroke-[1.5]" />
                                            <p className="font-semibold text-xs text-neutral-500">Không tìm thấy bệnh nhân nào phù hợp</p>
                                            {hasActiveFilters && (
                                                <button
                                                    onClick={handleResetFilters}
                                                    className="mt-1 text-xs text-[#8B7CF6] font-bold hover:underline cursor-pointer"
                                                >
                                                    Xóa bộ lọc và thử lại
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination Pill matching PatientTable.tsx ───────────────── */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-100">
                    <div className="flex items-center gap-3 text-xs font-medium text-neutral-500">
                        <span>Hiển thị</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="h-8 px-3 bg-white border border-neutral-200 rounded-full text-xs font-semibold text-neutral-700 outline-none focus:border-neutral-400 transition cursor-pointer"
                        >
                            <option value={5}>5 dòng / trang</option>
                            <option value={10}>10 dòng / trang</option>
                            <option value={20}>20 dòng / trang</option>
                        </select>
                        <span className="text-neutral-400">
                            {processedPatients.length > 0 ? (
                                <>
                                    ({(validCurrentPage - 1) * pageSize + 1} - {Math.min(validCurrentPage * pageSize, processedPatients.length)} trên tổng số {processedPatients.length})
                                </>
                            ) : (
                                '(0 bản ghi)'
                            )}
                        </span>
                    </div>

                    {/* Centered Floating Pill Navigation */}
                    {totalPages >= 1 && (
                        <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-full border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={validCurrentPage === 1}
                                className="text-[13px] text-neutral-400 hover:text-neutral-700 disabled:opacity-50 disabled:pointer-events-none font-semibold px-3 py-1.5 flex items-center transition-colors cursor-pointer"
                            >
                                <span className="mr-1.5">←</span> Previous
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={cn(
                                        'w-8 h-8 flex items-center justify-center text-[13px] transition-all duration-150 cursor-pointer',
                                        validCurrentPage === pageNum
                                            ? 'bg-[#8B7CF6] text-white font-bold rounded-lg shadow-sm'
                                            : 'text-neutral-500 hover:text-neutral-800 font-semibold rounded-lg hover:bg-neutral-50'
                                    )}
                                >
                                    {pageNum}
                                </button>
                            ))}

                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={validCurrentPage === totalPages}
                                className="text-[13px] text-neutral-500 hover:text-neutral-800 disabled:opacity-50 disabled:pointer-events-none font-semibold px-3 py-1.5 flex items-center transition-colors cursor-pointer"
                            >
                                Next <span className="ml-1.5">→</span>
                            </button>
                        </div>
                    )}
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
