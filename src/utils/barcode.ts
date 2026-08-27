import JsBarcode from 'jsbarcode';

export interface BarcodeRenderOptions {
  width?: number;
  height?: number;
  displayValue?: boolean;
  text?: string;
  fontSize?: number;
  background?: string;
  lineColor?: string;
  margin?: number;
  format?: 'CODE128' | 'EAN13' | 'CODE39';
}

export function renderBarcodeSvg(
  svgElement: SVGSVGElement | null,
  code: string,
  options?: BarcodeRenderOptions
) {
  if (!svgElement || !code) return;
  try {
    JsBarcode(svgElement, code, {
      format: options?.format || 'CODE128',
      width: options?.width || 2.2,
      height: options?.height || 65,
      displayValue: options?.displayValue ?? true,
      text: options?.text || code,
      font: 'monospace',
      textAlign: 'center',
      textPosition: 'bottom',
      textMargin: 6,
      fontSize: options?.fontSize || 14,
      background: options?.background || '#ffffff',
      lineColor: options?.lineColor || '#000000',
      margin: options?.margin || 10,
      valid: (valid: boolean) => {
        if (!valid) {
          console.warn('Barcode value could not be encoded in CODE128:', code);
        }
      },
    });
  } catch (err) {
    console.error('Barcode generation error:', err);
  }
}

export function generateBarcodeDataUrl(
  code: string,
  options?: BarcodeRenderOptions
): string {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, code, {
      format: options?.format || 'CODE128',
      width: options?.width || 2.4,
      height: options?.height || 70,
      displayValue: options?.displayValue ?? true,
      text: options?.text || code,
      font: 'monospace',
      textAlign: 'center',
      textPosition: 'bottom',
      textMargin: 6,
      fontSize: options?.fontSize || 14,
      background: options?.background || '#ffffff',
      lineColor: options?.lineColor || '#000000',
      margin: options?.margin || 12,
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Failed to generate barcode data URL:', err);
    return '';
  }
}
