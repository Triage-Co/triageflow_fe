'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    Search,
    Eye,
    Upload,
    Printer,
    CheckCircle2,
    AlertCircle,
    Loader2,
    X,
    FileText,
    QrCode,
    FlaskConical,
    User,
    Calendar,
    Check,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { cn } from '@/lib/utils';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/shared/components/ui/Table';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface LabPatient {
    id: string;
    stt: string;
    name: string;
    test: string;
    priority: 'Cấp Cứu' | 'Khẩn' | 'BN Tái Khám' | 'Thường';
    status: 'Đang Chờ' | 'Đã Tiếp Nhận' | 'Đã Lấy Mẫu' | 'Đang Xử Lý' | 'Hoàn Thành';
    age: number;
    gender: 'Nam' | 'Nữ';
    code: string;
    time: string;
    doctorName?: string;
    orderDate?: string;
    clinicalNote?: string;
    resultNotes?: string;
    resultValue?: string;
}

export default function LabPatientsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get('search') || '';
    const accessToken = useAuthStore((s) => s.accessToken);
    const [mounted, setMounted] = useState(false);

    // Patients state
    const [patients, setPatients] = useState<LabPatient[]>([
        { 
            id: '1', 
            stt: 'XN-042', 
            name: 'Nguyễn Văn An', 
            test: 'Công Thức Máu (CBC)', 
            priority: 'Cấp Cứu', 
            status: 'Đã Tiếp Nhận', 
            age: 36, 
            gender: 'Nam', 
            code: 'PT-2024-1234', 
            time: '11:30',
            doctorName: 'BS. Trần Minh Châu',
            orderDate: 'May 17, 2026 - 10:30 AM',
            clinicalNote: 'Bệnh nhân đã nhịn ăn 12 giờ. Cần xử lý khẩn cấp do nghi ngờ thiếu máu.'
        },
        { 
            id: '2', 
            stt: 'XN-041', 
            name: 'Lê Thị Bình', 
            test: 'Lipid Máu', 
            priority: 'Khẩn', 
            status: 'Đã Lấy Mẫu', 
            age: 42, 
            gender: 'Nữ', 
            code: 'PT-2024-1235', 
            time: '11:45',
            doctorName: 'BS. Nguyễn Hoàng Nam',
            orderDate: 'May 17, 2026 - 10:45 AM',
            clinicalNote: 'Xét nghiệm mỡ máu định kỳ. Bệnh nhân đã nhịn ăn 10 giờ.'
        },
        { 
            id: '3', 
            stt: 'XN-040', 
            name: 'Hoàng Minh Tuấn', 
            test: 'Chức Năng Tuyến Giáp (TSH, T3, T4)', 
            priority: 'BN Tái Khám', 
            status: 'Đang Xử Lý', 
            age: 50, 
            gender: 'Nam', 
            code: 'PT-2024-1236', 
            time: '12:00',
            doctorName: 'BS. Lê Thị Mai',
            orderDate: 'May 17, 2026 - 11:00 AM',
            clinicalNote: 'Theo dõi suy giáp. Không yêu cầu nhịn ăn.'
        },
        { 
            id: '4', 
            stt: 'XN-039', 
            name: 'Vũ Thị Lan', 
            test: 'HbA1c', 
            priority: 'Thường', 
            status: 'Hoàn Thành', 
            age: 29, 
            gender: 'Nữ', 
            code: 'PT-2024-1237', 
            time: '12:15', 
            doctorName: 'BS. Phạm Minh Tuấn',
            orderDate: 'May 17, 2026 - 11:15 AM',
            clinicalNote: 'Kiểm tra đường huyết thai kỳ.',
            resultValue: '5.6 %', 
            resultNotes: 'Chỉ số đường huyết ổn định' 
        },
        { 
            id: '5', 
            stt: 'XN-038', 
            name: 'Đặng Văn Hùng', 
            test: 'Chức Năng Gan (LFT)', 
            priority: 'Thường', 
            status: 'Đang Chờ', 
            age: 58, 
            gender: 'Nam', 
            code: 'PT-2024-1238', 
            time: '12:30',
            doctorName: 'BS. Bùi Văn Lộc',
            orderDate: 'May 17, 2026 - 11:30 AM',
            clinicalNote: 'Nghi ngờ xơ gan tiến triển.'
        },
    ]);

    const [search, setSearch] = useState(initialSearch);
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Modals
    const [selectedPatient, setSelectedPatient] = useState<LabPatient | null>(null);
    const [activeModal, setActiveModal] = useState<'view' | 'collect' | 'process' | 'result' | null>(null);

    // Form inputs for results
    const [inputResultValue, setInputResultValue] = useState('');
    const [inputResultNotes, setInputResultNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sample collection interactive states
    const [qrVerified, setQrVerified] = useState(false);
    const [barcodePrinted, setBarcodePrinted] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [collectingStep, setCollectingStep] = useState(false);
    const [tubeType, setTubeType] = useState('EDTA (Nắp Tím)');
    const [volume, setVolume] = useState('2 ml');
    const [labelConfirmed, setLabelConfirmed] = useState(false);

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!accessToken) {
            router.push('/login');
        }
    }, [accessToken, mounted, router]);

    // Handle initial search from query
    useEffect(() => {
        if (initialSearch) {
            setSearch(initialSearch);
        }
    }, [initialSearch]);

    // Filter patients
    const filteredPatients = useMemo(() => {
        return patients.filter((p) => {
            const matchesSearch =
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.stt.toLowerCase().includes(search.toLowerCase()) ||
                p.code.includes(search);
            const matchesPriority = priorityFilter === 'all' || p.priority === priorityFilter;
            const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
            return matchesSearch && matchesPriority && matchesStatus;
        });
    }, [patients, search, priorityFilter, statusFilter]);

    if (!mounted || !accessToken) {
        return (
            <div className="flex-1 flex items-center justify-center bg-neutral-50/50 min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B7CF6]"></div>
            </div>
        );
    }

    // Actions
    const handlePrintBarcode = (patient: LabPatient) => {
        showToast(`Đang in mã vạch ống nghiệm cho bệnh nhân: ${patient.name} (${patient.stt})`, 'success');
    };

    const handleUpdateStatus = (patientId: string, nextStatus: LabPatient['status']) => {
        setPatients((prev) =>
            prev.map((p) => (p.id === patientId ? { ...p, status: nextStatus } : p))
        );
        showToast(`Cập nhật trạng thái thành công: ${nextStatus}`, 'success');
        setActiveModal(null);
    };

    const handleSaveResult = () => {
        if (!selectedPatient) return;
        if (!inputResultValue.trim()) {
            showToast('Vui lòng nhập trị số kết quả xét nghiệm.', 'error');
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            setPatients((prev) =>
                prev.map((p) =>
                    p.id === selectedPatient.id
                        ? {
                              ...p,
                              status: 'Hoàn Thành',
                              resultValue: inputResultValue,
                              resultNotes: inputResultNotes,
                          }
                        : p
                )
            );
            setIsSubmitting(false);
            setActiveModal(null);
            showToast(`Đã lưu kết quả xét nghiệm cho bệnh nhân: ${selectedPatient.name}`, 'success');
        }, 1200);
    };

    const handleOpenViewModal = (patient: LabPatient) => {
        setSelectedPatient(patient);
        const alreadySampled = patient.status !== 'Đã Tiếp Nhận' && patient.status !== 'Đang Chờ';
        setQrVerified(alreadySampled);
        setBarcodePrinted(alreadySampled);
        setCollectingStep(false);
        setLabelConfirmed(false);
        
        if (patient.test.toLowerCase().includes('cbc') || patient.test.toLowerCase().includes('máu')) {
            setTubeType('EDTA (Nắp Tím)');
            setVolume('2 ml');
        } else if (patient.test.toLowerCase().includes('lipid') || patient.test.toLowerCase().includes('gan')) {
            setTubeType('Serum (Nắp Đỏ)');
            setVolume('4 ml');
        } else {
            setTubeType('Heparin (Nắp Xanh Lá)');
            setVolume('3 ml');
        }
        
        setActiveModal('view');
    };

    const handlePrintBarcodeInteractive = async (patient: LabPatient) => {
        setIsPrinting(true);
        showToast('Đang kết nối với máy in tem barcode...', 'info');
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsPrinting(false);
        setBarcodePrinted(true);
        showToast(`Đã in nhãn barcode thành công cho ống nghiệm của bệnh nhân ${patient.name}!`, 'success');
    };

    const handleQrScanInteractive = async (patient: LabPatient) => {
        setIsVerifying(true);
        showToast('Đang quét mã xác thực bệnh nhân...', 'info');
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsVerifying(false);
        setQrVerified(true);
        showToast(`Xác thực thành công bệnh nhân: ${patient.name} (${patient.code})`, 'success');
    };

    const handleConfirmCollection = async () => {
        if (!selectedPatient) return;
        if (!labelConfirmed) {
            showToast('Vui lòng xác nhận nhãn barcode đã được dán đúng!', 'error');
            return;
        }

        setIsSubmitting(true);
        showToast('Đang ghi nhận thông tin thu thập mẫu...', 'info');
        await new Promise((resolve) => setTimeout(resolve, 1200));
        setIsSubmitting(false);

        setPatients((prev) =>
            prev.map((p) =>
                p.id === selectedPatient.id
                    ? {
                          ...p,
                          status: 'Đã Lấy Mẫu',
                      }
                    : p
            )
        );

        setSelectedPatient((prev) => prev ? { ...prev, status: 'Đã Lấy Mẫu' } : null);
        setActiveModal(null);
        showToast(`Thu thập mẫu thành công cho bệnh nhân: ${selectedPatient.name}`, 'success');
    };

    return (
        <EMRWorkspaceLayout activeTabId="lab-patients" activeTabName="Danh Sách Bệnh Nhân">
            <div className="flex-1 flex flex-col p-4 pb-6 overflow-hidden">
                <div className="h-fit max-h-full flex flex-col bg-white rounded-[24px] border border-neutral-200/50 shadow-[0_4px_24px_-4px_rgba(139,124,246,0.02)] overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Toast Portal */}
                        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full">
                            {toasts.map((toast) => (
                                <div
                                    key={toast.id}
                                    className={cn(
                                        "flex items-start gap-3 p-4 rounded-2xl shadow-lg border text-sm font-semibold animate-in fade-in-0 slide-in-from-top-5 duration-300 backdrop-blur-md select-none",
                                        toast.type === 'success' && "bg-emerald-50/95 border-emerald-100/80 text-emerald-800",
                                        toast.type === 'error' && "bg-rose-50/95 border-rose-100/80 text-rose-800",
                                        toast.type === 'info' && "bg-indigo-50/95 border-indigo-100/80 text-indigo-800"
                                    )}
                                >
                                    {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
                                    {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
                                    {toast.type === 'info' && <Loader2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5 animate-spin" />}
                                    <span className="flex-1 leading-snug">{toast.message}</span>
                                </div>
                            ))}
                        </div>

                        {/* Title Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                    Danh sách bệnh nhân xét nghiệm
                                </h1>
                                <p className="text-[13px] text-[#7B7B7B] mt-1 font-medium">
                                    Quản lý danh sách, lấy mẫu và trả kết quả xét nghiệm
                                </p>
                            </div>
                        </div>

                        {/* Search & Filters */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                            {/* Search */}
                            <div className="w-full md:max-w-sm">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400" />
                                    <input
                                        type="text"
                                        placeholder="Tìm tên, STT hoặc CCCD..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full h-11 pl-11 pr-4 bg-white border border-neutral-200 hover:border-neutral-300 focus:border-neutral-400 rounded-full text-[13px] text-neutral-800 placeholder-neutral-400 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Dropdowns */}
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                {/* Priority Filter */}
                                <select
                                    value={priorityFilter}
                                    onChange={(e) => setPriorityFilter(e.target.value)}
                                    className="flex-1 md:flex-none h-11 px-4 rounded-full border border-neutral-200 text-[13px] font-bold text-neutral-600 bg-white outline-none cursor-pointer hover:bg-neutral-50"
                                >
                                    <option value="all">Tất Cả Ưu Tiên</option>
                                    <option value="Cấp Cứu">Cấp Cứu</option>
                                    <option value="Khẩn">Khẩn</option>
                                    <option value="BN Tái Khám">BN Tái Khám</option>
                                    <option value="Thường">Thường</option>
                                </select>

                                {/* Status Filter */}
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="flex-1 md:flex-none h-11 px-4 rounded-full border border-neutral-200 text-[13px] font-bold text-neutral-600 bg-white outline-none cursor-pointer hover:bg-neutral-50"
                                >
                                    <option value="all">Tất Cả Trạng Thái</option>
                                    <option value="Đang Chờ">Đang Chờ</option>
                                    <option value="Đã Tiếp Nhận">Đã Tiếp Nhận</option>
                                    <option value="Đã Lấy Mẫu">Đã Lấy Mẫu</option>
                                    <option value="Đang Xử Lý">Đang Xử Lý</option>
                                    <option value="Hoàn Thành">Hoàn Thành</option>
                                </select>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-3xl border border-neutral-100 shadow-[0_2px_16px_rgba(0,0,0,0.02)] overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent cursor-default border-b border-neutral-100">
                                        <TableHead className="w-24 pl-8 text-[13px] font-bold text-neutral-700 py-4">SỐ TT</TableHead>
                                        <TableHead className="text-[13px] font-bold text-neutral-700 py-4">TÊN BỆNH NHÂN</TableHead>
                                        <TableHead className="text-[13px] font-bold text-neutral-700 py-4">XÉT NGHIỆM</TableHead>
                                        <TableHead className="text-[13px] font-bold text-neutral-700 py-4">ƯU TIÊN</TableHead>
                                        <TableHead className="text-[13px] font-bold text-neutral-700 py-4">TRẠNG THÁI</TableHead>
                                        <TableHead className="text-[13px] font-bold text-neutral-700 py-4 text-right pr-8">THAO TÁC</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPatients.length === 0 ? (
                                        <TableRow className="hover:bg-transparent">
                                            <TableCell colSpan={6} className="text-center py-12 text-neutral-400 text-sm">
                                                Không tìm thấy bệnh nhân xét nghiệm nào.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredPatients.map((patient) => (
                                            <TableRow
                                                key={patient.id}
                                                className="group hover:bg-[#8B7CF6]/5 transition-colors duration-150 border-b border-neutral-50 last:border-b-0"
                                            >
                                                {/* STT */}
                                                <TableCell className="font-bold text-neutral-800 text-sm pl-8 py-4">{patient.stt}</TableCell>

                                                {/* Patient Info */}
                                                <TableCell className="py-4">
                                                    <p className="font-bold text-neutral-800 text-sm">{patient.name}</p>
                                                    <p className="text-xs text-neutral-400 mt-0.5">
                                                        {patient.age} tuổi • {patient.gender} • {patient.code}
                                                    </p>
                                                </TableCell>

                                                {/* Test Name */}
                                                <TableCell className="py-4 text-sm font-semibold text-neutral-700">{patient.test}</TableCell>

                                                {/* Priority Badge */}
                                                <TableCell className="py-4">
                                                    {patient.priority === 'Cấp Cứu' && (
                                                        <span className="inline-flex items-center bg-rose-50 text-rose-600 text-[11px] font-bold px-3 py-1 rounded-full border border-rose-100">
                                                            Cấp Cứu
                                                        </span>
                                                    )}
                                                    {patient.priority === 'Khẩn' && (
                                                        <span className="inline-flex items-center bg-amber-50 text-amber-600 text-[11px] font-bold px-3 py-1 rounded-full border border-amber-100">
                                                            Khẩn
                                                        </span>
                                                    )}
                                                    {patient.priority === 'BN Tái Khám' && (
                                                        <span className="inline-flex items-center bg-emerald-50 text-emerald-600 text-[11px] font-bold px-3 py-1 rounded-full border border-emerald-100">
                                                            BN Tái Khám
                                                        </span>
                                                    )}
                                                    {patient.priority === 'Thường' && (
                                                        <span className="inline-flex items-center bg-neutral-50 text-neutral-500 text-[11px] font-bold px-3 py-1 rounded-full border border-neutral-200/50">
                                                            Thường
                                                        </span>
                                                    )}
                                                </TableCell>

                                                {/* Status Badge */}
                                                <TableCell className="py-4">
                                                    {patient.status === 'Đang Chờ' && (
                                                        <span className="inline-flex items-center bg-neutral-100 text-neutral-500 text-[11px] font-bold px-3 py-1 rounded-full">
                                                            Đang Chờ
                                                        </span>
                                                    )}
                                                    {patient.status === 'Đã Tiếp Nhận' && (
                                                        <span className="inline-flex items-center bg-blue-50 text-blue-600 text-[11px] font-bold px-3 py-1 rounded-full">
                                                            Đã Tiếp Nhận
                                                        </span>
                                                    )}
                                                    {patient.status === 'Đã Lấy Mẫu' && (
                                                        <span className="inline-flex items-center bg-purple-50 text-purple-600 text-[11px] font-bold px-3 py-1 rounded-full">
                                                            Đã Lấy Mẫu
                                                        </span>
                                                    )}
                                                    {patient.status === 'Đang Xử Lý' && (
                                                        <span className="inline-flex items-center bg-amber-50 text-amber-600 text-[11px] font-bold px-3 py-1 rounded-full">
                                                            Đang Xử Lý
                                                        </span>
                                                    )}
                                                    {patient.status === 'Hoàn Thành' && (
                                                        <span className="inline-flex items-center bg-emerald-50 text-emerald-600 text-[11px] font-bold px-3 py-1 rounded-full">
                                                            Hoàn Thành
                                                        </span>
                                                    )}
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell className="text-right pr-8 py-4">
                                                    <div className="inline-flex items-center gap-2">
                                                        {/* View Details */}
                                                        <button
                                                            onClick={() => handleOpenViewModal(patient)}
                                                            title="Xem chi tiết"
                                                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500 transition-all cursor-pointer"
                                                        >
                                                            <Eye className="w-4.5 h-4.5" />
                                                        </button>

                                                        {/* Print Barcode Label */}
                                                        <button
                                                            onClick={() => handlePrintBarcode(patient)}
                                                            title="In tem ống nghiệm"
                                                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500 transition-all cursor-pointer"
                                                        >
                                                            <Printer className="w-4.5 h-4.5" />
                                                        </button>

                                                        {/* Upload / Process Action */}
                                                        {patient.status === 'Đang Chờ' && (
                                                            <Button
                                                                onClick={() => {
                                                                    setSelectedPatient(patient);
                                                                    handleUpdateStatus(patient.id, 'Đã Tiếp Nhận');
                                                                }}
                                                                className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs shrink-0"
                                                            >
                                                                Tiếp nhận
                                                            </Button>
                                                        )}
                                                        {patient.status === 'Đã Tiếp Nhận' && (
                                                            <Button
                                                                onClick={() => handleOpenViewModal(patient)}
                                                                className="h-8 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold shadow-xs shrink-0"
                                                            >
                                                                Lấy mẫu
                                                            </Button>
                                                        )}
                                                        {patient.status === 'Đã Lấy Mẫu' && (
                                                            <Button
                                                                onClick={() => {
                                                                    setSelectedPatient(patient);
                                                                    handleUpdateStatus(patient.id, 'Đang Xử Lý');
                                                                }}
                                                                className="h-8 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shadow-xs shrink-0"
                                                            >
                                                                Xử lý mẫu
                                                            </Button>
                                                        )}
                                                        {patient.status === 'Đang Xử Lý' && (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedPatient(patient);
                                                                    setInputResultValue('');
                                                                    setInputResultNotes('');
                                                                    setActiveModal('result');
                                                                }}
                                                                title="Nhập kết quả"
                                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-all cursor-pointer"
                                                            >
                                                                <Upload className="w-4.5 h-4.5" />
                                                            </button>
                                                        )}
                                                        {patient.status === 'Hoàn Thành' && (
                                                            <span className="w-8 h-8 flex items-center justify-center rounded-full text-emerald-600">
                                                                <CheckCircle2 className="w-5 h-5" />
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── MODAL PORTAL ── */}
            {activeModal && selectedPatient && (
                <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    {/* Detailed Description & Sample Collection Modal */}
                    {activeModal === 'view' && (
                        <div className="bg-white rounded-[28px] border border-neutral-100/80 shadow-2xl max-w-[500px] w-full overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
                            
                            {/* Modal Header */}
                            <div className="px-6 py-4.5 border-b border-neutral-100 flex items-center justify-between">
                                <h3 className="font-bold text-neutral-800 text-[15px] tracking-tight">Mô tả chi tiết</h3>
                                <button
                                    onClick={() => setActiveModal(null)}
                                    className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
                                >
                                    <X className="w-4.5 h-4.5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
                                
                                {!collectingStep ? (
                                    <>
                                        {/* 1. Patient Profile Card */}
                                        <div className="bg-[#EBE9FC]/70 border border-[#DDD6FE]/40 rounded-[20px] p-5 flex items-center justify-between">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-11 h-11 rounded-full bg-[#8B7CF6] flex items-center justify-center shrink-0 border border-white shadow-sm">
                                                    <User className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-[15px] font-extrabold text-neutral-850 tracking-tight leading-tight">
                                                        {selectedPatient.name}
                                                    </p>
                                                    <p className="text-[11px] text-neutral-500 font-semibold mt-1">
                                                        ID: {selectedPatient.code}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className="text-[16px] font-bold text-neutral-800">
                                                    {selectedPatient.stt}
                                                </span>
                                                {selectedPatient.priority === 'Cấp Cứu' ? (
                                                    <span className="bg-red-50 text-red-650 border border-red-100 text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                                        Cấp Cứu
                                                    </span>
                                                ) : selectedPatient.priority === 'Khẩn' ? (
                                                    <span className="bg-amber-50 text-amber-650 border border-amber-100 text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                                        Khẩn
                                                    </span>
                                                ) : (
                                                    <span className="bg-neutral-100 text-neutral-600 text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                                        {selectedPatient.priority}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 2. Lab Test Request Information */}
                                        <div className="space-y-2.5">
                                            <h4 className="text-[11px] font-bold text-neutral-450 uppercase tracking-wider">Thông tin xét nghiệm</h4>
                                            <div className="bg-[#F8F9FC] border border-neutral-200/50 rounded-2xl p-4.5 space-y-4">
                                                <div className="flex items-start gap-3">
                                                    <FlaskConical className="w-4.5 h-4.5 text-[#8B7CF6] shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-[11.5px] text-neutral-400 font-bold leading-tight">Chỉ định xét nghiệm/Tên xét nghiệm</p>
                                                        <p className="text-[13px] font-extrabold text-neutral-800 mt-1 leading-snug">{selectedPatient.test}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 border-t border-neutral-200/40 pt-3.5">
                                                    <User className="w-4.5 h-4.5 text-blue-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-[11.5px] text-neutral-400 font-bold leading-tight">Bác sĩ chỉ định</p>
                                                        <p className="text-[13px] font-extrabold text-neutral-800 mt-0.5">{selectedPatient.doctorName || 'BS. Nguyễn Văn Hậu'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 border-t border-neutral-200/40 pt-3.5">
                                                    <Calendar className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-[11.5px] text-neutral-400 font-bold leading-tight">Ngày chỉ định / Ngày tạo đơn</p>
                                                        <p className="text-[13px] font-extrabold text-neutral-800 mt-0.5">{selectedPatient.orderDate || 'May 17, 2026 - 10:30 AM'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 3. Clinical Information */}
                                        {selectedPatient.clinicalNote && (
                                            <div className="space-y-2.5">
                                                <h4 className="text-[11px] font-bold text-neutral-450 uppercase tracking-wider">Thông tin lâm sàng</h4>
                                                <div className="bg-blue-50/60 border border-blue-100/70 rounded-2xl p-4 flex items-start gap-3">
                                                    <AlertCircle className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
                                                    <p className="text-[12.5px] font-semibold text-blue-800 leading-relaxed">
                                                        {selectedPatient.clinicalNote}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* 4. Verification QR / Barcode Card */}
                                        {selectedPatient.status === 'Đã Tiếp Nhận' && (
                                            <div className="space-y-2.5">
                                                <h4 className="text-[11px] font-bold text-neutral-450 uppercase tracking-wider">Mã xác thực</h4>
                                                <div className="border-2 border-dashed border-neutral-200 rounded-[20px] p-6 flex flex-col items-center justify-center text-center relative overflow-hidden bg-white select-none">
                                                    {isVerifying ? (
                                                        <div className="py-6 flex flex-col items-center justify-center space-y-3">
                                                            <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                                                            <p className="text-xs font-semibold text-neutral-500">Đang đối chiếu dữ liệu...</p>
                                                        </div>
                                                    ) : qrVerified ? (
                                                        <div className="py-4 flex flex-col items-center justify-center space-y-2.5">
                                                            <div className="w-12 h-12 rounded-full bg-emerald-55 flex items-center justify-center border-4 border-emerald-50 text-white shadow-sm">
                                                                <Check className="w-6 h-6" strokeWidth={3} />
                                                            </div>
                                                            <p className="text-[13px] font-extrabold text-emerald-800">
                                                                Xác thực thành công bệnh nhân
                                                            </p>
                                                            <p className="text-[11px] text-neutral-400 font-semibold">
                                                                Vòng đeo tay ID khớp 100% với đơn chỉ định
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div 
                                                            onClick={() => handleQrScanInteractive(selectedPatient)}
                                                            className="flex flex-col items-center justify-center w-full cursor-pointer hover:bg-neutral-50/50 py-2.5 rounded-xl transition"
                                                        >
                                                            <QrCode className="w-16 h-16 text-neutral-700" strokeWidth={1.5} />
                                                            <p className="text-[12.5px] font-bold text-neutral-700 mt-3">
                                                                Quét mã xác thực bệnh nhân
                                                            </p>
                                                            <p className="text-[10px] text-neutral-400 font-semibold mt-1">
                                                                (Nhấn để giả lập quét vòng tay bệnh nhân)
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div className="w-full border-t border-neutral-100 mt-4 pt-4 flex justify-center">
                                                        <button
                                                            onClick={() => handlePrintBarcodeInteractive(selectedPatient)}
                                                            disabled={isPrinting || barcodePrinted}
                                                            className={cn(
                                                                "h-9 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer border transition-all",
                                                                barcodePrinted 
                                                                    ? "bg-emerald-50 border-emerald-100 text-emerald-600 cursor-not-allowed" 
                                                                    : "bg-white border-neutral-250 text-neutral-700 hover:bg-neutral-50 shadow-3xs"
                                                            )}
                                                        >
                                                            {isPrinting ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : barcodePrinted ? (
                                                                <Check className="w-3.5 h-3.5" />
                                                            ) : (
                                                                <Printer className="w-3.5 h-3.5" />
                                                            )}
                                                            {barcodePrinted ? "Đã in mã xác thực" : "In mã xác thực"}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 5. Completed Results in View Mode */}
                                        {selectedPatient.status === 'Hoàn Thành' && (
                                            <div className="space-y-2.5 pt-2 border-t border-neutral-100">
                                                <h4 className="text-[11px] font-bold text-neutral-450 uppercase tracking-wider">Kết quả xét nghiệm</h4>
                                                <div className="p-4.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-3.5">
                                                    <div>
                                                        <p className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider">Trị số đo</p>
                                                        <p className="text-lg font-black text-emerald-850 mt-1">{selectedPatient.resultValue}</p>
                                                    </div>
                                                    {selectedPatient.resultNotes && (
                                                        <div className="border-t border-emerald-100/50 pt-2.5">
                                                            <p className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider">Ghi chú / Kết luận</p>
                                                            <p className="text-xs font-semibold text-emerald-800/90 mt-1 leading-relaxed">{selectedPatient.resultNotes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    /* Collecting sample details sub-view step */
                                    <div className="space-y-5">
                                        <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/70">
                                            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Mẫu xét nghiệm</p>
                                            <p className="text-sm font-extrabold text-indigo-900 mt-1 leading-snug">{selectedPatient.test}</p>
                                            <p className="text-[11px] text-indigo-600 font-semibold mt-1">Bệnh nhân: {selectedPatient.name} • {selectedPatient.stt}</p>
                                        </div>

                                        {/* Tube Type Selection */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-neutral-600">Chọn Loại Ống Nghiệm</label>
                                            <div className="grid grid-cols-3 gap-2.5">
                                                {[
                                                    { name: 'EDTA (Nắp Tím)', color: '#8B5CF6', bg: 'bg-purple-50', border: 'border-purple-200' },
                                                    { name: 'Serum (Nắp Đỏ)', color: '#EF4444', bg: 'bg-red-50', border: 'border-red-200' },
                                                    { name: 'Heparin (Nắp Xanh Lá)', color: '#10B981', bg: 'bg-emerald-50', border: 'border-emerald-200' }
                                                ].map((t) => (
                                                    <button
                                                        key={t.name}
                                                        onClick={() => setTubeType(t.name)}
                                                        className={cn(
                                                            "p-3 rounded-xl border-2 text-center text-xs font-extrabold flex flex-col items-center gap-2 transition-all cursor-pointer",
                                                            tubeType === t.name 
                                                                ? `${t.bg} border-neutral-800` 
                                                                : 'bg-white border-neutral-100 hover:border-neutral-200'
                                                        )}
                                                    >
                                                        <div 
                                                            className="w-5 h-5 rounded-full border border-white shadow-3xs" 
                                                            style={{ backgroundColor: t.color }}
                                                        />
                                                        <span className="text-[10.5px] leading-tight text-neutral-700">{t.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Volume Selection */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-neutral-600">Thể Tích Mẫu Thu Thập</label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {['2 ml', '3 ml', '4 ml', '5 ml'].map((vol) => (
                                                    <button
                                                        key={vol}
                                                        onClick={() => setVolume(vol)}
                                                        className={cn(
                                                            "py-2.5 rounded-xl border text-center text-xs font-bold transition cursor-pointer",
                                                            volume === vol 
                                                                ? 'bg-[#8B7CF6] text-white border-transparent' 
                                                                : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                                                        )}
                                                    >
                                                        {vol}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Validation Checkbox */}
                                        <div 
                                            onClick={() => setLabelConfirmed(!labelConfirmed)}
                                            className={cn(
                                                "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none",
                                                labelConfirmed 
                                                    ? 'bg-emerald-50/30 border-emerald-500/70 text-emerald-900' 
                                                    : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-350'
                                            )}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition",
                                                labelConfirmed ? 'bg-emerald-500 border-transparent text-white' : 'border-neutral-300 bg-white'
                                            )}>
                                                {labelConfirmed && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                                            </div>
                                            <p className="text-[12px] font-semibold leading-snug">
                                                Tôi đã dán tem barcode (mã xác thực bệnh nhân) lên thành ống nghiệm và đối chiếu khớp thông tin họ tên bệnh nhân.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4.5 border-t border-neutral-100 bg-neutral-50/50 flex gap-3 justify-end">
                                {!collectingStep ? (
                                    <>
                                        <Button
                                            onClick={() => setActiveModal(null)}
                                            variant="outline"
                                            className="rounded-xl font-bold bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-100"
                                        >
                                            Hủy bỏ
                                        </Button>

                                        {selectedPatient.status === 'Đã Tiếp Nhận' && (
                                            <button
                                                onClick={() => setCollectingStep(true)}
                                                disabled={!qrVerified || !barcodePrinted}
                                                className={cn(
                                                    "h-10 px-5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition",
                                                    (qrVerified && barcodePrinted)
                                                        ? "bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white"
                                                        : "bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none"
                                                )}
                                            >
                                                <FlaskConical className="w-4 h-4" />
                                                Thu thập mẫu
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setCollectingStep(false)}
                                            className="px-4 py-2 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-500 transition cursor-pointer bg-white"
                                        >
                                            Quay lại
                                        </button>
                                        <button
                                            onClick={handleConfirmCollection}
                                            disabled={isSubmitting || !labelConfirmed}
                                            className={cn(
                                                "h-10 px-5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer",
                                                labelConfirmed
                                                    ? "bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white"
                                                    : "bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none"
                                            )}
                                        >
                                            {isSubmitting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4" />
                                            )}
                                            Xác nhận đã lấy mẫu
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Result Entry Modal */}
                    {activeModal === 'result' && (
                        <div className="bg-white rounded-[28px] border border-neutral-100 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
                            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-5.5 h-5.5 text-indigo-600" />
                                    <h3 className="font-bold text-neutral-800 text-base">Nhập kết quả xét nghiệm</h3>
                                </div>
                                <button
                                    onClick={() => setActiveModal(null)}
                                    className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100/50">
                                    <p className="text-xs font-bold text-indigo-900">{selectedPatient.name} • {selectedPatient.stt}</p>
                                    <p className="text-sm font-extrabold text-indigo-950 mt-1">{selectedPatient.test}</p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-neutral-600">Nhập trị số kết quả</label>
                                    <Input
                                        value={inputResultValue}
                                        onChange={(e) => setInputResultValue(e.target.value)}
                                        placeholder="Ví dụ: 5.6 % hoặc 4.5 T/L"
                                        className="h-11 rounded-xl text-sm font-semibold border-neutral-300"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-neutral-600">Ghi chú / Kết luận chuyên môn</label>
                                    <textarea
                                        value={inputResultNotes}
                                        onChange={(e) => setInputResultNotes(e.target.value)}
                                        placeholder="Nhập ghi chú hoặc kết luận..."
                                        className="w-full text-xs text-neutral-800 border border-neutral-200 rounded-xl p-3 focus:border-[#8B7CF6] outline-none min-h-20 resize-none"
                                    />
                                </div>
                            </div>
                            <div className="p-6 border-t border-neutral-100 bg-neutral-50/50 flex gap-3 justify-end">
                                <Button
                                    onClick={() => setActiveModal(null)}
                                    variant="outline"
                                    className="rounded-xl font-bold bg-white"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    onClick={handleSaveResult}
                                    isLoading={isSubmitting}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold px-6 shadow-sm shrink-0"
                                >
                                    Trả kết quả
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </EMRWorkspaceLayout>
    );
}
