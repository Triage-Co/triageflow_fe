'use client';

import React, { useEffect } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { BlurBlob } from '../components/BlurBlob';
import { Toast } from '../components/Toast';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { QRScannerModal } from '../modals/QRScannerModal';

import { HomeMenuView } from './HomeMenuView';
import { RegisterView } from './RegisterView';
import { PatientInfoView } from './PatientInfoView';
import { DoctorRouteView } from './DoctorRouteView';
import { QueueView } from './QueueView';
import { MapView } from './MapView';
import { PaymentView } from './PaymentView';
import { SupportView } from './SupportView';

export const KioskRoot: React.FC = () => {
  const currentView = useKioskStore((state) => state.currentView);
  const initialize = useKioskStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div
      className="min-h-screen w-full flex flex-col font-sans select-none overflow-hidden relative"
      style={{
        background: 'linear-gradient(145deg, #DFE1FF 0%, #DFE1FF 50%, #F0D2C1 100%)'
      }}
    >
      {/* Toast Notifications Portal */}
      <Toast />

      {/* Loading Spinner Overlay */}
      <LoadingSpinner />

      {/* Background Glowing Decorations */}
      <BlurBlob />

      {/* Header Branding - Chỉ hiển thị tại trang chủ */}
      {currentView === 'home' && (
        <header className="w-full pt-8 pb-2 flex flex-col items-center text-center z-10 shrink-0">
          <div className="flex items-center gap-3.5 mb-1">
            <div className="w-12 h-12 rounded-2xl bg-[#155DFC] flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 11H16M12 15H16M8 11H8.01M8 15H8.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-3xl font-black text-[#1E2939] tracking-tight">
              TriageFlow<span className="text-[#155DFC]">OPD</span>
            </span>
          </div>
          <h1 className="text-xs font-bold text-[#4A5565] tracking-wide uppercase">
            Hệ thống Kiosk phục vụ bệnh nhân
          </h1>
        </header>
      )}

      {/* Dynamic Main Views */}
      <main className="flex-1 w-full flex flex-col justify-center items-center relative z-10 overflow-y-auto">
        {currentView === 'home' && <HomeMenuView />}
        {currentView === 'register' && <RegisterView />}
        {currentView === 'patient_info' && <PatientInfoView />}
        {currentView === 'doctor_route' && <DoctorRouteView />}
        {currentView === 'queue' && <QueueView />}
        {currentView === 'map' && <MapView />}
        {currentView === 'payment' && <PaymentView />}
        {currentView === 'support' && <SupportView />}
      </main>
      {/* Global Modals */}
      <QRScannerModal />
    </div>
  );
};
