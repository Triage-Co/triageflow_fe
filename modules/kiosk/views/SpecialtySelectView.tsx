import React, { useState, useEffect } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { useBookingStore } from '../store/bookingStore';
import { useVirtualKeyboardStore } from '../store/virtualKeyboardStore';
import { SpecialtyItem } from '../types/booking.types';
import { removeVietnameseTones } from '../utils/kioskHelpers';
import {
  ArrowLeft,
  Search,
  Keyboard,
  Stethoscope,
  Heart,
  Eye,
  Activity,
  Brain,
  Baby,
  Smile,
  Bone,
  Pill,
  Sparkles,
  X,
  CheckCircle2,
  Droplet,
  Syringe,
  Dna,
  Ear,
  Hospital,
  User,
  Biohazard,
  Scissors,
  Ribbon,
  SmilePlus,
  Wind,
  FlaskConical,
} from 'lucide-react';


export const getSpecialtyIcon = (name: string, className = "w-8 h-8") => {
  const lower = name.toLowerCase().trim();
  if (lower.includes('mắt')) {
    return <Eye className={`${className} text-sky-500`} />;
  }
  if (lower.includes('tim')) {
    return <Heart className={`${className} text-rose-500`} />;
  }
  if (lower.includes('mạch máu') || lower.includes('mạch')) {
    return <Activity className={`${className} text-red-500`} />;
  }
  if (lower.includes('thần kinh')) {
    return <Brain className={`${className} text-purple-500`} />;
  }
  if (lower.includes('nhi') || lower.includes('sơ sinh')) {
    return <Baby className={`${className} text-amber-500`} />;
  }
  if (lower.includes('răng') || lower.includes('hàm mặt')) {
    return <Smile className={`${className} text-teal-500`} />;
  }
  if (lower.includes('tai') || lower.includes('mũi') || lower.includes('họng')) {
    return <Ear className={`${className} text-cyan-500`} />;
  }
  if (lower.includes('da') || lower.includes('dị ứng')) {
    return <Sparkles className={`${className} text-pink-500`} />;
  }
  if (lower.includes('xương') || lower.includes('khớp') || lower.includes('chỉnh hình')) {
    return <Bone className={`${className} text-indigo-500`} />;
  }
  if (lower.includes('huyết')) {
    return <Droplet className={`${className} text-red-600`} />;
  }
  if (lower.includes('đái tháo đường') || lower.includes('tiểu đường')) {
    return <Syringe className={`${className} text-blue-500`} />;
  }
  if (lower.includes('nội tiết')) {
    return <Dna className={`${className} text-violet-500`} />;
  }
  if (lower.includes('tiêu hóa')) {
    return <Pill className={`${className} text-emerald-500`} />;
  }
  if (lower.includes('phụ')) {
    return <User className={`${className} text-fuchsia-500`} />;
  }
  if (lower.includes('truyền nhiễm')) {
    return <Biohazard className={`${className} text-yellow-600`} />;
  }
  if (lower.includes('ung bướu') || lower.includes('ung thư')) {
    return <Ribbon className={`${className} text-pink-600`} />;
  }
  if (lower.includes('tâm thần') || lower.includes('tâm lý')) {
    return <SmilePlus className={`${className} text-violet-400`} />;
  }
  if (lower.includes('hô hấp') || lower.includes('phổi')) {
    return <Wind className={`${className} text-cyan-600`} />;
  }
  if (lower.includes('ngoại')) {
    return <Scissors className={`${className} text-slate-600`} />;
  }
  if (lower.includes('độc')) {
    return <FlaskConical className={`${className} text-lime-600`} />;
  }
  if (lower.includes('tiết niệu') || lower.includes('thận')) {
    return <Droplet className={`${className} text-blue-600`} />;
  }
  if (lower.includes('đa khoa')) {
    return <Hospital className={`${className} text-blue-500`} />;
  }
  return <Stethoscope className={`${className} text-[#155DFC]`} />;
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
  const openKeyboard = useVirtualKeyboardStore((state) => state.openKeyboard);

  const handleOpenVirtualKeyboard = () => {
    openKeyboard({
      inputId: 'specialty-search',
      title: 'Tìm kiếm chuyên khoa',
      initialValue: searchQuery,
      placeholder: 'Nhập tên chuyên khoa (VD: Mắt, Tim mạch, Nhi...)',
      onChange: (val) => setSearchQuery(val),
      onSubmit: (val) => setSearchQuery(val),
    });
  };

  useEffect(() => {
    if (specialties.length === 0) {
      fetchSpecialties();
    }
  }, [fetchSpecialties, specialties.length]);

  const normalizedSearchQuery = removeVietnameseTones(searchQuery);

  const filteredSpecialties = specialties.filter((s) => {
    if (!normalizedSearchQuery) return true;
    const nameNoTones = removeVietnameseTones(s.specialty_name);
    const codeNoTones = removeVietnameseTones(s.specialty_code || '');
    return nameNoTones.includes(normalizedSearchQuery) || codeNoTones.includes(normalizedSearchQuery);
  });

  const handleSelectSpecialty = (item: SpecialtyItem) => {
    setSelectedSpecialtyItem(item);
  };

  const handleConfirmSpecialty = async () => {
    if (!selectedSpecialtyItem) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const specialtyCode = selectedSpecialtyItem.specialty_code;

    showToast(`Đang tải danh sách Bác sĩ cho ${selectedSpecialtyItem.specialty_name}...`, 'info');
    await fetchDoctorsAndSlots(specialtyCode, todayStr);
    setAIRegisterStep('doctor_select');
    navigateToView('register');
    setSelectedSpecialtyItem(null);
  };

  return (
    <div className="w-full h-full min-h-0 p-4 sm:p-6 lg:p-8 z-10 select-none flex flex-col justify-between gap-4 max-w-7xl mx-auto relative overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateToView('booking_mode')}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-50 active:scale-95 rounded-2xl text-xs sm:text-sm font-bold text-neutral-800 shadow-md border border-neutral-100 transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-600" /> Quay lại
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1E2939] tracking-tight">
              Danh mục Chuyên khoa khám
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-neutral-500 mt-0.5">
              Chọn chuyên khoa phù hợp để tiếp tục đăng ký ({filteredSpecialties.length} chuyên khoa)
            </p>
          </div>
        </div>

        {/* Search Bar with Virtual Keyboard Integration */}
        <div className="relative w-full sm:w-80 shrink-0">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onClick={handleOpenVirtualKeyboard}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm chuyên khoa..."
            className="w-full pl-11 pr-11 py-2.5 sm:py-3 bg-white/90 backdrop-blur-md border border-neutral-200 rounded-2xl text-xs sm:text-sm font-bold text-[#1E2939] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#155DFC] shadow-sm transition-all cursor-pointer"
          />
          <button
            type="button"
            onClick={handleOpenVirtualKeyboard}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl bg-blue-50 text-[#155DFC] hover:bg-blue-100 transition-colors cursor-pointer"
            title="Mở bàn phím ảo"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid View - 6 Columns Grid with 2x Height Cards */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {isFetchingSpecialties ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3 flex-1 min-h-0 overflow-y-auto pr-1 content-start">
            {Array.from({ length: 30 }).map((_, idx) => (
              <div
                key={idx}
                className="h-[108px] sm:h-[118px] bg-white/60 rounded-3xl animate-pulse border border-neutral-100"
              />
            ))}
          </div>
        ) : filteredSpecialties.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 bg-white/80 backdrop-blur-xl rounded-[32px] border border-neutral-100 shadow-lg text-center space-y-4 max-w-md mx-auto my-auto">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3 overflow-y-auto flex-1 min-h-0 pr-1 content-start">
            {filteredSpecialties.map((item) => (
              <button
                key={item.specialty_id}
                onClick={() => handleSelectSpecialty(item)}
                className="group w-full h-[108px] sm:h-[118px] bg-white/95 hover:bg-gradient-to-b hover:from-white hover:to-blue-50/90 backdrop-blur-md rounded-3xl p-2.5 sm:p-3 border border-neutral-200/80 hover:border-blue-300 shadow-xs hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 flex flex-col items-center justify-center text-center space-y-1.5 cursor-pointer active:scale-95 overflow-hidden shrink-0"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-50/80 group-hover:bg-white flex items-center justify-center shadow-xs transition-colors duration-200 shrink-0">
                  {getSpecialtyIcon(item.specialty_name, "w-5 h-5 sm:w-6 sm:h-6")}
                </div>
                <div className="w-full px-0.5">
                  <h4 className="text-xs sm:text-[13px] font-black text-[#1E2939] group-hover:text-[#155DFC] transition-colors leading-tight line-clamp-2">
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
    </div>
  );
};
