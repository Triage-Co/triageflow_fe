import {
    formatPharmacyCounterLabel,
    sortPharmacyCounterLabels,
} from '@/modules/ancillary/utils/pharmacyCounterLabel';
import { displayScreenService } from '@/modules/display/services/displayScreenService';
import { getQrImageUrl } from '@/modules/reception/utils/registrationTicket';
import type { Prescription } from '@/shared/types/prescription.types';

export const PRESCRIPTION_RECEIPT_PRINT_CSS = `
@page { margin: 0; }
* { box-sizing: border-box; }
body {
  font-family: 'Courier New', Courier, monospace, system-ui, sans-serif;
  margin: 0;
  width: 57mm;
  padding: 8px 2px 8px 10px;
  color: #000;
  background: #fff;
  font-weight: 600;
  -webkit-font-smoothing: none;
  text-rendering: crispEdges;
}
.ticket {
  width: 100%;
  border: 1px solid #000;
  padding: 10px 4px;
}
.centered { text-align: center; }
.hospital { font-size: 13px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
.title { font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; }
.dashed { border-top: 1px dashed #000; margin: 8px 0; width: 100%; }
.solid { border-top: 1px solid #000; margin: 8px 0 6px; width: 100%; }
.info { width: 100%; font-size: 11px; line-height: 1.45; }
.info p { margin: 3px 0; word-break: break-word; }
.info .label { font-weight: bold; }
.qr-wrap { margin: 10px 0; text-align: center; }
.qr-wrap img {
  width: 150px;
  height: 150px;
  display: block;
  margin: 0 auto 6px;
  border: 1px solid #000;
  padding: 2px;
  image-rendering: pixelated;
}
.qr-hint { font-size: 10px; font-weight: bold; text-transform: uppercase; line-height: 1.3; }
.call-box {
  margin: 8px 0 4px;
  padding: 10px 6px;
  border: 2px solid #000;
  text-align: center;
}
.call-label {
  font-size: 11px;
  font-weight: 800;
  line-height: 1.35;
  margin-bottom: 4px;
}
.call-highlight {
  font-size: 42px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.02em;
  margin-bottom: 10px;
}
.call-divider {
  border-top: 1px dashed #000;
  margin: 8px 0;
  width: 100%;
}
.call-quay-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  line-height: 1;
}
.call-quay-word {
  font-size: 42px;
  font-weight: 900;
  letter-spacing: 0.04em;
}
.call-quay-number {
  font-size: 42px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.02em;
}
.footer { font-size: 10px; font-weight: bold; text-transform: uppercase; line-height: 1.35; }
.footer-time { font-size: 9px; margin-top: 6px; font-weight: bold; }
@media print {
  body { width: 57mm; }
}
`;

function qrValue(prescription: Prescription): string {
    if (prescription.qr_code) return prescription.qr_code;
    return prescription.prescription_code;
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function formatPrintTime(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
}

function formatDate(iso?: string): string {
    if (!iso) return new Date().toLocaleDateString('vi-VN');
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('vi-VN');
}

function resolvePatientName(prescription: Prescription): string {
    return (
        prescription.visitSession?.patient?.full_name ||
        prescription.patient_name ||
        'Bệnh nhân'
    );
}

export interface PrescriptionReceiptPrintOptions {
    counterLabels?: string[];
    pickupNumber?: string | null;
    /** Quầy TV đang chọn trên màn hình dược sĩ */
    selectedCounterId?: string | null;
}

export async function loadPharmacyCounterLabels(): Promise<string[]> {
    try {
        const screens = await displayScreenService.list({
            kind: 'TV_PHARMACY',
            status: 'ENABLED',
        });
        return sortPharmacyCounterLabels(screens.map(formatPharmacyCounterLabel));
    } catch {
        return [];
    }
}

async function resolveCounterLabels(
    options: PrescriptionReceiptPrintOptions
): Promise<string[]> {
    if (options.counterLabels && options.counterLabels.length > 0) {
        return sortPharmacyCounterLabels(options.counterLabels);
    }

    if (options.selectedCounterId) {
        try {
            const screen = await displayScreenService.getById(options.selectedCounterId);
            return [formatPharmacyCounterLabel(screen)];
        } catch {
            // fallback to full list
        }
    }

    return loadPharmacyCounterLabels();
}

function buildCallSection(pickup: string, counters: string[]): string {
    const hasPickup = Boolean(pickup);
    const hasCounter = counters.length > 0;
    const counterText = counters.join(', ');

    if (!hasPickup && !hasCounter) {
        return `<div class="centered qr-hint">Đến quầy nhà thuốc và quét mã QR</div>`;
    }

    const pickupBlock = hasPickup
        ? `<div class="call-label">Số thứ tự:</div>
           <div class="call-highlight">${escapeHtml(pickup)}</div>`
        : '';

    const counterBlock = hasCounter
        ? `<div class="call-label">Vui lòng nhận thuốc tại:</div>
           <div class="call-quay-line">
             <span class="call-quay-word">QUẦY</span>
             <span class="call-quay-number">${escapeHtml(counterText)}</span>
           </div>`
        : '';

    const divider = hasPickup && hasCounter ? `<div class="call-divider"></div>` : '';

    return `<div class="call-box">
      ${pickupBlock}
      ${divider}
      ${counterBlock}
    </div>`;
}

function buildReceiptHtml(
    prescription: Prescription,
    options: PrescriptionReceiptPrintOptions
): string {
    const patientName = resolvePatientName(prescription);
    const qrPayload = qrValue(prescription);
    const qrUrl = getQrImageUrl(qrPayload, 180);
    const pickup = options.pickupNumber?.trim() || prescription.pickup_number?.trim() || '';
    const counters = sortPharmacyCounterLabels(options.counterLabels || []);
    const queueAndCounterSection = buildCallSection(pickup, counters);

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Biên nhận ${escapeHtml(prescription.prescription_code)}</title>
  <style>${PRESCRIPTION_RECEIPT_PRINT_CSS}</style>
</head>
<body>
  <div class="ticket">
    <div class="centered hospital">Bệnh viện TriageFlow OPD</div>
    <div class="centered title">--- Biên nhận nhận thuốc ---</div>
    <div class="dashed"></div>
    <div class="info">
      <p><span class="label">Mã đơn:</span> ${escapeHtml(prescription.prescription_code)}</p>
      <p><span class="label">Họ tên BN:</span> ${escapeHtml(patientName.toUpperCase())}</p>
      <p><span class="label">Ngày kê:</span> ${escapeHtml(formatDate(prescription.created_at))}</p>
    </div>
    <div class="dashed"></div>
    <div class="qr-wrap">
      <img src="${qrUrl}" alt="QR đơn thuốc" />
      <div class="qr-hint">Vui lòng đưa biên nhận cho nhân viên tại quầy</div>
    </div>
    <div class="dashed"></div>
    ${queueAndCounterSection}
    <div class="solid"></div>
    <div class="centered footer">Vui lòng giữ biên nhận trong suốt quá trình nhận thuốc</div>
    <div class="centered footer-time">In lúc: ${escapeHtml(formatPrintTime())}</div>
  </div>
  <script>window.onload=function(){window.focus();window.print();};</script>
</body>
</html>`;
}

/** In biên nhận nhiệt 57mm — QR + số nhận thuốc (P…) + quầy (1, 2, 3…). */
export async function printPrescriptionReceipt(
    prescription: Prescription,
    options: PrescriptionReceiptPrintOptions = {}
): Promise<void> {
    const counterLabels = await resolveCounterLabels(options);

    const html = buildReceiptHtml(prescription, {
        ...options,
        counterLabels,
    });

    const win = window.open('', '_blank', 'width=280,height=720');
    if (!win) {
        throw new Error('Trình duyệt chặn cửa sổ in. Vui lòng cho phép popup cho trang này.');
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
}
