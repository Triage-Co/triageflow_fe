import type { RegistrationResult } from '@/modules/reception/types/reception.types';
import { formatPhoneDisplay } from '@/modules/reception/utils/receptionSearch';

function buildTicketHtml(result: RegistrationResult): string {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(result.qrPayload)}`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Vé khám ${result.ticketNo}</title>
<style>
body{font-family:system-ui,sans-serif;padding:24px;max-width:420px;margin:0 auto;color:#1f2937}
.header{background:#8B7CF6;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;display:flex;justify-content:space-between;align-items:flex-start}
.brand{font-size:12px;opacity:.9}.hospital{font-size:11px;margin-top:4px;opacity:.85}
.ticket{font-size:28px;font-weight:800;letter-spacing:.5px}
.card{border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.06)}
.body{padding:20px}
.row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px}
.label{color:#9ca3af}.value{font-weight:600;text-align:right}
.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:16px 0;font-size:12px}
.grid div{background:#f9fafb;border-radius:8px;padding:10px}
.grid strong{display:block;font-size:11px;color:#6b7280;margin-bottom:4px}
.qr{display:flex;gap:16px;align-items:center;margin:16px 0}
.qr img{width:100px;height:100px;border:1px solid #e5e7eb;border-radius:8px}
.note{font-size:11px;color:#6b7280;line-height:1.5}
.box{padding:12px;border-radius:8px;font-size:12px;margin-top:12px}
.blue{background:#eff6ff;border:1px solid #bfdbfe}
.yellow{background:#fffbeb;border:1px solid #fde68a}
ol{margin:8px 0 0 18px;padding:0}
</style></head><body>
<div class="card">
<div class="header">
<div><div class="brand">TriageFlow OPD</div><div class="hospital">Bệnh viện Đa khoa Trung ương</div></div>
<div class="ticket">${result.ticketNo}</div>
</div>
<div class="body">
<div class="row"><span class="label">Họ tên</span><span class="value">${result.fullName}</span></div>
<div class="row"><span class="label">CCCD</span><span class="value">${result.citizenId}</span></div>
<div class="row"><span class="label">SĐT</span><span class="value">${formatPhoneDisplay(result.phone)}</span></div>
<div class="row"><span class="label">Chuyên khoa</span><span class="value">${result.specialty}</span></div>
<div class="row"><span class="label">Ưu tiên</span><span class="value">${result.priority}</span></div>
<div class="row"><span class="label">Giờ khám</span><span class="value">${result.slotTimeLabel || '—'}</span></div>
<div class="grid">
<div><strong>Bác sĩ</strong>${result.doctorLabel}</div>
<div><strong>Phòng</strong>${result.roomLabel}</div>
<div><strong>Thanh toán</strong>${result.paymentLabel}</div>
</div>
<div class="qr">
<img src="${qrUrl}" alt="QR" />
<div class="note">Quét mã QR để theo dõi lượt khám và điều hướng y tế trong bệnh viện.</div>
</div>
<div class="box blue"><strong>Hướng dẫn đến phòng khám</strong>
<ol><li>Đi thẳng đến sảnh chính</li><li>Lên thang máy số 2 lên tầng 2</li><li>Rẽ trái, đi đến ${result.roomLabel}</li></ol></div>
<div class="box yellow"><strong>Thời gian chờ:</strong> Dự kiến ${result.waitTimeLabel}</div>
</div></div>
<script>window.onload=()=>{window.print();}</script></body></html>`;
}

export function printRegistrationTicket(result: RegistrationResult): void {
    const html = buildTicketHtml(result);
    const win = window.open('', '_blank', 'width=480,height=720');
    if (!win) return;
    win.document.write(html);
    win.document.close();
}

export function downloadRegistrationTicketPdf(result: RegistrationResult): void {
    const html = buildTicketHtml(result).replace(
        '<script>window.onload=()=>{window.print();}</script>',
        '<p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px">Mở file và chọn In → Lưu dưới dạng PDF</p><script>window.onload=()=>{window.print();}</script>',
    );
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ve-kham-${result.ticketNo}.html`;
    link.click();
    URL.revokeObjectURL(url);
    printRegistrationTicket(result);
}

export function getQrImageUrl(payload: string, size = 120): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`;
}
