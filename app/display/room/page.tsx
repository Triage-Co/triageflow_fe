import React from 'react';
import { RoomWaitingScreen } from '@/modules/queue/components/RoomWaitingScreen';
import { RoomSelector } from '@/modules/queue/components/RoomSelector';

interface PageProps {
    searchParams: Promise<{ roomId?: string; staffId?: string }>;
}

export default async function RoomDisplayPage({ searchParams }: PageProps) {
    const params = await searchParams;

    if (params?.roomId) {
        return <RoomWaitingScreen roomId={params.roomId} staffId={params.staffId} />;
    }

    return <RoomSelector />;
}

