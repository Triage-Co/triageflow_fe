'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Settings,
  UserCheck,
  Users,
  FlaskConical,
  Pill,
  CreditCard,
  ShieldCheck,
  LogOut,
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
    { label: 'Danh sách bệnh nhân', href: '/doctor', icon: ClipboardList },
    { label: 'Tiếp nhận', href: '/reception', icon: UserCheck },
    { label: 'Thông báo', href: '/notifications', icon: Bell },
    { label: 'Cài đặt', href: '/settings', icon: Settings },
  ],
  NURSE: [
    { label: 'Danh sách bệnh nhân', href: '/doctor', icon: ClipboardList },
    { label: 'Tiếp nhận', href: '/reception', icon: UserCheck },
    { label: 'Thông báo', href: '/notifications', icon: Bell },
    { label: 'Cài đặt', href: '/settings', icon: Settings },
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
    { label: 'Quyền truy cập', href: '/admin/roles', icon: ShieldCheck },
    { label: 'Cài đặt', href: '/settings', icon: Settings },
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
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = NAV_BY_ROLE[user?.role ?? ''] ?? NAV_BY_ROLE.default;

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
        "relative flex flex-col h-[calc(100vh-32px)] my-4 ml-4 bg-white border border-neutral-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] rounded-[48px] select-none transition-all duration-300 ease-in-out shrink-0 overflow-hidden z-20",
        isCollapsed ? "w-[88px]" : "w-64"
      )}
    >
      {/* Header Logo Section */}
      <div className="flex items-center justify-between px-5 py-6 shrink-0 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[24px] bg-brand-500 flex items-center justify-center shadow-md shadow-brand-500/20 shrink-0">
            <Activity className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in-0 duration-300">
              <h1 className="text-sm font-bold text-neutral-900 tracking-tight">TriageFlow</h1>
              <p className="text-[10px] text-neutral-400 font-medium leading-none mt-0.5">Outpatient OPD</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-[30px] -right-1 z-30 w-6 h-6 bg-white border border-neutral-200 shadow-sm rounded-full flex items-center justify-center text-neutral-400 hover:text-brand-500 hover:border-brand-300 transition-colors translate-x-1/2"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Navigation Menu */}
      <nav className="flex-1 flex flex-col gap-1.5 py-6 px-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 w-full h-12 rounded-[24px] px-4 transition-all duration-200 ease-in-out',
                isActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 font-semibold'
                  : 'text-neutral-500 hover:text-brand-500 hover:bg-brand-50/60 font-medium'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && (
                <span className="text-sm truncate animate-in fade-in-0 slide-in-from-left-2 duration-200">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User profile / footer section */}
      <div className="p-4 border-t border-neutral-100 shrink-0 bg-neutral-50/50">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={cn(
              "flex items-center gap-3 w-full rounded-[24px] px-2 py-1.5 hover:bg-brand-50 transition-colors",
              isDropdownOpen && "bg-brand-50"
            )}
          >
            <div className="w-10 h-10 rounded-[24px] bg-brand-100 flex items-center justify-center text-brand-600 font-semibold text-xs border-2 border-brand-200 shrink-0 overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name
                  ?.split(' ')
                  .slice(-2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase() || 'VA'
              )}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold text-neutral-800 truncate">{user?.name || 'Văn Anh'}</p>
                <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider truncate mt-0.5">
                  {user?.role || 'DOCTOR'}
                </p>
              </div>
            )}
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && !isCollapsed && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-neutral-200/60 shadow-lg rounded-[24px] py-2 z-50">
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
