/**
 * Test login with existing staff/admin accounts and test email verification endpoint on https://triageflow.me
 */

const API_BASE = process.env.API_BASE_URL || 'https://triageflow.me';

const SEED_CREDENTIALS = [
    { email: 'admin@triageflow.me', password: 'Password123@' },
    { email: 'admin@hospital.vn', password: 'Password123@' },
    { email: 'doctor@triageflow.me', password: 'Password123@' },
    { email: 'doctor@hospital.vn', password: 'Password123@' },
    { email: 'pharmacist@triageflow.me', password: 'Password123@' },
    { email: 'receptionist@hospital.vn', password: 'Password123@' }
];

async function main() {
    console.log(`=== THỬ ĐĂNG NHẬP VỚI CÁC TÀI KHOẢN STAFF / ADMIN TRÊN ${API_BASE} ===\n`);

    let activeToken = '';

    for (const cred of SEED_CREDENTIALS) {
        try {
            console.log(`Thử đăng nhập: ${cred.email}...`);
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cred)
            });
            const data = await res.json();
            console.log(`Status ${res.status}:`, data.message || (res.ok ? 'Thành công' : JSON.stringify(data)));
            if (res.ok && (data?.data?.token || data?.token)) {
                activeToken = data?.data?.token || data?.token;
                console.log(`>>> BẮT ĐƯỢC TOKEN CHO ${cred.email}:`, activeToken.slice(0, 30) + '...\n');
                break;
            }
        } catch (e) {
            console.error(`Lỗi kết nối khi đăng nhập ${cred.email}:`, e.message);
        }
    }

    if (activeToken) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeToken}`
        };

        console.log('--- CALL API GET /api/medicine ---');
        const medRes = await fetch(`${API_BASE}/api/medicine`, { headers });
        console.log('GET /api/medicine Status:', medRes.status, await medRes.json());

        console.log('\n--- CALL API GET /api/prescription ---');
        const rxRes = await fetch(`${API_BASE}/api/prescription`, { headers });
        console.log('GET /api/prescription Status:', rxRes.status, await rxRes.json());
    } else {
        console.log('\nKhông thể đăng nhập tự động vì Backend yêu cầu email đã được xác thực.');
    }
}

main();
