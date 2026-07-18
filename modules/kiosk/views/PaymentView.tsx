import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { PrimaryButton } from '../components/PrimaryButton';
import { 
  ArrowLeft, 
  Wallet, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Printer, 
  Navigation,
  CreditCard
} from 'lucide-react';

export const PaymentView: React.FC = () => {
  const goHome = useKioskStore((state) => state.goHome);
  const navigateToView = useKioskStore((state) => state.navigateToView);
  const paymentMethod = useKioskStore((state) => state.paymentMethod);
  const setPaymentMethod = useKioskStore((state) => state.setPaymentMethod);
  const activeBill = useKioskStore((state) => state.activeBill);
  const payBill = useKioskStore((state) => state.payBill);
  const showToast = useKioskStore((state) => state.showToast);

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-6 z-10 space-y-6">
      {/* Header bar */}
      <div className="flex items-center gap-4">
        <button 
          onClick={goHome} 
          className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full text-xs font-bold text-neutral-700 shadow-sm border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <h2 className="text-2xl font-black text-[#1E2939] tracking-tight">
          {paymentMethod === null && 'Thanh toán'}
          {paymentMethod === 'bank' && 'Thanh toán QR'}
          {paymentMethod === 'counter' && 'Hỗ trợ thanh toán'}
        </h2>
      </div>

      {/* STATE 1: 2 LỰA CHỌN THANH TOÁN (Screenshot 5 Left) */}
      {paymentMethod === null && (
        <div className="bg-white/80 backdrop-blur-md rounded-[32px] p-10 shadow-xl border border-neutral-100 text-center space-y-8 max-w-3xl mx-auto">
          <div className="space-y-2">
            <h3 className="text-xl font-extrabold text-[#1E2939]">Chọn phương thức thanh toán</h3>
            <p className="text-xs text-neutral-500 font-medium">Vui lòng chọn cách thanh toán phù hợp với bạn</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl mx-auto">
            {/* Card 1: Ngân hàng */}
            <button
              onClick={() => setPaymentMethod('bank')}
              className="p-8 bg-white rounded-[32px] border border-neutral-200/80 shadow-md hover:shadow-xl hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer flex flex-col items-center text-center space-y-4 group"
            >
              <div className="w-20 h-20 rounded-2xl bg-blue-50 text-[#155DFC] flex items-center justify-center group-hover:scale-110 transition-transform">
                <QrCode className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-[#1E2939] text-base">Thanh toán bằng ngân hàng</h4>
                <p className="text-xs text-neutral-400 font-medium">Quét mã QR bằng ứng dụng ngân hàng</p>
              </div>
            </button>

            {/* Card 2: Tiền mặt tại quầy */}
            <button
              onClick={() => setPaymentMethod('counter')}
              className="p-8 bg-white rounded-[32px] border border-neutral-200/80 shadow-md hover:shadow-xl hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer flex flex-col items-center text-center space-y-4 group"
            >
              <div className="w-20 h-20 rounded-2xl bg-blue-50 text-[#155DFC] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-[#1E2939] text-base">Thanh toán tại quầy</h4>
                <p className="text-xs text-neutral-400 font-medium">Thanh toán tiền mặt tại quầy thu ngân</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* STATE 2: THANH TOÁN QR (Screenshot 5 Right) */}
      {paymentMethod === 'bank' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-4xl mx-auto">
          {/* Left Card: QR Scanner */}
          <div className="md:col-span-6 bg-white rounded-[28px] p-8 shadow-md border border-neutral-100 flex flex-col items-center text-center space-y-4">
            <h4 className="font-extrabold text-[#1E2939] text-base">Quét mã để thanh toán</h4>
            <div className="w-56 h-56 bg-neutral-900 rounded-3xl p-4 flex items-center justify-center shadow-lg relative group">
              <QrCode className="w-48 h-48 text-white" strokeWidth={1.2} />
            </div>
            <p className="text-xs font-semibold text-neutral-400">Sử dụng ứng dụng ngân hàng để quét mã QR</p>
          </div>

          {/* Right Card: Thông tin thanh toán */}
          <div className="md:col-span-6 bg-white rounded-[28px] p-8 shadow-md border border-neutral-100 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h4 className="font-extrabold text-[#1E2939] text-base border-b border-neutral-100 pb-3">Thông tin thanh toán</h4>
              
              <div className="space-y-3 text-xs font-semibold text-neutral-600">
                <div>
                  <span className="text-neutral-400 block mb-0.5">Nội dung</span>
                  <span className="font-bold text-[#1E2939] text-sm">Xét nghiệm máu + X-Quang</span>
                </div>
                <div>
                  <span className="text-neutral-400 block mb-0.5">Mã bệnh nhân</span>
                  <span className="font-bold text-[#1E2939] text-sm">{activeBill?.patientCode || 'BN20260516001'}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block mb-0.5">Số tiền</span>
                  <span className="font-black text-2xl text-[#1E2939]">450.000 đ</span>
                </div>
              </div>

              {/* Waiting status pill */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs space-y-1 text-amber-800">
                <div className="flex items-center gap-2 font-bold">
                  <Clock className="w-4 h-4 text-amber-600" /> ⏳ Đang chờ thanh toán
                </div>
                <p className="text-[11px] text-amber-700 font-medium">Vui lòng quét mã QR bằng ứng dụng ngân hàng để hoàn tất thanh toán</p>
              </div>
            </div>

            <div className="flex gap-3">
              <PrimaryButton variant="outline" onClick={() => setPaymentMethod(null)}>
                Đổi phương thức
              </PrimaryButton>
              <PrimaryButton onClick={payBill} className="flex-1">
                Giả lập quét QR
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* STATE 3: HỖ TRỢ THANH TOÁN TẠI QUẦY (Screenshot 6 Right) */}
      {paymentMethod === 'counter' && (
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Top Blue Banner */}
          <div className="bg-[#4F80E1] text-white rounded-[28px] p-8 shadow-xl flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold backdrop-blur-md">
              👤
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black tracking-tight">Vui lòng đến quầy thu ngân số 03</h3>
              <p className="text-xs font-bold text-blue-100">để hoàn tất thanh toán</p>
            </div>

            <button 
              onClick={() => navigateToView('map')}
              className="px-5 py-2.5 bg-white text-[#155DFC] rounded-xl font-bold text-xs shadow-md hover:bg-blue-50 transition-colors cursor-pointer"
            >
              Xem bản đồ chi tiết
            </button>
            <span className="text-[11px] font-semibold text-blue-100">Tầng 1 – Khu vực sảnh chính</span>
          </div>

          {/* Bottom 3 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Thông tin thanh toán */}
            <div className="bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 space-y-4">
              <div className="flex items-center gap-2 font-bold text-[#1E2939] text-xs">
                <CreditCard className="w-4 h-4 text-[#155DFC]" />
                <span>Thông tin thanh toán</span>
              </div>
              <div className="space-y-2 text-xs font-semibold text-neutral-600">
                <div><span className="text-neutral-400 block">Nội dung</span> <span className="font-bold text-[#1E2939]">Phí khám bệnh</span></div>
                <div><span className="text-neutral-400 block">Mã bệnh nhân</span> <span className="font-bold text-[#1E2939]">BN20260516001</span></div>
                <div className="border-t border-neutral-100 pt-2"><span className="text-neutral-400 block">Số tiền cần thanh toán</span> <span className="font-black text-xl text-[#1E2939]">450.000 đ</span></div>
              </div>
            </div>

            {/* Card 2: Phiếu thanh toán */}
            <div className="bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 flex flex-col items-center text-center space-y-3">
              <h4 className="font-extrabold text-[#1E2939] text-xs">Phiếu thanh toán</h4>
              <div className="w-24 h-24 bg-amber-400 text-white rounded-2xl flex items-center justify-center p-2 shadow-inner">
                <QrCode className="w-20 h-20 text-neutral-900" strokeWidth={1.5} />
              </div>
              <span className="font-black text-[#1E2939] text-sm">PY-A12-001</span>
              <button 
                onClick={() => showToast('Đang phát lệnh in phiếu thanh toán...', 'info')}
                className="w-full py-2 bg-[#4F80E1] text-white rounded-xl font-bold text-xs shadow-md hover:bg-blue-600 transition-colors cursor-pointer"
              >
                🖨 In phiếu thanh toán
              </button>
            </div>

            {/* Card 3: Lưu ý quan trọng */}
            <div className="bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 space-y-3 text-xs font-semibold text-neutral-700">
              <h4 className="font-extrabold text-[#1E2939]">Lưu ý quan trọng:</h4>
              <div className="space-y-2 text-[11px] text-neutral-600">
                <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#155DFC] shrink-0 mt-0.5" /> Xuất trình phiếu thanh toán cho thu ngân</p>
                <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#155DFC] shrink-0 mt-0.5" /> Thanh toán số tiền: <strong>450.000 đ</strong></p>
                <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#155DFC] shrink-0 mt-0.5" /> Sau khi thanh toán, bạn sẽ nhận được phiếu khám bệnh</p>
                <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#155DFC] shrink-0 mt-0.5" /> Hệ thống sẽ tự động kích hoạt hàng đợi của bạn</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
