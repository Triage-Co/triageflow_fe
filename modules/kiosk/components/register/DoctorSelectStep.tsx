import React, { useState } from 'react';
import { useBookingStore } from '../../store/bookingStore';
import { DoctorItem, DoctorSlotItem } from '../../types/booking.types';
import { Clock, Loader2, Award, ShieldCheck, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DoctorSelectStep: React.FC = () => {
  const availableDoctors = useBookingStore((state) => state.availableDoctors);
  const availableSlots = useBookingStore((state) => state.availableSlots);
  const isDoctorLoading = useBookingStore((state) => state.isDoctorLoading);
  const isBookingProcessing = useBookingStore((state) => state.isBookingProcessing);

  const executeAutoBooking = useBookingStore((state) => state.executeAutoBooking);
  const fetchSlotsForDoctor = useBookingStore((state) => state.fetchSlotsForDoctor);
  const executeManualBooking = useBookingStore((state) => state.executeManualBooking);

  // Local selection state cho chọn bác sĩ & khung giờ
  const [selectedDoctorObj, setSelectedDoctorObj] = useState<DoctorItem | null>(null);
  const [selectedSlotObj, setSelectedSlotObj] = useState<DoctorSlotItem | null>(null);

  // Chọn Bác sĩ -> Lấy ngay khung giờ từ shifts hoặc fetch API bổ sung
  const handleSelectDoctor = (doc: DoctorItem) => {
    setSelectedDoctorObj(doc);
    setSelectedSlotObj(null);

    const docId = doc.staff_id || doc.doctor_id;
    // Nếu chưa có shifts/slots sẵn trong doc thì gọi API bổ sung ngầm
    if ((!doc.shifts || doc.shifts.length === 0 || !doc.shifts[0]?.slots) && docId) {
      fetchSlotsForDoctor(docId);
    }
  };

  // Kiểm tra xem khung giờ có nằm trong quá khứ so với thời gian hiện tại hay không
  const isSlotInPast = (startTimeStr: string): boolean => {
    if (!startTimeStr) return false;
    
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    
    const parts = startTimeStr.split(':');
    if (parts.length < 2) return false;
    
    const slotHours = parseInt(parts[0], 10);
    const slotMinutes = parseInt(parts[1], 10);
    
    if (isNaN(slotHours) || isNaN(slotMinutes)) return false;
    
    const currentTotal = currentHours * 60 + currentMinutes;
    const slotTotal = slotHours * 60 + slotMinutes;
    
    return slotTotal < currentTotal;
  };

  // Xác định danh sách slot của bác sĩ đã chọn (từ shifts gộp sẵn hoặc từ store)
  const currentSlots: DoctorSlotItem[] = React.useMemo(() => {
    if (selectedDoctorObj?.shifts && selectedDoctorObj.shifts.length > 0 && selectedDoctorObj.shifts[0]?.slots) {
      return selectedDoctorObj.shifts[0].slots;
    }
    return availableSlots;
  }, [selectedDoctorObj, availableSlots]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
      {/* Cột trái: Danh sách Bác sĩ thực tế */}
      <div className="lg:col-span-7 space-y-4 overflow-y-auto max-h-[520px] pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <h3 className="font-extrabold text-[#1E2939] text-base">Danh sách Bác sĩ sẵn sàng</h3>

        {isDoctorLoading && availableDoctors.length === 0 ? (
          <div className="flex items-center justify-center p-12 bg-white rounded-3xl border border-neutral-100">
            <Loader2 className="w-8 h-8 text-[#155DFC] animate-spin" />
            <span className="text-xs font-bold text-neutral-500 ml-2">Đang tải danh sách Bác sĩ...</span>
          </div>
        ) : availableDoctors.length > 0 ? (
          availableDoctors.map((doc, idx) => {
            const docId = doc.staff_id || doc.doctor_id || `idx-${idx}`;
            const selectedDocId = selectedDoctorObj?.staff_id || selectedDoctorObj?.doctor_id;
            const isSelected = selectedDocId === docId;
            const avatarUrl = doc.account?.avatar;
            const specialtyName = doc.specialty?.specialty_name || doc.specialty_name || 'Chuyên khoa';

            return (
              <button
                key={`doc-${docId}`}
                onClick={() => handleSelectDoctor(doc)}
                className={cn(
                  "w-full p-5 rounded-[24px] border text-left flex items-start gap-4 transition-all cursor-pointer",
                  isSelected
                    ? "bg-blue-50/80 border-[#155DFC] ring-2 ring-blue-200 shadow-md"
                    : "bg-white border-neutral-100 hover:border-neutral-200 hover:shadow-sm"
                )}
              >
                {/* Avatar bác sĩ */}
                <div className="relative shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={doc.full_name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-blue-200 shadow-sm"
                      onError={(e) => {
                        // Fallback icon khi lỗi tải ảnh
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={cn("w-14 h-14 rounded-full bg-blue-100 text-[#155DFC] flex items-center justify-center font-bold text-xl shrink-0 shadow-inner", avatarUrl && "hidden")}>
                    👨‍⚕️
                  </div>
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-extrabold text-[#1E2939] text-base truncate">{doc.full_name}</h4>
                    {doc.experience_years ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full shrink-0">
                        <Award className="w-3 h-3" /> {doc.experience_years} năm KN
                      </span>
                    ) : null}
                  </div>

                  <p className="text-xs text-[#155DFC] font-black">{specialtyName}</p>
                  
                  <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-medium">
                    {doc.room_name && <span>Phòng: {doc.room_name}</span>}
                    {doc.license_number && (
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> CCHN: {doc.license_number}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="p-8 bg-neutral-50 rounded-3xl border border-neutral-100 text-center text-xs font-bold text-neutral-500 space-y-3">
            <p>Không tìm thấy bác sĩ khả dụng cho chuyên khoa này vào hôm nay.</p>
            <button
              onClick={executeAutoBooking}
              className="px-5 py-2.5 bg-[#155DFC] text-white rounded-xl font-extrabold text-xs shadow-md hover:bg-blue-700 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              ⚡ Xếp phòng tự động ngay
            </button>
          </div>
        )}
      </div>

      {/* Cột phải: Bác sĩ đã chọn & Khung giờ trống */}
      <div className="lg:col-span-5 bg-white rounded-[36px] p-6 shadow-sm border border-neutral-100 flex flex-col space-y-6 min-h-0 h-full">
        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          <h3 className="font-extrabold text-[#1E2939] text-base">Bác sĩ & Khung giờ khám chọn</h3>

          {selectedDoctorObj ? (
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50/60 rounded-2xl border border-blue-100 shrink-0">
                <div className="w-12 h-12 rounded-full bg-[#155DFC] text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
                  👨‍⚕️
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-[#1E2939] text-sm truncate">{selectedDoctorObj.full_name}</h4>
                  <p className="text-xs text-[#155DFC] font-bold">
                    {selectedDoctorObj.specialty?.specialty_name || selectedDoctorObj.specialty_name || 'Chuyên khoa'}
                  </p>
                </div>
              </div>

              {/* Danh sách Khung giờ trống của Bác sĩ */}
              <div className="flex-1 flex flex-col min-h-0 space-y-2">
                <label className="text-xs font-extrabold text-neutral-700 block shrink-0">
                  Chọn khung giờ khám khả dụng:
                </label>

                {isDoctorLoading && currentSlots.length === 0 ? (
                  <div className="text-center py-6 text-xs font-bold text-neutral-400 flex items-center justify-center gap-2 shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin text-[#155DFC]" /> Đang nạp khung giờ khám...
                  </div>
                ) : currentSlots.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 flex-1 overflow-y-auto p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {currentSlots.map((slot, idx) => {
                      const isSlotSelected = selectedSlotObj?.slot_id === slot.slot_id;
                      const isPast = isSlotInPast(slot.start_time);
                      const isAvailable = (slot.status === 'AVAILABLE' || slot.is_available !== false) && !isPast;
                      const slotKey = slot.slot_id ? `slot-${slot.slot_id}` : `slot-idx-${idx}`;
                      const timeDisplay = slot.start_time && slot.end_time
                        ? `${slot.start_time} - ${slot.end_time}`
                        : slot.start_time || 'Khung giờ';

                      return (
                        <button
                          key={slotKey}
                          onClick={() => isAvailable && setSelectedSlotObj(slot)}
                          disabled={!isAvailable}
                          className={cn(
                            "py-2.5 px-3 rounded-2xl text-xs font-extrabold border transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer h-11 shrink-0",
                            isSlotSelected
                              ? "bg-[#155DFC] text-white border-[#155DFC] shadow-md scale-[1.02]"
                              : isAvailable
                                ? "bg-white border-neutral-200 text-neutral-800 hover:bg-blue-50 hover:border-blue-300"
                                : "bg-neutral-100 border-neutral-200 text-neutral-400 cursor-not-allowed line-through"
                          )}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{timeDisplay}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-neutral-400 italic p-4 bg-neutral-50 rounded-2xl text-center border border-neutral-100 shrink-0">
                    Bác sĩ hiện không còn khung giờ khám trống nào trong ngày.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-neutral-400 italic p-8 bg-neutral-50 rounded-2xl text-center border border-neutral-100">
              Vui lòng chọn một Bác sĩ từ danh sách bên trái.
            </div>
          )}
        </div>

        <button
          onClick={() => {
            if (selectedSlotObj?.slot_id) {
              executeManualBooking(selectedSlotObj.slot_id);
            } else {
              executeAutoBooking();
            }
          }}
          disabled={!selectedDoctorObj || isBookingProcessing}
          className={cn(
            "w-full py-4 rounded-2xl text-white font-black text-base shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2",
            selectedDoctorObj && !isBookingProcessing
              ? "bg-[#155DFC] hover:bg-blue-700 active:scale-95 shadow-blue-500/25"
              : "bg-neutral-300 cursor-not-allowed shadow-none"
          )}
        >
          {isBookingProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Đang đăng ký...
            </>
          ) : (
            "Xác nhận đặt lịch →"
          )}
        </button>
      </div>
    </div>
  );
};
