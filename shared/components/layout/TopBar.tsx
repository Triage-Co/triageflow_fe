'use client';

import React, { useState } from 'react';
import { Bell, Search, Settings, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';

export interface TopBarUser {
  name: string;
  role: string;
}

interface TopBarProps {
  user?: TopBarUser;
}

export function TopBar({ user }: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="relative flex items-center justify-between h-16 my-4 mr-4 ml-4 md:ml-0 bg-white border border-neutral-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)] rounded-[48px] px-6 shrink-0 z-10 select-none">
      {/* Left side: Search or Quick Info */}
      <div className="flex items-center gap-3 flex-1 max-w-xs md:max-w-sm">
        <div className="relative w-full flex items-center">
          <Search className="absolute left-4 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            className="w-full h-10 pl-11 pr-4 bg-neutral-50/50 hover:bg-neutral-50 border border-neutral-100 hover:border-neutral-200 focus:border-brand-300 focus:bg-white text-sm text-neutral-800 rounded-[24px] outline-none shadow-inner transition-all font-sans"
          />
        </div>
      </div>

      {/* Right side: Actions, Notifications, User Menu */}
      <div className="flex items-center gap-2">
        {/* Quick action: Status indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-[24px] bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-[24px] bg-emerald-500 animate-pulse" />
          Hệ thống ổn định
        </div>

        {/* Notification Button */}
        <div className="relative">
          <Button
            variant="ghost"
            className="w-10 h-10 px-0 rounded-[24px] hover:bg-neutral-50 text-neutral-500 relative"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-[24px] bg-brand-500 border border-white" />
          </Button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-[32px] border border-neutral-100 shadow-xl z-50 py-3 animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="px-4 pb-2 border-b border-neutral-50 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-800">Thông báo</span>
                <span className="text-[10px] text-brand-500 font-bold hover:underline cursor-pointer">Đánh dấu đã đọc</span>
              </div>
              <div className="max-h-60 overflow-y-auto py-2">
                {[
                  { text: 'Bệnh nhân Nguyễn Văn A đã hoàn thành xét nghiệm SpO2.', time: '5 phút trước' },
                  { text: 'Hệ thống cập nhật thông số sinh hiệu mới từ phòng triage.', time: '1 giờ trước' },
                ].map((item, idx) => (
                  <div key={idx} className="px-4 py-2.5 hover:bg-neutral-50 cursor-pointer transition-colors">
                    <p className="text-xs text-neutral-600 font-medium leading-relaxed">{item.text}</p>
                    <span className="text-[10px] text-neutral-400 mt-1 block">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settings Shortcut */}
        <Button
          variant="ghost"
          className="hidden sm:flex w-10 h-10 px-0 rounded-[24px] hover:bg-neutral-50 text-neutral-500"
        >
          <Settings className="w-5 h-5" />
        </Button>

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-neutral-100 mx-1" />

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1.5 pr-3 hover:bg-neutral-50 rounded-[24px] border border-transparent hover:border-neutral-100 transition-all select-none"
          >
            <div className="w-8 h-8 rounded-[24px] bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs border border-brand-200">
              {user?.name
                ?.split(' ')
                .slice(-2)
                .map((w) => w[0])
                .join('')
                .toUpperCase() || 'VA'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-neutral-800 leading-none">{user?.name || 'Bác sĩ'}</p>
              <span className="text-[9px] text-neutral-400 font-medium uppercase tracking-wider">{user?.role || 'Clinical'}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          {/* Profile Menu Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-48 bg-white rounded-[32px] border border-neutral-100 shadow-xl z-50 py-2.5 animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-neutral-50">
                <p className="text-xs font-bold text-neutral-800">{user?.name || 'Văn Anh'}</p>
                <p className="text-[10px] text-neutral-400 truncate">{user?.role || 'DOCTOR'}</p>
              </div>
              <div className="py-1">
                <button className="flex items-center gap-2 w-full px-4 py-2 text-xs text-neutral-600 hover:text-brand-500 hover:bg-brand-50/40 transition-colors font-semibold">
                  <Settings className="w-3.5 h-3.5" /> Thiết lập tài khoản
                </button>
                <button className="flex items-center gap-2 w-full px-4 py-2 text-xs text-rose-500 hover:bg-rose-50/40 transition-colors font-semibold">
                  <LogOut className="w-3.5 h-3.5" /> Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
