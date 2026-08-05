import fetch from 'node-fetch';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://triageflow.me';

async function main() {
    const email = `pharmacy_test_${Date.now().toString().slice(-4)}@hospital.vn`;
    const password = 'Password123@';

    console.log(`1. Registering account ${email}...`);
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_name: 'test_pharmacist',
            full_name: 'Dược sĩ Thử Nghiệm',
            email,
            password,
            gender: 'MALE',
            phone: '0901234567'
        })
    });
    const regData = await regRes.json();
    console.log('Register Response:', JSON.stringify(regData, null, 2));

    console.log('\n2. Sending OTP to email...');
    const otpRes = await fetch(`${BASE_URL}/api/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    console.log('OTP Send Response:', await otpRes.text());
}

main();
