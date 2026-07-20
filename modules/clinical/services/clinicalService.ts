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
            steps?: {
                queues?: {
                    queue_number: string;
                }[];
            }[];
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
                    full_name?: string;
                    dob?: string;
                    gender?: string;
                    citizen_id?: string;
                    account: {
                        user_name?: string;
                        email?: string;
                        role?: string;
                        gender?: string;
                        phone?: string | null;
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
    const patientObj = booking.patient;

    // Extract queue_number safely
    let qNum = item.queue_number;
    if (!qNum && item.step?.flow?.steps) {
        for (const s of item.step.flow.steps) {
            if (s.queues && s.queues.length > 0 && s.queues[0].queue_number) {
                qNum = s.queues[0].queue_number;
                break;
            }
        }
    }

    return {
        id: item.queue_id,   // use queue_id for routing to /api/doctor/patients/queue/{id}
        stt: String(qNum || '').padStart(2, '0'),
        name: patientObj.full_name || patientObj.account.user_name || `Bệnh nhân ${patientObj.patient_id.slice(0, 6)}`,
        age: calculateAge(patientObj.dob),
        gender: mapGender(patientObj.gender),
        code: patientObj.citizen_id || `BN-${patientObj.patient_id.slice(0, 8)}`,
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
            hasInsurance: !!patientObj.medical_coverage_id,
            coverage: patientObj.medical_coverage_id ? '80%' : '0%'
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

