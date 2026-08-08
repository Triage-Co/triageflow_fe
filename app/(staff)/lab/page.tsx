'use client';

import React, { Suspense } from 'react';
import LabWorklistView from '@/modules/lab/views/LabWorklistView';

export default function LabPage() {
    return (
        <Suspense fallback={
            <div className="flex-1 flex items-center justify-center bg-neutral-50/50 min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B7CF6]"></div>
            </div>
        }>
            <LabWorklistView />
        </Suspense>
    );
}
