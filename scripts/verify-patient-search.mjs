/**
 * Kiểm tra logic parse + search (không gọi API, không in dữ liệu nhạy cảm).
 * Chạy: node scripts/verify-patient-search.mjs
 */

function unwrapListPayload(raw, depth = 0) {
    if (depth > 4) return [];
    if (Array.isArray(raw)) return raw;
    if (!raw || typeof raw !== 'object') return [];
    const obj = raw;
    for (const key of ['items', 'patients', 'bookings', 'content', 'results', 'records', 'list']) {
        if (Array.isArray(obj[key])) return obj[key];
    }
    if (obj.data != null) {
        const nested = unwrapListPayload(obj.data, depth + 1);
        if (nested.length > 0) return nested;
    }
    return [];
}

function mapPatient(record) {
    const nested = record.account ?? record.Account ?? record.user;
    return {
        patient_id: record.patient_id,
        full_name: nested?.full_name ?? nested?.user_name ?? record.full_name ?? '',
        citizen_id: nested?.citizen_id ?? record.citizen_id ?? '',
    };
}

function stripDiacritics(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase();
}

function matchesQuery(result, rawQuery) {
    const q = rawQuery.trim().toLowerCase();
    const qPlain = stripDiacritics(q);
    const namePlain = stripDiacritics(result.full_name);
    const qDigits = q.replace(/\D/g, '');
    const citizenDigits = (result.citizen_id ?? '').replace(/\D/g, '');
    return (
        result.full_name.toLowerCase().includes(q) ||
        namePlain.includes(qPlain) ||
        result.citizen_id.includes(q) ||
        (qDigits.length > 0 && citizenDigits.includes(qDigits))
    );
}

const wrappedPatients = {
    data: {
        items: [
            {
                patient_id: 'p-001',
                citizen_id: '026203007904',
                full_name: 'Nguyễn Văn A',
            },
            {
                patient_id: 'p-002',
                account: { full_name: 'Trần Thị B', citizen_id: '079012345601' },
            },
        ],
    },
};

const patients = unwrapListPayload(wrappedPatients).map(mapPatient);
const queries = ['026203007904', '079012345601', 'nguyen van', 'Tran Thi'];

let passed = 0;
for (const query of queries) {
    const hits = patients.filter((p) => matchesQuery(p, query));
    const ok = hits.length > 0;
    console.log(`${ok ? 'OK' : 'FAIL'} query="${query}" -> ${hits.length} hit(s)`);
    if (ok) passed++;
}

const bookingWrapped = {
    data: [
        {
            step: {
                flow: {
                    booking: {
                        patient: {
                            patient_id: 'p-003',
                            account: { full_name: 'Lê Văn C', citizen_id: '079012345602' },
                        },
                    },
                },
            },
        },
    ],
};

const bookings = unwrapListPayload(bookingWrapped);
const bookingPatient = bookings[0]?.step?.flow?.booking?.patient;
const bookingOk =
    bookingPatient?.account?.citizen_id === '079012345602' &&
    matchesQuery(
        {
            full_name: bookingPatient.account.full_name,
            citizen_id: bookingPatient.account.citizen_id,
        },
        '079012345602',
    );
console.log(`${bookingOk ? 'OK' : 'FAIL'} nested booking patient extract`);
if (bookingOk) passed++;

console.log(`\n${passed}/${queries.length + 1} checks passed`);
process.exit(passed === queries.length + 1 ? 0 : 1);
