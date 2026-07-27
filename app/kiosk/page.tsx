import React from 'react';
import { KioskRoot } from '@/modules/kiosk/views/KioskRoot';

export const metadata = {
  title: 'Kiosk - TriageFlowOPD',
  description: 'Hệ thống Kiosk phục vụ bệnh nhân',
};

export default function KioskPage() {
  return <KioskRoot />;
}
