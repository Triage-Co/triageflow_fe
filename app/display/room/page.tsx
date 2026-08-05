import React from 'react';
import { RoomWaitingScreen } from '@/modules/queue/components/RoomWaitingScreen';

interface PageProps {
    searchParams: Promise<{ roomId?: string; staffId?: string }>;
}

export default async function RoomDisplayPage({ searchParams }: PageProps) {
    const params = await searchParams;
    return <RoomWaitingScreen roomId={params?.roomId} staffId={params?.staffId} />;
}
