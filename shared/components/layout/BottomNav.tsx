'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  BarChart2,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Appts', href: '/appointments', icon: CalendarDays },
  { label: 'Reports', href: '/reports', icon: BarChart2 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-4 right-4 h-16 bg-white border border-neutral-200/60 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] rounded-[32px] flex items-center justify-around px-4 z-40">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + '/');

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center w-12 h-12 rounded-[24px] transition-all duration-200',
              isActive
                ? 'text-brand-500 font-semibold'
                : 'text-neutral-400 hover:text-neutral-500'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[9px] mt-1 font-semibold leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
