import React from 'react';
import { X, CreditCard, ShoppingBag, Loader2 } from 'lucide-react';
import { ServiceOrder } from '../types/flow.types';
import { formatVND } from '../utils/kioskHelpers';

interface ServiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingServiceOrders: ServiceOrder[];
  onSelectPay: (serviceOrderId: string, qrCode: string, amount: number) => void;
  isFetching: boolean;
  activeBookingId?: string | null;
}

export const ServiceOrderModal: React.FC<ServiceOrderModalProps> = ({
  isOpen,
  onClose,
  pendingServiceOrders,
  onSelectPay,
  isFetching,
  activeBookingId,
}) => {
  if (!isOpen) return null;

  const unpaidOrders = pendingServiceOrders.filter((order) => {
    if (activeBookingId && order.booking_id !== activeBookingId) {
      return false;
    }
    return order.serviceOrderDetails.some((detail) => detail.status === 'PENDING');
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#155DFC] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Các mục cần thanh toán</h3>
              <p className="text-[10px] text-slate-400 font-bold">Danh sách dịch vụ chỉ định từ Bác sĩ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isFetching ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 text-[#155DFC] animate-spin" />
              <p className="text-slate-500 font-bold text-xs">Đang tải danh sách hóa đơn chỉ định...</p>
            </div>
          ) : unpaidOrders.length > 0 ? (
            unpaidOrders.map((order) => {
              const pendingDetails = order.serviceOrderDetails.filter((d) => d.status === 'PENDING');
              const calculatedTotalPrice = pendingDetails.reduce(
                (sum, d) => sum + (d.price_at_order || 0) * (d.quantity || 1),
                0
              );
              const displayTotal = calculatedTotalPrice > 0 ? calculatedTotalPrice : order.total_price;

              return (
                <div key={order.service_order_id} className="bg-slate-50/50 border border-slate-100 rounded-3xl p-5 hover:border-blue-200 transition-all flex flex-col justify-between gap-4">

                  {/* Bill Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl font-bold">
                        Chờ thanh toán
                      </span>
                      <span className="text-[10px] font-bold text-neutral-400">
                        Ngày tạo: {new Date(order.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>

                    <div className="border-t border-slate-200 border-dashed my-2" />

                    {/* Services Items list inside Order */}
                    <div className="space-y-2">
                      {pendingDetails.map((detail) => {
                        const resolvedInfo = {
                          name: detail.name || order.name || 'Dịch vụ chỉ định',
                          price: detail.price_at_order || 0
                        };
                        return (
                          <div key={detail.service_order_detail_id} className="flex justify-between items-start text-xs py-1">
                            <div className="space-y-0.5 max-w-[70%]">
                              <p className="font-extrabold text-slate-800">{resolvedInfo.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold">Số lượng: {detail.quantity || 1}</p>
                            </div>
                            <span className="font-black text-slate-700">
                              {formatVND(resolvedInfo.price * (detail.quantity || 1))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary & Pay Button */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200/60 mt-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Tổng thanh toán</span>
                      <span className="text-xl font-black text-slate-900">
                        {formatVND(displayTotal)}
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectPay(order.service_order_id, order.qr_code, displayTotal)}
                      className="px-6 py-3.5 bg-[#155DFC] hover:bg-blue-700 active:scale-95 text-white rounded-2xl font-black text-xs shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" /> Thanh toán QR ngay
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-20 text-center space-y-2">
              <div className="text-4xl">🎉</div>
              <p className="text-slate-800 font-black text-sm">Bạn đã thanh toán toàn bộ dịch vụ chỉ định</p>
              <p className="text-slate-400 text-xs font-semibold">Không tìm thấy yêu cầu thanh toán dịch vụ nào đang chờ.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
