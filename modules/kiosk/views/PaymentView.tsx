import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { PrimaryButton } from '../components/PrimaryButton';
import {
  ArrowLeft,
  Wallet,
  QrCode,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2
} from 'lucide-react';

import { useAuthStore } from '../store/authStore';
import { useFlowStore } from '../store/flowStore';

export const PaymentView: React.FC = () => {
  const goHome = useKioskStore((state) => state.goHome);
  const navigateToView = useKioskStore((state) => state.navigateToView);

  // Dynamic Payment & State from Flow Store & Auth Store
  const paymentMethod = useFlowStore((state) => state.paymentMethod);
  const setPaymentMethod = useFlowStore((state) => state.setPaymentMethod);
  const activeBill = useFlowStore((state) => state.activeBill);
  const paymentQrData = useFlowStore((state) => state.paymentQrData);
  const patientInfo = useAuthStore((state) => state.patientInfo);
  const isPaymentChecking = useFlowStore((state) => state.isPaymentChecking);
  const verifyPaymentAndIssueTicket = useFlowStore((state) => state.verifyPaymentAndIssueTicket);

  // Tính toán hiển thị tiền & thông tin VietQR động từ API Store
  const totalAmount = paymentQrData?.amount || activeBill?.totalAmount || 0;
  const formattedAmount = totalAmount > 0 ? totalAmount.toLocaleString('vi-VN') + ' đ' : '0 đ';
  const patientCodeDisplay = activeBill?.patientCode || patientInfo?.idNumber || '---';
  const paymentContentDisplay = paymentQrData?.description || activeBill?.items?.[0]?.name || 'Dịch vụ khám bệnh';

  // URL mã QR VietQR động từ PayOS payload
  const qrCodePayload = paymentQrData?.qrCode || (paymentQrData?.orderCode ? `PAYOS:${paymentQrData.orderCode}` : '');
  const qrImageUrl = qrCodePayload ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodePayload)}` : '';

  return (
    <div className="flex-1 min-h-0 px-8 py-6 z-10 flex flex-col gap-5 max-w-6xl mx-auto w-full">
      {/* Header bar */}
      <div className="flex items-center gap-4">
        <button
          onClick={goHome}
          className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-neutral-50 rounded-2xl shadow-sm border border-neutral-200 text-sm font-extrabold text-neutral-800 transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-[#155DFC]" /> Quay lại
        </button>
        <h2 className="text-3xl font-black text-[#1E2939] tracking-tight">
          {paymentMethod === null && 'Thanh toán viện phí'}
          {paymentMethod === 'bank' && 'Thanh toán chuyển khoản QR'}
          {paymentMethod === 'counter' && 'Hỗ trợ thanh toán tại quầy'}
        </h2>
      </div>

      {/* STATE 1: LỰA CHỌN PHƯƠNG THỨC THANH TOÁN */}
      {paymentMethod === null && (
        <div className="bg-white/80 backdrop-blur-md rounded-[32px] p-10 shadow-xl border border-neutral-100 text-center space-y-8 max-w-3xl mx-auto my-auto w-full">
          <div className="space-y-2">
            <h3 className="text-2xl sm:text-3xl font-black text-[#1E2939] tracking-tight">Chọn hình thức thanh toán</h3>
            <p className="text-sm text-neutral-500 font-bold">Vui lòng chọn ngân hàng chuyển khoản hoặc đóng tại quầy</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
            {/* Card 1: Ngân hàng QR */}
            <button
              onClick={() => setPaymentMethod('bank')}
              className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-blue-50/50 rounded-3xl p-6 border border-neutral-200/80 hover:border-blue-300 shadow-sm hover:shadow-lg transition-all text-left flex flex-col justify-between min-h-[160px] cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#155DFC] flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-[#1E2939] text-base">Chuyển khoản QR</h4>
                <p className="text-xs text-neutral-400 font-medium">Quét mã QR bằng ứng dụng ngân hàng di động của bạn</p>
              </div>
            </button>

            {/* Card 2: Quầy */}
            <button
              onClick={() => setPaymentMethod('counter')}
              className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-amber-50/50 rounded-3xl p-6 border border-neutral-200/80 hover:border-amber-300 shadow-sm hover:shadow-lg transition-all text-left flex flex-col justify-between min-h-[160px] cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-[#1E2939] text-base">Thanh toán tại quầy</h4>
                <p className="text-xs text-neutral-400 font-medium">Nhận số thứ tự đóng tiền trực tiếp tại quầy thanh toán</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* STATE 2: THANH TOÁN QR CHUẨN ĐỘNG */}
      {paymentMethod === 'bank' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-4xl mx-auto my-auto w-full">
          {/* Cột trái: Khung mã QR thực tế */}
          <div className="md:col-span-6 bg-white rounded-[28px] p-8 shadow-md border border-neutral-100 flex flex-col items-center text-center space-y-4 justify-center">
            <h4 className="font-extrabold text-[#1E2939] text-base">Quét mã để thanh toán</h4>

            <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-lg relative group">
              {qrImageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={qrImageUrl}
                  alt="Mã QR Thanh toán"
                  className="w-56 h-56 object-contain rounded-xl"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center bg-neutral-50 text-neutral-400 text-xs font-semibold rounded-xl">
                  Chưa có dữ liệu mã QR
                </div>
              )}
            </div>

            <div className="space-y-1">
              {paymentQrData?.accountName && <p className="text-xs font-bold text-neutral-600">Đơn vị: {paymentQrData.accountName}</p>}
              {paymentQrData?.accountNumber && <p className="text-[11px] font-semibold text-neutral-400">Số TK: {paymentQrData.accountNumber}</p>}
            </div>
          </div>

          {/* Cột phải: Chi tiết hóa đơn & Nút bấm xác nhận */}
          <div className="md:col-span-6 bg-white rounded-[28px] p-8 shadow-md border border-neutral-100 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h4 className="font-extrabold text-[#1E2939] text-base border-b border-neutral-100 pb-3">Chi tiết thanh toán</h4>

              <div className="space-y-3 text-xs font-semibold text-neutral-600">
                <div>
                  <span className="text-neutral-400 block mb-0.5">Nội dung chuyển khoản</span>
                  <span className="font-bold text-[#1E2939] text-sm break-all">{paymentContentDisplay}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block mb-0.5">Mã bệnh nhân</span>
                  <span className="font-bold text-[#1E2939] text-sm">{patientCodeDisplay}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block mb-0.5">Tổng số tiền</span>
                  <span className="font-black text-2xl text-[#155DFC]">{formattedAmount}</span>
                </div>
              </div>

              {/* Waiting status pill */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs space-y-1 text-amber-800">
                <div className="flex items-center gap-2 font-bold">
                  <Clock className="w-4 h-4 text-amber-600" /> Đang chờ chuyển khoản
                </div>
                <p className="text-[11px] text-amber-700 font-medium">Vui lòng hoàn tất chuyển khoản, sau đó bấm nút bên dưới để cấp Số thứ tự (STT).</p>
              </div>
            </div>

            <div className="flex gap-3">
              <PrimaryButton variant="outline" onClick={() => setPaymentMethod(null)}>
                Đổi phương thức
              </PrimaryButton>
              <button
                onClick={verifyPaymentAndIssueTicket}
                disabled={isPaymentChecking}
                className="flex-1 py-3.5 px-4 bg-[#155DFC] hover:bg-blue-700 text-white rounded-2xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isPaymentChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang kiểm tra...
                  </>
                ) : (
                  "Tôi đã thanh toán xong →"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE 3: HỖ TRỢ THANH TOÁN TẠI QUẦY THU NGÂN */}
      {paymentMethod === 'counter' && (
        <div className="space-y-6 max-w-4xl mx-auto my-auto w-full">
          {/* Top Blue Banner */}
          <div className="bg-[#4F80E1] text-white rounded-[28px] p-8 shadow-xl flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold backdrop-blur-md">
              👤
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black tracking-tight">Vui lòng di chuyển đến Quầy thu ngân sảnh chính</h3>
              <p className="text-xs font-bold text-blue-100">để thực hiện thanh toán tiền mặt</p>
            </div>

            <button
              onClick={() => navigateToView('map')}
              className="px-5 py-2.5 bg-white text-[#155DFC] rounded-xl font-bold text-xs shadow-md hover:bg-blue-50 transition-colors cursor-pointer"
            >
              Xem sơ đồ chỉ dẫn bệnh viện
            </button>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Thông tin thanh toán */}
            <div className="bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 space-y-4">
              <div className="flex items-center gap-2 font-bold text-[#1E2939] text-xs">
                <CreditCard className="w-4 h-4 text-[#155DFC]" />
                <span>Thông tin hóa đơn</span>
              </div>
              <div className="space-y-2 text-xs font-semibold text-neutral-600">
                <div><span className="text-neutral-400 block">Nội dung</span> <span className="font-bold text-[#1E2939]">{paymentContentDisplay}</span></div>
                <div><span className="text-neutral-400 block">Mã bệnh nhân</span> <span className="font-bold text-[#1E2939]">{patientCodeDisplay}</span></div>
                <div className="border-t border-neutral-100 pt-2"><span className="text-neutral-400 block">Số tiền cần thanh toán</span> <span className="font-black text-xl text-[#1E2939]">{formattedAmount}</span></div>
              </div>
            </div>

            {/* Card 2: Hướng dẫn tiếp theo */}
            <div className="bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 space-y-3 text-xs font-semibold text-neutral-700 flex flex-col justify-center">
              <h4 className="font-extrabold text-[#1E2939] text-sm mb-1">Hướng dẫn tiếp theo:</h4>
              <div className="space-y-2.5 text-xs text-neutral-600">
                <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#155DFC] shrink-0 mt-0.5" /> Xuất trình Mã bệnh nhân <strong>{patientCodeDisplay}</strong> tại quầy thu ngân</p>
                <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#155DFC] shrink-0 mt-0.5" /> Thanh toán số tiền: <strong>{formattedAmount}</strong></p>
                <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#155DFC] shrink-0 mt-0.5" /> Nhân viên sẽ xác nhận và hệ thống tự động cấp Số thứ tự khám</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
