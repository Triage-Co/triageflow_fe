'use client';

import React, { useState, useEffect } from 'react';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { Pill, Search, Clock, CheckCircle2, PackageCheck, CreditCard, RefreshCw, AlertCircle, User } from 'lucide-react';
import { Prescription, PrescriptionStatusEnum } from '@/shared/types/prescription.types';
import { pharmacyService } from '@/modules/ancillary/services/pharmacyService';

export default function PharmacyPatientsPage() {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<PrescriptionStatusEnum | 'ALL'>('ALL');

    const fetchPatientsList = async () => {
        setLoading(true);
        try {
            const list = await pharmacyService.getPrescriptions();
            setPrescriptions(list);
        } catch (err) {
            console.error('[PharmacyPatientsPage] Failed to fetch list:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatientsList();
    }, []);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // 1. Action: Prepare Medicines (Bốc/soạn thuốc - Allowed after payment)
    const handlePrepare = async (prescriptionId: string) => {
        setActionLoadingId(prescriptionId);
        try {
            const updated = await pharmacyService.preparePrescription(prescriptionId);
            showToast(`Đã bốc/soạn xong thuốc cho đơn ${updated.prescription_code}!`);
            fetchPatientsList();
        } catch (err: any) {
            alert(err?.message || 'Không thể soạn thuốc');
        } finally {
            setActionLoadingId(null);
        }
    };

    // 2. Action: Dispense Medicines to Patient
    const handleDispense = async (prescriptionId: string) => {
        setActionLoadingId(prescriptionId);
        try {
            const updated = await pharmacyService.dispensePrescription(prescriptionId);
            showToast(`Đã giao thuốc thành công cho bệnh nhân đơn ${updated.prescription_code}!`);
            fetchPatientsList();
        } catch (err: any) {
            alert(err?.message || 'Không thể giao thuốc');
        } finally {
            setActionLoadingId(null);
        }
    };

    // Filter strictly to ONLY PAID prescriptions (PROCESSING, PREPARED, DISPENSED)
    // Exclude PENDING, CANCELLED, EXPIRED
    const paidPrescriptions = prescriptions.filter(
        (p) => p.status === 'PROCESSING' || p.status === 'PREPARED' || p.status === 'DISPENSED'
    );

    const filteredList = paidPrescriptions.filter((p) => {
        if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return (
                p.prescription_code.toLowerCase().includes(q) ||
                p.patient_name?.toLowerCase().includes(q) ||
                p.patient_code?.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const getStatusBadge = (status: PrescriptionStatusEnum) => {
        switch (status) {
            case 'PROCESSING':
                return (
                    <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 animate-pulse" />
                        Đã thanh toán (Sẵn sàng bốc thuốc)
                    </span>
                );
            case 'PREPARED':
                return (
                    <span className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1.5">
                        <PackageCheck className="w-3.5 h-3.5" />
                        Đã soạn xong (Chờ nhận)
                    </span>
                );
            case 'DISPENSED':
                return (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đã giao thuốc thành công
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <EMRWorkspaceLayout activeTabId="pharmacy_patients" activeTabName="Danh Sách Dược Phẩm">
            <div className="flex-1 p-6 overflow-y-auto max-w-6xl mx-auto w-full space-y-6">
                {/* Toast message */}
                {toastMessage && (
                    <div className="fixed top-6 right-6 z-50 bg-emerald-50 border border-emerald-200 rounded-[18px] p-4 text-emerald-900 shadow-xl flex items-center gap-3 animate-in fade-in">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold">{toastMessage}</span>
                    </div>
                )}

                {/* Header Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            <Pill className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            Danh Sách Bệnh Nhân Cấp Phát Dược
                        </h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                            Chỉ hiển thị bệnh nhân đã thanh toán xong đơn thuốc · Ẩn đơn chờ thanh toán, hủy & quá hạn
                        </p>
                    </div>

                    <button
                        onClick={fetchPatientsList}
                        disabled={loading}
                        className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>Làm mới danh sách</span>
                    </button>
                </div>

                {/* Search Bar & Status Filters */}
                <div className="bg-white dark:bg-neutral-900 rounded-[24px] border border-neutral-200/60 dark:border-neutral-800 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full md:w-80">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Tìm bệnh nhân, mã LK, RX-..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
                        />
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 no-scrollbar">
                        <button
                            onClick={() => setStatusFilter('ALL')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                                statusFilter === 'ALL'
                                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                            }`}
                        >
                            Tất cả đơn đã trả tiền ({paidPrescriptions.length})
                        </button>

                        <button
                            onClick={() => setStatusFilter('PROCESSING')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                                statusFilter === 'PROCESSING'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                            }`}
                        >
                            Đã thanh toán - Cần bốc thuốc ({paidPrescriptions.filter((p) => p.status === 'PROCESSING').length})
                        </button>

                        <button
                            onClick={() => setStatusFilter('PREPARED')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                                statusFilter === 'PREPARED'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                            }`}
                        >
                            Sẵn sàng giao ({paidPrescriptions.filter((p) => p.status === 'PREPARED').length})
                        </button>

                        <button
                            onClick={() => setStatusFilter('DISPENSED')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                                statusFilter === 'DISPENSED'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            }`}
                        >
                            Đã giao ({paidPrescriptions.filter((p) => p.status === 'DISPENSED').length})
                        </button>
                    </div>
                </div>

                {/* Patient List Cards */}
                <div className="bg-white dark:bg-neutral-900 rounded-[24px] border border-neutral-200/60 dark:border-neutral-800 p-6 shadow-sm">
                    {loading ? (
                        <div className="py-16 text-center text-neutral-400">
                            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
                            <p className="text-xs font-semibold">Đang tải danh sách đơn thuốc đã thanh toán...</p>
                        </div>
                    ) : filteredList.length === 0 ? (
                        <div className="py-16 text-center text-neutral-400 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
                            <Pill className="w-8 h-8 mx-auto mb-2 opacity-30 text-indigo-500" />
                            <p className="text-xs font-medium">Không có bệnh nhân nào đã thanh toán trong danh sách</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredList.map((p, idx) => {
                                const isLoadingThis = actionLoadingId === p.prescription_id;
                                const isPaidProcessing = p.status === 'PROCESSING';
                                const isPrepared = p.status === 'PREPARED';
                                const isDispensed = p.status === 'DISPENSED';

                                return (
                                    <div
                                        key={p.prescription_id}
                                        className="p-4 rounded-2xl bg-neutral-50/70 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-neutral-300 transition-colors"
                                    >
                                        <div className="flex items-start md:items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-[#8B7CF6] font-bold flex items-center justify-center shrink-0">
                                                {(idx + 1).toString().padStart(2, '0')}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-neutral-800 dark:text-white text-base">
                                                        {p.patient_name || 'Bệnh nhân chưa đặt tên'}
                                                    </h3>
                                                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                        ({p.patient_code || 'BN-001'})
                                                    </span>
                                                </div>
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">
                                                    Mã đơn: <strong className="text-neutral-700 dark:text-neutral-300 font-mono">{p.prescription_code}</strong> · {p.prescriptionDetails?.length || 0} loại thuốc ({p.total_amount?.toLocaleString('vi-VN')} đ)
                                                </p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-200 dark:border-neutral-700">
                                            {getStatusBadge(p.status)}

                                            {/* Button 1: Bốc/Soạn thuốc (CHỈ CHO ĐƠN ĐÃ THANH TOÁN PROCESSING) */}
                                            {isPaidProcessing && (
                                                <button
                                                    onClick={() => handlePrepare(p.prescription_id)}
                                                    disabled={isLoadingThis}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                                                >
                                                    {isLoadingThis ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
                                                    <span>Bốc/Soạn thuốc xong</span>
                                                </button>
                                            )}

                                            {/* Button 2: Giao thuốc cho Bệnh nhân (Cho đơn PREPARED) */}
                                            {isPrepared && (
                                                <button
                                                    onClick={() => handleDispense(p.prescription_id)}
                                                    disabled={isLoadingThis}
                                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                                                >
                                                    {isLoadingThis ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                    <span>Giao thuốc cho bệnh nhân</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </EMRWorkspaceLayout>
    );
}
