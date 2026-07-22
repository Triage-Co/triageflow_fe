import React from 'react';
import { useFlowStore } from '../store/flowStore';
import { X, QrCode, Loader2, CheckCircle2, Clock } from 'lucide-react';

export const PaymentQRModal: React.FC = () => {
  const selectedPendingStep = useFlowStore((state) => state.selectedPendingStep);
  const setSelectedPendingStep = useFlowStore((state) => state.setSelectedPendingStep);
  const isPaymentChecking = useFlowStore((state) => state.isPaymentChecking);
  const verifyPaymentAndIssueTicket = useFlowStore((state) => state.verifyPaymentAndIssueTicket);

  if (!selectedPendingStep) return null;

  const qrText = selectedPendingStep.qr_text || '';
  const qrImageUrl = qrText
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrText)}`
    : '';

  const handleClose = () => {
    if (!isPaymentChecking) {
      setSelectedPendingStep(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-[36px] shadow-2xl border border-neutral-100 max-w-xl w-full p-8 sm:p-10 relative flex flex-col items-center text-center space-y-6 animate-scale-up">
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isPaymentChecking}
          className="absolute top-6 right-6 w-12 h-12 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Title */}
        <div className="space-y-1.5 pt-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-[#155DFC] rounded-full text-xs font-black mb-1 border border-blue-100">
            <QrCode className="w-4 h-4" /> Quét mã VietQR
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-[#1E2939] tracking-tight">
            {selectedPendingStep.step_name || 'Thanh toán dịch vụ'}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-500 font-bold">
            Mở ứng dụng Ngân hàng để quét mã QR chuyển khoản bên dưới
          </p>
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-5 rounded-3xl border-2 border-neutral-200 shadow-xl relative group">
          {qrImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={qrImageUrl}
              alt="Mã QR Thanh toán VietQR"
              className="w-60 h-60 sm:w-64 sm:h-64 object-contain rounded-2xl"
            />
          ) : (
            <div className="w-60 h-60 sm:w-64 sm:h-64 flex items-center justify-center bg-neutral-50 text-neutral-400 text-sm font-bold rounded-2xl">
              Không có dữ liệu mã QR
            </div>
          )}
        </div>

        {/* Waiting Status */}
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs sm:text-sm text-amber-800 flex items-center gap-3 font-extrabold w-full text-left">
          <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          <span className="leading-snug">
            Sau khi hoàn tất chuyển khoản thành công trên app ngân hàng, bấm nút bên dưới để cấp Số thứ tự.
          </span>
        </div>

        {/* Confirm Button */}
        <div className="w-full flex gap-4 pt-1">
          <button
            onClick={handleClose}
            disabled={isPaymentChecking}
            className="px-6 py-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-2xl font-black text-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            Đóng
          </button>
          <button
            onClick={verifyPaymentAndIssueTicket}
            disabled={isPaymentChecking}
            className="flex-1 py-4 px-6 bg-[#155DFC] hover:bg-blue-700 active:scale-95 text-white rounded-2xl font-black text-sm sm:text-base shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            {isPaymentChecking ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Đang kiểm tra hệ thống...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" /> Tôi đã thanh toán xong
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
