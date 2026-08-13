'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    QrCode,
    Filter,
    Clock,
    CheckCircle2,
    PackageCheck,
    Pill,
    AlertCircle,
    User,
    RefreshCw,
    ChevronRight,
    ArrowRight
} from 'lucide-react';
import { Prescription, PrescriptionStatusEnum } from '@/shared/types/prescription.types';
import { pharmacyService } from '../services/pharmacyService';

interface PharmacyQueueProps {
    onSelectPrescription: (prescription: Prescription) => void;
    selectedPrescriptionId?: string;
    refreshKey?: number;
}

export function PharmacyQueue({
    onSelectPrescription,
    selectedPrescriptionId,
    refreshKey = 0
}: PharmacyQueueProps) {
    const router = useRouter();
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeStatus, setActiveStatus] = useState<PrescriptionStatusEnum | 'ALL'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [scanInput, setScanInput] = useState('');
    const [scanning, setScanning] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);

    const fetchQueue = async (isSilent = false) => {
        if (!isSilent) {
            setLoading(true);
        }
        try {
            const list = await pharmacyService.getPrescriptions();
            const validList = list.filter((p) => p.status !== 'CANCELLED' && p.status !== 'EXPIRED');
            setPrescriptions(validList);
        } catch (err) {
            console.error('[PharmacyQueue] Failed to load queue:', err);
        } finally {
            if (!isSilent) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchQueue(prescriptions.length > 0);

        const timer = setInterval(() => {
            fetchQueue(true);
        }, 3000);

        const handlePaidSync = () => {
            fetchQueue(true);
        };

        window.addEventListener('storage', handlePaidSync);
        window.addEventListener('triageflow_prescription_paid', handlePaidSync);

        return () => {
            clearInterval(timer);
            window.removeEventListener('storage', handlePaidSync);
            window.removeEventListener('triageflow_prescription_paid', handlePaidSync);
        };
    }, [refreshKey]);

    const handleScanSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scanInput.trim()) return;

        setScanning(true);
        setScanError(null);
        try {
            // Extract code if JSON QR was scanned
            let codeToScan = scanInput.trim();
            if (codeToScan.startsWith('{')) {
                try {
                    const parsed = JSON.parse(codeToScan);
                    codeToScan = parsed.code || parsed.prescription_code || codeToScan;
                } catch {
                    // Ignore JSON parse error
                }
            }

            const prescription = await pharmacyService.scanPrescription(codeToScan);
            if (prescription) {
                onSelectPrescription(prescription);
                setScanInput('');
                fetchQueue(true);
            }
        } catch (err: any) {
            setScanError(err?.message || 'Không tìm thấy đơn thuốc tương ứng mã này');
        } finally {
            setScanning(false);
        }
    };

    const getStatusBadge = (status: PrescriptionStatusEnum) => {
        switch (status) {
            case 'PENDING':
                return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-neutral-500" />
                        Chờ nhận đơn
                    </span>
                );
            case 'PROCESSING':
                return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
                        <Pill className="w-3 h-3 animate-pulse" />
                        Đang soạn thuốc
                    </span>
                );
            case 'PREPARED':
                return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full">
                        <PackageCheck className="w-3 h-3" />
                        Đã soạn xong
                    </span>
                );
            case 'DISPENSED':
                return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Đã giao thuốc
                    </span>
                );
            case 'EXPIRED':
                return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 rounded-full">
                        Quá hạn 24h
                    </span>
                );
            case 'CANCELLED':
                return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-full">
                        Đã hủy
                    </span>
                );
            default:
                return null;
        }
    };

    const countByStatus = (status: PrescriptionStatusEnum) => {
        return prescriptions.filter((p) => p.status === status).length;
    };

    const displayList = prescriptions.filter((p) => {
        if (activeStatus !== 'ALL' && p.status !== activeStatus) return false;
        if (searchQuery.trim()) {
            const s = searchQuery.toLowerCase();
            return (
                p.prescription_code?.toLowerCase().includes(s) ||
                p.patient_name?.toLowerCase().includes(s) ||
                p.patient_code?.toLowerCase().includes(s)
            );
        }
        return true;
    });

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header & QR Scan Input */}
            <div className="space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-[18px] font-bold text-[#2D2D2D] tracking-tight flex items-center gap-2">
                            <Pill className="w-5 h-5 text-[#8B7CF6]" />
                            Hàng Đợi Nhà Thuốc
                        </h3>
                        <p className="text-[12px] text-[#7B7B7B] font-medium mt-0.5">
                            Quét mã QR hoặc nhập mã đơn thuốc để xử lý
                        </p>
                    </div>

                    <button
                        onClick={() => fetchQueue(false)}
                        disabled={loading}
                        className="p-2 text-neutral-400 hover:text-[#8B7CF6] rounded-xl hover:bg-[#F5F3FF] transition-colors cursor-pointer"
                        title="Làm mới hàng đợi"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* QR Scanner Form */}
                <form onSubmit={handleScanSubmit} className="relative">
                    <button
                        type="button"
                        onClick={() => router.push('/pharmacy/checkin')}
                        title="Đến màn hình tiếp nhận đơn tại quầy (Quét mã QR)"
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 text-[#8B7CF6] hover:text-[#7C6EE6] hover:bg-[#F5F3FF] rounded-xl transition-all cursor-pointer z-10"
                    >
                        <QrCode className="w-4 h-4" />
                    </button>
                    <input
                        type="text"
                        placeholder="Quét mã QR / Nhập mã RX-..."
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        className="w-full pl-10 pr-24 py-2.5 bg-[#FBFBFF] border border-neutral-200/80 rounded-2xl text-xs font-mono focus:outline-none focus:border-[#8B7CF6] focus:bg-white text-[#2D2D2D] transition-all font-semibold"
                    />
                    <button
                        type="submit"
                        disabled={scanning || !scanInput.trim()}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 bg-[#8B7CF6] hover:bg-[#7C6EE6] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                        {scanning ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Tra cứu'}
                    </button>
                </form>

                {scanError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{scanError}</span>
                    </div>
                )}

                {/* Status Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
                    <button
                        onClick={() => setActiveStatus('ALL')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                            activeStatus === 'ALL'
                                ? 'bg-[#8B7CF6] text-white shadow-sm'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
                        }`}
                    >
                        Tất cả ({prescriptions.length})
                    </button>
                    <button
                        onClick={() => setActiveStatus('PENDING')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                            activeStatus === 'PENDING'
                                ? 'bg-[#8B7CF6] text-white shadow-sm'
                                : 'bg-purple-50 text-[#8B7CF6] hover:bg-purple-100/70'
                        }`}
                    >
                        Chờ nhận đơn ({countByStatus('PENDING')})
                    </button>
                    <button
                        onClick={() => setActiveStatus('PROCESSING')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                            activeStatus === 'PROCESSING'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100/70'
                        }`}
                    >
                        Cần soạn ({countByStatus('PROCESSING')})
                    </button>
                    <button
                        onClick={() => setActiveStatus('PREPARED')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                            activeStatus === 'PREPARED'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100/70'
                        }`}
                    >
                        Sẵn sàng giao ({countByStatus('PREPARED')})
                    </button>
                    <button
                        onClick={() => setActiveStatus('DISPENSED')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                            activeStatus === 'DISPENSED'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70'
                        }`}
                    >
                        Đã giao ({countByStatus('DISPENSED')})
                    </button>
                </div>
            </div>

            {/* Prescriptions List */}
            <div className="mt-4 flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
                {loading ? (
                    <div className="py-12 text-center text-neutral-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#8B7CF6]" />
                        <p className="text-xs font-medium">Đang tải danh sách đơn thuốc...</p>
                    </div>
                ) : displayList.length === 0 ? (
                    <div className="py-12 text-center text-neutral-400 bg-[#FBFBFF] rounded-2xl border border-dashed border-neutral-200/80">
                        <Pill className="w-8 h-8 mx-auto mb-2 text-[#8B7CF6] opacity-40" />
                        <p className="text-xs font-bold text-neutral-500">Không có đơn thuốc nào trong hàng đợi</p>
                    </div>
                ) : (
                    displayList.map((item) => {
                        const isSelected = item.prescription_id === selectedPrescriptionId;
                        return (
                            <div
                                key={item.prescription_id}
                                onClick={() => onSelectPrescription(item)}
                                className={`p-3 px-4.5 rounded-[32px] border transition-all cursor-pointer ${
                                    isSelected
                                        ? 'bg-[#F5F3FF] border-[#8B7CF6] shadow-sm'
                                        : 'bg-[#FBFBFF] border-neutral-100 hover:border-[#8B7CF6]/40 hover:bg-[#F5F3FF]/40'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <span className="text-xs font-mono font-bold text-[#8B7CF6]">
                                            {item.prescription_code}
                                        </span>
                                        <h4 className="text-[13px] font-bold text-[#2D2D2D] mt-0.5 flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5 text-neutral-400" />
                                            {item.patient_name || 'Bệnh nhân khám ngoại trú'}
                                        </h4>
                                    </div>
                                    {getStatusBadge(item.status)}
                                </div>

                                <div className="mt-2 pt-1.5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-[#7B7B7B]">
                                    <span className="font-medium">
                                        {item.prescriptionDetails?.length || 0} loại thuốc
                                    </span>
                                    <span className="font-extrabold text-[#2D2D2D] text-xs">
                                        {item.total_amount?.toLocaleString('vi-VN')} đ
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
