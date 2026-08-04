import fetch from 'node-fetch';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://triageflow.me';

function getPostLoginPath(role) {
    if (!role) return '/doctor/dashboard';
    const normalizedRole = role.trim().toUpperCase().replace(/^ROLE_/, '');
    switch (normalizedRole) {
        case 'ADMIN':
            return '/admin/dashboard';
        case 'RECEPTIONIST':
            return '/reception';
        case 'LAB_STAFF':
        case 'LAB_TECHNICIAN':
            return '/lab';
        case 'PHARMACY_STAFF':
        case 'PHARMACIST':
        case 'PHARMACY':
            return '/pharmacy';
        case 'CASHIER':
            return '/cashier';
        case 'USER':
            return '/queue';
        case 'NURSE':
        case 'DOCTOR':
            return '/doctor/dashboard';
        default:
            return '/doctor/dashboard';
    }
}

async function testAccount(email, password) {
    console.log(`\n========================================`);
    console.log(`Testing Account: ${email}`);
    console.log(`========================================`);

    try {
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const loginData = await loginRes.json();
        console.log(`HTTP Status:`, loginRes.status);
        console.log(`Login Response:`, JSON.stringify(loginData, null, 2));

        if (!loginRes.ok) {
            console.log(`❌ Login failed!`);
            return;
        }

        const token = loginData?.data?.token || loginData?.token;
        const loginRole = loginData?.data?.role || loginData?.role;

        console.log(`Login Role returned: "${loginRole}"`);

        // Check getProfile
        let profileRole = loginRole;
        if (token) {
            try {
                const profileRes = await fetch(`${BASE_URL}/api/users/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const profileData = await profileRes.json();
                console.log(`Profile Response:`, JSON.stringify(profileData, null, 2));

                if (profileData?.data?.role) {
                    profileRole = profileData.data.role;
                }
            } catch (err) {
                console.error(`Error fetching profile:`, err.message);
            }
        }

        console.log(`Final Resolved Role: "${profileRole}"`);
        console.log(`🎯 Post-login Redirect Path: -> ${getPostLoginPath(profileRole)}`);

    } catch (e) {
        console.error(`Exception during test:`, e);
    }
}

async function main() {
    const testAccounts = [
        { email: 'pharmacist@hospital.vn', password: 'Password123@' },
        { email: 'pharmacy@hospital.vn', password: 'Password123@' },
        { email: 'duocsi@hospital.vn', password: 'Password123@' },
        { email: 'admin@hospital.vn', password: 'Password123@' },
        { email: 'receptionist@hospital.vn', password: 'Password123@' },
    ];

    for (const acc of testAccounts) {
        await testAccount(acc.email, acc.password);
    }
}

main();
