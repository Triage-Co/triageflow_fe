import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { Camera, ArrowLeft, ShieldCheck } from 'lucide-react';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuthStore } from '../store/authStore';

export const QRScannerModal: React.FC = () => {
  const [cccd, setCccd] = React.useState('');
  const [error, setError] = React.useState('');
  const loginCitizen = useAuthStore((state) => state.loginCitizen);
  const activeModal = useKioskStore((state) => state.activeModal);
  const targetViewAfterScan = useKioskStore((state) => state.targetViewAfterScan);
  const closeModal = useKioskStore((state) => state.closeModal);
  const isLoading = useKioskStore((state) => state.isLoading);
  const navigateToView = useKioskStore((state) => state.navigateToView);

  const handleConfirm = async () => {
    if (!/^\d{12}$/.test(cccd)) {
      setError('CCCD phải gồm 12 chữ số');
      return;
    }
    setError('');
    try {
      await loginCitizen(cccd);
      closeModal();
      navigateToView(targetViewAfterScan ?? 'home');
    } catch (e) {
      console.error(e);
      setError('Xác thực thất bại');
    }
  };

  if (activeModal !== 'scan_cccd') return null;

  const getTargetTitle = () => {
    switch (targetViewAfterScan) {
      case 'register': return 'Đăng ký khám bệnh';
      case 'patient_info': return 'Xem thông tin khám bệnh';
      case 'doctor_route': return 'In phiếu / Lộ trình khám';
      case 'queue': return 'Theo dõi hàng đợi';
      case 'map': return 'Xem đường đi phòng khám';
      case 'payment': return 'Thanh toán viện phí';
      default: return 'Xác thực căn cước công dân';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1E2939]/50 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in-0 duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[36px] shadow-2xl overflow-hidden border border-neutral-100/50 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <button 
            onClick={closeModal}
            className="flex items-center gap-2 text-[#4A5565] hover:text-[#1E2939] font-bold text-base transition-colors duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay lại
          </button>
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#155DFC] bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100/50">
            {getTargetTitle()}
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-8 flex flex-col items-center text-center space-y-6">
          <div className="relative w-80 h-48 rounded-2xl border-4 border-dashed border-[#155DFC] bg-blue-50/20 flex flex-col items-center justify-center overflow-hidden">
            {/* Simulated scan green laser line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500 animate-bounce shadow-[0_0_15px_#10B981]" />
            <Camera className="w-14 h-14 text-[#155DFC] mb-2 animate-pulse" />
            <p className="text-sm font-bold text-[#155DFC] uppercase tracking-wide">Đặt thẻ CCCD / Mã QR VNeID tại đây</p>
          </div>

          <div className="space-y-2 max-w-md">
            <h3 className="text-2xl font-extrabold text-[#1E2939]">Vui lòng quét CCCD hoặc QR VNeID</h3>
            <p className="text-sm text-[#4A5565] font-medium leading-relaxed">
              Đặt mặt trước của thẻ CCCD gắn chip vào trước camera của Kiosk hoặc bật ứng dụng VNeID để xác thực thông tin trước khi {getTargetTitle().toLowerCase()}.
            </p>
          </div>

          <div className="pt-2 w-full max-w-xs">
            <div className="flex flex-col items-center w-full max-w-xs space-y-2">
              <input
                type="text"
                value={cccd}
                onChange={(e) => setCccd(e.target.value)}
                placeholder="Nhập CCCD (12 chữ số)"
                maxLength={12}
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#155DFC]"
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
            <PrimaryButton 
              onClick={handleConfirm}
              isLoading={isLoading}
              className="w-full text-base"
            >
              <ShieldCheck className="w-5 h-5" />
              {isLoading ? 'Đang đọc thẻ chip...' : 'Giả lập quét thẻ CCCD'}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
};
