import { ClinicTvHost } from '@/modules/display/components/ClinicTvHost';

interface PageProps {
  params: Promise<{ roomId: string }>;
}

export default async function DynamicRoomDisplayPage({ params }: PageProps) {
  const { roomId } = await params;
  return <ClinicTvHost rawId={roomId} />;
}
