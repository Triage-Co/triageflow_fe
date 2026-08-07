'use client';

import React from 'react';
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
    Compass
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
import SampleCollectionModal from '../modals/SampleCollectionModal';
import ResultEntryModal from '../modals/ResultEntryModal';

export default function LabWorklistView() {
    const {
        mounted,
        accessToken,
        search,
        setSearch,
        activeListTab,
        setActiveListTab,
        toasts,
        selectedPatient,
        setSelectedPatient,
        activeModal,
        setActiveModal,
        inputResultValue,
        setInputResultValue,
        inputResultNotes,
        setInputResultNotes,
        isSubmitting,
        collectingStep,
        setCollectingStep,
        tubeType,
        setTubeType,
        volume,
        setVolume,
        labelConfirmed,
        setLabelConfirmed,
        activeShift,
        isLoadingShifts,
        isLoadingQueue,
        mergedQueueLists,
        handleRefresh,
        handlePrintBarcode,
        handleUpdateStatus,
        handleSaveResult,
        handleOpenViewModal,
        handleConfirmCollection,
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

                        {/* Shift Information Header */}
                        <div className="bg-[#F4F3FF]/70 border border-[#8B7CF6]/15 rounded-[22px] p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-full bg-[#8B7CF6]/10 flex items-center justify-center shrink-0">
                                    <Compass className="w-5 h-5 text-[#8B7CF6]" />
                                </div>
                                {isLoadingShifts ? (
                                    <div className="space-y-1">
                                        <div className="h-4 w-40 bg-neutral-200 animate-pulse rounded" />
                                        <div className="h-3.5 w-24 bg-neutral-200 animate-pulse rounded" />
                                    </div>
                                ) : activeShift ? (
                                    <div>
                                        <p className="text-[14px] font-extrabold text-[#2D2D2D] tracking-tight">
                                            Ca trực: {activeShift.room?.room_name || 'Phòng xét nghiệm'}
                                        </p>
                                        <p className="text-[11.5px] text-[#7B7B7B] font-semibold mt-0.5">
                                            Giờ trực: {activeShift.start_time} - {activeShift.end_time} • Ngày: {activeShift.date}
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-[14px] font-extrabold text-rose-600 tracking-tight">
                                            Không có ca trực hôm nay
                                        </p>
                                        <p className="text-[11.5px] text-[#7B7B7B] font-semibold mt-0.5">
                                            Bạn chưa được phân ca trực phòng xét nghiệm nào.
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleRefresh}
                                    disabled={isLoadingQueue || !activeShift}
                                    className="h-10 rounded-xl px-4 flex items-center gap-1.5 text-neutral-600 font-bold bg-white text-xs"
                                >
                                    <RefreshCw className={cn("w-3.5 h-3.5", isLoadingQueue && "animate-spin")} />
                                    Làm mới hàng chờ
                                </Button>
                            </div>
                        </div>

                        {/* Title Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-[20px] font-extrabold text-[#2D2D2D] tracking-tight">
                                    Quản lý hàng chờ xét nghiệm
                                </h1>
                                <p className="text-[12.5px] text-[#7B7B7B] mt-0.5 font-medium">
                                    Tải thông tin từ ca trực và xử lý bệnh nhân theo luồng queue
                                </p>
                            </div>
                        </div>

                        {/* Search & Tabs Layout */}
                        <div className="flex flex-col gap-4.5 mb-6">
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

                            {/* Section Switcher Tabs */}
                            <div className="flex items-center border-b border-neutral-100 gap-1.5 select-none overflow-x-auto pb-1.5">
                                {[
                                    { id: 'waiting', label: 'Đang Chờ', count: mergedQueueLists.waiting.length },
                                    { id: 'serving', label: 'Đang Phục Vụ', count: mergedQueueLists.serving.length },
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
                                            <TableHead className="text-[11.5px] font-extrabold text-neutral-500 py-3.5">ĐỐi TƯỢNG KHÁM</TableHead>

                                            {activeListTab === 'waiting' && (
                                                <>
                                                    <TableHead className="text-[11.5px] font-extrabold text-neutral-500 py-3.5">GIỜ VÀO</TableHead>
                                                    <TableHead className="text-[11.5px] font-extrabold text-neutral-500 py-3.5">THỜI GIAN ĐÃ CHỜ</TableHead>
                                                </>
                                            )}

                                            {activeListTab === 'serving' && (
                                                <>
                                                    <TableHead className="text-[11.5px] font-extrabold text-neutral-500 py-3.5">ỐNG NGHIỆM</TableHead>
                                                    <TableHead className="text-[11.5px] font-extrabold text-neutral-500 py-3.5">THỂ TÍCH</TableHead>
                                                </>
                                            )}

                                            {activeListTab === 'completed' && (
                                                <>
                                                    <TableHead className="text-[11.5px] font-extrabold text-neutral-500 py-3.5">KẾT QUẢ ĐO</TableHead>
                                                    <TableHead className="text-[11.5px] font-extrabold text-neutral-500 py-3.5">KẾT LUẬN / GHI CHÚ</TableHead>
                                                </>
                                            )}

                                            <TableHead className="text-[11.5px] font-extrabold text-neutral-500 py-3.5 text-right pr-8">THAO TÁC</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {currentList.map((patient) => (
                                            <TableRow
                                                key={patient.queue_id}
                                                className="group hover:bg-[#8B7CF6]/5 transition-colors duration-150 border-b border-neutral-50 last:border-b-0"
                                            >
                                                {/* STT */}
                                                <TableCell className="font-extrabold text-neutral-800 text-sm pl-8 py-3.5">
                                                    {patient.queue_number}
                                                </TableCell>

                                                {/* Name */}
                                                <TableCell className="py-3.5 font-bold text-neutral-800 text-sm">
                                                    {patient.patient_name}
                                                </TableCell>

                                                {/* Queue Type */}
                                                <TableCell className="py-3.5">
                                                    <span className={cn(
                                                        "text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider",
                                                        patient.queue_type === 'APPOINTMENT'
                                                            ? "bg-indigo-50 border-indigo-150 text-[#8B7CF6]"
                                                            : "bg-amber-50 border-amber-150 text-amber-600"
                                                    )}>
                                                        {QUEUE_TYPE_MAP[patient.queue_type] || patient.queue_type}
                                                    </span>
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
                                                            {patient.waited_minutes} phút
                                                        </TableCell>
                                                    </>
                                                )}

                                                {activeListTab === 'serving' && (
                                                    <>
                                                        <TableCell className="py-3.5 text-xs text-purple-650 font-bold">
                                                            {patient.tubeType || 'Chưa chọn'}
                                                        </TableCell>
                                                        <TableCell className="py-3.5 text-xs text-neutral-600 font-semibold">
                                                            {patient.volume || '—'}
                                                        </TableCell>
                                                    </>
                                                )}

                                                {activeListTab === 'completed' && (
                                                    <>
                                                        <TableCell className="py-3.5 text-sm font-black text-emerald-700">
                                                            {patient.resultValue || '—'}
                                                        </TableCell>
                                                        <TableCell className="py-3.5 text-xs text-neutral-500 font-semibold max-w-60 truncate" title={patient.resultNotes}>
                                                            {patient.resultNotes || '—'}
                                                        </TableCell>
                                                    </>
                                                )}

                                                {/* Actions */}
                                                <TableCell className="text-right pr-8 py-3.5">
                                                    <div className="inline-flex items-center gap-2">
                                                        {activeListTab === 'waiting' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handlePrintBarcode(patient)}
                                                                    title="In tem ống nghiệm"
                                                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
                                                                >
                                                                    <Printer className="w-4 h-4" />
                                                                </button>
                                                                <Button
                                                                    onClick={() => handleOpenViewModal(patient)}
                                                                    className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-xs shrink-0 cursor-pointer"
                                                                >
                                                                    Lấy mẫu
                                                                </Button>
                                                                <button
                                                                    onClick={() => handleUpdateStatus(patient.queue_id, 'MISSING')}
                                                                    title="Báo vắng mặt (Lỡ lượt)"
                                                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-rose-50 text-rose-500 transition cursor-pointer"
                                                                >
                                                                    <AlertCircle className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}

                                                        {activeListTab === 'serving' && (
                                                            <>
                                                                <Button
                                                                    onClick={() => {
                                                                        setSelectedPatient(patient);
                                                                        setInputResultValue('');
                                                                        setInputResultNotes('');
                                                                        setActiveModal('result');
                                                                    }}
                                                                    className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs shrink-0 cursor-pointer flex items-center gap-1"
                                                                >
                                                                    <Upload className="w-3 h-3" />
                                                                    Nhập kết quả
                                                                </Button>
                                                            </>
                                                        )}

                                                        {activeListTab === 'missing' && (
                                                            <Button
                                                                onClick={() => handleUpdateStatus(patient.queue_id, 'WAITING')}
                                                                className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs shrink-0 cursor-pointer"
                                                            >
                                                                Gọi lại hàng chờ
                                                            </Button>
                                                        )}

                                                        {activeListTab === 'completed' && (
                                                            <button
                                                                onClick={() => handleOpenViewModal(patient)}
                                                                title="Xem lại chi tiết"
                                                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <SampleCollectionModal
                isOpen={activeModal === 'view'}
                onClose={() => setActiveModal(null)}
                selectedPatient={selectedPatient}
                collectingStep={collectingStep}
                setCollectingStep={setCollectingStep}
                tubeType={tubeType}
                setTubeType={setTubeType}
                volume={volume}
                setVolume={setVolume}
                labelConfirmed={labelConfirmed}
                setLabelConfirmed={setLabelConfirmed}
                handleConfirmCollection={handleConfirmCollection}
                isSubmitting={isSubmitting}
            />

            <ResultEntryModal
                isOpen={activeModal === 'result'}
                onClose={() => setActiveModal(null)}
                selectedPatient={selectedPatient}
                inputResultValue={inputResultValue}
                setInputResultValue={setInputResultValue}
                inputResultNotes={inputResultNotes}
                setInputResultNotes={setInputResultNotes}
                handleSaveResult={handleSaveResult}
                isSubmitting={isSubmitting}
            />
        </EMRWorkspaceLayout>
    );
}
