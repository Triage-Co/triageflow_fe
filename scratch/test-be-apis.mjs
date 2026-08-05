import fetch from 'node-fetch';

const BASE_URL = 'https://www.triageflow.me';

async function testEndpoints() {
    console.log('=== TESTING TRIAGEFLOW BACKEND APIS ===');

    // 1. Test Staff Login with email
    let staffToken = '';
    try {
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'receptionist@hospital.vn',
                password: 'Password123@',
            }),
        });
        const loginData = await loginRes.json();
        console.log('1. POST /api/auth/login Status:', loginRes.status, 'Response:', loginData);
        staffToken = loginData?.data?.token || loginData?.token || '';
    } catch (err) {
        console.error('1. POST /api/auth/login Error:', err.message);
    }

    // 2. Test GET /api/patient
    if (staffToken) {
        try {
            const patientRes = await fetch(`${BASE_URL}/api/patient`, {
                headers: { Authorization: `Bearer ${staffToken}` },
            });
            const patientData = await patientRes.json();
            console.log('2. GET /api/patient Status:', patientRes.status, 'Count:', Array.isArray(patientData?.data) ? patientData.data.length : 'N/A');
        } catch (err) {
            console.error('2. GET /api/patient Error:', err.message);
        }
    }

    // 3. Test GET /api/shift
    if (staffToken) {
        try {
            const shiftRes = await fetch(`${BASE_URL}/api/shift`, {
                headers: { Authorization: `Bearer ${staffToken}` },
            });
            const shiftData = await shiftRes.json();
            console.log('3. GET /api/shift Status:', shiftRes.status, 'Sample:', JSON.stringify(shiftData).slice(0, 200));
        } catch (err) {
            console.error('3. GET /api/shift Error:', err.message);
        }
    }
}

testEndpoints();
