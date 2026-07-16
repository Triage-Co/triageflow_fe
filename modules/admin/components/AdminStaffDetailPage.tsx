'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    Loader2,
    AlertCircle,
    UserCheck,
} from 'lucide-react';
import { useStaffStore } from '../store/staffStore';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '@/modules/auth/store/authStore';
import type { Staff } from '../types/staff.types';
import { staffService } from '../services/staffService';

/* ─── Role Translation & Badges ───────────────────────────────────────────── */

const ROLE_LABELS: Record<string, string> = {
    DOCTOR: 'Bác sĩ',
    NURSE: 'Điều dưỡng',
    RECEPTIONIST: 'Lễ tân',
    LAB_STAFF: 'Kỹ thuật viên Xét nghiệm',
    PHARMACY_STAFF: 'Dược sĩ',
    CASHIER: 'Thu ngân',
    ADMIN: 'Quản trị viên',
};

const getRoleLabel = (role: string) => ROLE_LABELS[role.toUpperCase()] || role;

/* ─── Component ──────────────────────────────────────────────────────────── */

export function AdminStaffDetailPage() {
    const router = useRouter();
    const params = useParams();
    const rawId = params.id;
    const staffId = Array.isArray(rawId) ? rawId[0] : rawId;

    const accessToken = useAuthStore((s) => s.accessToken);
    const { staffs, fetchStaffs } = useStaffStore();
    const { specialties, fetchSpecialties } = useRoomStore();

    const [staff, setStaff] = useState<Staff | null>(null);
    const [isFetchingDetail, setIsFetchingDetail] = useState(false);

    useEffect(() => {
        if (accessToken) {
            if (staffs.length === 0) {
                fetchStaffs(accessToken);
            }
            if (specialties.length === 0) {
                fetchSpecialties(accessToken);
            }
        }
    }, [accessToken, staffs.length, specialties.length, fetchStaffs, fetchSpecialties]);

    useEffect(() => {
        if (!accessToken || !staffId) {
            return;
        }

        const fromList = staffs.find((s) => s.staff_id === staffId);

        const fetchDetail = async () => {
            try {
                setIsFetchingDetail(true);
                const res = await staffService.getStaffById(staffId, accessToken);
                if (res?.data) {
                    setStaff(res.data);
                }
            } catch {
                // Fallback UI below will handle not-found/error state.
                setStaff(fromList ?? null);
            } finally {
                setIsFetchingDetail(false);
            }
        };

        fetchDetail();
    }, [accessToken, staffId, staffs]);

    if (isFetchingDetail) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC]">
                <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
            </div>
        );
    }

    if (!staff) {
        return (
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
                    <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="flex items-center gap-3 mb-8">
                                <button
                                    onClick={() => router.push('/admin/staff')}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#EBEBEB] bg-white hover:bg-neutral-50 text-[#7B7B7B] hover:text-[#8B7CF6] transition cursor-pointer animate-fade-in"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                    Chi tiết tài khoản nhân viên
                                </h1>
                            </div>
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <AlertCircle className="w-8 h-8 text-neutral-400" />
                                <p className="text-[14px] text-[#ADADAD] font-semibold">Không tìm thấy thông tin nhân viên.</p>
                                <button
                                    onClick={() => router.push('/admin/staff')}
                                    className="px-4 py-2 bg-[#8B7CF6] text-white rounded-xl text-xs font-bold hover:bg-[#7a6ae5] transition cursor-pointer"
                                >
                                    Quay lại danh sách
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const matchedSpecialty = specialties.find((s) => s.specialty_id === staff.specialty_id);
    const specialtyName = matchedSpecialty ? (matchedSpecialty.specialty_name || matchedSpecialty.specialty_code) : 'Chưa chỉ định';

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* ── Back + Title ── */}
                        <div className="flex items-center gap-3 mb-8">
                            <button
                                onClick={() => router.push('/admin/staff')}
                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#EBEBEB] bg-white hover:bg-neutral-50 text-[#7B7B7B] hover:text-[#8B7CF6] transition cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                Chi tiết nhân viên
                            </h1>
                        </div>

                        {/* ── Detail Card ── */}
                        <div className="max-w-[600px] mx-auto bg-white rounded-3xl border border-[#EBEBEB] shadow-sm p-8">
                            {/* Header Icon */}
                            <div className="flex flex-col items-center justify-center gap-2 mb-8">
                                <div className="w-20 h-20 rounded-3xl bg-[#F5F2FF] border-2 border-white flex items-center justify-center shadow-sm select-none overflow-hidden">
                                    {staff.account?.avatar ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={staff.account.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <UserCheck className="w-9 h-9 text-[#8B7CF6]" />
                                    )}
                                </div>
                                <h2 className="text-[18px] font-bold text-[#2D2D2D] mt-2">{staff.full_name}</h2>
                                <div className="flex gap-2 items-center">
                                    <span className="inline-flex items-center text-[10px] font-bold px-3 py-1 rounded-full border bg-[#F5F2FF] text-[#8B7CF6] border-[#E0DCFB]">
                                        {getRoleLabel(staff.account?.role || '')}
                                    </span>
                                    {staff.account?.is_banned ? (
                                        <span className="inline-flex items-center text-[10px] font-bold px-3 py-1 rounded-full border bg-red-50 text-red-600 border-red-100">
                                            Bị khóa
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center text-[10px] font-bold px-3 py-1 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-100">
                                            Hoạt động
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Info Fields */}
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Họ và tên</label>
                                    <input
                                        type="text"
                                        value={staff.full_name}
                                        readOnly
                                        className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-bold text-neutral-600 bg-[#F8F9FA] cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Tên tài khoản</label>
                                    <input
                                        type="text"
                                        value={staff.account?.user_name || 'N/A'}
                                        readOnly
                                        className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-neutral-500 bg-[#F8F9FA] cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Email liên hệ</label>
                                    <input
                                        type="text"
                                        value={staff.account?.email || 'N/A'}
                                        readOnly
                                        className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-neutral-500 bg-[#F8F9FA] cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Số điện thoại</label>
                                    <input
                                        type="text"
                                        value={staff.account?.phone || 'N/A'}
                                        readOnly
                                        className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-neutral-500 bg-[#F8F9FA] cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Giới tính</label>
                                    <input
                                        type="text"
                                        value={staff.account?.gender === 'MALE' ? 'Nam' : staff.account?.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                                        readOnly
                                        className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-neutral-500 bg-[#F8F9FA] cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Mã nhân viên (Hệ thống)</label>
                                    <input
                                        type="text"
                                        value={staff.staff_id}
                                        readOnly
                                        className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-mono text-neutral-500 bg-[#F8F9FA] cursor-not-allowed"
                                    />
                                </div>

                                {/* Additional fields for Doctor / Nurse */}
                                {(staff.account?.role === 'DOCTOR' || staff.account?.role === 'NURSE') && (
                                    <>
                                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Số chứng chỉ hành nghề</label>
                                            <input
                                                type="text"
                                                value={staff.license_number || 'Chưa cung cấp'}
                                                readOnly
                                                className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-neutral-500 bg-[#F8F9FA] cursor-not-allowed"
                                            />
                                        </div>

                                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Số năm kinh nghiệm</label>
                                            <input
                                                type="text"
                                                value={staff.experience_years !== null ? `${staff.experience_years} năm` : 'Chưa cung cấp'}
                                                readOnly
                                                className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-neutral-500 bg-[#F8F9FA] cursor-not-allowed"
                                            />
                                        </div>
                                    </>
                                )}

                                {staff.account?.role === 'DOCTOR' && (
                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Chuyên khoa phụ trách</label>
                                        <input
                                            type="text"
                                            value={specialtyName}
                                            readOnly
                                            className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-neutral-500 bg-[#F8F9FA] cursor-not-allowed"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Footer Action */}
                            <div className="mt-8 pt-6 border-t border-neutral-100">
                                <button
                                    onClick={() => router.push('/admin/staff')}
                                    className="w-full py-3 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer text-center"
                                >
                                    Quay lại danh sách
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
