'use client';

import React, { useState, useEffect } from 'react';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { PharmacyQueue } from '@/modules/ancillary/components/PharmacyQueue';
import { MedicationDispense } from '@/modules/ancillary/components/MedicationDispense';
import { Prescription } from '@/shared/types/prescription.types';
import { useAuthStore } from '@/store/authStore';

export default function PharmacyPage() {
    const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
    const [refreshQueueKey, setRefreshQueueKey] = useState(0);

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

    const handlePrescriptionStatusChange = (updated: Prescription) => {
        setSelectedPrescription(updated);
        setRefreshQueueKey((prev) => prev + 1);
    };

    return (
        <EMRWorkspaceLayout activeTabId="pharmacy" activeTabName="Quản Lý Nhà Thuốc & Cấp Phát">
            <div className="flex-1 overflow-hidden p-6 h-full w-full">
                <div className="flex flex-col lg:flex-row gap-6 h-full w-full">
                    {/* Left Column: Queue & QR Scan (4.5 parts - 45% width) */}
                    <div className="w-full lg:w-[45%] h-full overflow-hidden border-r border-neutral-100 pr-0 lg:pr-6 shrink-0">
                        <PharmacyQueue
                            onSelectPrescription={setSelectedPrescription}
                            selectedPrescriptionId={selectedPrescription?.prescription_id}
                            refreshKey={refreshQueueKey}
                        />
                    </div>

                    {/* Right Column: Prescription Details & Payment UI (5.5 parts - 55% width) */}
                    <div className="w-full lg:w-[55%] h-full overflow-hidden pl-0 lg:pl-2 min-w-0 flex-1">
                        <MedicationDispense
                            prescription={selectedPrescription}
                            onStatusChange={handlePrescriptionStatusChange}
                        />
                    </div>
                </div>
            </div>
        </EMRWorkspaceLayout>
    );
}
