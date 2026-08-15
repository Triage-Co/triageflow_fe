import React, { useEffect } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { usePackageBookingStore } from '../store/packageBookingStore';
import { ArrowLeft, ChevronRight, BriefcaseMedical, Loader2 } from 'lucide-react';

export const PackageSelectView: React.FC = () => {
  const navigateToView = useKioskStore((state) => state.navigateToView);
  const goHome = useKioskStore((state) => state.goHome);
  const { packages, isFetchingPackages, fetchPackages, selectPackage } = usePackageBookingStore();

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  return (
    <div className="w-full h-full min-h-0 p-4 sm:p-6 lg:p-8 z-10 select-none flex flex-col gap-4 sm:gap-6 max-w-7xl mx-auto overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateToView('booking_mode')}
            className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-white hover:bg-neutral-50 active:scale-95 rounded-2xl text-xs sm:text-sm font-bold text-neutral-800 shadow-md border border-neutral-100 transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-600" /> Quay lại
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1E2939] tracking-tight">
              Danh sách gói khám sức khỏe
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-neutral-500 mt-0.5">
              Vui lòng chọn một trong các gói dịch vụ được thiết kế sẵn bên dưới
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {isFetchingPackages ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-teal-600 animate-spin" />
            <p className="text-sm font-extrabold text-neutral-500">Đang tải danh sách gói khám...</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center space-y-3 bg-white/80 p-8 rounded-3xl border border-neutral-200/50 shadow-lg max-w-md">
            <div className="text-4xl">📦</div>
            <h3 className="text-lg font-black text-neutral-800">Không tìm thấy gói khám nào</h3>
            <p className="text-xs text-neutral-400 font-semibold">Hiện tại hệ thống chưa cập nhật gói khám dịch vụ. Vui lòng quay lại sau.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full items-stretch">
            {packages.map((pkg) => (
              <button
                key={pkg.package_id}
                onClick={() => selectPackage(pkg.package_id)}
                className="group relative bg-white/95 backdrop-blur-xl hover:bg-gradient-to-br hover:from-white hover:to-teal-50/30 rounded-[32px] p-6 border border-neutral-200/80 hover:border-teal-300 shadow-lg hover:shadow-xl hover:shadow-teal-500/5 transition-all duration-300 flex flex-col justify-between text-left cursor-pointer active:scale-[0.98] overflow-hidden min-h-[220px]"
              >
                <div className="space-y-3 w-full">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-lg sm:text-xl font-black text-[#1E2939] group-hover:text-teal-600 transition-colors leading-snug break-words">
                      {pkg.package_name}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-400 font-semibold leading-relaxed line-clamp-3">
                    {pkg.description || 'Chưa có mô tả cụ thể cho gói khám này.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-100 w-full group-hover:border-teal-100 transition-colors mt-6">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-extrabold">Giá trọn gói</span>
                    <span className="text-xl font-black text-teal-600">
                      {pkg.price ? pkg.price.toLocaleString('vi-VN') + ' đ' : 'Miễn phí'}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-neutral-50 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center transition-all text-neutral-600">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
