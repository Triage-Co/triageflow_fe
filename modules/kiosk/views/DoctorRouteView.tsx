import React, { useEffect } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { ArrowLeft, MapPin, Navigation, QrCode, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RouteStepItem } from '../types/kiosk.types';
import { useFlowStore } from '../store/flowStore';
import { useAuthStore } from '../store/authStore';

export const DoctorRouteView: React.FC = () => {
  const navigateToView = useKioskStore((state) => state.navigateToView);
  const routeStepsFromStore = useFlowStore((state) => state.routeSteps);
  const activeTicket = useFlowStore((state) => state.activeTicket);
  const selectedDoctor = useKioskStore((state) => state.selectedDoctor);
  const showToast = useKioskStore((state) => state.showToast);

  const patientId = useAuthStore((state) => state.patientId);

  useEffect(() => {
    if (patientId) {
      useFlowStore.getState().fetchDoctorRouteSteps(patientId);
    }
  }, [patientId]);

  const roomName = activeTicket?.roomNumber || selectedDoctor?.room || '';
  const specialtyName = activeTicket?.clinicName || selectedDoctor?.specialty || '';
  const ticketNo = activeTicket?.ticketNumber || '';

  const routeSteps: RouteStepItem[] = routeStepsFromStore.length > 0
    ? routeStepsFromStore
    : [
        {
          id: 1,
          title: 'Thanh toán & Đăng ký',
          subtitle: 'Thu ngân / Kiosk',
          room: 'Sảnh chính',
          location: '',
          status: 'completed'
        },
        {
          id: 2,
          title: specialtyName ? `Khám ${specialtyName}` : 'Khám lâm sàng',
          subtitle: activeTicket?.doctorName || selectedDoctor?.name || '',
          room: roomName,
          location: '',
          queueNo: ticketNo || undefined,
          status: 'in_progress'
        }
      ];

  const currentStepItem = routeSteps.find(s => s.status === 'in_progress') || routeSteps.find(s => s.status === 'pending') || routeSteps[0];

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-6 z-10 space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigateToView('patient_info')} 
            className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full text-xs font-bold text-neutral-700 shadow-sm border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
          <h2 className="text-2xl font-black text-[#1E2939] tracking-tight">
            Lộ trình bác sĩ chỉ định
          </h2>
        </div>

        <button 
          onClick={() => showToast('Đang mở Master QR Lộ trình...', 'info')}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl text-xs font-extrabold text-[#1E2939] shadow-sm border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
        >
          <QrCode className="w-4 h-4 text-[#155DFC]" /> Master QR
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Card: Điểm đến hiện tại */}
        <div className="lg:col-span-4 bg-[#4F80E1] text-white rounded-[28px] p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">Điểm đến hiện tại</span>
            
            <div className="space-y-1">
              <h3 className="text-2xl font-black">{currentStepItem.title}</h3>
              {currentStepItem.subtitle && (
                <p className="text-sm font-bold text-blue-100">{currentStepItem.subtitle}</p>
              )}
            </div>

            <div className="space-y-2 text-xs font-bold text-blue-100 pt-2 border-t border-white/20">
              {currentStepItem.room && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>Phòng: {currentStepItem.room}</span>
                </div>
              )}
              {currentStepItem.queueNo && (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 font-black">#</span>
                  <span>Số thứ tự: <strong className="text-white text-sm font-black">{currentStepItem.queueNo}</strong></span>
                </div>
              )}
              {currentStepItem.estimatedWait && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Thời gian chờ: {currentStepItem.estimatedWait}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => navigateToView('map')}
            className="w-full py-3 bg-white text-[#155DFC] rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:bg-blue-50 transition-all cursor-pointer"
          >
            <Navigation className="w-4 h-4 rotate-45" /> Xem đường đi
          </button>
        </div>

        {/* Right Card: Stepper Timeline */}
        <div className="lg:col-span-8 bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 space-y-4">
          <h3 className="font-extrabold text-[#1E2939] text-base border-b border-neutral-100 pb-3">
            Lộ trình bác sĩ chỉ định
          </h3>

          <div className="space-y-3">
            {routeSteps.map((step) => {
              const isCompleted = step.status === 'completed';
              const isInProgress = step.status === 'in_progress';
              const isPending = step.status === 'pending';
              const isWaiting = step.status === 'waiting';

              return (
                <div 
                  key={step.id}
                  className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between transition-all",
                    isInProgress && "bg-blue-50/90 border-[#155DFC] shadow-sm ring-1 ring-blue-200",
                    isCompleted && "bg-neutral-50/80 border-neutral-200/60 opacity-90",
                    isPending && "bg-amber-50/40 border-amber-100",
                    isWaiting && "bg-white border-neutral-100 text-neutral-400"
                  )}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      isCompleted && "bg-[#155DFC]/20 text-[#155DFC]",
                      isInProgress && "bg-[#155DFC] text-white shadow-sm",
                      isPending && "bg-amber-400 text-white",
                      isWaiting && "bg-neutral-100 text-neutral-400 border border-neutral-200"
                    )}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4 text-[#155DFC]" /> : step.id}
                    </div>

                    <div>
                      <h4 className={cn("font-extrabold text-xs", isInProgress ? "text-[#155DFC]" : "text-[#1E2939]")}>
                        {step.id}. {step.title}
                      </h4>
                      {step.subtitle && (
                        <p className="text-[11px] text-neutral-500 font-semibold">{step.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    {step.room && (
                      <div className="text-[11px]">
                        <span className="text-neutral-400 font-bold block">Phòng</span>
                        <span className="font-extrabold text-[#1E2939]">{step.room}</span>
                      </div>
                    )}

                    {step.queueNo && (
                      <div className="text-[11px]">
                        <span className="text-neutral-400 font-bold block">Số thứ tự</span>
                        <span className="font-extrabold text-[#155DFC]">{step.queueNo}</span>
                        {step.estimatedWait && <span className="text-neutral-400 text-[10px] block">{step.estimatedWait}</span>}
                      </div>
                    )}

                    <span className={cn(
                      "px-3 py-1 rounded-xl text-[10px] font-bold border min-w-[90px] text-center",
                      isCompleted && "bg-blue-100/80 text-blue-700 border-blue-200",
                      isInProgress && "bg-[#155DFC] text-white border-[#155DFC]",
                      isPending && "bg-amber-100 text-amber-800 border-amber-200",
                      isWaiting && "bg-neutral-100 text-neutral-500 border-neutral-200"
                    )}>
                      {isCompleted && 'Hoàn thành'}
                      {isInProgress && 'Đang thực hiện'}
                      {isPending && 'Đang chờ'}
                      {isWaiting && 'Chưa thực hiện'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
