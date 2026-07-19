'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    BarChart3,
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
    UserPlus,
    Search,
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
        { label: 'Tổng quan', href: '/reception', icon: LayoutDashboard },
        { label: 'Đăng ký bệnh nhân', href: '/reception/register', icon: UserPlus },
        { label: 'Tra cứu bệnh nhân', href: '/reception/search', icon: Search },
        { label: 'Thông báo', href: '/notifications', icon: Bell },
        { label: 'Thống kê', href: '/reception/stats', icon: BarChart3 },
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
        { label: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Biểu đồ nhiệt', href: '/admin/heatmap', icon: Activity },
        { label: 'Cấu hình bản đồ', href: '/admin/map', icon: Map },
        { label: 'Hàng chờ bệnh nhân', href: '/admin/queue', icon: ListOrdered },
        { label: 'Cấu hình AI', href: '/admin/ai-config', icon: Cpu },
        { label: 'Quy trình khám bệnh', href: '/admin/process', icon: Stethoscope },
        { label: 'Quản lý người dùng', href: '/admin/users', icon: Users },
        { label: 'Quản lý phòng khám', href: '/admin/rooms', icon: Home },
        { label: 'Quản lý nhân viên', href: '/admin/staff', icon: UserCheck },
        { label: 'Ca trực', href: '/admin/shift', icon: CalendarClock },
        { label: 'Cài đặt', href: '/admin/settings', icon: Settings },
    ],
    default: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Thông báo', href: '/notifications', icon: Bell },
        { label: 'Cài đặt', href: '/settings', icon: Settings },
    ],
};

const ROLE_LABELS: Record<string, string> = {
    RECEPTIONIST: 'Lễ tân',
    DOCTOR: 'Bác sĩ',
    NURSE: 'Y tá',
    ADMIN: 'Quản trị',
    LAB_STAFF: 'Xét nghiệm',
    PHARMACY_STAFF: 'Dược',
    CASHIER: 'Thu ngân',
    USER: 'Bệnh nhân',
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
    
    const [prevAvatar, setPrevAvatar] = useState(user?.avatar);
    const [avatarBroken, setAvatarBroken] = useState(false);
    
    if (user?.avatar !== prevAvatar) {
        setPrevAvatar(user?.avatar);
        setAvatarBroken(false);
    }

    const dropdownRef = useRef<HTMLDivElement>(null);

    const isCollapsed = collapsed !== undefined ? collapsed : internalCollapsed;
    const handleToggle = onToggle ?? (() => setInternalCollapsed(v => !v));

    const navItems = NAV_BY_ROLE[user?.role?.toUpperCase() ?? ''] ?? NAV_BY_ROLE.default;

    const isNavItemActive = (href: string) => {
        if (href === '/reception') {
            return pathname === '/reception';
        }
        return pathname === href || pathname.startsWith(`${href}/`);
    };

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
                'relative flex flex-col h-full bg-[#F5F2FF] shrink-0 select-none transition-all duration-300 ease-in-out overflow-hidden',
                isCollapsed ? 'w-[56px]' : 'w-[248px]',
            )}
        >
            {/* ── Logo ──────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 pt-6 pb-6 shrink-0">
                <div className="w-10 h-10 rounded-[12px] bg-[#8B7CF6] flex items-center justify-center shadow-[0_4px_12px_rgba(139,124,246,0.35)] shrink-0">
                    <Stethoscope className="w-[18px] h-[18px] text-white" strokeWidth={2.25} />
                </div>
                {!isCollapsed && (
                    <div className="overflow-hidden min-w-0">
                        <p className="text-[15px] font-bold text-[#1F2937] leading-none whitespace-nowrap">TriageFlow</p>
                        <p className="text-[10px] text-[#8B7CF6] font-semibold tracking-[0.08em] uppercase mt-1 whitespace-nowrap">
                            OPD SYSTEM
                        </p>
                    </div>
                )}
            </div>

            {/* ── Nav ───────────────────────────────────── */}
            <nav className="flex-1 flex flex-col gap-1.5 px-3 overflow-y-auto overflow-x-hidden">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isNavItemActive(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 h-10 rounded-[12px] px-3 transition-all duration-200 text-[13px]',
                                isCollapsed && 'justify-center px-0 w-10 mx-auto',
                                isActive
                                    ? 'bg-[#EDE9FE] text-[#8B7CF6] font-semibold shadow-[inset_0_0_0_1px_rgba(139,124,246,0.08)]'
                                    : 'text-[#4B5563] font-medium hover:bg-[#8B7CF6]/10 hover:text-[#7C3AED]',
                            )}
                        >
                            <Icon
                                className={cn('w-[18px] h-[18px] shrink-0', isActive ? 'text-[#8B7CF6]' : 'text-[#6B7280]')}
                                strokeWidth={isActive ? 2.25 : 2}
                            />
                            {!isCollapsed && (
                                <span className="truncate whitespace-nowrap">{item.label}</span>
                            )}
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
            <div className={cn('px-4 py-4 shrink-0 border-t border-[#8B7CF6]/10', isCollapsed && 'px-2')}>
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={cn(
                            'flex items-center gap-3 w-full rounded-[12px] px-2 py-2 hover:bg-[#EDE9FE]/60 transition-colors',
                            isDropdownOpen && 'bg-[#EDE9FE]/60',
                            isCollapsed && 'justify-center px-0',
                        )}
                    >
                        <div className="w-9 h-9 rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0 border border-[#8B7CF6]/20 overflow-hidden">
                            {user?.avatar && !avatarBroken ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={user.avatar}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                    onError={() => setAvatarBroken(true)}
                                />
                            ) : (
                                <User className="w-4 h-4 text-[#8B7CF6]" />
                            )}
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-[12px] font-bold text-[#2D2D2D] truncate">
                                    {user?.name || 'Nguyen Van A'}
                                </p>
                                <p className="text-[10px] text-[#7B7B7B] font-medium tracking-wide truncate mt-0.5">
                                    {ROLE_LABELS[user?.role?.toUpperCase() ?? ''] || user?.role || 'Doctor'}
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
