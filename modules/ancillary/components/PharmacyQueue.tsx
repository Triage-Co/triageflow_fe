'use client';

import React, { useState, useEffect } from 'react';
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
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm flex flex-col h-full">
            {/* Header & QR Scan Input */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            <Pill className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            Hàng Đợi Nhà Thuốc
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            Quét mã QR hoặc nhập mã đơn thuốc để xử lý
                        </p>
                    </div>

                    <button
                        onClick={() => fetchQueue(false)}
                        disabled={loading}
                        className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Làm mới hàng đợi"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* QR Scanner Form */}
                <form onSubmit={handleScanSubmit} className="relative">
                    <QrCode className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" />
                    <input
                        type="text"
                        placeholder="Quét mã QR / Nhập mã RX-..."
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        className="w-full pl-10 pr-24 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
                    />
                    <button
                        type="submit"
                        disabled={scanning || !scanInput.trim()}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                    >
                        {scanning ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Tra cứu'}
                    </button>
                </form>

                {scanError && (
                    <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{scanError}</span>
                    </div>
                )}

                {/* Status Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar pt-1">
                    <button
                        onClick={() => setActiveStatus('ALL')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                            activeStatus === 'ALL'
                                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                        }`}
                    >
                        Tất cả ({prescriptions.length})
                    </button>
                    <button
                        onClick={() => setActiveStatus('PENDING')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                            activeStatus === 'PENDING'
                                ? 'bg-neutral-600 text-white'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                        }`}
                    >
                        Chờ nhận đơn ({countByStatus('PENDING')})
                    </button>
                    <button
                        onClick={() => setActiveStatus('PROCESSING')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                            activeStatus === 'PROCESSING'
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                        }`}
                    >
                        Cần soạn ({countByStatus('PROCESSING')})
                    </button>
                    <button
                        onClick={() => setActiveStatus('PREPARED')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                            activeStatus === 'PREPARED'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
                        }`}
                    >
                        Sẵn sàng giao ({countByStatus('PREPARED')})
                    </button>
                    <button
                        onClick={() => setActiveStatus('DISPENSED')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                            activeStatus === 'DISPENSED'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
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
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        <p className="text-xs">Đang tải danh sách đơn thuốc...</p>
                    </div>
                ) : displayList.length === 0 ? (
                    <div className="py-12 text-center text-neutral-400 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
                        <Pill className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs font-medium">Không có đơn thuốc nào trong hàng đợi</p>
                    </div>
                ) : (
                    displayList.map((item) => {
                        const isSelected = item.prescription_id === selectedPrescriptionId;
                        return (
                            <div
                                key={item.prescription_id}
                                onClick={() => onSelectPrescription(item)}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                    isSelected
                                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 shadow-sm'
                                        : 'bg-neutral-50/50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                            {item.prescription_code}
                                        </span>
                                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5 text-neutral-400" />
                                            {item.patient_name || 'Bệnh nhân khám ngoại trú'}
                                        </h4>
                                    </div>
                                    {getStatusBadge(item.status)}
                                </div>

                                <div className="mt-2.5 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                                    <span>
                                        {item.prescriptionDetails?.length || 0} loại thuốc
                                    </span>
                                    <span className="font-bold text-neutral-900 dark:text-white">
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
