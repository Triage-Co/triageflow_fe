'use client';

import { useState, useEffect } from 'react';
import { 
    CreditCard, 
    QrCode, 
    Clock, 
    Navigation, 
    Printer, 
    Wallet, 
    CircleHelp, 
    ArrowLeft, 
    CheckCircle2, 
    Camera, 
    Loader2, 
    ShieldCheck, 
    ChevronRight,
    Search,
    Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types for the mock interface
type ModalType = null | 'scan_cccd' | 'scan_ticket' | 'queue' | 'map' | 'reprint' | 'payment' | 'help';

interface ClinicQueue {
    name: string;
    room: string;
    currentNumber: number;
    waitingCount: number;
}

export default function KioskPage() {
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [modalStep, setModalStep] = useState<number>(1);
    const [loadingAction, setLoadingAction] = useState<boolean>(false);
    const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
    
    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    };

    const handleOpenModal = (type: ModalType) => {
        setActiveModal(type);
        setModalStep(1);
    };

    const handleCloseModal = () => {
        setActiveModal(null);
        setModalStep(1);
        setLoadingAction(false);
    };
    
    // Auto-return to home after inactivity in modal (30 seconds)
    useEffect(() => {
        if (!activeModal) return;
        const timer = setTimeout(() => {
            handleCloseModal();
        }, 45000);
        return () => clearTimeout(timer);
    }, [activeModal, modalStep]);

    // Simulated scanning process for CCCD
    const handleSimulateScan = () => {
        setLoadingAction(true);
        setTimeout(() => {
            setLoadingAction(false);
            setModalStep(2); // Move to review step
        }, 2000);
    };

    // Simulated print action
    const handleSimulatePrint = () => {
        setLoadingAction(true);
        setTimeout(() => {
            setLoadingAction(false);
            setModalStep(3); // Success/Print screen
        }, 1800);
    };

    // Mock data for Clinic Queue
    const mockQueues: ClinicQueue[] = [
        { name: 'Phòng khám Nội Tổng Quát', room: 'P.101 - Tầng 1', currentNumber: 1042, waitingCount: 5 },
        { name: 'Phòng khám Ngoại Chấn Thương', room: 'P.105 - Tầng 1', currentNumber: 2018, waitingCount: 2 },
        { name: 'Phòng khám Nhi Khoa', room: 'P.112 - Tầng 1', currentNumber: 3055, waitingCount: 8 },
        { name: 'Phòng khám Tai Mũi Họng', room: 'P.202 - Tầng 2', currentNumber: 4012, waitingCount: 4 },
        { name: 'Phòng khám Mắt', room: 'P.206 - Tầng 2', currentNumber: 5007, waitingCount: 1 },
    ];

    return (
        <div 
            className="min-h-screen w-full flex flex-col font-sans select-none overflow-hidden relative"
            style={{ 
                background: 'radial-gradient(130% 120% at 20% 10%, #E6EFFF 0%, #F5F8FF 50%, #FFF3EC 100%)' 
            }}
        >
            {/* Toast Notifications Portal */}
            <div className="fixed top-5 right-5 z-[60] flex flex-col gap-2.5 max-w-sm w-full">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={cn(
                            "flex items-start gap-3 p-4 rounded-2xl shadow-lg border text-sm font-semibold animate-in fade-in-0 slide-in-from-top-5 duration-300 backdrop-blur-md select-none",
                            toast.type === 'success' && "bg-emerald-50/95 border-emerald-100/80 text-emerald-800",
                            toast.type === 'error' && "bg-rose-50/95 border-rose-100/80 text-rose-800",
                            toast.type === 'info' && "bg-indigo-50/95 border-indigo-100/80 text-indigo-800"
                        )}
                    >
                        {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
                        {toast.type === 'info' && <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />}
                        <span className="flex-1 leading-snug">{toast.message}</span>
                    </div>
                ))}
            </div>

            {/* Background glowing decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-orange-300/15 blur-[150px] rounded-full pointer-events-none" />

            {/* Header section */}
            <header className="w-full pt-16 pb-12 flex flex-col items-center text-center z-10">
                <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#155DFC] flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 11H16M12 15H16M8 11H8.01M8 15H8.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <span className="text-4xl font-extrabold text-[#1E2939] tracking-tight">
                        TriageFlow<span className="text-[#155DFC]">OPD</span>
                    </span>
                </div>
                <h1 className="text-xl font-semibold text-[#4A5565] tracking-wide">
                    Hệ thống tự phục vụ bệnh viện thông minh
                </h1>
            </header>

            {/* Menu options grid container */}
            <main className="flex-1 w-full max-w-6xl mx-auto px-6 flex flex-col justify-center pb-20 z-10">
                {/* Row 1 (4 columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    {/* Card 1 */}
                    <button 
                        onClick={() => handleOpenModal('scan_cccd')}
                        className="w-full aspect-[4/3] bg-white text-[#1E2939] rounded-[32px] p-6 flex flex-col items-center justify-center text-center shadow-md border border-neutral-100 hover:shadow-xl hover:scale-[1.03] active:bg-[#155DFC] active:text-white active:border-transparent active:scale-[0.98] transition-all duration-200 group cursor-pointer"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-[#E8F0FE] group-active:bg-white/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                            <CreditCard className="w-8 h-8 text-[#155DFC] group-active:text-white" strokeWidth={2.2} />
                        </div>
                        <h3 className="text-[19px] font-bold tracking-wide mb-1.5">Quét CCCD / VNeID</h3>
                        <p className="text-[#4A5565] group-active:text-white/80 text-sm font-medium">Đăng ký khám bệnh</p>
                    </button>

                    {/* Card 2 */}
                    <button 
                        onClick={() => handleOpenModal('scan_ticket')}
                        className="w-full aspect-[4/3] bg-white text-[#1E2939] rounded-[32px] p-6 flex flex-col items-center justify-center text-center shadow-md border border-neutral-100 hover:shadow-xl hover:scale-[1.03] active:bg-[#155DFC] active:text-white active:border-transparent active:scale-[0.98] transition-all duration-200 group cursor-pointer"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-[#E8F0FE] group-active:bg-white/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                            <QrCode className="w-8 h-8 text-[#155DFC] group-active:text-white" strokeWidth={2.2} />
                        </div>
                        <h3 className="text-[19px] font-bold tracking-wide mb-1.5">Quét Phiếu khám</h3>
                        <p className="text-[#4A5565] group-active:text-white/80 text-sm font-medium">Tra cứu thông tin</p>
                    </button>

                    {/* Card 3 */}
                    <button 
                        onClick={() => handleOpenModal('queue')}
                        className="w-full aspect-[4/3] bg-white text-[#1E2939] rounded-[32px] p-6 flex flex-col items-center justify-center text-center shadow-md border border-neutral-100 hover:shadow-xl hover:scale-[1.03] active:bg-[#155DFC] active:text-white active:border-transparent active:scale-[0.98] transition-all duration-200 group cursor-pointer"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-[#E8F0FE] group-active:bg-white/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                            <Clock className="w-8 h-8 text-[#155DFC] group-active:text-white" strokeWidth={2.2} />
                        </div>
                        <h3 className="text-[19px] font-bold tracking-wide mb-1.5">Xem hàng đợi</h3>
                        <p className="text-[#4A5565] group-active:text-white/80 text-sm font-medium">Kiểm tra số thứ tự</p>
                    </button>

                    {/* Card 4 */}
                    <button 
                        onClick={() => handleOpenModal('map')}
                        className="w-full aspect-[4/3] bg-white text-[#1E2939] rounded-[32px] p-6 flex flex-col items-center justify-center text-center shadow-md border border-neutral-100 hover:shadow-xl hover:scale-[1.03] active:bg-[#155DFC] active:text-white active:border-transparent active:scale-[0.98] transition-all duration-200 group cursor-pointer"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-[#E8F0FE] group-active:bg-white/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                            <Navigation className="w-8 h-8 text-[#155DFC] rotate-45 group-active:text-white" strokeWidth={2.2} />
                        </div>
                        <h3 className="text-[19px] font-bold tracking-wide mb-1.5">Xem đường đi</h3>
                        <p className="text-[#4A5565] group-active:text-white/80 text-sm font-medium">Chỉ dẫn phòng khám</p>
                    </button>
                </div>

                {/* Row 2 (3 columns centered) */}
                <div className="flex flex-wrap justify-center gap-6">
                    {/* Card 5 */}
                    <button 
                        onClick={() => handleOpenModal('reprint')}
                        className="w-full sm:w-[calc(50%-12px)] lg:w-[270px] aspect-[4/3] bg-white text-[#1E2939] rounded-[32px] p-6 flex flex-col items-center justify-center text-center shadow-md border border-neutral-100 hover:shadow-xl hover:scale-[1.03] active:bg-[#155DFC] active:text-white active:border-transparent active:scale-[0.98] transition-all duration-200 group cursor-pointer"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-[#E8F0FE] group-active:bg-white/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                            <Printer className="w-8 h-8 text-[#155DFC] group-active:text-white" strokeWidth={2.2} />
                        </div>
                        <h3 className="text-[19px] font-bold tracking-wide mb-1.5">In lại phiếu khám</h3>
                        <p className="text-[#4A5565] group-active:text-white/80 text-sm font-medium">Lấy lại Master QR</p>
                    </button>

                    {/* Card 6 */}
                    <button 
                        onClick={() => handleOpenModal('payment')}
                        className="w-full sm:w-[calc(50%-12px)] lg:w-[270px] aspect-[4/3] bg-white text-[#1E2939] rounded-[32px] p-6 flex flex-col items-center justify-center text-center shadow-md border border-neutral-100 hover:shadow-xl hover:scale-[1.03] active:bg-[#155DFC] active:text-white active:border-transparent active:scale-[0.98] transition-all duration-200 group cursor-pointer"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-[#E8F0FE] group-active:bg-white/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                            <Wallet className="w-8 h-8 text-[#155DFC] group-active:text-white" strokeWidth={2.2} />
                        </div>
                        <h3 className="text-[19px] font-bold tracking-wide mb-1.5">Thanh toán QR</h3>
                        <p className="text-[#4A5565] group-active:text-white/80 text-sm font-medium">Quét mã thanh toán</p>
                    </button>

                    {/* Card 7 */}
                    <button 
                        onClick={() => handleOpenModal('help')}
                        className="w-full sm:w-[calc(50%-12px)] lg:w-[270px] aspect-[4/3] bg-white text-[#1E2939] rounded-[32px] p-6 flex flex-col items-center justify-center text-center shadow-md border border-neutral-100 hover:shadow-xl hover:scale-[1.03] active:bg-[#155DFC] active:text-white active:border-transparent active:scale-[0.98] transition-all duration-200 group cursor-pointer"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-[#E8F0FE] group-active:bg-white/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                            <CircleHelp className="w-8 h-8 text-[#155DFC] group-active:text-white" strokeWidth={2.2} />
                        </div>
                        <h3 className="text-[19px] font-bold tracking-wide mb-1.5">Hỗ trợ</h3>
                        <p className="text-[#4A5565] group-active:text-white/80 text-sm font-medium">Cần giúp đỡ?</p>
                    </button>
                </div>
            </main>

            {/* Footer decoration */}
            <footer className="w-full pb-6 text-center text-xs text-[#4A5565]/60 font-semibold z-10 tracking-wider uppercase select-none">
                Chạm vào màn hình để bắt đầu thao tác • TriageFlowOPD v1.0.0
            </footer>

            {/* ── MODALS & FLOW SIMULATORS ────────────────────────────────────────── */}
            {activeModal && (
                <div className="fixed inset-0 z-50 bg-[#1E2939]/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in-0 duration-300">
                    <div className="bg-white w-full max-w-3xl rounded-[36px] shadow-2xl overflow-hidden border border-neutral-100/50 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                            <button 
                                onClick={handleCloseModal}
                                className="flex items-center gap-2 text-[#4A5565] hover:text-[#1E2939] font-bold text-base transition-colors duration-200"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                Quay lại
                            </button>
                            <span className="text-xs font-extrabold uppercase tracking-widest text-[#155DFC] bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100/50">
                                {activeModal === 'scan_cccd' && 'Đăng ký CCCD'}
                                {activeModal === 'scan_ticket' && 'Tra cứu phiếu khám'}
                                {activeModal === 'queue' && 'Bảng theo dõi hàng đợi'}
                                {activeModal === 'map' && 'Bản đồ phòng khám'}
                                {activeModal === 'reprint' && 'In lại phiếu khám'}
                                {activeModal === 'payment' && 'Thanh toán viện phí'}
                                {activeModal === 'help' && 'Hỗ trợ khách hàng'}
                            </span>
                        </div>

                        {/* Modal Body Container */}
                        <div className="flex-1 overflow-y-auto p-8">
                            
                            {/* ── FLOW 1: SCAN CCCD / VNEID ── */}
                            {activeModal === 'scan_cccd' && (
                                <div className="space-y-6">
                                    {modalStep === 1 && (
                                        <div className="flex flex-col items-center text-center space-y-6 py-6">
                                            <div className="relative w-72 h-44 rounded-2xl border-4 border-dashed border-[#155DFC] bg-blue-50/20 flex flex-col items-center justify-center overflow-hidden">
                                                {/* Simulated scan green line sweep */}
                                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500 animate-bounce shadow-[0_0_15px_#10B981]" />
                                                <Camera className="w-12 h-12 text-[#155DFC] mb-2 animate-pulse" />
                                                <p className="text-sm font-semibold text-[#155DFC] uppercase tracking-wide">Đặt thẻ vào vùng quét</p>
                                            </div>
                                            <div className="space-y-2 max-w-md">
                                                <h3 className="text-xl font-bold text-[#1E2939]">Vui lòng xuất trình thẻ CCCD hoặc QR VNeID</h3>
                                                <p className="text-sm text-[#4A5565] font-medium leading-relaxed">
                                                    Đặt mặt trước của thẻ CCCD gắn chip vào máy ảnh của Kiosk hoặc hiển thị mã QR VNeID trên điện thoại để hệ thống nhận diện tự động.
                                                </p>
                                            </div>
                                            <button 
                                                onClick={handleSimulateScan}
                                                disabled={loadingAction}
                                                className="px-8 py-3.5 bg-[#155DFC] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                            >
                                                {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                                {loadingAction ? 'Đang đọc thẻ chip...' : 'Giả lập quét thẻ CCCD'}
                                            </button>
                                        </div>
                                    )}

                                    {modalStep === 2 && (
                                        <div className="space-y-6">
                                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-start gap-3">
                                                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="font-bold text-emerald-800">Quét thành công!</h4>
                                                    <p className="text-sm text-emerald-700 font-medium">Hệ thống đã trích xuất được thông tin từ thẻ CCCD gắn chip của bạn.</p>
                                                </div>
                                            </div>

                                            <div className="bg-neutral-50/80 rounded-2xl border border-neutral-100 p-6 space-y-4">
                                                <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-2">Thông tin người bệnh</h4>
                                                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                                    <div className="space-y-1">
                                                        <span className="text-xs text-neutral-400 font-medium">Họ và tên</span>
                                                        <p className="text-base font-bold text-[#1E2939]">NGUYỄN VĂN A</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-xs text-neutral-400 font-medium">Mã số CCCD</span>
                                                        <p className="text-base font-bold text-[#1E2939]">038095001234</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-xs text-neutral-400 font-medium">Ngày sinh</span>
                                                        <p className="text-base font-bold text-[#1E2939]">15 / 10 / 1995</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-xs text-neutral-400 font-medium">Giới tính</span>
                                                        <p className="text-base font-bold text-[#1E2939]">Nam</p>
                                                    </div>
                                                    <div className="space-y-1 col-span-2">
                                                        <span className="text-xs text-neutral-400 font-medium">Địa chỉ thường trú</span>
                                                        <p className="text-base font-bold text-[#1E2939]">123 Đường Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-3 pt-2">
                                                <button 
                                                    onClick={() => setModalStep(1)} 
                                                    className="px-6 py-3 border border-neutral-200 text-neutral-600 font-bold rounded-2xl hover:bg-neutral-50 active:scale-[0.98] transition-all cursor-pointer"
                                                >
                                                    Quét lại
                                                </button>
                                                <button 
                                                    onClick={handleSimulatePrint} 
                                                    disabled={loadingAction}
                                                    className="px-8 py-3 bg-[#155DFC] text-white font-bold rounded-2xl hover:bg-blue-700 shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                                >
                                                    {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
                                                    Xác nhận & In số thứ tự
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {modalStep === 3 && (
                                        <div className="flex flex-col items-center text-center space-y-6 py-6 animate-in fade-in zoom-in duration-300">
                                            <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center text-emerald-500 shadow-inner">
                                                <CheckCircle2 className="w-12 h-12" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-2xl font-bold text-[#1E2939]">Đăng ký khám thành công!</h3>
                                                <p className="text-sm text-[#4A5565] font-medium max-w-sm mx-auto">
                                                    Hệ thống đang in phiếu khám bệnh của bạn. Vui lòng lấy phiếu ở cổng in nhiệt bên dưới Kiosk.
                                                </p>
                                            </div>

                                            {/* Mock medical slip display */}
                                            <div className="w-72 border border-neutral-200 bg-neutral-50 p-6 rounded-2xl shadow-inner text-left font-mono space-y-3 relative text-xs">
                                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-neutral-300 rounded-t-2xl border-b border-dashed border-neutral-400" />
                                                <div className="text-center font-bold text-sm mb-2 border-b border-dashed border-neutral-300 pb-2">
                                                    PHIẾU ĐĂNG KÝ KHÁM
                                                    <p className="text-[10px] text-neutral-400 font-normal">TriageFlowOPD</p>
                                                </div>
                                                <div><span className="font-bold">Họ tên:</span> NGUYỄN VĂN A</div>
                                                <div><span className="font-bold">Ngày sinh:</span> 15/10/1995</div>
                                                <div><span className="font-bold">Thời gian:</span> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
                                                <div className="border-t border-b border-dashed border-neutral-300 py-3 text-center my-2">
                                                    <span className="text-[10px] text-neutral-400 block font-normal">SỐ THỨ TỰ TỰ ĐỘNG</span>
                                                    <span className="text-3xl font-extrabold text-[#1E2939] tracking-wider">A - 105</span>
                                                </div>
                                                <div className="text-center text-[10px] text-neutral-400">
                                                    Vui lòng di chuyển đến Phòng khám số 101 để đợi gọi tên.
                                                </div>
                                            </div>

                                            <button 
                                                onClick={handleCloseModal}
                                                className="px-8 py-3 bg-[#1E2939] text-white font-bold rounded-2xl hover:bg-neutral-800 transition-all cursor-pointer"
                                            >
                                                Hoàn tất giao dịch
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── FLOW 2: SCAN TICKET ── */}
                            {activeModal === 'scan_ticket' && (
                                <div className="flex flex-col items-center text-center space-y-6 py-6">
                                    <div className="w-48 h-48 bg-neutral-100 rounded-3xl flex items-center justify-center border-2 border-neutral-200">
                                        <QrCode className="w-32 h-32 text-neutral-400 animate-pulse" strokeWidth={1} />
                                    </div>
                                    <div className="space-y-2 max-w-sm">
                                        <h3 className="text-xl font-bold text-[#1E2939]">Hướng mã QR của phiếu vào camera</h3>
                                        <p className="text-sm text-[#4A5565] font-medium leading-relaxed">
                                            Hệ thống sẽ tự động quét mã QR trên phiếu khám cũ để kiểm tra thông tin lịch hẹn, thanh toán hoặc đơn thuốc đi kèm.
                                        </p>
                                    </div>
                                    <div className="w-full max-w-md flex gap-2">
                                        <input 
                                            type="text" 
                                            placeholder="Nhập mã phiếu khám bằng tay..." 
                                            className="flex-1 px-4 py-3 rounded-2xl border border-neutral-200 text-sm focus:outline-none focus:border-[#155DFC] font-semibold"
                                        />
                                        <button 
                                            onClick={handleSimulateScan}
                                            className="px-5 py-3 bg-[#155DFC] text-white font-bold rounded-2xl hover:bg-blue-600 transition-colors flex items-center justify-center"
                                        >
                                            <Search className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── FLOW 3: QUEUE TRACKER ── */}
                            {activeModal === 'queue' && (
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4 text-[#1E2939] text-sm">
                                        <Clock className="w-5 h-5 text-[#155DFC] shrink-0" />
                                        <p className="font-semibold leading-relaxed">
                                            Danh sách số thứ tự khám đang diễn ra tại các phòng chức năng. Người bệnh chú ý theo dõi số thứ tự của mình.
                                        </p>
                                    </div>

                                    <div className="border border-neutral-100 rounded-2xl overflow-hidden shadow-inner">
                                        <table className="w-full border-collapse text-left text-sm">
                                            <thead>
                                                <tr className="bg-neutral-50 border-b border-neutral-100 font-bold text-neutral-500 uppercase tracking-wider text-xs">
                                                    <th className="px-6 py-4">Tên phòng khám</th>
                                                    <th className="px-6 py-4">Phòng / Vị trí</th>
                                                    <th className="px-6 py-4 text-center">Đang gọi</th>
                                                    <th className="px-6 py-4 text-center">Đang đợi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-100 font-medium text-neutral-700">
                                                {mockQueues.map((q, idx) => (
                                                    <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-[#1E2939]">{q.name}</td>
                                                        <td className="px-6 py-4 text-neutral-500">{q.room}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="inline-block px-3.5 py-1.5 bg-blue-50 text-[#155DFC] rounded-xl font-extrabold text-base tracking-wider border border-blue-100/50">
                                                                {q.currentNumber}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center text-neutral-400 font-bold">{q.waitingCount} người</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ── FLOW 4: MAPS ── */}
                            {activeModal === 'map' && (
                                <div className="space-y-6 text-center">
                                    <div className="relative rounded-3xl overflow-hidden border border-neutral-200 bg-neutral-100 flex items-center justify-center p-2 shadow-inner group">
                                        {/* Mock diagram for floor plan navigation */}
                                        <div className="w-full aspect-[16/10] bg-white rounded-2xl relative p-6 font-semibold flex flex-col justify-between overflow-hidden">
                                            {/* Top map elements */}
                                            <div className="flex justify-between w-full relative z-10 text-xs">
                                                <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-xl">Phòng Cấp cứu</div>
                                                <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl">Nhà thuốc Bệnh viện</div>
                                            </div>

                                            {/* Pathway center decoration */}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-ping mb-1" />
                                                <div className="px-3 py-1.5 bg-[#155DFC] text-white text-[11px] rounded-lg shadow-md font-bold uppercase tracking-wider scale-95">Bạn đang ở đây</div>
                                                
                                                {/* Simulated path */}
                                                <svg className="w-64 h-32 text-blue-500 stroke-2 mt-4" viewBox="0 0 200 100" fill="none">
                                                    <path d="M100 90 C 80 40, 120 40, 50 20" stroke="currentColor" strokeWidth="3" strokeDasharray="6 4" strokeLinecap="round" className="animate-pulse" />
                                                    <polygon points="50,20 58,25 55,18" fill="currentColor" />
                                                </svg>
                                            </div>

                                            {/* Bottom map elements */}
                                            <div className="flex justify-between w-full relative z-10 text-xs">
                                                <div className="p-3 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl">Phòng khám 101 - 105</div>
                                                <div className="p-3 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl">Khu X-Quang / Xét nghiệm</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-bold text-[#1E2939]">Chỉ dẫn hành lang Tầng 1</h3>
                                        <p className="text-sm text-[#4A5565] font-medium max-w-md mx-auto">
                                            Đi dọc theo hành lang bên trái khoảng 20m để đến khu vực phòng khám nội tổng quát hoặc đi thẳng để sang quầy xét nghiệm.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ── FLOW 5: REPRINT ── */}
                            {activeModal === 'reprint' && (
                                <div className="flex flex-col items-center text-center space-y-6 py-6">
                                    <div className="w-20 h-20 rounded-full bg-[#E8F0FE] flex items-center justify-center text-[#155DFC] mb-2">
                                        <Printer className="w-10 h-10" />
                                    </div>
                                    <div className="space-y-2 max-w-sm">
                                        <h3 className="text-xl font-bold text-[#1E2939]">In lại phiếu số thứ tự</h3>
                                        <p className="text-sm text-[#4A5565] font-medium leading-relaxed">
                                            Nếu bạn vô tình làm mất phiếu khám hoặc phiếu khám của bạn bị rách, mờ, hãy quét lại mã căn cước hoặc nhập số điện thoại để hệ thống in lại phiếu.
                                        </p>
                                    </div>
                                    <div className="w-full max-w-md flex gap-2">
                                        <input 
                                            type="text" 
                                            placeholder="Nhập số điện thoại đăng ký..." 
                                            className="flex-1 px-4 py-3 rounded-2xl border border-neutral-200 text-sm focus:outline-none focus:border-[#155DFC] font-semibold"
                                        />
                                        <button 
                                            onClick={handleSimulatePrint}
                                            className="px-6 py-3 bg-[#155DFC] text-white font-bold rounded-2xl hover:bg-blue-600 transition-colors"
                                        >
                                            In lại phiếu
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── FLOW 6: PAYMENT ── */}
                            {activeModal === 'payment' && (
                                <div className="space-y-6">
                                    {modalStep === 1 && (
                                        <div className="flex flex-col items-center text-center space-y-6 py-6">
                                            <div className="w-20 h-20 rounded-full bg-[#E8F0FE] flex items-center justify-center text-[#155DFC] mb-2">
                                                <Wallet className="w-10 h-10" />
                                            </div>
                                            <div className="space-y-2 max-w-sm">
                                                <h3 className="text-xl font-bold text-[#1E2939]">Thanh toán viện phí không tiền mặt</h3>
                                                <p className="text-sm text-[#4A5565] font-medium leading-relaxed">
                                                    Quét mã barcode/QR trên phiếu khám hoặc nhập mã thanh toán để kiểm tra hóa đơn viện phí hiện tại.
                                                </p>
                                            </div>
                                            <div className="w-full max-w-md flex gap-2">
                                                <input 
                                                    type="text" 
                                                    placeholder="Nhập mã hóa đơn..." 
                                                    className="flex-1 px-4 py-3 rounded-2xl border border-neutral-200 text-sm focus:outline-none focus:border-[#155DFC] font-semibold"
                                                />
                                                <button 
                                                    onClick={() => setModalStep(2)}
                                                    className="px-8 py-3 bg-[#155DFC] text-white font-bold rounded-2xl hover:bg-blue-600 transition-colors"
                                                >
                                                    Tìm kiếm
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {modalStep === 2 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-4">
                                            {/* Bill breakdown */}
                                            <div className="space-y-5">
                                                <h3 className="text-lg font-bold text-[#1E2939] border-b border-neutral-100 pb-2">Chi tiết hóa đơn thanh toán</h3>
                                                <div className="space-y-3.5 text-sm">
                                                    <div className="flex justify-between"><span className="text-neutral-400">Mã hóa đơn:</span> <span className="font-bold text-[#1E2939]">TF-9042A</span></div>
                                                    <div className="flex justify-between"><span className="text-neutral-400">Người bệnh:</span> <span className="font-bold text-[#1E2939]">NGUYỄN VĂN A</span></div>
                                                    <div className="flex justify-between"><span className="text-neutral-400">Phí khám lâm sàng:</span> <span className="font-bold text-[#1E2939]">150.000 VND</span></div>
                                                    <div className="flex justify-between"><span className="text-neutral-400">Phí xét nghiệm sinh hóa:</span> <span className="font-bold text-[#1E2939]">300.000 VND</span></div>
                                                    <div className="flex justify-between border-t border-neutral-100 pt-3 text-base"><span className="font-bold text-neutral-700">Tổng thanh toán:</span> <span className="font-extrabold text-[#155DFC]">450.000 VND</span></div>
                                                </div>
                                                <div className="bg-amber-50 border border-amber-100 text-amber-800 text-xs font-semibold rounded-xl p-3.5 leading-relaxed">
                                                    ⚠️ Lưu ý: Sau khi quét mã QR thanh toán thành công, vui lòng đợi 5-10 giây để hệ thống Kiosk in hóa đơn xác thực.
                                                </div>
                                            </div>

                                            {/* Simulated VietQR */}
                                            <div className="flex flex-col items-center text-center p-6 bg-neutral-50 rounded-3xl border border-neutral-100 shadow-inner">
                                                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Mã VietQR quét thanh toán</span>
                                                <div className="w-48 h-48 bg-white border border-neutral-200 p-2.5 rounded-2xl flex items-center justify-center shadow-md relative group">
                                                    <QrCode className="w-full h-full text-[#1E2939]" strokeWidth={1.5} />
                                                    <div className="absolute inset-0 bg-[#155DFC]/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none">
                                                        <span className="px-3 py-1.5 bg-white text-[#155DFC] text-xs font-bold rounded-lg shadow-sm border border-neutral-100">Scan QR</span>
                                                    </div>
                                                </div>
                                                <p className="text-xs font-bold text-neutral-500 mt-4">Hỗ trợ mọi ứng dụng ngân hàng và Ví điện tử</p>
                                                <button 
                                                    onClick={handleSimulatePrint}
                                                    className="mt-5 w-full py-3 bg-[#155DFC] text-white font-bold rounded-2xl hover:bg-blue-600 transition-colors shadow-sm"
                                                >
                                                    Giả lập thanh toán thành công
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {modalStep === 3 && (
                                        <div className="flex flex-col items-center text-center space-y-6 py-6 animate-in fade-in zoom-in duration-300">
                                            <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center text-emerald-500">
                                                <CheckCircle2 className="w-12 h-12" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-2xl font-bold text-[#1E2939]">Giao dịch hoàn tất!</h3>
                                                <p className="text-sm text-[#4A5565] font-medium max-w-sm mx-auto">
                                                    Thanh toán viện phí thành công. Hóa đơn VAT kiêm biên lai thu tiền đang được in ra từ cổng Kiosk.
                                                </p>
                                            </div>
                                            <button 
                                                onClick={handleCloseModal}
                                                className="px-8 py-3 bg-[#1E2939] text-white font-bold rounded-2xl hover:bg-neutral-800 transition-all cursor-pointer"
                                            >
                                                Trở về trang chủ
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── FLOW 7: HELP ── */}
                            {activeModal === 'help' && (
                                <div className="space-y-6 py-2">
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-[#1E2939] border-b border-neutral-100 pb-2">Câu hỏi thường gặp tại Kiosk</h3>
                                        
                                        <div className="space-y-3.5">
                                            <div className="border border-neutral-100 rounded-xl p-4 bg-neutral-50/50">
                                                <h4 className="font-bold text-[#1E2939] flex items-center gap-2 mb-1.5"><ChevronRight className="w-4 h-4 text-[#155DFC]" /> Đăng ký khám qua Kiosk cần những giấy tờ gì?</h4>
                                                <p className="text-sm text-[#4A5565] leading-relaxed font-medium pl-6">Bạn chỉ cần chuẩn bị thẻ Căn cước công dân gắn chíp hoặc ứng dụng VNeID (mã QR) định danh điện tử cấp độ 2 là có thể đăng ký tự động nhanh chóng.</p>
                                            </div>
                                            <div className="border border-neutral-100 rounded-xl p-4 bg-neutral-50/50">
                                                <h4 className="font-bold text-[#1E2939] flex items-center gap-2 mb-1.5"><ChevronRight className="w-4 h-4 text-[#155DFC]" /> Làm thế nào để thanh toán viện phí bằng QR ngân hàng?</h4>
                                                <p className="text-sm text-[#4A5565] leading-relaxed font-medium pl-6">Chọn mục &apos;Thanh toán QR&apos;, dùng camera Kiosk để quét mã vạch trên phiếu khám hoặc nhập mã thanh toán. Khi hóa đơn hiện ra, dùng bất kỳ app ngân hàng hoặc ví MoMo, ZaloPay quét VietQR được hiển thị.</p>
                                            </div>
                                            <div className="border border-neutral-100 rounded-xl p-4 bg-neutral-50/50">
                                                <h4 className="font-bold text-[#1E2939] flex items-center gap-2 mb-1.5"><ChevronRight className="w-4 h-4 text-[#155DFC]" /> Gặp lỗi kẹt giấy hoặc lỗi hệ thống xử lý ra sao?</h4>
                                                <p className="text-sm text-[#4A5565] leading-relaxed font-medium pl-6">Vui lòng liên hệ nhân viên tiếp đón tại quầy hướng dẫn ngay bên cạnh Kiosk hoặc nhấn chuông gọi trợ giúp khẩn cấp trên màn hình.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-center justify-between text-[#1E2939]">
                                        <div className="space-y-0.5">
                                            <h4 className="font-bold text-[#1E2939]">Yêu cầu nhân viên hỗ trợ trực tiếp</h4>
                                            <p className="text-xs text-[#4A5565] font-medium">Nhân viên tiếp đón sẽ di chuyển đến Kiosk của bạn trong vòng 1-2 phút.</p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                showToast('Đang gọi nhân viên hỗ trợ. Vui lòng đợi tại Kiosk...', 'info');
                                                handleCloseModal();
                                            }}
                                            className="px-6 py-3 bg-[#155DFC] text-white font-bold rounded-xl hover:bg-blue-600 shadow-md active:scale-95 transition-all text-sm cursor-pointer"
                                        >
                                            Gửi yêu cầu hỗ trợ
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
