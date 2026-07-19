'use client';

import { useState, useEffect } from 'react';
import {
    Plus,
    Loader2,
    AlertCircle,
    Play,
    Settings as SettingsIcon,
    Trash2,
    Search,
    Filter,
    Activity,
    CheckCircle2,
    X,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useProcessStore } from '../store/processStore';
import type { Flow } from '../types/process.types';
import { cn } from '@/lib/utils';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function getFlowName(flow: Flow): string {
    const firstStep = flow.steps?.[0];
    if (!firstStep) return 'Quy trình khám tổng quát';
    
    const roomName = firstStep.room_info?.room_name?.toLowerCase() || firstStep.room?.room_name?.toLowerCase() || '';
    const docNo = firstStep.docNo || '0000';

    if (roomName.includes('nhi') || roomName.includes('pediatric')) {
        return 'Quy trình khám Nhi khoa';
    }
    if (roomName.includes('cấp cứu') || roomName.includes('emergency') || roomName.includes('khẩn cấp')) {
        return 'Quy trình khám Ngoại khẩn cấp';
    }
    if (roomName.includes('nội') || roomName.includes('general')) {
        return 'Quy trình khám Nội thông thường';
    }
    if (roomName.includes('ngoại') || roomName.includes('surgical')) {
        return 'Quy trình khám Ngoại tổng quát';
    }
    return `Quy trình khám bệnh (Mã BN: ${docNo})`;
}

function getFlowUsage(flow: Flow): number {
    // Generate a consistent pseudo-random number based on flow_id for mockup fidelity
    let hash = 0;
    for (let i = 0; i < flow.flow_id.length; i++) {
        hash = flow.flow_id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 200) + 10;
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export function AdminProcessPage() {
    const { accessToken } = useAuthStore();
    const { flows, isLoading, error, fetchFlows } = useProcessStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RUNNING' | 'FINISHED'>('ALL');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    // Form states for Create Mock Workflow
    const [newFlowTitle, setNewFlowTitle] = useState('');
    const [newFlowSteps, setNewFlowSteps] = useState<string[]>(['Đăng ký', 'Thanh toán', 'Khám bác sĩ']);
    const [newStepInput, setNewStepInput] = useState('');

    useEffect(() => {
        if (accessToken) {
            fetchFlows(accessToken);
        }
    }, [accessToken, fetchFlows]);

    const handleRefresh = () => {
        if (accessToken) {
            fetchFlows(accessToken);
        }
    };

    // Filter flows
    const filteredFlows = flows.filter((flow) => {
        const flowName = getFlowName(flow).toLowerCase();
        const matchesSearch = 
            flowName.includes(searchQuery.toLowerCase()) ||
            flow.flow_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            flow.steps.some(s => s.docNo?.toString().includes(searchQuery));
            
        const matchesStatus = 
            statusFilter === 'ALL' || 
            flow.status?.toUpperCase() === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const handleCreateMockFlow = () => {
        if (!newFlowTitle.trim()) return;
        
        // Custom feedback
        alert(`Đã lưu thiết lập quy trình "${newFlowTitle}" vào hệ thống! (Tính năng này được giả lập thành công trên Frontend)`);
        setShowCreateModal(false);
        setNewFlowTitle('');
        setNewFlowSteps(['Đăng ký', 'Thanh toán', 'Khám bác sĩ']);
    };

    const addStepToCreateForm = () => {
        if (newStepInput.trim()) {
            setNewFlowSteps([...newFlowSteps, newStepInput.trim()]);
            setNewStepInput('');
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
            <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                
                {/* ── Header ── */}
                <div className="p-6 border-b border-[#EBEBEB] flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
                    <div>
                        <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                            Quy trình công việc
                        </h1>
                        <p className="text-[13px] text-[#7B7B7B] mt-1 font-medium">
                            Tạo và quản lý quy trình xử lý bệnh nhân tự động
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefresh}
                            className="px-4 py-2 border border-[#EBEBEB] hover:border-brand-300 text-[13px] font-bold text-[#7B7B7B] rounded-xl transition-all cursor-pointer bg-white"
                        >
                            Làm mới
                        </button>
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white text-[13px] font-bold rounded-xl hover:bg-brand-600 transition-colors shadow-sm cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            Tạo quy trình mới
                        </button>
                    </div>
                </div>

                {/* ── Sub-header Filters ── */}
                <div className="px-6 py-4 border-b border-[#F5F5F8] bg-[#FAFAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên quy trình, mã bệnh nhân..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white rounded-xl text-[13px] text-[#2D2D2D] font-medium border border-[#EBEBEB] outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all shadow-sm"
                        />
                    </div>

                    {/* Filter Status */}
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[12px] font-bold text-[#9C9C9C] uppercase tracking-wider flex items-center gap-1.5">
                            <Filter className="w-3.5 h-3.5" /> Bộ lọc:
                        </span>
                        <div className="flex p-0.5 bg-[#F0F0F4] rounded-lg">
                            {(['ALL', 'PENDING', 'RUNNING', 'FINISHED'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer',
                                        statusFilter === status
                                            ? 'bg-white text-[#2D2D2D] shadow-sm'
                                            : 'text-[#9C9C9C] hover:text-[#2D2D2D]'
                                    )}
                                >
                                    {status === 'ALL' && 'Tất cả'}
                                    {status === 'PENDING' && 'Chờ xử lý'}
                                    {status === 'RUNNING' && 'Đang chạy'}
                                    {status === 'FINISHED' && 'Hoàn thành'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Content Body ── */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAFC]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 text-neutral-400 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                            <p className="text-sm font-semibold">Đang tải danh sách quy trình...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
                            <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
                            <p className="text-sm font-bold text-red-700">Đã xảy ra lỗi</p>
                            <p className="text-xs text-neutral-500 mt-1 mb-4">{error}</p>
                            <button
                                onClick={handleRefresh}
                                className="px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-colors"
                            >
                                Thử lại
                            </button>
                        </div>
                    ) : filteredFlows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-[#EBEBEB] rounded-2xl bg-white max-w-lg mx-auto">
                            <Activity className="w-12 h-12 text-neutral-300 mb-3" />
                            <p className="text-[14px] font-bold text-[#2D2D2D]">Không có quy trình nào phù hợp</p>
                            <p className="text-[12px] text-[#9C9C9C] mt-1">
                                Thử thay đổi từ khóa tìm kiếm hoặc đổi bộ lọc trạng thái.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6 max-w-5xl mx-auto">
                            {filteredFlows.map((flow) => {
                                const title = getFlowName(flow);
                                const usage = getFlowUsage(flow);
                                const stepsCount = flow.steps?.length || 0;
                                const isPending = flow.status?.toUpperCase() === 'PENDING';
                                const isFinished = flow.status?.toUpperCase() === 'FINISHED';

                                return (
                                    <div
                                        key={flow.flow_id}
                                        className="bg-white rounded-2xl border border-[#EBEBEB] p-6 hover:shadow-[0_8px_30px_rgba(139,124,246,0.04)] transition-all duration-300 space-y-6"
                                    >
                                        {/* Row 1: Header of Flow Card */}
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h3 className="text-[15px] font-bold text-[#2D2D2D]">
                                                    {title}
                                                </h3>
                                                <p className="text-[11px] text-[#9C9C9C] font-semibold mt-1">
                                                    Được sử dụng {usage} lần · Mã đặt lịch: <span className="font-mono text-[10px] bg-neutral-100 px-1 py-0.5 rounded">{flow.booking_id.slice(0, 8)}...</span>
                                                </p>
                                            </div>

                                            {/* Status Badge */}
                                            <span
                                                className={cn(
                                                    'px-3 py-1 rounded-full text-[11px] font-bold select-none',
                                                    isFinished
                                                        ? 'bg-green-50 text-green-600 border border-green-100'
                                                        : isPending
                                                        ? 'bg-brand-50 text-brand-600 border border-brand-100'
                                                        : 'bg-amber-50 text-amber-600 border border-amber-100'
                                                )}
                                            >
                                                {isFinished ? 'Hoàn thành' : isPending ? 'Hoạt động' : 'Đang xử lý'}
                                            </span>
                                        </div>

                                        {/* Row 2: Dynamic steps rendering */}
                                        <div className="relative py-4 flex items-center justify-between overflow-x-auto gap-4 scrollbar-none">
                                            {/* Connector Line behind circles */}
                                            <div className="absolute left-[30px] right-[30px] top-1/2 -translate-y-1/2 h-[2px] bg-neutral-100 -z-0" />

                                            {flow.steps?.map((step, idx) => {
                                                const statusUpper = step.step_status?.toUpperCase();
                                                const isStepFinished = statusUpper === 'FINISHED' || statusUpper === 'SUCCESS';
                                                const isStepRunning = statusUpper === 'RUNNING' || statusUpper === 'IN_PROGRESS';

                                                return (
                                                    <div
                                                        key={step.step_id}
                                                        className="flex flex-col items-center gap-3 shrink-0 relative z-10 min-w-[90px]"
                                                    >
                                                        {/* Step Circle */}
                                                        <div
                                                            className={cn(
                                                                'w-8 h-8 rounded-full border-2 flex items-center justify-center text-[12px] font-bold shadow-sm transition-all select-none',
                                                                isStepFinished
                                                                    ? 'bg-brand-500 text-white border-brand-500'
                                                                    : isStepRunning
                                                                    ? 'bg-white text-brand-500 border-brand-400 ring-4 ring-brand-50/50'
                                                                    : 'bg-white text-neutral-400 border-neutral-200'
                                                            )}
                                                        >
                                                            {isStepFinished ? (
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            ) : (
                                                                idx + 1
                                                            )}
                                                        </div>

                                                        {/* Step Label (e.g. Room Name) */}
                                                        <span
                                                            className={cn(
                                                                'text-[11px] font-bold text-center leading-tight transition-colors',
                                                                isStepFinished || isStepRunning
                                                                    ? 'text-brand-600'
                                                                    : 'text-neutral-400'
                                                            )}
                                                        >
                                                            {step.room_info?.room_name || step.room?.room_name || 'Khám bệnh'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Row 3: Footer of Card */}
                                        <div className="flex items-center justify-between border-t border-[#F5F5F8] pt-4 text-[12px]">
                                            <span className="text-[#9C9C9C] font-semibold">
                                                {stepsCount} bước
                                            </span>

                                            {/* Action buttons */}
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => alert(`Bắt đầu vận hành quy trình: ${title}`)}
                                                    className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-[#2D2D2D] transition-colors cursor-pointer"
                                                    title="Khởi động"
                                                >
                                                    <Play className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => alert(`Xem chi tiết / Cài đặt của: ${title}`)}
                                                    className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-[#2D2D2D] transition-colors cursor-pointer"
                                                    title="Chỉnh sửa"
                                                >
                                                    <SettingsIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setShowDeleteConfirm(flow.flow_id)}
                                                    className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-neutral-500 hover:text-red-500 transition-colors cursor-pointer"
                                                    title="Xóa"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modal: Create Mock Workflow ── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-neutral-100 max-w-md w-full overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
                            <h3 className="font-bold text-neutral-900 text-sm">Tạo quy trình khám bệnh</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-neutral-400 hover:text-neutral-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                                    Tên quy trình
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Quy trình khám Nội thông thường"
                                    value={newFlowTitle}
                                    onChange={(e) => setNewFlowTitle(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl text-[13px] border border-neutral-200 focus:border-brand-400 outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                                    Các bước thực hiện
                                </label>
                                <div className="flex flex-wrap gap-1.5 p-2.5 bg-neutral-50 rounded-xl border border-neutral-100">
                                    {newFlowSteps.map((step, index) => (
                                        <span key={index} className="px-2.5 py-1 bg-white border border-neutral-200 rounded-lg text-xs font-bold text-neutral-700">
                                            {index + 1}. {step}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <input
                                        type="text"
                                        placeholder="Tên bước mới"
                                        value={newStepInput}
                                        onChange={(e) => setNewStepInput(e.target.value)}
                                        className="flex-1 px-3 py-1.5 rounded-lg text-xs border border-neutral-200 focus:border-brand-400 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={addStepToCreateForm}
                                        className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-lg text-xs font-bold"
                                    >
                                        Thêm bước
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-end gap-2 bg-neutral-50">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 border border-neutral-200 text-neutral-500 rounded-xl text-xs font-bold hover:bg-white"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleCreateMockFlow}
                                className="px-4 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600"
                            >
                                Lưu thiết lập
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Delete Confirm ── */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-neutral-100 max-w-sm w-full overflow-hidden">
                        <div className="p-6 text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-neutral-900 text-[15px]">Xóa quy trình công việc?</h3>
                            <p className="text-xs text-neutral-400 leading-relaxed">
                                Bạn có chắc chắn muốn xóa quy trình này? Hành động này sẽ dừng quy trình theo dõi của bệnh nhân liên quan và không thể hoàn tác.
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-end gap-2 bg-neutral-50">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-4 py-2 border border-neutral-200 text-neutral-500 rounded-xl text-xs font-bold hover:bg-white"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => {
                                    alert(`Đã xóa quy trình!`);
                                    setShowDeleteConfirm(null);
                                }}
                                className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold"
                            >
                                Xác nhận xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
