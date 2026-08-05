import fetch from 'node-fetch';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://triageflow.me';

async function main() {
    // Check if we can login as admin or receptionist or doctor
    const logins = [
        { email: 'admin@triageflow.me', password: 'Password123@' },
        { email: 'admin@hospital.vn', password: 'AdminPassword123@' },
        { email: 'pharmacist@triageflow.me', password: 'Password123@' },
        { email: 'doctor@hospital.vn', password: 'Password123@' }
    ];

    for (const item of logins) {
        console.log(`Trying ${item.email}...`);
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        const data = await res.json();
        console.log(`Res (${res.status}):`, JSON.stringify(data));
    }
}

main();
