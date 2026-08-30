import React from 'react';
import { KioskEntryClient } from '@/modules/kiosk/views/KioskEntryClient';

export const metadata = {
  title: 'Kiosk - TriageFlowOPD',
  description: 'Hệ thống Kiosk phục vụ bệnh nhân',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/icon-192.png',
    apple: '/icon-512.png',
  },
  manifest: '/manifest.json',
};

export default function KioskPage() {
  return <KioskEntryClient />;
}
