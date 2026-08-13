'use client';

import { QRCodeSVG } from 'qrcode.react';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import type { Prescription } from '@/shared/types/prescription.types';

export const PRESCRIPTION_PRINT_CSS = `
@page { size: A5 portrait; margin: 15mm; }
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: "Times New Roman", "Noto Serif", Georgia, serif;
  color: #111;
  font-size: 12px;
  line-height: 1.35;
}
.sheet { width: 100%; }
.header { text-align: center; margin-bottom: 12px; }
.header h1 { margin: 0; font-size: 16px; letter-spacing: 0.02em; }
.header h2 { margin: 4px 0 0; font-size: 14px; font-weight: 700; }
.meta { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.meta-left { flex: 1; }
.meta p { margin: 2px 0; }
.qr-box { text-align: center; width: 110px; }
.qr-box p { margin: 4px 0 0; font-size: 10px; }
table { width: 100%; border-collapse: collapse; margin: 10px 0; }
th, td { border: 1px solid #333; padding: 4px 6px; vertical-align: top; }
th { background: #f3f3f3; font-size: 11px; }
.footer { margin-top: 14px; display: flex; justify-content: space-between; }
.sign { text-align: center; min-width: 160px; }
.sign .space { height: 48px; }
.note { margin-top: 8px; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

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

function formatDate(iso?: string): string {
    if (!iso) return new Date().toLocaleDateString('vi-VN');
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('vi-VN');
}

function qrValue(prescription: Prescription): string {
    if (prescription.qr_code) return prescription.qr_code;
    return prescription.prescription_code;
}

export interface PrescriptionPrintViewProps {
    prescription: Prescription;
    patient: Patient;
}

/** On-screen preview block used before opening print window. */
export function PrescriptionPrintView({ prescription, patient }: PrescriptionPrintViewProps) {
    const vsPatient = prescription.visitSession?.patient;
    const doctorName = prescription.doctor?.full_name || prescription.prescribed_by_name || '—';
    const license = prescription.doctor?.license_number || '—';
    const patientName = vsPatient?.full_name || patient.name;
    const citizenId = vsPatient?.citizen_id || patient.code;
    const age = calcAge(vsPatient?.dob, patient.age);
    const gender = genderLabel(vsPatient?.gender, patient.gender);
    const diagnosis =
        prescription.visitSession?.diagnosis ||
        patient.shortDiagnosis ||
        patient.medicalRecord?.diagnosis ||
        '—';

    return (
        <div className="sheet bg-white text-[#111] p-4 max-w-[148mm] mx-auto border border-[#ddd] rounded-lg">
            <div className="header text-center mb-3">
                <h1 className="text-base font-bold tracking-wide m-0">BỆNH VIỆN TRIAGEFLOW OPD</h1>
                <h2 className="text-sm font-bold mt-1 m-0">ĐƠN THUỐC NGOẠI TRÚ</h2>
            </div>
            <div className="flex justify-between gap-3 mb-3">
                <div className="text-xs space-y-0.5 flex-1">
                    <p>Mã đơn: <strong>{prescription.prescription_code}</strong></p>
                    <p>Ngày kê: {formatDate(prescription.created_at)}</p>
                    <p>Họ tên BN: <strong>{patientName}</strong></p>
                    <p>Tuổi: {age} · Giới: {gender}</p>
                    <p>CCCD: {citizenId}</p>
                    <p>Chẩn đoán: {diagnosis}</p>
                </div>
                <div className="text-center w-[110px]">
                    <QRCodeSVG value={qrValue(prescription)} size={96} level="M" includeMargin={false} />
                    <p className="text-[10px] mt-1 m-0">Quét tại nhà thuốc để nhận thuốc</p>
                </div>
            </div>
            <table className="w-full border-collapse text-xs mb-3">
                <thead>
                    <tr className="bg-[#f3f3f3]">
                        <th className="border border-[#333] px-1.5 py-1">STT</th>
                        <th className="border border-[#333] px-1.5 py-1 text-left">Tên thuốc</th>
                        <th className="border border-[#333] px-1.5 py-1 text-left">Liều dùng</th>
                        <th className="border border-[#333] px-1.5 py-1">SL</th>
                        <th className="border border-[#333] px-1.5 py-1">ĐV</th>
                    </tr>
                </thead>
                <tbody>
                    {(prescription.prescriptionDetails || []).map((d, idx) => (
                        <tr key={d.prescription_detail_id || `${d.medicine_id}-${idx}`}>
                            <td className="border border-[#333] px-1.5 py-1 text-center">{idx + 1}</td>
                            <td className="border border-[#333] px-1.5 py-1">
                                {d.medicine?.medicine_name || d.medicine_id}
                            </td>
                            <td className="border border-[#333] px-1.5 py-1">{d.dosage_instruction || '—'}</td>
                            <td className="border border-[#333] px-1.5 py-1 text-center">{d.quantity}</td>
                            <td className="border border-[#333] px-1.5 py-1 text-center">
                                {d.medicine?.unit || '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="text-xs note">
                <strong>Lời dặn:</strong> {prescription.diagnosis_note || '—'}
            </p>
            <p className="text-xs">Tái khám: ___/___/______</p>
            <div className="flex justify-end mt-4">
                <div className="text-center text-xs min-w-[160px]">
                    <p className="m-0 font-semibold">Bác sĩ kê đơn</p>
                    <p className="m-0">{doctorName}</p>
                    <p className="m-0">MSN: {license}</p>
                    <div className="h-12" />
                    <p className="m-0 italic">(Ký, ghi rõ họ tên)</p>
                </div>
            </div>
        </div>
    );
}

/** Open a print-friendly window and trigger browser print. */
export function printPrescription(prescription: Prescription, patient: Patient): void {
    const vsPatient = prescription.visitSession?.patient;
    const doctorName = prescription.doctor?.full_name || prescription.prescribed_by_name || '—';
    const license = prescription.doctor?.license_number || '—';
    const patientName = vsPatient?.full_name || patient.name;
    const citizenId = vsPatient?.citizen_id || patient.code;
    const age = calcAge(vsPatient?.dob, patient.age);
    const gender = genderLabel(vsPatient?.gender, patient.gender);
    const diagnosis =
        prescription.visitSession?.diagnosis ||
        patient.shortDiagnosis ||
        patient.medicalRecord?.diagnosis ||
        '—';

    const rows = (prescription.prescriptionDetails || [])
        .map((d, idx) => {
            const name = d.medicine?.medicine_name || d.medicine_id;
            const unit = d.medicine?.unit || '—';
            return `<tr>
              <td style="text-align:center">${idx + 1}</td>
              <td>${escapeHtml(name)}</td>
              <td>${escapeHtml(d.dosage_instruction || '—')}</td>
              <td style="text-align:center">${d.quantity}</td>
              <td style="text-align:center">${escapeHtml(unit)}</td>
            </tr>`;
        })
        .join('');

    const qrText = escapeHtml(qrValue(prescription));

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Đơn thuốc ${escapeHtml(prescription.prescription_code)}</title>
  <style>${PRESCRIPTION_PRINT_CSS}</style>
  <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <h1>BỆNH VIỆN TRIAGEFLOW OPD</h1>
      <h2>ĐƠN THUỐC NGOẠI TRÚ</h2>
    </div>
    <div class="meta">
      <div class="meta-left">
        <p>Mã đơn: <strong>${escapeHtml(prescription.prescription_code)}</strong></p>
        <p>Ngày kê: ${escapeHtml(formatDate(prescription.created_at))}</p>
        <p>Họ tên BN: <strong>${escapeHtml(patientName)}</strong></p>
        <p>Tuổi: ${escapeHtml(age)} · Giới: ${escapeHtml(gender)}</p>
        <p>CCCD: ${escapeHtml(citizenId)}</p>
        <p>Chẩn đoán: ${escapeHtml(diagnosis)}</p>
      </div>
      <div class="qr-box">
        <div id="qr"></div>
        <p>Quét tại nhà thuốc để nhận thuốc</p>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th>Tên thuốc</th>
          <th>Liều dùng</th>
          <th>SL</th>
          <th>ĐV</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="note"><strong>Lời dặn:</strong> ${escapeHtml(prescription.diagnosis_note || '—')}</p>
    <p>Tái khám: ___/___/______</p>
    <div class="footer">
      <div></div>
      <div class="sign">
        <p><strong>Bác sĩ kê đơn</strong></p>
        <p>${escapeHtml(doctorName)}</p>
        <p>MSN: ${escapeHtml(license)}</p>
        <div class="space"></div>
        <p><em>(Ký, ghi rõ họ tên)</em></p>
      </div>
    </div>
  </div>
  <script>
    (function () {
      try {
        var qr = qrcode(0, 'M');
        qr.addData(${JSON.stringify(qrValue(prescription))});
        qr.make();
        document.getElementById('qr').innerHTML = qr.createSvgTag(3, 0);
      } catch (e) {
        document.getElementById('qr').textContent = ${JSON.stringify(qrText)};
      }
      setTimeout(function () { window.focus(); window.print(); }, 250);
    })();
  </script>
</body>
</html>`;

    const win = window.open('', '_blank', 'noopener,noreferrer,width=800,height=900');
    if (!win) {
        throw new Error('Trình duyệt chặn cửa sổ in. Vui lòng cho phép popup.');
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
