'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
    Search,
    Loader2,
    AlertCircle,
    CheckCircle2,
    User,
    UserPlus,
    QrCode,
    IdCard,
    Stethoscope,
    Phone,
    Clock,
    ChevronRight,
    Printer,
    Pencil,
    X,
    Plus,
    ScanLine,
    CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { receptionService } from '@/modules/reception/services/receptionService';
import { CccdQrScanner } from '@/modules/reception/components/CccdQrScanner';
import { CccdImageUpload } from '@/modules/reception/components/CccdImageUpload';
import type { PatientSearchResult } from '@/modules/reception/types/reception.types';
import type { CccdScanResult } from '@/modules/reception/utils/cccdQrParser';
import type { Gender } from '@/shared/types/auth.types';
import {
    buildSearchPreview,
    formatPhoneDisplay,
    getInitials,
    priorityBadgeClass,
    statusBadgeClass,
} from '@/modules/reception/utils/receptionSearch';
import {
    buildRegisterPrefill,
    saveRegisterPrefill,
} from '@/modules/reception/utils/registerPrefill';
import { ReceptionBackLink, ReceptionPageShell } from '@/modules/reception/components/ReceptionPageShell';

function handleReprintTicket(result: PatientSearchResult) {
    if (!result.ticketNo) return;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Vé khám ${result.ticketNo}</title>
<style>body{font-family:system-ui,sans-serif;padding:32px;max-width:360px;margin:0 auto}
h1{font-size:22px;margin:0 0 8px}p{margin:4px 0;font-size:14px}.ticket{font-size:32px;font-weight:700;color:#8B7CF6;margin:16px 0}
</style></head><body>
<h1>TriageFlow OPD</h1>
<div class="ticket">${result.ticketNo}</div>
<p><strong>${result.name}</strong></p>
<p>CCCD: ${result.citizenId}</p>
<p>SĐT: ${formatPhoneDisplay(result.phone)}</p>
<p>Khoa: ${result.specialty}</p>
<script>window.onload=()=>{window.print();}</script></body></html>`;

    const win = window.open('', '_blank', 'width=420,height=560');
    if (!win) return;
    win.document.write(html);
    win.document.close();
}

function PatientResultCard({
    result,
}: {
    result: PatientSearchResult;
}) {
    return (
        <div className="rounded-[14px] border border-[#EBEBEB] bg-white p-4 md:p-5 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-full bg-[#EDE9FE] text-[#8B7CF6] flex items-center justify-center text-[14px] font-bold shrink-0">
                        {getInitials(result.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <h3 className="text-[15px] font-bold text-[#1F2937]">{result.name}</h3>
                            {result.ticketNo && (
                                <span className="text-[11px] font-bold text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-md font-mono">
                                    {result.ticketNo}
                                </span>
                            )}
                            {result.priority !== 'Thường' && (
                                <span
                                    className={cn(
                                        'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                        priorityBadgeClass(result.priority),
                                    )}
                                >
                                    {result.priority}
                                </span>
                            )}
                            <span
                                className={cn(
                                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                                    statusBadgeClass(result.status),
                                )}
                            >
                                {result.status}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
                            <div className="flex items-center gap-2 text-[#6B7280]">
                                <IdCard className="w-3.5 h-3.5 shrink-0 text-[#9CA3AF]" />
                                <span>
                                    CCCD: <strong className="text-[#374151]">{result.citizenId}</strong>
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-[#6B7280]">
                                <Phone className="w-3.5 h-3.5 shrink-0 text-[#9CA3AF]" />
                                <span>{formatPhoneDisplay(result.phone)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[#6B7280]">
                                <Stethoscope className="w-3.5 h-3.5 shrink-0 text-[#9CA3AF]" />
                                <span>{result.specialty}</span>
                            </div>
                            {result.inQueueToday && result.waitMinutes !== undefined && (
                                <div className="flex items-center gap-2 text-[#6B7280]">
                                    <Clock className="w-3.5 h-3.5 shrink-0 text-[#9CA3AF]" />
                                    <span>Chờ {result.waitMinutes} phút</span>
                                </div>
                            )}
                        </div>

                        {result.bhyt && (
                            <div className="mt-3">
                                <span className="inline-flex text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-1 rounded-md">
                                    BHYT: {result.bhyt}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-row md:flex-col gap-2 shrink-0">
                    {result.queueId ? (
                        <Link
                            href={`/reception/${result.queueId}`}
                            className="inline-flex flex-1 md:flex-none items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-lg bg-[#EDE9FE] text-[#8B7CF6] text-[12px] font-bold hover:bg-[#DDD6FE] transition-colors touch-manipulation"
                        >
                            Chi tiết
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    ) : (
                        <Link
                            href="/reception/register"
                            onClick={() => saveRegisterPrefill(buildRegisterPrefill(result))}
                            className="inline-flex flex-1 md:flex-none items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-lg bg-[#EDE9FE] text-[#8B7CF6] text-[12px] font-bold hover:bg-[#DDD6FE] transition-colors touch-manipulation"
                        >
                            Đặt lịch
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    )}
                    <button
                        type="button"
                        onClick={() => handleReprintTicket(result)}
                        disabled={!result.ticketNo}
                        className="inline-flex flex-1 md:flex-none items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB] text-[12px] font-bold hover:bg-[#DBEAFE] transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                    >
                        <Printer className="w-4 h-4" />
                        In vé
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ReceptionSearchForm() {
    const accessToken = useAuthStore((s) => s.accessToken);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PatientSearchResult[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [isListMode, setIsListMode] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [successBanner, setSuccessBanner] = useState<string | null>(null);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [modalScannerOpen, setModalScannerOpen] = useState(false);

    const [createForm, setCreateForm] = useState({
        full_name: '',
        citizen_id: '',
        dob: '1990-01-01',
        gender: 'MALE' as Gender,
        phone: '',
        bhyt: '',
        address: '',
    });

    useEffect(() => {
        if (!accessToken) return;

        startTransition(async () => {
            try {
                setError(null);
                const data = await receptionService.listPatients(accessToken);
                setResults(data);
                setIsListMode(true);
                setHasSearched(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Không tải được danh sách bệnh nhân.');
                setResults([]);
            }
        });
    }, [accessToken]);

    function runSearch(searchQuery: string) {
        if (!accessToken || !searchQuery.trim()) return;
        setError(null);

        startTransition(async () => {
            try {
                const data = await receptionService.searchPatients(searchQuery, accessToken);
                setResults(data);
                setHasSearched(true);
                setIsListMode(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Tra cứu thất bại.');
                setResults([]);
                setHasSearched(true);
                setIsListMode(false);
            }
        });
    }

    function loadAllPatients() {
        if (!accessToken) return;
        setQuery('');
        setError(null);

        startTransition(async () => {
            try {
                const data = await receptionService.listPatients(accessToken);
                setResults(data);
                setHasSearched(false);
                setIsListMode(true);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Không tải được danh sách bệnh nhân.');
                setResults([]);
            }
        });
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        runSearch(query);
    }

    function handleQrSuccess(data: CccdScanResult) {
        setQuery(data.citizen_id);
        if (data.ekyc_verified) {
            setError(null);
        }
        runSearch(data.citizen_id);
    }

    function handleModalQrSuccess(data: CccdScanResult) {
        setCreateForm((prev) => ({
            ...prev,
            full_name: data.full_name || prev.full_name,
            citizen_id: data.citizen_id || prev.citizen_id,
            dob: data.dob || prev.dob,
            gender: data.gender === 'FEMALE' ? 'FEMALE' : 'MALE',
            address: data.address || prev.address,
        }));
        setModalScannerOpen(false);
    }

    async function handleCreatePatientSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!accessToken) return;

        const name = createForm.full_name.trim();
        const citizenId = createForm.citizen_id.trim().replace(/\D/g, '');
        const dob = createForm.dob;
        const phone = createForm.phone?.trim() || '0947900492';
        if (!name || !citizenId || !dob) {
            setModalError('Vui lòng điền đầy đủ Họ tên, Số CCCD và Ngày sinh.');
            return;
        }
        if (citizenId.length !== 12) {
            setModalError('Số CCCD phải đúng 12 chữ số.');
            return;
        }

        setIsSubmitting(true);
        setModalError(null);
        try {
            const email = `bn.${citizenId.slice(-8)}@patient.triageflow.me`;
            const suffix = citizenId.slice(-6) || '000000';
            const password = `Patient@${suffix}`;

            // Gọi API registerPatient của receptionService chuẩn
            const createdId = await receptionService.registerPatient(
                {
                    email,
                    full_name: name,
                    dob,
                    password,
                    gender: createForm.gender,
                    citizen_id: citizenId,
                    phone,
                    bhyt: createForm.bhyt || undefined,
                },
                accessToken,
            );

            const newPatientCard: PatientSearchResult = {
                accountId: createdId || `patient-${Date.now()}`,
                patient_id: createdId || undefined,
                name,
                citizenId,
                phone: phone || null,
                email: email,
                dob,
                gender: createForm.gender,
                specialty: '—',
                bhyt: createForm.bhyt || null,
                priority: 'Thường',
                status: 'Không trong hàng đợi',
                inQueueToday: false,
            };

            setCreateModalOpen(false);
            setSuccessBanner(`✓ Đã tạo hồ sơ: ${name} — Chọn "Đặt lịch" để tiếp tục đăng ký khám.`);
            setCreateForm({
                full_name: '',
                citizen_id: '',
                dob: '1990-01-01',
                gender: 'MALE',
                phone: '',
                bhyt: '',
                address: '',
            });

            setQuery(name);
            setHasSearched(true);
            setIsListMode(false);
            setResults((prev) => [newPatientCard, ...prev.filter((p) => p.citizenId !== citizenId)]);

            // Tra cứu lại để sync danh sách
            try {
                const searchResults = await receptionService.searchPatients(name, accessToken);
                if (searchResults && searchResults.length > 0) {
                    setResults(searchResults);
                }
            } catch {
                // Giữ newPatientCard
            }
        } catch (err: any) {
            const msg = err?.message || '';
            if (msg.includes('đã tồn tại') || msg.includes('duplicate') || msg.includes('conflict')) {
                setModalError('Bệnh nhân với CCCD này đã có hồ sơ trong hệ thống. Hãy tìm kiếm để tìm lại.');
            } else {
                setModalError(msg || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    const preview = results.length > 0 ? buildSearchPreview(results[0]) : null;

    return (
        <ReceptionPageShell maxWidth="max-w-5xl">
            <ReceptionBackLink />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-[22px] font-bold text-[#1F2937] tracking-tight">Tra cứu bệnh nhân</h1>
                    <p className="text-[13px] text-[#9CA3AF] mt-1">
                        Tìm kiếm theo tên, CCCD, mã BHYT, số điện thoại, số vé
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setCreateModalOpen(true);
                        setModalError(null);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-[13px] font-bold shadow-[0_2px_8px_rgba(139,124,246,0.3)] transition-all shrink-0 touch-manipulation"
                >
                    <CalendarDays className="w-4 h-4" />
                    Đăng ký khám mới
                </button>
            </div>

            {successBanner && (
                <div className="mb-5 flex items-center justify-between gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 text-[13px] font-semibold">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{successBanner}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSuccessBanner(null)}
                        className="text-emerald-700 hover:text-emerald-900"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

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
                                onClick={loadAllPatients}
                                disabled={isPending}
                                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-lg border border-[#E5E7EB] bg-white text-[#374151] text-[13px] font-bold hover:bg-[#F9FAFB] transition-colors disabled:opacity-50 touch-manipulation"
                            >
                                <User className="w-4 h-4 text-[#8B7CF6]" />
                                <span className="hidden sm:inline">Tất cả</span>
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

            {isListMode && !hasSearched && !isPending && results.length > 0 && (
                <p className="text-[12px] font-semibold text-[#6B7280] mb-3">
                    {results.length} bệnh nhân trong hệ thống
                </p>
            )}

            {isListMode && !hasSearched && !isPending && results.length === 0 && !error && (
                <div className="rounded-[14px] border border-[#EBEBEB] bg-[#FAFAFA] p-8 text-center mb-3">
                    <User className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
                    <p className="text-[14px] font-semibold text-[#6B7280]">Chưa có bệnh nhân trong hệ thống</p>
                    <p className="text-[12px] text-[#9CA3AF] mt-1">
                        Đăng ký bệnh nhân mới hoặc chạy seed dữ liệu mẫu
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setCreateModalOpen(true);
                            setModalError(null);
                        }}
                        className="inline-flex items-center gap-1.5 mt-4 text-[12px] font-bold text-[#8B7CF6] hover:underline"
                    >
                        <CalendarDays className="w-4 h-4" />
                        Đăng ký khám ngay
                    </button>
                </div>
            )}

            {hasSearched && results.length === 0 && !error && !isPending && (
                <div className="rounded-[14px] border border-[#EBEBEB] bg-[#FAFAFA] p-8 text-center">
                    <User className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
                    <p className="text-[14px] font-semibold text-[#6B7280]">Không tìm thấy kết quả</p>
                    <p className="text-[12px] text-[#9CA3AF] mt-1">
                        Thử tìm bằng CCCD, số vé (A-042) hoặc quét QR CCCD
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setCreateModalOpen(true);
                            setModalError(null);
                        }}
                        className="inline-flex items-center gap-1.5 mt-4 text-[12px] font-bold text-[#8B7CF6] hover:underline touch-manipulation"
                    >
                        <CalendarDays className="w-4 h-4" />
                        Đăng ký bệnh nhân mới
                    </button>
                </div>
            )}

            <div className="space-y-3">
                {results.map((result) => (
                    <PatientResultCard
                        key={`${result.accountId}-${result.queueId ?? 'account'}`}
                        result={result}
                    />
                ))}
            </div>

            {/* Modal Đăng Ký Khám Mới */}
            {createModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F4F6] shrink-0">
                            <div>
                                <h2 className="text-[17px] font-bold text-[#1F2937] flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4 text-[#8B7CF6]" />
                                    Đăng ký khám mới
                                </h2>
                                <p className="text-[11px] text-[#9CA3AF] mt-0.5">Điền thông tin hoặc quét CCCD/VNeID để tự động điền</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(false)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6] transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                            {modalError && (
                                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                    <span>{modalError}</span>
                                </div>
                            )}

                            {/* CCCD Scanner button */}
                            <button
                                type="button"
                                onClick={() => setModalScannerOpen(true)}
                                className="w-full rounded-[12px] border-2 border-dashed border-[#D1D5DB] bg-[#FAFAFA] px-5 py-6 flex flex-col items-center text-center touch-manipulation cursor-pointer select-none active:bg-[#F5F2FF] active:border-[#8B7CF6] transition-colors"
                            >
                                <div className="w-12 h-12 rounded-xl bg-[#EDE9FE] flex items-center justify-center mb-2.5">
                                    <ScanLine className="w-6 h-6 text-[#8B7CF6]" strokeWidth={2} />
                                </div>
                                <p className="text-[14px] font-bold text-[#374151]">Quét CCCD / VNeID</p>
                                <p className="text-[11px] text-[#9CA3AF] mt-1">Chạm để mở camera và quét mã QR — tự động điền thông tin</p>
                                <span className="mt-3 inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#8B7CF6] text-white text-[12px] font-bold shadow-[0_2px_8px_rgba(139,124,246,0.3)]">
                                    <ScanLine className="w-3.5 h-3.5" />
                                    Bắt đầu quét
                                </span>
                            </button>

                            {/* Upload ảnh CCCD */}
                            <CccdImageUpload
                                accessToken={accessToken}
                                onSuccess={(data) => handleModalQrSuccess(data)}
                                onError={(message) => setModalError(message)}
                                disabled={isSubmitting}
                            />

                            {/* Personal info card */}
                            <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-5 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
                                <div className="flex items-center gap-2 mb-4">
                                    <User className="w-4 h-4 text-[#8B7CF6]" strokeWidth={2.25} />
                                    <h3 className="text-[13px] font-bold text-[#1F2937]">Thông tin cá nhân</h3>
                                </div>

                                <form id="create-patient-form" onSubmit={handleCreatePatientSubmit} className="space-y-3 text-[13px]">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <label className="block text-[13px] font-medium text-[#374151]">
                                                Họ và tên <span className="text-[#EF4444] ml-0.5">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={createForm.full_name}
                                                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                                                placeholder="Ví dụ: NGUYỄN VĂN A"
                                                className="block w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-[13px] text-[#1F2937] placeholder-[#9CA3AF] outline-none transition focus:border-[#8B7CF6] focus:ring-2 focus:ring-[#8B7CF6]/15"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-[13px] font-medium text-[#374151]">
                                                Số CCCD <span className="text-[#EF4444] ml-0.5">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={createForm.citizen_id}
                                                onChange={(e) => setCreateForm({ ...createForm, citizen_id: e.target.value.replace(/\D/g, '') })}
                                                placeholder="012345678901"
                                                className="block w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-[13px] text-[#1F2937] placeholder-[#9CA3AF] outline-none transition focus:border-[#8B7CF6] focus:ring-2 focus:ring-[#8B7CF6]/15"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-[13px] font-medium text-[#374151]">
                                                Ngày sinh <span className="text-[#EF4444] ml-0.5">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                value={createForm.dob}
                                                onChange={(e) => setCreateForm({ ...createForm, dob: e.target.value })}
                                                className="block w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-[13px] text-[#1F2937] outline-none transition focus:border-[#8B7CF6] focus:ring-2 focus:ring-[#8B7CF6]/15"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-[13px] font-medium text-[#374151]">Giới tính <span className="text-[#EF4444] ml-0.5">*</span></label>
                                            <select
                                                value={createForm.gender}
                                                onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value as Gender })}
                                                className="block w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-[13px] text-[#1F2937] outline-none transition focus:border-[#8B7CF6] focus:ring-2 focus:ring-[#8B7CF6]/15"
                                            >
                                                <option value="FEMALE">Nữ</option>
                                                <option value="MALE">Nam</option>
                                                <option value="OTHER">Khác</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-[13px] font-medium text-[#374151]">
                                                Số điện thoại <span className="text-[#9CA3AF] font-normal">(tùy chọn)</span>
                                            </label>
                                            <input
                                                type="tel"
                                                value={createForm.phone}
                                                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                                                placeholder="0912345678"
                                                className="block w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-[13px] text-[#1F2937] placeholder-[#9CA3AF] outline-none transition focus:border-[#8B7CF6] focus:ring-2 focus:ring-[#8B7CF6]/15"
                                            />
                                        </div>


                                        <div className="space-y-1.5">
                                            <label className="block text-[13px] font-medium text-[#374151]">
                                                Mã BHYT <span className="text-[#9CA3AF] font-normal">(không bắt buộc)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={createForm.bhyt}
                                                onChange={(e) => setCreateForm({ ...createForm, bhyt: e.target.value })}
                                                placeholder="AB1234567890"
                                                className="block w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-[13px] text-[#1F2937] placeholder-[#9CA3AF] outline-none transition focus:border-[#8B7CF6] focus:ring-2 focus:ring-[#8B7CF6]/15"
                                            />
                                        </div>

                                        <div className="space-y-1.5 sm:col-span-2">
                                            <label className="block text-[13px] font-medium text-[#374151]">Địa chỉ</label>
                                            <input
                                                type="text"
                                                value={createForm.address}
                                                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                                                placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
                                                className="block w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-[13px] text-[#1F2937] placeholder-[#9CA3AF] outline-none transition focus:border-[#8B7CF6] focus:ring-2 focus:ring-[#8B7CF6]/15"
                                            />
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-[#F3F4F6] flex items-center justify-end gap-3 shrink-0 bg-white">
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(false)}
                                className="px-4 py-2 rounded-lg border border-[#E5E7EB] bg-white text-[#374151] text-[13px] font-semibold hover:bg-neutral-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                form="create-patient-form"
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-[13px] font-bold shadow-[0_2px_8px_rgba(139,124,246,0.25)] transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                                {isSubmitting ? 'Đang tạo hồ sơ...' : 'Tạo hồ sơ & đăng ký'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CccdQrScanner
                open={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onSuccess={handleQrSuccess}
                onManualInput={() => setScannerOpen(false)}
            />

            <CccdQrScanner
                open={modalScannerOpen}
                onClose={() => setModalScannerOpen(false)}
                onSuccess={handleModalQrSuccess}
                onManualInput={() => setModalScannerOpen(false)}
            />
        </ReceptionPageShell>
    );
}
