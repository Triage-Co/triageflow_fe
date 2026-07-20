/**
 * Seed 3 bệnh nhân vào TriageFlow BE.
 *
 * Cách chạy:
 *   node scripts/seed-patients.mjs
 *   RECEPTION_EMAIL=... RECEPTION_PASSWORD=... node scripts/seed-patients.mjs
 */

const API_BASE = process.env.API_BASE_URL || 'https://www.triageflow.me';

const PATIENTS = [
    {
        full_name: 'Nguyễn Thị Hoa',
        user_name: 'nguyenthihoa',
        email: 'bn.nguyenthihoa.001@patient.triageflow.me',
        citizen_id: '079012345601',
        dob: '1990-05-15',
        gender: 'FEMALE',
        phone: '0901234561',
        bhyt: 'DN1234567890123',
        password: 'Patient@5601',
    },
    {
        full_name: 'Lê Văn Tuấn',
        user_name: 'levantuan',
        email: 'bn.levantuan.002@patient.triageflow.me',
        citizen_id: '079012345602',
        dob: '1985-11-20',
        gender: 'MALE',
        phone: '0901234562',
        bhyt: 'DN1234567890124',
        password: 'Patient@5602',
    },
    {
        full_name: 'Trần Thị Mai',
        user_name: 'tranthimai',
        email: 'bn.tranthimai.003@patient.triageflow.me',
        citizen_id: '079012345603',
        dob: '1978-03-08',
        gender: 'FEMALE',
        phone: '0901234563',
        bhyt: 'DN1234567890125',
        password: 'Patient@5603',
    },
];

async function request(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
}

function extractMessage(json, fallback) {
    const detail = json?.detail;
    const nested = detail?.response?.message || detail?.message || json?.message;
    return nested || fallback;
}

async function loginReception() {
    const email = process.env.RECEPTION_EMAIL;
    const password = process.env.RECEPTION_PASSWORD;
    if (!email || !password) return null;

    const { ok, json } = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    if (!ok) {
        console.warn(
            `Không đăng nhập được lễ tân (${email}): ${extractMessage(json, 'login error')}`,
        );
        return null;
    }
    return json?.data?.token ?? null;
}

async function registerAccount(patient) {
    const { ok, status, json } = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            user_name: patient.user_name,
            email: patient.email,
            password: patient.password,
            gender: patient.gender,
            phone: patient.phone,
        }),
    });

    if (ok) {
        return { status: 'created', accountId: json?.data?.id ?? json?.data?.account_id };
    }

    const msg = extractMessage(json, '').toLowerCase();
    if (status === 409 || msg.includes('exist') || msg.includes('tồn tại') || msg.includes('ton tai')) {
        return { status: 'exists' };
    }

    throw new Error(`Register ${patient.full_name}: ${extractMessage(json, `HTTP ${status}`)}`);
}

async function createPatientProfile(patient, token) {
    const { ok, status, json } = await request('/api/patient', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            citizen_id: patient.citizen_id,
            full_name: patient.full_name,
            dob: patient.dob,
            gender: patient.gender,
            medical_coverage_id: patient.bhyt,
        }),
    });

    if (ok) return { status: 'created' };

    const msg = extractMessage(json, '').toLowerCase();
    if (status === 409 || msg.includes('exist') || msg.includes('tồn tại') || msg.includes('ton tai')) {
        return { status: 'exists' };
    }

    throw new Error(`Patient ${patient.full_name}: ${extractMessage(json, `HTTP ${status}`)}`);
}

async function main() {
    console.log(`API: ${API_BASE}\n`);

    let token = process.env.RECEPTION_TOKEN || (await loginReception());

    if (!token) {
        console.log(
            'Chưa có token lễ tân — chỉ tạo tài khoản (auth/register).\n' +
                'Để tạo hồ sơ /api/patient, chạy lại với:\n' +
                '  RECEPTION_EMAIL=... RECEPTION_PASSWORD=... node scripts/seed-patients.mjs\n',
        );
    }

    const results = [];

    for (const patient of PATIENTS) {
        const account = await registerAccount(patient);
        let profile = { status: 'skipped' };

        if (token) {
            profile = await createPatientProfile(patient, token);
        }

        results.push({
            name: patient.full_name,
            citizen_id: patient.citizen_id,
            email: patient.email,
            account,
            profile,
        });

        console.log(
            `✓ ${patient.full_name} | CCCD ${patient.citizen_id} | account: ${account.status} | patient: ${profile.status}`,
        );
    }

    console.log('\n--- Tóm tắt ---');
    for (const r of results) {
        console.log(`${r.name} — ${r.citizen_id} — ${r.email}`);
    }
}

main().catch((err) => {
    console.error('Lỗi:', err.message);
    process.exit(1);
});
