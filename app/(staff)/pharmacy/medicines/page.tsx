'use client';

import React from 'react';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { MedicineCatalogModal } from '@/modules/ancillary/components/MedicineCatalogModal';

export default function PharmacyMedicinesPage() {
    return (
        <EMRWorkspaceLayout activeTabId="pharmacy_medicines" activeTabName="Danh Mục Thuốc (Medicine Catalog)">
            <div className="flex-1 p-6 md:p-10 overflow-y-auto w-full bg-white">
                <MedicineCatalogModal isPage={true} />
            </div>
        </EMRWorkspaceLayout>
    );
}
