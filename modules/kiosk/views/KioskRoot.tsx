'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { useKioskStore } from '../store/kioskStore';
import { Toast } from '../components/Toast';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { QRScannerModal } from '../modals/QRScannerModal';
import { PaymentQRModal } from '../modals/PaymentQRModal';
import { VirtualKeyboardDrawer } from '../components/VirtualKeyboardDrawer';
import { KioskInactivityTimeoutModal } from '../components/KioskInactivityTimeoutModal';
import { KioskSessionResetButton } from '../components/KioskSessionResetButton';
import { KioskFullscreenButton } from '../components/KioskFullscreenButton';

import { HomeMenuView } from './HomeMenuView';
import { RegisterView } from './RegisterView';
import { BookingModeView } from './BookingModeView';
import { SpecialtySelectView } from './SpecialtySelectView';
import { PatientInfoView } from './PatientInfoView';
import { DoctorRouteView } from './DoctorRouteView';
import { QueueView } from './QueueView';
import { MapView } from './MapView';
import { PaymentView } from './PaymentView';
import { SupportView } from './SupportView';
import { PendingBillsView } from './PendingBillsView';
import { PackageSelectView } from './PackageSelectView';
import { PackageDetailView } from './PackageDetailView';
import { PackageSlotSelectView } from './PackageSlotSelectView';
import { KioskSettingsView } from './KioskSettingsView';
import { AdminPinModal } from '../modals/AdminPinModal';

export const KioskRoot: React.FC = () => {
  const currentView = useKioskStore((state) => state.currentView);
  const navigateToView = useKioskStore((state) => state.navigateToView);
  const initialize = useKioskStore((state) => state.initialize);

  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = React.useState(false);
  const tapCountRef = React.useRef(0);
  const lastTapTimeRef = React.useRef(0);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleLogoSecretTap = () => {
    const now = Date.now();
    if (now - lastTapTimeRef.current > 2500) {
      tapCountRef.current = 1;
    } else {
      tapCountRef.current += 1;
    }
    lastTapTimeRef.current = now;

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setIsAdminPinModalOpen(true);
    }
  };

  return (
    <div
      className="h-screen w-full flex flex-col font-sans select-none overflow-hidden relative"
      style={{
        background: 'linear-gradient(145deg, #DFE1FF 0%, #DFE1FF 50%, #F0D2C1 100%)'
      }}
    >
      {/* Toast Notifications Portal */}
      <Toast />

      {/* Loading Spinner Overlay */}
      <LoadingSpinner />

      {/* Background Glowing Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-300/20 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-rose-200/25 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* Header Branding - Chỉ hiển thị tại trang chủ */}
      {currentView === 'home' && (
        <header className="w-full pt-8 pb-2 flex flex-col items-center text-center z-10 shrink-0">
          <div
            onClick={handleLogoSecretTap}
            className="flex items-center gap-3.5 mb-1 cursor-pointer active:scale-98 transition-transform"
            title="Chạm 5 lần để mở Cài đặt Kiosk"
          >
            <div className="w-13 h-13 rounded-2xl bg-white p-1 flex items-center justify-center shadow-lg shadow-blue-500/15 border border-white/80 shrink-0">
              <Image
                src="/logo.png?v=2"
                alt="TriageFlow Logo"
                width={52}
                height={52}
                className="w-full h-full object-contain rounded-xl"
                unoptimized
                priority
              />
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
      <main className="flex-1 min-h-0 w-full flex flex-col relative z-10 overflow-hidden">
        {currentView === 'home' && <HomeMenuView />}
        {currentView === 'register' && <RegisterView />}
        {currentView === 'booking_mode' && <BookingModeView />}
        {currentView === 'specialty_select' && <SpecialtySelectView />}
        {currentView === 'patient_info' && <PatientInfoView />}
        {currentView === 'doctor_route' && <DoctorRouteView />}
        {currentView === 'queue' && <QueueView />}
        {currentView === 'map' && <MapView />}
        {currentView === 'payment' && <PaymentView />}
        {currentView === 'support' && <SupportView />}
        {currentView === 'pending_bills' && <PendingBillsView />}
        {currentView === 'package_select' && <PackageSelectView />}
        {currentView === 'package_detail' && <PackageDetailView />}
        {currentView === 'package_slot_select' && <PackageSlotSelectView />}
        {currentView === 'settings' && <KioskSettingsView />}
      </main>

      {/* Top Header Control Buttons (Fullscreen & Session Reset) */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-40 flex items-center gap-2 animate-in fade-in duration-300">
        <KioskFullscreenButton />
        <KioskSessionResetButton />
      </div>

      {/* Admin PIN Authentication Modal */}
      <AdminPinModal
        isOpen={isAdminPinModalOpen}
        onClose={() => setIsAdminPinModalOpen(false)}
        onSuccess={() => {
          setIsAdminPinModalOpen(false);
          navigateToView('settings');
        }}
      />

      {/* Global Modals, Virtual Keyboard & Inactivity Timeout */}
      <QRScannerModal />
      <PaymentQRModal />
      <VirtualKeyboardDrawer />
      <KioskInactivityTimeoutModal />
    </div>
  );
};
