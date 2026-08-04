const BASE_URL = process.env.API_BASE_URL || 'https://triageflow.me';

async function createPharmacistAccount() {
    console.log(`=== CREATING PHARMACIST ACCOUNT ON ${BASE_URL} ===`);

    const username = `pharmacist_${Date.now().toString().slice(-4)}`;
    const email = `pharmacist_${Date.now().toString().slice(-4)}@hospital.vn`;
    const password = 'Password123@';

    console.log(`Attempting register with:
    Username: ${username}
    Email: ${email}
    Password: ${password}`);

    try {
        // 1. Register Auth Account
        const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_name: username,
                email: email,
                password: password,
                gender: 'MALE',
                phone: '0912345678',
                role: 'PHARMACIST'
            })
        });

        const regData = await regRes.json();
        console.log('1. Register response status:', regRes.status);
        console.log('Register Response body:', JSON.stringify(regData, null, 2));

        // 2. Login to test credentials and check returned role
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const loginData = await loginRes.json();
        console.log('2. Login response status:', loginRes.status);
        console.log('Login Response body:', JSON.stringify(loginData, null, 2));

    } catch (err) {
        console.error('Error creating pharmacist account:', err);
    }
}

createPharmacistAccount();
