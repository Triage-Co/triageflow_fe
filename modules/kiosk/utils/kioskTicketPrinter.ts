export interface KioskPrintTicketData {
    ticketNo: string;
    fullName: string;
    citizenId: string;
    specialty: string;
    doctorLabel?: string;
    roomLabel?: string;
    appointmentDate?: string;
    slotTimeLabel?: string;
    qrPayload?: string;
}

export function buildKioskTicketHtml(data: KioskPrintTicketData): string {
    const qrData = data.qrPayload || data.ticketNo || 'TRIAGEFLOW-TICKET';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrData)}`;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const printTime = `${timeStr} ${dateStr}`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Vé khám ${data.ticketNo}</title>
<style>
@page { margin: 0; }

body {
    font-family: 'Courier New', Courier, monospace, system-ui, sans-serif;
    margin: 0;
    /* Cố định khổ giấy 56mm máy in nhiệt, lề trái 12px chống mất chữ, lề phải ép sát 2px */
    width: 56mm; 
    padding: 8px 2px 8px 12px; 
    box-sizing: border-box;
    color: #000;
    background: #fff;
    
    /* ÉP TĂNG ĐỘ NÉT CHO MÁY IN NHIỆT */
    font-weight: 600; 
    -webkit-font-smoothing: none; 
    text-rendering: crispEdges;
}
.ticket-container {
    width: 100%;
    border: 1px solid #000;
    padding: 10px 4px;
    box-sizing: border-box;
}
.centered { text-align: center; }
.hospital-name { font-size: 14px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; }
.system-name { font-size: 12px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; line-height: 1.2; }
.doc-title { font-size: 11px; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; }
.ticket-box {
    border: 1px solid #000;
    padding: 6px 0;
    margin: 6px auto;
    width: 98%;
    box-sizing: border-box;
}
.ticket-box-title { font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.5px; }
.ticket-number { font-size: 50px; font-weight: 900; letter-spacing: 1px; line-height: 1; margin-bottom: 2px; }
.dashed-line { border-top: 1px dashed #000; margin: 8px 0; width: 100%; }
.solid-line { border-top: 1px solid #000; margin: 8px 0 6px 0; width: 100%; }

/* Bảng thông tin: ép sát và cho phép rớt dòng */
.info-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.info-table td { padding: 3px 0; vertical-align: top; }
.info-table .label { text-align: left; font-weight: bold; width: 40%; }
.info-table .value { text-align: right; font-weight: bold; word-break: break-word; width: 60%; }

.qr-container { margin: 10px 0; text-align: center; }
.qr-image { 
    width: 160px; 
    height: 160px; 
    margin: 0 auto 6px auto; 
    display: block; 
    border: 1px solid #000; 
    padding: 2px; 
    image-rendering: pixelated;
}
.qr-desc { font-size: 11px; font-weight: bold; letter-spacing: 0.3px; text-transform: uppercase; line-height: 1.3; }
.footer-text { font-size: 10px; font-weight: bold; text-transform: uppercase; line-height: 1.3; margin-bottom: 4px; }
.footer-time { font-size: 9px; margin-top: 6px; font-weight: bold; }
</style></head><body>
<div class="ticket-container">
    <div class="centered hospital-name">BỆNH VIỆN</div>
    <div class="centered system-name">HỆ THỐNG QUẢN LÝ KHÁM BỆNH<br>TRIAGEFLOW OPD</div>
    <div class="centered doc-title">--- PHIẾU ĐĂNG KÝ KHÁM ---</div>
    
    <div class="dashed-line"></div>
    
    <div class="ticket-box">
        <div class="centered ticket-box-title">Số thứ tự khám</div>
        <div class="centered ticket-number">${data.ticketNo}</div>
    </div>
    
    <div class="dashed-line"></div>
    
    <table class="info-table">
        <tr><td class="label">HỌ VÀ TÊN:</td><td class="value">${data.fullName.toUpperCase()}</td></tr>
        <tr><td class="label">CCCD/CMND:</td><td class="value">${data.citizenId}</td></tr>
    </table>
    
    <div class="dashed-line"></div>
    
    <table class="info-table">
        <tr><td class="label">KHOA KHÁM:</td><td class="value">${data.specialty.toUpperCase()}</td></tr>
        <tr><td class="label">BÁC SĨ:</td><td class="value">${data.doctorLabel || '---'}</td></tr>
        <tr><td class="label">PHÒNG KHÁM:</td><td class="value">${data.roomLabel || '---'}</td></tr>
        <tr><td class="label">NGÀY KHÁM:</td><td class="value">${data.appointmentDate || dateStr}</td></tr>
        <tr><td class="label">GIỜ KHÁM:</td><td class="value">${data.slotTimeLabel || timeStr}</td></tr>
    </table>
    
    <div class="dashed-line"></div>
    
    <div class="qr-container">
        <img class="qr-image" src="${qrUrl}" alt="QR" />
        ${qrData && qrData !== 'TRIAGEFLOW-TICKET' ? `<div class="centered" style="font-size: 11px; font-weight: bold; margin-top: 4px;">Mã phiếu: ${qrData}</div>` : ''}
    </div>
    
    <div class="solid-line"></div>
    
    <div class="centered footer-text">VUI LÒNG GIỮ PHIẾU NÀY TRONG SUỐT QUÁ TRÌNH KHÁM</div>
    <div class="centered footer-text">CHÚC QUÝ KHÁCH NHIỀU SỨC KHỎE!</div>
    <div class="centered footer-time">In lúc: ${printTime}</div>
</div>
<script>window.onload=()=>{window.print();}</script></body></html>`;
}

export function printKioskTicket(data: KioskPrintTicketData): void {
    const html = buildKioskTicketHtml(data);
    const win = window.open('', '_blank', 'width=480,height=720');
    if (!win) return;
    win.document.write(html);
    win.document.close();
}
