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
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-100 dark:bg-neutral-950 p-4">
                {/* Main Content Body: 2-column layout */}
                <div className="flex-1 overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
                        {/* Left Column: Queue & QR Scan (4 cols - ~33% width) */}
                        <div className="lg:col-span-4 h-full overflow-hidden">
                            <PharmacyQueue
                                onSelectPrescription={setSelectedPrescription}
                                selectedPrescriptionId={selectedPrescription?.prescription_id}
                                refreshKey={refreshQueueKey}
                            />
                        </div>

                        {/* Right Column: Prescription Details & Payment UI (8 cols - ~67% width) */}
                        <div className="lg:col-span-8 h-full overflow-hidden">
                            <MedicationDispense
                                prescription={selectedPrescription}
                                onStatusChange={handlePrescriptionStatusChange}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </EMRWorkspaceLayout>
    );
}
