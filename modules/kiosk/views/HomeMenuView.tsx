import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { Card } from '../components/Card';
import { 
  CreditCard, 
  QrCode, 
  Navigation, 
  Wallet, 
  CircleHelp 
} from 'lucide-react';

export const HomeMenuView: React.FC = () => {
  const selectHomeOption = useKioskStore((state) => state.selectHomeOption);

  return (
    <div className="w-full max-w-6xl mx-auto px-6 flex flex-col justify-center py-8 z-10">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* Row 1: 3 Items */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full">
          {/* Option 1: Đăng ký khám */}
          <Card 
            onClick={() => selectHomeOption('register')}
            icon={<CreditCard className="w-10 h-10 text-[#155DFC] group-active:text-white" strokeWidth={2.2} />}
            title="Đăng ký khám"
            description="Quét CCCD, chọn triệu chứng & đăng ký"
          />

          {/* Option 2: Xem phiếu khám */}
          <Card 
            onClick={() => selectHomeOption('patient_info')}
            icon={<QrCode className="w-10 h-10 text-[#155DFC] group-active:text-white" strokeWidth={2.2} />}
            title="Xem phiếu khám"
            description="In phiếu, xem hàng đợi & lộ trình khám"
          />

          {/* Option 3: Xem đường đi */}
          <Card 
            onClick={() => selectHomeOption('map')}
            icon={<Navigation className="w-10 h-10 text-[#155DFC] rotate-45 group-active:text-white" strokeWidth={2.2} />}
            title="Xem đường đi"
            description="Chỉ dẫn vị trí & phòng khám hiện tại"
          />
        </div>

        {/* Row 2: 2 Items Centered Relative to Row 1 */}
        <div className="flex flex-wrap justify-center gap-8 w-full">
          {/* Option 4: Thanh toán */}
          <Card 
            onClick={() => selectHomeOption('payment')}
            icon={<Wallet className="w-10 h-10 text-[#155DFC] group-active:text-white" strokeWidth={2.2} />}
            title="Thanh toán"
            description="Quét mã VietQR thanh toán viện phí"
            className="w-full sm:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)]"
          />

          {/* Option 5: Hỗ trợ */}
          <Card 
            onClick={() => selectHomeOption('support')}
            icon={<CircleHelp className="w-10 h-10 text-[#155DFC] group-active:text-white" strokeWidth={2.2} />}
            title="Hỗ trợ"
            description="Hướng dẫn sử dụng & thông tin tổng đài"
            className="w-full sm:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)]"
          />
        </div>
      </div>
    </div>
  );
};
