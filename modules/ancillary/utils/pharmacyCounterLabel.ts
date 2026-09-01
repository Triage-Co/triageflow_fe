import type { DisplayScreen } from '@/modules/display/types/display-screen.types';

/** Map TV nhà thuốc (dropdown) → số quầy 1, 2, 3… (không có tiền tố P). */
export function formatPharmacyCounterLabel(
    screen: Pick<DisplayScreen, 'name' | 'code'>
): string {
    const name = screen.name?.trim() || '';
    if (/^\d+$/.test(name)) return name;

    const pickupStyle = name.match(/^P(\d+)$/i);
    if (pickupStyle) return pickupStyle[1];

    const fromCode = screen.code?.match(/(\d+)\s*$/);
    if (fromCode) return fromCode[1];

    return name || screen.code;
}

export function sortPharmacyCounterLabels(labels: string[]): string[] {
    return [...new Set(labels)].sort((a, b) => {
        const na = Number.parseInt(a, 10);
        const nb = Number.parseInt(b, 10);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        return a.localeCompare(b, 'vi');
    });
}
