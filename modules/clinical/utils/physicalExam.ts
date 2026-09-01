export const PHYSICAL_EXAM_PLACEHOLDER = 'Chưa cập nhật';

/** Legacy API keys → Vietnamese labels when mapping old visit-session data. */
const LEGACY_PHYSICAL_EXAM_LABELS: Record<string, string> = {
    throat: 'Họng',
    lungs: 'Phổi',
    lung: 'Phổi',
    heart: 'Tim',
    abdomen: 'Bụng',
    digestive: 'Tiêu hóa',
};

export function mapPhysicalExamLabel(key: string): string {
    const normalized = key.trim();
    return LEGACY_PHYSICAL_EXAM_LABELS[normalized.toLowerCase()] ?? normalized;
}

export function buildPhysicalExamFromApi(
    record: Record<string, unknown> | null | undefined,
): Record<string, string> {
    if (!record) return {};

    const result: Record<string, string> = {};
    for (const [key, raw] of Object.entries(record)) {
        if (typeof raw !== 'string' || !raw.trim()) continue;
        const value = raw.trim();
        if (value === PHYSICAL_EXAM_PLACEHOLDER) continue;
        const label = mapPhysicalExamLabel(key);
        result[label] = value;
    }
    return result;
}

export function physicalExamEntries(
    pe: Record<string, string> | undefined | null,
): { label: string; value: string }[] {
    if (!pe) return [];
    return Object.entries(pe)
        .filter(([, value]) => value?.trim() && value.trim() !== PHYSICAL_EXAM_PLACEHOLDER)
        .map(([label, value]) => ({ label: mapPhysicalExamLabel(label), value }));
}
