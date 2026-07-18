'use client';

import { useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, CreditCard, ExternalLink, Copy, Check } from 'lucide-react';
import { formatCaughtError } from '@/shared/utils/apiError';
import { ApiError } from '@/shared/services/apiClient';
import { receptionService } from '@/modules/reception/services/receptionService';
import {
    getTodayDateString,
    mapBackendToQueuePatient,
} from '@/modules/reception/utils/receptionMapper';
import type { QueuePatient, TransactionQrResponse } from '@/modules/reception/types/reception.types';
import { ReceptionBackLink, ReceptionPageShell } from '@/modules/reception/components/ReceptionPageShell';

const inputClass =
    'block w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-[#8B7CF6] focus:ring-2 focus:ring-[#8B7CF6]/20 disabled:opacity-50';

export function ReceptionPaymentForm() {
    const accessToken = useAuthStore((s) => s.accessToken);
    const searchParams = useSearchParams();
    const queueFromUrl = searchParams.get('queue');
    const [isPending, startTransition] = useTransition();

    const [queue, setQueue] = useState<QueuePatient[]>([]);
    const [selectedQueueId, setSelectedQueueId] = useState('');
    const [amount, setAmount] = useState('200000');
    const [qrResult, setQrResult] = useState<TransactionQrResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoadingQueue, setIsLoadingQueue] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!accessToken) return;

        const load = async () => {
            try {
                setIsLoadingQueue(true);
                const today = getTodayDateString();
                const res = await receptionService.getQueueByDate(today, accessToken);
                const mapped = res.map(mapBackendToQueuePatient);
                setQueue(mapped);
                if (queueFromUrl && mapped.some((p) => p.id === queueFromUrl)) {
                    setSelectedQueueId(queueFromUrl);
                } else {
                    const pending = mapped.filter((p) => p.status === 'Chờ TT' || p.bookingId);
                    if (pending.length > 0) {
                        setSelectedQueueId(pending[0].id);
                    } else if (mapped.length > 0) {
                        setSelectedQueueId(mapped[0].id);
                    }
                }
            } catch {
                setQueue([]);
            } finally {
                setIsLoadingQueue(false);
            }
        };

        load();
    }, [accessToken, queueFromUrl]);

    const selected = queue.find((p) => p.id === selectedQueueId);

    function handleCreatePayment(e: React.FormEvent) {
        e.preventDefault();
        if (!accessToken || !selected?.bookingId) {
            setError('Chọn bệnh nhân có booking để thanh toán.');
            return;
        }

        const amountNum = Number(amount);
        if (!amountNum || amountNum < 1000) {
            setError('Số tiền tối thiểu 1.000 VND.');
            return;
        }

        setError(null);
        const origin = typeof window !== 'undefined' ? window.location.origin : '';

        startTransition(async () => {
            try {
                const res = await receptionService.createTransaction(
                    {
                        transType: 'BOOKING_PAYMENT_1',
                        amount: amountNum,
                        clientId: selected.bookingId!,
                        returnUrl: `${origin}/reception/payment?success=1`,
                        cancelUrl: `${origin}/reception/payment?cancel=1`,
                    },
                    accessToken,
                );
                const payload = res.data as TransactionQrResponse | null;
                setQrResult(
                    payload?.qrCode || payload?.checkoutUrl
                        ? payload
                        : (res as unknown as TransactionQrResponse),
                );
            } catch (err) {
                console.error('[Payment] create transaction failed:', err);
                const apiDetail = err instanceof ApiError ? err.detail : undefined;
                const baseMessage = formatCaughtError(err, 'Tạo mã QR thất bại.');
                setError(
                    apiDetail ? `${baseMessage}\nChi tiết: ${apiDetail}` : baseMessage,
                );
                setQrResult(null);
            }
        });
    }

    async function copyQr() {
        if (!qrResult?.qrCode) return;
        await navigator.clipboard.writeText(qrResult.qrCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <ReceptionPageShell maxWidth="max-w-lg">
            <ReceptionBackLink />
            <h1 className="text-[20px] font-bold text-[#1F2937]">Thanh toán QR</h1>
            <p className="text-[12px] text-[#9CA3AF] mt-1 mb-6">
                Tạo mã QR thanh toán qua API Transaction (PayOS).
            </p>

            {error && (
                <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 whitespace-pre-wrap break-words">{error}</p>
                </div>
            )}

            {isLoadingQueue ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#8B7CF6]" />
                </div>
            ) : (
                <form onSubmit={handleCreatePayment} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-neutral-700">Bệnh nhân</label>
                        <select
                            value={selectedQueueId}
                            onChange={(e) => setSelectedQueueId(e.target.value)}
                            disabled={isPending || queue.length === 0}
                            className={inputClass}
                        >
                            {queue.length === 0 ? (
                                <option value="">Chưa có bệnh nhân trong hàng đợi</option>
                            ) : (
                                queue.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.ticketNo} — {p.name} ({p.status})
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-neutral-700">Số tiền (VND)</label>
                        <input
                            type="number"
                            min={1000}
                            step={1000}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={isPending}
                            className={inputClass}
                        />
                    </div>

                    {selected && !selected.bookingId && (
                        <p className="text-[11px] text-amber-600 font-medium">
                            Bệnh nhân này chưa có booking ID — cần đặt lịch trước.
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isPending || !selected?.bookingId}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D97706] disabled:opacity-50"
                    >
                        {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <CreditCard className="w-4 h-4" />
                        )}
                        {isPending ? 'Đang tạo QR...' : 'Tạo mã QR thanh toán'}
                    </button>
                </form>
            )}

            {qrResult && (
                <div className="mt-6 rounded-[12px] border border-[#EBEBEB] bg-white p-5 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
                    <h2 className="text-[14px] font-bold text-[#1F2937] mb-4">Mã thanh toán</h2>

                    {qrResult.qrCode && (
                        <div className="flex flex-col items-center mb-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrResult.qrCode)}`}
                                alt="QR thanh toán"
                                width={200}
                                height={200}
                                className="rounded-lg border border-[#EBEBEB]"
                            />
                            <button
                                type="button"
                                onClick={copyQr}
                                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#8B7CF6]"
                            >
                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? 'Đã copy' : 'Copy mã QR'}
                            </button>
                        </div>
                    )}

                    <div className="space-y-2 text-[12px]">
                        {qrResult.amount != null && (
                            <div className="flex justify-between">
                                <span className="text-[#9CA3AF]">Số tiền</span>
                                <span className="font-bold text-[#1F2937]">
                                    {qrResult.amount.toLocaleString('vi-VN')} {qrResult.currency ?? 'VND'}
                                </span>
                            </div>
                        )}
                        {qrResult.status && (
                            <div className="flex justify-between">
                                <span className="text-[#9CA3AF]">Trạng thái</span>
                                <span className="font-semibold text-[#374151]">{qrResult.status}</span>
                            </div>
                        )}
                    </div>

                    {qrResult.checkoutUrl && (
                        <a
                            href={qrResult.checkoutUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#8B7CF6] px-4 py-2.5 text-sm font-semibold text-[#8B7CF6] hover:bg-[#F5F2FF]"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Mở trang thanh toán
                        </a>
                    )}
                </div>
            )}
        </ReceptionPageShell>
    );
}
