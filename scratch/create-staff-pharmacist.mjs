const BASE_URL = process.env.API_BASE_URL || 'https://triageflow.me';

async function main() {
    console.log('=== ATTEMPTING TO CREATE PHARMACY_STAFF ACCOUNT ===');

    // 1. Try logging in with potential pre-existing accounts
    const testAccounts = [
        { email: 'admin@hospital.vn', password: 'Password123@' },
        { email: 'receptionist@hospital.vn', password: 'Password123@' },
        { email: 'pharmacist@hospital.vn', password: 'Password123@' },
        { email: 'pharmacy@hospital.vn', password: 'Password123@' }
    ];

    let token = '';
    for (const acc of testAccounts) {
        try {
            console.log(`Trying login with ${acc.email}...`);
            const res = await fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(acc)
            });
            const data = await res.json();
            if (res.ok) {
                console.log(`SUCCESS! Logged in as ${acc.email}, role: ${data?.data?.role || data?.role}`);
                token = data?.data?.token || data?.token || '';
                if (data?.data?.role === 'PHARMACY_STAFF' || data?.data?.role === 'PHARMACIST') {
                    console.log('Valid Pharmacist Account already exists!');
                    console.log('Credentials:', acc);
                    return;
                }
                break;
            } else {
                console.log(`Login failed for ${acc.email}:`, data.message);
            }
        } catch (e) {
            console.log(`Error testing ${acc.email}:`, e.message);
        }
    }

    // 2. If token found, call POST /api/staff to create PHARMACY_STAFF
    if (token) {
        console.log('\nUsing token to create new PHARMACY_STAFF via POST /api/staff...');
        const newPharmacist = {
            user_name: 'Dược sĩ Nguyễn Văn A',
            full_name: 'Dược sĩ Nguyễn Văn A',
            email: `duocsi_${Date.now().toString().slice(-4)}@hospital.vn`,
            password: 'Password123@',
            role: 'PHARMACY_STAFF',
            gender: 'MALE',
            phone: '0988776655'
        };

        try {
            const createRes = await fetch(`${BASE_URL}/api/staff`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newPharmacist)
            });
            const createData = await createRes.json();
            console.log('Create Staff Status:', createRes.status);
            console.log('Create Staff Result:', JSON.stringify(createData, null, 2));

            if (createRes.ok) {
                console.log('\n=== CREATED NEW PHARMACIST ACCOUNT SUCCESS ===');
                console.log(`Email: ${newPharmacist.email}`);
                console.log(`Password: ${newPharmacist.password}`);
            }
        } catch (err) {
            console.error('Failed to call POST /api/staff:', err);
        }
    }
}

main();
