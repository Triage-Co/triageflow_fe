import React, { useEffect } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { usePackageBookingStore } from '../store/packageBookingStore';
import { ArrowLeft, CreditCard, Loader2, Calendar, Clock, AlertTriangle } from 'lucide-react';

export const PackageSlotSelectView: React.FC = () => {
  const navigateToView = useKioskStore((state) => state.navigateToView);
  const {
    slots,
    isFetchingSlots,
    selectedDate,
    selectedSlotId,
    selectDate,
    selectSlot,
    executePackageBooking,
    isBookingProcessing
  } = usePackageBookingStore();

  // Tạo danh sách 8 ngày (Hôm nay + 7 ngày kế tiếp)
  const daysList = React.useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 0; i < 8; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const formatted = `${year}-${month}-${day}`;
      
      let dayLabel = '';
      if (i === 0) dayLabel = 'Hôm nay';
      else if (i === 1) dayLabel = 'Ngày mai';
      else {
        const dayOfWeek = d.getDay();
        const vietnameseDays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        dayLabel = vietnameseDays[dayOfWeek];
      }

      const dateStr = `${day}/${month}`;
      
      days.push({
        dateValue: formatted,
        dayLabel,
        dateStr
      });
    }
    return days;
  }, []);

  // Tự động chọn ngày đầu tiên nếu chưa chọn ngày nào
  useEffect(() => {
    if (!selectedDate && daysList.length > 0) {
      selectDate(daysList[0].dateValue);
    }
  }, [selectedDate, daysList, selectDate]);

  return (
    <div className="w-full min-h-screen p-6 lg:p-10 z-10 select-none flex flex-col justify-between max-w-7xl mx-auto space-y-8">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateToView('package_detail')}
            className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-neutral-50 active:scale-95 rounded-2xl text-sm font-bold text-neutral-800 shadow-md border border-neutral-100 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600" /> Quay lại
          </button>
          <div className="ml-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1E2939] tracking-tight">
              Chọn lịch khám hẹn
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-neutral-500 mt-1">
              Vui lòng chọn ngày khám và khung giờ khám mong muốn bên dưới
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-teal-50/80 px-4 py-2 rounded-2xl border border-teal-100/60">
          <Calendar className="w-5 h-5 text-teal-600" />
          <span className="text-xs font-extrabold text-teal-600">Lịch Hẹn Kiosk</span>
        </div>
      </div>

      {/* Custom Horizontal Date Picker */}
      <div className="space-y-3">
        <h4 className="text-sm sm:text-base font-extrabold text-[#1E2939] tracking-tight flex items-center gap-2">
          📅 Chọn ngày khám
        </h4>
        <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden w-full">
          {daysList.map((day) => {
            const isActive = selectedDate === day.dateValue;
            return (
              <button
                key={day.dateValue}
                onClick={() => selectDate(day.dateValue)}
                className={`flex-1 min-w-[110px] py-4 px-3 rounded-2xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-300 shadow-sm active:scale-95 ${
                  isActive
                    ? 'bg-teal-600 border-teal-600 text-white font-extrabold shadow-md shadow-teal-600/10'
                    : 'bg-white border-neutral-200/80 hover:bg-neutral-50 text-neutral-700 hover:border-neutral-300 font-semibold'
                }`}
              >
                <span className={`text-[10px] uppercase tracking-wider block ${isActive ? 'text-teal-50' : 'text-neutral-400'}`}>
                  {day.dayLabel}
                </span>
                <span className="text-base font-black">
                  {day.dateStr}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slots Section */}
      <div className="flex-1 flex flex-col min-h-0 bg-white/80 backdrop-blur-md rounded-[32px] p-6 border border-neutral-200/80 shadow-md">
        <h4 className="text-sm sm:text-base font-extrabold text-[#1E2939] tracking-tight mb-4 flex items-center gap-2">
          🕒 Chọn khung giờ bắt đầu khám
        </h4>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {isFetchingSlots ? (
            <div className="h-full flex flex-col items-center justify-center space-y-3 py-10">
              <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
              <p className="text-xs font-bold text-neutral-400">Đang tìm các khung giờ trống...</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-10">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
              <h5 className="text-sm font-black text-neutral-800">Không có khung giờ khám trống nào</h5>
              <p className="text-[11px] text-neutral-400 font-semibold max-w-sm">
                Vào ngày này phòng khám đã đầy lịch hẹn hoặc chưa kích hoạt ca làm việc. Vui lòng chọn một ngày khám khác!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pb-4">
              {slots.map((slot) => {
                const isActive = selectedSlotId === slot.slot_id;
                return (
                  <button
                    key={slot.slot_id}
                    onClick={() => selectSlot(isActive ? null : slot.slot_id)}
                    className={`py-4 px-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-300 active:scale-95 shadow-sm ${
                      isActive
                        ? 'bg-teal-600 border-teal-600 text-white font-extrabold shadow-md'
                        : 'bg-white border-neutral-100 hover:bg-neutral-50 text-neutral-700 hover:border-neutral-300 font-semibold'
                    }`}
                  >
                    <Clock className={`w-4 h-4 ${isActive ? 'text-teal-100' : 'text-neutral-400'}`} />
                    <span className="text-sm font-black tracking-wide">
                      {slot.start_time} - {slot.end_time}
                    </span>
                    <span className={`text-[9px] font-bold ${isActive ? 'text-teal-200' : 'text-neutral-400'}`}>
                      Trống {slot.capacity}/{slot.max_capacity}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Footer */}
      {selectedSlotId && (
        <div className="bg-teal-50/50 rounded-3xl p-5 border border-teal-100 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[10px] text-teal-600 uppercase font-extrabold tracking-wider block">Lịch khám của bạn</span>
            <p className="text-sm font-extrabold text-[#1E2939]">
              Ngày: <span className="text-teal-700">{selectedDate}</span> • Khung giờ:{' '}
              <span className="text-teal-700">
                {slots.find((s) => s.slot_id === selectedSlotId)?.start_time || ''}
              </span>
            </p>
          </div>

          <button
            onClick={executePackageBooking}
            disabled={isBookingProcessing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-teal-600/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            {isBookingProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang tạo đơn...
              </>
            ) : (
              <>
                Tiến hành thanh toán <CreditCard className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-center text-xs font-semibold text-neutral-400 pb-2">
        Hệ thống Kiosk tự động • Vui lòng chọn khung giờ khám và bấm &quot;Tiến hành thanh toán&quot;
      </div>
    </div>
  );
};
