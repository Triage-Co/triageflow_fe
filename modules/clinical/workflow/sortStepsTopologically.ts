/**
 * Topological sort for visit flow steps — shared with kiosk patient route view.
 * Respects depends_on, prioritizes payment nodes, groups service_order siblings after payment.
 */
export function sortStepsTopologically(steps: unknown[]): unknown[] {
    if (!Array.isArray(steps) || steps.length === 0) return [];

    const isPaymentStep = (step: Record<string, unknown>): boolean => {
        const name = String(step.step_name || '').toLowerCase();
        const isPayName = name.includes('thanh toán') || name.includes('thanh toan');
        const isPayType = String(step.step_type || '').toUpperCase() === 'PAYMENT';
        const isPendingPay = step.payment_status === 'PENDING';
        return isPayName || isPayType || isPendingPay;
    };

    const getCreatedTime = (step: Record<string, unknown>): number => {
        const dateStr = step.created_at || step.create_at || step.updated_at;
        if (!dateStr) return 0;
        return new Date(String(dateStr)).getTime();
    };

    const inDegree = new Map<string, number>();
    const graph = new Map<string, string[]>();

    for (const step of steps) {
        const rec = step as Record<string, unknown>;
        const id = (rec.step_id || rec.id) as string | undefined;
        if (id) {
            inDegree.set(id, 0);
            graph.set(id, []);
        }
    }

    for (const step of steps) {
        const rec = step as Record<string, unknown>;
        const id = (rec.step_id || rec.id) as string | undefined;
        if (!id) continue;

        const deps = Array.isArray(rec.depends_on) ? (rec.depends_on as string[]) : [];
        for (const depId of deps) {
            if (inDegree.has(depId)) {
                graph.get(depId)!.push(id);
                inDegree.set(id, inDegree.get(id)! + 1);
            }
        }
    }

    const orderGroups = new Map<string, Record<string, unknown>[]>();
    for (const step of steps) {
        const rec = step as Record<string, unknown>;
        const serviceOrderId = rec.service_order_id as string | undefined;
        if (serviceOrderId) {
            if (!orderGroups.has(serviceOrderId)) {
                orderGroups.set(serviceOrderId, []);
            }
            orderGroups.get(serviceOrderId)!.push(rec);
        }
    }

    for (const groupSteps of orderGroups.values()) {
        groupSteps.sort((a, b) => getCreatedTime(a) - getCreatedTime(b));
    }

    const sorted: unknown[] = [];
    const sortedIds = new Set<string>();

    const processNeighbors = (step: Record<string, unknown>, q: Record<string, unknown>[]) => {
        const id = (step.step_id || step.id) as string | undefined;
        if (!id) return;
        const neighbors = graph.get(id) || [];
        for (const neighborId of neighbors) {
            const currentDeg = inDegree.get(neighborId);
            if (currentDeg !== undefined) {
                const newDeg = currentDeg - 1;
                inDegree.set(neighborId, newDeg);
                if (newDeg === 0) {
                    const neighborStep = steps.find(
                        (s) => (s as Record<string, unknown>).step_id === neighborId ||
                            (s as Record<string, unknown>).id === neighborId
                    ) as Record<string, unknown> | undefined;
                    if (neighborStep) {
                        q.push(neighborStep);
                    }
                }
            }
        }
    };

    const sortQueue = (arr: Record<string, unknown>[]) => {
        return arr.sort((a, b) => {
            const payA = isPaymentStep(a) ? 1 : 0;
            const payB = isPaymentStep(b) ? 1 : 0;
            if (payA !== payB) return payB - payA;

            const tA = getCreatedTime(a);
            const tB = getCreatedTime(b);
            if (tA !== tB) return tA - tB;
            return 0;
        });
    };

    const startNodes = steps
        .map((s) => s as Record<string, unknown>)
        .filter((step) => {
            const id = (step.step_id || step.id) as string | undefined;
            return !id || inDegree.get(id) === 0;
        });

    const queue = [...startNodes];
    sortQueue(queue);

    while (queue.length > 0) {
        const current = queue.shift()!;
        const currentId = (current.step_id || current.id) as string | undefined;

        if (currentId && sortedIds.has(currentId)) {
            continue;
        }

        sorted.push(current);
        if (currentId) {
            sortedIds.add(currentId);
        }

        processNeighbors(current, queue);

        if (isPaymentStep(current) && current.service_order_id) {
            const siblings = orderGroups.get(String(current.service_order_id)) || [];
            const testSiblings = siblings.filter((s) => !isPaymentStep(s));

            for (const sibling of testSiblings) {
                const siblingId = (sibling.step_id || sibling.id) as string | undefined;
                if (siblingId && !sortedIds.has(siblingId)) {
                    sorted.push(sibling);
                    sortedIds.add(siblingId);
                    processNeighbors(sibling, queue);
                }
            }
        }

        sortQueue(queue);
    }

    for (const step of steps) {
        const rec = step as Record<string, unknown>;
        const id = (rec.step_id || rec.id) as string | undefined;
        if (id && !sortedIds.has(id)) {
            sorted.push(step);
            sortedIds.add(id);
        } else if (!id && !sorted.includes(step)) {
            sorted.push(step);
        }
    }

    return sorted;
}
