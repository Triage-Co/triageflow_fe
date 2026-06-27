import type {
    Patient,
    StatItem,
    LabOrder,
    WorkflowStep,
} from '@/modules/clinical/types/clinical.types';

// ── Doctor tabs ─────────────────────────────────────────────────────────────
export const DOCTOR_TABS = ['Nguyễn Thị Hồng Hạnh', 'Trần Văn Anh', 'Lê Huy Cường'];

// ── Stats ───────────────────────────────────────────────────────────────────
export const MOCK_STATS: StatItem[] = [
    { value: '45', label: 'LỊCH HẸN' },
    { value: '12', label: 'ĐANG CHỜ' },
    { value: '5', label: 'ĐÃ KHÁM' },
];

// ── Mock patients ────────────────────────────────────────────────────────────
export const MOCK_PATIENTS: Patient[] = [
    {
        id: '1', stt: '01', name: 'Nguyễn Thị Hồng Hạnh', age: 34, gender: 'Nữ',
        code: 'BN-204871', priority: 'Bình thường', time: '08:15', status: 'Đã khám',
        visitReason: 'Bệnh nhân sốt cao 2 ngày, kèm đau họng và mệt mỏi. Không khó thở.',
        allergies: ['Penicillin', 'Amoxillin', 'Hải sản'],
        medicalHistory: ['Viêm xoang mãn (2019)', 'Tiền sử dị ứng Penicillin', 'Chưa phẫu thuật'],
        vitals: { heartRate: 82, bloodPressure: '120/80', temperature: 37.2, spO2: 98 },
        insurance: { hasInsurance: true, coverage: '100%' },
        visitType: 'Tái khám',
    },
    {
        id: '2', stt: '02', name: 'Trần Văn Anh', age: 45, gender: 'Nam',
        code: 'PT-2023-001', priority: 'Bình thường', time: '08:30', status: 'Đã khám',
        visitReason: 'Tái khám theo dõi huyết áp, đang dùng thuốc Amlodipine 5mg.',
        allergies: ['Aspirin'],
        medicalHistory: ['Tăng huyết áp (2018)', 'Đái tháo đường type 2'],
        vitals: { heartRate: 78, bloodPressure: '135/85', temperature: 36.8, spO2: 97 },
        insurance: { hasInsurance: true, coverage: '100%' },
        visitType: 'Tái khám',
    },
    {
        id: '3', stt: '03', name: 'Trần Thị B', age: 32, gender: 'Nữ',
        code: 'PT-2023-002', priority: 'Ngồi xe lăn', time: '08:45', status: 'Đang khám',
        visitReason: 'Đau lưng sau tai nạn giao thông, khó đi lại, cần hỗ trợ xe lăn.',
        allergies: ['Penicillin', 'NSAIDs'],
        medicalHistory: ['Gãy xương đùi phải (2024)', 'Phẫu thuật cột sống'],
        vitals: { heartRate: 88, bloodPressure: '110/70', temperature: 37.0, spO2: 98 },
        insurance: { hasInsurance: true, coverage: '80%' },
        visitType: 'Tái khám',
    },
    {
        id: '4', stt: '04', name: 'Lê Hoàng C', age: 67, gender: 'Nam',
        code: 'PT-2023-003', priority: 'Khám sức khỏe', time: '09:00', status: 'Đang chờ',
        visitReason: 'Khám sức khỏe định kỳ hằng năm, kiểm tra chức năng gan thận.',
        allergies: [],
        medicalHistory: ['Viêm gan B mãn tính (2015)', 'Sỏi thận trái đã tán'],
        vitals: { heartRate: 72, bloodPressure: '128/78', temperature: 36.6, spO2: 96 },
        insurance: { hasInsurance: true, coverage: '100%' },
        visitType: 'Khám mới',
    },
    {
        id: '5', stt: '05', name: 'Phạm Thu D', age: 28, gender: 'Nữ',
        code: 'PT-2023-004', priority: 'Quay lại phòng khám', time: '09:15', status: 'Đang chờ',
        visitReason: 'Quay lại nhận kết quả xét nghiệm máu và siêu âm bụng từ lần khám trước.',
        allergies: ['Penicillin', 'NSAIDs', 'Aspirin'],
        medicalHistory: ['Viêm xoang mãn (2019)', 'Tiền sử dị ứng Penicillin', 'Chưa phẫu thuật ngoại khoa'],
        vitals: { heartRate: 82, bloodPressure: '120/80', temperature: 37.2, spO2: 96 },
        insurance: { hasInsurance: true, coverage: '100%' },
        visitType: 'Tái khám',
    },
    {
        id: '6', stt: '06', name: 'Hoàng Minh E', age: 54, gender: 'Nam',
        code: 'PT-2023-005', priority: 'Bình thường', time: '09:30', status: 'Đang chờ',
        visitReason: 'Ho kéo dài 3 tuần, kèm đau ngực nhẹ khi hít sâu.',
        allergies: ['Sulfonamide'],
        medicalHistory: ['Viêm phế quản mãn', 'Hút thuốc 20 năm (đã bỏ)'],
        vitals: { heartRate: 80, bloodPressure: '125/82', temperature: 36.9, spO2: 94 },
        insurance: { hasInsurance: true, coverage: '80%' },
        visitType: 'Khám mới',
    },
    {
        id: '7', stt: '07', name: 'Võ Thị F', age: 41, gender: 'Nữ',
        code: 'PT-2023-006', priority: 'Bình thường', time: '09:45', status: 'Đang chờ',
        visitReason: 'Đau đầu kéo dài, chóng mặt buổi sáng, mất ngủ 2 tuần.',
        allergies: [],
        medicalHistory: ['Thiếu máu thiếu sắt (2022)'],
        vitals: { heartRate: 76, bloodPressure: '115/72', temperature: 36.7, spO2: 98 },
        insurance: { hasInsurance: false, coverage: '0%' },
        visitType: 'Khám mới',
    },
    {
        id: '8', stt: '08', name: 'Đặng Quốc G', age: 60, gender: 'Nam',
        code: 'PT-2023-007', priority: 'Bình thường', time: '10:00', status: 'Đang chờ',
        visitReason: 'Tái khám sau phẫu thuật ruột thừa 2 tuần trước, kiểm tra vết mổ.',
        allergies: ['Ibuprofen'],
        medicalHistory: ['Phẫu thuật ruột thừa (06/2023)', 'Thoái hóa khớp gối'],
        vitals: { heartRate: 70, bloodPressure: '130/80', temperature: 36.5, spO2: 97 },
        insurance: { hasInsurance: true, coverage: '100%' },
        visitType: 'Tái khám',
    },
    {
        id: '9', stt: '09', name: 'Lê Văn H', age: 39, gender: 'Nam',
        code: 'PT-2023-008', priority: 'Bình thường', time: '10:15', status: 'Đang chờ',
        visitReason: 'Đau dạ dày kéo dài.',
        allergies: [],
        medicalHistory: ['Viêm loét dạ dày'],
        vitals: { heartRate: 74, bloodPressure: '120/80', temperature: 36.6, spO2: 98 },
        insurance: { hasInsurance: true, coverage: '80%' },
        visitType: 'Khám mới',
    },
    {
        id: '10', stt: '10', name: 'Nguyễn Thị I', age: 25, gender: 'Nữ',
        code: 'PT-2023-009', priority: 'Khám sức khỏe', time: '10:30', status: 'Đang chờ',
        visitReason: 'Khám sức khỏe đi làm.',
        allergies: [],
        medicalHistory: [],
        vitals: { heartRate: 70, bloodPressure: '115/75', temperature: 36.5, spO2: 99 },
        insurance: { hasInsurance: true, coverage: '100%' },
        visitType: 'Khám mới',
    },
    {
        id: '11', stt: '11', name: 'Trần Văn J', age: 50, gender: 'Nam',
        code: 'PT-2023-010', priority: 'Bình thường', time: '10:45', status: 'Đang chờ',
        visitReason: 'Đau khớp gối khi vận động mạnh.',
        allergies: [],
        medicalHistory: [],
        vitals: { heartRate: 82, bloodPressure: '130/85', temperature: 36.8, spO2: 97 },
        insurance: { hasInsurance: true, coverage: '80%' },
        visitType: 'Khám mới',
    },
    {
        id: '12', stt: '12', name: 'Phạm Thị K', age: 44, gender: 'Nữ',
        code: 'PT-2023-011', priority: 'Ngồi xe lăn', time: '11:00', status: 'Đang chờ',
        visitReason: 'Chấn thương gót chân.',
        allergies: [],
        medicalHistory: [],
        vitals: { heartRate: 76, bloodPressure: '120/80', temperature: 36.7, spO2: 98 },
        insurance: { hasInsurance: true, coverage: '80%' },
        visitType: 'Khám mới',
    },
    {
        id: '13', stt: '13', name: 'Hoàng Văn L', age: 62, gender: 'Nam',
        code: 'PT-2023-012', priority: 'Quay lại phòng khám', time: '11:15', status: 'Đang chờ',
        visitReason: 'Kiểm tra lại chỉ số đường huyết.',
        allergies: [],
        medicalHistory: [],
        vitals: { heartRate: 78, bloodPressure: '135/85', temperature: 36.9, spO2: 96 },
        insurance: { hasInsurance: true, coverage: '100%' },
        visitType: 'Tái khám',
    },
    {
        id: '14', stt: '14', name: 'Đỗ Thị M', age: 35, gender: 'Nữ',
        code: 'PT-2023-013', priority: 'Bình thường', time: '11:30', status: 'Đang chờ',
        visitReason: 'Sốt nhẹ kèm ho khan.',
        allergies: [],
        medicalHistory: [],
        vitals: { heartRate: 85, bloodPressure: '118/74', temperature: 37.5, spO2: 98 },
        insurance: { hasInsurance: true, coverage: '80%' },
        visitType: 'Khám mới',
    },
    {
        id: '15', stt: '15', name: 'Nguyễn Văn N', age: 58, gender: 'Nam',
        code: 'PT-2023-014', priority: 'Bình thường', time: '11:45', status: 'Đang chờ',
        visitReason: 'Đau mỏi vai gáy tê bì tay.',
        allergies: [],
        medicalHistory: [],
        vitals: { heartRate: 74, bloodPressure: '125/80', temperature: 36.6, spO2: 97 },
        insurance: { hasInsurance: true, coverage: '80%' },
        visitType: 'Khám mới',
    },
];

export function getPatientById(id: string): Patient | undefined {
    return MOCK_PATIENTS.find((p) => p.id === id);
}

// ── Workflow template ───────────────────────────────────────────────────────
export const DEFAULT_WORKFLOW_STEPS: WorkflowStep[] = [
    { id: 'reception', label: 'Tiếp nhận', status: 'completed' },
    { id: 'payment', label: 'Thanh toán', status: 'completed' },
    { id: 'examination', label: 'Khám bệnh', status: 'current' },
    { id: 'branch-lab', label: 'Cận lâm sàng', status: 'pending' },
    { id: 'branch-procedure', label: 'Thủ thuật', status: 'pending' },
    { id: 'follow-up', label: 'Tái khám', status: 'pending' },
    { id: 'complete', label: 'Hoàn tất', status: 'pending' },
];

export const MOCK_LAB_ORDERS: LabOrder[] = [
    {
        id: 'lab-1',
        name: 'Tổng phân tích tế bào máu',
        group: 'Huyết học',
        status: 'Chờ thực hiện',
    },
    {
        id: 'lab-2',
        name: 'X-quang ngực thẳng',
        group: 'Chẩn đoán hình ảnh',
        status: 'Chờ thực hiện',
    },
    {
        id: 'lab-3',
        name: 'Siêu âm bụng',
        group: 'Siêu âm',
        status: 'Chờ thực hiện',
    },
];

export const MOCK_DIAGNOSIS = {
    code: 'J02.9',
    description: 'Đau hố chậu phải',
};
