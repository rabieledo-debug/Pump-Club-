import QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generate a QR code as an SVG string containing only the specified text (e.g. membership ID).
 */
export async function generateQRCodeSvg(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  if (!text) return '';
  try {
    return await QRCode.toString(text, {
      type: 'svg',
      margin: options.margin ?? 2,
      errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
      color: {
        dark: options.color?.dark ?? '#000000',
        light: options.color?.light ?? '#ffffff',
      },
      width: options.width ?? 180,
    });
  } catch (err) {
    console.error('QR Code generation error:', err);
    return '';
  }
}

/**
 * Generate a QR code as a high-resolution Data URL (PNG) containing only the specified text.
 */
export async function generateQRCodeDataUrl(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  if (!text) return '';
  try {
    return await QRCode.toDataURL(text, {
      margin: options.margin ?? 2,
      errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
      color: {
        dark: options.color?.dark ?? '#000000',
        light: options.color?.light ?? '#ffffff',
      },
      width: options.width ?? 240,
    });
  } catch (err) {
    console.error('QR Code DataURL error:', err);
    return '';
  }
}
