import type { RegistrationResult } from '@/modules/reception/types/reception.types';
import { formatPhoneDisplay } from '@/modules/reception/utils/receptionSearch';

function buildTicketHtml(result: RegistrationResult): string {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(result.qrPayload)}`;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const printTime = `${timeStr} ${dateStr}`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Vé khám ${result.ticketNo}</title>
<style>
body{font-family:'Courier New',Courier,monospace,system-ui,sans-serif;padding:8px;max-width:380px;margin:0 auto;color:#000;background:#fff;letter-spacing:-0.2px}
.ticket-container{border:2px solid #000;padding:24px 18px;box-sizing:border-box}
.centered{text-align:center}
.hospital-name{font-size:13px;font-weight:bold;margin-bottom:4px;text-transform:uppercase}
.system-name{font-size:10px;font-weight:bold;margin-bottom:4px;text-transform:uppercase}
.doc-title{font-size:11px;font-weight:bold;margin-bottom:8px;text-transform:uppercase}
.ticket-box{border:2px solid #000;padding:16px 0;margin:12px auto;width:95%;box-sizing:border-box}
.ticket-box-title{font-size:11px;font-weight:bold;text-transform:uppercase;margin-bottom:6px;letter-spacing:1px}
.ticket-number{font-size:46px;font-weight:900;letter-spacing:2px;line-height:1;margin-bottom:10px}
.priority-box{display:inline-block;border:1px solid #000;padding:4px 10px;font-size:10px;font-weight:bold;text-transform:uppercase}
.dashed-line{border-top:1px dashed #000;margin:16px 0;width:100%}
.solid-line{border-top:2px solid #000;margin:16px 0 12px 0;width:100%}
.info-table{width:100%;border-collapse:collapse;font-size:12px}
.info-table td{padding:5px 0;vertical-align:middle}
.info-table .label{text-align:left;font-weight:bold}
.info-table .value{text-align:right;font-weight:bold}
.qr-container{margin:18px 0;text-align:center}
.qr-image{width:160px;height:160px;margin:0 auto 10px auto;display:block;border:2px solid #000;padding:4px}
.qr-desc{font-size:9px;font-weight:bold;letter-spacing:0.3px;text-transform:uppercase;line-height:1.4}
.footer-text{font-size:10px;font-weight:bold;text-transform:uppercase;line-height:1.5;margin-bottom:4px}
.footer-time{font-size:9px;margin-top:12px;font-weight:bold}
</style></head><body>
<div class="ticket-container">
    <div class="centered hospital-name">BỆNH VIỆN ĐA KHOA TRUNG ƯƠNG</div>
    <div class="centered system-name">HỆ THỐNG QUẢN LÝ KHÁM BỆNH TRIAGEFLOW OPD</div>
    <div class="centered doc-title">--- PHIẾU ĐĂNG KÝ KHÁM ---</div>
    
    <div class="dashed-line"></div>
    
    <div class="ticket-box">
        <div class="centered ticket-box-title">Số thứ tự khám</div>
        <div class="centered ticket-number">${result.ticketNo}</div>
        <div class="centered"><div class="priority-box">Đối tượng: ${result.priority}</div></div>
    </div>
    
    <div class="dashed-line"></div>
    
    <table class="info-table">
        <tr><td class="label">HỌ VÀ TÊN:</td><td class="value">${result.fullName.toUpperCase()}</td></tr>
        <tr><td class="label">CCCD/CMND:</td><td class="value">${result.citizenId}</td></tr>
        <tr><td class="label">SỐ ĐIỆN THOẠI:</td><td class="value">${formatPhoneDisplay(result.phone)}</td></tr>
    </table>
    
    <div class="dashed-line"></div>
    
    <table class="info-table">
        <tr><td class="label">KHOA KHÁM:</td><td class="value">${result.specialty.toUpperCase()}</td></tr>
        <tr><td class="label">BÁC SĨ:</td><td class="value">${result.doctorLabel}</td></tr>
        <tr><td class="label">PHÒNG KHÁM:</td><td class="value">${result.roomLabel}</td></tr>
        <tr><td class="label">NGÀY & GIỜ:</td><td class="value">${result.slotTimeLabel || '—'}</td></tr>
        <tr><td class="label">THANH TOÁN:</td><td class="value">${result.paymentLabel}</td></tr>
    </table>
    
    <div class="dashed-line"></div>
    
    <div class="qr-container">
        <img class="qr-image" src="${qrUrl}" alt="QR" />
        <div class="qr-desc">Quét mã QR để theo dõi thứ tự & bản đồ chỉ đường</div>
    </div>
    
    <div class="solid-line"></div>
    
    <div class="centered footer-text">VUI LÒNG GIỮ PHIẾU NÀY TRONG SUỐT QUÁ TRÌNH KHÁM</div>
    <div class="centered footer-text">CHÚC QUÝ KHÁCH NHIỀU SỰ KHỎE!</div>
    <div class="centered footer-time">In lúc: ${printTime}</div>
</div>
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
