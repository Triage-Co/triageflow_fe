import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { useFlowStore } from '../store/flowStore';
import { ArrowLeft, MapPin, Navigation, Compass, Layers } from 'lucide-react';

export const MapView: React.FC = () => {
  const goHome = useKioskStore((state) => state.goHome);
  const activeTicket = useFlowStore((state) => state.activeTicket);

  const stepsList = [
    { num: 1, text: 'Đi thẳng về phía trước', sub: '50m' },
    { num: 2, text: 'Rẽ phải tại hành lang chính', sub: 'Đi tiếp 30m' },
    { num: 3, text: 'Lên thang máy tầng 2', sub: 'Khu thang máy B' },
    { num: 4, text: 'Rẽ trái, phòng LAB-02 ở bên phải', sub: '40m' },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-6 z-10 space-y-6">
      {/* Header bar */}
      <div className="flex items-center gap-4">
        <button 
          onClick={goHome} 
          className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full text-xs font-bold text-neutral-700 shadow-sm border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <h2 className="text-2xl font-black text-[#1E2939] tracking-tight">
          Chỉ dẫn đường đi
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Top Destination Card */}
          <div className="bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 space-y-4">
            <div className="flex items-center gap-2 text-[#155DFC] font-bold text-xs">
              <MapPin className="w-4 h-4" />
              <span>Điểm đến</span>
            </div>

            <div className="space-y-1 border-b border-neutral-100 pb-3">
              <h3 className="text-xl font-extrabold text-[#1E2939]">{activeTicket?.roomNumber || 'LAB-02'}</h3>
              <p className="text-xs font-bold text-neutral-600">Phòng Xét nghiệm máu</p>
              <p className="text-xs text-neutral-400 font-medium">{activeTicket?.location || 'Tầng 2 - Khu B'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-neutral-600">
              <div>
                <span className="text-neutral-400 block mb-0.5">Khoảng cách</span>
                <span className="font-extrabold text-[#1E2939] text-sm">~120m</span>
              </div>
              <div>
                <span className="text-neutral-400 block mb-0.5">Thời gian đi bộ</span>
                <span className="font-extrabold text-[#1E2939] text-sm">~3 phút</span>
              </div>
            </div>
          </div>

          {/* Bottom Step-by-Step Card */}
          <div className="bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 space-y-4">
            <h4 className="font-extrabold text-[#1E2939] text-sm">Hướng dẫn từng bước</h4>
            
            <div className="space-y-3">
              {stepsList.map((st) => (
                <div key={st.num} className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-[#155DFC] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-sm">
                    {st.num}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-[#1E2939]">{st.text}</h5>
                    <p className="text-[11px] text-neutral-400 font-medium">{st.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Hospital Map Diagram (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-[28px] p-6 shadow-md border border-neutral-100 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-[#1E2939] text-base">Sơ đồ bệnh viện</h4>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-50 text-[#155DFC] rounded-full text-xs font-extrabold border border-blue-100">
                Tầng 2
              </span>
              <span className="px-3 py-1 bg-blue-50 text-[#155DFC] rounded-full text-xs font-extrabold border border-blue-100">
                Khu B
              </span>
            </div>
          </div>

          {/* Graphic Canvas */}
          <div className="relative rounded-2xl bg-neutral-50 border border-neutral-200/80 p-6 aspect-[16/11] flex flex-col justify-between overflow-hidden shadow-inner">
            {/* Map Floor Grid Line Art */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#155DFC_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* Elevator Icon Badge */}
            <div className="absolute right-12 bottom-20 bg-neutral-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 shadow-md">
              <span>↑ Thang máy B</span>
            </div>

            {/* User Location Dot */}
            <div className="absolute top-1/2 left-1/3 flex items-center gap-2">
              <div className="w-3.5 h-3.5 bg-[#155DFC] rounded-full animate-ping shadow-md" />
              <span className="text-xs font-extrabold text-[#155DFC] bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-sm">
                Vị trí của bạn
              </span>
            </div>

            {/* Path Graphic SVG */}
            <svg className="absolute inset-0 w-full h-full text-[#155DFC] pointer-events-none" viewBox="0 0 400 300" fill="none">
              <path 
                d="M 140 150 L 220 150 L 220 220 L 300 220" 
                stroke="currentColor" 
                strokeWidth="4" 
                strokeDasharray="6 4" 
                strokeLinecap="round" 
                className="animate-pulse" 
              />
            </svg>

            {/* Legend Box */}
            <div className="absolute left-6 bottom-6 bg-white/90 backdrop-blur-md p-3 rounded-xl border border-neutral-200 text-[10px] font-bold space-y-1 shadow-sm">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#155DFC]" /> Vị trí hiện tại</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Điểm đến</div>
              <div className="flex items-center gap-2"><span className="w-5 h-0.5 bg-blue-500 border-dashed" /> Lộ trình</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
