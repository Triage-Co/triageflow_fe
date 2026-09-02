/**
 * In HTML qua iframe ẩn — tránh tab about:blank và giảm header/footer trình duyệt
 * (ngày giờ, tiêu đề tab, URL) so với window.open('', '_blank').
 */
export function printHtmlDocument(html: string, delayMs = 200): void {
    if (typeof document === 'undefined') {
        throw new Error('Chỉ có thể in trên trình duyệt.');
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'print-frame');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
        'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;pointer-events:none';

    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument ?? win?.document;
    if (!win || !doc) {
        iframe.remove();
        throw new Error('Không thể tạo khung in.');
    }

    doc.open();
    doc.write(html);
    doc.close();

    let cleaned = false;
    const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        iframe.remove();
    };

    win.onafterprint = cleanup;

    setTimeout(() => {
        win.focus();
        win.print();
        setTimeout(cleanup, 60_000);
    }, delayMs);
}
