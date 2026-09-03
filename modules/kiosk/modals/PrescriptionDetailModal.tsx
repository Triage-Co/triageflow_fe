import React from 'react';
import {
  X,
  FileText,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  QrCode,
  Loader2,
  Pill,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { PrescriptionData } from '../types/prescription.types';
import { formatVND } from '../utils/kioskHelpers';
import { cn } from '@/lib/utils';

interface PrescriptionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescription: PrescriptionData | null;
  isLoading?: boolean;
  onSelectPay?: (prescription: PrescriptionData) => void;
}

const getStatusBadge = (status?: string) => {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return {
        label: 'Chờ thanh toán',
        className: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    case 'PROCESSING':
    case 'PAID':
      return {
        label: 'Đang soạn thuốc',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    case 'PREPARED':
      return {
        label: 'Sẵn sàng lấy thuốc',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'COMPLETED':
      return {
        label: 'Đã nhận thuốc',
        className: 'bg-green-50 text-green-700 border-green-200',
      };
    case 'CANCELLED':
      return {
        label: 'Đã hủy',
        className: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    default:
      return {
        label: status || 'Chờ xử lý',
        className: 'bg-slate-50 text-slate-700 border-slate-200',
      };
  }
};

export const PrescriptionDetailModal: React.FC<PrescriptionDetailModalProps> = ({
  isOpen,
  onClose,
  prescription,
  isLoading = false,
  onSelectPay,
}) => {
  if (!isOpen) return null;

  const details = prescription?.prescriptionDetails || prescription?.details || [];
  const statusBadge = getStatusBadge(prescription?.status);
  const isPendingPayment = prescription?.status?.toUpperCase() === 'PENDING';

  const qrData =
    prescription?.qr_code ||
    prescription?.prescription_code ||
    prescription?.prescription_id ||
    '';
  const qrUrl = qrData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`
    : null;

  const formattedDate = prescription?.created_at
    ? new Date(prescription.created_at).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/60 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#155DFC] flex items-center justify-center border border-blue-100/80 shadow-xs">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">
                Chi tiết đơn thuốc
              </h3>
              <p className="text-[11px] text-slate-500 font-bold">
                Toa thuốc điều trị do Bác sĩ kê đơn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer active:scale-90"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 text-[#155DFC] animate-spin" />
              <p className="text-slate-600 font-bold text-sm">Đang tải thông tin đơn thuốc...</p>
            </div>
          ) : !prescription ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
              <div className="w-20 h-20 rounded-3xl bg-blue-50/80 text-[#155DFC] flex items-center justify-center shadow-inner">
                <Pill className="w-10 h-10" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-lg font-black text-slate-800">
                  Chưa có đơn thuốc của phiên khám này
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                  Sau khi hoàn tất quá trình khám bệnh, bác sĩ sẽ kê đơn và đơn thuốc sẽ xuất hiện tại đây.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          ) : (
            <>
              {/* Prescription Header Info Card */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl p-4.5 sm:p-5 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Mã đơn thuốc:
                    </span>
                    <span className="font-mono font-black text-slate-900 text-sm sm:text-base bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {prescription.prescription_code || '---'}
                    </span>
                  </div>

                  <span
                    className={cn(
                      'px-3 py-1 rounded-xl text-xs font-extrabold border',
                      statusBadge.className
                    )}
                  >
                    {statusBadge.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  {/* Doctor & Date info */}
                  <div className="sm:col-span-8 space-y-2.5 text-xs">
                    {prescription.doctor?.full_name && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <User className="w-4 h-4 text-[#155DFC] shrink-0" />
                        <span className="font-medium text-slate-500">Bác sĩ kê đơn:</span>
                        <strong className="font-black text-slate-900 text-sm">
                          BS. {prescription.doctor.full_name}
                        </strong>
                      </div>
                    )}

                    {formattedDate && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <Calendar className="w-4 h-4 text-[#155DFC] shrink-0" />
                        <span className="font-medium text-slate-500">Ngày kê đơn:</span>
                        <strong className="font-bold text-slate-800">{formattedDate}</strong>
                      </div>
                    )}

                    {prescription.serviceOrder?.payment_status && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <CreditCard className="w-4 h-4 text-[#155DFC] shrink-0" />
                        <span className="font-medium text-slate-500">Trạng thái thanh toán:</span>
                        <strong
                          className={cn(
                            'font-bold',
                            isPendingPayment ? 'text-amber-600' : 'text-emerald-600'
                          )}
                        >
                          {isPendingPayment ? 'Chưa thanh toán' : 'Đã thanh toán'}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* QR Code thumbnail */}
                  {qrUrl && (
                    <div className="sm:col-span-4 flex flex-col items-center justify-center p-2.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrUrl}
                        alt="QR đơn thuốc"
                        className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
                      />
                      <span className="text-[10px] font-bold text-slate-500 mt-1 text-center">
                        Quét lấy thuốc tại quầy dược
                      </span>
                    </div>
                  )}
                </div>

                {/* Doctor Note / Diagnosis */}
                {prescription.diagnosis_note && (
                  <div className="pt-3 border-t border-slate-200/60 bg-blue-50/50 -mx-4.5 -mb-4.5 p-3.5 rounded-b-3xl border-t">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-[#155DFC] shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-black text-[#155DFC] uppercase tracking-wide">
                          Lời dặn của Bác sĩ:
                        </span>
                        <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                          {prescription.diagnosis_note}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Medicine List */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#155DFC]" />
                    <h4 className="text-sm sm:text-base font-black text-slate-900">
                      Danh mục thuốc ({details.length} loại)
                    </h4>
                  </div>
                </div>

                {details.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {details.map((item, idx) => {
                      const medicineName =
                        item.medicine?.medicine_name || item.medicine_name || `Thuốc #${idx + 1}`;
                      const unit = item.medicine?.unit || item.unit || 'Đơn vị';
                      const hasPrice =
                        typeof item.unit_price === 'number' && item.unit_price > 0;
                      const subTotal = (item.unit_price || 0) * (item.quantity || 1);

                      return (
                        <div key={item.prescription_detail_id || idx} className="py-3.5 space-y-1.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5 flex-1">
                              <span className="text-sm font-black text-slate-900 leading-snug">
                                {idx + 1}. {medicineName}
                              </span>
                              {item.medicine?.description && (
                                <p className="text-[11px] text-slate-400 font-medium line-clamp-1">
                                  {item.medicine.description}
                                </p>
                              )}
                            </div>
                            <span className="text-xs sm:text-sm font-black text-[#155DFC] bg-blue-50 px-2.5 py-1 rounded-xl shrink-0">
                              x{item.quantity} {unit}
                            </span>
                          </div>

                          {/* Dosage instructions */}
                          {item.dosage_instruction && (
                            <div className="bg-slate-50 p-2.5 rounded-xl text-xs text-slate-600 font-semibold leading-relaxed border border-slate-100">
                              <strong className="text-slate-800">Cách dùng:</strong> {item.dosage_instruction}
                            </div>
                          )}

                          {/* Price info if available */}
                          {hasPrice && (
                            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-medium">
                              <span>
                                Đơn giá: <strong>{formatVND(item.unit_price!)}</strong>
                              </span>
                              <span>
                                Thành tiền: <strong className="text-slate-900 font-bold">{formatVND(subTotal)}</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6 font-medium">
                    Không có chi tiết danh mục thuốc.
                  </p>
                )}

                {/* Total amount */}
                {typeof prescription.total_amount === 'number' && (
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50 -mx-5 -mb-5 p-4.5 rounded-b-3xl">
                    <span className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-wider">
                      Tổng tiền thuốc:
                    </span>
                    <span className="text-lg sm:text-xl font-black text-[#155DFC]">
                      {formatVND(prescription.total_amount)}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 text-xs sm:text-sm font-bold transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
