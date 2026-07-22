'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Play,
    SquarePen,
    Trash2,
    Loader2,
    AlertCircle,
    X,
    CreditCard,
    Stethoscope,
    ChevronLeft,
    ChevronRight,
    Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useProcessStore } from '../store/processStore';
import {
    ProcessTemplate,
    TemplateStep,
    CreateTemplateDto,
    ROOM_TYPE_OPTIONS,
} from '../types/process.types';

const ITEMS_PER_PAGE = 3;

export function AdminProcessPage() {
    const accessToken = useAuthStore((s) => s.accessToken);
    const {
        templates,
        isLoading,
        error,
        fetchTemplates,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        clearError,
    } = useProcessStore();

    // Local UI states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
    const [currentPage, setCurrentPage] = useState(1);

    // Modal states
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<ProcessTemplate | null>(null);

    // Delete modal states
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingTemplate, setDeletingTemplate] = useState<ProcessTemplate | null>(null);

    // Test/Run modal state
    const [testingTemplate, setTestingTemplate] = useState<ProcessTemplate | null>(null);

    // Form inputs
    const [formName, setFormName] = useState('');
    const [formSteps, setFormSteps] = useState<TemplateStep[]>([]);
    const [formActive, setFormActive] = useState(true);
    const [formSubmitting, setFormSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (accessToken) {
            fetchTemplates(accessToken);
        }
    }, [accessToken, fetchTemplates]);

    // Initial default steps for new template
    const createDefaultStep = (index: number): TemplateStep => ({
        template_step_id: `step_${index + 1}`,
        step_name: `Bước ${index + 1}`,
        room_type: 'CONSULTATION',
        requires_payment: false,
        depends_on: index > 0 ? [`step_${index}`] : [],
        sub_steps: [],
    });

    const openCreateModal = () => {
        setEditingTemplate(null);
        setFormName('');
        setFormSteps([
            {
                template_step_id: 'step_1',
                step_name: 'Đăng ký & Phân loại',
                room_type: 'RECEPTION',
                requires_payment: false,
                depends_on: [],
                sub_steps: [],
            },
            {
                template_step_id: 'step_2',
                step_name: 'Khám chuyên khoa',
                room_type: 'CONSULTATION',
                requires_payment: false,
                depends_on: ['step_1'],
                sub_steps: [],
            },
        ]);
        setFormActive(true);
        setFormError(null);
        setIsFormModalOpen(true);
    };

    const openEditModal = (template: ProcessTemplate) => {
        setEditingTemplate(template);
        setFormName(template.name);
        setFormSteps(
            template.steps && template.steps.length > 0
                ? template.steps.map((s, idx) => ({
                    ...s,
                    template_step_id: s.template_step_id || `step_${idx + 1}`,
                }))
                : [createDefaultStep(0)]
        );
        const isActive =
            typeof template.is_active === 'boolean'
                ? template.is_active
                : template.status === 'ACTIVE' || template.status === true;
        setFormActive(isActive);
        setFormError(null);
        setIsFormModalOpen(true);
    };

    const handleAddStep = () => {
        const nextIdx = formSteps.length;
        setFormSteps([...formSteps, createDefaultStep(nextIdx)]);
    };

    const handleRemoveStep = (index: number) => {
        if (formSteps.length <= 1) {
            setFormError('Quy trình phải có ít nhất 1 bước.');
            return;
        }
        const updated = formSteps.filter((_, idx) => idx !== index);
        // Re-index steps
        const reindexed = updated.map((step, idx) => ({
            ...step,
            template_step_id: `step_${idx + 1}`,
            depends_on: step.depends_on.filter((d) => d !== step.template_step_id),
        }));
        setFormSteps(reindexed);
    };

    const handleStepChange = <K extends keyof TemplateStep>(
        index: number,
        field: K,
        value: TemplateStep[K]
    ) => {
        const updated = [...formSteps];
        updated[index] = { ...updated[index], [field]: value };
        setFormSteps(updated);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;

        if (!formName.trim()) {
            setFormError('Vui lòng nhập tên quy trình.');
            return;
        }

        if (formSteps.length === 0) {
            setFormError('Vui lòng thêm ít nhất một bước trong quy trình.');
            return;
        }

        for (let i = 0; i < formSteps.length; i++) {
            if (!formSteps[i].step_name.trim()) {
                setFormError(`Bước ${i + 1} chưa có tên.`);
                return;
            }
        }

        setFormSubmitting(true);
        setFormError(null);

        const payload: CreateTemplateDto = {
            name: formName.trim(),
            steps: formSteps,
        };

        try {
            if (editingTemplate) {
                const templateId = editingTemplate.template_id || editingTemplate.id || '';
                await updateTemplate(
                    templateId,
                    payload,
                    accessToken
                );
            } else {
                await createTemplate(payload, accessToken);
            }
            setIsFormModalOpen(false);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu quy trình.');
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleDeleteClick = (template: ProcessTemplate) => {
        setDeletingTemplate(template);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingTemplate || !accessToken) return;
        const templateId = deletingTemplate.template_id || deletingTemplate.id || '';
        try {
            await deleteTemplate(templateId, accessToken);
            setIsDeleteModalOpen(false);
            setDeletingTemplate(null);
        } catch (err) {
            console.error('Failed to delete template:', err);
        }
    };

    // Reset pagination when search or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);

    // Filter templates safely
    const filteredTemplates = templates.filter((t) => {
        if (!t) return false;
        const tRecord = t as unknown as Record<string, unknown>;
        const templateName = (t.name || (tRecord.template_name as string) || (tRecord.flow_name as string) || (tRecord.title as string) || '');
        const matchesQuery = templateName.toLowerCase().includes((searchQuery || '').toLowerCase());
        const isActive =
            typeof t.is_active === 'boolean'
                ? t.is_active
                : (t.status === 'INACTIVE' || t.status === false ? false : true);

        if (statusFilter === 'ACTIVE') return matchesQuery && isActive;
        if (statusFilter === 'INACTIVE') return matchesQuery && !isActive;
        return matchesQuery;
    });

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE));
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedTemplates = filteredTemplates.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredTemplates.length);

    const getRoomLabel = (roomType: string) => {
        const found = ROOM_TYPE_OPTIONS.find((r) => r.value === roomType);
        return found ? found.label : roomType;
    };

    const getRoomBadgeColor = (roomType: string) => {
        const found = ROOM_TYPE_OPTIONS.find((r) => r.value === roomType);
        return found ? found.badgeColor : 'bg-neutral-100 text-neutral-600 border-neutral-200';
    };

    return (
        <div className="flex-1 h-full overflow-y-auto bg-[#F8FAFC] p-6 lg:p-8 space-y-6">
            {/* Header section matching Figma */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                            <Stethoscope className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
                            Quy trình công việc
                        </h1>
                    </div>
                    <p className="mt-1 text-sm text-neutral-500 pl-10">
                        Tạo và quản lý quy trình xử lý bệnh nhân tự động
                    </p>
                </div>

                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-medium text-sm shadow-sm transition cursor-pointer touch-manipulation self-start sm:self-auto"
                >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Tạo quy trình mới</span>
                </button>
            </div>

            {/* Alert banner if store has error */}
            {error && (
                <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={clearError}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm quy trình..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                        Trạng thái:
                    </span>
                    {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${statusFilter === st
                                    ? 'bg-purple-100 text-purple-700 font-semibold border border-purple-200'
                                    : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                                }`}
                        >
                            {st === 'ALL'
                                ? 'Tất cả'
                                : st === 'ACTIVE'
                                    ? 'Hoạt động'
                                    : 'Không hoạt động'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content List */}
            {isLoading && templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-neutral-200/80">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-3" />
                    <p className="text-sm font-medium text-neutral-600">Đang tải danh sách quy trình...</p>
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-neutral-200/80 text-center px-4">
                    <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mb-4 text-purple-600">
                        <Sparkles className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 mb-1">
                        Chưa có quy trình khám bệnh nào
                    </h3>
                    <p className="text-sm text-neutral-500 max-w-md mb-6">
                        Tạo các quy trình tự động hóa chuỗi bước khám bệnh cho phòng khám hoặc bệnh viện của bạn.
                    </p>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 transition cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Tạo quy trình đầu tiên</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredTemplates.map((template) => {
                        const templateId = template.template_id || template.id || '';
                        const tRecord = template as unknown as Record<string, unknown>;
                        const templateName = template.name || (tRecord.template_name as string) || (tRecord.flow_name as string) || 'Quy trình chưa đặt tên';
                        const steps = (template.steps || tRecord.template_steps || tRecord.flow_steps || []) as TemplateStep[];
                        const isActive =
                            typeof template.is_active === 'boolean'
                                ? template.is_active
                                : (template.status === 'INACTIVE' || template.status === false ? false : true);
                        const stepsCount = steps.length;

                        return (
                            <div
                                key={templateId || templateName}
                                className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs hover:shadow-md transition-all space-y-6"
                            >
                                {/* Card Header */}
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-neutral-900 tracking-tight">
                                            {templateName}
                                        </h3>
                                    </div>

                                    <span
                                        className={`px-3 py-1 text-xs font-semibold rounded-full border ${isActive
                                                ? 'bg-purple-50 text-purple-600 border-purple-100'
                                                : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                                            }`}
                                    >
                                        {isActive ? 'Hoạt động' : 'Không hoạt động'}
                                    </span>
                                </div>

                                {/* Flow Timeline Stepper (Matching Figma Design) */}
                                <div className="py-2 overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-200">
                                    <div className="flex items-center min-w-max px-2 py-3">
                                        {steps && steps.length > 0 ? (
                                            steps.map((step, idx) => {
                                                const sRecord = step as unknown as Record<string, unknown>;
                                                const stepName = step.step_name || (sRecord.name as string) || (sRecord.title as string) || `Bước ${idx + 1}`;
                                                const isLast = idx === steps.length - 1;
                                                return (
                                                    <div
                                                        key={step.template_step_id || idx}
                                                        className="flex items-center"
                                                    >
                                                        {/* Step Node */}
                                                        <div className="flex flex-col items-center group relative">
                                                            {/* Circle Node */}
                                                            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-bold text-sm flex items-center justify-center border-2 border-purple-200 shadow-2xs group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all cursor-default">
                                                                {idx + 1}
                                                            </div>

                                                            {/* Step Label */}
                                                            <div className="mt-3 text-center max-w-[120px]">
                                                                <span className="text-xs font-semibold text-neutral-800 block line-clamp-2">
                                                                    {stepName}
                                                                </span>
                                                                <span
                                                                    className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${getRoomBadgeColor(
                                                                        step.room_type
                                                                    )}`}
                                                                >
                                                                    {getRoomLabel(step.room_type)}
                                                                </span>
                                                                {step.requires_payment && (
                                                                    <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                                                        <CreditCard className="w-2.5 h-2.5" />
                                                                        <span>Trả phí</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Connector Line */}
                                                        {!isLast && (
                                                            <div className="w-16 md:w-24 h-[2px] bg-neutral-200 mx-3 self-center -mt-6 relative">
                                                                <ChevronRight className="w-3.5 h-3.5 text-neutral-300 absolute -right-1.5 -top-1.5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="text-xs text-neutral-400 italic">
                                                Chưa có bước nào trong quy trình này.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Card Footer */}
                                <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                                    <span className="font-medium">{stepsCount} bước</span>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setTestingTemplate(template)}
                                            title="Chạy thử quy trình"
                                            className="p-2 rounded-lg text-purple-600 hover:bg-purple-50 transition cursor-pointer"
                                        >
                                            <Play className="w-4 h-4 fill-purple-600/20" />
                                        </button>
                                        <button
                                            onClick={() => openEditModal(template)}
                                            title="Chỉnh sửa quy trình"
                                            className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition cursor-pointer"
                                        >
                                            <SquarePen className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(template)}
                                            title="Xóa quy trình"
                                            className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
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

            {/* Create & Edit Modal */}
            {isFormModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-3xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 bg-neutral-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-neutral-900">
                                    {editingTemplate ? 'Chỉnh sửa quy trình' : 'Tạo quy trình mới'}
                                </h2>
                                <p className="text-xs text-neutral-500 mt-0.5">
                                    Thiết lập các bước tự động cho quy trình khám bệnh
                                </p>
                            </div>
                            <button
                                onClick={() => setIsFormModalOpen(false)}
                                className="p-2 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200/50 transition cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleFormSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                            {formError && (
                                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                    <span>{formError}</span>
                                </div>
                            )}

                            {/* Process Name Input */}
                            <div className="space-y-1.5">
                                <label className="block text-sm font-semibold text-neutral-800">
                                    Tên quy trình <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Quy trình khám Ngoại thần kinh"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                                />
                            </div>

                            {/* Active Status Switch */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                                <div>
                                    <span className="text-sm font-semibold text-neutral-800 block">
                                        Trạng thái hoạt động
                                    </span>
                                    <span className="text-xs text-neutral-500">
                                        Quy trình đang hoạt động có thể gán tự động cho bệnh nhân mới.
                                    </span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formActive}
                                        onChange={(e) => setFormActive(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>

                            {/* Dynamic Steps List */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-neutral-800">
                                        Các bước thực hiện ({formSteps.length} bước)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddStep}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Thêm bước</span>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {formSteps.map((step, idx) => (
                                        <div
                                            key={step.template_step_id || idx}
                                            className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-2xs space-y-4 relative group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                                                        Mã bước: {step.template_step_id}
                                                    </span>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveStep(idx)}
                                                    title="Xóa bước này"
                                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Step Name */}
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-medium text-neutral-600">
                                                        Tên bước <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="e.g. Khám lâm sàng"
                                                        value={step.step_name}
                                                        onChange={(e) =>
                                                            handleStepChange(idx, 'step_name', e.target.value)
                                                        }
                                                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm text-neutral-900 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                                    />
                                                </div>

                                                {/* Room Type */}
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-medium text-neutral-600">
                                                        Loại phòng khám / dịch vụ
                                                    </label>
                                                    <select
                                                        value={step.room_type}
                                                        onChange={(e) =>
                                                            handleStepChange(idx, 'room_type', e.target.value)
                                                        }
                                                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm text-neutral-900 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
                                                    >
                                                        {ROOM_TYPE_OPTIONS.map((opt) => (
                                                            <option key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-neutral-100">
                                                {/* Requires Payment checkbox */}
                                                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-neutral-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={step.requires_payment}
                                                        onChange={(e) =>
                                                            handleStepChange(
                                                                idx,
                                                                'requires_payment',
                                                                e.target.checked
                                                            )
                                                        }
                                                        className="h-4 w-4 rounded border-neutral-300 text-purple-600 focus:ring-purple-500 accent-purple-600"
                                                    />
                                                    <span>Yêu cầu hoàn tất thanh toán trước khi vào bước</span>
                                                </label>

                                                {/* Depends On info */}
                                                {idx > 0 && (
                                                    <div className="text-[11px] text-neutral-500 flex items-center gap-1 bg-neutral-50 px-2.5 py-1 rounded-md border border-neutral-200">
                                                        <span>Phụ thuộc:</span>
                                                        <span className="font-semibold text-purple-700">
                                                            {step.depends_on.join(', ') || `step_${idx}`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Submit buttons */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                                <button
                                    type="button"
                                    disabled={formSubmitting}
                                    onClick={() => setIsFormModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 font-medium text-sm hover:bg-neutral-100 transition cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={formSubmitting}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition cursor-pointer disabled:opacity-60"
                                >
                                    {formSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>{editingTemplate ? 'Lưu cập nhật' : 'Tạo quy trình'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {isDeleteModalOpen && deletingTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-rose-600">
                            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-neutral-900">Xóa quy trình</h3>
                                <p className="text-xs text-neutral-500">Xác nhận thao tác xóa quy trình này</p>
                            </div>
                        </div>

                        <p className="text-sm text-neutral-600 leading-relaxed">
                            Bạn có chắc chắn muốn xóa quy trình{' '}
                            <strong className="text-neutral-900 font-semibold">{deletingTemplate.name}</strong>? Hành động này sẽ không thể khôi phục.
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 font-medium text-sm hover:bg-neutral-100 transition cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm transition cursor-pointer"
                            >
                                Xác nhận xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Testing / Preview Modal */}
            {testingTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-lg p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                            <div className="flex items-center gap-2 text-purple-600">
                                <Play className="w-5 h-5 fill-purple-600/20" />
                                <h3 className="text-lg font-bold text-neutral-900">
                                    Mô phỏng quy trình: {testingTemplate.name}
                                </h3>
                            </div>
                            <button
                                onClick={() => setTestingTemplate(null)}
                                className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <p className="text-xs text-neutral-500">
                                Danh sách {testingTemplate.steps.length} bước xử lý tự động cho bệnh nhân:
                            </p>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {testingTemplate.steps.map((st, i) => (
                                    <div
                                        key={st.template_step_id || i}
                                        className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between text-xs"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
                                                {i + 1}
                                            </span>
                                            <span className="font-semibold text-neutral-900">
                                                {st.step_name}
                                            </span>
                                        </div>
                                        <span
                                            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getRoomBadgeColor(
                                                st.room_type
                                            )}`}
                                        >
                                            {getRoomLabel(st.room_type)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setTestingTemplate(null)}
                                className="px-5 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition cursor-pointer"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
