import React from 'react';
import { RoomWaitingScreen } from '@/modules/queue/components/RoomWaitingScreen';

interface PageProps {
    params: Promise<{ roomId: string }>;
}

export default async function DynamicRoomDisplayPage({ params }: PageProps) {
    const { roomId } = await params;
    return <RoomWaitingScreen roomId={roomId} />;
}
