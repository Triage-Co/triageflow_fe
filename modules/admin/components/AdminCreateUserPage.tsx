'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Loader2,
    AlertCircle,
    Upload,
} from 'lucide-react';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { useAdminStore } from '../store/adminStore';
import { authService } from '@/modules/auth/services/authService';
import { staffService } from '../services/staffService';
import type { Gender, StaffRole } from '@/shared/types/auth.types';

/* ─── Component ──────────────────────────────────────────────────────────── */

export function AdminCreateUserPage() {
    const router = useRouter();
    const accessToken = useAuthStore((s) => s.accessToken);
    const { fetchAccounts } = useAdminStore();

    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createForm, setCreateForm] = useState({
        user_name: '',
        dob: '',
        gender: 'MALE' as Gender,
        email: '',
        phone: '',
        role: 'DOCTOR' as StaffRole,
        password: '',
    });

    const handleCreateUser = async () => {
        if (!createForm.user_name.trim() || !createForm.email.trim() || !createForm.password || !createForm.phone.trim()) {
            setCreateError('Vui lòng điền đầy đủ thông tin bắt buộc.');
            return;
        }

        setIsCreating(true);
        setCreateError(null);
        try {
            const STAFF_ROLES = ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_STAFF', 'PHARMACY_STAFF', 'CASHIER', 'ADMIN'];
            if (STAFF_ROLES.includes(createForm.role) && accessToken) {
                await staffService.createStaff({
                    user_name: createForm.user_name.trim(),
                    password: createForm.password,
                    full_name: createForm.user_name.trim(),
                    email: createForm.email.trim(),
                    role: createForm.role,
                    gender: createForm.gender,
                    phone: createForm.phone.trim(),
                }, accessToken);
            } else {
                await authService.register({
                    user_name: createForm.user_name,
                    email: createForm.email,
                    password: createForm.password,
                    gender: createForm.gender,
                    phone: createForm.phone,
                });
            }

            // Reload accounts list
            if (accessToken) {
                await fetchAccounts(accessToken);
            }

            router.push('/admin/users');
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Tạo tài khoản thất bại.');
        } finally {
            setIsCreating(false);
        }
    };

    const nameInitials = createForm.user_name
        ? createForm.user_name.split(' ').slice(-2).map((n: string) => n.charAt(0)).join('').toUpperCase() || 'UN'
        : 'UN';

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* ── Back + Title ── */}
                        <div className="flex items-center gap-3 mb-8">
                            <button
                                onClick={() => router.push('/admin/users')}
                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#EBEBEB] bg-white hover:bg-neutral-50 text-[#7B7B7B] hover:text-[#8B7CF6] transition cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                Tạo tài khoản
                            </h1>
                        </div>

                        {/* ── Form Card ── */}
                        <div className="max-w-[540px] mx-auto bg-white rounded-3xl border border-[#EBEBEB] shadow-sm p-8">
                            {createError && (
                                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 mb-6">
                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                    <span className="text-[12px] text-red-700 font-semibold">{createError}</span>
                                </div>
                            )}

                            {/* Avatar */}
                            <div className="flex flex-col items-center justify-center gap-2 mb-6">
                                <div className="w-20 h-20 rounded-full bg-[#C6B9FF]/40 text-[#8B7CF6] border-2 border-white flex items-center justify-center font-bold text-2xl relative select-none">
                                    {nameInitials}
                                    <label className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#8B7CF6] text-white flex items-center justify-center shadow-md cursor-pointer hover:bg-[#7a6ae5] transition border-2 border-white">
                                        <Upload className="w-3.5 h-3.5" />
                                        <input type="file" className="hidden" accept="image/*" />
                                    </label>
                                </div>
                            </div>

                            {/* Fields */}
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-neutral-500 uppercase">Họ và Tên *</label>
                                    <input
                                        type="text"
                                        placeholder="Nhập Họ và Tên"
                                        value={createForm.user_name}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, user_name: e.target.value }))}
                                        className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D] bg-[#F8F9FA]/50"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-neutral-500 uppercase">Ngày Sinh *</label>
                                    <input
                                        type="text"
                                        placeholder="DD/MM/YYYY"
                                        value={createForm.dob}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, dob: e.target.value }))}
                                        className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D] bg-[#F8F9FA]/50"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-neutral-500 uppercase">Giới Tính *</label>
                                        <select
                                            value={createForm.gender}
                                            onChange={(e) => setCreateForm(prev => ({ ...prev, gender: e.target.value as Gender }))}
                                            className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                                        >
                                            <option value="MALE">Nam</option>
                                            <option value="FEMALE">Nữ</option>
                                            <option value="OTHER">Khác</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-neutral-500 uppercase">Số Điện Thoại *</label>
                                        <input
                                            type="text"
                                            placeholder="0912345678"
                                            value={createForm.phone}
                                            onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                                            className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D] bg-[#F8F9FA]/50"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-neutral-500 uppercase">Email *</label>
                                    <input
                                        type="email"
                                        placeholder="user@example.com"
                                        value={createForm.email}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D] bg-[#F8F9FA]/50"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-neutral-500 uppercase">Role *</label>
                                    <select
                                        value={createForm.role}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value as StaffRole }))}
                                        className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                                    >
                                        <option value="DOCTOR">Bác sĩ</option>
                                        <option value="NURSE">Y tá / Điều dưỡng</option>
                                        <option value="RECEPTIONIST">Lễ tân</option>
                                        <option value="LAB_STAFF">Xét nghiệm</option>
                                        <option value="PHARMACY_STAFF">Dược sĩ</option>
                                        <option value="CASHIER">Thu ngân</option>
                                        <option value="ADMIN">Quản trị viên</option>
                                        <option value="USER">Bệnh nhân</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-neutral-500 uppercase">Password *</label>
                                    <input
                                        type="password"
                                        placeholder="Enter password"
                                        value={createForm.password}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                                        className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D] bg-[#F8F9FA]/50"
                                    />
                                    <span className="block text-[10px] text-neutral-400 mt-1 font-medium">Minimum 8 characters</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 mt-8 pt-6 border-t border-neutral-100">
                                <button
                                    onClick={() => router.push('/admin/users')}
                                    className="flex-1 py-3 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-500 transition cursor-pointer text-center"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleCreateUser}
                                    disabled={isCreating}
                                    className="flex-1 py-3 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Tạo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
