import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { useFlowStore } from '../store/flowStore';
import { PendingPaymentStep } from '../types/flow.types';
import { 
  ArrowLeft, 
  CreditCard, 
  Clock, 
  QrCode, 
  Loader2, 
  CheckCircle2,
  Receipt,
  ChevronRight
} from 'lucide-react';

export const PendingBillsView: React.FC = () => {
  const goHome = useKioskStore((state) => state.goHome);
  const pendingPaymentSteps = useFlowStore((state) => state.pendingPaymentSteps);
  const isFetchingPendingSteps = useFlowStore((state) => state.isFetchingPendingSteps);
  const selectPendingStep = useFlowStore((state) => state.selectPendingStep);

  return (
    <div className="flex-1 min-h-0 px-8 py-6 z-10 flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Header bar */}
      <div className="flex items-center gap-5">
        <button 
          onClick={goHome} 
          className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-neutral-50 rounded-2xl shadow-sm border border-neutral-200 text-base font-extrabold text-neutral-800 transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 text-[#155DFC]" /> Quay lại
        </button>
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#1E2939] tracking-tight">
            Thanh toán viện phí & dịch vụ
          </h2>
          <p className="text-sm text-neutral-500 font-bold mt-1">
            Vui lòng chọn dịch vụ chưa thanh toán bên dưới để mở mã QR thanh toán
          </p>
        </div>
      </div>

      {/* Loading state */}
      {isFetchingPendingSteps ? (
        <div className="flex-1 flex flex-col items-center justify-center p-16 bg-white/80 backdrop-blur-xl rounded-[36px] border border-neutral-100 shadow-2xl space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center text-[#155DFC]">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-2xl font-black text-[#1E2939]">Đang nạp dữ liệu...</h3>
            <p className="text-sm font-bold text-neutral-400">Vui lòng chờ trong giây lát</p>
          </div>
        </div>
      ) : pendingPaymentSteps.length === 0 ? (
        /* Empty state - Styled for Kiosk Display */
        <div className="flex-1 flex flex-col items-center justify-center p-14 bg-white/90 backdrop-blur-xl rounded-[36px] border border-neutral-100/80 shadow-2xl space-y-6 text-center max-w-2xl mx-auto w-full my-auto">
          <div className="w-24 h-24 rounded-3xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-12 h-12" strokeWidth={2.5} />
          </div>

          <div className="space-y-2 max-w-lg">
            <h3 className="text-2xl sm:text-3xl font-black text-[#1E2939] tracking-tight">
              Không có khoản chưa thanh toán
            </h3>
            <p className="text-sm sm:text-base text-neutral-500 font-bold leading-relaxed">
              Bạn hiện không có dịch vụ hoặc bước khám nào đang chờ thanh toán tại Kiosk.
            </p>
          </div>

          <button
            onClick={goHome}
            className="mt-2 px-10 py-4 bg-[#155DFC] hover:bg-blue-700 active:scale-95 text-white rounded-2xl font-black text-base shadow-xl shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-3"
          >
            Về trang chủ Kiosk
          </button>
        </div>
      ) : (
        /* List of pending payment steps */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {pendingPaymentSteps.map((step: PendingPaymentStep) => {
            const formattedDate = step.created_at
              ? new Date(step.created_at).toLocaleString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })
              : '---';

            return (
              <div
                key={step.step_id}
                onClick={() => selectPendingStep(step)}
                className="bg-white/90 backdrop-blur-md rounded-[32px] p-8 border border-neutral-200/80 shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between space-y-6 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#155DFC] flex items-center justify-center shrink-0 group-hover:bg-[#155DFC] group-hover:text-white transition-all shadow-sm">
                      <Receipt className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-[#1E2939] group-hover:text-[#155DFC] transition-colors leading-snug">
                        {step.step_name || 'Dịch vụ cần thanh toán'}
                      </h3>
                      <p className="text-xs font-extrabold text-neutral-400 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-neutral-400" /> {formattedDate}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-200/80 text-amber-700 text-xs font-black rounded-full shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    Chờ thanh toán
                  </span>
                </div>

                <div className="pt-5 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-neutral-400">
                    Chạm để xem mã QR quét ngân hàng
                  </span>
                  <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-50 text-[#155DFC] group-hover:bg-[#155DFC] group-hover:text-white transition-all font-black text-xs">
                    <QrCode className="w-4 h-4" /> Thanh toán <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
