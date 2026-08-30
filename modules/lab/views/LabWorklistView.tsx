'use client';

import React, { useState } from 'react';
import {
    Search,
    Eye,
    Upload,
    Printer,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw,
    Clock,
    User,
    Compass,
    Volume2,
    UserX,
    QrCode,
    Play,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
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
import { useLab } from '../hooks/useLab';
import { QUEUE_TYPE_MAP } from '@/modules/kiosk/utils/flowHelpers';
import PatientDetailsModal from '../modals/PatientDetailsModal';
import OverrideConfirmModal from '../modals/OverrideConfirmModal';
import RefuseConfirmModal from '../modals/RefuseConfirmModal';
import CompleteConfirmModal from '../modals/CompleteConfirmModal';
import { StaffQRScanModal } from '@/shared/components/modals/StaffQRScanModal';

export default function LabWorklistView() {
    const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
    const [isScanModalOpen, setIsScanModalOpen] = React.useState(false);
    const {
        mounted,
        accessToken,
        search,
        setSearch,
        activeListTab,
        setActiveListTab,
        toasts,
        selectedPatient,
        activeModal,
        setActiveModal,
        activeShift,
        isLoadingQueue,
        mergedQueueLists,
        handleRefresh,
        handleOpenViewModal,
        isCallingNext,
        handleCallNext,
        isCompleting,
        handleCompleteQueue,
        isCompletingDetail,
        handleCompleteOrderDetail,
        isRecalling,
        handleRecallQueue,
        overrideConfirmData,
        setOverrideConfirmData,
        isOverriding,
        handleOpenOverrideConfirm,
        handleConfirmOverride,
        refuseConfirmData,
        setRefuseConfirmData,
        isRefusing,
        handleOpenRefuseConfirm,
        handleConfirmRefuse,
        completeConfirmData,
        setCompleteConfirmData,
        handleOpenCompleteConfirm,
        handleConfirmComplete,
        handleScanTicket,
        handleStartServing,
    } = useLab();

    if (!mounted || !accessToken) {
        return (
            <div className="flex-1 flex items-center justify-center bg-neutral-50/50 min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B7CF6]"></div>
            </div>
        );
    }

    const currentList = mergedQueueLists[activeListTab] || [];

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
                                        "p-4 rounded-2xl shadow-lg border text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top-2 duration-200",
                                        toast.type === 'success' ? "bg-emerald-50 text-emerald-800 border-emerald-200/80" :
                                            toast.type === 'error' ? "bg-rose-50 text-rose-800 border-rose-200/80" :
                                                "bg-blue-50 text-blue-800 border-blue-200/80"
                                    )}
                                >
                                    {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                                    {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                                    <span>{toast.message}</span>
                                </div>
                            ))}
                        </div>

                        {/* Header Panel */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h1 className="text-xl font-black text-neutral-800 tracking-tight">
                                        Tiếp Nhận & Xét Nghiệm
                                    </h1>
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide uppercase bg-[#8B7CF6]/10 text-[#8B7CF6] border border-[#8B7CF6]/20">
                                        KỸ THUẬT VIÊN
                                    </span>
                                </div>
                                <p className="text-xs text-neutral-450 mt-1 font-medium">
                                    {activeShift?.room?.room_name || 'Phòng xét nghiệm'} · Ca trực: {activeShift ? `${activeShift.start_time} - ${activeShift.end_time}` : 'Chưa xếp ca'}
                                </p>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <Button
                                    variant="outline"
                                    onClick={handleRefresh}
                                    disabled={isLoadingQueue}
                                    isLoading={isLoadingQueue}
                                    startIcon={isLoadingQueue ? undefined : <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />}
                                    className="h-9 px-4 rounded-xl border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-extrabold text-xs shadow-xs cursor-pointer"
                                >
                                    Làm mới hàng chờ
                                </Button>
                            </div>
                        </div>

                        {/* Search & Tabs Layout */}
                        <div className="flex flex-col gap-4.5 mb-6 mt-6">
                            {/* Search Box */}
                            <div className="w-full md:max-w-md">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-450" />
                                    <input
                                        type="text"
                                        placeholder="Tìm họ tên, số thứ tự..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full h-11 pl-11 pr-4 bg-white border border-neutral-200 hover:border-neutral-350 focus:border-neutral-400 rounded-full text-[13px] text-neutral-800 placeholder-neutral-400 outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>

                            {/* Section Switcher Tabs & Call Patient Button */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-100 pb-1.5 gap-4">
                                <div className="flex items-center gap-1.5 select-none overflow-x-auto">
                                    {[
                                        { id: 'waiting', label: 'Hàng đợi', count: mergedQueueLists.waiting.length },
                                        { id: 'missing', label: 'Lỡ Lượt', count: mergedQueueLists.missing.length },
                                        { id: 'completed', label: 'Đã Hoàn Thành', count: mergedQueueLists.completed.length },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveListTab(tab.id as any)}
                                            className={cn(
                                                "px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer",
                                                activeListTab === tab.id
                                                    ? "bg-[#8B7CF6]/10 text-[#8B7CF6]"
                                                    : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
                                            )}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                {tab.label}
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[9px] font-black",
                                                    activeListTab === tab.id
                                                        ? "bg-[#8B7CF6] text-white"
                                                        : "bg-neutral-100 text-neutral-550"
                                                )}>
                                                    {tab.count}
                                                </span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                <div className="shrink-0 flex items-center gap-2 pb-1 sm:pb-0">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsScanModalOpen(true)}
                                        disabled={!activeShift}
                                        startIcon={<QrCode className="w-4 h-4 text-purple-600" />}
                                        className="h-9 rounded-xl px-4 border border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-purple-700 font-extrabold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                                    >
                                        Quét mã QR
                                    </Button>
                                    <Button
                                        onClick={handleCallNext}
                                        disabled={isCallingNext || !activeShift}
                                        isLoading={isCallingNext}
                                        startIcon={isCallingNext ? undefined : <Volume2 className="w-4 h-4" />}
                                        className="h-9 rounded-xl px-4 bg-[#8B7CF6] hover:bg-[#7C6CF5] text-white font-extrabold text-xs shadow-md shadow-purple-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border-0"
                                    >
                                        Gọi xét nghiệm
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Main Grid / Tables */}
                        <div className="bg-white rounded-3xl border border-neutral-100 shadow-[0_2px_16px_rgba(0,0,0,0.01)] overflow-hidden">
                            {isLoadingQueue ? (
                                <div className="py-20 flex flex-col items-center justify-center space-y-3.5">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                                    <p className="text-xs text-neutral-450 font-bold">Đang tải dữ liệu hàng chờ phòng xét nghiệm...</p>
                                </div>
                            ) : currentList.length === 0 ? (
                                <div className="py-20 text-center flex flex-col items-center justify-center space-y-2">
                                    <Clock className="w-9 h-9 text-neutral-300" />
                                    <p className="text-sm text-neutral-400 font-semibold">
                                        Không tìm thấy bệnh nhân nào trong danh sách.
                                    </p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent cursor-default border-b border-neutral-100">
                                            <TableHead className="w-24 pl-8 text-[11.5px] font-extrabold text-neutral-500 py-3.5">SỐ TT</TableHead>
                                            <TableHead className="text-[11.5px] font-extrabold text-neutral-500 py-3.5">HỌ TÊN BỆNH NHÂN</TableHead>

                                            {activeListTab === 'waiting' && (
                                                <>
                                                    <TableHead className="text-[11.5px] font-extrabold text-neutral-500 py-3.5">GIỜ VÀO</TableHead>
                                                    <TableHead className="text-[11.5px] font-extrabold text-neutral-500 py-3.5">THỜI GIAN ĐÃ CHỜ</TableHead>
                                                </>
                                            )}

                                            {activeListTab === 'completed' && (
                                                <TableHead className="text-[11.5px] font-extrabold text-neutral-500 py-3.5">GIỜ HOÀN THÀNH</TableHead>
                                            )}

                                            {activeListTab === 'missing' && (
                                                <TableHead className="text-[11.5px] font-extrabold text-neutral-500 py-3.5">GIỜ LỠ LƯỢT</TableHead>
                                            )}

                                            <TableHead className="text-[11.5px] font-extrabold text-neutral-500 py-3.5 text-right pr-8">THAO TÁC</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {currentList.map((patient, index) => {
                                            const isDraggable = activeListTab === 'waiting' && patient.localStatus !== 'SERVING' && (patient.localStatus as any) !== 'CALLED';
                                            const isCalled = (patient.localStatus as any) === 'CALLED';
                                            return (
                                                <TableRow
                                                    key={patient.queue_id}
                                                    draggable={isDraggable}
                                                    onDragStart={(e) => {
                                                        if (isDraggable) {
                                                            e.dataTransfer.setData('text/plain', index.toString());
                                                        }
                                                    }}
                                                    onDragOver={(e) => {
                                                        if (activeListTab === 'waiting' && patient.localStatus !== 'SERVING' && !isCalled) {
                                                            e.preventDefault();
                                                            setDragOverIndex(index);
                                                        }
                                                    }}
                                                    onDragLeave={() => setDragOverIndex(null)}
                                                    onDrop={(e) => {
                                                        setDragOverIndex(null);
                                                        if (activeListTab === 'waiting') {
                                                            const draggedIdxStr = e.dataTransfer.getData('text/plain');
                                                            if (draggedIdxStr) {
                                                                const draggedIdx = parseInt(draggedIdxStr, 10);
                                                                if (draggedIdx !== index && patient.localStatus !== 'SERVING' && !isCalled) {
                                                                    handleOpenOverrideConfirm(draggedIdx, index);
                                                                }
                                                            }
                                                        }
                                                    }}
                                                    className={cn(
                                                        "group transition-colors duration-150 border-b border-neutral-50 last:border-b-0",
                                                        isCalled
                                                            ? "bg-amber-50/40 hover:bg-amber-50/70"
                                                            : patient.localStatus === 'SERVING'
                                                            ? "bg-blue-50/30 hover:bg-blue-100/50"
                                                            : "hover:bg-[#8B7CF6]/5",
                                                        isDraggable ? "cursor-grab active:cursor-grabbing" : "",
                                                        dragOverIndex === index ? "bg-amber-55 bg-amber-50/50 border-t-2 border-t-amber-400" : ""
                                                    )}
                                                >
                                                    {/* STT */}
                                                    <TableCell className="font-extrabold text-neutral-800 text-sm pl-8 py-3.5">
                                                        {patient.queue_number}
                                                    </TableCell>

                                                    {/* Name */}
                                                    <TableCell className="py-3.5 font-bold text-neutral-800 text-sm">
                                                        <div className="flex flex-col gap-1">
                                                            <span>{patient.patient_name}</span>
                                                            {patient.service_order?.details && (
                                                                <div className="flex flex-wrap gap-1.5 mt-0.5">
                                                                    {patient.service_order.details.map((detail: any, idx: number) => (
                                                                        <span
                                                                            key={detail.service_order_detail_id || idx}
                                                                            className={cn(
                                                                                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                                                                detail.status === 'COMPLETED'
                                                                                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-700"
                                                                                    : detail.status === 'PAID'
                                                                                    ? "bg-blue-50/50 border-blue-100 text-blue-700"
                                                                                    : "bg-amber-50/50 border-amber-100 text-amber-700"
                                                                            )}
                                                                        >
                                                                            {detail.service_name || detail.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    {/* Conditional Columns based on Tab */}
                                                    {activeListTab === 'waiting' && (
                                                        <>
                                                            <TableCell className="py-3.5 text-xs text-neutral-500 font-semibold">
                                                                {patient.enqueued_at ? (() => {
                                                                    try {
                                                                        const d = new Date(patient.enqueued_at);
                                                                        return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                                                                    } catch {
                                                                        return '—';
                                                                    }
                                                                })() : '—'}
                                                            </TableCell>
                                                            <TableCell className="py-3.5 text-xs font-bold text-[#8B7CF6]">
                                                                {isCalled ? (
                                                                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-300 bg-amber-100 text-amber-900 uppercase tracking-wider animate-pulse">
                                                                        Đang gọi vào phòng
                                                                    </span>
                                                                ) : patient.localStatus === 'SERVING' ? (
                                                                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-600 uppercase tracking-wider">
                                                                        Đang xét nghiệm
                                                                    </span>
                                                                ) : (
                                                                    `${patient.waited_minutes} phút`
                                                                )}
                                                            </TableCell>
                                                        </>
                                                    )}

                                                    {activeListTab === 'missing' && (
                                                        <TableCell className="py-3.5 text-xs text-rose-500 font-semibold">
                                                            {patient.missed_at ? (() => {
                                                                try {
                                                                    const d = new Date(patient.missed_at);
                                                                    return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                                                                } catch {
                                                                    return '—';
                                                                }
                                                            })() : '—'}
                                                        </TableCell>
                                                    )}

                                                    {activeListTab === 'completed' && (
                                                        <TableCell className="py-3.5 text-xs text-neutral-600 font-semibold">
                                                            {patient.finished_at ? (() => {
                                                                try {
                                                                    const d = new Date(patient.finished_at);
                                                                    return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                                                                } catch {
                                                                    return '—';
                                                                }
                                                            })() : (patient.resultValue || '—')}
                                                        </TableCell>
                                                    )}

                                                    {/* Actions */}
                                                    <TableCell className="text-right pr-8 py-3.5">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {isCalled && (
                                                                <>
                                                                    <Button
                                                                        type="button"
                                                                        onClick={() => handleOpenRefuseConfirm(patient)}
                                                                        disabled={isRefusing}
                                                                        className="h-8 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11.5px] font-extrabold shadow-3xs shrink-0 cursor-pointer"
                                                                    >
                                                                        Vắng mặt
                                                                    </Button>
                                                                    <Button
                                                                        onClick={() => handleStartServing(patient.queue_id)}
                                                                        className="h-8 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11.5px] font-extrabold shadow-xs shrink-0 cursor-pointer gap-1 border-0"
                                                                    >
                                                                        <Play className="w-3 h-3 fill-current" />
                                                                        Bắt đầu thực hiện
                                                                    </Button>
                                                                </>
                                                            )}
                                                            {!isCalled && patient.localStatus === 'SERVING' && (
                                                                <>
                                                                    <Button
                                                                        type="button"
                                                                        onClick={() => handleOpenRefuseConfirm(patient)}
                                                                        disabled={isRefusing}
                                                                        className="h-8 px-3.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11.5px] font-extrabold shadow-3xs shrink-0 cursor-pointer"
                                                                    >
                                                                        Từ chối
                                                                    </Button>
                                                                    <Button
                                                                        onClick={() => handleOpenCompleteConfirm(patient)}
                                                                        disabled={isCompleting}
                                                                        isLoading={isCompleting}
                                                                        className="h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11.5px] font-extrabold shadow-xs shrink-0 cursor-pointer gap-1.5 border-0"
                                                                    >
                                                                        Hoàn thành
                                                                    </Button>
                                                                </>
                                                            )}
                                                            {activeListTab === 'missing' && (
                                                                <Button
                                                                    onClick={() => handleRecallQueue(patient.queue_id)}
                                                                    disabled={isRecalling}
                                                                    isLoading={isRecalling}
                                                                    className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11.5px] font-extrabold shadow-xs shrink-0 cursor-pointer gap-1.5 border-0"
                                                                >
                                                                    Gọi lại
                                                                </Button>
                                                            )}
                                                            <Button
                                                                onClick={() => handleOpenViewModal(patient)}
                                                                startIcon={<Eye className="w-3.5 h-3.5" />}
                                                                className="h-8 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11.5px] font-bold shadow-xs shrink-0 cursor-pointer gap-1.5 border-0"
                                                            >
                                                                Xem chi tiết
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <PatientDetailsModal
                isOpen={activeModal === 'view'}
                onClose={() => setActiveModal(null)}
                selectedPatient={selectedPatient}
                onCompleteOrderDetail={handleCompleteOrderDetail}
                isCompletingDetail={isCompletingDetail}
                onRefuseQueue={handleOpenRefuseConfirm}
                onCompleteQueue={handleOpenCompleteConfirm}
            />

            <OverrideConfirmModal
                isOpen={overrideConfirmData !== null}
                onClose={() => setOverrideConfirmData(null)}
                data={overrideConfirmData}
                onConfirm={handleConfirmOverride}
                isLoading={isOverriding}
            />

            <RefuseConfirmModal
                isOpen={refuseConfirmData !== null}
                onClose={() => setRefuseConfirmData(null)}
                data={refuseConfirmData}
                onConfirm={handleConfirmRefuse}
                isLoading={isRefusing}
            />

            <CompleteConfirmModal
                isOpen={completeConfirmData !== null}
                onClose={() => setCompleteConfirmData(null)}
                data={completeConfirmData}
                onConfirm={handleConfirmComplete}
                isLoading={isCompleting}
            />

            {/* Modal Quét mã QR */}
            <StaffQRScanModal
                isOpen={isScanModalOpen}
                onClose={() => setIsScanModalOpen(false)}
                title="Quét mã QR phiếu xét nghiệm"
                subtitle={activeShift?.room?.room_name}
                inputLabel="Mã vé / Mã QR phiếu chỉ định"
                inputPlaceholder="VD: TK-20260830-XXXX..."
                onScanSuccess={async (ticketCode) => {
                    return handleScanTicket(ticketCode);
                }}
            />
        </EMRWorkspaceLayout>
    );
}
