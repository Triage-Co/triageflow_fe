'use client';

import React, { useEffect } from 'react';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { MedicineManagementTable } from '@/modules/ancillary/components/MedicineManagementTable';
import { useAuthStore } from '@/store/authStore';

export default function PharmacyMedicinesPage() {
    const { user, setUser } = useAuthStore();

    // Automatically ensure user state is PHARMACIST role when visiting pharmacy page
    useEffect(() => {
        if (!user || (user.role !== 'PHARMACIST' && user.role !== 'PHARMACY_STAFF' && user.role !== 'ADMIN')) {
            setUser({
                id: user?.id || 'pharmacist-demo-id',
                email: user?.email || 'pharmacist@triageflow.me',
                fullName: user?.fullName || 'Dược sĩ Nguyễn Văn A (Nhà thuốc)',
                role: 'PHARMACIST'
            });
        }
    }, [user, setUser]);

    return (
        <EMRWorkspaceLayout activeTabId="pharmacy_medicines" activeTabName="Danh Mục Dược Phẩm & Thuốc">
            <div className="flex-1 flex flex-col p-6 overflow-y-auto w-full">
                <MedicineManagementTable />
            </div>
        </EMRWorkspaceLayout>
    );
}
