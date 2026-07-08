'use client';

import { useState } from 'react';
import {
    Search,
    UserPlus,
    Stethoscope,
    Shield,
    FlaskConical,
    Pill,
    CreditCard,
    UserCheck,
    ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface StaffMember {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'online' | 'offline';
    createdAt: string;
    avatar?: string;
}

/* ─── Mock Data ──────────────────────────────────────────────────────────── */

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    DOCTOR: { label: 'Bác sĩ', color: 'text-brand-600', bg: 'bg-brand-50', icon: Stethoscope },
    NURSE: { label: 'Điều dưỡng', color: 'text-pink-600', bg: 'bg-pink-50', icon: Shield },
    RECEPTIONIST: { label: 'Lễ tân', color: 'text-sky-600', bg: 'bg-sky-50', icon: UserCheck },
    LAB_STAFF: { label: 'Xét nghiệm', color: 'text-blue-600', bg: 'bg-blue-50', icon: FlaskConical },
    PHARMACY_STAFF: { label: 'Dược sĩ', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Pill },
    CASHIER: { label: 'Thu ngân', color: 'text-amber-600', bg: 'bg-amber-50', icon: CreditCard },
    ADMIN: { label: 'Quản trị', color: 'text-red-600', bg: 'bg-red-50', icon: ShieldCheck },
};

const MOCK_STAFF: StaffMember[] = [
    { id: '1', name: 'BS. Trần Minh Đức', email: 'duc.tran@hospital.vn', role: 'DOCTOR', status: 'online', createdAt: '15/01/2025' },
    { id: '2', name: 'BS. Nguyễn Thị Lan', email: 'lan.nguyen@hospital.vn', role: 'DOCTOR', status: 'online', createdAt: '20/03/2025' },
    { id: '3', name: 'ĐD. Phạm Văn Hưng', email: 'hung.pham@hospital.vn', role: 'NURSE', status: 'online', createdAt: '05/02/2025' },
    { id: '4', name: 'Lê Thị Hương', email: 'huong.le@hospital.vn', role: 'RECEPTIONIST', status: 'online', createdAt: '10/04/2025' },
    { id: '5', name: 'KTV. Hoàng Minh Tuấn', email: 'tuan.hoang@hospital.vn', role: 'LAB_STAFF', status: 'offline', createdAt: '22/05/2025' },
    { id: '6', name: 'DS. Vũ Thị Mai', email: 'mai.vu@hospital.vn', role: 'PHARMACY_STAFF', status: 'online', createdAt: '08/06/2025' },
    { id: '7', name: 'Nguyễn Quốc Bảo', email: 'bao.nguyen@hospital.vn', role: 'CASHIER', status: 'offline', createdAt: '12/07/2025' },
    { id: '8', name: 'Admin Trần Trung', email: 'trung.tran@hospital.vn', role: 'ADMIN', status: 'online', createdAt: '01/01/2025' },
    { id: '9', name: 'BS. Lý Thanh Sơn', email: 'son.ly@hospital.vn', role: 'DOCTOR', status: 'offline', createdAt: '18/08/2025' },
    { id: '10', name: 'ĐD. Ngô Thị Thảo', email: 'thao.ngo@hospital.vn', role: 'NURSE', status: 'online', createdAt: '03/09/2025' },
];

const FILTER_ROLES = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'DOCTOR', label: 'Bác sĩ' },
    { value: 'NURSE', label: 'Điều dưỡng' },
    { value: 'RECEPTIONIST', label: 'Lễ tân' },
    { value: 'LAB_STAFF', label: 'Xét nghiệm' },
    { value: 'PHARMACY_STAFF', label: 'Dược sĩ' },
    { value: 'CASHIER', label: 'Thu ngân' },
    { value: 'ADMIN', label: 'Quản trị' },
];

/* ─── Component ──────────────────────────────────────────────────────────── */

export function AdminUsersPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');

    const filtered = MOCK_STAFF.filter((s) => {
        const matchesSearch =
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* ── Title + Actions ── */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                    Quản lý người dùng
                                </h1>
                                <p className="text-[13px] text-[#7B7B7B] mt-1 font-medium">
                                    Danh sách nhân viên đang hoạt động trong hệ thống.
                                </p>
                            </div>
                            <button className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white text-[13px] font-bold rounded-xl hover:bg-brand-600 transition-colors shadow-sm shrink-0 cursor-pointer">
                                <UserPlus className="w-4 h-4" />
                                Thêm nhân viên
                            </button>
                        </div>

                        {/* ── Search + Role Filter ── */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
                            <div className="flex items-center gap-2 bg-[#F5F5F8] rounded-xl px-3.5 py-2.5 text-[12px] text-[#ADADAD] w-full sm:w-72">
                                <Search className="w-4 h-4 shrink-0 text-[#ADADAD]" />
                                <input
                                    type="text"
                                    placeholder="Tìm theo tên hoặc email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-transparent flex-1 outline-none text-[#2D2D2D] placeholder-[#ADADAD] font-medium"
                                />
                            </div>
                            <div className="flex items-center gap-1.5 overflow-x-auto">
                                {FILTER_ROLES.map((r) => (
                                    <button
                                        key={r.value}
                                        onClick={() => setRoleFilter(r.value)}
                                        className={cn(
                                            'px-3 py-1.5 text-[11px] font-bold rounded-full border transition-all whitespace-nowrap cursor-pointer',
                                            roleFilter === r.value
                                                ? 'bg-brand-500 text-white border-brand-500'
                                                : 'bg-white text-[#7B7B7B] border-[#EBEBEB] hover:border-brand-300 hover:text-brand-500'
                                        )}
                                    >
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Table ── */}
                        <div className="bg-white rounded-2xl border border-[#EBEBEB] overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-neutral-50/80 border-b border-[#EBEBEB]">
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Nhân viên</th>
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Email</th>
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Vai trò</th>
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Trạng thái</th>
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Ngày tạo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {filtered.map((staff) => {
                                        const roleCfg = ROLE_CONFIG[staff.role] ?? ROLE_CONFIG.ADMIN;
                                        const RoleIcon = roleCfg.icon;
                                        return (
                                            <tr key={staff.id} className="hover:bg-neutral-50/50 transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-brand-50 border-2 border-brand-100 flex items-center justify-center text-brand-500 font-bold text-[12px] shrink-0">
                                                            {staff.name.split(' ').pop()?.charAt(0)}
                                                        </div>
                                                        <span className="text-[13px] font-bold text-[#2D2D2D]">{staff.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-[12px] text-[#7B7B7B] font-medium">{staff.email}</td>
                                                <td className="px-5 py-4">
                                                    <span className={cn(
                                                        'inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full',
                                                        roleCfg.color, roleCfg.bg
                                                    )}>
                                                        <RoleIcon className="w-3 h-3" />
                                                        {roleCfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={cn(
                                                        'inline-flex items-center gap-1.5 text-[11px] font-bold',
                                                        staff.status === 'online' ? 'text-emerald-600' : 'text-neutral-400'
                                                    )}>
                                                        <span className={cn(
                                                            'w-1.5 h-1.5 rounded-full shrink-0',
                                                            staff.status === 'online' ? 'bg-emerald-500' : 'bg-neutral-300'
                                                        )} />
                                                        {staff.status === 'online' ? 'Online' : 'Offline'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-[12px] text-[#9C9C9C] font-medium">{staff.createdAt}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {filtered.length === 0 && (
                                <div className="flex items-center justify-center py-16">
                                    <p className="text-[13px] text-[#ADADAD] font-medium">Không tìm thấy nhân viên phù hợp.</p>
                                </div>
                            )}
                        </div>

                        {/* ── Footer info ── */}
                        <div className="mt-4 flex items-center justify-between">
                            <p className="text-[11px] text-[#ADADAD] font-medium">
                                Hiển thị {filtered.length} / {MOCK_STAFF.length} nhân viên
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
