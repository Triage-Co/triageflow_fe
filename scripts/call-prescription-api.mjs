/**
 * Script gọi API trực tiếp tới TriageFlow Backend (https://triageflow.me)
 * Cách chạy:
 *   node scripts/call-prescription-api.mjs
 * Hoặc truyền tài khoản đã có:
 *   EMAIL=your_email@hospital.vn PASSWORD=your_password node scripts/call-prescription-api.mjs
 */

const API_BASE = process.env.API_BASE_URL || 'https://triageflow.me';

const MEDICINE_DATA = [
    {
        medicine_code: `MED-PAR-${Math.floor(100 + Math.random() * 900)}`,
        medicine_name: 'Paracetamol 500mg',
        active_ingredient: 'Paracetamol',
        unit: 'Viên',
        usage_route: 'Uống',
        unit_price: 5000,
        manufacturer: 'Dược Hậu Giang',
        description: 'Giảm đau nhẹ đến vừa, hạ sốt nhanh chóng'
    },
    {
        medicine_code: `MED-NEX-${Math.floor(100 + Math.random() * 900)}`,
        medicine_name: 'Nexium Mups 40mg',
        active_ingredient: 'Esomeprazol',
        unit: 'Viên',
        usage_route: 'Uống',
        unit_price: 18500,
        manufacturer: 'AstraZeneca',
        description: 'Điều trị trào ngược dạ dày thực quản, viêm loét dạ dày'
    },
    {
        medicine_code: `MED-GAV-${Math.floor(100 + Math.random() * 900)}`,
        medicine_name: 'Gaviscon Dual Action (10ml)',
        active_ingredient: 'Sodium alginate',
        unit: 'Gói',
        usage_route: 'Uống',
        unit_price: 12000,
        manufacturer: 'Reckitt Benckiser',
        description: 'Giảm ợ nóng, ợ chua, trào ngược axit dạ dày'
    }
];

async function main() {
    console.log(`=== GỌI API BACKEND TRIAGEFLOW (${API_BASE}) ===\n`);

    let token = process.env.TOKEN || '';
    const email = process.env.EMAIL;
    const password = process.env.PASSWORD;

    // 1. Thử đăng nhập nếu có EMAIL & PASSWORD
    if (!token && email && password) {
        console.log(`Đang đăng nhập với email: ${email}...`);
        try {
            const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const loginData = await loginRes.json();
            if (loginRes.ok) {
                token = loginData?.data?.token || loginData?.token || '';
                console.log('✓ Đăng nhập thành công! Token đã sẵn sàng.\n');
            } else {
                console.log('✕ Đăng nhập thất bại:', loginData.message || loginRes.status);
            }
        } catch (e) {
            console.error('Lỗi khi gọi API đăng nhập:', e.message);
        }
    }

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    // 2. Thử lấy danh sách thuốc hiện có
    console.log('1. Gọi API GET /api/medicine...');
    try {
        const getMedRes = await fetch(`${API_BASE}/api/medicine`, { headers });
        const getMedData = await getMedRes.json();
        console.log(`- Status: ${getMedRes.status}`);
        const items = Array.isArray(getMedData) ? getMedData : getMedData?.data?.items || getMedData?.data || [];
        console.log(`- Tìm thấy ${items.length} thuốc trên hệ thống.\n`);
    } catch (e) {
        console.error('- Lỗi khi gọi GET /api/medicine:', e.message);
    }

    // 3. Thử tạo thuốc mới
    console.log('2. Gọi API POST /api/medicine (Tạo thuốc mới)...');
    for (const med of MEDICINE_DATA) {
        try {
            const createRes = await fetch(`${API_BASE}/api/medicine`, {
                method: 'POST',
                headers,
                body: JSON.stringify(med)
            });
            const createData = await createRes.json();
            console.log(`- Code: ${med.medicine_code} -> Status ${createRes.status}:`, createData.message || (createRes.ok ? 'Thành công' : JSON.stringify(createData)));
        } catch (e) {
            console.error(`- Lỗi POST /api/medicine (${med.medicine_code}):`, e.message);
        }
    }

    // 4. Thử lấy danh sách đơn thuốc
    console.log('\n3. Gọi API GET /api/prescription...');
    try {
        const getRxRes = await fetch(`${API_BASE}/api/prescription`, { headers });
        const getRxData = await getRxRes.json();
        console.log(`- Status: ${getRxRes.status}`);
        const rxItems = Array.isArray(getRxData) ? getRxData : getRxData?.data?.items || getRxData?.data || [];
        console.log(`- Tìm thấy ${rxItems.length} đơn thuốc trên hệ thống.\n`);
    } catch (e) {
        console.error('- Lỗi khi gọi GET /api/prescription:', e.message);
    }

    console.log('=== KẾT THÚC THỰC THI GỌI API ===');
}

main();
