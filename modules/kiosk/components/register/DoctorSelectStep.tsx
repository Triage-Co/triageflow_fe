import React, { useState } from 'react';
import { useBookingStore } from '../../store/bookingStore';
import { DoctorItem, DoctorSlotItem } from '../../types/booking.types';
import { Clock, Loader2 } from 'lucide-react';
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

  // Chọn Bác sĩ -> Lấy ngay khung giờ trống
  const handleSelectDoctor = (doc: DoctorItem) => {
    setSelectedDoctorObj(doc);
    setSelectedSlotObj(null);
    fetchSlotsForDoctor(doc.doctor_id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
      {/* Cột trái: Danh sách Bác sĩ thực tế */}
      <div className="lg:col-span-7 space-y-4 overflow-y-auto max-h-[500px] pr-1">
        <h3 className="font-extrabold text-[#1E2939] text-base">Danh sách Bác sĩ sẵn sàng</h3>
        
        {isDoctorLoading && availableDoctors.length === 0 ? (
          <div className="flex items-center justify-center p-12 bg-white rounded-3xl border border-neutral-100">
            <Loader2 className="w-8 h-8 text-[#155DFC] animate-spin" />
            <span className="text-xs font-bold text-neutral-500 ml-2">Đang tải danh sách Bác sĩ...</span>
          </div>
        ) : availableDoctors.length > 0 ? (
          availableDoctors.map((doc, idx) => {
            const isSelected = selectedDoctorObj?.doctor_id === doc.doctor_id;
            const docKey = doc.doctor_id ? `doc-${doc.doctor_id}` : `doc-idx-${idx}`;
            return (
              <button
                key={docKey}
                onClick={() => handleSelectDoctor(doc)}
                className={cn(
                  "w-full p-5 rounded-[24px] border text-left flex items-start gap-4 transition-all cursor-pointer",
                  isSelected
                    ? "bg-blue-50/80 border-[#74A4F6] ring-2 ring-blue-200 shadow-md"
                    : "bg-white border-neutral-100 hover:border-neutral-200"
                )}
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 text-[#74A4F6] flex items-center justify-center font-bold text-lg shrink-0">👨‍⚕️</div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-[#1E2939] text-sm">{doc.full_name}</h4>
                  <p className="text-xs text-neutral-500 font-medium">{doc.specialty_name || 'Chuyên khoa'}</p>
                  <p className="text-[11px] text-neutral-400">Phòng {doc.room_name || 'Đang xếp'} • Giấy phép: {doc.license_number || '--'}</p>
                </div>
              </button>
            );
          })
        ) : (
          <div className="p-8 bg-neutral-50 rounded-3xl border border-neutral-100 text-center text-xs font-bold text-neutral-500">
            Không tìm thấy bác sĩ khả dụng cho chuyên khoa này. Bạn có thể sử dụng tính năng Xếp phòng tự động.
            <button
              onClick={executeAutoBooking}
              className="mt-3 block mx-auto px-4 py-2 bg-[#155DFC] text-white rounded-xl font-bold text-xs"
            >
              ⚡ Xếp phòng tự động ngay
            </button>
          </div>
        )}
      </div>

      {/* Cột phải: Bác sĩ đã chọn & Khung giờ trống */}
      <div className="lg:col-span-5 bg-white rounded-[36px] p-6 shadow-sm border border-neutral-100 flex flex-col justify-between space-y-6">
        <div className="space-y-4">
          <h3 className="font-extrabold text-[#1E2939] text-sm">Bác sĩ & Khung giờ đã chọn</h3>

          {selectedDoctorObj ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center space-y-2 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-[#74A4F6] flex items-center justify-center font-bold text-xl">👨‍⚕️</div>
                <div>
                  <h4 className="font-black text-[#1E2939] text-sm">{selectedDoctorObj.full_name}</h4>
                  <p className="text-xs text-neutral-500 font-bold">{selectedDoctorObj.specialty_name || 'Chuyên khoa'}</p>
                </div>
              </div>

              {/* Danh sách Khung giờ trống của Bác sĩ */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-600 block">Chọn khung giờ khám:</label>
                
                {isDoctorLoading ? (
                  <div className="text-center py-4 text-xs font-bold text-neutral-400">Đang tải khung giờ...</div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1">
                    {availableSlots.map((slot, idx) => {
                      const isSlotSelected = selectedSlotObj?.slot_id === slot.slot_id;
                      const slotKey = slot.slot_id ? `slot-${slot.slot_id}` : `slot-idx-${idx}`;
                      return (
                        <button
                          key={slotKey}
                          onClick={() => setSelectedSlotObj(slot)}
                          className={cn(
                            "py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1 cursor-pointer",
                            isSlotSelected
                              ? "bg-[#155DFC] text-[#FFFFFF] border-[#155DFC]"
                              : "bg-white border-neutral-200 text-neutral-700 hover:bg-blue-50"
                          )}
                        >
                          <Clock className="w-3.5 h-3.5" /> {slot.start_time || '08:00'}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-neutral-400 italic p-3 bg-neutral-50 rounded-xl text-center">
                    Vẫn còn suất khám mặc định cho ngày hôm nay.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-neutral-400 italic p-6 bg-neutral-50 rounded-2xl text-center border border-neutral-100">
              Vui lòng chọn một bác sĩ từ danh sách bên trái.
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
            "w-full py-4 rounded-full text-white font-bold text-base shadow-md transition-all cursor-pointer flex items-center justify-center gap-2",
            selectedDoctorObj && !isBookingProcessing ? "bg-[#74A4F6] hover:bg-[#2563EB]" : "bg-neutral-300 cursor-not-allowed"
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
