import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { usePackageBookingStore } from '../store/packageBookingStore';
import { ArrowLeft, ArrowRight, BriefcaseMedical, Loader2, FlaskConical, Stethoscope, Eye, ShieldAlert } from 'lucide-react';

export const PackageDetailView: React.FC = () => {
  const navigateToView = useKioskStore((state) => state.navigateToView);
  const { selectedPackageDetail, isFetchingPackageDetail } = usePackageBookingStore();

  const handleBack = () => {
    navigateToView('package_select');
  };

  const handleContinue = () => {
    navigateToView('package_slot_select');
  };

  // Helper to render icon based on room_type or step_type
  const getStepIcon = (roomType: string, stepType: string) => {
    switch (stepType) {
      case 'LAB_TEST':
        return <FlaskConical className="w-5 h-5 text-indigo-600" />;
      case 'IMAGING':
        return <Eye className="w-5 h-5 text-teal-600" />;
      case 'CLINICAL':
      default:
        return <Stethoscope className="w-5 h-5 text-[#155DFC]" />;
    }
  };

  const steps = selectedPackageDetail?.template?.steps || [];

  return (
    <div className="w-full h-full min-h-0 p-4 sm:p-6 lg:p-8 z-10 select-none flex flex-col justify-between max-w-7xl mx-auto gap-4 overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-white hover:bg-neutral-50 active:scale-95 rounded-2xl text-xs sm:text-sm font-bold text-neutral-800 shadow-sm border border-neutral-100 transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-600" /> Quay lại
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1E2939] tracking-tight">
              Chi tiết gói dịch vụ
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-neutral-500 mt-0.5">
              Xem chi tiết lộ trình khám trong gói
            </p>
          </div>
        </div>

        {/* TIẾP TỤC BUTTON IN TOP RIGHT HEADER */}
        {!isFetchingPackageDetail && selectedPackageDetail && (
          <button
            onClick={handleContinue}
            className="flex items-center gap-2 px-6 sm:px-8 py-3 bg-[#155DFC] hover:bg-[#2563EB] active:scale-95 text-white rounded-full text-xs sm:text-sm font-extrabold shadow-sm shadow-blue-500/25 transition-all cursor-pointer shrink-0"
          >
            Tiếp tục <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        {isFetchingPackageDetail ? (
          <div className="flex flex-col items-center justify-center space-y-4 h-full">
            <Loader2 className="w-12 h-12 text-[#155DFC] animate-spin" />
            <p className="text-sm font-extrabold text-neutral-500">Đang tải thông tin chi tiết gói khám...</p>
          </div>
        ) : !selectedPackageDetail ? (
          <div className="text-center space-y-3 bg-white p-8 rounded-[28px] sm:rounded-[36px] border border-neutral-100/80 shadow-sm max-w-md mx-auto my-12">
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-lg font-black text-neutral-800">Lỗi tải dữ liệu gói khám</h3>
            <p className="text-xs text-neutral-400 font-semibold">Không tìm thấy thông tin gói khám. Vui lòng bấm quay lại và chọn lại.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full h-full min-h-0">
            {/* Left Column: Package Info Card */}
            <div className="lg:col-span-4 bg-white rounded-[28px] sm:rounded-[36px] p-6 sm:p-7 border border-neutral-100/80 shadow-sm space-y-6">
              <div className="space-y-3.5">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#155DFC] flex items-center justify-center shadow-2xs">
                  <BriefcaseMedical className="w-7 h-7" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-[#1E2939]">
                  {selectedPackageDetail.package_name}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 font-medium leading-relaxed">
                  {selectedPackageDetail.description || 'Chưa có mô tả chi tiết.'}
                </p>
              </div>

              <div className="border-t border-neutral-100 pt-6 space-y-2">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-extrabold">Đơn giá khám trọn gói</span>
                <span className="text-3xl font-black text-[#155DFC] block">
                  {selectedPackageDetail.price ? selectedPackageDetail.price.toLocaleString('vi-VN') + ' đ' : 'Miễn phí'}
                </span>
              </div>
            </div>

            {/* Right Column: Steps Timeline */}
            <div className="lg:col-span-8 bg-white rounded-[28px] sm:rounded-[36px] p-6 sm:p-7 border border-neutral-100/80 shadow-sm space-y-5 flex flex-col max-h-[calc(100vh-200px)]">
              <div>
                <h4 className="text-base font-extrabold text-[#1E2939] tracking-tight">Lộ trình các bước khám ({steps.length})</h4>
              </div>

              {steps.length === 0 ? (
                <p className="text-xs text-neutral-400 font-medium py-4 text-center">Gói khám chưa thiết lập các bước cụ thể.</p>
              ) : (
                <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
                  <div className="space-y-3.5 py-1">
                    {steps.map((step, index) => {
                      const isFirst = index === 0;
                      return (
                        <div key={step.template_id || index} className="w-full">
                          {/* Step Card */}
                          <div className="bg-neutral-50/70 hover:bg-blue-50/30 rounded-2xl p-4 border border-neutral-200/60 hover:border-blue-300 shadow-2xs transition-all duration-200 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-2xs border border-neutral-100">
                                {getStepIcon(step.room_type, step.step_type)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-neutral-400">Bước {index + 1}</span>
                                  {isFirst && (
                                    <span className="text-[9px] bg-blue-50 text-[#155DFC] px-2 py-0.5 rounded-full font-bold border border-blue-100/80">
                                      Bắt đầu khám tại đây
                                    </span>
                                  )}
                                </div>
                                <h5 className="font-extrabold text-[#1E2939] text-sm mt-0.5">
                                  {step.step_name}
                                </h5>
                                <p className="text-[10px] text-neutral-400 font-semibold">
                                  Mã dịch vụ: {step.service_code}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
