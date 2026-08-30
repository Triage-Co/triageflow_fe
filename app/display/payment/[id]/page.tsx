import { PaymentTvHost } from '@/modules/display/components/PaymentTvHost';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PaymentDisplayByIdPage({ params }: PageProps) {
  const { id } = await params;
  return <PaymentTvHost screenId={id} />;
}
