import type {
    HighPriorityPatient,
    QueuePatient,
    RecentActivity,
    ReceptionStat,
} from '@/modules/reception/types/reception.types';

export const RECEPTION_STATS: ReceptionStat[] = [
    { value: 47, label: 'Đang chờ khám', icon: 'waiting', trend: { value: '+8%', positive: true }, iconBg: 'bg-[#E8F2FF]', iconColor: 'text-[#3B82F6]' },
    { value: 183, label: 'Đăng ký hôm nay', icon: 'registered', trend: { value: '+12%', positive: true }, iconBg: 'bg-[#E2F7EB]', iconColor: 'text-[#10B981]' },
    { value: 12, label: 'Hàng đợi đang hoạt động', icon: 'queues', iconBg: 'bg-[#E2F7EB]', iconColor: 'text-[#10B981]' },
    { value: 9, label: 'Chờ thanh toán', icon: 'payment', iconBg: 'bg-[#FFF4E5]', iconColor: 'text-[#F59E0B]' },
    { value: 3, label: 'Ca khẩn cấp', icon: 'emergency', iconBg: 'bg-[#FEE2E2]', iconColor: 'text-[#EF4444]' },
    { value: '4.2 phút', label: 'Thời gian đăng ký TB', icon: 'avgTime', trend: { value: '-6%', positive: false }, iconBg: 'bg-[#F3E8FF]', iconColor: 'text-[#8B7CF6]' },
    { value: 61, label: 'Vãng lai (walk-in)', icon: 'walkin', iconBg: 'bg-[#E8F2FF]', iconColor: 'text-[#3B82F6]' },
    { value: 7, label: 'Vé cấp lại', icon: 'reissue', iconBg: 'bg-[#F3F4F6]', iconColor: 'text-[#6B7280]' },
];

export const QUEUE_PATIENTS: QueuePatient[] = [
    { id: '1', ticketNo: 'E-003', name: 'Trần Thị Mai', specialty: 'Cấp cứu', specialtyIcon: 'emergency', priority: 'Khẩn cấp', status: 'Đang khám', waitMinutes: 2 },
    { id: '2', ticketNo: 'A-042', name: 'Nguyễn Thị Hoa', specialty: 'Nội khoa', specialtyIcon: 'internal', priority: 'Người cao tuổi', status: 'Chờ khám', waitMinutes: 18 },
    { id: '3', ticketNo: 'C-015', name: 'Lê Văn Tuấn', specialty: 'Chấn thương', specialtyIcon: 'trauma', priority: 'Ưu tiên', status: 'Chờ TT', waitMinutes: 9 },
    { id: '4', ticketNo: 'D-021', name: 'Phạm Thị Lan', specialty: 'Da liễu', specialtyIcon: 'dermatology', priority: 'Thường', status: 'Đã TT', waitMinutes: 5 },
    { id: '5', ticketNo: 'B-028', name: 'Phạm Minh Đức', specialty: 'Nội khoa', specialtyIcon: 'internal', priority: 'Thường', status: 'Đã gọi', waitMinutes: 0 },
    { id: '6', ticketNo: 'G-011', name: 'Hoàng Văn Sơn', specialty: 'Sản', specialtyIcon: 'obgyn', priority: 'Thường', status: 'Check-in', waitMinutes: 1 },
    { id: '7', ticketNo: 'A-039', name: 'Nguyễn Văn Đạt', specialty: 'Nội khoa', specialtyIcon: 'internal', priority: 'Ưu tiên', status: 'Chờ khám', waitMinutes: 14 },
    { id: '8', ticketNo: 'F-007', name: 'Võ Thị Hồng', specialty: 'Nội tổng quát', specialtyIcon: 'general', priority: 'Thường', status: 'Chờ khám', waitMinutes: 22 },
];

export const HIGH_PRIORITY_PATIENTS: HighPriorityPatient[] = [
    { id: '1', name: 'Trần Thị Mai', ticketNo: 'E-003', specialty: 'Cấp cứu', priority: 'Khẩn cấp' },
    { id: '3', name: 'Lê Văn Tuấn', ticketNo: 'C-015', specialty: 'Chấn thương', priority: 'Ưu tiên' },
    { id: '7', name: 'Nguyễn Văn Đạt', ticketNo: 'A-039', specialty: 'Nội khoa', priority: 'Ưu tiên' },
];

export const RECENT_ACTIVITIES: RecentActivity[] = [
    { id: '1', time: '08:52', title: 'Đăng ký mới', ticketNo: 'A-044', patientName: 'Lý Thị Bích', type: 'register' },
    { id: '2', time: '08:41', title: 'Cấp cứu nhập viện', ticketNo: 'E-003', patientName: 'Trần Thị Mai', type: 'emergency' },
    { id: '3', time: '08:38', title: 'Thanh toán QR', ticketNo: 'B-028', patientName: 'Phạm Minh Đức', type: 'payment' },
    { id: '4', time: '08:31', title: 'Đăng ký mới', ticketNo: 'C-015', patientName: 'Lê Văn Tuấn', type: 'register' },
    { id: '5', time: '08:25', title: 'In vé thành công', ticketNo: 'A-042', patientName: 'Nguyễn Thị Hoa', type: 'print' },
];
