export function normalizeRoleKey(role?: string | null): string {
    if (!role) return '';
    return role.trim().toUpperCase().replace(/^ROLE_/, '');
}

const STAFF_ROLES = new Set([
    'ADMIN',
    'DOCTOR',
    'NURSE',
    'RECEPTIONIST',
    'LAB_STAFF',
    'LAB_TECHNICIAN',
    'PHARMACY_STAFF',
    'PHARMACIST',
    'PHARMACY',
    'CASHIER',
]);

/** Path prefix → roles được phép truy cập */
const ROUTE_ZONES: Array<{ prefix: string; roles: readonly string[] }> = [
    { prefix: '/admin', roles: ['ADMIN'] },
    { prefix: '/override', roles: ['ADMIN'] },
    { prefix: '/doctor', roles: ['DOCTOR', 'NURSE'] },
    { prefix: '/nurse', roles: ['DOCTOR', 'NURSE'] },
    { prefix: '/tongquan', roles: ['DOCTOR', 'NURSE'] },
    { prefix: '/reception', roles: ['RECEPTIONIST', 'NURSE'] },
    { prefix: '/lab', roles: ['LAB_STAFF', 'LAB_TECHNICIAN', 'DOCTOR', 'NURSE'] },
    { prefix: '/pharmacy', roles: ['PHARMACY_STAFF', 'PHARMACIST', 'PHARMACY'] },
    { prefix: '/cashier', roles: ['CASHIER'] },
    { prefix: '/queue', roles: ['USER'] },
    { prefix: '/navigation', roles: ['USER'] },
    { prefix: '/payment', roles: ['USER'] },
    { prefix: '/results', roles: ['USER'] },
    { prefix: '/triage', roles: ['USER'] },
    { prefix: '/checkin', roles: ['USER'] },
];

const STAFF_SHARED_PREFIXES = ['/settings', '/notifications', '/design-system', '/room-display'];

function matchZone(pathname: string) {
    return ROUTE_ZONES
        .filter(
            (zone) =>
                pathname === zone.prefix || pathname.startsWith(`${zone.prefix}/`)
        )
        .sort((a, b) => b.prefix.length - a.prefix.length)[0];
}

export function canAccessRoute(role: string | undefined | null, pathname: string): boolean {
    const normalizedRole = normalizeRoleKey(role);
    if (!normalizedRole) return false;

    const path = (pathname || '/').split('?')[0] || '/';

    if (STAFF_SHARED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
        return STAFF_ROLES.has(normalizedRole);
    }

    const zone = matchZone(path);
    if (!zone) {
        return STAFF_ROLES.has(normalizedRole);
    }

    return zone.roles.includes(normalizedRole);
}

export function isAdminRole(role: string | undefined | null): boolean {
    return normalizeRoleKey(role) === 'ADMIN';
}

export function isPatientRole(role: string | undefined | null): boolean {
    return normalizeRoleKey(role) === 'USER';
}

export function getRoleHomePath(role: string | undefined | null): string {
    const normalizedRole = normalizeRoleKey(role);
    switch (normalizedRole) {
        case 'ADMIN':
            return '/admin/dashboard';
        case 'RECEPTIONIST':
            return '/reception';
        case 'LAB_STAFF':
        case 'LAB_TECHNICIAN':
            return '/lab';
        case 'PHARMACY_STAFF':
        case 'PHARMACIST':
        case 'PHARMACY':
            return '/pharmacy';
        case 'CASHIER':
            return '/cashier';
        case 'NURSE':
            return '/nurse/dashboard';
        case 'DOCTOR':
            return '/doctor/dashboard';
        case 'USER':
            return '/queue';
        default:
            return '/login';
    }
}
