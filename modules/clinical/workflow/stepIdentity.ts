import {
    normalizeRoomType,
    normalizeStepType,
} from '@/modules/admin/types/process.types';
import { asRecord } from './flowPickers';

export function normalizeStepLabel(name: string): string {
    return name.trim().toLowerCase().normalize('NFC');
}

export function isDefaultBookingStepName(name: string): boolean {
    const n = normalizeStepLabel(name);
    return (
        n === 'đặt khám' ||
        n === 'dat kham' ||
        n === 'đặt lịch' ||
        n === 'dat lich'
    );
}

export function isDefaultExamStepName(name: string): boolean {
    const n = normalizeStepLabel(name);
    return n === 'khám bệnh' || n === 'kham benh';
}

export function isPaymentStepName(name: string): boolean {
    const n = normalizeStepLabel(name);
    return n.startsWith('thanh toán') || n.startsWith('thanh toan');
}

export function stripPaymentPrefix(name: string): string {
    return normalizeStepLabel(name)
        .replace(/^thanh toán:\s*/, '')
        .replace(/^thanh toan:\s*/, '')
        .replace(/^thanh toán\s+/, '')
        .replace(/^thanh toan\s+/, '')
        .trim();
}

export function isExamPaymentStepName(name: string): boolean {
    if (!isPaymentStepName(name)) return false;
    const rest = stripPaymentPrefix(name);
    if (!rest) return true;
    if (isDefaultExamStepName(rest)) return true;
    if (rest.includes('chuyên khoa') || rest.includes('chuyen khoa')) return true;
    if (rest.includes('viện phí') || rest.includes('vien phi')) return true;
    if (rest.includes('lấy số') || rest.includes('lay so')) return true;
    if (rest.includes('đặt khám') || rest.includes('dat kham')) return true;
    if (rest === 'khám' || rest === 'kham') return true;
    return false;
}

export function isPaidPaymentStatus(paymentStatus?: string): boolean {
    const pay = (paymentStatus || '').toUpperCase().trim();
    return ['SUCCESSED', 'SUCCESS', 'PAID', 'COMPLETED', 'DONE', 'FINISHED'].includes(pay);
}

export function isDraftPaymentStep(step: {
    tempId?: string;
    step_name?: string;
    step_type?: string;
    room_type?: string;
}): boolean {
    if (step.tempId?.startsWith('draft-pay-')) return true;
    const stepType = normalizeStepType(step.step_type, step.room_type);
    const roomType = normalizeRoomType(step.room_type);
    if (stepType === 'PAYMENT' || roomType === 'CASHIER') return true;
    const name = step.step_name || '';
    return isPaymentStepName(name) || isExamPaymentStepName(name);
}

export function shouldHideLiveFlowStep(step: Record<string, unknown>): boolean {
    const stepStatus = String(step.step_status || '').toUpperCase();
    if (stepStatus !== 'CANCELLED' && stepStatus !== 'CANCELED') return false;
    if (isPaidPaymentStatus(String(step.payment_status || ''))) return false;

    const name = String(step.step_name || '');
    if (isExamPaymentStepName(name)) return false;

    const stepType = String(step.step_type || '').toUpperCase();
    const roomType = String(step.room_type || '').toUpperCase();
    if (
        (stepType === 'PAYMENT' || roomType === 'CASHIER') &&
        isPaidPaymentStatus(String(step.payment_status || ''))
    ) {
        return false;
    }

    return true;
}

export function formatFlowStepLabel(rawName: string, opts?: { forcePayment?: boolean }): string {
    const raw = (rawName || '').trim();
    if (!raw) return opts?.forcePayment ? 'Thanh toán' : 'Bước';

    if (isPaymentStepName(raw) || isExamPaymentStepName(raw)) {
        if (raw.includes(':')) return raw;
        const remainder = raw
            .replace(/^thanh toán\s+/i, '')
            .replace(/^thanh toan\s+/i, '')
            .trim();
        return remainder ? `Thanh toán: ${remainder}` : raw;
    }

    if (opts?.forcePayment) {
        return `Thanh toán: ${raw}`;
    }
    return raw;
}

export function isProtectedBaseStep(step: Record<string, unknown>): boolean {
    const name = String(step.step_name || '');
    return isDefaultBookingStepName(name) || isDefaultExamStepName(name);
}

export function findLiveExamStepId(steps: unknown[]): string {
    for (const item of steps) {
        const live = asRecord(item);
        if (!live) continue;
        const status = String(live.step_status || '').toUpperCase();
        if (status === 'CANCELLED') continue;
        const name = String(live.step_name || '');
        if (isDefaultExamStepName(name) && typeof live.step_id === 'string') {
            return live.step_id;
        }
    }
    return '';
}

export function formatStepStatusVi(status?: string | null): string {
    const s = (status || '').toUpperCase().trim();
    if (!s || s === 'N/A') return 'Chưa xác định';
    if (['COMPLETED', 'DONE', 'FINISHED', 'SUCCESSED', 'SUCCESS'].includes(s)) return 'Hoàn tất';
    if (['IN_PROGRESS', 'PROCESSING', 'CURRENT', 'DOING', 'EXAMINING', 'ACTIVE', 'ONGOING'].includes(s)) {
        return 'Đang thực hiện';
    }
    if (['CANCELLED', 'CANCELED'].includes(s)) return 'Đã hủy';
    if (['DECLINED', 'REJECTED', 'DENIED'].includes(s)) return 'Từ chối';
    if (s === 'PAID') return 'Đã thanh toán';
    if (['PENDING', 'WAITING', 'NOT_STARTED'].includes(s)) return 'Chờ thực hiện';
    return status?.trim() || 'Chưa xác định';
}

export function isStepContentLocked(status?: string | null): boolean {
    const s = (status || '').toUpperCase().trim();
    if (['COMPLETED', 'DONE', 'FINISHED', 'SUCCESSED', 'SUCCESS'].includes(s)) return true;
    if (['IN_PROGRESS', 'PROCESSING', 'CURRENT', 'DOING', 'EXAMINING', 'ACTIVE', 'ONGOING'].includes(s)) {
        return true;
    }
    return false;
}

export function isPaymentFlowNode(opts: {
    label?: string;
    stepType?: string;
    roomType?: string;
}): boolean {
    const label = opts.label || '';
    if (isPaymentStepName(label) || isExamPaymentStepName(label)) return true;
    const stepType = String(opts.stepType || '').toUpperCase();
    const roomType = String(opts.roomType || '').toUpperCase();
    return stepType === 'PAYMENT' || roomType === 'CASHIER' || roomType === 'PAYMENT';
}

export function normalizeStepStatusForApi(
    status?: string
): 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED' | 'CANCELLED' {
    const normalized = (status || '').toUpperCase().trim();
    if (['COMPLETED', 'DONE', 'FINISHED', 'SUCCESSED'].includes(normalized)) return 'COMPLETED';
    if (['IN_PROGRESS', 'PROCESSING', 'ONGOING', 'CURRENT', 'DOING', 'EXAMINING', 'ACTIVE'].includes(normalized)) {
        return 'IN_PROGRESS';
    }
    if (['DECLINED', 'REJECTED', 'DENIED'].includes(normalized)) return 'DECLINED';
    if (['CANCELLED', 'CANCELED'].includes(normalized)) return 'CANCELLED';
    return 'PENDING';
}
