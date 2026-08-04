const BASE_URL = process.env.API_BASE_URL || 'https://triageflow.me';

const SAMPLE_MEDICINES = [
    {
        medicine_code: 'MED-PAR-500',
        medicine_name: 'Paracetamol 500mg',
        active_ingredient: 'Paracetamol',
        unit: 'Viên',
        usage_route: 'Uống',
        unit_price: 5000,
        manufacturer: 'Dược Hậu Giang',
        description: 'Giảm đau nhẹ đến vừa, hạ sốt nhanh chóng'
    },
    {
        medicine_code: 'MED-NEX-40',
        medicine_name: 'Nexium Mups 40mg',
        active_ingredient: 'Esomeprazol',
        unit: 'Viên',
        usage_route: 'Uống',
        unit_price: 18500,
        manufacturer: 'AstraZeneca',
        description: 'Điều trị trào ngược dạ dày thực quản, viêm loét dạ dày'
    },
    {
        medicine_code: 'MED-GAV-10',
        medicine_name: 'Gaviscon Dual Action (10ml)',
        active_ingredient: 'Sodium alginate + Sodium bicarbonate',
        unit: 'Gói',
        usage_route: 'Uống',
        unit_price: 12000,
        manufacturer: 'Reckitt Benckiser',
        description: 'Giảm ợ nóng, ợ chua, trào ngược axit dạ dày'
    },
    {
        medicine_code: 'MED-PHO-20',
        medicine_name: 'Phosphalugel (Huyền dịch uống)',
        active_ingredient: 'Aluminium phosphate 20%',
        unit: 'Gói',
        usage_route: 'Uống',
        unit_price: 9500,
        manufacturer: 'Boehringer Ingelheim',
        description: 'Thuốc trung hòa axit dạ dày, giảm rát thượng vị'
    },
    {
        medicine_code: 'MED-AMX-500',
        medicine_name: 'Amoxicillin 500mg',
        active_ingredient: 'Amoxicillin',
        unit: 'Viên',
        usage_route: 'Uống',
        unit_price: 4500,
        manufacturer: 'Mekophar',
        description: 'Kháng sinh nhóm penicillin điều trị nhiễm khuẩn hô hấp'
    },
    {
        medicine_code: 'MED-AUG-1G',
        medicine_name: 'Augmentin 1g',
        active_ingredient: 'Amoxicillin + Clavulanic acid',
        unit: 'Viên',
        usage_route: 'Uống',
        unit_price: 24000,
        manufacturer: 'GSK (GlaxoSmithKline)',
        description: 'Kháng sinh phổ rộng điều trị nhiễm khuẩn tai mũi họng, phế quản'
    },
    {
        medicine_code: 'MED-PAN-EXT',
        medicine_name: 'Panadol Extra',
        active_ingredient: 'Paracetamol 500mg + Caffeine 65mg',
        unit: 'Viên',
        usage_route: 'Uống',
        unit_price: 6000,
        manufacturer: 'Haleon',
        description: 'Giảm đau đầu, đau cơ, đau răng nhẹ đến vừa'
    }
];

async function seedPrescriptions() {
    console.log(`=== SEEDING MEDICINE & PRESCRIPTION DATA TO ${BASE_URL} ===\n`);

    const createdMedicines = [];

    // 1. Seed Medicines
    for (const med of SAMPLE_MEDICINES) {
        try {
            const res = await fetch(`${BASE_URL}/api/medicine`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(med)
            });
            const data = await res.json();
            if (res.ok) {
                console.log(`✓ Đã tạo thuốc: ${med.medicine_name} (${med.medicine_code})`);
                createdMedicines.push(data?.data || data);
            } else {
                console.log(`- Thuốc ${med.medicine_code} đã tồn tại hoặc lỗi:`, data.message || res.status);
            }
        } catch (err) {
            console.error(`✕ Lỗi kết nối khi tạo thuốc ${med.medicine_code}:`, err.message);
        }
    }

    // 2. Fetch existing medicine list if created list empty
    if (createdMedicines.length === 0) {
        try {
            const res = await fetch(`${BASE_URL}/api/medicine`);
            const data = await res.json();
            const items = Array.isArray(data) ? data : data?.data?.items || data?.data || [];
            createdMedicines.push(...items);
        } catch (err) {
            console.error('Không thể lấy danh sách thuốc từ backend:', err.message);
        }
    }

    console.log(`\nTổng số loại thuốc sẵn có: ${createdMedicines.length}`);

    // 3. Seed Prescriptions (Doctor Prescribing)
    if (createdMedicines.length > 0) {
        const firstMed = createdMedicines[0]?.medicine_id || createdMedicines[0]?.id;
        const secondMed = createdMedicines[1]?.medicine_id || createdMedicines[1]?.id || firstMed;

        const samplePrescriptions = [
            {
                visit_session_id: 'c3d4e5f6-a7b8-9012-cdef-3456789012cd',
                diagnosis_note: 'Viêm dạ dày dạ dày trào ngược. Uống thuốc đúng giờ, kiêng cay chua, tái khám sau 7 ngày.',
                details: [
                    {
                        medicine_id: firstMed,
                        quantity: 14,
                        dosage_instruction: 'Sáng 1 viên, tối 1 viên trước ăn 30 phút',
                        note: 'Uống nguyên viên không nhai'
                    },
                    {
                        medicine_id: secondMed,
                        quantity: 10,
                        dosage_instruction: 'Trưa 1 gói sau ăn 1 tiếng',
                        note: 'Nhai kỹ trước khi nuốt'
                    }
                ]
            }
        ];

        for (const rx of samplePrescriptions) {
            try {
                const res = await fetch(`${BASE_URL}/api/prescription`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(rx)
                });
                const data = await res.json();
                if (res.ok) {
                    const created = data?.data || data;
                    console.log(`✓ Đã tạo đơn thuốc mới: Mã ${created.prescription_code || 'RX-OK'}, Tổng tiền: ${created.total_amount?.toLocaleString('vi-VN')} đ`);
                } else {
                    console.log(`- Không thể tạo đơn thuốc:`, data.message || res.status);
                }
            } catch (err) {
                console.error(`✕ Lỗi kết nối khi tạo đơn thuốc:`, err.message);
            }
        }
    }

    console.log('\n=== HOÀN TẤT SEED DATA ĐƠN THUỐC ===');
}

seedPrescriptions();
