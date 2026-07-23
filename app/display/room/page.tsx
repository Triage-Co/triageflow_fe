import React from 'react';
import { RoomWaitingScreen } from '@/modules/queue/components/RoomWaitingScreen';

interface PageProps {
    searchParams: Promise<{ roomId?: string }>;
}

export default async function RoomDisplayPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const roomId = params?.roomId || '201';
    return <RoomWaitingScreen roomId={roomId} />;
}
