'use client';

import type { Patient } from '@/modules/clinical/types/clinical.types';
import { printHtmlDocument } from '@/shared/utils/printHtmlDocument';

export const INDICATION_PRINT_CSS = `
@page {
  size: 148mm 210mm;
  margin: 0;
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  width: 148mm;
  height: 210mm;
}
body {
  font-family: "Times New Roman", "Noto Serif", Georgia, serif;
  color: #111;
  font-size: 11px;
  line-height: 1.35;
  background: #fff;
}
.sheet {
  width: 148mm;
  height: 210mm;
  max-width: 148mm;
  max-height: 210mm;
  padding: 10mm 12mm;
  overflow: hidden;
  page-break-after: avoid;
  page-break-inside: avoid;
}
.header { text-align: center; margin-bottom: 8px; }
.header h1 { margin: 0; font-size: 14px; letter-spacing: 0.02em; }
.header h2 { margin: 3px 0 0; font-size: 12px; font-weight: 700; }
.meta p { margin: 2px 0; font-size: 10px; }
table { width: 100%; border-collapse: collapse; margin: 8px 0; }
th, td { border: 1px solid #333; padding: 3px 4px; vertical-align: top; font-size: 10px; }
th { background: #f3f3f3; font-size: 9px; }
.footer { margin-top: 10px; display: flex; justify-content: flex-end; }
.sign { text-align: center; min-width: 130px; font-size: 10px; }
.sign .space { height: 36px; }
.note { margin-top: 6px; font-size: 10px; }
@media print {
  html, body {
    width: 148mm;
    height: 210mm;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    width: 148mm;
    height: 210mm;
    margin: 0;
    padding: 10mm 12mm;
  }
}
`;

export interface IndicationPrintItem {
    name: string;
    group_label?: string;
    room_name?: string;
}

export interface IndicationPrintInput {
    patient: Patient;
    items: IndicationPrintItem[];
    /** e.g. YÊU CẦU CẬN LÂM SÀNG */
    documentSubtitle: string;
    diagnosis?: string;
    doctorName?: string;
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function formatDoctorSignatureName(name?: string | null): string {
    if (!name || name.trim() === '' || name === '—') return '—';
    const trimmed = name.trim();
    if (/^bs\.?\s/i.test(trimmed)) return trimmed;
    return `Bs ${trimmed}`;
}

function calcAge(dob?: string | null, fallbackAge?: number): string {
    if (dob) {
        const d = new Date(dob);
        if (!Number.isNaN(d.getTime())) {
            const now = new Date();
            let age = now.getFullYear() - d.getFullYear();
            const m = now.getMonth() - d.getMonth();
            if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
            return String(age);
        }
    }
    return fallbackAge != null ? String(fallbackAge) : '—';
}

function genderLabel(g?: string, fallback?: string): string {
    const raw = (g || fallback || '').toUpperCase();
    if (raw === 'MALE' || raw === 'NAM') return 'Nam';
    if (raw === 'FEMALE' || raw === 'NỮ' || raw === 'NU') return 'Nữ';
    return fallback || g || '—';
}

function formatPrintDate(): string {
    return new Date().toLocaleDateString('vi-VN');
}

export function printServiceOrderIndications(input: IndicationPrintInput): void {
    const { patient, items, documentSubtitle, diagnosis, doctorName } = input;
    if (items.length === 0) {
        throw new Error('Chưa có chỉ định để in.');
    }

    const patientName = patient.name || '—';
    const citizenId = patient.code || '—';
    const age = calcAge(undefined, patient.age);
    const gender = genderLabel(undefined, patient.gender);
    const diagnosisText =
        diagnosis ||
        patient.shortDiagnosis ||
        patient.medicalRecord?.diagnosis ||
        '—';
    const doctorLabel = formatDoctorSignatureName(doctorName);

    const rows = items
        .map((item, index) => {
            return `<tr>
              <td style="text-align:center">${index + 1}</td>
              <td>${escapeHtml(item.name || '—')}</td>
              <td>${escapeHtml(item.group_label || '—')}</td>
              <td>${escapeHtml(item.room_name || '—')}</td>
            </tr>`;
        })
        .join('');

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title></title>
  <style>${INDICATION_PRINT_CSS}</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <h1>BỆNH VIỆN TRIAGEFLOW OPD</h1>
      <h2>PHIẾU CHỈ ĐỊNH</h2>
      <h2>${escapeHtml(documentSubtitle)}</h2>
    </div>
    <div class="meta">
      <p>Ngày chỉ định: ${escapeHtml(formatPrintDate())}</p>
      <p>Họ tên BN: <strong>${escapeHtml(patientName)}</strong></p>
      <p>Tuổi: ${escapeHtml(age)} · Giới: ${escapeHtml(gender)}</p>
      <p>CCCD: ${escapeHtml(citizenId)}</p>
      <p>Chẩn đoán: ${escapeHtml(diagnosisText)}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th>Tên dịch vụ</th>
          <th>Nhóm</th>
          <th>Phòng</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="note">Ghi chú: Bệnh nhân mang phiếu này đến quầy thanh toán trước khi thực hiện dịch vụ.</p>
    <div class="footer">
      <div class="sign">
        <p><strong>Bác sĩ chỉ định</strong></p>
        <div class="space"></div>
        <p>${escapeHtml(doctorLabel)}</p>
        <p><em>(Ký, ghi rõ họ tên)</em></p>
      </div>
    </div>
  </div>
</body>
</html>`;

    printHtmlDocument(html);
}
