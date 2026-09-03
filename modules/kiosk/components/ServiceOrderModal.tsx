import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  ShoppingBag,
  Loader2,
  Receipt,
  Layers,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCw,
} from 'lucide-react';
import { ServiceOrder } from '../types/flow.types';
import { formatVND } from '../utils/kioskHelpers';
import { invoiceService } from '../services/invoiceService';
import { flowService } from '../services/flowService';
import { useAuthStore } from '../store/authStore';
import { BillingVisit, BillingOrderItem } from '../types/invoice.types';
import { cn } from '@/lib/utils';

interface ServiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingServiceOrders: ServiceOrder[];
  onSelectPay: (serviceOrderId: string, qrCode: string, amount: number) => void;
  isFetching: boolean;
  activeBookingId?: string | null;
  defaultTab?: 'pending' | 'invoice';
}

const getPaymentStatusBadge = (status?: string) => {
  switch (status?.toUpperCase()) {
    case 'PAID':
    case 'SUCCESSED':
      return {
        label: 'Đã thanh toán',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'PARTIAL':
      return {
        label: 'Thanh toán một phần',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    case 'UNPAID':
    case 'PENDING':
      return {
        label: 'Chờ thanh toán',
        className: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    case 'CANCELLED':
      return {
        label: 'Đã hủy',
        className: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    default:
      return {
        label: status || 'Chờ thanh toán',
        className: 'bg-amber-50 text-amber-800 border-amber-200',
      };
  }
};

export const ServiceOrderModal: React.FC<ServiceOrderModalProps> = ({
  isOpen,
  onClose,
  pendingServiceOrders: initialPendingOrders,
  onSelectPay,
  isFetching: initialIsFetching,
  activeBookingId,
  defaultTab = 'pending',
}) => {
  const patientId = useAuthStore((state) => state.patientId);

  // Tab State: 'pending' (Cần thanh toán) hoặc 'invoice' (Hóa đơn)
  const [activeTab, setActiveTab] = useState<'pending' | 'invoice'>(defaultTab);

  // Dữ liệu cho Tab Cần thanh toán
  const [pendingOrders, setPendingOrders] = useState<ServiceOrder[]>(initialPendingOrders);
  const [isLoadingPending, setIsLoadingPending] = useState(initialIsFetching);

  // Dữ liệu cho Tab Hóa đơn
  const [visitBillingData, setVisitBillingData] = useState<BillingVisit | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);

  // Đồng bộ defaultTab khi mở modal
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // Cập nhật initial pending orders
  useEffect(() => {
    setPendingOrders(initialPendingOrders);
  }, [initialPendingOrders]);

  // Hàm gọi API lấy danh sách cần thanh toán
  const fetchPendingOrders = async () => {
    if (!patientId) return;
    setIsLoadingPending(true);
    try {
      const res = await flowService.getPendingServiceOrders(patientId);
      const data = (res as any)?.data || res;
      const orders = Array.isArray(data) ? data : [];
      setPendingOrders(orders);
    } catch (err) {
      console.warn('Lỗi khi tải danh sách đơn dịch vụ cần thanh toán:', err);
    } finally {
      setIsLoadingPending(false);
    }
  };

  // Hàm gọi API lấy thông tin hóa đơn
  const fetchInvoiceData = async () => {
    if (!patientId) return;
    setIsLoadingInvoice(true);
    try {
      // 1. Thử lấy hóa đơn theo booking_id
      if (activeBookingId) {
        const res = await invoiceService.getPatientVisitBilling(patientId, activeBookingId);
        const visit = (res as any)?.data?.visit || (res as any)?.visit;
        if (visit) {
          setVisitBillingData(visit);
          return;
        }
      }

      // 2. Thử lấy tổng hợp hóa đơn của bệnh nhân
      const resBilling = await invoiceService.getPatientBilling(patientId);
      const visits = (resBilling as any)?.data?.visits || (resBilling as any)?.visits;
      if (Array.isArray(visits) && visits.length > 0) {
        const matched = activeBookingId
          ? visits.find((v: any) => v.booking_id === activeBookingId)
          : visits[0];
        setVisitBillingData(matched || visits[0]);
        return;
      }

      setVisitBillingData(null);
    } catch (err) {
      console.warn('Lỗi khi tải thông tin hóa đơn viện phí:', err);
      setVisitBillingData(null);
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  // Tự động gọi API tương ứng khi chuyển Tab hoặc mở modal
  useEffect(() => {
    if (!isOpen || !patientId) return;

    if (activeTab === 'pending') {
      fetchPendingOrders();
    } else if (activeTab === 'invoice') {
      fetchInvoiceData();
    }
  }, [isOpen, activeTab, patientId, activeBookingId]);

  if (!isOpen) return null;

  // Lọc các đơn chưa thanh toán
  const unpaidOrders = pendingOrders.filter((order) => {
    if (activeBookingId && order.booking_id && order.booking_id !== activeBookingId) {
      // Nếu có booking_id khác thì chỉ lọc nếu danh sách có nhiều booking
    }
    const hasPendingDetail = order.serviceOrderDetails?.some(
      (d) => d.status?.toUpperCase() === 'PENDING'
    );
    const isOrderPending = order.payment_status?.toUpperCase() === 'PENDING';
    return hasPendingDetail || isOrderPending;
  });

  // Tính tổng tiền toàn bộ các đơn cần thanh toán
  const totalPendingAmount = unpaidOrders.reduce((total, order) => {
    const pDetails = order.serviceOrderDetails?.filter((d) => d.status?.toUpperCase() === 'PENDING') || [];
    const sub = pDetails.reduce((s, d) => s + (d.price_at_order || 0) * (d.quantity || 1), 0);
    return total + (sub > 0 ? sub : order.total_price || 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-200 select-none">
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] h-[86vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-50/50 via-slate-50 to-emerald-50/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#155DFC] flex items-center justify-center border border-blue-100/80 shadow-xs">
              {activeTab === 'pending' ? <ShoppingBag className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">
                {activeTab === 'pending' ? 'Các mục cần thanh toán' : 'Hóa đơn viện phí'}
              </h3>
              <p className="text-[11px] text-slate-500 font-bold">
                {activeTab === 'pending'
                  ? 'Danh sách các dịch vụ chỉ định y tế đang chờ thanh toán'
                  : 'Bảng kê chi tiết các khoản mục chi phí của lần khám'}
              </p>
            </div>
          </div>

          {/* 2 Tabs Segmented Control */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-slate-200/70 rounded-2xl border border-slate-200">
              <button
                onClick={() => setActiveTab('pending')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer',
                  activeTab === 'pending'
                    ? 'bg-white text-[#155DFC] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                )}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Cần thanh toán
                {unpaidOrders.length > 0 && (
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-black',
                    activeTab === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-300 text-slate-700'
                  )}>
                    {unpaidOrders.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('invoice')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer',
                  activeTab === 'invoice'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                )}
              >
                <Receipt className="w-3.5 h-3.5" />
                Hóa đơn
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-all cursor-pointer active:scale-90 ml-1"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body - Single Screen Full Width Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 bg-slate-50/50">
          {/* ════════════════════════════════════════════════════════
              TAB 1: CÁC MỤC CẦN THANH TOÁN (FULL SCREEN)
              ════════════════════════════════════════════════════════ */}
          {activeTab === 'pending' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              {isLoadingPending ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-10 h-10 text-[#155DFC] animate-spin" />
                  <p className="text-slate-600 font-bold text-sm">Đang tải danh sách cần thanh toán...</p>
                </div>
              ) : unpaidOrders.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
                  <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-1.5 max-w-md">
                    <h4 className="text-lg font-black text-slate-800">Không có khoản nào cần thanh toán</h4>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                      Bạn hiện không có đơn dịch vụ hoặc chỉ định nào đang chờ thanh toán tại Kiosk.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('invoice')}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Receipt className="w-4 h-4 text-[#155DFC]" />
                    Xem lịch sử hóa đơn
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {unpaidOrders.map((order, idx) => {
                    const pendingDetails = order.serviceOrderDetails?.filter(
                      (d) => d.status?.toUpperCase() === 'PENDING'
                    ) || [];

                    const calculatedTotal = pendingDetails.reduce(
                      (sum, d) => sum + (d.price_at_order || 0) * (d.quantity || 1),
                      0
                    ) || order.total_price || 0;

                    return (
                      <div
                        key={order.service_order_id || idx}
                        className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between gap-4"
                      >
                        {/* Order Header */}
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="space-y-1">
                            <h4 className="text-base font-black text-slate-900">
                              {order.name || `Đơn chỉ định #${idx + 1}`}
                            </h4>
                            <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                              <span>Mã đơn: <strong className="font-mono text-slate-600">{order.service_order_id.slice(0, 8)}...</strong></span>
                              <span>•</span>
                              <span>Ngày tạo: <strong className="text-slate-600">{new Date(order.created_at).toLocaleString('vi-VN')}</strong></span>
                            </div>
                          </div>

                          <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-extrabold shrink-0">
                            Chờ thanh toán
                          </span>
                        </div>

                        {/* List of services in order */}
                        <div className="space-y-2 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                          {pendingDetails.length > 0 ? (
                            pendingDetails.map((detail) => (
                              <div
                                key={detail.service_order_detail_id}
                                className="flex justify-between items-center text-xs py-1"
                              >
                                <div className="space-y-0.5 max-w-[70%]">
                                  <p className="font-extrabold text-slate-800">
                                    • {detail.name || order.name || 'Dịch vụ chỉ định'}
                                  </p>
                                  <p className="text-[11px] text-slate-400 font-medium pl-2.5">
                                    Số lượng: {detail.quantity || 1} • Đơn giá: {formatVND(detail.price_at_order || 0)}
                                  </p>
                                </div>
                                <span className="font-black text-slate-900 text-sm">
                                  {formatVND((detail.price_at_order || 0) * (detail.quantity || 1))}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="flex justify-between items-center text-xs py-1">
                              <span className="font-bold text-slate-800">• {order.name || 'Dịch vụ chỉ định'}</span>
                              <span className="font-black text-slate-900 text-sm">{formatVND(calculatedTotal)}</span>
                            </div>
                          )}
                        </div>

                        {/* Order Total & Pay button */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                              Số tiền cần thanh toán
                            </span>
                            <span className="text-xl font-black text-slate-900">
                              {formatVND(calculatedTotal)}
                            </span>
                          </div>

                          <button
                            onClick={() => onSelectPay(order.service_order_id, order.qr_code, calculatedTotal)}
                            className="px-6 py-3.5 bg-[#155DFC] hover:bg-blue-700 active:scale-95 text-white rounded-2xl font-black text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-2"
                          >
                            <CreditCard className="w-4 h-4" />
                            Thanh toán QR ngay
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              TAB 2: HÓA ĐƠN VIỆN PHÍ (FULL SCREEN)
              ════════════════════════════════════════════════════════ */}
          {activeTab === 'invoice' && (
            <div className="space-y-5 max-w-3xl mx-auto">
              {isLoadingInvoice ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-10 h-10 text-[#155DFC] animate-spin" />
                  <p className="text-slate-600 font-bold text-sm">Đang tra cứu chi tiết hóa đơn...</p>
                </div>
              ) : !visitBillingData && unpaidOrders.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
                  <div className="w-20 h-20 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center">
                    <Receipt className="w-10 h-10" />
                  </div>
                  <div className="space-y-1.5 max-w-md">
                    <h4 className="text-lg font-black text-slate-800">Chưa có hóa đơn cho lượt khám này</h4>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                      Hệ thống sẽ cập nhật hóa đơn khi bác sĩ hoàn thành các chỉ định dịch vụ hoặc đơn thuốc.
                    </p>
                  </div>
                </div>
              ) : (
                <>


                  {/* Line Items Breakdown Table */}
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-black text-slate-700 uppercase">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#155DFC]" />
                        <span>Bảng kê chi tiết các khoản dịch vụ & viện phí</span>
                      </div>
                      <span>Thành tiền</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {visitBillingData?.orders && visitBillingData.orders.length > 0 ? (
                        visitBillingData.orders.map((order, oIdx) => (
                          <div key={order.service_order_id || oIdx} className="p-4 sm:p-5 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-slate-900 text-sm">
                                {oIdx + 1}. {order.name || 'Đơn chỉ định dịch vụ'}
                              </span>
                              <span
                                className={cn(
                                  'px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border',
                                  getPaymentStatusBadge(order.payment_status).className
                                )}
                              >
                                {getPaymentStatusBadge(order.payment_status).label}
                              </span>
                            </div>

                            {/* Sub details */}
                            {order.service_order_details && order.service_order_details.length > 0 ? (
                              <div className="space-y-1.5 pl-3 border-l-2 border-slate-200/80">
                                {order.service_order_details.map((detail, dIdx) => (
                                  <div key={dIdx} className="flex justify-between items-center text-xs">
                                    <span className="text-slate-600 font-medium">
                                      • {detail.name || 'Dịch vụ'} <span className="text-slate-400 font-normal">(x{detail.quantity})</span>
                                    </span>
                                    <span className="font-bold text-slate-800">
                                      {formatVND(detail.sub_total || detail.unit_price * detail.quantity)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            <div className="flex justify-between items-center pt-2 text-xs font-bold text-slate-500">
                              <span>Tổng đơn này:</span>
                              <span className="font-black text-slate-900 text-sm">{formatVND(order.amount)}</span>
                            </div>
                          </div>
                        ))
                      ) : unpaidOrders.length > 0 ? (
                        // Fallback từ các orders chưa thanh toán
                        unpaidOrders.map((order, oIdx) => {
                          const pDetails = order.serviceOrderDetails?.filter(
                            (d) => d.status?.toUpperCase() === 'PENDING'
                          ) || [];
                          const calculated = pDetails.reduce(
                            (s, d) => s + (d.price_at_order || 0) * (d.quantity || 1),
                            0
                          ) || order.total_price || 0;

                          return (
                            <div key={order.service_order_id || oIdx} className="p-4 sm:p-5 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-slate-900 text-sm">
                                  {oIdx + 1}. {order.name || 'Đơn chỉ định dịch vụ'}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border bg-amber-50 text-amber-800 border-amber-200">
                                  Chờ thanh toán
                                </span>
                              </div>

                              <div className="space-y-1.5 pl-3 border-l-2 border-slate-200/80">
                                {pDetails.map((detail) => (
                                  <div key={detail.service_order_detail_id} className="flex justify-between items-center text-xs">
                                    <span className="text-slate-600 font-medium">
                                      • {detail.name || order.name || 'Dịch vụ'} <span className="text-slate-400 font-normal">(x{detail.quantity || 1})</span>
                                    </span>
                                    <span className="font-bold text-slate-800">
                                      {formatVND((detail.price_at_order || 0) * (detail.quantity || 1))}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <div className="flex justify-between items-center pt-2 text-xs font-bold text-slate-500">
                                <span>Tổng đơn này:</span>
                                <span className="font-black text-slate-900 text-sm">{formatVND(calculated)}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center text-slate-400 text-xs font-medium">
                          Không có khoản mục nào trong hóa đơn này.
                        </div>
                      )}
                    </div>
                  </div>


                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 text-xs sm:text-sm font-bold transition-all cursor-pointer"
          >
            Đóng
          </button>

          {activeTab === 'pending' && unpaidOrders.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400">
                Tổng {unpaidOrders.length} đơn: <strong className="text-slate-900 text-base font-black">{formatVND(totalPendingAmount)}</strong>
              </span>
              <button
                onClick={() => {
                  const first = unpaidOrders[0];
                  onSelectPay(first.service_order_id, first.qr_code, totalPendingAmount);
                }}
                className="px-6 py-3 bg-[#155DFC] hover:bg-blue-700 active:scale-95 text-white rounded-2xl font-black text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Thanh toán tất cả
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
