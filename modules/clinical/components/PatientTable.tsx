'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    Filter,
    Play,
    Download,
    Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/Button';
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

// ── Priority Badge component ──────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: Priority }) {
    return (
        <span className="inline-flex items-center bg-[#F3F3F3] text-[#7B7B7B] text-[12px] font-semibold px-3 py-1 rounded-full border border-neutral-200/30">
            {priority}
        </span>
    );
}

// ── Status Badge component ────────────────────────────────────────────────
function StatusBadge({ status }: { status: Status }) {
    if (status === 'Đã khám') {
        return (
            <span className="inline-flex items-center bg-[#E2F7EB] text-[#0D9448] text-[12px] font-semibold px-3 py-1 rounded-full">
                {status}
            </span>
        );
    }
    if (status === 'Đang khám') {
        return (
            <span className="inline-flex items-center bg-[#E8F2FF] text-[#1A73E8] text-[12px] font-semibold px-3 py-1 rounded-full">
                {status}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center bg-[#FFEFE2] text-[#F39C12] text-[12px] font-semibold px-3 py-1 rounded-full">
            {status}
        </span>
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
        return [...new Set(pages)];
    };

    return (
        <>
            {/* ── Search + Filter bar ────────────────────────── */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex-1 max-w-sm">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm tên hoặc mã bệnh nhân..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full h-10 pl-11 pr-4 bg-white border border-neutral-200 hover:border-neutral-300 focus:border-neutral-400 rounded-full text-[13px] text-neutral-800 placeholder-neutral-400 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="relative">
                    <Button
                        variant="outline"
                        onClick={() => setShowFilter(!showFilter)}
                        startIcon={<Filter className="w-4 h-4" />}
                        className={cn(
                            'h-10 px-5 rounded-full border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-[13px] font-semibold',
                            statusFilter !== 'all'
                                ? 'text-brand-600 bg-brand-50 border-brand-200 hover:bg-brand-100/60'
                                : ''
                        )}
                    >
                        {statusFilter !== 'all' ? statusFilter : 'Lọc kết quả'}
                    </Button>

                    {/* Filter dropdown */}
                    {showFilter && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-neutral-100 shadow-xl z-30 py-2 animate-in fade-in-0 zoom-in-95 duration-150">
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
                                            ? 'text-[#8B7CF6] bg-[#8B7CF6]/10'
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
            <div className="bg-white rounded-3xl border border-neutral-100 shadow-[0_2px_16px_rgba(0,0,0,0.02)] overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent cursor-default border-b border-neutral-100">
                            <TableHead className="w-20 pl-8 text-[13px] font-bold text-neutral-700 py-4">
                                STT
                            </TableHead>
                            <TableHead className="text-[13px] font-bold text-neutral-700 py-4">
                                Bệnh nhân
                            </TableHead>
                            <TableHead className="text-[13px] font-bold text-neutral-700 py-4">
                                Ưu tiên
                            </TableHead>
                            <TableHead className="text-[13px] font-bold text-neutral-700 py-4">
                                Giờ đến
                            </TableHead>
                            <TableHead className="text-[13px] font-bold text-neutral-700 py-4">
                                Trạng thái
                            </TableHead>
                            <TableHead className="text-[13px] font-bold text-neutral-700 py-4 text-right pr-8">
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
                        {paginatedData.map((patient, index) => {
                            const isWaiting = patient.status === 'Đang chờ';
                            const paddedStt = String(patient.stt || (safePage - 1) * ROWS_PER_PAGE + index + 1).padStart(2, '0');
                            return (
                                <TableRow
                                    key={patient.id}
                                    className="group hover:bg-[#8B7CF6]/5 transition-colors duration-150 cursor-pointer border-b border-neutral-50 last:border-b-0"
                                    onClick={() => onSelectPatient(patient)}
                                >
                                    {/* STT */}
                                    <TableCell className="text-neutral-400 font-medium text-sm pl-8 py-4">
                                        {paddedStt}
                                    </TableCell>

                                    {/* Patient info */}
                                    <TableCell className="py-4">
                                        <p className="font-semibold text-neutral-800 text-sm">{patient.name}</p>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                            {patient.age} tuổi • {patient.gender} • {patient.code}
                                        </p>
                                    </TableCell>

                                    {/* Priority */}
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

                                    {/* Actions */}
                                    <TableCell className="text-right pr-8 py-4">
                                        <div
                                            className="inline-flex items-center gap-2"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={() => {
                                                    openTab({ id: patient.id, name: patient.name, stt: patient.stt });
                                                    router.push(`/doctor/${patient.id}`);
                                                }}
                                                className={cn(
                                                    'w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150',
                                                    isWaiting
                                                        ? 'text-[#8B7CF6] hover:bg-[#8B7CF6]/10'
                                                        : 'text-neutral-300 cursor-not-allowed'
                                                )}
                                                disabled={!isWaiting}
                                                title={isWaiting ? 'Bắt đầu khám' : 'Không khả dụng'}
                                            >
                                                <Play
                                                    className={cn(
                                                        'w-4 h-4',
                                                        isWaiting
                                                            ? 'fill-[#8B7CF6] text-[#8B7CF6]'
                                                            : 'fill-neutral-300 text-neutral-300'
                                                    )}
                                                />
                                            </button>
                                            <button
                                                className={cn(
                                                    'w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150',
                                                    isWaiting
                                                        ? 'text-[#8B7CF6] hover:bg-[#8B7CF6]/10'
                                                        : 'text-neutral-300 cursor-not-allowed'
                                                )}
                                                disabled={!isWaiting}
                                                title={isWaiting ? 'Xuất hồ sơ' : 'Không khả dụng'}
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
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
                <div className="flex justify-center mt-8">
                    <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-full border border-neutral-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={safePage === 1}
                            className="text-[13px] text-neutral-400 hover:text-neutral-700 disabled:opacity-50 disabled:pointer-events-none font-semibold px-3 py-1.5 flex items-center transition-colors"
                        >
                            <span className="mr-1.5">←</span> Previous
                        </button>

                        {getPageNumbers().map((n, i) =>
                            n === '...' ? (
                                <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-neutral-400 text-sm select-none">
                                    ...
                                </span>
                            ) : (
                                <button
                                    key={n}
                                    onClick={() => setCurrentPage(n)}
                                    className={cn(
                                        'w-8 h-8 flex items-center justify-center text-[13px] transition-all duration-150',
                                        safePage === n
                                            ? 'bg-[#8B7CF6] text-white font-bold rounded-lg shadow-sm'
                                            : 'text-neutral-500 hover:text-neutral-800 font-semibold rounded-lg hover:bg-neutral-50'
                                    )}
                                >
                                    {n}
                                </button>
                            )
                        )}

                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safePage === totalPages}
                            className="text-[13px] text-neutral-500 hover:text-neutral-800 disabled:opacity-50 disabled:pointer-events-none font-semibold px-3 py-1.5 flex items-center transition-colors"
                        >
                            Next <span className="ml-1.5">→</span>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
