import React from 'react';
import {
  X,
  Receipt,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  QrCode,
  Loader2,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { BillingVisit, BillingOrderItem } from '../types/invoice.types';
import { formatVND } from '../utils/kioskHelpers';
import { cn } from '@/lib/utils';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitBilling: BillingVisit | null;
  selectedOrder?: BillingOrderItem | null;
  isLoading?: boolean;
  onSelectPay?: (orderId: string, qrCode?: string, amount?: number) => void;
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
        label: status || 'Chưa xác định',
        className: 'bg-slate-50 text-slate-700 border-slate-200',
      };
  }
};

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  isOpen,
  onClose,
  visitBilling,
  selectedOrder,
  isLoading = false,
  onSelectPay,
}) => {
  if (!isOpen) return null;

  const orders = selectedOrder
    ? [selectedOrder]
    : visitBilling?.orders || [];

  const totalAmount = selectedOrder
    ? selectedOrder.amount
    : visitBilling?.total_amount ?? 0;

  const paidAmount = selectedOrder
    ? selectedOrder.payment_status?.toUpperCase() === 'PAID' ||
      selectedOrder.payment_status?.toUpperCase() === 'SUCCESSED'
      ? selectedOrder.amount
      : 0
    : visitBilling?.paid_amount ?? 0;

  const unpaidAmount = selectedOrder
    ? selectedOrder.payment_status?.toUpperCase() === 'PAID' ||
      selectedOrder.payment_status?.toUpperCase() === 'SUCCESSED'
      ? 0
      : selectedOrder.amount
    : visitBilling?.unpaid_amount ?? 0;

  const overallStatus = selectedOrder
    ? selectedOrder.payment_status
    : visitBilling?.visit_payment_status;

  const statusBadge = getPaymentStatusBadge(overallStatus);

  const formattedDate = visitBilling?.visit_date
    ? new Date(visitBilling.visit_date).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-blue-50/40 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#155DFC] flex items-center justify-center border border-blue-100/80 shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">
                Chi tiết hóa đơn viện phí
              </h3>
              <p className="text-[11px] text-slate-500 font-bold">
                Bảng kê chi tiết các khoản mục dịch vụ và thanh toán
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer active:scale-90"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 text-[#155DFC] animate-spin" />
              <p className="text-slate-600 font-bold text-sm">Đang tải thông tin hóa đơn...</p>
            </div>
          ) : !visitBilling && !selectedOrder ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
              <div className="w-20 h-20 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <Receipt className="w-10 h-10" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-lg font-black text-slate-800">Không tìm thấy thông tin hóa đơn</h4>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                  Hệ thống chưa ghi nhận thông tin hóa đơn cho lượt khám này.
                </p>
              </div>
            </div>
          ) : (
            <>


              {/* Service Orders Breakdown */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Layers className="w-4 h-4 text-[#155DFC]" />
                  <h4 className="text-sm sm:text-base font-black text-slate-900">
                    Bảng kê dịch vụ chi tiết ({orders.length} đơn chỉ định)
                  </h4>
                </div>

                {orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.map((order, oIdx) => {
                      const orderBadge = getPaymentStatusBadge(order.payment_status);
                      const isUnpaid =
                        order.payment_status?.toUpperCase() !== 'PAID' &&
                        order.payment_status?.toUpperCase() !== 'SUCCESSED';
                      const details = order.service_order_details || [];

                      return (
                        <div
                          key={order.service_order_id || oIdx}
                          className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-200/60">
                            <div className="space-y-0.5">
                              <span className="text-xs sm:text-sm font-black text-slate-900">
                                {order.name || `Đơn chỉ định #${oIdx + 1}`}
                              </span>
                              {order.type && (
                                <span className="text-[10px] font-bold text-slate-400 block">
                                  Loại: {order.type}
                                </span>
                              )}
                            </div>

                            <span
                              className={cn(
                                'px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold border shrink-0',
                                orderBadge.className
                              )}
                            >
                              {orderBadge.label}
                            </span>
                          </div>

                          {/* Line items */}
                          {details.length > 0 ? (
                            <div className="space-y-1.5 divide-y divide-slate-100">
                              {details.map((detail, dIdx) => (
                                <div
                                  key={dIdx}
                                  className="flex items-center justify-between text-xs pt-1.5 first:pt-0"
                                >
                                  <div className="flex items-center gap-1.5 text-slate-700 flex-1 mr-3">
                                    <span className="text-slate-400">•</span>
                                    <span className="font-semibold text-slate-800">
                                      {detail.name || 'Dịch vụ'}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-medium">
                                      (x{detail.quantity})
                                    </span>
                                  </div>
                                  <span className="font-black text-slate-800 shrink-0">
                                    {formatVND(detail.sub_total || detail.unit_price * detail.quantity)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span>Phí dịch vụ trọn gói</span>
                              <span className="font-bold text-slate-800">
                                {formatVND(order.amount)}
                              </span>
                            </div>
                          )}

                          {/* Order Footer */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/60">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-500">Thành tiền:</span>
                              <span className="text-sm font-black text-slate-900">
                                {formatVND(order.amount)}
                              </span>
                            </div>

                            {isUnpaid && onSelectPay && (
                              <button
                                onClick={() =>
                                  onSelectPay(
                                    order.service_order_id,
                                    order.invoice?.invoice_id,
                                    order.amount
                                  )
                                }
                                className="px-3.5 py-1.5 bg-[#155DFC] hover:bg-blue-700 active:scale-95 text-white rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                Thanh toán mục này
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6 font-medium">
                    Không có đơn chỉ định nào trong hóa đơn này.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 text-xs sm:text-sm font-bold transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
