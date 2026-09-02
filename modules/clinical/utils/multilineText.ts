/**
 * Normalizes multiline text from external systems (e.g. HIS) for display.
 */
export function normalizeMultilineText(text: string | null | undefined): string {
    if (!text) return '';
    return text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\\n/g, '\n');
}
