import React, { useState, useEffect } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { useBookingStore } from '../store/bookingStore';
import { SpecialtyItem } from '../types/booking.types';
import {
  ArrowLeft,
  Search,
  Stethoscope,
  Heart,
  Eye,
  Activity,
  Brain,
  Baby,
  Smile,
  ShieldAlert,
  Thermometer,
  Zap,
  Bone,
  Pill,
  Sparkles,
  X,
  CheckCircle2,
} from 'lucide-react';

// Helper function to map specialty names to icons
const getSpecialtyIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('tim')) return <Heart className="w-8 h-8 text-rose-500" />;
  if (lower.includes('mắt')) return <Eye className="w-8 h-8 text-sky-500" />;
  if (lower.includes('thần kinh')) return <Brain className="w-8 h-8 text-purple-500" />;
  if (lower.includes('nhi') || lower.includes('sơ sinh')) return <Baby className="w-8 h-8 text-amber-500" />;
  if (lower.includes('răng') || lower.includes('mặt')) return <Smile className="w-8 h-8 text-teal-500" />;
  if (lower.includes('độc') || lower.includes('nhiễm')) return <ShieldAlert className="w-8 h-8 text-orange-500" />;
  if (lower.includes('dị ứng') || lower.includes('da')) return <Thermometer className="w-8 h-8 text-pink-500" />;
  if (lower.includes('cơ xương') || lower.includes('chỉnh hình')) return <Bone className="w-8 h-8 text-indigo-500" />;
  if (lower.includes('huyết') || lower.includes('mạch')) return <Zap className="w-8 h-8 text-red-500" />;
  if (lower.includes('dược') || lower.includes('tiêu hóa')) return <Pill className="w-8 h-8 text-emerald-500" />;
  return <Stethoscope className="w-8 h-8 text-[#155DFC]" />;
};

export const SpecialtySelectView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialtyItem, setSelectedSpecialtyItem] = useState<SpecialtyItem | null>(null);

  const navigateToView = useKioskStore((state) => state.navigateToView);
  const setAIRegisterStep = useKioskStore((state) => state.setAIRegisterStep);
  const showToast = useKioskStore((state) => state.showToast);

  const specialties = useBookingStore((state) => state.specialties);
  const isFetchingSpecialties = useBookingStore((state) => state.isFetchingSpecialties);
  const fetchSpecialties = useBookingStore((state) => state.fetchSpecialties);
  const fetchDoctorsAndSlots = useBookingStore((state) => state.fetchDoctorsAndSlots);

  useEffect(() => {
    if (specialties.length === 0) {
      fetchSpecialties();
    }
  }, [fetchSpecialties, specialties.length]);

  const filteredSpecialties = specialties.filter((s) =>
    s.specialty_name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleSelectSpecialty = (item: SpecialtyItem) => {
    setSelectedSpecialtyItem(item);
  };

  const handleConfirmSpecialty = async () => {
    if (!selectedSpecialtyItem) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const specialtyCode = selectedSpecialtyItem.specialty_code;

    showToast(`Đang tải danh sách Bác sĩ cho ${selectedSpecialtyItem.specialty_name}...`, 'info');

    // 1. Gọi API lấy danh sách bác sĩ kèm shifts/slots hôm nay
    await fetchDoctorsAndSlots(specialtyCode, todayStr);

    // 2. Chuyển bước sang doctor_select & navigate sang RegisterView
    setAIRegisterStep('doctor_select');
    navigateToView('register');
    setSelectedSpecialtyItem(null);
  };

  return (
    <div className="w-full min-h-screen p-6 lg:p-8 z-10 select-none flex flex-col justify-between space-y-6 max-w-7xl mx-auto relative">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateToView('booking_mode')}
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-neutral-50 active:scale-95 rounded-2xl text-sm font-bold text-neutral-800 shadow-md border border-neutral-100 transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600" /> Quay lại
          </button>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1E2939] tracking-tight">
              Danh mục Chuyên khoa khám
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-neutral-500 mt-0.5">
              Chọn chuyên khoa phù hợp để tiếp tục đăng ký ({filteredSpecialties.length} chuyên khoa)
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm chuyên khoa..."
            className="w-full pl-12 pr-4 py-3 bg-white/90 backdrop-blur-md border border-neutral-200 rounded-2xl text-sm font-bold text-[#1E2939] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#155DFC] shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 min-h-0 py-2">
        {isFetchingSpecialties ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 15 }).map((_, idx) => (
              <div
                key={idx}
                className="h-32 bg-white/60 rounded-3xl animate-pulse border border-neutral-100"
              />
            ))}
          </div>
        ) : filteredSpecialties.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white/80 backdrop-blur-xl rounded-[32px] border border-neutral-100 shadow-lg text-center space-y-4 max-w-md mx-auto my-12">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#155DFC] flex items-center justify-center">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-[#1E2939]">Không tìm thấy chuyên khoa nào</h3>
            <p className="text-xs text-neutral-500 font-medium">
              Vui lòng thử tìm với từ khóa khác hoặc xóa bộ lọc tìm kiếm.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-6 py-2.5 bg-[#155DFC] text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-700 transition-all cursor-pointer"
            >
              Xóa tìm kiếm
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-y-auto max-h-[calc(100vh-210px)] pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {filteredSpecialties.map((item) => (
              <button
                key={item.specialty_id}
                onClick={() => handleSelectSpecialty(item)}
                className="group bg-white/90 hover:bg-gradient-to-br hover:from-white hover:to-blue-50/80 backdrop-blur-md rounded-3xl p-5 border border-neutral-100/80 hover:border-blue-200 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-200 flex flex-col items-center text-center justify-center space-y-3 cursor-pointer active:scale-95"
              >
                <div className="w-14 h-14 rounded-2xl bg-neutral-50 group-hover:bg-white flex items-center justify-center shadow-inner transition-colors duration-200">
                  {getSpecialtyIcon(item.specialty_name)}
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm sm:text-base font-black text-[#1E2939] group-hover:text-[#155DFC] transition-colors line-clamp-2 leading-snug">
                    {item.specialty_name}
                  </h4>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal Overlay */}
      {selectedSpecialtyItem && (
        <div className="fixed inset-0 z-50 bg-[#1E2939]/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in-0 duration-200">
          <div className="bg-white w-full max-w-md rounded-[36px] shadow-2xl p-8 border border-neutral-100 space-y-6 animate-in zoom-in-95 duration-200 relative text-center">
            {/* Close Button X */}
            <button
              onClick={() => setSelectedSpecialtyItem(null)}
              className="absolute top-6 right-6 p-2 text-neutral-400 hover:text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Specialty Icon Badge */}
            <div className="w-20 h-20 rounded-3xl bg-blue-50 text-[#155DFC] flex items-center justify-center mx-auto shadow-inner">
              {getSpecialtyIcon(selectedSpecialtyItem.specialty_name)}
            </div>

            {/* Modal Text Content */}
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-[#1E2939] tracking-tight">
                Xác nhận đăng ký khám
              </h3>
              <p className="text-sm text-neutral-600 font-medium leading-relaxed">
                Bạn có muốn đăng ký khám tại chuyên khoa <strong className="text-[#155DFC] font-black">{selectedSpecialtyItem.specialty_name}</strong> hôm nay?
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedSpecialtyItem(null)}
                className="flex-1 py-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-2xl font-extrabold text-sm transition-all cursor-pointer"
              >
                Chọn chuyên khoa khác
              </button>
              <button
                onClick={handleConfirmSpecialty}
                className="flex-1 py-3.5 bg-[#155DFC] hover:bg-blue-700 active:scale-95 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Đăng ký ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-center text-xs font-semibold text-neutral-400">
        Bệnh viện Kiosk • Chọn chuyên khoa để đăng ký khám bệnh
      </div>
    </div>
  );
};
