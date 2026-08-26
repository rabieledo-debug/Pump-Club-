import JsBarcode from 'jsbarcode';

export function renderBarcodeSvg(svgElement: SVGSVGElement | null, code: string, options?: any) {
  if (!svgElement || !code) return;
  try {
    JsBarcode(svgElement, code, {
      format: 'CODE128',
      width: options?.width || 2,
      height: options?.height || 50,
      displayValue: options?.displayValue ?? true,
      text: options?.text || code,
      font: 'monospace',
      textAlign: 'center',
      textPosition: 'bottom',
      textMargin: 2,
      fontSize: options?.fontSize || 14,
      background: options?.background || 'transparent',
      lineColor: options?.lineColor || '#ffffff',
      margin: options?.margin || 6,
      ...options,
    });
  } catch (err) {
    console.error('Barcode generation error:', err);
  }
}
