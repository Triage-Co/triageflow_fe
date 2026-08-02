import React, { useEffect } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { ArrowLeft, MapPin, Navigation, QrCode, CheckCircle2, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFlowStore } from '../store/flowStore';
import { useAuthStore } from '../store/authStore';

export const DoctorRouteView: React.FC = () => {
  const navigateToView = useKioskStore((state) => state.navigateToView);
  const routeSteps = useFlowStore((state) => state.routeSteps);
  const activeTicket = useFlowStore((state) => state.activeTicket);
  const selectedDoctor = useKioskStore((state) => state.selectedDoctor);
  const showToast = useKioskStore((state) => state.showToast);

  const patientId = useAuthStore((state) => state.patientId);

  useEffect(() => {
    if (patientId) {
      useFlowStore.getState().fetchDoctorRouteSteps(patientId);
    }
  }, [patientId]);

  const currentStepItem = routeSteps.find(s => s.status === 'in_progress') || routeSteps.find(s => s.status === 'pending') || routeSteps[0];
  const activeQueueNo = currentStepItem?.queueNo || activeTicket?.ticketNumber || undefined;

  return (
    <div className="flex-1 min-h-0 px-8 py-6 z-10 flex flex-col gap-5">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateToView('patient_info')}
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-neutral-50 rounded-2xl shadow-sm border border-neutral-200 text-sm font-extrabold text-neutral-800 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
          <h2 className="text-3xl font-black text-[#1E2939] tracking-tight">
            Lộ trình bác sĩ chỉ định
          </h2>
        </div>

        <button
          onClick={() => showToast('Đang mở Master QR Lộ trình...', 'info')}
          className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-2xl text-xs lg:text-sm font-extrabold text-[#1E2939] shadow-sm border border-neutral-200 hover:bg-neutral-50 transition-all cursor-pointer"
        >
          <QrCode className="w-4 h-4 text-[#155DFC]" /> Master QR
        </button>
      </div>

      {/* Main Grid (fills remaining height) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left Card Column: Điểm đến hiện tại (Solid Blue Card) */}
        <div className="lg:col-span-4 flex flex-col min-h-0">
          <div className="bg-[#4F80E1] text-white rounded-[28px] p-6 shadow-xl flex flex-col justify-between flex-1 h-full">
            {currentStepItem ? (
              <div className="space-y-4">
                <span className="text-xs font-black text-blue-100 uppercase tracking-wider block">Điểm đến hiện tại</span>

                <div className="space-y-1">
                  <h3 className="text-3xl lg:text-4xl font-black">{currentStepItem.title}</h3>
                  {currentStepItem.subtitle && (
                    <p className="text-base font-bold text-blue-100">{currentStepItem.subtitle}</p>
                  )}
                </div>

                {/* Divider line matching Figma */}
                <div className="border-t border-white/20 my-3" />

                <div className="space-y-3 text-sm font-bold text-blue-100">
                  {currentStepItem.room && (
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-5 h-5 shrink-0" />
                      <span>Phòng: <strong className="text-white text-base font-black">{currentStepItem.room}</strong></span>
                    </div>
                  )}

                  {activeQueueNo && (
                    <div className="flex items-center gap-2.5">
                      <User className="w-5 h-5 shrink-0" />
                      <span>Số thứ tự: <strong className="text-white text-base font-black">{activeQueueNo}</strong></span>
                    </div>
                  )}

                  {currentStepItem.estimatedWait && (
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-5 h-5 shrink-0" />
                      <span>Thời gian chờ: <strong className="text-white text-base font-black">~{currentStepItem.estimatedWait}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-blue-100">
                <span className="text-xs font-black uppercase tracking-wider block">Điểm đến hiện tại</span>
                <h3 className="text-xl font-bold">Chưa có thông tin điểm đến</h3>
              </div>
            )}

            <button
              onClick={() => navigateToView('map')}
              className="w-full py-4 bg-white text-[#155DFC] rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md hover:bg-blue-50 transition-all cursor-pointer mt-4"
            >
              <Navigation className="w-4 h-4 rotate-45" /> Xem đường đi
            </button>
          </div>
        </div>

        {/* Right Card Column: Stepper Timeline (White Card) */}
        <div className="lg:col-span-8 flex flex-col min-h-0">
          <div className="bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 flex flex-col flex-1 h-full overflow-hidden">
            <h3 className="font-extrabold text-[#1E2939] text-lg border-b border-neutral-100 pb-3 mb-4 shrink-0">
              Lộ trình bác sĩ chỉ định
            </h3>

            {/* Stepper Container with Separate Left Timeline Column */}
            {routeSteps.length > 0 ? (
              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {routeSteps.map((step, index) => {
                  const isCompleted = step.status === 'completed';
                  const isInProgress = step.status === 'in_progress';
                  const isPending = step.status === 'pending';
                  const isWaiting = step.status === 'waiting';
                  const isLast = index === routeSteps.length - 1;

                  return (
                    <div key={step.id} className="flex items-center gap-4">
                      {/* LEFT SEPARATE TIMELINE COLUMN (OUTSIDE STEP BOX) */}
                      <div className="relative flex flex-col items-center justify-center shrink-0 w-10 h-9">
                        {/* Vertical Connecting Line — Kéo dài chạm từ mép dưới vòng này đến mép trên vòng tiếp theo */}
                        {!isLast && (
                          <div className="absolute top-[40px] bottom-[-65px] left-1/2 -translate-x-1/2 w-[2px] bg-blue-300 z-0" />
                        )}

                        {/* Circle Icon Indicator */}
                        <div className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center text-xs font-black z-10 shadow-sm transition-all bg-white",
                          isCompleted && "bg-blue-100 text-[#155DFC] border-2 border-blue-300",
                          isInProgress && "bg-[#155DFC] text-white ring-4 ring-blue-100",
                          isPending && "bg-amber-400 text-white",
                          isWaiting && "bg-neutral-100 text-neutral-400 border border-neutral-300"
                        )}>
                          {isCompleted ? <CheckCircle2 className="w-5 h-5 text-[#155DFC]" /> : (
                            isPending ? <Clock className="w-5 h-5 text-amber-800" /> : step.id
                          )}
                        </div>
                      </div>

                      {/* RIGHT STEP ITEM CARD (SEPARATE FROM TIMELINE LINE) */}
                      <div
                        className={cn(
                          "flex-1 p-4 lg:p-5 rounded-2xl border grid grid-cols-12 gap-4 items-center transition-all bg-white",
                          isInProgress && "bg-blue-50/90 border-[#155DFC] shadow-sm ring-1 ring-blue-200",
                          isCompleted && "bg-neutral-50/80 border-neutral-200/60 opacity-90",
                          isPending && "bg-amber-50/40 border-amber-200/80",
                          isWaiting && "bg-white border-neutral-100 text-neutral-400"
                        )}
                      >
                        {/* Col 1: Title & Subtitle (5 cols) */}
                        <div className="col-span-5 space-y-0.5">
                          <h4 className={cn("font-black text-base lg:text-lg tracking-tight", isInProgress ? "text-[#155DFC]" : "text-[#1E2939]")}>
                            {step.id}. {step.title}
                          </h4>
                          {step.subtitle && (
                            <p className="text-xs text-neutral-500 font-semibold">{step.subtitle}</p>
                          )}
                        </div>

                        {/* Col 2: Room Info (3 cols) - CHỈ HIỂN THỊ KHI CÓ DỮ LIỆU THẬT */}
                        <div className="col-span-3">
                          {step.room ? (
                            <div className="text-xs space-y-0.5">
                              <span className="text-neutral-400 font-bold block uppercase tracking-wider text-[10px]">Phòng</span>
                              <span className="font-black text-[#1E2939] text-sm block">{step.room}</span>
                              {step.location && (
                                <span className="text-neutral-500 text-xs font-semibold block">{step.location}</span>
                              )}
                            </div>
                          ) : null}
                        </div>

                        {/* Col 3: Queue Number & Time (2 cols) - CHỈ HIỂN THỊ KHI CÓ DỮ LIỆU THẬT */}
                        <div className="col-span-2">
                          {step.queueNo ? (
                            <div className="text-xs space-y-0.5">
                              <span className="text-neutral-400 font-bold block uppercase tracking-wider text-[10px]">Số thứ tự</span>
                              <span className="font-black text-[#155DFC] text-sm block">{step.queueNo}</span>
                              {step.estimatedWait && (
                                <span className="text-neutral-500 text-xs font-semibold block">~{step.estimatedWait}</span>
                              )}
                            </div>
                          ) : null}
                        </div>

                        {/* Col 4: Status Badge (2 cols - right aligned) */}
                        <div className="col-span-2 flex justify-end">
                          {isCompleted && (
                            <span className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-blue-100/90 text-[#155DFC] border border-blue-200">
                              Hoàn thành
                            </span>
                          )}
                          {isInProgress && (
                            <span className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-[#155DFC] text-white shadow-sm">
                              Đang thực hiện
                            </span>
                          )}
                          {isPending && (
                            <span className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                              Đang chờ
                            </span>
                          )}
                          {isWaiting && (
                            <span className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-neutral-100 text-neutral-400 border border-neutral-200">
                              Chưa thực hiện
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-neutral-400 space-y-2">
                <Clock className="w-12 h-12 stroke-1 text-neutral-300" />
                <p className="font-bold text-sm">Chưa có thông tin lộ trình chỉ định cho lượt khám này.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
