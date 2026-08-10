/** Normalize API / ISO values to local calendar `YYYY-MM-DD`. */
export function toLocalYmd(raw?: string | null): string | undefined {
    if (!raw) return undefined;
    const s = String(raw).trim();
    if (!s) return undefined;
    // Pure date-only (no time) — keep as calendar day, do not apply UTC shift
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // ISO datetime (e.g. 2026-08-09T17:00:00.000Z = 00:00 10/08 VN) → local YMD
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return undefined;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export function todayLocalYmd(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/** True when appointment day is strictly after today (local). Past / today → false. */
export function isFutureLocalDate(dateYmd?: string | null): boolean {
    const day = toLocalYmd(dateYmd);
    if (!day) return false;
    return day > todayLocalYmd();
}

/** Nurse always view-only; doctor view-only for future appointment days. */
export function isClinicalEmrReadOnly(
    role: string | undefined,
    appointmentDate?: string | null,
): boolean {
    if (role === 'NURSE') return true;
    if (role === 'DOCTOR' && isFutureLocalDate(appointmentDate)) return true;
    return false;
}
