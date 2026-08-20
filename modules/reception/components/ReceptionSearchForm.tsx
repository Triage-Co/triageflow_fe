'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    Loader2,
    AlertCircle,
    User,
    IdCard,
    Phone,
    Clock,
    ChevronLeft,
    ChevronRight,
    FileText,
    CalendarDays,
    QrCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { receptionService } from '@/modules/reception/services/receptionService';
import { CccdQrScanner } from '@/modules/reception/components/CccdQrScanner';
import { PatientActiveFlowsView } from '@/modules/reception/components/PatientActiveFlowsView';
import type { PatientSearchResult } from '@/modules/reception/types/reception.types';
import type { CccdScanResult } from '@/modules/reception/utils/cccdQrParser';
import {
    buildSearchPreview,
    formatPhoneDisplay,
    getInitials,
    priorityBadgeClass,
} from '@/modules/reception/utils/receptionSearch';
import {
    buildRegisterPrefill,
    saveRegisterPrefill,
} from '@/modules/reception/utils/registerPrefill';
import { ReceptionPageShell } from '@/modules/reception/components/ReceptionPageShell';

function formatDob(dateStr?: string | null): string {
    if (!dateStr || dateStr.trim() === '' || dateStr === '—') return '—';
    const trimmed = dateStr.trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        const [, yyyy, mm, dd] = isoMatch;
        return `${dd}/${mm}/${yyyy}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
        return trimmed;
    }
    try {
        const d = new Date(trimmed);
        if (isNaN(d.getTime())) return trimmed;
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    } catch {
        return trimmed;
    }
}

function formatDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${min} - ${dd}/${mm}/${yyyy}`;
    } catch {
        return dateStr;
    }
}

function PatientResultCard({
    result,
    onViewFlows,
}: {
    result: PatientSearchResult;
    onViewFlows?: (patient: PatientSearchResult) => void;
}) {
    const router = useRouter();

    const handleBookAppointment = () => {
        const prefill = buildRegisterPrefill(result);
        saveRegisterPrefill(prefill);
        router.push('/reception');
    };

    return (
        <div className="rounded-[14px] border border-[#EBEBEB] bg-white p-4 md:p-5 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-full bg-[#EDE9FE] text-[#8B7CF6] flex items-center justify-center text-[14px] font-bold shrink-0">
                        {getInitials(result.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <h3 className="text-[15px] font-bold text-[#1F2937]">{result.name}</h3>
                            {result.priority === 'Người cao tuổi' && (
                                <span
                                    className={cn(
                                        'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                        priorityBadgeClass(result.priority),
                                    )}
                                >
                                    {result.priority}
                                </span>
                            )}
                            {result.gender && (
                                <span
                                    className={cn(
                                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                                        result.gender.toUpperCase() === 'FEMALE'
                                            ? 'bg-[#FCE7F3] text-[#DB2777]'
                                            : 'bg-[#E0F2FE] text-[#0369A1]',
                                    )}
                                >
                                    {result.gender.toUpperCase() === 'FEMALE' ? 'Nữ' : 'Nam'}
                                </span>
                            )}
                            {result.blood_type && (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-600">
                                    Máu: {result.blood_type}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
                            <div className="flex items-center gap-2 text-[#6B7280]">
                                <IdCard className="w-3.5 h-3.5 shrink-0 text-[#9CA3AF]" />
                                <span>
                                    CCCD: <strong className="text-[#374151]">{result.citizenId}</strong>
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-[#6B7280]">
                                <CalendarDays className="w-3.5 h-3.5 shrink-0 text-[#9CA3AF]" />
                                <span>
                                    Ngày sinh: <strong className="text-[#374151]">{formatDob(result.dob)}</strong>
                                </span>
                            </div>
                            {result.phone && (
                                <div className="flex items-center gap-2 text-[#6B7280]">
                                    <Phone className="w-3.5 h-3.5 shrink-0 text-[#9CA3AF]" />
                                    <span>{formatPhoneDisplay(result.phone)}</span>
                                </div>
                            )}
                            {result.email && (
                                <div className="flex items-center gap-2 text-[#6B7280]">
                                    <User className="w-3.5 h-3.5 shrink-0 text-[#9CA3AF]" />
                                    <span className="truncate">{result.email}</span>
                                </div>
                            )}
                            {result.createdAt && (
                                <div className="flex items-center gap-2 text-[#6B7280]">
                                    <Clock className="w-3.5 h-3.5 shrink-0 text-[#9CA3AF]" />
                                    <span>
                                        Ngày tạo: <strong className="text-[#374151]">{formatDate(result.createdAt)}</strong>
                                    </span>
                                </div>
                            )}
                        </div>

                        {result.bhyt && result.bhyt !== 'N/A' && (
                            <div className="mt-3">
                                <span className="inline-flex text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-1 rounded-md">
                                    BHYT: {result.bhyt}
                                </span>
                            </div>
                        )}

                        {result.allergy_notes && result.allergy_notes !== 'N/A' && (
                            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200/60 p-3 text-[12px] text-amber-800">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold">Ghi chú dị ứng: </span>
                                    <span>{result.allergy_notes}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 self-end md:self-center w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={handleBookAppointment}
                        className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-4 py-2 rounded-lg bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-[12px] font-bold shadow-[0_2px_8px_rgba(139,124,246,0.25)] transition-all touch-manipulation cursor-pointer"
                    >
                        Đặt lịch khám
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onViewFlows?.(result)}
                        className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-4 py-2 rounded-lg border border-[#8B7CF6]/30 bg-[#F5F3FF] text-[#6D28D9] text-[12px] font-bold hover:bg-[#EDE9FE] transition-colors touch-manipulation cursor-pointer"
                    >
                        <FileText className="w-3.5 h-3.5 text-[#8B7CF6]" />
                        Xem phiếu khám
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ReceptionSearchForm() {
    const router = useRouter();
    const accessToken = useAuthStore((s) => s.accessToken);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PatientSearchResult[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;
    const [error, setError] = useState<string | null>(null);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [activeFlowPatient, setActiveFlowPatient] = useState<PatientSearchResult | null>(null);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setHasSearched(false);
            setCurrentPage(1);
        }
    }, [query]);

    function runSearch(searchQuery: string) {
        if (!accessToken || !searchQuery.trim()) return;
        setError(null);
        setCurrentPage(1);

        startTransition(async () => {
            try {
                const data = await receptionService.searchPatients(searchQuery, accessToken);
                setResults(data);
                setHasSearched(true);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Tra cứu thất bại.');
                setResults([]);
                setHasSearched(true);
            }
        });
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        runSearch(query);
    }

    function handleQrSuccess(data: CccdScanResult) {
        setQuery(data.citizen_id);
        setError(null);
        runSearch(data.citizen_id);
    }

    const preview = results.length > 0 ? buildSearchPreview(results[0]) : null;
    const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    const paginatedResults = results.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
    );

    if (activeFlowPatient) {
        return (
            <ReceptionPageShell maxWidth="max-w-5xl">
                <PatientActiveFlowsView
                    patient={activeFlowPatient}
                    onBack={() => setActiveFlowPatient(null)}
                    onBookNew={(p) => {
                        const prefill = buildRegisterPrefill(p);
                        saveRegisterPrefill(prefill);
                        router.push('/reception');
                    }}
                />
            </ReceptionPageShell>
        );
    }

    return (
        <ReceptionPageShell maxWidth="max-w-5xl">
            <div className="mb-6">
                <h1 className="text-[22px] font-bold text-[#1F2937] tracking-tight">Tra cứu bệnh nhân</h1>
                <p className="text-[13px] text-[#9CA3AF] mt-1">
                    Tìm kiếm theo tên, CCCD, mã BHYT, số điện thoại, số vé
                </p>
            </div>

            <div className="rounded-[14px] border border-[#EBEBEB] bg-white p-4 md:p-5 shadow-[0_1px_6px_rgba(0,0,0,0.04)] mb-5">
                <form onSubmit={handleSearch}>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Nhập tên, CCCD, BHYT, số điện thoại, số vé..."
                                className="w-full rounded-lg border border-[#E5E7EB] bg-white pl-10 pr-3.5 py-3 text-base sm:text-[14px] text-[#1F2937] placeholder-[#9CA3AF] outline-none transition focus:border-[#8B7CF6] focus:ring-2 focus:ring-[#8B7CF6]/15 touch-manipulation"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={isPending || !query.trim()}
                                className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 min-h-[48px] px-5 rounded-lg bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-[13px] font-bold transition-colors disabled:opacity-50 touch-manipulation"
                            >
                                {isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Search className="w-4 h-4" />
                                )}
                                Tìm kiếm
                            </button>
                            <button
                                type="button"
                                onClick={() => setScannerOpen(true)}
                                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-lg border border-[#E5E7EB] bg-white text-[#374151] text-[13px] font-bold hover:bg-[#F9FAFB] transition-colors touch-manipulation"
                            >
                                <QrCode className="w-4 h-4 text-[#8B7CF6]" />
                                <span className="hidden sm:inline">Quét QR</span>
                            </button>
                        </div>
                    </div>
                </form>

                {preview && hasSearched && results.length > 0 && (
                    <p className="mt-3 text-[11px] text-[#9CA3AF] truncate border-t border-[#F3F4F6] pt-3">
                        {preview}
                    </p>
                )}
            </div>

            {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[13px] text-red-700">{error}</p>
                </div>
            )}

            {hasSearched && !isPending && results.length > 0 && (
                <p className="text-[12px] font-semibold text-[#6B7280] mb-3">
                    {results.length} kết quả tìm thấy
                </p>
            )}

            {!hasSearched && !isPending && results.length === 0 && !error && (
                <div className="rounded-[14px] border border-[#EBEBEB] bg-[#FAFAFA] p-8 text-center mb-3">
                    <Search className="w-10 h-10 text-[#8B7CF6]/60 mx-auto mb-3" />
                    <p className="text-[14px] font-bold text-[#374151]">Tra cứu hồ sơ bệnh nhân</p>
                    <p className="text-[12px] text-[#9CA3AF] mt-1.5 max-w-md mx-auto leading-relaxed">
                        Nhập họ tên, số CCCD, số điện thoại hoặc số vé của bệnh nhân để tìm kiếm kết quả.
                    </p>
                </div>
            )}

            {hasSearched && results.length === 0 && !error && !isPending && (
                <div className="rounded-[14px] border border-[#EBEBEB] bg-[#FAFAFA] p-8 text-center">
                    <User className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
                    <p className="text-[14px] font-semibold text-[#6B7280]">Không tìm thấy kết quả</p>
                    <p className="text-[12px] text-[#9CA3AF] mt-1">
                        Thử tìm bằng CCCD, số điện thoại, họ tên hoặc quét QR CCCD
                    </p>
                </div>
            )}

            <div className="space-y-3">
                {paginatedResults.map((result) => (
                    <PatientResultCard
                        key={`${result.accountId}-${result.queueId ?? 'account'}`}
                        result={result}
                        onViewFlows={(p) => setActiveFlowPatient(p)}
                    />
                ))}
            </div>

            {results.length > PAGE_SIZE && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-[#EBEBEB] bg-white px-5 py-3.5 shadow-sm">
                    <p className="text-[13px] text-[#6B7280]">
                        Hiển thị{' '}
                        <strong className="text-[#1F2937]">
                            {(currentPage - 1) * PAGE_SIZE + 1}
                        </strong>{' '}
                        –{' '}
                        <strong className="text-[#1F2937]">
                            {Math.min(currentPage * PAGE_SIZE, results.length)}
                        </strong>{' '}
                        trong tổng số <strong className="text-[#1F2937]">{results.length}</strong> bệnh nhân
                    </p>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Trước</span>
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                                const isCurrent = pageNum === currentPage;
                                return (
                                    <button
                                        key={pageNum}
                                        type="button"
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={cn(
                                            'min-w-[32px] h-8 rounded-lg text-[12px] font-bold transition-all touch-manipulation flex items-center justify-center',
                                            isCurrent
                                                ? 'bg-[#8B7CF6] text-white shadow-sm'
                                                : 'border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]',
                                        )}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation"
                        >
                            <span>Sau</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <CccdQrScanner
                open={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onSuccess={handleQrSuccess}
                onManualInput={() => setScannerOpen(false)}
            />
        </ReceptionPageShell>
    );
}
