'use client';

import React, { useState } from 'react';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { PharmacyQueue } from '@/modules/ancillary/components/PharmacyQueue';
import { MedicationDispense } from '@/modules/ancillary/components/MedicationDispense';
import { PharmacyCounterBindBar } from '@/modules/display/components/PharmacyCounterBindBar';
import { Prescription } from '@/shared/types/prescription.types';

export default function PharmacyPage() {
    const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
    const [refreshQueueKey, setRefreshQueueKey] = useState(0);

    const handlePrescriptionStatusChange = (updated: Prescription) => {
        setSelectedPrescription(updated);
        setRefreshQueueKey((prev) => prev + 1);
    };

    return (
        <EMRWorkspaceLayout activeTabId="pharmacy" activeTabName="Quản Lý Nhà Thuốc & Cấp Phát">
            <div className="flex-1 flex flex-col h-full overflow-hidden p-4">
                <PharmacyCounterBindBar />
                <div className="flex-1 overflow-hidden min-h-0">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
                        <div className="lg:col-span-4 h-full overflow-hidden">
                            <PharmacyQueue
                                onSelectPrescription={setSelectedPrescription}
                                selectedPrescriptionId={selectedPrescription?.prescription_id}
                                refreshKey={refreshQueueKey}
                            />
                        </div>
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
