'use client';

import { QRCodeSVG } from 'qrcode.react';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import type {
    Medicine,
    Prescription,
    PrescriptionDetail,
} from '@/shared/types/prescription.types';

export const PRESCRIPTION_PRINT_CSS = `
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
.meta { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.meta-left { flex: 1; min-width: 0; }
.meta p { margin: 2px 0; font-size: 10px; }
.qr-box { text-align: center; width: 88px; flex-shrink: 0; }
.qr-box svg { width: 96px; height: 96px; }
.qr-box p { margin: 3px 0 0; font-size: 8px; line-height: 1.2; }
table { width: 100%; border-collapse: collapse; margin: 6px 0; }
th, td { border: 1px solid #333; padding: 3px 4px; vertical-align: top; font-size: 10px; }
th { background: #f3f3f3; font-size: 9px; }
.footer { margin-top: 8px; display: flex; justify-content: flex-end; }
.sign { text-align: center; min-width: 130px; font-size: 10px; }
.sign .space { height: 36px; }
.note { margin-top: 6px; font-size: 10px; }
.revisit { font-size: 10px; margin: 4px 0; }
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

function formatDoctorSignatureName(name?: string | null): string {
    if (!name || name.trim() === '' || name === '—') return '—';
    const trimmed = name.trim();
    if (/^bs\.?\s/i.test(trimmed)) return trimmed;
    return `Bs ${trimmed}`;
}

function qrValue(prescription: Prescription): string {
    if (prescription.qr_code) return prescription.qr_code;
    return prescription.prescription_code;
}

export interface DraftPrescriptionPrintItem {
    medicine: Medicine;
    quantity: number;
    dosage_instruction: string;
    note?: string;
}

export interface DraftPrescriptionPrintInput {
    patient: Patient;
    draftItems: DraftPrescriptionPrintItem[];
    diagnosisNote: string;
    visitSessionId?: string | null;
    prescribedByName?: string;
    existingPrescription?: Prescription | null;
}

/** Build a printable prescription snapshot from saved rx or unsaved draft rows. */
export function buildPrescriptionForPrint(input: DraftPrescriptionPrintInput): Prescription {
    const {
        patient,
        draftItems,
        diagnosisNote,
        visitSessionId,
        prescribedByName,
        existingPrescription,
    } = input;

    const details: PrescriptionDetail[] = draftItems.map((item, index) => ({
        prescription_detail_id: `draft-${index}`,
        medicine_id: item.medicine.medicine_id,
        quantity: item.quantity,
        dosage_instruction: item.dosage_instruction,
        note: item.note,
        unit_price: item.medicine.unit_price || 0,
        sub_total: (item.medicine.unit_price || 0) * (Number(item.quantity) || 0),
        medicine: {
            medicine_code: item.medicine.medicine_code,
            medicine_name: item.medicine.medicine_name,
            unit: item.medicine.unit,
            active_ingredient: item.medicine.active_ingredient,
            usage_route: item.medicine.usage_route,
        },
    }));

    const totalAmount = details.reduce((sum, row) => sum + row.sub_total, 0);
    const sessionId = visitSessionId || existingPrescription?.visit_session_id || '';

    if (existingPrescription) {
        return {
            ...existingPrescription,
            diagnosis_note: diagnosisNote,
            total_amount: totalAmount,
            prescriptionDetails: details,
            prescribed_by_name:
                existingPrescription.prescribed_by_name || prescribedByName || undefined,
        };
    }

    return {
        prescription_id: 'draft',
        prescription_code: 'TẠM THỜI',
        qr_code: sessionId || 'DRAFT',
        service_order_id: '',
        visit_session_id: sessionId,
        prescribed_by: '',
        prescribed_by_name: prescribedByName,
        diagnosis_note: diagnosisNote,
        total_amount: totalAmount,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        prescriptionDetails: details,
        visitSession: sessionId
            ? {
                  visit_session_id: sessionId,
                  diagnosis:
                      patient.shortDiagnosis || patient.medicalRecord?.diagnosis || undefined,
                  patient: {
                      patient_id: patient.patientId || patient.id,
                      full_name: patient.name,
                      citizen_id: patient.code,
                      gender: patient.gender,
                  },
              }
            : undefined,
    };
}

export interface PrescriptionPrintViewProps {
    prescription: Prescription;
    patient: Patient;
}

/** On-screen preview block used before opening print window. */
export function PrescriptionPrintView({ prescription, patient }: PrescriptionPrintViewProps) {
    const vsPatient = prescription.visitSession?.patient;
    const doctorName = prescription.doctor?.full_name || prescription.prescribed_by_name || '—';
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
        <div className="sheet bg-white text-[#111] w-[148mm] h-[210mm] max-w-[148mm] max-h-[210mm] box-border p-[10mm_12mm] mx-auto border border-[#ddd] shadow-sm overflow-hidden">
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
                    <p className="text-[10px] mt-1 m-0">Quét tại nhà thuốc</p>
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
                    <div className="h-12" />
                    <p className="m-0">{formatDoctorSignatureName(doctorName)}</p>
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
        <p>Quét tại nhà thuốc</p>
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
    <p class="revisit">Tái khám: ___/___/______</p>
    <div class="footer">
      <div></div>
      <div class="sign">
        <p><strong>Bác sĩ kê đơn</strong></p>
        <div class="space"></div>
        <p>${escapeHtml(formatDoctorSignatureName(doctorName))}</p>
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

    // Không dùng noopener — Edge/Chrome trả về null và không ghi được document (reception ticket cùng pattern).
    const win = window.open('', '_blank', 'width=560,height=840');
    if (!win) {
        throw new Error('Trình duyệt chặn cửa sổ in. Vui lòng cho phép popup cho trang này.');
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
