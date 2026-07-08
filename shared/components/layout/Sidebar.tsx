'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Bell,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    Settings,
    UserCheck,
    Users,
    FlaskConical,
    Pill,
    CreditCard,
    LogOut,
    User,
    Stethoscope,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { authService } from '@/shared/services/authService';
import { useAuthStore } from '@/store/authStore';

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
    DOCTOR: [
        { label: 'Danh sách bệnh nhân', href: '/doctor', icon: LayoutDashboard },
        { label: 'Thông báo', href: '/doctor/notification', icon: Bell },
        { label: 'Cài đặt', href: '/doctor/setting', icon: Settings },
    ],
    NURSE: [
        { label: 'Danh sách bệnh nhân', href: '/doctor', icon: LayoutDashboard },
        { label: 'Tiếp nhận', href: '/reception', icon: UserCheck },
        { label: 'Thông báo', href: '/doctor/notification', icon: Bell },
        { label: 'Cài đặt', href: '/doctor/setting', icon: Settings },
    ],
    RECEPTIONIST: [
        { label: 'Tiếp nhận', href: '/reception', icon: UserCheck },
        { label: 'Bệnh nhân', href: '/patients', icon: Users },
        { label: 'Thông báo', href: '/notifications', icon: Bell },
        { label: 'Cài đặt', href: '/settings', icon: Settings },
    ],
    LAB_STAFF: [
        { label: 'Xét nghiệm', href: '/lab', icon: FlaskConical },
        { label: 'Thông báo', href: '/notifications', icon: Bell },
        { label: 'Cài đặt', href: '/settings', icon: Settings },
    ],
    PHARMACY_STAFF: [
        { label: 'Dược phẩm', href: '/pharmacy', icon: Pill },
        { label: 'Thông báo', href: '/notifications', icon: Bell },
        { label: 'Cài đặt', href: '/settings', icon: Settings },
    ],
    CASHIER: [
        { label: 'Thanh toán', href: '/cashier', icon: CreditCard },
        { label: 'Thông báo', href: '/notifications', icon: Bell },
        { label: 'Cài đặt', href: '/settings', icon: Settings },
    ],
    ADMIN: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Người dùng', href: '/admin/users', icon: Users },
        { label: 'Cài đặt', href: '/admin/settings', icon: Settings },
    ],
    default: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Thông báo', href: '/notifications', icon: Bell },
        { label: 'Cài đặt', href: '/settings', icon: Settings },
    ],
};

export interface SidebarUser {
    name: string;
    role: string;
    avatar?: string;
}

interface SidebarProps {
    user?: SidebarUser;
    /** Allow parent to control collapsed state. If omitted, sidebar manages its own state. */
    collapsed?: boolean;
    onToggle?: () => void;
}

export function Sidebar({ user, collapsed, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { logout } = useAuthStore();
    const [internalCollapsed, setInternalCollapsed] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isCollapsed = collapsed !== undefined ? collapsed : internalCollapsed;
    const handleToggle = onToggle ?? (() => setInternalCollapsed(v => !v));

    const navItems = NAV_BY_ROLE[user?.role?.toUpperCase() ?? ''] ?? NAV_BY_ROLE.default;

    // Handle click outside dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        authService.logout();
        logout();
        setIsDropdownOpen(false);
        router.push('/login');
    };

    return (
        <aside
            className={cn(
                'relative flex flex-col h-full bg-[#EEEDFC] shrink-0 select-none transition-all duration-300 ease-in-out overflow-hidden',
                isCollapsed ? 'w-[52px]' : 'w-[220px]'
            )}
        >
            {/* ── Logo ──────────────────────────────────── */}
            <div className={cn(
                'flex items-center gap-3 pt-5 pb-5 shrink-0 min-h-[72px]',
                isCollapsed ? 'justify-center px-0' : 'px-3'
            )}>
                <div className="w-9 h-9 rounded-xl bg-[#8B7CF6] flex items-center justify-center shadow-md shadow-[#8B7CF6]/30 shrink-0">
                    <Stethoscope className="w-4 h-4 text-white" />
                </div>
                {!isCollapsed && (
                    <div className="overflow-hidden">
                        <p className="text-[13px] font-bold text-[#2D2D2D] leading-none whitespace-nowrap">TriageFlow</p>
                        <p className="text-[10px] text-[#8B7CF6] font-semibold tracking-wider uppercase mt-0.5 whitespace-nowrap">
                            OPD SYSTEM
                        </p>
                    </div>
                )}
            </div>

            {/* ── Nav ───────────────────────────────────── */}
            <nav className={cn(
                'flex-1 flex flex-col gap-1 overflow-y-auto overflow-x-hidden',
                isCollapsed ? 'items-center px-0 py-1' : 'px-1.5'
            )}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                        item.href === '/doctor'
                            ? pathname === '/doctor' || (pathname.startsWith('/doctor/') && !pathname.startsWith('/doctor/notification') && !pathname.startsWith('/doctor/setting'))
                            : pathname === item.href || pathname.startsWith(item.href + '/');

                    if (isCollapsed) {
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={item.label}
                                className={cn(
                                    'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200',
                                    isActive
                                        ? 'bg-[#DDD6FE] text-[#8B7CF6]'
                                        : 'text-[#7B7B7B] hover:bg-[#DDD6FE]/60 hover:text-[#8B7CF6]'
                                )}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 h-11 rounded-2xl px-3 transition-all duration-200 text-[13px]',
                                isActive
                                    ? 'bg-[#DDD6FE] text-[#8B7CF6] font-bold'
                                    : 'text-[#7B7B7B] font-medium hover:bg-[#DDD6FE]/50 hover:text-[#8B7CF6]'
                            )}
                        >
                            <Icon className="w-4.5 h-4.5 shrink-0" />
                            <span className="truncate whitespace-nowrap">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* ── Collapse toggle button ─────────────────── */}
            <div className={cn('py-2 shrink-0', isCollapsed ? 'flex justify-center' : 'px-1.5')}>
                <button
                    onClick={handleToggle}
                    title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
                    className={cn(
                        'flex items-center gap-2 transition-all duration-200 text-[12px] font-medium text-[#7B7B7B] hover:text-[#8B7CF6]',
                        isCollapsed
                            ? 'w-9 h-9 rounded-full justify-center hover:bg-[#DDD6FE]/60'
                            : 'h-9 rounded-2xl px-3 w-full hover:bg-[#DDD6FE]/50'
                    )}
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 shrink-0" />
                    ) : (
                        <>
                            <ChevronLeft className="w-4 h-4 shrink-0" />
                            <span>Thu gọn</span>
                        </>
                    )}
                </button>
            </div>

            {/* ── User profile / footer section ────────── */}
            <div className={cn('px-3 py-4 shrink-0 border-t border-[#8B7CF6]/10', isCollapsed && 'px-1.5')}>
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={cn(
                            'flex items-center gap-3 w-full rounded-xl px-2 py-1.5 hover:bg-[#8B7CF6]/10 transition-colors',
                            isDropdownOpen && 'bg-[#8B7CF6]/10',
                            isCollapsed && 'justify-center px-0'
                        )}
                    >
                        <div className="w-9 h-9 rounded-full bg-[#8B7CF6]/20 flex items-center justify-center shrink-0 border-2 border-[#8B7CF6]/30 overflow-hidden">
                            {user?.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-4 h-4 text-[#8B7CF6]" />
                            )}
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-[12px] font-bold text-[#2D2D2D] truncate">
                                    {user?.name || 'Nguyen Van A'}
                                </p>
                                <p className="text-[10px] text-[#7B7B7B] font-medium uppercase tracking-wider truncate mt-0.5">
                                    {user?.role || 'Doctor'}
                                </p>
                            </div>
                        )}
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && !isCollapsed && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-neutral-200/60 shadow-lg rounded-xl py-2 z-50">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-neutral-600 hover:text-red-600 hover:bg-red-50/50 transition-colors text-sm font-medium"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Đăng xuất</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
