'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    Filter,
    Play,
    Download,
    Clock,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/shared/components/ui/Table';
import type { Patient, Priority, Status } from '@/modules/clinical/types/clinical.types';
import { usePatientTabsStore } from '@/modules/clinical/store/clinicalStore';

// ── Constants ──────────────────────────────────────────────────────────────
const ROWS_PER_PAGE = 7;

// ── Priority Badge mapping → Badge variants ────────────────────────────────
const PRIORITY_VARIANT: Record<Priority, { variant: 'success' | 'warning' | 'info' | 'danger' }> = {
    'Bình thường': { variant: 'success' },
    'Ngồi xe lăn': { variant: 'warning' },
    'Khám sức khỏe': { variant: 'info' },
    'Quay lại phòng khám': { variant: 'danger' },
};

function PriorityBadge({ priority }: { priority: Priority }) {
    const { variant } = PRIORITY_VARIANT[priority];
    return (
        <Badge variant={variant} dot>
            {priority}
        </Badge>
    );
}

// ── Status Badge mapping → Badge variants ──────────────────────────────────
const STATUS_CONFIG: Record<Status, { variant: 'success' | 'info' | 'warning' }> = {
    'Đã khám': { variant: 'success' },
    'Đang khám': { variant: 'info' },
    'Đang chờ': { variant: 'warning' },
};

function StatusBadge({ status }: { status: Status }) {
    const { variant } = STATUS_CONFIG[status];
    return (
        <Badge variant={variant} dot>
            {status}
        </Badge>
    );
}

// ── Patient Table ──────────────────────────────────────────────────────────
interface PatientTableProps {
    patients: Patient[];
    onSelectPatient: (patient: Patient) => void;
}

export function PatientTable({ patients, onSelectPatient }: PatientTableProps) {
    const router = useRouter();
    const { openTab } = usePatientTabsStore();
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
    const [showFilter, setShowFilter] = useState(false);

    // ── Filtering ──
    const filtered = useMemo(() => {
        let result = patients;

        // Text search
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(
                (p) =>
                    p.name.toLowerCase().includes(q) ||
                    p.code.toLowerCase().includes(q)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter((p) => p.status === statusFilter);
        }

        return result;
    }, [patients, search, statusFilter]);

    // ── Pagination ──
    const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedData = filtered.slice(
        (safePage - 1) * ROWS_PER_PAGE,
        safePage * ROWS_PER_PAGE
    );

    // Generate visible page numbers
    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1, 2, 3);
            if (safePage > 4) pages.push('...');
            if (safePage > 3 && safePage < totalPages - 2) pages.push(safePage);
            if (safePage < totalPages - 3) pages.push('...');
            pages.push(totalPages - 1, totalPages);
        }
        // Deduplicate
        return [...new Set(pages)];
    };

    return (
        <>
            {/* ── Search + Filter bar ────────────────────────── */}
            <div className="flex items-center justify-between gap-4 mb-6 bg-white rounded-[48px] border border-neutral-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-3 py-2">
                <div className="flex-1 max-w-sm">
                    <Input
                        type="text"
                        placeholder="Tìm kiếm tên hoặc mã bệnh nhân..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setCurrentPage(1);
                        }}
                        startIcon={<Search className="w-4 h-4 text-neutral-400" />}
                        variant="pill"
                    />
                </div>

                <div className="relative">
                    <Button
                        variant="outline"
                        onClick={() => setShowFilter(!showFilter)}
                        startIcon={<Filter className="w-4 h-4" />}
                        className={cn(
                            'rounded-[24px] shadow-[0_1px_4px_rgba(0,0,0,0.04)]',
                            statusFilter !== 'all'
                                ? 'text-brand-600 bg-brand-50 border-brand-200 hover:bg-brand-100/60'
                                : ''
                        )}
                    >
                        {statusFilter !== 'all' ? statusFilter : 'Lọc kết quả'}
                    </Button>

                    {/* Filter dropdown */}
                    {showFilter && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-[24px] border border-neutral-100 shadow-xl z-30 py-2 animate-in fade-in-0 zoom-in-95 duration-150">
                            {(['all', 'Đang chờ', 'Đang khám', 'Đã khám'] as const).map((option) => (
                                <button
                                    key={option}
                                    onClick={() => {
                                        setStatusFilter(option);
                                        setShowFilter(false);
                                        setCurrentPage(1);
                                    }}
                                    className={cn(
                                        'w-full text-left px-4 py-2.5 text-sm font-medium transition-colors',
                                        statusFilter === option
                                            ? 'text-brand-600 bg-brand-50/60'
                                            : 'text-neutral-600 hover:bg-neutral-50'
                                    )}
                                >
                                    {option === 'all' ? 'Tất cả' : option}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Table card ─────────────────────────────────── */}
            <div className="bg-white rounded-[24px] border border-neutral-200/60 shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent cursor-default border-none">
                            <TableHead className="w-16 pl-6 text-xs font-semibold text-neutral-500 uppercase tracking-wider py-4 bg-neutral-50/85 rounded-l-[24px]">
                                STT
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-neutral-500 uppercase tracking-wider py-4 bg-neutral-50/85">
                                Bệnh nhân
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-neutral-500 uppercase tracking-wider py-4 bg-neutral-50/85">
                                Ưu tiên
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-neutral-500 uppercase tracking-wider py-4 bg-neutral-50/85">
                                Giờ đến
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-neutral-500 uppercase tracking-wider py-4 bg-neutral-50/85">
                                Trạng thái
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-neutral-500 uppercase tracking-wider py-4 bg-neutral-50/85 rounded-r-[24px] text-right pr-6">
                                Hành động
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedData.length === 0 && (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={6} className="text-center py-12 text-neutral-400 text-sm">
                                    Không tìm thấy bệnh nhân nào.
                                </TableCell>
                            </TableRow>
                        )}
                        {paginatedData.map((patient) => {
                            return (
                                <TableRow
                                    key={patient.id}
                                    className="group hover:bg-brand-50/30 transition-colors duration-150 cursor-pointer border-b border-neutral-50 last:border-b-0"
                                    onClick={() => onSelectPatient(patient)}
                                >
                                    {/* STT */}
                                    <TableCell className="text-neutral-400 font-medium text-sm pl-6 py-4">
                                        {patient.stt}
                                    </TableCell>

                                    {/* Patient info */}
                                    <TableCell className="py-4">
                                        <p className="font-semibold text-neutral-800 text-sm">{patient.name}</p>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                            {patient.age} tuổi • {patient.gender} • {patient.code}
                                        </p>
                                    </TableCell>

                                    {/* Priority — using Badge */}
                                    <TableCell className="py-4">
                                        <PriorityBadge priority={patient.priority} />
                                    </TableCell>

                                    {/* Time */}
                                    <TableCell className="py-4">
                                        <span className="flex items-center gap-1.5 text-neutral-600 text-sm font-medium">
                                            <Clock className="w-3.5 h-3.5 text-neutral-400" />
                                            {patient.time}
                                        </span>
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell className="py-4">
                                        <StatusBadge status={patient.status} />
                                    </TableCell>

                                    {/* Actions — using Button */}
                                    <TableCell className="text-right pr-6 py-4">
                                        <div
                                            className="inline-flex items-center gap-2"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    openTab({ id: patient.id, name: patient.name });
                                                    router.push(`/doctor/${patient.id}`);
                                                }}
                                                className="w-8 h-8 px-0 rounded-[24px] text-brand-500 hover:bg-brand-50"
                                                title="Xem hồ sơ bệnh nhân"
                                            >
                                                <Play className="w-4 h-4 fill-brand-500 text-brand-500" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-8 h-8 px-0 rounded-[24px] text-neutral-400 hover:bg-neutral-50"
                                                title="Xuất hồ sơ"
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* ── Pagination ─────────────────────────────────── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                    {/* Showing X of Y */}
                    <span className="text-sm text-neutral-400 font-medium">
                        Hiển thị {(safePage - 1) * ROWS_PER_PAGE + 1}–
                        {Math.min(safePage * ROWS_PER_PAGE, filtered.length)} / {filtered.length} bệnh nhân
                    </span>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={safePage === 1}
                            startIcon={<ChevronLeft className="w-4 h-4" />}
                            className="text-neutral-400 hover:text-neutral-700"
                        >
                            Previous
                        </Button>

                        {getPageNumbers().map((n, i) =>
                            n === '...' ? (
                                <span key={`dots-${i}`} className="px-1 text-neutral-300 text-sm">
                                    ...
                                </span>
                            ) : (
                                <Button
                                    key={n}
                                    variant={safePage === n ? 'brand' : 'ghost'}
                                    size="sm"
                                    onClick={() => setCurrentPage(n)}
                                    className={cn(
                                        'w-8 h-8 px-0 rounded-[24px]',
                                        safePage === n
                                            ? 'shadow-sm'
                                            : 'text-neutral-500'
                                    )}
                                >
                                    {n}
                                </Button>
                            )
                        )}

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safePage === totalPages}
                            endIcon={<ChevronRight className="w-4 h-4" />}
                            className="text-neutral-400 hover:text-neutral-700"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}
