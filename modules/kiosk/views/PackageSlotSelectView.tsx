import React, { useEffect, useMemo } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { usePackageBookingStore } from '../store/packageBookingStore';
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  Calendar,
  Clock,
  AlertTriangle,
  Sun,
  Sunset,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
    isBookingProcessing,
  } = usePackageBookingStore();

  // Tạo danh sách 8 ngày (Hôm nay + 7 ngày kế tiếp)
  const daysList = useMemo(() => {
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
        const vietnameseDays = [
          'Chủ Nhật',
          'Thứ Hai',
          'Thứ Ba',
          'Thứ Tư',
          'Thứ Năm',
          'Thứ Sáu',
          'Thứ Bảy',
        ];
        dayLabel = vietnameseDays[dayOfWeek];
      }

      const dateStr = `${day}/${month}`;

      days.push({
        dateValue: formatted,
        dayLabel,
        dateStr,
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

  // Kiểm tra ngày đang chọn có phải là hôm nay hay không
  const isToday = useMemo(() => {
    if (!selectedDate) return false;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return selectedDate === `${y}-${m}-${d}`;
  }, [selectedDate]);

  // Kiểm tra khung giờ đã qua so với thời gian hiện tại hay chưa
  const isSlotInPast = (startTimeStr: string): boolean => {
    if (!isToday || !startTimeStr) return false;
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    const parts = startTimeStr.split(':');
    if (parts.length < 2) return false;

    const slotHours = parseInt(parts[0], 10);
    const slotMinutes = parseInt(parts[1], 10);
    if (isNaN(slotHours) || isNaN(slotMinutes)) return false;

    return slotHours * 60 + slotMinutes <= currentHours * 60 + currentMinutes;
  };

  // Sắp xếp và phân chia khung giờ thành Ca Sáng (< 12:00) và Ca Chiều (>= 12:00)
  const { morningSlots, afternoonSlots } = useMemo(() => {
    const sorted = [...slots].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
    const morning = [];
    const afternoon = [];

    for (const slot of sorted) {
      const startHour = parseInt(slot.start_time.split(':')[0], 10);
      if (startHour < 12) {
        morning.push(slot);
      } else {
        afternoon.push(slot);
      }
    }

    return { morningSlots: morning, afternoonSlots: afternoon };
  }, [slots]);

  return (
    <div className="w-full h-full min-h-0 p-4 sm:p-6 lg:p-8 z-10 select-none flex flex-col justify-between max-w-7xl mx-auto gap-3 sm:gap-4 overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateToView('package_detail')}
            className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-white hover:bg-neutral-50 active:scale-95 rounded-2xl text-xs sm:text-sm font-bold text-neutral-800 shadow-sm border border-neutral-100 transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-600" /> Quay lại
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1E2939] tracking-tight">
              Chọn lịch khám hẹn
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-neutral-500 mt-0.5">
              Vui lòng chọn ngày khám và khung giờ khám mong muốn bên dưới
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100/80 shrink-0">
          <Calendar className="w-4 h-4 text-[#155DFC]" />
          <span className="text-xs font-extrabold text-[#155DFC]">Lịch Hẹn Kiosk</span>
        </div>
      </div>

      {/* Custom Horizontal Date Picker */}
      <div className="space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#155DFC]" />
          <h4 className="text-xs sm:text-sm font-extrabold text-[#1E2939] tracking-tight">
            Chọn ngày khám
          </h4>
        </div>
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 no-scrollbar w-full">
          {daysList.map((day) => {
            const isActive = selectedDate === day.dateValue;
            return (
              <button
                key={day.dateValue}
                onClick={() => selectDate(day.dateValue)}
                className={cn(
                  'flex-1 min-w-[95px] sm:min-w-[110px] py-2.5 sm:py-3.5 px-2 sm:px-3 rounded-2xl border flex flex-col items-center justify-center gap-0.5 sm:gap-1 cursor-pointer transition-all duration-200 shadow-sm active:scale-95',
                  isActive
                    ? 'bg-[#155DFC] border-[#155DFC] text-white font-extrabold shadow-sm shadow-blue-500/25'
                    : 'bg-white border-neutral-200/80 hover:bg-neutral-50 text-neutral-700 hover:border-neutral-300 font-semibold'
                )}
              >
                <span
                  className={cn(
                    'text-[9px] sm:text-[10px] uppercase tracking-wider block font-bold',
                    isActive ? 'text-blue-100' : 'text-neutral-400'
                  )}
                >
                  {day.dayLabel}
                </span>
                <span className="text-sm sm:text-base font-black">
                  {day.dateStr}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slots Section: Grouped by Morning and Afternoon */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-[28px] sm:rounded-[36px] p-5 sm:p-6 border border-neutral-100/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#155DFC]" />
            <h4 className="text-xs sm:text-sm font-extrabold text-[#1E2939] tracking-tight">
              Chọn khung giờ bắt đầu khám
            </h4>
          </div>
          <span className="text-[11px] font-bold text-neutral-400">
            {slots.length} khung giờ khả dụng
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-1 space-y-5">
          {isFetchingSlots ? (
            <div className="h-full flex flex-col items-center justify-center space-y-3 py-12">
              <Loader2 className="w-8 h-8 text-[#155DFC] animate-spin" />
              <p className="text-xs font-bold text-neutral-400">Đang tìm các khung giờ trống...</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-2 py-12">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <h5 className="text-sm font-black text-neutral-800">Không có khung giờ khám trống nào</h5>
              <p className="text-[11px] text-neutral-400 font-semibold max-w-sm">
                Vào ngày này phòng khám đã đầy lịch hẹn hoặc chưa kích hoạt ca làm việc. Vui lòng chọn một ngày khám khác!
              </p>
            </div>
          ) : (
            <>
              {/* Ca Sáng */}
              {morningSlots.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs">
                      <Sun className="w-3.5 h-3.5" />
                    </div>
                    <h5 className="text-xs sm:text-sm font-black text-[#1E2939] tracking-tight">
                      Ca Sáng{' '}
                      <span className="text-[11px] font-semibold text-neutral-400">
                        ({morningSlots.length} khung giờ)
                      </span>
                    </h5>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {morningSlots.map((slot) => {
                      const isActive = selectedSlotId === slot.slot_id;
                      const isPast = isSlotInPast(slot.start_time);
                      const hasCapacity = slot.capacity > 0;
                      const isAvailable = hasCapacity && !isPast;
                      return (
                        <button
                          key={slot.slot_id}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => isAvailable && selectSlot(isActive ? null : slot.slot_id)}
                          className={cn(
                            'p-3.5 sm:p-4 rounded-2xl border text-left flex items-center justify-between gap-2.5 transition-all duration-200 shadow-2xs',
                            isActive
                              ? 'bg-[#155DFC] border-[#155DFC] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-300/40'
                              : isAvailable
                              ? 'bg-neutral-50/70 hover:bg-blue-50/40 border-neutral-200/70 hover:border-blue-300 text-neutral-800 cursor-pointer active:scale-95'
                              : 'bg-neutral-100 border-neutral-200 text-neutral-400 cursor-not-allowed'
                          )}
                        >
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Clock
                                className={cn(
                                  'w-3.5 h-3.5 shrink-0',
                                  isActive ? 'text-blue-100' : isAvailable ? 'text-[#155DFC]' : 'text-neutral-400'
                                )}
                              />
                              <span
                                className={cn(
                                  'text-xs sm:text-sm font-black tracking-tight truncate',
                                  isPast && 'line-through text-neutral-400'
                                )}
                              >
                                {slot.start_time} - {slot.end_time}
                              </span>
                            </div>
                            <div>
                              <span
                                className={cn(
                                  'text-[10px] font-extrabold px-2 py-0.5 rounded-full border inline-block',
                                  isActive
                                    ? 'bg-blue-600/70 border-blue-400/80 text-white'
                                    : isPast
                                    ? 'bg-neutral-200/60 text-neutral-500 border-neutral-300/80'
                                    : hasCapacity
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                )}
                              >
                                {isPast ? 'Đã qua giờ' : hasCapacity ? `Còn ${slot.capacity} chỗ` : 'Hết chỗ'}
                              </span>
                            </div>
                          </div>

                          <div
                            className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all',
                              isActive
                                ? 'bg-white text-[#155DFC] shadow-xs'
                                : isAvailable
                                ? 'border-2 border-neutral-300 bg-white'
                                : 'border border-neutral-200 bg-neutral-200/50 text-neutral-300'
                            )}
                          >
                            {isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ca Chiều */}
              {afternoonSlots.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shadow-2xs">
                      <Sunset className="w-3.5 h-3.5" />
                    </div>
                    <h5 className="text-xs sm:text-sm font-black text-[#1E2939] tracking-tight">
                      Ca Chiều{' '}
                      <span className="text-[11px] font-semibold text-neutral-400">
                        ({afternoonSlots.length} khung giờ)
                      </span>
                    </h5>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {afternoonSlots.map((slot) => {
                      const isActive = selectedSlotId === slot.slot_id;
                      const isPast = isSlotInPast(slot.start_time);
                      const hasCapacity = slot.capacity > 0;
                      const isAvailable = hasCapacity && !isPast;
                      return (
                        <button
                          key={slot.slot_id}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => isAvailable && selectSlot(isActive ? null : slot.slot_id)}
                          className={cn(
                            'p-3.5 sm:p-4 rounded-2xl border text-left flex items-center justify-between gap-2.5 transition-all duration-200 shadow-2xs',
                            isActive
                              ? 'bg-[#155DFC] border-[#155DFC] text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-300/40'
                              : isAvailable
                              ? 'bg-neutral-50/70 hover:bg-blue-50/40 border-neutral-200/70 hover:border-blue-300 text-neutral-800 cursor-pointer active:scale-95'
                              : 'bg-neutral-100 border-neutral-200 text-neutral-400 cursor-not-allowed'
                          )}
                        >
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Clock
                                className={cn(
                                  'w-3.5 h-3.5 shrink-0',
                                  isActive ? 'text-blue-100' : isAvailable ? 'text-[#155DFC]' : 'text-neutral-400'
                                )}
                              />
                              <span
                                className={cn(
                                  'text-xs sm:text-sm font-black tracking-tight truncate',
                                  isPast && 'line-through text-neutral-400'
                                )}
                              >
                                {slot.start_time} - {slot.end_time}
                              </span>
                            </div>
                            <div>
                              <span
                                className={cn(
                                  'text-[10px] font-extrabold px-2 py-0.5 rounded-full border inline-block',
                                  isActive
                                    ? 'bg-blue-600/70 border-blue-400/80 text-white'
                                    : isPast
                                    ? 'bg-neutral-200/60 text-neutral-500 border-neutral-300/80'
                                    : hasCapacity
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                )}
                              >
                                {isPast ? 'Đã qua giờ' : hasCapacity ? `Còn ${slot.capacity} chỗ` : 'Hết chỗ'}
                              </span>
                            </div>
                          </div>

                          <div
                            className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all',
                              isActive
                                ? 'bg-white text-[#155DFC] shadow-xs'
                                : isAvailable
                                ? 'border-2 border-neutral-300 bg-white'
                                : 'border border-neutral-200 bg-neutral-200/50 text-neutral-300'
                            )}
                          >
                            {isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom Action Footer */}
      {selectedSlotId && (
        <div className="bg-blue-50/70 rounded-[24px] sm:rounded-[28px] p-4 sm:p-5 border border-blue-100/80 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-sm">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[10px] text-[#155DFC] uppercase font-extrabold tracking-wider block">
              Lịch khám của bạn
            </span>
            <p className="text-sm font-extrabold text-[#1E2939]">
              Ngày: <span className="text-[#155DFC]">{selectedDate}</span> • Khung giờ:{' '}
              <span className="text-[#155DFC]">
                {slots.find((s) => s.slot_id === selectedSlotId)?.start_time || ''}
              </span>
            </p>
          </div>

          <button
            onClick={executePackageBooking}
            disabled={isBookingProcessing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-[#155DFC] hover:bg-[#2563EB] disabled:opacity-50 text-white rounded-full font-extrabold text-sm shadow-sm shadow-blue-500/25 transition-all cursor-pointer active:scale-95"
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
      <div className="text-center text-xs font-semibold text-neutral-400 pb-1">
        Hệ thống Kiosk tự động • Vui lòng chọn khung giờ khám và bấm &quot;Tiến hành thanh toán&quot;
      </div>
    </div>
  );
};
