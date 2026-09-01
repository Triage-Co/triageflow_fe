"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileText,
  IdCard,
  Loader2,
  MapPin,
  Phone,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/modules/auth/store/authStore";
import { receptionService } from "@/modules/reception/services/receptionService";
import type {
  PatientSearchResult,
  RegistrationResult,
} from "@/modules/reception/types/reception.types";
import {
  mapActiveFlowsList,
  mapStepDetailToInfo,
  flowItemToRegistrationResult,
  formatRealTimeRange,
  type PatientActiveFlowItem,
} from "@/modules/reception/utils/receptionFlowMapper";
import { formatPhoneDisplay } from "@/modules/reception/utils/receptionSearch";
import { getTodayDateString } from "@/modules/reception/utils/receptionMapper";
import {
  downloadRegistrationTicketPdf,
  getQrImageUrl,
  printRegistrationTicket,
} from "@/modules/reception/utils/registrationTicket";

function formatDob(dob?: string): string {
  if (!dob) return "—";
  const [y, m, d] = dob.slice(0, 10).split("-");
  if (y && m && d) return `${d}/${m}/${y}`;
  return dob;
}

interface PatientActiveFlowsViewProps {
  patient: PatientSearchResult;
  onBack: () => void;
  onBookNew: (patient: PatientSearchResult) => void;
}

export function PatientActiveFlowsView({
  patient,
  onBack,
  onBookNew,
}: PatientActiveFlowsViewProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [flows, setFlows] = useState<PatientActiveFlowItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFlow, setSelectedFlow] =
    useState<PatientActiveFlowItem | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [, startTransition] = useTransition();

  // State cho danh sách Service Order chờ thanh toán
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  // Bộ lọc booking_id cho Service Orders: 'TODAY' (mặc định theo ca hôm nay), 'ALL' (tất cả), hoặc booking_id cụ thể
  const [selectedBookingFilter, setSelectedBookingFilter] =
    useState<string>("TODAY");

  // State cho xác nhận thanh toán tiền mặt & xem mã QR
  const [confirmingCashOrder, setConfirmingCashOrder] = useState<any | null>(
    null,
  );
  const [selectedQrOrder, setSelectedQrOrder] = useState<any | null>(null);
  const [isPayingCash, setIsPayingCash] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const patientId = patient.patient_id || patient.accountId;
  const todayStr = getTodayDateString();

  // Tìm ca khám của ngày hôm nay:
  // - Nếu đang xem ngày hôm nay, API đã lọc sẵn → toàn bộ flows là của hôm nay
  // - Nếu xem ngày khác, kiểm tra appointmentDate / createdAt
  const todayFlows = (() => {
    if (selectedDate === todayStr) return flows;
    return flows.filter((f) => {
      if (f.appointmentDate) return f.appointmentDate.slice(0, 10) === todayStr;
      if (f.createdAt) return f.createdAt.slice(0, 10) === todayStr;
      return false;
    });
  })();

  const activeTodayFlow =
    todayFlows.find(
      (f) =>
        f.flowStatus === "IN_PROGRESS" ||
        f.flowStatus === "PROCESSING" ||
        f.flowStatus === "EXAMINING",
    ) ||
    todayFlows[0] ||
    null;

  const todayBookingId =
    activeTodayFlow?.bookingId ||
    (activeTodayFlow?.raw as any)?.booking_id ||
    (activeTodayFlow?.raw as any)?.booking?.booking_id ||
    null;

  // Hàm lọc danh sách đơn chỉ định theo booking_id & status PENDING giống Kiosk
  // BẮT BUỘC có targetBookingId và đơn phải có booking_id khớp đúng targetBookingId
  const filterOrdersByBooking = (
    orders: any[],
    targetBookingId?: string | null,
  ) => {
    if (!targetBookingId) return [];
    return orders.filter((order) => {
      if (!order.booking_id || order.booking_id !== targetBookingId) {
        return false;
      }
      const details = Array.isArray(order.serviceOrderDetails)
        ? order.serviceOrderDetails
        : [];
      return (
        details.length === 0 ||
        details.some(
          (detail: any) =>
            (detail.status || "PENDING").toUpperCase() === "PENDING",
        )
      );
    });
  };

  // Các đơn cần thanh toán của ca khám hôm nay (dùng cho badge & header)
  const todayUnpaidOrders = filterOrdersByBooking(pendingOrders, todayBookingId);

  // Xác định booking_id thực tế cần lọc trong Modal
  const currentModalBookingId =
    selectedBookingFilter === "TODAY"
      ? todayBookingId
      : selectedBookingFilter;

  const displayedOrdersInModal = filterOrdersByBooking(
    pendingOrders,
    currentModalBookingId,
  );

  const loadPendingOrders = async () => {
    if (!accessToken || !patientId) return;
    setIsLoadingOrders(true);
    try {
      const orders = await receptionService.getPendingServiceOrders(
        patientId,
        accessToken,
      );
      setPendingOrders(orders);
    } catch (err) {
      console.error(
        "[PatientActiveFlowsView] Failed to load pending orders:",
        err,
      );
      setPendingOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleConfirmPayCash = async (order: any) => {
    if (!accessToken || !order?.service_order_id) return;
    setIsPayingCash(true);
    setPaymentFeedback(null);
    try {
      const amount = order.total_price || 0;
      await receptionService.payCashServiceOrder(
        order.service_order_id,
        accessToken,
      );
      setPaymentFeedback({
        type: "success",
        message: `Đã xác nhận thu ${Number(amount).toLocaleString("vi-VN")} đ tiền mặt thành công!`,
      });
      setConfirmingCashOrder(null);
      // Cập nhật lại danh sách đơn chờ & ca khám
      await Promise.all([loadPendingOrders(), loadFlows()]);
    } catch (err: any) {
      console.error("[PatientActiveFlowsView] Cash payment failed:", err);
      setPaymentFeedback({
        type: "error",
        message:
          err?.response?.data?.message ||
          err?.message ||
          "Thanh toán tiền mặt thất bại. Vui lòng thử lại.",
      });
    } finally {
      setIsPayingCash(false);
    }
  };

  const loadFlows = async (dateParam?: string) => {
    if (!accessToken || !patientId) return;
    const dateToFetch = dateParam !== undefined ? dateParam : selectedDate;
    setIsLoading(true);
    setError(null);
    try {
      const rawFlows = await receptionService.getPatientActiveFlows(
        patientId,
        accessToken,
        dateToFetch || undefined,
      );
      const mapped = mapActiveFlowsList(rawFlows);

      // Bổ sung chi tiết từng bước bằng API GET /api/step/{step_id} song song
      const enriched = await Promise.all(
        mapped.map(async (flowItem) => {
          const enrichedSteps = await Promise.all(
            flowItem.steps.map(async (st) => {
              if (!st.stepId) return st;
              try {
                const detail = await receptionService.getStepDetail(
                  st.stepId,
                  accessToken,
                );
                if (detail) {
                  const mappedDetail = mapStepDetailToInfo(detail);
                  if (mappedDetail) {
                    return {
                      ...st,
                      roomName: mappedDetail.roomName || st.roomName,
                      doctorName: mappedDetail.doctorName || st.doctorName,
                      specialtyName:
                        mappedDetail.specialtyName || st.specialtyName,
                      queueNumber: mappedDetail.queueNumber || st.queueNumber,
                      stepName: mappedDetail.stepName || st.stepName,
                      stepStatus: mappedDetail.stepStatus || st.stepStatus,
                      statusLabel: mappedDetail.statusLabel || st.statusLabel,
                      statusBadgeClass:
                        mappedDetail.statusBadgeClass || st.statusBadgeClass,
                      startTime: mappedDetail.startTime,
                      endTime: mappedDetail.endTime,
                      shiftDate: mappedDetail.shiftDate,
                      slotTimeLabel:
                        mappedDetail.slotTimeLabel || st.slotTimeLabel,
                    };
                  }
                }
              } catch {
                // fallback to existing step info
              }
              return st;
            }),
          );

          // 1. Lọc bỏ các bước thanh toán
          const nonPaySteps = enrichedSteps.filter((st) => {
            const name = (st.stepName || "").toLowerCase();
            const type = (st.stepType || "").toUpperCase();
            return (
              !name.includes("thanh toán") &&
              !name.includes("thanh toan") &&
              type !== "PAYMENT"
            );
          });

          // 2. Tìm bước IN_PROGRESS (hoặc bước khám chính)
          const activeExamStep =
            nonPaySteps.find(
              (s) =>
                s.stepStatus === "IN_PROGRESS" ||
                s.stepStatus === "PROCESSING" ||
                s.stepStatus === "EXAMINING",
            ) ||
            nonPaySteps.find((s) => s.queueNumber && s.roomName) ||
            nonPaySteps.find((s) => s.queueNumber) ||
            nonPaySteps.find(
              (s) => s.stepStatus === "WAITING" || s.stepStatus === "QUEUED",
            ) ||
            nonPaySteps[0] ||
            enrichedSteps[0];

          const queueNumber =
            activeExamStep?.queueNumber || flowItem.queueNumber;
          const ticketNo = queueNumber
            ? String(queueNumber).trim()
            : flowItem.ticketNo;
          const doctorLabel = activeExamStep?.doctorName
            ? activeExamStep.doctorName.toLowerCase().startsWith("bs")
              ? activeExamStep.doctorName
              : `BS. ${activeExamStep.doctorName}`
            : flowItem.doctorLabel;
          const roomLabel = activeExamStep?.roomName || flowItem.roomLabel;
          const specialty =
            activeExamStep?.specialtyName || flowItem.specialty;

          // Slot time label từ activeExamStep hoặc flowItem
          let slotTimeLabel = flowItem.slotTimeLabel;
          if (activeExamStep?.startTime && activeExamStep?.endTime) {
            slotTimeLabel = formatRealTimeRange(
              activeExamStep.startTime,
              activeExamStep.endTime,
              flowItem.appointmentDate || activeExamStep.shiftDate,
              flowItem.createdAt,
            );
          }

          return {
            ...flowItem,
            steps: enrichedSteps,
            queueNumber,
            ticketNo,
            specialty,
            doctorLabel,
            roomLabel,
            slotTimeLabel,
          };
        }),
      );

      setFlows(enriched);
    } catch (err) {
      console.error(
        "[PatientActiveFlowsView] Failed to load active flows:",
        err,
      );
      setError(
        "Không thể tải danh sách phiếu khám của bệnh nhân. Vui lòng thử lại.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadFlows(selectedDate);
    void loadPendingOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, accessToken, selectedDate]);

  const activeRegistrationResult: RegistrationResult | null = selectedFlow
    ? flowItemToRegistrationResult(selectedFlow, {
        full_name: patient.name,
        citizen_id: patient.citizenId,
        phone: patient.phone,
        dob: patient.dob,
        medical_coverage_id: patient.bhyt,
      })
    : null;

  const handlePrint = (result: RegistrationResult) => {
    setIsPrinting(true);
    try {
      printRegistrationTicket(result);
    } catch (e) {
      console.error("[PatientActiveFlowsView] Print error:", e);
    } finally {
      setTimeout(() => setIsPrinting(false), 800);
    }
  };

  const handleDownloadPdf = (result: RegistrationResult) => {
    setIsDownloading(true);
    try {
      downloadRegistrationTicketPdf(result);
    } catch (e) {
      console.error("[PatientActiveFlowsView] Download PDF error:", e);
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-xl border border-[#E5E7EB] bg-white flex items-center justify-center text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1F2937] transition-colors cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-[18px] font-bold text-[#1F2937]">
              Phiếu khám trong ngày
            </h2>
            <p className="text-[12px] text-[#9CA3AF]">
              Tra cứu & in lại phiếu khám cho bệnh nhân
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void loadFlows();
              void loadPendingOrders();
            }}
            disabled={isLoading || isLoadingOrders}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5E7EB] bg-white text-[12.5px] font-semibold text-[#374151] hover:bg-neutral-50 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw
              className={cn(
                "w-3.5 h-3.5",
                (isLoading || isLoadingOrders) && "animate-spin",
              )}
            />
            Làm mới
          </button>
          {todayBookingId && (
            <button
              type="button"
              onClick={() => {
                setSelectedBookingFilter("TODAY");
                setIsOrdersModalOpen(true);
                void loadPendingOrders();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-[12.5px] font-bold shadow-[0_2px_8px_rgba(139,124,246,0.25)] transition-all cursor-pointer relative"
            >
              <CreditCard className="w-4 h-4" />
              <span>Các mục cần thanh toán</span>
              {todayUnpaidOrders.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10.5px] font-black rounded-full bg-rose-500 text-white shadow-xs">
                  {todayUnpaidOrders.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Patient Information Card */}
      <div className="rounded-2xl border border-[#EBEBEB] bg-white p-5 md:p-6 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] flex items-center justify-center font-black text-[#8B7CF6] text-xl shrink-0">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-[#1F2937]">
                  {patient.name}
                </h3>
                {patient.gender && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1]">
                    {patient.gender.toUpperCase() === "FEMALE" ? "Nữ" : "Nam"}
                  </span>
                )}
                {patient.bhyt && patient.bhyt !== "N/A" && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                    BHYT: {patient.bhyt}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-2 text-[12.5px] text-[#6B7280]">
                <span className="flex items-center gap-1.5">
                  <IdCard className="w-4 h-4 text-[#9CA3AF]" />
                  CCCD:{" "}
                  <strong className="text-[#374151] font-mono">
                    {patient.citizenId}
                  </strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#9CA3AF]" />
                  Ngày sinh:{" "}
                  <strong className="text-[#374151]">
                    {formatDob(patient.dob)}
                  </strong>
                </span>
                {patient.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-[#9CA3AF]" />
                    SĐT:{" "}
                    <strong className="text-[#374151] font-mono">
                      {formatPhoneDisplay(patient.phone)}
                    </strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Flows List Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-100">
          <div>
            <h3 className="text-[15px] font-bold text-[#1F2937]">
              Danh sách phiếu khám ({flows.length})
            </h3>
            <p className="text-[12px] text-[#9CA3AF]">
              {selectedDate === getTodayDateString()
                ? "Đang hiển thị phiếu khám hôm nay theo thời gian thực"
                : selectedDate
                  ? `Đang lọc phiếu khám ngày ${selectedDate}`
                  : "Đang hiển thị tất cả phiếu khám"}
            </p>
          </div>

          {/* Date Selector Bar */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedDate(getTodayDateString())}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                selectedDate === getTodayDateString()
                  ? "bg-[#8B7CF6] text-white border-[#8B7CF6] shadow-xs"
                  : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
              )}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate("")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                selectedDate === ""
                  ? "bg-[#8B7CF6] text-white border-[#8B7CF6] shadow-xs"
                  : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
              )}
            >
              Tất cả
            </button>
            <div className="relative flex items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-neutral-200 bg-white text-neutral-700 font-medium focus:border-[#8B7CF6] outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-[#EBEBEB] bg-white p-12 flex flex-col items-center justify-center gap-3 text-neutral-400 shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
            <span className="text-sm font-semibold text-[#6B7280]">
              Đang tải danh sách phiếu khám của bệnh nhân...
            </span>
          </div>
        ) : flows.length === 0 ? (
          <div className="rounded-2xl border border-[#EBEBEB] bg-[#FAFAFA] p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#EDE9FE] flex items-center justify-center mx-auto text-[#8B7CF6]">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-[15px] font-bold text-[#374151]">
              {selectedDate === getTodayDateString()
                ? "Chưa có phiếu khám nào trong ngày hôm nay"
                : selectedDate
                  ? `Chưa có phiếu khám nào trong ngày ${selectedDate}`
                  : "Chưa có phiếu khám nào"}
            </h4>
            <p className="text-[12.5px] text-[#9CA3AF] max-w-md mx-auto">
              Bệnh nhân chưa có phiếu khám hoặc ca khám nào trong khoảng thời gian đã chọn.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {flows.map((flow) => {
              const flowBookingId =
                flow.bookingId ||
                (flow.raw as any)?.booking_id ||
                (flow.raw as any)?.booking?.booking_id;
              const flowPendingOrders = filterOrdersByBooking(
                pendingOrders,
                flowBookingId,
              );

              return (
                <div
                  key={flow.flowId}
                  className="rounded-2xl border border-[#EBEBEB] bg-white p-5 md:p-6 shadow-[0_1px_6px_rgba(0,0,0,0.04)] hover:border-[#8B7CF6]/40 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Left: Queue Number Ticket Badge & Main Info */}
                    <div className="flex items-start gap-4 sm:gap-5">
                      <div className="bg-[#F5F3FF] border border-[#8B7CF6]/20 rounded-2xl p-3.5 text-center shrink-0 min-w-[90px] shadow-xs">
                        <span className="text-[10px] font-bold text-[#8B7CF6] uppercase block">
                          Số thứ tự
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-[#8B7CF6] tracking-tight leading-none my-1">
                          {flow.ticketNo}
                        </div>
                        <span className="text-[9.5px] font-semibold text-neutral-400 block">
                          Phòng khám
                        </span>
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-[16px] font-bold text-[#1F2937] truncate">
                            {flow.specialty}
                          </h4>
                          <span
                            className={cn(
                              "text-[11px] font-bold px-2.5 py-0.5 rounded-full border",
                              flow.statusBadgeClass,
                            )}
                          >
                            {flow.statusLabel}
                          </span>
                          {flowPendingOrders.length > 0 && (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Có {flowPendingOrders.length} chỉ định cần thanh toán
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[#6B7280]">
                          <div className="flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-[#8B7CF6]" />
                            <span className="font-semibold text-[#374151]">
                              {flow.doctorLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#8B7CF6]" />
                            <span>{flow.roomLabel}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#8B7CF6]" />
                            <span>{flow.slotTimeLabel}</span>
                          </div>
                        </div>

                        {flow.steps.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {flow.steps.map((st, i) => (
                              <span
                                key={st.stepId || i}
                                className={cn(
                                  "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border",
                                  st.stepStatus === "COMPLETED" ||
                                    st.stepStatus === "DONE"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : st.stepStatus === "IN_PROGRESS" ||
                                        st.stepStatus === "PROCESSING"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-neutral-50 text-neutral-600 border-neutral-200",
                                )}
                              >
                                {st.stepStatus === "COMPLETED" ||
                                  st.stepStatus === "DONE" ? (
                                  <Check className="w-3 h-3" />
                                ) : null}
                                {st.stepName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0">
                      {flowPendingOrders.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBookingFilter(flowBookingId || "TODAY");
                            setIsOrdersModalOpen(true);
                            void loadPendingOrders();
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-bold shadow-sm transition-all cursor-pointer"
                        >
                          <Receipt className="w-4 h-4" />
                          <span>Thu tiền chỉ định ({flowPendingOrders.length})</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedFlow(flow)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-[13px] font-bold shadow-sm transition-all cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        Xem & In phiếu
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Xem chi tiết phiếu & In lại */}
      {selectedFlow && activeRegistrationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white shadow-2xl border border-neutral-150 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] flex items-center justify-center text-[#8B7CF6]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-neutral-800">
                    Chi tiết luồng & In lại phiếu khám
                  </h3>
                  <p className="text-[12px] text-neutral-500">
                    Bệnh nhân:{" "}
                    <strong className="text-neutral-800">
                      {activeRegistrationResult.fullName}
                    </strong>{" "}
                    • Mã ca:{" "}
                    <span className="font-mono">
                      {selectedFlow.flowId.slice(0, 8)}...
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFlow(null)}
                className="w-9 h-9 rounded-xl border border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - 2 Columns */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 bg-neutral-50/50">
              {/* Left: Workflow Timeline & Info (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-neutral-200/70 shadow-xs space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Trạng thái ca khám
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-neutral-800">
                      {selectedFlow.specialty}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-bold px-2.5 py-0.5 rounded-full border",
                        selectedFlow.statusBadgeClass,
                      )}
                    >
                      {selectedFlow.statusLabel}
                    </span>
                  </div>
                  <div className="border-t border-neutral-100 pt-3 space-y-2 text-[12.5px] text-neutral-600">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Bác sĩ:</span>
                      <span className="font-semibold text-neutral-800">
                        {selectedFlow.doctorLabel}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Phòng khám:</span>
                      <span className="font-semibold text-neutral-800">
                        {selectedFlow.roomLabel}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Giờ khám:</span>
                      <span className="font-semibold text-neutral-800">
                        {selectedFlow.slotTimeLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step Timeline */}
                <div className="bg-white p-5 rounded-2xl border border-neutral-200/70 shadow-xs space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                    Tiến trình các bước ({selectedFlow.steps.length})
                  </span>
                  {selectedFlow.steps.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic">
                      Chưa có thông tin bước chi tiết
                    </p>
                  ) : (
                    <div className="space-y-3 relative pl-4 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-neutral-200">
                      {selectedFlow.steps.map((st, idx) => {
                        const isDone =
                          st.stepStatus === "COMPLETED" ||
                          st.stepStatus === "DONE";
                        const isCurr =
                          st.stepStatus === "IN_PROGRESS" ||
                          st.stepStatus === "PROCESSING";
                        return (
                          <div
                            key={st.stepId || idx}
                            className="relative text-xs"
                          >
                            <div
                              className={cn(
                                "absolute -left-4 top-0.5 w-3 h-3 rounded-full border-2 border-white shadow-xs",
                                isDone
                                  ? "bg-emerald-500"
                                  : isCurr
                                    ? "bg-blue-600 animate-pulse"
                                    : "bg-neutral-300",
                              )}
                            />
                            <div className="font-bold text-neutral-800 flex items-center justify-between gap-2">
                              <span className="truncate">{st.stepName}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {st.queueNumber && (
                                  <span className="text-[10.5px] font-black text-[#8B7CF6] bg-[#F5F2FF] px-1.5 py-0.5 rounded-md border border-[#8B7CF6]/20">
                                    STT: {st.queueNumber}
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    "text-[10.5px] font-bold px-2 py-0.5 rounded-full border shrink-0 whitespace-nowrap",
                                    st.statusBadgeClass,
                                  )}
                                >
                                  {st.statusLabel}
                                </span>
                              </div>
                            </div>
                            {(st.roomName ||
                              st.doctorName ||
                              st.slotTimeLabel) && (
                              <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-neutral-500 mt-1">
                                {st.roomName && <span>📍 {st.roomName}</span>}
                                {st.doctorName && (
                                  <span>👨‍⚕️ {st.doctorName}</span>
                                )}
                                {st.slotTimeLabel && (
                                  <span>🕒 {st.slotTimeLabel}</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Ticket Preview (7 cols) */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <div className="w-full max-w-[380px] rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-lg relative overflow-hidden text-neutral-800">
                  {/* Decorative glow */}
                  <div className="absolute top-0 right-0 w-28 h-28 bg-[#8B7CF6]/10 rounded-full blur-2xl pointer-events-none" />

                  {/* Ticket Header */}
                  <div className="text-center pb-3 border-b border-neutral-100">
                    <span className="text-[10px] font-bold tracking-widest text-[#8B7CF6] uppercase block">
                      TriageFlow OPD
                    </span>
                    <h4 className="text-[14px] font-bold text-neutral-800">
                      Phiếu Đăng Ký Khám
                    </h4>
                  </div>

                  {/* Queue Number */}
                  <div className="bg-[#F5F2FF] border border-[#8B7CF6]/20 rounded-2xl p-4 text-center my-3 shadow-inner">
                    <span className="text-[10px] font-bold text-neutral-500 tracking-wider uppercase block">
                      Số Thứ Tự Của Bạn
                    </span>
                    <div className="text-[42px] font-black text-[#8B7CF6] tracking-tight leading-none my-1">
                      {activeRegistrationResult.ticketNo}
                    </div>
                  </div>

                  {/* Patient & Clinic Details */}
                  <div className="space-y-2 text-[12px] bg-neutral-50 p-3.5 rounded-xl border border-neutral-100">
                    <div className="flex justify-between py-0.5">
                      <span className="text-neutral-500 font-medium">
                        Bệnh nhân:
                      </span>
                      <span className="font-bold text-neutral-800">
                        {activeRegistrationResult.fullName.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-neutral-500 font-medium">
                        CCCD:
                      </span>
                      <span className="font-mono font-semibold text-neutral-800">
                        {activeRegistrationResult.citizenId}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-neutral-500 font-medium">
                        Khoa khám:
                      </span>
                      <span className="font-bold text-[#8B7CF6]">
                        {activeRegistrationResult.specialty}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-neutral-500 font-medium">
                        Bác sĩ:
                      </span>
                      <span className="font-semibold text-neutral-800">
                        {activeRegistrationResult.doctorLabel}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-neutral-500 font-medium">
                        Phòng khám:
                      </span>
                      <span className="font-semibold text-neutral-800">
                        {activeRegistrationResult.roomLabel}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-neutral-500 font-medium">
                        Giờ khám:
                      </span>
                      <span className="font-semibold text-neutral-800">
                        {activeRegistrationResult.slotTimeLabel}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-neutral-500 font-medium">
                        Mã vé khám:
                      </span>
                      <span className="font-semibold text-neutral-800">
                        {activeRegistrationResult.ticketCode || "—"}
                      </span>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="flex flex-col items-center justify-center my-3 py-2 border-t border-b border-dashed border-neutral-200">
                    <img
                      src={getQrImageUrl(
                        activeRegistrationResult.qrPayload,
                        100,
                      )}
                      alt="Mã QR vé khám"
                      width={100}
                      height={100}
                      className="rounded-lg shadow-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-end gap-3 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setSelectedFlow(null)}
                className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-[13px] font-semibold hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => handleDownloadPdf(activeRegistrationResult)}
                disabled={isDownloading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#8B7CF6]/30 bg-[#F5F3FF] text-[#6D28D9] text-[13px] font-bold hover:bg-[#EDE9FE] transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#8B7CF6]" />
                {isDownloading ? "Đang tải..." : "Tải PDF"}
              </button>
              <button
                type="button"
                onClick={() => handlePrint(activeRegistrationResult)}
                disabled={isPrinting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-[13px] font-bold shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                {isPrinting ? "Đang gửi in..." : "In lại phiếu khám"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Danh sách Service Orders chờ thanh toán */}
      {isOrdersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[90vh] rounded-3xl bg-white shadow-2xl border border-neutral-150 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-100 bg-white shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#EDE9FE] flex items-center justify-center text-[#8B7CF6]">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[16px] font-bold text-neutral-800">
                        Các mục cần thanh toán
                      </h3>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        {displayedOrdersInModal.length} chỉ định chờ
                      </span>
                    </div>
                    <p className="text-[12px] text-neutral-500">
                      Bệnh nhân:{" "}
                      <strong className="text-neutral-800">{patient.name}</strong>{" "}
                      • CCCD:{" "}
                      <span className="font-mono">{patient.citizenId}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOrdersModalOpen(false)}
                  className="w-9 h-9 rounded-xl border border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Booking filter tabs (nếu có nhiều ca khám) */}
              {flows.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {todayBookingId && (
                    <button
                      type="button"
                      onClick={() => setSelectedBookingFilter("TODAY")}
                      className={cn(
                        "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap border shrink-0",
                        selectedBookingFilter === "TODAY"
                          ? "bg-[#8B7CF6] text-white border-[#8B7CF6] shadow-xs"
                          : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100",
                      )}
                    >
                      Ca khám hôm nay ({todayUnpaidOrders.length})
                    </button>
                  )}
                  {flows.map((fl) => {
                    const fBookingId =
                      fl.bookingId ||
                      (fl.raw as any)?.booking_id ||
                      (fl.raw as any)?.booking?.booking_id;
                    if (!fBookingId || fBookingId === todayBookingId) return null;
                    const fUnpaid = filterOrdersByBooking(pendingOrders, fBookingId);
                    return (
                      <button
                        key={fl.flowId}
                        type="button"
                        onClick={() => setSelectedBookingFilter(fBookingId)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap border shrink-0",
                          selectedBookingFilter === fBookingId
                            ? "bg-[#8B7CF6] text-white border-[#8B7CF6] shadow-xs"
                            : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100",
                        )}
                      >
                        STT {fl.ticketNo} - {fl.specialty} ({fUnpaid.length})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 bg-neutral-50/50">
              {isLoadingOrders ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-neutral-400">
                  <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                  <span className="text-sm font-semibold text-neutral-600">
                    Đang tải danh sách chỉ định chờ thanh toán...
                  </span>
                </div>
              ) : displayedOrdersInModal.length === 0 ? (
                <div className="py-16 rounded-2xl border border-neutral-200/80 bg-white p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto text-emerald-600 mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-[15px] font-bold text-neutral-800">
                    Không có chỉ định nào chờ thanh toán
                  </h4>
                  <p className="text-[12.5px] text-neutral-500 max-w-sm mx-auto">
                    {selectedBookingFilter === "TODAY"
                      ? "Ca khám hôm nay của bệnh nhân không có chỉ định nào đang chờ thanh toán."
                      : "Tất cả các dịch vụ hoặc chỉ định khám của bệnh nhân đã được thanh toán đầy đủ hoặc chưa phát sinh."}
                  </p>
                </div>
              ) : (
                displayedOrdersInModal.map((order: any, idx: number) => {
                  const details = Array.isArray(order.serviceOrderDetails)
                    ? order.serviceOrderDetails
                    : [];
                  const pendingDetails = details.filter(
                    (d: any) => (d.status || "PENDING").toUpperCase() === "PENDING",
                  );
                  const displayDetails =
                    pendingDetails.length > 0 ? pendingDetails : details;
                  const calculatedTotal = displayDetails.reduce(
                    (sum: number, d: any) =>
                      sum +
                      (d.price_at_order ?? d.service?.price ?? 0) *
                        (d.quantity || 1),
                    0,
                  );
                  const total = calculatedTotal > 0 ? calculatedTotal : (order.total_price || 0);

                  return (
                    <div
                      key={order.service_order_id || idx}
                      className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs space-y-4"
                    >
                      {/* Order Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-[14px] font-bold text-neutral-800">
                              {order.name || "Chỉ định cận lâm sàng / Dịch vụ"}
                            </h4>
                            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Chờ thanh toán
                            </span>
                            {order.booking_id && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                                Booking: {order.booking_id.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                          {order.created_at && (
                            <p className="text-[11.5px] text-neutral-400 mt-0.5">
                              Giờ tạo:{" "}
                              {new Date(order.created_at).toLocaleTimeString(
                                "vi-VN",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] text-neutral-400 block">
                            Tổng tiền cần thu
                          </span>
                          <span className="text-[16px] font-black text-[#8B7CF6]">
                            {Number(total).toLocaleString("vi-VN")} đ
                          </span>
                        </div>
                      </div>

                      {/* Services Table / Details */}
                      {displayDetails.length > 0 && (
                        <div className="rounded-xl border border-neutral-150 overflow-hidden text-[12px]">
                          <table className="w-full text-left">
                            <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b border-neutral-150">
                              <tr>
                                <th className="py-2 px-3">Tên dịch vụ</th>
                                <th className="py-2 px-3">Mã</th>
                                <th className="py-2 px-3 text-right">
                                  Giá tiền
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                              {displayDetails.map((d: any, dIdx: number) => {
                                const sPrice =
                                  d.price_at_order ?? d.service?.price ?? 0;
                                return (
                                  <tr
                                    key={d.service_order_detail_id || dIdx}
                                    className="hover:bg-neutral-50/60"
                                  >
                                    <td className="py-2.5 px-3 font-medium text-neutral-800">
                                      {d.name ||
                                        d.service?.service_name ||
                                        "Dịch vụ"}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-neutral-500 text-[11px]">
                                      {d.service?.service_code || "—"}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-bold text-neutral-800">
                                      {Number(sPrice).toLocaleString("vi-VN")} đ
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Action Buttons: Thanh toán QR & Thanh toán tiền mặt */}
                      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
                        <button
                          type="button"
                          onClick={() => setSelectedQrOrder(order)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#8B7CF6]/30 bg-[#F5F3FF] text-[#6D28D9] text-[12.5px] font-bold hover:bg-[#EDE9FE] transition-colors cursor-pointer"
                        >
                          <QrCode className="w-4 h-4 text-[#8B7CF6]" />
                          Thanh toán QR
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentFeedback(null);
                            setConfirmingCashOrder({
                              ...order,
                              total_price: total,
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-[12.5px] font-bold shadow-xs transition-all cursor-pointer"
                        >
                          <Banknote className="w-4 h-4" />
                          Thanh toán tiền mặt
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between bg-white shrink-0">
              <button
                type="button"
                onClick={() => void loadPendingOrders()}
                disabled={isLoadingOrders}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-200 text-neutral-700 text-[12.5px] font-semibold hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={cn(
                    "w-3.5 h-3.5",
                    isLoadingOrders && "animate-spin",
                  )}
                />
                Làm mới danh sách
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOrdersModalOpen(false);
                  setPaymentFeedback(null);
                }}
                className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-900 text-white text-[13px] font-bold shadow-sm transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xác nhận thu tiền mặt cho Service Order */}
      {confirmingCashOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl border border-neutral-150 p-6 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Banknote className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-neutral-800">
                  Xác nhận thu tiền mặt
                </h3>
                <p className="text-[12px] text-neutral-500">
                  Thu tiền trực tiếp tại quầy lễ tân
                </p>
              </div>
            </div>

            {/* Order details box */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-150 space-y-2.5 text-[12.5px]">
              <div className="flex justify-between">
                <span className="text-neutral-500">Bệnh nhân:</span>
                <span className="font-bold text-neutral-800">
                  {patient.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">CCCD:</span>
                <span className="font-mono text-neutral-700">
                  {patient.citizenId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Mục chỉ định:</span>
                <span className="font-semibold text-neutral-800 text-right max-w-[200px] truncate">
                  {confirmingCashOrder.name || "Chỉ định dịch vụ"}
                </span>
              </div>
              <div className="border-t border-neutral-200/70 pt-2 flex justify-between items-baseline">
                <span className="text-neutral-500 font-medium">
                  Số tiền cần thu:
                </span>
                <span className="text-[18px] font-black text-emerald-600">
                  {Number(confirmingCashOrder.total_price || 0).toLocaleString(
                    "vi-VN",
                  )}{" "}
                  đ
                </span>
              </div>
            </div>

            {paymentFeedback?.type === "error" && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{paymentFeedback.message}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={isPayingCash}
                onClick={() => setConfirmingCashOrder(null)}
                className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-[13px] font-semibold hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isPayingCash}
                onClick={() => void handleConfirmPayCash(confirmingCashOrder)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isPayingCash ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang ghi nhận...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Xác nhận đã thu tiền</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xem mã QR PayOS cho Service Order */}
      {selectedQrOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-3xl bg-white shadow-2xl border border-neutral-150 p-6 space-y-4 text-center animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="text-left">
                <span className="text-[10px] font-bold text-[#8B7CF6] uppercase tracking-wider block">
                  Thanh toán VietQR
                </span>
                <h4 className="text-[14px] font-bold text-neutral-800 truncate max-w-[220px]">
                  {selectedQrOrder.name || "Chỉ định dịch vụ"}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQrOrder(null)}
                className="w-8 h-8 rounded-xl border border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedQrOrder.qr_code ? (
              <div className="p-3 bg-white border border-[#8B7CF6]/30 rounded-2xl shadow-inner inline-block mx-auto">
                <img
                  src={getQrImageUrl(selectedQrOrder.qr_code, 180)}
                  alt="QR thanh toán"
                  width={180}
                  height={180}
                  className="block rounded-lg"
                />
              </div>
            ) : (
              <p className="text-xs text-neutral-400 py-8 italic">
                Chưa có mã QR cho chỉ định này
              </p>
            )}

            <div>
              <span className="text-[11px] text-neutral-400 block">
                Tổng số tiền
              </span>
              <span className="text-[20px] font-black text-[#8B7CF6]">
                {Number(selectedQrOrder.total_price || 0).toLocaleString(
                  "vi-VN",
                )}{" "}
                đ
              </span>
              <p className="text-[11px] text-neutral-500 mt-1">
                Quét mã bằng ứng dụng Ngân hàng hoặc Ví điện tử
              </p>
            </div>

            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={async () => {
                  await Promise.all([loadPendingOrders(), loadFlows()]);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-200 text-neutral-700 text-[12px] font-semibold hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Kiểm tra lại
              </button>
              <button
                type="button"
                onClick={() => setSelectedQrOrder(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-900 text-white text-[12.5px] font-bold shadow-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
