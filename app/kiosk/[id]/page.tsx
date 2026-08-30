import React from 'react';
import { KioskRoot } from '@/modules/kiosk/views/KioskRoot';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KioskByIdPage({ params }: PageProps) {
  const { id } = await params;
  return <KioskRoot screenId={id} />;
}
