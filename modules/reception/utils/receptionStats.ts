import type { QueuePatient, ReceptionStatsSummary } from '@/modules/reception/types/reception.types';

export function buildStatsSummary(
    queue: QueuePatient[],
    bookingCount: number,
    flowCount: number,
    transactionCount: number,
): ReceptionStatsSummary {
    const waiting = queue.filter((p) => p.status === 'Chờ khám').length;
    const inExam = queue.filter((p) => p.status === 'Đang khám').length;
    const paymentPending = queue.filter((p) => p.status === 'Chờ TT').length;
    const paid = queue.filter((p) => p.status === 'Đã TT').length;
    const emergency = queue.filter((p) => p.priority === 'Khẩn cấp').length;
    const avgWaitMinutes =
        queue.length > 0
            ? Math.round(queue.reduce((sum, p) => sum + p.waitMinutes, 0) / queue.length)
            : 0;

    return {
        totalQueue: queue.length,
        waiting,
        inExam,
        paymentPending,
        paid,
        bookings: bookingCount,
        flows: flowCount,
        transactions: transactionCount,
        emergency,
        avgWaitMinutes,
    };
}
