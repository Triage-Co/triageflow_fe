/**
 * Tạo ca trực (shift) + khung giờ cho bác sĩ trên TriageFlow BE.
 *
 * Cách chạy:
 *   node scripts/seed-doctor-slots.mjs
 *   RECEPTION_EMAIL=... RECEPTION_PASSWORD=... node scripts/seed-doctor-slots.mjs
 *
 * Tuỳ chọn:
 *   DOCTOR_ID=53b75105-e615-461e-8df5-bf1d4cb5aaa7   # BS Trung trên triageflow.me
 *   SHIFT_DATE=2026-07-11
 *   ROOM_ID=8766c11a-3bc9-477c-9f97-f1e3a1a80fa8
 */

const API_BASE = process.env.API_BASE_URL || 'https://www.triageflow.me';
/** BS Trung — id 70298ee7-... không tồn tại trên BE hiện tại */
const DOCTOR_ID = process.env.DOCTOR_ID || '53b75105-e615-461e-8df5-bf1d4cb5aaa7';
const SHIFT_DATE =
    process.env.SHIFT_DATE ||
    (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 10);
    })();
const ROOM_ID = process.env.ROOM_ID || '8766c11a-3bc9-477c-9f97-f1e3a1a80fa8';

const DEFAULT_SLOTS = [
    { start_time: '08:00', end_time: '08:30' },
    { start_time: '08:30', end_time: '09:00' },
    { start_time: '09:00', end_time: '09:30' },
    { start_time: '09:30', end_time: '10:00' },
    { start_time: '10:00', end_time: '10:30' },
    { start_time: '10:30', end_time: '11:00' },
    { start_time: '13:30', end_time: '14:00' },
    { start_time: '14:00', end_time: '14:30' },
    { start_time: '14:30', end_time: '15:00' },
    { start_time: '15:00', end_time: '15:30' },
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
        throw new Error(`Login failed: ${extractMessage(json, 'login error')}`);
    }
    return json?.data?.token ?? null;
}

function unwrapList(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object' && Array.isArray(raw.data)) return raw.data;
    return [];
}

async function getRooms() {
    const { ok, json } = await request('/api/room');
    if (!ok) return [];
    return unwrapList(json?.data ?? json);
}

async function verifyDoctor(doctorId) {
    const { status, json } = await request(`/api/doctor/${doctorId}`);
    if (status >= 400) {
        throw new Error(
            `Không tìm thấy bác sĩ ${doctorId} trên BE. ` +
                `BS Trung hiện tại: staff_id=53b75105-e615-461e-8df5-bf1d4cb5aaa7`,
        );
    }
    const account = json?.data?.account;
    console.log(`✓ Bác sĩ: ${account?.user_name ?? doctorId} (${account?.email ?? '—'})`);
}

async function getExistingSlots(doctorId, date) {
    const { status, json } = await request(`/api/doctor/${doctorId}/slot?date=${date}`);
    if (status === 404) return [];
    if (status >= 400) {
        console.warn(`Không đọc được slot hiện có: ${extractMessage(json, `HTTP ${status}`)}`);
        return [];
    }
    const data = json?.data ?? json;
    if (Array.isArray(data?.existedSlot)) return data.existedSlot;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.slots)) return data.slots;
    return [];
}

async function createShift(token, payload) {
    const { ok, status, json } = await request('/api/shift', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
    });
    if (!ok) {
        throw new Error(extractMessage(json, `Tạo shift thất bại (HTTP ${status})`));
    }
    return json?.data ?? json;
}

async function main() {
    console.log(`API: ${API_BASE}`);
    console.log(`Doctor: ${DOCTOR_ID}`);
    console.log(`Date: ${SHIFT_DATE}`);
    console.log('');

    const token = process.env.RECEPTION_TOKEN || (await loginReception());
    if (!token) {
        console.error(
            'Thiếu token. Chạy với:\n' +
                '  RECEPTION_EMAIL=... RECEPTION_PASSWORD=... node scripts/seed-doctor-slots.mjs\n' +
                'hoặc RECEPTION_TOKEN=... node scripts/seed-doctor-slots.mjs',
        );
        process.exit(1);
    }

    await verifyDoctor(DOCTOR_ID);

    const rooms = await getRooms();
    const roomId = ROOM_ID || rooms[0]?.room_id;
    if (!roomId) {
        throw new Error('Không tìm thấy room_id. Truyền ROOM_ID=... hoặc tạo phòng trước.');
    }

    const existing = await getExistingSlots(DOCTOR_ID, SHIFT_DATE);
    if (existing.length > 0) {
        console.log(`Đã có ${existing.length} khung giờ cho ngày ${SHIFT_DATE}:`);
        for (const slot of existing) {
            const id = slot.slot_id ?? slot.id;
            console.log(`  - ${slot.start_time}–${slot.end_time} (${id})`);
        }
        return;
    }

    const first = DEFAULT_SLOTS[0];
    const last = DEFAULT_SLOTS[DEFAULT_SLOTS.length - 1];
    const shiftPayload = {
        staff_id: DOCTOR_ID,
        room_id: roomId,
        date: `${SHIFT_DATE}T00:00:00.000Z`,
        start_time: first.start_time,
        end_time: last.end_time,
    };

    console.log('Tạo ca trực:', shiftPayload);
    const created = await createShift(token, shiftPayload);
    console.log('✓ Shift created:', created?.shift_id ?? created);

    const slots = await getExistingSlots(DOCTOR_ID, SHIFT_DATE);
    if (slots.length === 0) {
        console.log('\nShift đã tạo nhưng API chưa trả slot. Kiểm tra lại trên Swagger hoặc FE.');
        return;
    }

    console.log(`\n✓ Có ${slots.length} khung giờ cho ${SHIFT_DATE}:`);
    for (const slot of slots) {
        const id = slot.slot_id ?? slot.id;
        console.log(`  - ${String(slot.start_time).slice(0, 5)}–${String(slot.end_time).slice(0, 5)} | slot_id: ${id}`);
    }
}

main().catch((err) => {
    console.error('Lỗi:', err.message);
    process.exit(1);
});
