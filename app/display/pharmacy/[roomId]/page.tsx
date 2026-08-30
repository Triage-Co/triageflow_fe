import { PharmacyWaitingScreen } from '@/modules/ancillary/components/display/PharmacyWaitingScreen';

interface PageProps {
    params: Promise<{ roomId: string }>;
}

export default async function PharmacyDisplayRoomPage({ params }: PageProps) {
    const { roomId } = await params;
    return <PharmacyWaitingScreen screenId={roomId} />;
}
