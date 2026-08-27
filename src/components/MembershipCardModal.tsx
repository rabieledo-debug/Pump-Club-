import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Dumbbell,
  QrCode,
  Barcode as BarcodeIcon,
  Download,
  ShieldCheck,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { Customer } from '../types';
import { renderBarcodeSvg, generateBarcodeDataUrl } from '../utils/barcode';
import { generateQRCodeDataUrl, generateQRCodeSvg } from '../utils/qrcode';

interface MembershipCardModalProps {
  customer: Customer;
  onClose: () => void;
}

export const MembershipCardModal: React.FC<MembershipCardModalProps> = ({ customer, onClose }) => {
  const [codeType, setCodeType] = useState<'qrcode' | 'barcode'>('qrcode');
  const [qrSvg, setQrSvg] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(true);
  const barcodeSvgRef = useRef<SVGSVGElement>(null);

  // The unique identifier for scanning
  const membershipIdValue = customer.membership_id || `PC-${customer.id.toString().padStart(4, '0')}`;
  const barcodeValue = customer.barcode || customer.membership_id || `88${customer.id.toString().padStart(6, '0')}`;

  // QR Code payload uses the exact membership identifier
  const qrPayload = membershipIdValue;

  useEffect(() => {
    let isMounted = true;
    setGenerating(true);

    try {
      // 1. Generate High-Res Vector SVG for QR Code (for crystal sharp display & print)
      generateQRCodeSvg(qrPayload, {
        width: 360,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }).then((svg) => {
        if (isMounted) setQrSvg(svg);
      });

      // 2. Generate High-Res PNG Data URL (900px for print & download)
      generateQRCodeDataUrl(qrPayload, {
        width: 900,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }).then((url) => {
        if (isMounted) setQrDataUrl(url);
      });

      // 3. Render 1D Barcode SVG & DataURL
      if (barcodeSvgRef.current) {
        renderBarcodeSvg(barcodeSvgRef.current, barcodeValue, {
          format: 'CODE128',
          width: 2.2,
          height: 60,
          displayValue: true,
          text: barcodeValue,
          fontSize: 12,
          margin: 8,
          background: '#ffffff',
          lineColor: '#000000',
        });
      }

      const bData = generateBarcodeDataUrl(barcodeValue, {
        format: 'CODE128',
        width: 2.8,
        height: 75,
        displayValue: true,
        text: barcodeValue,
        fontSize: 14,
        margin: 12,
        background: '#ffffff',
        lineColor: '#000000',
      });
      if (isMounted && bData) {
        setBarcodeDataUrl(bData);
      }
    } catch (err) {
      console.error('Failed to generate card codes:', err);
    } finally {
      if (isMounted) setGenerating(false);
    }

    return () => {
      isMounted = false;
    };
  }, [qrPayload, barcodeValue, codeType]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQrOnly = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_${membershipIdValue}_${customer.full_name}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadBarcodeOnly = () => {
    if (!barcodeDataUrl) return;
    const a = document.createElement('a');
    a.href = barcodeDataUrl;
    a.download = `Barcode_${customer.membership_id || customer.id}_${customer.full_name}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isExpired = customer.status === 'expired';
  const isExpiringSoon = customer.status === 'expiring_soon';
  const isFrozen = customer.status === 'frozen';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-4">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">بطاقة العضوية القياسية (CR80 PVC Card)</h2>
              <p className="text-xs text-slate-400">
                أبعاد كارت الفيزا الموحدة (85.60 × 53.98 مم) مع رمز QR ضخم على اليسار وبيانات العضوية على اليمين.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Code Format Switcher */}
        <div className="px-6 py-3 flex items-center justify-between gap-3 no-print bg-slate-950/40 border-b border-slate-800/60">
          <span className="text-xs text-slate-400 font-medium">نوع رمز الدخول:</span>
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setCodeType('qrcode')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                codeType === 'qrcode'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>رمز QR عريض</span>
            </button>
            <button
              type="button"
              onClick={() => setCodeType('barcode')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                codeType === 'barcode'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarcodeIcon className="w-3.5 h-3.5" />
              <span>باركود ليزري (1D)</span>
            </button>
          </div>
        </div>

        {/* Card Container Preview */}
        <div className="p-6 sm:p-8 flex flex-col items-center justify-center bg-slate-950/80">
          {/* =========================================================================
              CR80 VISA / BANK-CARD STANDARD MEMBERSHIP CARD (85.60 × 53.98 mm)
              Aspect Ratio = 85.6 / 53.98 ≈ 1.5858
              LEFT: Maximum size QR Code on pure white panel with quiet zone
              RIGHT: Member Photo, Name, Member ID, Expiry Date
              ========================================================================= */}
          <div
            id="printable-card"
            className="w-full max-w-[480px] aspect-[85.6/53.98] rounded-2xl bg-gradient-to-br from-[#0a0e17] via-[#111726] to-[#080b12] text-slate-100 p-3.5 sm:p-4 relative border-2 border-amber-500/60 shadow-2xl flex flex-col justify-between overflow-hidden select-none"
            dir="ltr"
          >
            {/* Background Subtle Luxury Accents */}
            <div className="absolute -top-10 -right-10 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400" />
            <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.03] pointer-events-none" />

            {/* TOP HEADER: Compact PUMP CLUB Logo & VIP MEMBER Badge */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 z-10">
              {/* Gym Brand Logo */}
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
                  <Dumbbell className="w-3.5 h-3.5 text-slate-950 font-black" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider leading-none">
                    PUMP <span className="text-amber-500">CLUB</span>
                  </h3>
                </div>
              </div>

              {/* VIP MEMBER Badge */}
              <div className="flex items-center">
                <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-sm flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 fill-slate-950" />
                  <span>VIP MEMBER</span>
                </span>
              </div>
            </div>

            {/* MAIN CR80 BODY: 2 COLUMNS (LEFT: LARGE QR CODE, RIGHT: MEMBER INFO) */}
            <div className="grid grid-cols-12 gap-3 items-center flex-1 py-1 z-10 min-h-0">
              
              {/* =========================================================
                  LEFT SIDE: LARGE PURE QR CODE ON CLEAN WHITE PANEL
                  (No text, no labels, maximal QR size with clean quiet zone)
                  ========================================================= */}
              <div className="col-span-5 h-full flex items-center justify-center">
                <div className="w-full h-full max-h-[165px] bg-white rounded-xl p-2 shadow-lg border-2 border-white flex items-center justify-center overflow-hidden">
                  {codeType === 'qrcode' ? (
                    <div className="w-full h-full flex items-center justify-center bg-white">
                      {qrSvg ? (
                        <div
                          className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-[155px] [&>svg]:max-h-[155px] select-none"
                          dangerouslySetInnerHTML={{ __html: qrSvg }}
                        />
                      ) : qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="Membership QR Code"
                          className="w-full h-full max-w-[155px] max-h-[155px] object-contain block select-none"
                        />
                      ) : (
                        <div className="w-24 h-24 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center py-1 bg-white">
                      <svg
                        ref={barcodeSvgRef}
                        className="w-full max-h-[85px] block select-none"
                        style={{ imageRendering: 'crisp-edges', shapeRendering: 'crispEdges' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* =========================================================
                  RIGHT SIDE: MEMBER INFORMATION STACKED NEATLY
                  (Photo, Name, Membership ID, Expiry Date)
                  ========================================================= */}
              <div className="col-span-7 h-full flex flex-col justify-between pl-1" dir="rtl">
                
                {/* 1. Large Member Photo & Name */}
                <div className="flex items-center gap-2.5">
                  {/* Member Photo */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-800 border-2 border-amber-500 flex items-center justify-center overflow-hidden shrink-0 shadow-md relative">
                    {customer.image_path ? (
                      <img
                        src={customer.image_path}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-xl font-black text-amber-400">
                        {customer.full_name?.substring(0, 1) || 'ع'}
                      </span>
                    )}
                  </div>

                  {/* Member Name */}
                  <div className="min-w-0 flex-1">
                    <span className="text-[8.5px] text-slate-400 font-semibold block uppercase">الاسم / Name</span>
                    <h4 className="text-sm sm:text-base font-black text-white truncate leading-tight tracking-wide">
                      {customer.full_name}
                    </h4>
                  </div>
                </div>

                {/* 2. Structured Member Details (ID & Expiry) */}
                <div className="space-y-1 pt-1.5 border-t border-slate-800/80 text-[11px]">
                  
                  {/* Membership Code / Member ID */}
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-slate-400 text-[10px] font-medium">كود العضوية:</span>
                    <span className="font-mono font-black text-xs text-amber-400 bg-slate-950 px-1.5 py-0.5 rounded border border-amber-500/30 tracking-wider">
                      {membershipIdValue}
                    </span>
                  </div>

                  {/* Expiry Date */}
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-slate-400 text-[10px] font-medium">تاريخ الانتهاء:</span>
                    <span
                      className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded border ${
                        isExpired
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : isExpiringSoon
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : isFrozen
                          ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      }`}
                    >
                      {customer.end_date}
                    </span>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Print Stylesheet for exact CR80 Plastic Card Rendering */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
            @media print {
              @page {
                size: 85.6mm 53.98mm;
                margin: 0;
              }
              body * {
                visibility: hidden !important;
              }
              #printable-card, #printable-card * {
                visibility: visible !important;
              }
              #printable-card {
                position: fixed !important;
                left: 50% !important;
                top: 50% !important;
                transform: translate(-50%, -50%) !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-shadow: none !important;
                border: 1px solid #f59e0b !important;
                width: 85.6mm !important;
                height: 53.98mm !important;
                min-height: 53.98mm !important;
                max-width: 85.6mm !important;
                max-height: 53.98mm !important;
                padding: 3mm 3.5mm !important;
                border-radius: 3.18mm !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `,
          }}
        />

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/60 no-print">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>رمز الـ QR جاهز ومناسب للمسح السريع بكاميرات الهواتف والماسح الضوئي.</span>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handleDownloadQrOnly}
              disabled={!qrDataUrl}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
              title="تحميل رمز الـ QR عالي الدقة بصيغة PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل QR</span>
            </button>
            <button
              onClick={handleDownloadBarcodeOnly}
              disabled={!barcodeDataUrl}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
              title="تحميل صورة الباركود بصيغة PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل الباركود</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الكارت (PVC)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
