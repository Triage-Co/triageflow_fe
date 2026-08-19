/**
 * qrImageEnhancer.ts
 * Bộ xử lý và tối ưu hóa hình ảnh Canvas chuyên dụng cho mã QR CCCD mật độ cao.
 * Tích hợp Multi-Scale Digital Zoom và jsQR Engine.
 */

import jsQR from 'jsqr';

/**
 * Áp dụng tăng độ tương phản và làm nét ảnh (High Contrast + Sharpening)
 */
export function enhanceImageContrastAndSharpen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  contrastBoost = 1.4
): ImageData {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const len = data.length;

  let minLum = 255;
  let maxLum = 0;

  for (let i = 0; i < len; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }

  const range = maxLum - minLum || 1;
  const factor = (259 * (contrastBoost * 255 + 255)) / (255 * (259 - contrastBoost * 255));

  for (let i = 0; i < len; i += 4) {
    let lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    lum = ((lum - minLum) / range) * 255;
    lum = factor * (lum - 128) + 128;
    lum = Math.max(0, Math.min(255, lum));

    data[i] = lum;
    data[i + 1] = lum;
    data[i + 2] = lum;
  }

  const outputData = ctx.createImageData(width, height);
  const out = outputData.data;
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      let kIdx = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pIdx = ((y + ky) * width + (x + kx)) * 4;
          sum += data[pIdx] * kernel[kIdx++];
        }
      }

      const outIdx = (y * width + x) * 4;
      const finalVal = Math.max(0, Math.min(255, sum));
      out[outIdx] = finalVal;
      out[outIdx + 1] = finalVal;
      out[outIdx + 2] = finalVal;
      out[outIdx + 3] = 255;
    }
  }

  ctx.putImageData(outputData, 0, 0);
  return outputData;
}

/**
 * Quét mã QR bằng jsQR đa tỷ lệ (Multi-Scale & Multi-Crop)
 * Tự động phóng to vùng trung tâm (Digital Zoom) để đọc mã QR khi cầm thẻ ở xa
 */
export function scanWithJsQREngine(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): string | null {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  // Vẽ khung hình đầy đủ
  ctx.drawImage(video, 0, 0, w, h);

  // 1. Quét toàn khung hình (Full Frame)
  let imgData = ctx.getImageData(0, 0, w, h);
  let code = jsQR(imgData.data, w, h, { inversionAttempts: 'attemptBoth' });
  if (code?.data) return code.data;

  // 2. Quét vùng trung tâm 60% (Digital Zoom 1.6x) - Khi người dùng giơ thẻ ở giữa
  const cropW = Math.floor(w * 0.65);
  const cropH = Math.floor(h * 0.65);
  const startX = Math.floor((w - cropW) / 2);
  const startY = Math.floor((h - cropH) / 2);

  const cropImgData = ctx.getImageData(startX, startY, cropW, cropH);
  code = jsQR(cropImgData.data, cropW, cropH, { inversionAttempts: 'attemptBoth' });
  if (code?.data) return code.data;

  // 3. Quét sau khi làm nét (Sharpened Full Frame)
  enhanceImageContrastAndSharpen(ctx, w, h, 1.4);
  imgData = ctx.getImageData(0, 0, w, h);
  code = jsQR(imgData.data, w, h, { inversionAttempts: 'attemptBoth' });
  if (code?.data) return code.data;

  // 4. Quét sau khi làm nét vùng trung tâm
  const cropSharpened = ctx.getImageData(startX, startY, cropW, cropH);
  code = jsQR(cropSharpened.data, cropW, cropH, { inversionAttempts: 'attemptBoth' });
  if (code?.data) return code.data;

  return null;
}
