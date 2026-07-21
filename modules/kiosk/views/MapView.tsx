'use client';

import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { useFlowStore } from '../store/flowStore';
import { FloorMap } from '@/modules/navigation/components/FloorMap';
import { ArrowLeft, MapPin } from 'lucide-react';

export const MapView: React.FC = () => {
  const goHome = useKioskStore((state) => state.goHome);
  const activeTicket = useFlowStore((state) => state.activeTicket);

  const targetRoomCode = activeTicket?.roomNumber || null;
  const targetClinicId = (activeTicket as any)?.clinicId || null;

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-50">
      {/* 3D Map Canvas full-screen */}
      <FloorMap
        highlightRoomCode={targetRoomCode}
        highlightClinicId={targetClinicId}
      />

      {/* Floating Header Bar */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-4 pointer-events-auto">
        <button
          onClick={goHome}
          className="flex items-center gap-2 px-5 py-2.5 bg-white/95 backdrop-blur-md rounded-full text-xs font-bold text-slate-700 shadow-md border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" /> Quay lại
        </button>

        <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-md flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#155DFC] flex items-center justify-center font-bold">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-extrabold text-slate-800 tracking-tight">
              Sơ đồ bệnh viện 3D
            </h2>
            <p className="text-[11px] font-semibold text-slate-500">
              Tòa G2 – Khoa Khám Bệnh
            </p>
          </div>
        </div>
      </div>

      {/* Target Destination Info Badge (if active ticket) */}
      {targetRoomCode && (
        <div className="absolute bottom-6 left-6 z-20 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200 shadow-lg flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#155DFC] animate-ping" />
          <div>
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
              Điểm cần đến của bạn
            </p>
            <p className="text-sm font-black text-slate-800">
              Phòng {targetRoomCode}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
