import {
    isDefaultBookingStepName,
    isDefaultExamStepName,
    isExamPaymentStepName,
    isPaymentStepName,
    normalizeStepLabel,
    stripPaymentPrefix,
} from './stepIdentity';
import { asRecord, pickLiveRequiredStepId, pickLiveServiceCode, pickStepOrderNumber } from './flowPickers';

export function detectUnlabeledPaymentStepIds(steps: unknown[]): Set<string> {
    type Entry = {
        id: string;
        key: string;
        createdAt: number;
        isPayment: boolean;
        index: number;
    };

    const entries: Entry[] = [];
    steps.forEach((item, index) => {
        const rec = asRecord(item);
        if (!rec) return;
        const status = String(rec.step_status || '').toUpperCase();
        if (status === 'CANCELLED' || status === 'CANCELED') return;
        const id = typeof rec.step_id === 'string' ? rec.step_id : '';
        if (!id) return;
        const stepName = String(rec.step_name || '').trim();
        if (!stepName || isDefaultBookingStepName(stepName) || isDefaultExamStepName(stepName)) {
            return;
        }
        const stepType = String(rec.step_type || '').toUpperCase();
        const roomType = String(rec.room_type || '').toUpperCase();
        const nameIsPayment = isPaymentStepName(stepName) || isExamPaymentStepName(stepName);
        const typedPayment =
            !nameIsPayment &&
            (stepType === 'PAYMENT' || roomType === 'CASHIER' || roomType === 'PAYMENT');
        const code = pickLiveServiceCode(rec);
        const key = code
            ? `code:${code}`
            : `name:${stripPaymentPrefix(stepName) || normalizeStepLabel(stepName)}`;
        const createdRaw = rec.create_at ?? rec.created_at ?? rec.updated_at;
        const createdAt = createdRaw ? new Date(createdRaw as string | number).getTime() : NaN;
        entries.push({
            id,
            key,
            createdAt: Number.isFinite(createdAt) ? createdAt : index,
            isPayment: nameIsPayment || typedPayment,
            index,
        });
    });

    const groups = new Map<string, Entry[]>();
    for (const e of entries) {
        const list = groups.get(e.key) || [];
        list.push(e);
        groups.set(e.key, list);
    }

    const paymentIds = new Set<string>();
    for (const list of groups.values()) {
        if (list.length < 2) continue;
        if (list.some((e) => e.isPayment)) {
            list.filter((e) => e.isPayment).forEach((e) => paymentIds.add(e.id));
            continue;
        }
        const sorted = [...list].sort(
            (a, b) => a.createdAt - b.createdAt || a.index - b.index || a.id.localeCompare(b.id)
        );
        for (let i = 1; i < sorted.length; i++) {
            paymentIds.add(sorted[i].id);
        }
    }
    return paymentIds;
}

export function orderFlowStepsForTimeline(steps: unknown[]): unknown[] {
    if (!Array.isArray(steps) || steps.length <= 1) return steps;

    const unlabeledPaymentIds = detectUnlabeledPaymentStepIds(steps);

    type Row = {
        item: unknown;
        index: number;
        orderNum: number | null;
        createdAt: number;
        dependsOn: string[];
        requiredStepId: string;
        stepId: string;
        liveStepId: string;
        templateStepId: string;
        stepName: string;
        stepNameLower: string;
        serviceCode: string;
        isPayment: boolean;
        isExamPayment: boolean;
        isBooking: boolean;
        isExam: boolean;
    };

    const templateLikeRank = (nameLower: string): number => {
        if (
            nameLower.includes('đăng ký') ||
            nameLower.includes('dang ky') ||
            nameLower.includes('phân loại') ||
            nameLower.includes('phan loai') ||
            nameLower.includes('tiếp đón') ||
            nameLower.includes('tiep don') ||
            nameLower.includes('tiếp nhận') ||
            nameLower.includes('tiep nhan')
        ) {
            return 0;
        }
        if (nameLower.includes('triage')) return 1;
        if (nameLower.includes('chuyên khoa') || nameLower.includes('chuyen khoa')) return 2;
        return 40;
    };

    const rows: Row[] = steps.map((item, index) => {
        const rec = asRecord(item) || {};
        const orderNum = pickStepOrderNumber(rec);
        const createdRaw = rec.create_at ?? rec.created_at ?? rec.updated_at;
        const createdAt = createdRaw ? new Date(createdRaw as string | number).getTime() : NaN;
        const dependsOn = Array.isArray(rec.depends_on)
            ? (rec.depends_on as unknown[]).filter((d): d is string => typeof d === 'string')
            : [];
        const templateStepId =
            typeof rec.template_step_id === 'string' ? rec.template_step_id.trim() : '';
        const liveStepId = typeof rec.step_id === 'string' ? rec.step_id.trim() : '';
        const stepId = templateStepId || liveStepId || `idx-${index}`;
        const stepName = String(rec.step_name || '').trim();
        const stepNameLower = normalizeStepLabel(stepName);
        const stepType = String(rec.step_type || '').toUpperCase();
        const roomType = String(rec.room_type || '').toUpperCase();
        const nameIsPayment = isPaymentStepName(stepName) || isExamPaymentStepName(stepName);
        const typedPayment =
            !nameIsPayment &&
            (stepType === 'PAYMENT' || roomType === 'CASHIER' || roomType === 'PAYMENT') &&
            !isDefaultExamStepName(stepName) &&
            !isDefaultBookingStepName(stepName);
        const unlabeledPayment = Boolean(liveStepId && unlabeledPaymentIds.has(liveStepId));
        const isPayment = nameIsPayment || typedPayment || unlabeledPayment;
        const isExamPayment = isExamPaymentStepName(stepName);

        return {
            item,
            index,
            orderNum,
            createdAt,
            dependsOn,
            requiredStepId: pickLiveRequiredStepId(rec),
            stepId,
            liveStepId,
            templateStepId,
            stepName,
            stepNameLower,
            serviceCode: pickLiveServiceCode(rec),
            isPayment: isPayment || isExamPayment,
            isExamPayment,
            isBooking: isDefaultBookingStepName(stepName),
            isExam: isDefaultExamStepName(stepName),
        };
    });

    const sortStable = (a: Row, b: Row) => {
        if (a.orderNum != null && b.orderNum != null && a.orderNum !== b.orderNum) {
            return a.orderNum - b.orderNum;
        }
        if (a.orderNum != null && b.orderNum == null) return -1;
        if (b.orderNum != null && a.orderNum == null) return 1;
        const ra = templateLikeRank(a.stepNameLower);
        const rb = templateLikeRank(b.stepNameLower);
        if (ra !== rb) return ra - rb;
        return a.index - b.index;
    };

    const orderRestBlock = (block: Row[]): Row[] => {
        if (block.length <= 1) return block;

        const idToRow = new Map<string, Row>();
        block.forEach((r) => {
            if (r.liveStepId) idToRow.set(r.liveStepId, r);
            if (r.templateStepId) idToRow.set(r.templateStepId, r);
            if (r.stepId) idToRow.set(r.stepId, r);
        });

        const preds = new Map<number, Set<number>>();
        block.forEach((r) => preds.set(r.index, new Set()));

        const addEdge = (from: Row, to: Row) => {
            if (from.index === to.index) return;
            preds.get(to.index)?.add(from.index);
        };

        block.forEach((r) => {
            const depIds = [...r.dependsOn, ...(r.requiredStepId ? [r.requiredStepId] : [])];
            depIds.forEach((depId) => {
                const pred = idToRow.get(depId);
                if (pred) addEdge(pred, r);
            });
        });

        const pending = new Set(block.map((r) => r.index));
        const ordered: Row[] = [];
        while (pending.size > 0) {
            const ready = block
                .filter((r) => pending.has(r.index))
                .filter((r) => {
                    const p = preds.get(r.index);
                    if (!p) return true;
                    for (const predIdx of p) {
                        if (pending.has(predIdx)) return false;
                    }
                    return true;
                })
                .sort((a, b) => {
                    if (a.index !== b.index) return a.index - b.index;
                    return sortStable(a, b);
                });

            if (ready.length === 0) {
                const rest = block.filter((r) => pending.has(r.index)).sort((a, b) => a.index - b.index);
                ordered.push(...rest);
                break;
            }

            const next = ready[0];
            ordered.push(next);
            pending.delete(next.index);
        }

        return ordered;
    };

    const booking = rows.filter((r) => r.isBooking).sort((a, b) => a.index - b.index);
    const examPay = rows
        .filter((r) => r.isExamPayment && !r.isBooking && !r.isExam)
        .sort((a, b) => a.index - b.index);
    const exam = rows.filter((r) => r.isExam && !r.isBooking).sort((a, b) => a.index - b.index);
    const restRaw = rows
        .filter((r) => !r.isBooking && !r.isExam && !r.isExamPayment)
        .sort((a, b) => a.index - b.index);

    return [...booking, ...examPay, ...exam, ...orderRestBlock(restRaw)].map((r) => r.item);
}
