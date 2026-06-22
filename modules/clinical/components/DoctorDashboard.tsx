'use client';

import { useState } from 'react';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { DoctorHeader } from './DoctorHeader';
import { StatCards } from './StatCards';
import { PatientTable } from './PatientTable';
import { PatientDrawer } from './PatientDrawer';

// ── Mock data ──────────────────────────────────────────────────────────────
const DOCTOR_TABS = ['Nguyễn Thị Hồng Hạnh', 'Trần Văn Anh', 'Lê Huy Cường'];

const STATS = [
    { value: '45', label: 'LỊCH HẸN' },
    { value: '12', label: 'ĐANG CHỜ' },
    { value: '5', label: 'ĐÃ KHÁM' },
];

const MOCK_PATIENTS: Patient[] = [
    {
        id: '1', stt: '01', name: 'Nguyễn Văn A', age: 45, gender: 'Nam',
        code: 'PT-2023-001', priority: 'Bình thường', time: '08:15', status: 'Đã khám',
        visitReason: 'Tái khám theo dõi huyết áp, đang dùng thuốc Amlodipine 5mg.',
        allergies: ['Aspirin'],
        medicalHistory: ['Tăng huyết áp (2018)', 'Đái tháo đường type 2'],
        vitals: { heartRate: 78, bloodPressure: '135/85', temperature: 36.8, spO2: 97 },
        insurance: { hasInsurance: true, coverage: '100%' },
        visitType: 'Tái khám',
    },
    {
        id: '2', stt: '02', name: 'Trần Thị B', age: 32, gender: 'Nữ',
        code: 'PT-2023-002', priority: 'Ngồi xe lăn', time: '08:30', status: 'Đang khám',
        visitReason: 'Đau lưng sau tai nạn giao thông, khó đi lại, cần hỗ trợ xe lăn.',
        allergies: ['Penicillin', 'NSAIDs'],
        medicalHistory: ['Gãy xương đùi phải (2024)', 'Phẫu thuật cột sống'],
        vitals: { heartRate: 88, bloodPressure: '110/70', temperature: 37.0, spO2: 98 },
        insurance: { hasInsurance: true, coverage: '80%' },
        visitType: 'Tái khám',
    },
    {
        id: '3', stt: '03', name: 'Lê Hoàng C', age: 67, gender: 'Nam',
        code: 'PT-2023-003', priority: 'Khám sức khỏe', time: '08:45', status: 'Đang chờ',
        visitReason: 'Khám sức khỏe định kỳ hằng năm, kiểm tra chức năng gan thận.',
        allergies: [],
        medicalHistory: ['Viêm gan B mãn tính (2015)', 'Sỏi thận trái đã tán'],
        vitals: { heartRate: 72, bloodPressure: '128/78', temperature: 36.6, spO2: 96 },
        insurance: { hasInsurance: true, coverage: '100%' },
        visitType: 'Khám mới',
    },
    {
        id: '4', stt: '04', name: 'Phạm Thu D', age: 28, gender: 'Nữ',
        code: 'PT-2023-004', priority: 'Quay lại phòng khám', time: '09:00', status: 'Đang chờ',
        visitReason: 'Quay lại nhận kết quả xét nghiệm máu và siêu âm bụng từ lần khám trước.',
        allergies: ['Penicillin', 'NSAIDs', 'Aspirin'],
        medicalHistory: ['Viêm xoang mãn (2019)', 'Tiền sử dị ứng Penicillin', 'Chưa phẫu thuật ngoại khoa'],
        vitals: { heartRate: 82, bloodPressure: '120/80', temperature: 37.2, spO2: 96 },
        insurance: { hasInsurance: true, coverage: '100%' },
        visitType: 'Tái khám',
    },
    {
        id: '5', stt: '05', name: 'Hoàng Minh E', age: 54, gender: 'Nam',
        code: 'PT-2023-005', priority: 'Bình thường', time: '09:15', status: 'Đang chờ',
        visitReason: 'Ho kéo dài 3 tuần, kèm đau ngực nhẹ khi hít sâu.',
        allergies: ['Sulfonamide'],
        medicalHistory: ['Viêm phế quản mãn', 'Hút thuốc 20 năm (đã bỏ)'],
        vitals: { heartRate: 80, bloodPressure: '125/82', temperature: 36.9, spO2: 94 },
        insurance: { hasInsurance: true, coverage: '80%' },
        visitType: 'Khám mới',
    },
    {
        id: '6', stt: '06', name: 'Võ Thị F', age: 41, gender: 'Nữ',
        code: 'PT-2023-006', priority: 'Bình thường', time: '09:30', status: 'Đang chờ',
        visitReason: 'Đau đầu kéo dài, chóng mặt buổi sáng, mất ngủ 2 tuần.',
        allergies: [],
        medicalHistory: ['Thiếu máu thiếu sắt (2022)'],
        vitals: { heartRate: 76, bloodPressure: '115/72', temperature: 36.7, spO2: 98 },
        insurance: { hasInsurance: false, coverage: '0%' },
        visitType: 'Khám mới',
    },
    {
        id: '7', stt: '07', name: 'Đặng Quốc G', age: 60, gender: 'Nam',
        code: 'PT-2023-007', priority: 'Bình thường', time: '09:45', status: 'Đang chờ',
        visitReason: 'Tái khám sau phẫu thuật ruột thừa 2 tuần trước, kiểm tra vết mổ.',
        allergies: ['Ibuprofen'],
        medicalHistory: ['Phẫu thuật ruột thừa (06/2023)', 'Thoái hóa khớp gối'],
        vitals: { heartRate: 70, bloodPressure: '130/80', temperature: 36.5, spO2: 97 },
        insurance: { hasInsurance: true, coverage: '100%' },
        visitType: 'Tái khám',
    },
];

// ── Main component ─────────────────────────────────────────────────────────
export function DoctorDashboard() {
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    return (
        <div className="flex flex-col h-full bg-neutral-50/50">
            {/* ── Purple gradient header bar ─── */}
            <DoctorHeader tabs={DOCTOR_TABS} />

            {/* ── Page content ────────────────── */}
            <div className="flex-1 overflow-y-auto p-8">
                {/* Title + Stats row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-7">
                    <div>
                        <h1 className="text-[22px] font-bold text-neutral-900 tracking-tight">
                            Danh sách bệnh nhân
                        </h1>
                        <p className="text-sm text-neutral-400 mt-1 font-medium">
                            Quản lý hàng đợi và tiếp nhận bệnh nhân khám bệnh.
                        </p>
                    </div>
                    <StatCards stats={STATS} />
                </div>

                {/* Table with search, filter, pagination */}
                <PatientTable
                    patients={MOCK_PATIENTS}
                    onSelectPatient={setSelectedPatient}
                />
            </div>

            {/* ── Patient Detail Drawer ────────── */}
            <PatientDrawer
                patient={selectedPatient}
                onClose={() => setSelectedPatient(null)}
            />
        </div>
    );
}
