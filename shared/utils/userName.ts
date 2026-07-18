/** BE /api/auth/register expects `user_name`, not `full_name`. */
export function buildUserNameFromFullName(fullName: string, fallback = 'user'): string {
    const normalized = fullName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/gi, 'd')
        .replace(/Đ/g, 'D')
        .trim();

    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return fallback;

    return parts
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('');
}
