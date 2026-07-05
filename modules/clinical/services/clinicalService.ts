import type {
    Patient,
} from '@/modules/clinical/types/clinical.types';


// ── API Services & DTOs ──────────────────────────────────────────────────────
import { apiClient } from '@/shared/services/apiClient';

export interface BackendQueuePatient {
    queue_id: string;
    queue_number: string;
    status: string;
    step: {
        step_id: string;
        next_step_id: string | null;
        step_status: string;
        docNo: number;
        payment_status: string;
        flow: {
            flow_id: string;
            status: string;
            booking: {
                booking_id: string;
                status: string;
                slot: {
                    slot_id: string;
                    start_time: string;
                    end_time: string;
                    shift: {
                        date: string;
                    };
                };
                patient: {
                    patient_id: string;
                    medical_coverage_id: string | null;
                    account: {
                        full_name: string;
                        citizen_id: string;
                        email: string;
                        dob: string;
                        gender: string;
                        role: string;
                        phone: string | null;
                    };
                };
            };
        };
    };
}

export function mapBackendPatientToFrontend(item: BackendQueuePatient): Patient {
    const calculateAge = (dobString?: string) => {
        if (!dobString) return 30;
        try {
            const birthDate = new Date(dobString);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return isNaN(age) ? 30 : age;
        } catch {
            return 30;
        }
    };

    const mapGender = (g?: string): 'Nam' | 'Nữ' => {
        if (g === 'FEMALE') return 'Nữ';
        return 'Nam';
    };

    const mapStatus = (status: string, stepStatus?: string): 'Đang chờ' | 'Đang khám' | 'Đã khám' => {
        if (status === 'COMPLETED' || stepStatus === 'COMPLETED') {
            return 'Đã khám';
        }
        if (stepStatus === 'PROCESSING' || stepStatus === 'IN_PROGRESS' || stepStatus === 'ONGOING') {
            return 'Đang khám';
        }
        return 'Đang chờ';
    };

    const booking = item.step.flow.booking;
    const account = booking.patient.account;

    return {
        id: item.queue_id,   // use queue_id for routing to /api/doctor/patients/queue/{id}
        stt: String(item.queue_number).padStart(2, '0'),
        name: account.full_name,
        age: calculateAge(account.dob),
        gender: mapGender(account.gender),
        code: account.citizen_id || `BN-${booking.patient.patient_id.slice(0, 8)}`,
        priority: 'Bình thường',
        time: booking.slot.start_time,
        status: mapStatus(item.status, item.step.step_status),
        visitReason: 'Khám bệnh lâm sàng',
        allergies: [],
        medicalHistory: [],
        vitals: {
            heartRate: 80,
            bloodPressure: '120/80',
            temperature: 37.0,
            spO2: 98
        },
        insurance: {
            hasInsurance: !!booking.patient.medical_coverage_id,
            coverage: booking.patient.medical_coverage_id ? '80%' : '0%'
        },
        visitType: 'Khám mới',
        medicalRecord: {
            visitReason: 'Khám bệnh lâm sàng',
            clinicalProgression: '',
            medicalHistory: [],
            physicalExam: {
                throat: 'Bình thường',
                lungs: 'Rõ, không ran',
                heart: 'Đều, T1 T2 rõ',
                abdomen: 'Mềm, không đau'
            }
        }
    };
}

export const clinicalService = {
    getPatients: (date: string, token: string) =>
        apiClient.get<BackendQueuePatient[]>(`/api/doctor/patients?date=${date}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getPatientByQueueId: (queueId: string, token: string) =>
        apiClient.get<BackendQueuePatient>(`/api/doctor/patients/queue/${queueId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),
};

