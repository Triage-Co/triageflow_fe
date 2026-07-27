import React, { useEffect, useState } from 'react';
import { X, CheckCircle, Loader2 } from 'lucide-react';
import { TransactionQrResult } from '../types/flow.types';
import { flowService } from '../services/flowService';
import { useKioskStore } from '../store/kioskStore';

interface PaymentQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrResult: TransactionQrResult | null;
  patientId: string;
  serviceOrderId: string;
  onPaymentSuccess: () => void;
}

export const PaymentQrModal: React.FC<PaymentQrModalProps> = ({
  isOpen,
  onClose,
  qrResult,
  patientId,
  serviceOrderId,
  onPaymentSuccess,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const showToast = useKioskStore((state) => state.showToast);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  useEffect(() => {
    if (!isOpen || !qrResult || !patientId || !serviceOrderId) return;

    let intervalId: NodeJS.Timeout;

    const checkPaymentStatus = async () => {
      try {
        const res = await flowService.getPendingServiceOrders(patientId);
        const data = (res as any)?.data || res;
        const pendingOrders = Array.isArray(data) ? data : [];

        // Nếu không còn tìm thấy serviceOrderId trong danh sách chờ thanh toán
        const isPaid = !pendingOrders.some(order => order.service_order_id === serviceOrderId);

        if (isPaid) {
          clearInterval(intervalId);
          showToast('Thanh toán thành công!', 'success');
          onPaymentSuccess();
          onClose();
        }
      } catch (err) {
        console.error('Error polling payment status:', err);
      }
    };

    // Bắt đầu check mỗi 3 giây
    intervalId = setInterval(checkPaymentStatus, 3000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, qrResult, patientId, serviceOrderId, onPaymentSuccess, onClose, showToast]);

  if (!isOpen || !qrResult) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-md p-6 flex flex-col gap-5 relative animate-in zoom-in-95 duration-200">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer active:scale-90"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="text-center space-y-1">
          <h3 className="text-lg font-black text-slate-800">Quét mã QR thanh toán</h3>
          <p className="text-xs text-neutral-400 font-bold">Vui lòng sử dụng ứng dụng Ngân hàng / Ví điện tử để quét</p>
        </div>

        {/* QR Code Container */}
        <div className="bg-[#F8FAFC] border border-slate-100 rounded-3xl p-6 flex flex-col items-center justify-center gap-4">
          <div className="bg-white p-4 rounded-2xl border-2 border-blue-100 shadow-sm relative">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrResult.qrCode)}`}
              alt="QR thanh toán"
              className="w-48 h-48 object-contain"
            />
          </div>

          <div className="text-center space-y-1">
            <span className="text-[10px] text-neutral-400 font-black uppercase tracking-wider block">Số tiền cần thanh toán</span>
            <span className="text-2xl font-black text-[#155DFC]">
              {formatCurrency(qrResult.amount)}
            </span>
          </div>
        </div>

        {/* Bank info */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/80 space-y-2 text-xs font-semibold text-slate-600">
          <div className="flex justify-between">
          </div>
          <div className="flex justify-between">
            <span>Số tài khoản:</span>
            <span className="font-extrabold text-slate-800">{qrResult.accountNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Chủ tài khoản:</span>
            <span className="font-extrabold text-slate-800">{qrResult.accountName}</span>
          </div>
          <div className="flex justify-between">
            <span>Nội dung chuyển khoản:</span>
            <span className="font-extrabold text-slate-800">{qrResult.description}</span>
          </div>
        </div>

        {/* Polling Indicator */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-neutral-400 font-bold">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#155DFC]" />
          Đang chờ bạn quét mã và hoàn tất giao dịch...
        </div>
      </div>
    </div>
  );
};
