import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { usePackageBookingStore } from '../store/packageBookingStore';
import { ArrowLeft, ArrowRight, BriefcaseMedical, Loader2, CheckCircle2, FlaskConical, Stethoscope, Eye, ShieldAlert } from 'lucide-react';

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
        return <Stethoscope className="w-5 h-5 text-emerald-600" />;
    }
  };

  const steps = selectedPackageDetail?.template?.steps || [];

  return (
    <div className="w-full min-h-screen p-6 lg:p-10 z-10 select-none flex flex-col justify-between max-w-7xl mx-auto space-y-8">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-neutral-50 active:scale-95 rounded-2xl text-sm font-bold text-neutral-800 shadow-md border border-neutral-100 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600" /> Quay lại
          </button>
          <div className="ml-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1E2939] tracking-tight">
              Chi tiết gói dịch vụ
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-neutral-500 mt-1">
              Xem lộ trình khám và các chuyên khoa bao gồm trong gói khám
            </p>
          </div>
        </div>

        {/* TIẾP TỤC BUTTON IN TOP RIGHT HEADER */}
        {!isFetchingPackageDetail && selectedPackageDetail && (
          <button
            onClick={handleContinue}
            className="flex items-center gap-2 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-2xl text-sm font-extrabold shadow-lg shadow-teal-600/20 transition-all cursor-pointer"
          >
            Tiếp tục <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center py-4">
        {isFetchingPackageDetail ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-teal-600 animate-spin" />
            <p className="text-sm font-extrabold text-neutral-500">Đang tải thông tin chi tiết gói khám...</p>
          </div>
        ) : !selectedPackageDetail ? (
          <div className="text-center space-y-3 bg-white/80 p-8 rounded-3xl border border-neutral-200/50 shadow-lg max-w-md mx-auto">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-black text-neutral-800">Lỗi tải dữ liệu gói khám</h3>
            <p className="text-xs text-neutral-400 font-semibold">Không tìm thấy thông tin gói khám. Vui lòng bấm quay lại và chọn lại.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
            {/* Left Column: Package Info Card */}
            <div className="lg:col-span-4 bg-white/95 backdrop-blur-xl rounded-[32px] p-6 border border-neutral-200/80 shadow-lg space-y-6">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
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
                <span className="text-3xl font-black text-teal-600 block">
                  {selectedPackageDetail.price ? selectedPackageDetail.price.toLocaleString('vi-VN') + ' đ' : 'Miễn phí'}
                </span>
              </div>
            </div>

            {/* Right Column: Steps Timeline */}
            <div className="lg:col-span-8 bg-white/90 backdrop-blur-xl rounded-[32px] p-6 border border-neutral-200/80 shadow-lg space-y-6">
              <div>
                <h4 className="text-base font-extrabold text-[#1E2939] tracking-tight">Lộ trình các bước khám ({steps.length})</h4>
                <p className="text-xs text-neutral-400 font-semibold mt-0.5">Bệnh nhân sẽ di chuyển tuần tự qua các phòng khám sau</p>
              </div>

              {steps.length === 0 ? (
                <p className="text-xs text-neutral-400 font-medium py-4">Gói khám chưa thiết lập các bước cụ thể.</p>
              ) : (
                <div className="relative pl-6 border-l-2 border-neutral-100 space-y-5 py-2">
                  {steps.map((step, index) => {
                    const isFirst = index === 0;
                    return (
                      <div key={step.template_id || index} className="relative group">
                        {/* Circle Bullet Marker */}
                        <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white bg-teal-600 shadow-md group-hover:scale-125 transition-transform flex items-center justify-center">
                          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                        </span>

                        {/* Step Card */}
                        <div className="bg-white rounded-2xl p-4 border border-neutral-100 hover:border-teal-200 shadow-sm transition-all duration-300 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center shrink-0">
                              {getStepIcon(step.room_type, step.step_type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-neutral-400">Bước {index + 1}</span>
                                {isFirst && (
                                  <span className="text-[9px] bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-bold border border-teal-100">
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
