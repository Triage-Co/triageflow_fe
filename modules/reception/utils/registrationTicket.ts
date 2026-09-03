import type { RegistrationResult } from "@/modules/reception/types/reception.types";
import { buildKioskTicketHtml } from "@/modules/kiosk/utils/kioskTicketPrinter";

function formatDateVietnamese(dateStr?: string): string {
  if (!dateStr) return "";
  if (dateStr.includes("/")) return dateStr;
  const parts = dateStr.slice(0, 10).split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function buildTicketHtml(result: RegistrationResult): string {
  const qrData =
    (result.ticketCode || "").trim() ||
    (result.qrPayload && !result.qrPayload.startsWith("{")
      ? result.qrPayload
      : "") ||
    result.ticketNo ||
    "TRIAGEFLOW-TICKET";

  let appointmentDate = formatDateVietnamese(result.appointmentDate);
  let slotTimeLabel = result.slotTimeLabel;

  if (result.slotTimeLabel && result.slotTimeLabel.includes(", ")) {
    const parts = result.slotTimeLabel.split(", ");
    if (!appointmentDate) {
      appointmentDate = formatDateVietnamese(parts[0]);
    }
    slotTimeLabel = parts[1];
  }

  return buildKioskTicketHtml({
    ticketNo: result.ticketNo,
    fullName: result.fullName,
    citizenId: result.citizenId,
    specialty: result.specialty,
    doctorLabel: result.doctorLabel,
    roomLabel: result.roomLabel,
    appointmentDate: appointmentDate,
    slotTimeLabel: slotTimeLabel,
    qrPayload: qrData,
  });
}

export function printRegistrationTicket(result: RegistrationResult): void {
  const html = buildTicketHtml(result);
  const win = window.open("", "_blank", "width=480,height=720");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

export function downloadRegistrationTicketPdf(
  result: RegistrationResult,
): void {
  const html = buildTicketHtml(result).replace(
    "<script>window.onload=()=>{window.print();}</script>",
    '<p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px">Mở file và chọn In → Lưu dưới dạng PDF</p><script>window.onload=()=>{window.print();}</script>',
  );
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ve-kham-${result.ticketNo}.html`;
  link.click();
  URL.revokeObjectURL(url);
  printRegistrationTicket(result);
}

export function getQrImageUrl(payload: string, size = 300): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`;
}
