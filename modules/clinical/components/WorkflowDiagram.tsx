'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
    FileText,
    CreditCard,
    Stethoscope,
    Microscope,
    Syringe,
    RefreshCw,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Pill,
    UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Patient, WorkflowStepStatus } from '@/modules/clinical/types/clinical.types';
import type { ProcessTemplate } from '@/modules/admin/types/process.types';
import { clinicalService } from '@/modules/clinical/services/clinicalService';
import { useAuthStore } from '@/store/authStore';
import { useRoomStore } from '@/modules/admin/store/roomStore';
import { useStaffStore } from '@/modules/admin/store/staffStore';
import { useShiftStore } from '@/modules/admin/store/shiftStore';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/shared/components/ui/Dialog';
import { Plus, Trash2, Edit3 } from 'lucide-react';

type NodeIcon = typeof FileText;

interface DraftStep {
    tempId: string;
    step_name: string;
    specialty_id: string;
    room_id: string;
    staff_id: string;
    service_code: string;
    room_type: string;
    doctor_name?: string;
}

interface ServiceOption {
    service_id: string;
    service_code: string;
    service_name: string;
    is_active?: boolean;
}

interface FlowNode {
    id: string;
    Icon: NodeIcon;
    status: WorkflowStepStatus;
    label: string;
    roomName?: string;
    staffName?: string;
    detail?: {
        source: 'live' | 'draft' | 'default';
        stepStatus?: string;
        roomId?: string;
        specialtyName?: string;
        specialtyId?: string;
        staffId?: string;
        paymentStatus?: string;
        docNo?: string;
    };
}

interface WorkflowDiagramProps {
    patientId: string;
    patient?: Patient;
}

const DEFAULT_FULL_WORKFLOW: FlowNode[] = [
    { id: 'reception', Icon: FileText, label: 'Đăng ký & Phân loại', status: 'completed' },
    { id: 'consultation', Icon: Stethoscope, label: 'Khám chuyên khoa', status: 'pending' },
    { id: 'lab', Icon: Microscope, label: 'Xét nghiệm Cận lâm sàng', status: 'current' },
    { id: 'payment', Icon: CreditCard, label: 'Thanh toán viện phí', status: 'current' },
    { id: 'done', Icon: CheckCircle2, label: 'Hoàn tất khám', status: 'current' },
];

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function extractServiceOptions(raw: unknown): ServiceOption[] {
    const list: unknown[] = [];

    if (Array.isArray(raw)) {
        list.push(...raw);
    } else {
        const record = asRecord(raw);
        const firstData = record?.data;
        const firstDataRecord = asRecord(firstData);

        if (Array.isArray(firstData)) list.push(...firstData);
        if (Array.isArray(firstDataRecord?.data)) list.push(...(firstDataRecord.data as unknown[]));
        if (Array.isArray(record?.items)) list.push(...(record.items as unknown[]));
    }

    const dedup = new Map<string, ServiceOption>();
    list.forEach((item) => {
        const rec = asRecord(item);
        if (!rec) return;
        const serviceCode = typeof rec.service_code === 'string' ? rec.service_code.trim() : '';
        const serviceName = typeof rec.service_name === 'string' ? rec.service_name.trim() : '';
        const serviceId = typeof rec.service_id === 'string' ? rec.service_id : serviceCode;
        if (!serviceCode) return;

        dedup.set(serviceCode, {
            service_id: serviceId,
            service_code: serviceCode,
            service_name: serviceName || serviceCode,
            is_active: typeof rec.is_active === 'boolean' ? rec.is_active : true,
        });
    });

    return Array.from(dedup.values());
}

function pickServiceCodeByContext(input: {
    roomType?: string;
    roomName?: string;
    specialtyName?: string;
}, services: ServiceOption[]): string {
    const source = services.filter((service) => service.is_active !== false);
    const candidates = source.length > 0 ? source : services;
    if (!candidates.length) return '';

    const roomType = (input.roomType || '').toUpperCase();
    const roomName = (input.roomName || '').toUpperCase();
    const specialtyName = (input.specialtyName || '').toUpperCase();

    const keywordMap: Record<string, string[]> = {
        RECEPTION: ['KHAM', 'DANG_KY', 'TIEP_DON'],
        TRIAGE_AREA: ['KHAM_CAP_CUU', 'TRIAGE'],
        CLINICAL_ROOM: ['KHAM_CHUYEN_KHOA', 'KHAM'],
        PROCEDURE_ROOM: ['NOI_SOI', 'THU_THUAT', 'DIEU_TRI'],
        LABORATORY: ['XET_NGHIEM'],
        IMAGING_ROOM: ['X_QUANG', 'SIEU_AM', 'CT', 'MRI'],
        FUNCTIONAL_EXPLORATION: ['THAM_DO', 'FUNCTIONAL'],
        PHARMACY: ['THUOC', 'PHARMACY'],
        CASHIER: ['THANH_TOAN', 'VIEN_PHI'],
    };

    const explicitKeywords = keywordMap[roomType] || [];
    const inferredKeywords = [roomName, specialtyName]
        .filter(Boolean)
        .flatMap((value) => value.split(/\s+/g))
        .filter((token) => token.length > 2);
    const keywords = [...explicitKeywords, ...inferredKeywords];

    const matched = candidates.find((service) =>
        keywords.some((keyword) => service.service_code.toUpperCase().includes(keyword) || service.service_name.toUpperCase().includes(keyword))
    );

    return matched?.service_code || candidates[0].service_code;
}

function getTemplateName(tpl?: ProcessTemplate | Record<string, unknown> | null): string {
    if (!tpl) return '';
    const rec = tpl as Record<string, unknown>;
    return (
        (tpl as ProcessTemplate).name ||
        (rec.template_name as string) ||
        (rec.flow_name as string) ||
        (rec.title as string) ||
        (rec.name as string) ||
        ''
    );
}

function extractFlowList(raw: unknown): Record<string, unknown>[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as Record<string, unknown>[];
    if (typeof raw === 'object') {
        const rec = raw as Record<string, unknown>;
        if (Array.isArray(rec.data)) {
            return rec.data as Record<string, unknown>[];
        }
        if (rec.data && typeof rec.data === 'object' && Array.isArray((rec.data as Record<string, unknown>).data)) {
            return (rec.data as Record<string, unknown>).data as Record<string, unknown>[];
        }
    }
    return [];
}

function pickBestActiveFlow(flows: Record<string, unknown>[]): Record<string, unknown> | null {
    if (flows.length === 0) return null;

    const flowsWithActiveSteps = flows.filter((f) => {
        const steps = (f.steps as Record<string, unknown>[]) || [];
        return steps.some((s) => {
            const st = ((s.step_status as string) || '').toUpperCase();
            return ['PENDING', 'IN_PROGRESS', 'PROCESSING', 'ONGOING', 'CURRENT'].includes(st);
        });
    });

    const candidates = flowsWithActiveSteps.length > 0 ? flowsWithActiveSteps : flows;

    return candidates.sort((a, b) => {
        const timeA = new Date((a.create_at || a.created_at || 0) as string | number).getTime();
        const timeB = new Date((b.create_at || b.created_at || 0) as string | number).getTime();
        return timeB - timeA;
    })[0] || null;
}

function getIconForStep(specialtyName: string, roomName: string, label: string): NodeIcon {
    const s = (specialtyName || '').toLowerCase();
    const r = (roomName || '').toLowerCase();
    const l = (label || '').toLowerCase();

    if (s.includes('tiếp đón') || s.includes('đăng ký') || l.includes('tiếp đón') || l.includes('đăng ký') || l.includes('tiếp nhận') || r.includes('tiếp đón') || l.includes('reception')) {
        return FileText;
    }
    if (s.includes('thanh toán') || s.includes('thu ngân') || l.includes('thanh toán') || l.includes('thu ngân') || l.includes('viện phí') || r.includes('thu ngân') || r.includes('thanh toán') || l.includes('cashier')) {
        return CreditCard;
    }
    if (s.includes('xét nghiệm') || s.includes('siêu âm') || s.includes('x-quang') || s.includes('chẩn đoán') || s.includes('phòng lab') || s.includes('cận lâm sàng') || l.includes('xét nghiệm') || l.includes('siêu âm') || l.includes('cận lâm sàng') || l.includes('lab')) {
        return Microscope;
    }
    if (s.includes('thủ thuật') || s.includes('tiêm') || s.includes('truyền') || l.includes('thủ thuật') || l.includes('tiêm')) {
        return Syringe;
    }
    if (s.includes('dược') || s.includes('thuốc') || l.includes('dược') || l.includes('thuốc') || l.includes('phát thuốc') || l.includes('pharmacy')) {
        return Pill;
    }
    if (l.includes('tái khám') || l.includes('lịch hẹn')) {
        return RefreshCw;
    }
    if (l.includes('hoàn tất') || l.includes('kết thúc') || l.includes('done')) {
        return CheckCircle2;
    }
    return Stethoscope;
}

function mapStepStatusToNodeStatus(stepStatus: string, isPatientDone?: boolean): WorkflowStepStatus {
    if (isPatientDone) return 'completed';

    const st = (stepStatus || '').toUpperCase().trim();
    if (['COMPLETED', 'DONE', 'SUCCESSED', 'FINISHED'].includes(st)) {
        return 'completed';
    }

    if (['PENDING', 'IN_PROGRESS', 'PROCESSING', 'CURRENT', 'DOING', 'EXAMINING', 'ACTIVE', 'ONGOING'].includes(st)) {
        return 'pending';
    }

    return 'current';
}

function nodeStyles(status: WorkflowStepStatus) {
    switch (status) {
        case 'completed':
            return {
                ring: 'bg-[#10B981] shadow-[0_0_0_4px_rgba(16,185,129,0.2)] border-transparent text-white',
                line: 'bg-[#10B981]',
            };
        case 'pending':
            return {
                ring: 'bg-[#2563EB] shadow-[0_0_0_4px_rgba(37,99,235,0.25)] border-transparent text-white',
                line: 'bg-[#2563EB]',
            };
        default:
            return {
                ring: 'bg-[#F1F5F9] border border-[#CBD5E1] text-[#94A3B8]',
                line: 'bg-[#E2E8F0]',
            };
    }
}

function FlowIcon({ node, isFirst, onClick }: { node: FlowNode; isFirst?: boolean; onClick?: () => void }) {
    const styles = nodeStyles(node.status);

    return (
        <div className="group relative flex flex-col items-center">
            <button
                type="button"
                onClick={onClick}
                className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer',
                    styles.ring
                )}
                title="Xem chi tiết bước"
            >
                <node.Icon className="w-5 h-5" strokeWidth={2.2} />
            </button>

            {/* Tooltip */}
            <div
                className={cn(
                    'absolute hidden group-hover:flex flex-col items-center z-50',
                    isFirst ? 'top-full mt-2.5' : 'bottom-full mb-2.5'
                )}
            >
                {isFirst && <div className="w-2 h-2 bg-[#1E293B] rotate-45 -mb-1 z-10" />}
                <div className="bg-[#1E293B] text-white text-[11px] font-semibold px-3 py-2 rounded-xl shadow-lg whitespace-nowrap">
                    <p className="font-bold text-[#F8FAFC]">{node.label}</p>
                    {node.roomName && <p className="text-[#94A3B8] font-normal text-[10px] mt-0.5">Phòng: {node.roomName}</p>}
                    {node.staffName && <p className="text-[#94A3B8] font-normal text-[10px]">Nhân viên: {node.staffName}</p>}
                </div>
                {!isFirst && <div className="w-2 h-2 bg-[#1E293B] rotate-45 -mt-1" />}
            </div>
            <span className="text-[11px] font-bold text-neutral-600 mt-1.5 max-w-[140px] text-center truncate">
                {node.label}
            </span>
        </div>
    );
}

function Connector({ status }: { status: WorkflowStepStatus }) {
    const styles = nodeStyles(status);
    return <div className={cn('w-0.5 h-6 mx-auto rounded-full', styles.line)} />;
}

function normalizeRoomKey(value?: string): string {
    return (value || '').toLowerCase().trim();
}

function getRoomTypeValue(room: unknown): string {
    const rec = asRecord(room);
    const roomType = rec?.room_type;
    if (typeof roomType === 'string') return roomType;
    const altRoomType = rec?.roomType;
    if (typeof altRoomType === 'string') return altRoomType;
    return '';
}

export function WorkflowDiagram({ patientId, patient }: WorkflowDiagramProps) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const authUser = useAuthStore((s) => s.user);
    const authProfile = useAuthStore((s) => s.profile);
    const [isLoading, startFetch] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [flowData, setFlowData] = useState<Record<string, unknown> | null>(null);
    const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [draftSteps, setDraftSteps] = useState<DraftStep[]>([]);
    const [isConfiguringDraft, setIsConfiguringDraft] = useState(false);

    const [isAssigning, setIsAssigning] = useState(false);
    const [isSelectingTemplate, setIsSelectingTemplate] = useState(false);

    const [isCustomizing, setIsCustomizing] = useState(false);
    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    const [editingSpecialtyId, setEditingSpecialtyId] = useState<string>('');
    const [editingRoomId, setEditingRoomId] = useState<string>('');
    const [editingStaffId, setEditingStaffId] = useState<string>('');
    const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>('');
    const [selectedRoomId, setSelectedRoomId] = useState<string>('');
    const [selectedStaffId, setSelectedStaffId] = useState<string>('');
    const [selectedServiceCode, setSelectedServiceCode] = useState<string>('');
    const [selectedDraftServiceCode, setSelectedDraftServiceCode] = useState<string>('');
    const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
    const [isLoadingServices, setIsLoadingServices] = useState(true);
    const [editingStepStatus, setEditingStepStatus] = useState<string>('');
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [selectedStepNode, setSelectedStepNode] = useState<FlowNode | null>(null);

    const normalizeStepStatusForApi = (status?: string): 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED' | 'CANCELLED' => {
        const normalized = (status || '').toUpperCase().trim();

        if (['COMPLETED', 'DONE', 'FINISHED', 'SUCCESSED'].includes(normalized)) {
            return 'COMPLETED';
        }
        if (['IN_PROGRESS', 'PROCESSING', 'ONGOING', 'CURRENT', 'DOING', 'EXAMINING', 'ACTIVE'].includes(normalized)) {
            return 'IN_PROGRESS';
        }
        if (['DECLINED', 'REJECTED', 'DENIED'].includes(normalized)) {
            return 'DECLINED';
        }
        if (['CANCELLED', 'CANCELED'].includes(normalized)) {
            return 'CANCELLED';
        }
        return 'PENDING';
    };

    const getStatusCandidates = (normalizedStatus: string): string[] => {
        switch (normalizedStatus) {
            case 'IN_PROGRESS':
                return ['IN_PROGRESS', 'PROCESSING', 'ONGOING', 'CURRENT', 'ACTIVE'];
            case 'COMPLETED':
                return ['COMPLETED', 'DONE', 'FINISHED', 'SUCCESSED'];
            case 'DECLINED':
                return ['DECLINED', 'REJECTED', 'DENIED'];
            case 'CANCELLED':
                return ['CANCELLED', 'CANCELED'];
            default:
                return ['PENDING', 'WAITING'];
        }
    };

    const updateStepStatusWithFallback = async (stepId: string, status: string, token: string) => {
        const normalizedStatus = normalizeStepStatusForApi(status);
        const candidates = getStatusCandidates(normalizedStatus);
        let lastError: unknown = null;

        for (const candidate of candidates) {
            try {
                await clinicalService.updateStepStatus(stepId, candidate, token);
                return;
            } catch (err) {
                lastError = err;
            }
        }

        throw lastError;
    };

    const rawFlowSteps = useMemo(() => {
        const steps = flowData?.steps;
        return Array.isArray(steps) ? steps : [];
    }, [flowData]);
    const orderedFlowSteps = useMemo(() => {
        if (!Array.isArray(rawFlowSteps) || rawFlowSteps.length <= 1) return rawFlowSteps;
        // Backend often returns newest-first; reverse for oldest-first timeline in UI.
        return [...rawFlowSteps].reverse();
    }, [rawFlowSteps]);
    const hasLiveSteps = rawFlowSteps.length > 0;

    // Get rooms, staff and shifts from Zustand stores
    const { rooms, fetchRooms } = useRoomStore();
    const { staffs, fetchStaffs } = useStaffStore();
    const { shifts, fetchShifts } = useShiftStore();

    const currentRole = (authUser?.role || authProfile?.role || '').toUpperCase();
    const isDoctorRole = currentRole === 'DOCTOR';

    const currentDoctorStaffId = useMemo(() => {
        if (!isDoctorRole) return '';

        const userId = (authUser?.id || '').toLowerCase();
        const userEmail = (authUser?.email || '').toLowerCase();
        const profileId = (authProfile?.id || '').toLowerCase();
        const profileAccountId = (authProfile?.account_id || '').toLowerCase();
        const profileEmail = (authProfile?.email || '').toLowerCase();

        const matched = staffs.find((staff) => {
            const rec = staff as unknown as Record<string, unknown>;
            const accountRec = rec.account && typeof rec.account === 'object'
                ? (rec.account as Record<string, unknown>)
                : null;

            const staffId = (staff.staff_id || '').toLowerCase();
            const accountId = (typeof rec.account_id === 'string' ? rec.account_id : '').toLowerCase();
            const accountRecId = (typeof accountRec?.id === 'string' ? accountRec.id : '').toLowerCase();
            const accountEmail = (typeof accountRec?.email === 'string' ? accountRec.email : '').toLowerCase();

            return Boolean(
                (userId && (staffId === userId || accountId === userId || accountRecId === userId)) ||
                (profileId && (staffId === profileId || accountId === profileId || accountRecId === profileId)) ||
                (profileAccountId && (accountId === profileAccountId || accountRecId === profileAccountId)) ||
                (userEmail && accountEmail === userEmail) ||
                (profileEmail && accountEmail === profileEmail)
            );
        });

        return matched?.staff_id || '';
    }, [
        isDoctorRole,
        staffs,
        authUser?.id,
        authUser?.email,
        authProfile?.id,
        authProfile?.account_id,
        authProfile?.email,
    ]);

    const currentDoctorRoomKeys = useMemo(() => {
        if (!isDoctorRole || !currentDoctorStaffId) return new Set<string>();

        const keys = new Set<string>();
        shifts.forEach((shift) => {
            if (shift.staff_id !== currentDoctorStaffId) return;

            const shiftRoomId = normalizeRoomKey(shift.room_id);
            if (shiftRoomId) keys.add(shiftRoomId);

            const room = rooms.find((r) => r.room_id === shift.room_id || r.room_name === shift.room_id);
            if (room) {
                const roomId = normalizeRoomKey(room.room_id);
                const roomName = normalizeRoomKey(room.room_name);
                const physicalRoomId = normalizeRoomKey(room.physical_room_id || '');

                if (roomId) keys.add(roomId);
                if (roomName) keys.add(roomName);
                if (physicalRoomId) keys.add(physicalRoomId);
            }
        });

        return keys;
    }, [isDoctorRole, currentDoctorStaffId, shifts, rooms]);

    const canCurrentDoctorEditStepStatus = (step: Record<string, unknown>): boolean => {
        if (!isDoctorRole) return true;

        const roomInfo = step.room_info as Record<string, unknown> | undefined;
        const candidateRoomKeys = [
            normalizeRoomKey(step.room_id as string),
            normalizeRoomKey(roomInfo?.room_id as string),
            normalizeRoomKey(roomInfo?.room_name as string),
        ].filter(Boolean);

        return candidateRoomKeys.some((key) => currentDoctorRoomKeys.has(key));
    };



    useEffect(() => {
        if (accessToken) {
            fetchRooms(accessToken).catch(() => { });
            fetchStaffs(accessToken).catch(() => { });
            fetchShifts(accessToken).catch(() => { });
        }
    }, [accessToken, fetchRooms, fetchStaffs, fetchShifts]);

    useEffect(() => {
        if (!accessToken) return;

        let isCancelled = false;

        clinicalService
            .getServices(accessToken, 1, 100)
            .then((res) => {
                if (isCancelled) return;
                const options = extractServiceOptions(res.data);
                setServiceOptions(options);
                if (options.length > 0) {
                    setSelectedServiceCode((prev) => prev || options[0].service_code);
                    setSelectedDraftServiceCode((prev) => prev || options[0].service_code);
                }
            })
            .catch((err) => {
                console.error('Failed to load service list for workflow:', err);
            })
            .finally(() => {
                if (!isCancelled) setIsLoadingServices(false);
            });

        return () => {
            isCancelled = true;
        };
    }, [accessToken]);

    const specialties = useMemo(() => {
        const byId = new Map<string, string>();
        rooms.forEach((room) => {
            if (!room.specialty_id) return;
            if (!byId.has(room.specialty_id)) {
                byId.set(room.specialty_id, room.specialty?.specialty_name || room.specialty_id);
            }
        });
        return Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
    }, [rooms]);

    const getRoomsBySpecialty = (specialtyId: string) => {
        if (!specialtyId) return [];
        return rooms.filter((room) => room.specialty_id === specialtyId);
    };



    const getStaffOnDutyForRoom = (roomId: string): string => {
        if (!roomId) return '';

        const targetRoom = rooms.find(
            (r) =>
                r.room_id === roomId ||
                (r as unknown as Record<string, unknown>).id === roomId ||
                r.room_name === roomId
        );

        const possibleRoomIds = new Set<string>();
        if (roomId) possibleRoomIds.add(roomId);
        if (targetRoom) {
            if (targetRoom.room_id) possibleRoomIds.add(targetRoom.room_id);
            if ((targetRoom as unknown as Record<string, unknown>).id) {
                possibleRoomIds.add((targetRoom as unknown as Record<string, unknown>).id as string);
            }
            if (targetRoom.physical_room_id) possibleRoomIds.add(targetRoom.physical_room_id);
            if (targetRoom.room_name) possibleRoomIds.add(targetRoom.room_name);
        }

        let roomShifts = shifts.filter((s) => {
            if (!s.room_id) return false;
            return possibleRoomIds.has(s.room_id);
        });

        if (roomShifts.length === 0) {
            const roomName = targetRoom?.room_name || roomId;
            roomShifts = shifts.filter((s) => s.room_id && (s.room_id === roomName || s.room_id.includes(roomName)));
        }

        if (roomShifts.length === 0) {
            const roomSpecialtyId = targetRoom?.specialty_id;
            const doctorInSpecialty = staffs.find(
                (st) => (roomSpecialtyId && st.specialty_id === roomSpecialtyId) && (st.account?.role as string) === 'DOCTOR'
            ) || staffs.find(
                (st) => (st.account?.role as string) === 'DOCTOR'
            );
            if (doctorInSpecialty?.full_name) {
                return doctorInSpecialty.full_name;
            }
            if (doctorInSpecialty?.account?.user_name) {
                return doctorInSpecialty.account.user_name;
            }
            return 'Chưa có bác sĩ';
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayKey = `${year}-${month}-${day}`;
        const todayUtcKey = now.toISOString().split('T')[0];

        let matchedShift = roomShifts.find((s) => {
            if (!s.date) return false;
            const dStr = s.date.split('T')[0].slice(0, 10);
            return dStr === todayKey || dStr === todayUtcKey;
        });

        if (!matchedShift) {
            matchedShift = [...roomShifts].sort((a, b) => {
                const aTime = a.date ? new Date(a.date).getTime() : 0;
                const bTime = b.date ? new Date(b.date).getTime() : 0;
                return bTime - aTime;
            })[0];
        }

        if (!matchedShift) return '';

        const shiftObj = matchedShift as unknown as Record<string, unknown>;
        const staffInShift = (shiftObj.staff || shiftObj.staff_info || shiftObj.account) as Record<string, unknown> | undefined;

        const directStaffName =
            shiftObj.staff_name ||
            shiftObj.doctor_name ||
            staffInShift?.full_name ||
            staffInShift?.name ||
            staffInShift?.user_name ||
            ((staffInShift?.profile || {}) as Record<string, unknown>)?.full_name;

        if (typeof directStaffName === 'string' && directStaffName.trim()) {
            return directStaffName;
        }

        const sId = matchedShift.staff_id;
        if (sId) {
            const staff = staffs.find((st) => {
                const stAny = st as unknown as Record<string, unknown>;
                const accAny = (st.account || {}) as unknown as Record<string, unknown>;
                const profAny = (accAny.profile || {}) as Record<string, unknown>;
                return (
                    st.staff_id === sId ||
                    stAny.id === sId ||
                    stAny.account_id === sId ||
                    stAny.user_id === sId ||
                    stAny.staff_code === sId ||
                    accAny.id === sId ||
                    accAny.account_id === sId ||
                    accAny.user_id === sId ||
                    accAny.email === sId ||
                    accAny.user_name === sId ||
                    profAny.id === sId
                );
            });

            if (staff) {
                const stAny = staff as unknown as Record<string, unknown>;
                const accAny = (staff.account || {}) as unknown as Record<string, unknown>;
                const profAny = (accAny.profile || {}) as Record<string, unknown>;

                const name =
                    staff.full_name ||
                    (stAny.name as string) ||
                    (accAny.full_name as string) ||
                    (profAny.full_name as string) ||
                    staff.account?.user_name ||
                    (accAny.user_name as string) ||
                    staff.account?.email;

                if (name && name.trim()) return name;
            }

            const roomSpecialtyId = targetRoom?.specialty_id;
            const doctorInSpecialty = staffs.find(
                (st) => (roomSpecialtyId && st.specialty_id === roomSpecialtyId) || (st.account?.role as string) === 'DOCTOR'
            );
            if (doctorInSpecialty?.full_name) {
                return doctorInSpecialty.full_name;
            }
            if (doctorInSpecialty?.account?.user_name) {
                return doctorInSpecialty.account.user_name;
            }
        }

        return 'Chưa phân công bác sĩ trực';
    };

    const pickDoctorOnDutyForRoom = (roomId: string) => {
        if (!roomId) return '';

        const targetRoom = rooms.find(
            (r) =>
                r.room_id === roomId ||
                (r as unknown as Record<string, unknown>).id === roomId ||
                r.room_name === roomId
        );

        const possibleRoomIds = new Set<string>();
        if (roomId) possibleRoomIds.add(roomId);
        if (targetRoom) {
            if (targetRoom.room_id) possibleRoomIds.add(targetRoom.room_id);
            if ((targetRoom as unknown as Record<string, unknown>).id) {
                possibleRoomIds.add((targetRoom as unknown as Record<string, unknown>).id as string);
            }
            if (targetRoom.physical_room_id) possibleRoomIds.add(targetRoom.physical_room_id);
            if (targetRoom.room_name) possibleRoomIds.add(targetRoom.room_name);
        }

        let roomShifts = shifts.filter((s) => {
            if (!s.room_id) return false;
            return possibleRoomIds.has(s.room_id);
        });

        if (roomShifts.length === 0) {
            const roomName = targetRoom?.room_name || roomId;
            roomShifts = shifts.filter((s) => s.room_id && (s.room_id === roomName || s.room_id.includes(roomName)));
        }

        if (roomShifts.length === 0) {
            const roomSpecialtyId = targetRoom?.specialty_id;
            const doctorInSpecialty = staffs.find(
                (st) => roomSpecialtyId && st.specialty_id === roomSpecialtyId && (st.account?.role as string) === 'DOCTOR'
            ) || staffs.find(
                (st) => (st.account?.role as string) === 'DOCTOR'
            );

            return doctorInSpecialty?.staff_id || '';
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayKey = `${year}-${month}-${day}`;
        const todayUtcKey = now.toISOString().split('T')[0];

        let matchedShift = roomShifts.find((s) => {
            if (!s.date) return false;
            const dStr = s.date.split('T')[0].slice(0, 10);
            return dStr === todayKey || dStr === todayUtcKey;
        });

        if (!matchedShift) {
            matchedShift = [...roomShifts].sort((a, b) => {
                const aTime = a.date ? new Date(a.date).getTime() : 0;
                const bTime = b.date ? new Date(b.date).getTime() : 0;
                return bTime - aTime;
            })[0];
        }

        if (!matchedShift) return '';

        const sId = matchedShift.staff_id;
        const staff = staffs.find(
            (st) =>
                st.staff_id === sId ||
                (st as unknown as Record<string, unknown>).id === sId ||
                (st as unknown as Record<string, unknown>).account_id === sId
        );

        const resolvedStaffId = staff?.staff_id || sId || '';
        if (resolvedStaffId) return resolvedStaffId;

        const roomSpecialtyId = targetRoom?.specialty_id;
        const doctorInSpecialty = staffs.find(
            (st) => roomSpecialtyId && st.specialty_id === roomSpecialtyId && (st.account?.role as string) === 'DOCTOR'
        ) || staffs.find(
            (st) => (st.account?.role as string) === 'DOCTOR'
        );

        return doctorInSpecialty?.staff_id || '';
    };



    const handleEditingSpecialtyChange = (specialtyId: string) => {
        setEditingSpecialtyId(specialtyId);
        setEditingRoomId('');
        setEditingStaffId('');
    };

    const handleEditingRoomChange = (roomId: string) => {
        setEditingRoomId(roomId);
        setEditingStaffId(pickDoctorOnDutyForRoom(roomId));
    };

    const handleSelectedSpecialtyChange = (specialtyId: string) => {
        setSelectedSpecialtyId(specialtyId);
        setSelectedRoomId('');
        setSelectedStaffId('');
        setSelectedServiceCode('');
        setSelectedDraftServiceCode('');
    };

    const handleSelectedRoomChange = (roomId: string) => {
        setSelectedRoomId(roomId);
        setSelectedStaffId(pickDoctorOnDutyForRoom(roomId));

        const room = rooms.find((r) => r.room_id === roomId);
        const defaultServiceCode = pickServiceCodeByContext(
            {
                roomType: getRoomTypeValue(room),
                roomName: room?.room_name,
                specialtyName: room?.specialty?.specialty_name,
            },
            serviceOptions
        );
        if (defaultServiceCode) {
            setSelectedServiceCode(defaultServiceCode);
            setSelectedDraftServiceCode(defaultServiceCode);
        }
    };

    const reloadFlow = async () => {
        if (!accessToken || !patientId) return;
        try {
            const flowRes = await clinicalService.getActiveFlowByPatientId(patientId, accessToken);
            let flowObj: Record<string, unknown> | null = null;
            if (flowRes?.data) {
                const raw = flowRes.data as unknown;
                const list = extractFlowList(raw);
                if (list.length > 0) {
                    flowObj = pickBestActiveFlow(list);
                } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                    const rec = raw as Record<string, unknown>;
                    flowObj = (rec.data && typeof rec.data === 'object' && !Array.isArray(rec.data))
                        ? (rec.data as Record<string, unknown>)
                        : rec;
                }
            }
            setFlowData(flowObj);
        } catch (err) {
            console.error('Failed to reload active flow:', err);
        }
    };

    const handleCancelStep = async (stepId: string) => {
        if (!accessToken) return;
        setIsActionLoading(true);
        try {
            await clinicalService.updateStepStatus(stepId, 'CANCELLED', accessToken);
            await reloadFlow();
        } catch (err) {
            console.error('Failed to cancel step:', err);
            setError('Không thể hủy bước khám.');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUpdateStep = async (stepId: string) => {
        if (!accessToken || !editingRoomId) return;
        setIsActionLoading(true);
        try {
            const payload: { room_id: string; staff_id?: string } = {
                room_id: editingRoomId,
            };
            if (editingStaffId) {
                payload.staff_id = editingStaffId;
            }
            await clinicalService.updateStep(stepId, payload, accessToken);
            if (editingStepStatus) {
                await updateStepStatusWithFallback(stepId, editingStepStatus, accessToken);
            }
            setEditingStepId(null);
            await reloadFlow();
        } catch (err) {
            console.error('Failed to update step:', err);
            setError('Không thể cập nhật thông tin bước.');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleAddStep = async () => {
        const flowId = (flowData?.flow_id as string) || patient?.flowId;
        if (!flowId || !accessToken || !selectedRoomId) return;

        const room = rooms.find((r) => r.room_id === selectedRoomId);
        const resolvedServiceCode =
            selectedServiceCode ||
            pickServiceCodeByContext(
                {
                    roomType: getRoomTypeValue(room),
                    roomName: room?.room_name,
                    specialtyName: room?.specialty?.specialty_name,
                },
                serviceOptions
            );

        if (!resolvedServiceCode) {
            setError('Vui lòng chọn mã dịch vụ cho bước khám.');
            return;
        }

        const resolvedStaffId = selectedStaffId || pickDoctorOnDutyForRoom(selectedRoomId);
        if (!resolvedStaffId) {
            setError('Không tìm thấy bác sĩ/nhân viên trực cho phòng đã chọn. Vui lòng chọn phòng khác hoặc phân ca trước.');
            return;
        }

        setIsActionLoading(true);
        try {
            const payload: { flow_id: string; room_id: string; staff_id?: string; step_status: string; service_code: string } = {
                flow_id: flowId,
                room_id: selectedRoomId,
                step_status: 'PENDING',
                staff_id: resolvedStaffId,
                service_code: resolvedServiceCode,
            };
            await clinicalService.createStepParent(payload, accessToken);
            setSelectedRoomId('');
            setSelectedStaffId('');
            setSelectedServiceCode('');
            await reloadFlow();
        } catch (err) {
            console.error('Failed to add step:', err);
            setError('Không thể thêm bước khám mới.');
        } finally {
            setIsActionLoading(false);
        }
    };

    useEffect(() => {
        if (!accessToken || !patientId) return;

        const loadData = async () => {
            startFetch(async () => {
                try {
                    setError(null);
                    // Fetch Active Flow
                    const flowRes = await clinicalService.getActiveFlowByPatientId(patientId, accessToken);
                    let flowObj: Record<string, unknown> | null = null;
                    if (flowRes?.data) {
                        const raw = flowRes.data as unknown;
                        const list = extractFlowList(raw);
                        if (list.length > 0) {
                            flowObj = pickBestActiveFlow(list);
                        } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                            const rec = raw as Record<string, unknown>;
                            flowObj = (rec.data && typeof rec.data === 'object' && !Array.isArray(rec.data))
                                ? (rec.data as Record<string, unknown>)
                                : rec;
                        }
                    }
                    setFlowData(flowObj);

                    // Fetch Templates
                    try {
                        const tplRes = await clinicalService.getProcessTemplates(accessToken);
                        let tplList: ProcessTemplate[] = [];
                        if (tplRes?.data) {
                            const tData = tplRes.data as unknown;
                            if (Array.isArray(tData)) {
                                tplList = tData as ProcessTemplate[];
                            } else if (tData && typeof tData === 'object') {
                                const rec = tData as Record<string, unknown>;
                                if (Array.isArray(rec.data)) {
                                    tplList = rec.data as ProcessTemplate[];
                                } else if (Array.isArray(rec.templates)) {
                                    tplList = rec.templates as ProcessTemplate[];
                                }
                            }
                        }
                        setTemplates(tplList);

                        // Asynchronously initialize draft steps if flow has no steps in DB
                        const rawSteps = (flowObj?.steps as unknown[]) || [];
                        if (rawSteps.length === 0 && tplList.length > 0) {
                            const firstTpl = tplList[0];
                            const firstTplId = firstTpl.template_id || firstTpl.id || '';
                            if (firstTplId) {
                                setSelectedTemplateId(firstTplId);
                                const initialDrafts: DraftStep[] = (firstTpl.steps || []).map((s, idx) => {
                                    const defaultRoom = rooms.find(r => r.room_name.toLowerCase().includes(s.room_type.toLowerCase())) || rooms[0];
                                    const rId = defaultRoom?.room_id || '';
                                    const defaultServiceCode =
                                        s.service_code ||
                                        pickServiceCodeByContext(
                                            {
                                                roomType: getRoomTypeValue(defaultRoom) || s.room_type,
                                                roomName: defaultRoom?.room_name,
                                                specialtyName: defaultRoom?.specialty?.specialty_name,
                                            },
                                            serviceOptions
                                        );
                                    return {
                                        tempId: `draft-${idx}-${Date.now()}`,
                                        step_name: s.step_name || s.room_type,
                                        specialty_id: defaultRoom?.specialty_id || '',
                                        room_type: s.room_type,
                                        room_id: rId,
                                        staff_id: rId ? pickDoctorOnDutyForRoom(rId) : '',
                                        service_code: defaultServiceCode,
                                        doctor_name: rId ? (getStaffOnDutyForRoom(rId) || 'Chưa có bác sĩ') : 'Chưa có bác sĩ',
                                    };
                                });
                                setDraftSteps(initialDrafts);
                            }
                        }
                    } catch {
                        // ignore template fetch error if any
                    }
                } catch (err) {
                    console.error('Failed to fetch active flow:', err);
                    setError('Không thể tải quy trình.');
                }
            });
        };

        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId, accessToken]);



    const handleSelectTemplateDraft = (templateId: string) => {
        setSelectedTemplateId(templateId);
        const tpl = templates.find(t => (t.template_id || t.id) === templateId);
        if (tpl && tpl.steps) {
            const initialDrafts: DraftStep[] = tpl.steps.map((s, idx) => {
                const defaultRoom = rooms.find(r => r.room_name.toLowerCase().includes(s.room_type.toLowerCase())) || rooms[0];
                const rId = defaultRoom?.room_id || '';
                const defaultServiceCode =
                    s.service_code ||
                    pickServiceCodeByContext(
                        {
                            roomType: getRoomTypeValue(defaultRoom) || s.room_type,
                            roomName: defaultRoom?.room_name,
                            specialtyName: defaultRoom?.specialty?.specialty_name,
                        },
                        serviceOptions
                    );
                return {
                    tempId: `draft-${idx}-${Date.now()}`,
                    step_name: s.step_name || s.room_type,
                    specialty_id: defaultRoom?.specialty_id || '',
                    room_type: s.room_type,
                    room_id: rId,
                    staff_id: rId ? pickDoctorOnDutyForRoom(rId) : '',
                    service_code: defaultServiceCode,
                    doctor_name: rId ? (getStaffOnDutyForRoom(rId) || 'Chưa có bác sĩ') : 'Chưa có bác sĩ',
                };
            });
            setDraftSteps(initialDrafts);
        } else {
            setDraftSteps([]);
        }
    };

    const handleUpdateDraftStep = (tempId: string, updates: Partial<DraftStep>) => {
        setDraftSteps(prev => prev.map(step => {
            if (step.tempId === tempId) {
                const updated = { ...step, ...updates };
                if (updates.room_id !== undefined && updates.staff_id === undefined) {
                    updated.staff_id = ''; // Reset staff when room changes
                }
                if (updates.room_id !== undefined) {
                    updated.doctor_name = getStaffOnDutyForRoom(updates.room_id) || 'Chưa có bác sĩ';
                    if (!updated.service_code) {
                        const room = rooms.find((r) => r.room_id === updates.room_id);
                        updated.service_code = pickServiceCodeByContext(
                            {
                                roomType: getRoomTypeValue(room),
                                roomName: room?.room_name,
                                specialtyName: room?.specialty?.specialty_name,
                            },
                            serviceOptions
                        );
                    }
                }
                return updated;
            }
            return step;
        }));
    };

    const handleRemoveDraftStep = (tempId: string) => {
        setDraftSteps(prev => prev.filter(step => step.tempId !== tempId));
    };

    const handleAddDraftStep = (specialty_id: string, room_id: string, staff_id: string, service_code: string) => {
        if (!room_id) return;
        if (!service_code) {
            setError('Vui lòng chọn mã dịch vụ cho bước nháp.');
            return;
        }
        const resolvedStaffId = staff_id || pickDoctorOnDutyForRoom(room_id);
        if (!resolvedStaffId) {
            setError('Không tìm thấy bác sĩ/nhân viên trực cho phòng đã chọn. Vui lòng chọn phòng khác hoặc phân ca trước.');
            return;
        }
        const room = rooms.find(r => r.room_id === room_id);
        const doctorName = getStaffOnDutyForRoom(room_id) || 'Chưa có bác sĩ';
        const newStep: DraftStep = {
            tempId: `draft-custom-${Date.now()}`,
            step_name: room?.room_name || 'Khám chức năng',
            specialty_id,
            room_type: room?.specialty_id || 'GENERAL',
            room_id,
            staff_id: resolvedStaffId,
            service_code,
            doctor_name: doctorName,
        };
        setDraftSteps(prev => [...prev, newStep]);
    };

    const handleCommitDraft = async () => {
        const flowId = (flowData?.flow_id as string) || patient?.flowId;
        if (!flowId || flowId === 'undefined' || !accessToken) {
            setError('Không tìm thấy Flow ID của bệnh nhân.');
            return;
        }

        if (draftSteps.length === 0) {
            setError('Quy trình nháp không có bước nào.');
            return;
        }

        // Validate that all steps have a room selected
        const missingRoom = draftSteps.find(s => !s.room_id);
        if (missingRoom) {
            setError(`Vui lòng chọn phòng cho bước "${missingRoom.step_name}".`);
            return;
        }

        const missingStaff = draftSteps.find(s => !s.staff_id);
        if (missingStaff) {
            setError(`Bước "${missingStaff.step_name}" chưa có bác sĩ/nhân viên phụ trách.`);
            return;
        }

        const missingServiceCode = draftSteps.find((s) => !s.service_code);
        if (missingServiceCode) {
            setError(`Bước "${missingServiceCode.step_name}" chưa có mã dịch vụ.`);
            return;
        }

        setIsAssigning(true);
        setError(null);
        try {
            // Create steps sequentially in database
            for (const step of draftSteps) {
                const payload: { flow_id: string; room_id: string; staff_id?: string; step_status: string; service_code: string } = {
                    flow_id: flowId,
                    room_id: step.room_id,
                    step_status: 'PENDING',
                    service_code: step.service_code,
                };
                if (step.staff_id) {
                    payload.staff_id = step.staff_id;
                }
                await clinicalService.createStepParent(payload, accessToken);
            }

            // Clear draft state and return to live steps mode
            setSelectedTemplateId('');
            setDraftSteps([]);
            setIsConfiguringDraft(false);

            // Refetch active flow to get updated steps
            await reloadFlow();
        } catch (err) {
            console.error('Failed to commit flow steps:', err);
            setError('Không thể lưu quy trình vào cơ sở dữ liệu.');
        } finally {
            setIsAssigning(false);
        }
    };

    // Determine active template and current steps to render
    const activeTemplateId =
        selectedTemplateId ||
        (!hasLiveSteps && templates[0] ? (templates[0].template_id || templates[0].id) : '') ||
        (flowData?.template_id as string) ||
        (patient?.templateId as string) ||
        '';

    const dynamicSteps: FlowNode[] = [];
    const isPatientDone = patient?.status === 'Đã khám';

    const appendLiveSteps = () => {
        orderedFlowSteps.forEach((stepItem, index) => {
            const step = stepItem as Record<string, unknown>;
            const stepStatus = ((step.step_status as string) || '').toUpperCase();
            if (stepStatus === 'CANCELLED') return;

            const status = mapStepStatusToNodeStatus(stepStatus, isPatientDone);
            const specialtyInfo = step.specialty_info as Record<string, unknown> | undefined;
            const roomInfo = step.room_info as Record<string, unknown> | undefined;
            const staffInfo = step.staff_info as Record<string, unknown> | undefined;

            const specialtyName = (specialtyInfo?.specialty_name as string) || '';
            const roomName = (roomInfo?.room_name as string) || '';
            const label = (step.step_name as string) || roomName || specialtyName || `Bước ${index + 1}`;

            let staffName = (staffInfo?.full_name as string) || '';

            if (!staffName) {
                const sId = (step.staff_id as string) || (staffInfo?.staff_id as string);
                if (sId) {
                    const foundStaff = staffs.find(
                        (st) =>
                            st.staff_id === sId ||
                            (st as unknown as Record<string, unknown>).id === sId ||
                            (st as unknown as Record<string, unknown>).account_id === sId
                    );
                    if (foundStaff?.full_name) {
                        staffName = foundStaff.full_name;
                    }
                }
            }

            if (!staffName) {
                const stepRoomId = (step.room_id as string) || (roomInfo?.room_id as string) || '';
                const dutyStaffName = getStaffOnDutyForRoom(stepRoomId);
                if (dutyStaffName) {
                    staffName = dutyStaffName;
                }
            }

            if (!staffName) {
                staffName = 'Chưa phân công';
            }

            dynamicSteps.push({
                id: (step.step_id as string) || `api-step-${index}`,
                Icon: getIconForStep(specialtyName, roomName, label),
                status,
                label,
                roomName,
                staffName,
                detail: {
                    source: 'live',
                    stepStatus,
                    roomId: (step.room_id as string) || (roomInfo?.room_id as string) || '',
                    specialtyName,
                    specialtyId: (specialtyInfo?.specialty_id as string) || '',
                    staffId: (step.staff_id as string) || (staffInfo?.staff_id as string) || '',
                    paymentStatus: (step.payment_status as string) || '',
                    docNo: String(step.docNo || ''),
                },
            });
        });
    };

    if (selectedTemplateId) {
        if (hasLiveSteps) {
            appendLiveSteps();
        }

        // Preview template steps are appended after existing flow steps.
        draftSteps.forEach((dStep: DraftStep, index: number) => {
            const roomObj = rooms.find(r => r.room_id === dStep.room_id);
            const label = dStep.step_name || `Bước ${index + 1}`;
            dynamicSteps.push({
                id: dStep.tempId,
                Icon: getIconForStep(dStep.room_type, roomObj?.room_name || dStep.room_type, label),
                status: 'current',
                label,
                roomName: roomObj?.room_name || 'Chưa phân phòng',
                staffName: getStaffOnDutyForRoom(dStep.room_id) || 'Chưa phân công',
                detail: {
                    source: 'draft',
                    stepStatus: 'NOT_STARTED',
                    roomId: dStep.room_id,
                    specialtyId: dStep.specialty_id,
                    staffId: dStep.staff_id,
                    paymentStatus: 'N/A',
                    docNo: 'N/A',
                },
            });
        });
    } else if (hasLiveSteps) {
        appendLiveSteps();
    } else {
        // Fallback to full standard workflow steps
        dynamicSteps.push(...DEFAULT_FULL_WORKFLOW);
    }

    if (isLoading) {
        return (
            <div className="bg-white rounded-[24px] border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-12 flex flex-col items-center justify-center min-h-[350px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                <p className="text-xs font-semibold text-neutral-500 mt-3">Đang tải quy trình...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50/50 border border-red-100 rounded-[24px] p-5 flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold text-red-700">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="bg-white rounded-[24px] border border-neutral-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 flex flex-col items-center w-full max-w-[280px] mx-auto select-none transition-all group/workflow"
        >
            <div className="w-full mb-4">
                <button
                    onClick={() => setIsSelectingTemplate(true)}
                    className="w-full bg-[#F5F2FF] hover:bg-[#EDE8FF] text-[#6D5DE5] border border-[#DED7FF] font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                    Thêm flow vào template
                </button>
            </div>

            <div className="flex flex-col items-center w-full space-y-1">
                {dynamicSteps.map((node, idx) => (
                    <div key={node.id} className="flex flex-col items-center w-full">
                        <FlowIcon node={node} isFirst={idx === 0} onClick={() => setSelectedStepNode(node)} />
                        {idx < dynamicSteps.length - 1 && (
                            <Connector status={node.status} />
                        )}
                    </div>
                ))}
            </div>

            {/* Template Selector Footer */}
            {(selectedTemplateId || !hasLiveSteps) ? (
                <div className="w-full mt-6 pt-5 border-t border-neutral-100 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#8B7CF6] uppercase tracking-wider">
                            Xem trước quy trình:
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setIsConfiguringDraft(true);
                                setSelectedSpecialtyId('');
                                setSelectedRoomId('');
                                setSelectedStaffId('');
                            }}
                            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            Cấu hình & Chốt
                        </button>
                        {hasLiveSteps && (
                            <button
                                onClick={() => {
                                    setSelectedTemplateId('');
                                    setDraftSteps([]);
                                }}
                                className="px-3.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                                Hủy
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="w-full mt-6 pt-5 border-t border-neutral-100 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                            Quy trình:
                        </span>
                        <button
                            onClick={() => {
                                setIsCustomizing(true);
                                setEditingStepId(null);
                                setEditingSpecialtyId('');
                                setSelectedSpecialtyId('');
                                setSelectedRoomId('');
                                setSelectedStaffId('');
                            }}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5F2FF] text-[#8B7CF6] border border-[#E0DCFB] hover:bg-[#8B7CF6] hover:text-white transition-colors cursor-pointer"
                        >
                            Tùy chỉnh ({dynamicSteps.length} bước)
                        </button>
                    </div>
                </div>
            )}

            {/* Customizer Modal */}
            <Dialog open={isCustomizing} onOpenChange={setIsCustomizing}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle>Tùy chỉnh Quy trình của Bệnh nhân</DialogTitle>
                        <DialogDescription>
                            Chỉnh sửa phòng, nhân viên phụ trách hoặc thêm/hủy các bước của quy trình hiện tại.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="my-6 space-y-4">
                        {/* List of current steps */}
                        <div className="border border-neutral-100 rounded-2xl overflow-hidden divide-y divide-neutral-100 bg-neutral-50/50">
                            {orderedFlowSteps.map((stepItem, idx) => {
                                const step = stepItem as Record<string, unknown>;
                                const stepId = (step.step_id as string) || `step-${idx}`;
                                const stepStatus = ((step.step_status as string) || '').toUpperCase();
                                if (stepStatus === 'CANCELLED') return null;

                                const canEditStatus = canCurrentDoctorEditStepStatus(step);

                                const isStepEditing = editingStepId === stepId;
                                const roomInfo = step.room_info as Record<string, unknown> | undefined;
                                const specialtyInfo = step.specialty_info as Record<string, unknown> | undefined;
                                const roomName = (roomInfo?.room_name as string) || '';
                                const specialtyName = (specialtyInfo?.specialty_name as string) || '';
                                const stepName = (step.step_name as string) || roomName || `Bước ${idx + 1}`;

                                return (
                                    <div key={stepId} className="p-4 flex items-center justify-between gap-4 bg-white">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-neutral-800 text-sm">{stepName}</p>

                                            {!isStepEditing && (
                                                <div className="flex gap-4 text-xs text-neutral-400 mt-1 font-medium flex-wrap">
                                                    <span>Phòng: <strong className="text-neutral-600 font-semibold">{roomName || 'Chưa phân công'}</strong></span>
                                                    <span>Chuyên khoa: <strong className="text-neutral-600 font-semibold">{specialtyName || 'Chưa phân khoa'}</strong></span>
                                                    <span>Bác sĩ trực: <strong className="text-[#5B4ED6] font-semibold">{dynamicSteps.find((n) => n.id === stepId)?.staffName || 'Chưa có bác sĩ'}</strong></span>
                                                    <span className="flex items-center gap-1">
                                                        Trạng thái:
                                                        <select
                                                            value={stepStatus}
                                                            onChange={async (e) => {
                                                                if (!accessToken) return;
                                                                if (!canEditStatus) {
                                                                    setError('Bác sĩ chỉ có thể sửa trạng thái ở bước mình phụ trách.');
                                                                    return;
                                                                }

                                                                const newStatus = e.target.value;
                                                                try {
                                                                    setIsActionLoading(true);
                                                                    await clinicalService.updateStepStatus(stepId, newStatus, accessToken);
                                                                    await reloadFlow();
                                                                } catch (err) {
                                                                    console.error('Failed to update step status:', err);
                                                                    setError('Không thể cập nhật trạng thái.');
                                                                } finally {
                                                                    setIsActionLoading(false);
                                                                }
                                                            }}
                                                            disabled={isActionLoading || !canEditStatus}
                                                            className="bg-neutral-50 hover:bg-neutral-100 text-brand-600 border border-neutral-200 rounded-md px-1.5 py-0.5 text-[11px] font-bold cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500/20"
                                                        >
                                                            <option value="PENDING">PENDING</option>
                                                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                                                            <option value="COMPLETED">COMPLETED</option>
                                                            <option value="DECLINED">DECLINED</option>
                                                            <option value="CANCELLED">CANCELLED</option>
                                                        </select>
                                                    </span>
                                                </div>
                                            )}

                                            {isStepEditing && (
                                                <div className="grid grid-cols-2 gap-3 mt-3">
                                                    <div>
                                                        <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">Chuyên khoa</label>
                                                        <select
                                                            value={editingSpecialtyId}
                                                            onChange={(e) => handleEditingSpecialtyChange(e.target.value)}
                                                            className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200"
                                                        >
                                                            <option value="">Chọn chuyên khoa</option>
                                                            {specialties.map((specialty) => (
                                                                <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">Phòng khám</label>
                                                        <select
                                                            value={editingRoomId}
                                                            onChange={(e) => handleEditingRoomChange(e.target.value)}
                                                            disabled={!editingSpecialtyId}
                                                            className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 disabled:bg-neutral-50 disabled:text-neutral-400"
                                                        >
                                                            <option value="">Chọn phòng</option>
                                                            {getRoomsBySpecialty(editingSpecialtyId).map((r) => (
                                                                <option key={r.room_id} value={r.room_id}>{r.room_name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="col-span-2">
                                                        <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">Trạng thái</label>
                                                        <select
                                                            value={editingStepStatus}
                                                            onChange={(e) => setEditingStepStatus(e.target.value)}
                                                            className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white"
                                                        >
                                                            <option value="PENDING">PENDING</option>
                                                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                                                            <option value="COMPLETED">COMPLETED</option>
                                                            <option value="DECLINED">DECLINED</option>
                                                            <option value="CANCELLED">CANCELLED</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {isStepEditing ? (
                                                <>
                                                    <button
                                                        onClick={() => handleUpdateStep(stepId)}
                                                        disabled={isActionLoading}
                                                        className="px-3 py-1.5 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-colors disabled:opacity-50"
                                                    >
                                                        Lưu
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingStepId(null)}
                                                        className="px-3 py-1.5 bg-neutral-100 text-neutral-600 rounded-xl text-xs font-bold hover:bg-neutral-200 transition-colors"
                                                    >
                                                        Hủy
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            const currentRoomId = (roomInfo?.room_id as string) || '';
                                                            const currentRoom = rooms.find((r) => r.room_id === currentRoomId);
                                                            const currentSpecialtyId =
                                                                currentRoom?.specialty_id ||
                                                                (roomInfo?.specialty_id as string) ||
                                                                (specialtyInfo?.specialty_id as string) ||
                                                                '';

                                                            setEditingStepId(stepId);
                                                            setEditingSpecialtyId(currentSpecialtyId);
                                                            setEditingRoomId(currentRoomId);
                                                            setEditingStaffId(pickDoctorOnDutyForRoom(currentRoomId));
                                                            setEditingStepStatus(normalizeStepStatusForApi(stepStatus));
                                                        }}
                                                        className="p-2 text-neutral-400 hover:text-brand-500 hover:bg-neutral-50 rounded-xl transition-all cursor-pointer"
                                                        title="Sửa bước"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>

                                                    {stepStatus !== 'COMPLETED' && (
                                                        <button
                                                            onClick={() => handleCancelStep(stepId)}
                                                            disabled={isActionLoading}
                                                            className="p-2 text-neutral-400 hover:text-red-500 hover:bg-neutral-50 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                                                            title="Hủy bước"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add Step Section */}
                        <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4">
                            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                <Plus className="w-4 h-4 text-brand-500" />
                                Thêm bước khám mới
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">Chuyên khoa</label>
                                    <select
                                        value={selectedSpecialtyId}
                                        onChange={(e) => handleSelectedSpecialtyChange(e.target.value)}
                                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white"
                                    >
                                        <option value="">Chọn chuyên khoa</option>
                                        {specialties.map((specialty) => (
                                            <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">Phòng khám</label>
                                    <select
                                        value={selectedRoomId}
                                        onChange={(e) => handleSelectedRoomChange(e.target.value)}
                                        disabled={!selectedSpecialtyId}
                                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white disabled:bg-neutral-50 disabled:text-neutral-400"
                                    >
                                        <option value="">Chọn phòng</option>
                                        {getRoomsBySpecialty(selectedSpecialtyId).map((r) => (
                                            <option key={r.room_id} value={r.room_id}>{r.room_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">Dịch vụ</label>
                                    <select
                                        value={selectedServiceCode}
                                        onChange={(e) => setSelectedServiceCode(e.target.value)}
                                        disabled={isLoadingServices || serviceOptions.length === 0}
                                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white disabled:bg-neutral-50 disabled:text-neutral-400"
                                    >
                                        {serviceOptions.map((service) => (
                                            <option key={service.service_id || service.service_code} value={service.service_code}>
                                                {service.service_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                            </div>
                            <button
                                onClick={handleAddStep}
                                disabled={!selectedRoomId || !selectedServiceCode}
                                className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isActionLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        Thêm bước vào Quy trình
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Draft Configuration & Commit Modal */}
            <Dialog open={isConfiguringDraft} onOpenChange={setIsConfiguringDraft}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle>Cấu hình & Chốt Quy trình</DialogTitle>
                        <DialogDescription>
                            Gán phòng khám và nhân viên cho từng bước khám nháp trước khi chính thức lưu vào Database.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="my-6 space-y-4">
                        {/* List of draft steps */}
                        <div className="border border-neutral-100 rounded-2xl overflow-hidden divide-y divide-neutral-100 bg-neutral-50/50">
                            {draftSteps.map((step, idx) => {
                                return (
                                    <div key={step.tempId} className="p-4 flex items-start justify-between gap-4 bg-white">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-[#F5F2FF] text-[#8B7CF6] font-bold text-[10px] flex items-center justify-center shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <p className="font-bold text-neutral-800 text-sm">{step.step_name}</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 mt-3">
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">
                                                        Chuyên khoa
                                                    </label>
                                                    <select
                                                        value={step.specialty_id}
                                                        onChange={(e) => {
                                                            handleUpdateDraftStep(step.tempId, {
                                                                specialty_id: e.target.value,
                                                                room_id: '',
                                                                staff_id: '',
                                                            });
                                                        }}
                                                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white focus:border-[#8B7CF6] focus:outline-none"
                                                    >
                                                        <option value="">Chọn chuyên khoa</option>
                                                        {specialties.map((specialty) => (
                                                            <option key={specialty.id} value={specialty.id}>
                                                                {specialty.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">
                                                        Phòng khám
                                                    </label>
                                                    <select
                                                        value={step.room_id}
                                                        onChange={(e) => {
                                                            const roomId = e.target.value;
                                                            handleUpdateDraftStep(step.tempId, {
                                                                room_id: roomId,
                                                                staff_id: pickDoctorOnDutyForRoom(roomId),
                                                            });
                                                        }}
                                                        disabled={!step.specialty_id}
                                                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white focus:border-[#8B7CF6] focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-400"
                                                    >
                                                        <option value="">Chọn phòng</option>
                                                        {getRoomsBySpecialty(step.specialty_id).map((r) => (
                                                            <option key={r.room_id} value={r.room_id}>
                                                                {r.room_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">
                                                        Dịch vụ
                                                    </label>
                                                    <select
                                                        value={step.service_code}
                                                        onChange={(e) => {
                                                            handleUpdateDraftStep(step.tempId, {
                                                                service_code: e.target.value,
                                                            });
                                                        }}
                                                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white focus:border-[#8B7CF6] focus:outline-none"
                                                    >
                                                        {serviceOptions.map((service) => (
                                                            <option key={service.service_id || service.service_code} value={service.service_code}>
                                                                {service.service_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {step.room_id && (
                                                    <div className="col-span-2">
                                                        <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">
                                                            Bác sĩ đang trực của phòng
                                                        </label>
                                                        <div className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-[#F5F2FF] text-[#5B4ED6] flex items-center gap-2">
                                                            <UserCheck className="w-4 h-4 text-[#8B7CF6] shrink-0" />
                                                            <span>{step.doctor_name || getStaffOnDutyForRoom(step.room_id) || 'Chưa có bác sĩ'}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleRemoveDraftStep(step.tempId)}
                                            className="p-2 text-neutral-400 hover:text-red-500 hover:bg-neutral-50 rounded-xl transition-all cursor-pointer mt-1"
                                            title="Xóa bước nháp"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}

                            {draftSteps.length === 0 && (
                                <div className="p-8 text-center text-xs text-neutral-400 font-semibold">
                                    Không có bước khám nào. Hãy thêm bước mới ở dưới.
                                </div>
                            )}
                        </div>

                        {/* Add Step Section */}
                        <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4">
                            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                <Plus className="w-4 h-4 text-brand-500" />
                                Bổ sung bước khám nháp
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">Chuyên khoa</label>
                                    <select
                                        value={selectedSpecialtyId}
                                        onChange={(e) => handleSelectedSpecialtyChange(e.target.value)}
                                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white"
                                    >
                                        <option value="">Chọn chuyên khoa</option>
                                        {specialties.map((specialty) => (
                                            <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">Phòng khám</label>
                                    <select
                                        value={selectedRoomId}
                                        onChange={(e) => handleSelectedRoomChange(e.target.value)}
                                        disabled={!selectedSpecialtyId}
                                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white disabled:bg-neutral-50 disabled:text-neutral-400"
                                    >
                                        <option value="">Chọn phòng</option>
                                        {getRoomsBySpecialty(selectedSpecialtyId).map((r) => (
                                            <option key={r.room_id} value={r.room_id}>{r.room_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">Dịch vụ</label>
                                    <select
                                        value={selectedDraftServiceCode}
                                        onChange={(e) => setSelectedDraftServiceCode(e.target.value)}
                                        disabled={isLoadingServices || serviceOptions.length === 0}
                                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white disabled:bg-neutral-50 disabled:text-neutral-400"
                                    >
                                        {serviceOptions.map((service) => (
                                            <option key={service.service_id || service.service_code} value={service.service_code}>
                                                {service.service_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                            </div>
                            <button
                                onClick={() => {
                                    handleAddDraftStep(selectedSpecialtyId, selectedRoomId, selectedStaffId, selectedDraftServiceCode);
                                    setSelectedSpecialtyId('');
                                    setSelectedRoomId('');
                                    setSelectedStaffId('');
                                    setSelectedDraftServiceCode('');
                                }}
                                disabled={!selectedRoomId || !selectedDraftServiceCode}
                                className="w-full bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 text-neutral-700 font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-neutral-200"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm vào danh sách nháp
                            </button>
                        </div>

                        {/* Commit controls */}
                        <div className="pt-4 border-t border-neutral-100 flex gap-3">
                            <button
                                onClick={handleCommitDraft}
                                disabled={isAssigning || draftSteps.length === 0 || draftSteps.some(s => !s.room_id)}
                                className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isAssigning ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Đang tạo quy trình...
                                    </>
                                ) : (
                                    <>
                                        Chốt quy trình (Lưu)
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => setIsConfiguringDraft(false)}
                                className="px-5 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Template Selection Modal */}
            <Dialog open={isSelectingTemplate} onOpenChange={setIsSelectingTemplate}>
                <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle>Chọn Quy trình khám mẫu</DialogTitle>
                        <DialogDescription>
                            Chọn một trong các mẫu quy trình dưới đây để áp dụng cho phiên khám của bệnh nhân.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="my-6 grid grid-cols-1 gap-3">
                        {templates.map((tpl) => {
                            const tplId = tpl.template_id || tpl.id || '';
                            const name = getTemplateName(tpl) || `Mẫu quy trình (${tpl.steps?.length || 0} bước)`;
                            const isActive = tplId === activeTemplateId;

                            return (
                                <button
                                    key={tplId || name}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsSelectingTemplate(false);
                                        handleSelectTemplateDraft(tplId);
                                    }}
                                    className={cn(
                                        "w-full text-left p-4 rounded-2xl border text-sm transition-all duration-200 cursor-pointer flex flex-col justify-between hover:bg-neutral-50/50",
                                        isActive
                                            ? "border-[#8B7CF6] bg-[#F5F2FF]/40 shadow-sm"
                                            : "border-neutral-200 bg-white"
                                    )}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className="font-bold text-neutral-800 text-sm">
                                            {name}
                                        </span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5F2FF] text-[#8B7CF6] border border-[#E0DCFB]">
                                            {tpl.steps?.length || 0} bước
                                        </span>
                                    </div>
                                    {tpl.steps && tpl.steps.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5 items-center text-[10px] text-neutral-400 font-medium">
                                            {tpl.steps.map((s, idx) => (
                                                <div key={idx} className="flex items-center gap-1.5">
                                                    <span>{s.step_name || s.room_type}</span>
                                                    {idx < tpl.steps.length - 1 && <span className="text-neutral-300">→</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedStepNode} onOpenChange={(open) => !open && setSelectedStepNode(null)}>
                <DialogContent className="max-w-lg" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle>Chi tiết bước quy trình</DialogTitle>
                        <DialogDescription>
                            Thông tin chi tiết của bước bạn vừa chọn.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedStepNode && (
                        <div className="space-y-3 text-sm">
                            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
                                <p className="text-xs text-neutral-500 font-semibold">Tên bước</p>
                                <p className="font-bold text-neutral-800 mt-0.5">{selectedStepNode.label}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-neutral-200 p-2.5">
                                    <p className="text-[11px] text-neutral-500 font-semibold">Trạng thái</p>
                                    <p className="font-semibold text-neutral-800">{selectedStepNode.detail?.stepStatus || 'N/A'}</p>
                                </div>
                                <div className="rounded-lg border border-neutral-200 p-2.5">
                                    <p className="text-[11px] text-neutral-500 font-semibold">Phòng</p>
                                    <p className="font-semibold text-neutral-800">{selectedStepNode.roomName || selectedStepNode.detail?.roomId || 'N/A'}</p>
                                </div>
                                <div className="rounded-lg border border-neutral-200 p-2.5">
                                    <p className="text-[11px] text-neutral-500 font-semibold">Bác sĩ / Nhân viên</p>
                                    <p className="font-semibold text-neutral-800">{selectedStepNode.staffName || selectedStepNode.detail?.staffId || 'N/A'}</p>
                                </div>
                                <div className="rounded-lg border border-neutral-200 p-2.5">
                                    <p className="text-[11px] text-neutral-500 font-semibold">Payment status</p>
                                    <p className="font-semibold text-neutral-800">{selectedStepNode.detail?.paymentStatus || 'N/A'}</p>
                                </div>
                                <div className="rounded-lg border border-neutral-200 p-2.5">
                                    <p className="text-[11px] text-neutral-500 font-semibold">Specialty</p>
                                    <p className="font-semibold text-neutral-800">{selectedStepNode.detail?.specialtyName || selectedStepNode.detail?.specialtyId || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
