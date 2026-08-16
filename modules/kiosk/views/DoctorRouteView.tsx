import React, { useEffect, useState } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { ArrowLeft, MapPin, Navigation, RotateCw, CheckCircle2, Clock, User, X, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFlowStore } from '../store/flowStore';
import { useAuthStore } from '../store/authStore';
import { 
  stripRoomName, 
  activeFlowKioskRequests, 
  doctorRouteRequests, 
  activeTicketRequests, 
  stepDetailRequests 
} from '../utils/flowHelpers';
import { ServiceOrderModal } from '../components/ServiceOrderModal';
import { ServicePaymentQrModal } from '../modals/ServicePaymentQrModal';

export const DoctorRouteView: React.FC = () => {
  const navigateToView = useKioskStore((state) => state.navigateToView);
  const navigateToMap = useKioskStore((state) => state.navigateToMap);
  const routeSteps = useFlowStore((state) => state.routeSteps);
  const activeTicket = useFlowStore((state) => state.activeTicket);
  const activeBookingId = useFlowStore((state) => state.activeBookingId);
  const selectedDoctor = useKioskStore((state) => state.selectedDoctor);
  const showToast = useKioskStore((state) => state.showToast);

  const patientId = useAuthStore((state) => state.patientId);

  // States & selectors cho chức năng thanh toán Service Order
  const [isServiceOrderModalOpen, setIsServiceOrderModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedServiceOrderId, setSelectedServiceOrderId] = useState<string>('');

  const pendingServiceOrders = useFlowStore((state) => state.pendingServiceOrders);
  const isFetchingServiceOrders = useFlowStore((state) => state.isFetchingServiceOrders);
  const activeTransactionQr = useFlowStore((state) => state.activeTransactionQr);
  const fetchPendingServiceOrders = useFlowStore((state) => state.fetchPendingServiceOrders);
  const clearTransactionQr = useFlowStore((state) => state.clearTransactionQr);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDetailStep, setSelectedDetailStep] = useState<any>(null);
  
  // Collapsible state for grouped service order steps (collapsed by default)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (serviceOrderId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [serviceOrderId]: !prev[serviceOrderId]
    }));
  };

  const pendingPaymentSteps = useFlowStore((state) => state.pendingPaymentSteps);
  const selectPendingStep = useFlowStore((state) => state.selectPendingStep);

  const handleStepClick = async (step: any) => {
    const isPayment = step.title.toLowerCase().trim().startsWith('thanh toán');

    if (isPayment) {
      // VẤN ĐỀ 1: Nếu chưa tải danh sách đơn dịch vụ, gọi API tải ngay tại đây
      if (patientId && pendingServiceOrders.length === 0) {
        await fetchPendingServiceOrders(patientId);
      }

      // Lấy danh sách mới nhất từ store sau khi gọi API
      const latestServiceOrders = useFlowStore.getState().pendingServiceOrders;
      const stepSoId = step.rawStep?.service_order_id;

      if (stepSoId) {
        // Tìm đơn dịch vụ khớp với service_order_id của Step
        const matchedServiceOrder = latestServiceOrders.find(
          (order) => order.service_order_id === stepSoId
        );

        if (matchedServiceOrder) {
          handleSelectPay(
            matchedServiceOrder.service_order_id,
            matchedServiceOrder.qr_code,
            matchedServiceOrder.total_price
          );
          return;
        }
      }

      // Nếu không khớp đơn dịch vụ nào, check tiếp trong bước thanh toán (ví dụ: phí khám ban đầu)
      const matchedPending = pendingPaymentSteps.find(p => p.step_id === step.stepId);
      if (matchedPending) {
        selectPendingStep(matchedPending);
      } else {
        showToast('Bước thanh toán này hiện chưa sẵn sàng hoặc đã được xử lý!', 'info');
      }
    } else {
      // VẤN ĐỀ 2: Nếu là Step khám/xét nghiệm thông thường, luôn chỉ hiện popup thông tin chi tiết
      setSelectedDetailStep(step);
    }
  };

  const handleRefresh = async () => {
    if (!patientId) return;
    setIsRefreshing(true);
    showToast('Đang cập nhật lộ trình mới nhất...', 'info');

    // Xóa cache tạm để bắt buộc kéo data mới từ BE
    activeFlowKioskRequests.clear();
    doctorRouteRequests.clear();
    activeTicketRequests.clear();
    stepDetailRequests.clear();

    try {
      await Promise.all([
        useFlowStore.getState().fetchActiveTicketForPatient(patientId),
        useFlowStore.getState().fetchDoctorRouteSteps(patientId)
      ]);
      showToast('Cập nhật lộ trình thành công!', 'success');
    } catch (error) {
      console.error('Lỗi khi cập nhật lộ trình:', error);
      showToast('Cập nhật lộ trình thất bại. Vui lòng thử lại!', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenServiceOrders = async () => {
    if (patientId) {
      setIsServiceOrderModalOpen(true);
      await fetchPendingServiceOrders(patientId);
    }
  };

  const handleSelectPay = (serviceOrderId: string, qrCode: string, amount: number) => {
    if (patientId) {
      setSelectedServiceOrderId(serviceOrderId);
      // Gán trực tiếp dữ liệu QR động từ service_order vào store
      useFlowStore.setState({
        activeTransactionQr: {
          qrCode,
          amount,
        } as any
      });
      setIsQrModalOpen(true);
    }
  };

  const handlePaymentSuccess = () => {
    if (patientId) {
      // Đóng modal danh sách dịch vụ thanh toán
      setIsServiceOrderModalOpen(false);
      
      // Làm mới danh sách đơn dịch vụ chưa thanh toán
      fetchPendingServiceOrders(patientId);

      // Re-fetch flow and active ticket to refresh page data
      useFlowStore.getState().fetchActiveTicketForPatient(patientId);
      useFlowStore.getState().fetchDoctorRouteSteps(patientId);
    }
  };

  useEffect(() => {
    if (patientId) {
      useFlowStore.getState().fetchDoctorRouteSteps(patientId);
    }
  }, [patientId]);


  // Grouping steps belonging to the same service order
  const displaySteps = React.useMemo(() => {
    const result: any[] = [];
    const processedServiceOrderIds = new Set<string>();

    for (let i = 0; i < routeSteps.length; i++) {
      const step = routeSteps[i];
      const rawStep = step.rawStep;
      const isPayment = step.title.toLowerCase().trim().startsWith('thanh toán');
      const serviceOrderId = rawStep?.service_order_id;

      if (!isPayment && serviceOrderId) {
        if (processedServiceOrderIds.has(serviceOrderId)) {
          continue; // Skip because they are already grouped
        }
        processedServiceOrderIds.add(serviceOrderId);

        // Find all sibling test steps of the same service order
        const siblingSteps = routeSteps.filter(s => {
          const sIsPayment = s.title.toLowerCase().trim().startsWith('thanh toán');
          return s.rawStep?.service_order_id === serviceOrderId && !sIsPayment;
        });

        // Determine grouped status:
        // - completed if all are completed
        // - in_progress if any is in_progress
        // - pending if any is pending
        // - waiting otherwise
        let groupedStatus: 'completed' | 'in_progress' | 'pending' | 'waiting' = 'waiting';
        if (siblingSteps.every(s => s.status === 'completed')) {
          groupedStatus = 'completed';
        } else if (siblingSteps.some(s => s.status === 'in_progress')) {
          groupedStatus = 'in_progress';
        } else if (siblingSteps.some(s => s.status === 'pending')) {
          groupedStatus = 'pending';
        }

        result.push({
          isGrouped: true,
          serviceOrderId,
          status: groupedStatus,
          title: `Thực hiện chỉ định dịch vụ`,
          subSteps: siblingSteps,
          id: step.id,
        });
      } else {
        result.push({
          ...step,
          isGrouped: false,
        });
      }
    }

    // Renumber display IDs sequentially (1, 2, 3...)
    return result.map((step, idx) => ({
      ...step,
      displayId: idx + 1,
    }));
  }, [routeSteps]);

  const currentStepItem = routeSteps.find(s => s.status === 'in_progress') || routeSteps.find(s => s.status === 'pending') || routeSteps[0];
  const activeQueueNo = currentStepItem?.queueNo || activeTicket?.ticketNumber || undefined;
  
  const isPaymentStep = currentStepItem?.title?.toLowerCase().trim().startsWith('thanh toán') || false;

  return (
    <div className="w-full h-full min-h-0 p-4 sm:p-6 lg:p-8 z-10 select-none flex flex-col justify-between gap-4 max-w-7xl mx-auto overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateToView('patient_info')}
            className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-white hover:bg-neutral-50 active:scale-95 rounded-2xl shadow-sm border border-neutral-200 text-xs sm:text-sm font-extrabold text-neutral-800 transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1E2939] tracking-tight">
            Lộ trình bác sĩ chỉ định
          </h2>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleOpenServiceOrders}
            className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-extrabold shadow-md shadow-amber-500/10 transition-all cursor-pointer"
          >
            Các mục cần thanh toán
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-white rounded-2xl text-xs sm:text-sm font-extrabold text-[#1E2939] shadow-sm border border-neutral-200 hover:bg-neutral-50 active:scale-95 disabled:opacity-60 transition-all cursor-pointer"
          >
            <RotateCw className={cn("w-4 h-4 text-[#155DFC]", isRefreshing && "animate-spin")} />
            Cập nhật
          </button>
        </div>
      </div>

      {/* Main Grid (fills remaining height) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Left Card Column: Điểm đến hiện tại (Solid Blue Card) */}
        <div className="lg:col-span-4 flex flex-col min-h-0 h-full overflow-hidden">
          <div className="bg-[#4F80E1] text-white rounded-[28px] p-5 sm:p-6 shadow-xl flex flex-col justify-between flex-1 h-full overflow-y-auto">
            {currentStepItem ? (
              <div className="space-y-4">
                <span className="text-xs font-black text-blue-100 uppercase tracking-wider block">{isPaymentStep ? 'Thanh toán hiện tại' : 'Điểm đến hiện tại'}</span>

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
              onClick={() => !isPaymentStep && navigateToMap(stripRoomName(currentStepItem?.room || ''))}
              disabled={isPaymentStep}
              className={cn(
                "w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all mt-4",
                isPaymentStep
                  ? "bg-blue-300/40 text-blue-100/60 border border-blue-300/20 cursor-not-allowed shadow-none"
                  : "bg-white text-[#155DFC] hover:bg-blue-50 active:scale-95 cursor-pointer"
              )}
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
            {displaySteps.length > 0 ? (
              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {displaySteps.map((step, index) => {
                  const isCompleted = step.status === 'completed';
                  const isInProgress = step.status === 'in_progress';
                  const isPending = step.status === 'pending';
                  const isWaiting = step.status === 'waiting';
                  const isLast = index === displaySteps.length - 1;

                  if (step.isGrouped) {
                    const isExpanded = !!expandedGroups[step.serviceOrderId];

                    return (
                      <div key={`grouped-${step.serviceOrderId}`} className="flex items-start gap-4">
                        {/* LEFT SEPARATE TIMELINE COLUMN (OUTSIDE STEP BOX) */}
                        <div className="relative flex flex-col items-center justify-center shrink-0 w-10 h-9">
                          {/* Vertical Connecting Line */}
                          {!isLast && (
                            <div 
                              className="absolute top-[40px] left-1/2 -translate-x-1/2 w-[2px] bg-blue-300 z-0 transition-all duration-300" 
                              style={{ bottom: isExpanded ? `${-40 - (step.subSteps.length * 84)}px` : '-65px' }}
                            />
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
                              isPending ? <Clock className="w-5 h-5 text-amber-800" /> : step.displayId
                            )}
                          </div>
                        </div>

                        {/* RIGHT STEP ITEM CARD - GROUPED TESTS CONTAINER */}
                        <div className="flex-1 p-5 rounded-[22px] border border-neutral-200/60 bg-white shadow-xs space-y-4">
                          {/* Group Header (Clickable to Toggle Collapse/Expand) */}
                          <div 
                            onClick={() => toggleGroup(step.serviceOrderId)}
                            className="flex items-center justify-between cursor-pointer hover:bg-neutral-50/50 p-1.5 rounded-xl transition-all select-none"
                          >
                            <div className="flex items-center gap-3">
                              <div className="space-y-0.5">
                                <h4 className="font-black text-base lg:text-lg tracking-tight text-[#1E2939]">
                                  Bước {step.displayId}. Thực hiện chỉ định dịch vụ
                                </h4>
                                <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider block">
                                  Tổng cộng {step.subSteps.length} xét nghiệm/thăm dò (Nhấp để {isExpanded ? 'thu gọn' : 'mở rộng'})
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-extrabold border shadow-xs tracking-wide",
                                isCompleted && "bg-blue-100/90 text-[#155DFC] border-blue-200",
                                isInProgress && "bg-[#155DFC] text-white border-transparent shadow-sm",
                                isPending && "bg-amber-50 border-amber-200 text-amber-700",
                                isWaiting && "bg-neutral-50 border-neutral-200 text-neutral-500"
                              )}>
                                {isCompleted ? 'Hoàn thành' : isInProgress ? 'Đang thực hiện' : isPending ? 'Đang chờ' : 'Chưa thực hiện'}
                              </span>
                            </div>
                          </div>

                          {/* Sub-steps List (Rendered conditionally when expanded) */}
                          {isExpanded && (
                            <div className="space-y-3 pt-3 border-t border-neutral-100 animate-in fade-in slide-in-from-top-2 duration-200">
                              {step.subSteps.map((subStep: any, subIdx: number) => {
                                const isSubCompleted = subStep.status === 'completed';
                                const isSubInProgress = subStep.status === 'in_progress';
                                const isSubPending = subStep.status === 'pending';
                                const isSubWaiting = subStep.status === 'waiting';

                                return (
                                  <div
                                    key={subStep.stepId || subIdx}
                                    onClick={() => handleStepClick(subStep)}
                                    className={cn(
                                      "p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all bg-white hover:shadow-md cursor-pointer hover:border-neutral-300 active:scale-[0.99]",
                                      isSubInProgress && "bg-blue-50/50 border-[#155DFC] ring-1 ring-blue-200",
                                      isSubCompleted && "bg-neutral-50/50 border-neutral-100 opacity-90",
                                      isSubPending && "bg-amber-50/30 border-amber-200"
                                    )}
                                  >
                                    <div className="flex-1 space-y-1">
                                      <span className={cn(
                                        "font-black text-sm lg:text-base tracking-tight",
                                        isSubInProgress ? "text-[#155DFC]" : "text-neutral-800"
                                      )}>
                                        {subIdx + 1}. {subStep.title}
                                      </span>
                                      {subStep.subtitle && (
                                        <span className="text-xs text-neutral-450 block font-semibold">{subStep.subtitle}</span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-6 shrink-0 text-xs">
                                      {subStep.room && (
                                        <div className="space-y-0.5">
                                          <span className="text-neutral-400 font-bold block uppercase tracking-wider text-[9px]">Phòng</span>
                                          <span className="font-extrabold text-[#1E2939]">{subStep.room}</span>
                                        </div>
                                      )}

                                      {subStep.queueNo && (
                                        <div className="space-y-0.5">
                                          <span className="text-neutral-400 font-bold block uppercase tracking-wider text-[9px]">Số thứ tự</span>
                                          <span className="font-black text-[#155DFC]">{subStep.queueNo}</span>
                                        </div>
                                      )}

                                      <div className="min-w-28 flex justify-end">
                                        <span className={cn(
                                          "px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider",
                                          isSubCompleted && "bg-blue-100/90 text-[#155DFC] border-blue-200",
                                          isSubInProgress && "bg-[#155DFC] text-white shadow-sm",
                                          isSubPending && "bg-amber-100 text-amber-800 border-amber-250/80",
                                          isSubWaiting && "bg-neutral-100 text-neutral-400 border-neutral-200"
                                        )}>
                                          {isSubCompleted ? 'Hoàn thành' : isSubInProgress ? 'Đang gọi' : isSubPending ? 'Đang chờ' : 'Chưa khám'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  const isPaymentStep = step.title.toLowerCase().trim().startsWith('thanh toán');
                  const isPaidPayment = isPaymentStep && isCompleted;
                  const isClickable = !isPaidPayment;

                  return (
                    <div key={step.id} className="flex items-center gap-4">
                      {/* LEFT SEPARATE TIMELINE COLUMN (OUTSIDE STEP BOX) */}
                      <div className="relative flex flex-col items-center justify-center shrink-0 w-10 h-9">
                        {/* Vertical Connecting Line */}
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
                            isPending ? <Clock className="w-5 h-5 text-amber-800" /> : step.displayId
                          )}
                        </div>
                      </div>

                      {/* RIGHT STEP ITEM CARD */}
                      <div
                        onClick={() => isClickable && handleStepClick(step)}
                        className={cn(
                          "flex-1 p-4 lg:p-5 rounded-2xl border grid grid-cols-12 gap-4 items-center transition-all bg-white",
                          isInProgress && "bg-blue-50/90 border-[#155DFC] shadow-sm ring-1 ring-blue-200",
                          isCompleted && "bg-neutral-50/80 border-neutral-200/60 opacity-90",
                          isPending && "bg-amber-50/40 border-amber-200/80",
                          isWaiting && "bg-white border-neutral-100 text-neutral-400",
                          isClickable ? "cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-95" : "pointer-events-none opacity-80"
                        )}
                      >
                        {/* Col 1: Title & Subtitle (5 cols) */}
                        <div className="col-span-5 space-y-0.5">
                          <h4 className={cn("font-black text-base lg:text-lg tracking-tight", isInProgress ? "text-[#155DFC]" : "text-[#1E2939]")}>
                            Bước {step.displayId}. {step.title}
                          </h4>
                          {step.subtitle && (
                            <p className="text-xs text-neutral-500 font-semibold">{step.subtitle}</p>
                          )}
                        </div>

                        {/* Col 2: Room Info (3 cols) */}
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

                        {/* Col 3: Queue Number & Time (2 cols) */}
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

      {/* Popup 1: Danh sách service orders cần thanh toán */}
      <ServiceOrderModal
        isOpen={isServiceOrderModalOpen}
        onClose={() => setIsServiceOrderModalOpen(false)}
        pendingServiceOrders={pendingServiceOrders}
        onSelectPay={handleSelectPay}
        isFetching={isFetchingServiceOrders}
        activeBookingId={activeBookingId}
      />

      {/* Popup 2: Hiển thị mã QR thanh toán */}
      <ServicePaymentQrModal
        isOpen={isQrModalOpen}
        onClose={() => {
          setIsQrModalOpen(false);
          clearTransactionQr();
        }}
        qrResult={activeTransactionQr}
        patientId={patientId || ''}
        serviceOrderId={selectedServiceOrderId}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Step Detail Modal */}
      {selectedDetailStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[32px] shadow-2xl border border-neutral-100 max-w-lg w-full p-8 relative flex flex-col space-y-6 animate-scale-up">
            {/* Close Button */}
            <button
              onClick={() => setSelectedDetailStep(null)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="space-y-1.5 border-b border-neutral-100 pb-4 pr-8 text-left">
              <span className={cn(
                "inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold border",
                selectedDetailStep.status === 'completed' && "bg-blue-50 text-[#155DFC] border-blue-200",
                selectedDetailStep.status === 'in_progress' && "bg-teal-50 text-teal-700 border-teal-200",
                selectedDetailStep.status === 'waiting' && "bg-amber-50 text-amber-700 border-amber-200",
                selectedDetailStep.status === 'pending' && "bg-neutral-50 text-neutral-500 border-neutral-200"
              )}>
                {selectedDetailStep.status === 'completed' ? 'Hoàn thành' : 
                 selectedDetailStep.status === 'in_progress' ? 'Đang thực hiện' :
                 selectedDetailStep.status === 'waiting' ? 'Đang chờ khám' : 'Chưa đến lượt'}
              </span>
              <h3 className="text-2xl font-black text-[#1E2939] tracking-tight">
                {selectedDetailStep.title}
              </h3>
            </div>

            {/* Details List */}
            <div className="space-y-4 text-sm text-left">
              {/* Room info */}
              {selectedDetailStep.room && selectedDetailStep.room !== '---' && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#155DFC] flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-400 block uppercase tracking-wider">Phòng khám</span>
                    <span className="font-extrabold text-[#1E2939] text-base">{selectedDetailStep.room}</span>
                    {selectedDetailStep.location && (
                      <span className="text-neutral-500 text-xs font-semibold block">{selectedDetailStep.location}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Doctor info */}
              {(selectedDetailStep.subtitle || selectedDetailStep.rawStep?.staff?.full_name || selectedDetailStep.rawStep?.staff_info?.full_name) && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#155DFC] flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-neutral-400 block uppercase tracking-wider">Bác sĩ phụ trách</span>
                    <span className="font-extrabold text-[#1E2939] text-base">
                      {selectedDetailStep.rawStep?.staff?.full_name || selectedDetailStep.rawStep?.staff_info?.full_name || selectedDetailStep.subtitle}
                    </span>
                    
                    {/* Additional staff details like license, experience */}
                    <div className="space-y-1 text-xs text-neutral-500 font-semibold pt-1.5 border-t border-neutral-100">
                      {selectedDetailStep.subtitle && (
                        <p>Chuyên khoa: <span className="text-[#1E2939]">{selectedDetailStep.subtitle}</span></p>
                      )}
                      {typeof selectedDetailStep.rawStep?.staff?.experience_years === 'number' && (
                        <p>Kinh nghiệm: <span className="text-[#1E2939]">{selectedDetailStep.rawStep.staff.experience_years} năm</span></p>
                      )}
                      {selectedDetailStep.rawStep?.staff?.license_number && (
                        <p>GP hành nghề: <span className="text-[#1E2939] font-mono">{selectedDetailStep.rawStep.staff.license_number}</span></p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Queue number */}
              {selectedDetailStep.queueNo && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#155DFC] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-400 block uppercase tracking-wider">Số thứ tự khám</span>
                    <span className="font-black text-[#155DFC] text-lg">{selectedDetailStep.queueNo}</span>
                  </div>
                </div>
              )}

              {/* Waiting time */}
              {selectedDetailStep.estimatedWait && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#155DFC] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-400 block uppercase tracking-wider">Thời gian chờ dự kiến</span>
                    <span className="font-extrabold text-[#1E2939]">~{selectedDetailStep.estimatedWait}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-4 pt-2 border-t border-neutral-100">
              <button
                onClick={() => setSelectedDetailStep(null)}
                className="flex-1 py-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-2xl font-black text-sm transition-all cursor-pointer active:scale-95"
              >
                Đóng
              </button>
              {selectedDetailStep.room && selectedDetailStep.room !== '---' && (
                <button
                  onClick={() => {
                    navigateToMap(stripRoomName(selectedDetailStep.room || ''));
                    setSelectedDetailStep(null);
                  }}
                  className="flex-1 py-3.5 bg-[#155DFC] hover:bg-blue-700 active:scale-95 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Navigation className="w-4 h-4 rotate-45" /> Chỉ đường đi
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
