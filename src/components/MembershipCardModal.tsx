import React, { useState, useEffect } from 'react';
import { X, Printer, Dumbbell, QrCode, Download, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { Customer } from '../types';
import { generateQRCodeDataUrl } from '../utils/qrcode';

interface MembershipCardModalProps {
  customer: Customer;
  onClose: () => void;
}

export const MembershipCardModal: React.FC<MembershipCardModalProps> = ({ customer, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(true);

  // Generate unique dynamic QR Code strictly containing ONLY the member's unique Membership ID
  useEffect(() => {
    let isMounted = true;
    const generateCode = async () => {
      setGenerating(true);
      try {
        // Encode ONLY the unique membership ID (e.g. "PC-2026-0001")
        const idValue = customer.membership_id || `PC-${customer.id.toString().padStart(4, '0')}`;
        const url = await generateQRCodeDataUrl(idValue, {
          width: 320,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#0f172a', // Deep slate for maximum scanner optical contrast
            light: '#ffffff',
          },
        });
        if (isMounted) {
          setQrDataUrl(url);
        }
      } catch (err) {
        console.error('Failed to generate QR Code:', err);
      } finally {
        if (isMounted) {
          setGenerating(false);
        }
      }
    };

    generateCode();
    return () => {
      isMounted = false;
    };
  }, [customer.membership_id, customer.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQrOnly = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_${customer.membership_id || customer.id}_${customer.full_name}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isExpired = customer.status === 'expired';
  const isExpiringSoon = customer.status === 'expiring_soon';
  const isFrozen = customer.status === 'frozen';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">بطاقة العضوية الذكية (Smart QR Card)</h2>
              <p className="text-xs text-slate-400">
                بطاقة عضوية مع رمز QR فريد متوافق مع الماسح الضوئي وطابعات الكروت البلاستيكية.
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

        {/* Card Container Preview */}
        <div className="p-8 flex flex-col items-center justify-center bg-slate-950/80">
          {/* Real Card - CR80 Dimensions Styling (85.6mm x 54mm equivalent ratio) */}
          <div
            id="printable-card"
            className="w-[430px] h-[270px] rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-neutral-950 text-slate-100 p-5 relative border-2 border-amber-500/50 shadow-2xl flex flex-col justify-between overflow-hidden select-none"
            dir="rtl"
          >
            {/* Background Aesthetic Layers */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px] opacity-5 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400" />

            {/* Top Bar: Gym Name & Membership Badge */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                  <Dumbbell className="w-4.5 h-4.5 text-slate-950 font-black" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider leading-none">
                    PUMP <span className="text-amber-500">CLUB</span>
                  </h3>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    GYM & FITNESS CLUB
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-sm flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>VIP MEMBER</span>
                </span>
              </div>
            </div>

            {/* Middle Section: Member Photo & Details */}
            <div className="flex items-center gap-3.5 my-auto z-10">
              {/* Member Photo */}
              <div className="w-[72px] h-[72px] rounded-xl bg-slate-800 border-2 border-amber-500/60 flex items-center justify-center overflow-hidden shrink-0 shadow-lg relative">
                {customer.image_path ? (
                  <img
                    src={customer.image_path}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-2xl font-black text-amber-400">
                    {customer.full_name?.substring(0, 1) || 'ع'}
                  </span>
                )}
              </div>

              {/* Member Text Info (positioned completely away from QR Code) */}
              <div className="space-y-1 min-w-0 flex-1">
                <h4 className="text-base font-black text-white truncate leading-tight tracking-wide">
                  {customer.full_name}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-300">
                  <span className="bg-slate-800/90 text-amber-300 px-2 py-0.5 rounded border border-slate-700/80 font-bold">
                    {customer.plan_type}
                  </span>
                  {customer.is_private ? (
                    <span className="bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 text-[9px] font-bold">
                      تدريب خاص
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 text-[9px] text-slate-400">
                  <span>
                    ينتهي في:{' '}
                    <span
                      className={`font-mono font-bold ${
                        isExpired
                          ? 'text-rose-400'
                          : isExpiringSoon
                          ? 'text-amber-400'
                          : isFrozen
                          ? 'text-cyan-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {customer.end_date}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Bar: Dedicated High-Contrast QR Code Zone + Clear Text Membership ID */}
            <div className="z-10 bg-slate-950/80 rounded-xl p-2 border border-slate-800 flex items-center justify-between gap-3">
              {/* Left text block: Membership ID in normal readable text */}
              <div className="space-y-0.5 text-right min-w-0">
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">
                  رقم العضوية المعتمد
                </span>
                <p className="text-sm font-mono font-black text-amber-400 tracking-wider">
                  {customer.membership_id}
                </p>
                <span className="text-[7px] text-slate-500 block">
                  امسح الـ QR عند الدخول لتأكيد الاشتراك
                </span>
              </div>

              {/* Right side: High-contrast white box with generous quiet-zone margins for instant scanner reading */}
              <div className="bg-white rounded-lg p-1.5 shrink-0 shadow-md flex items-center justify-center border border-white">
                {generating ? (
                  <div className="w-16 h-16 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${customer.membership_id}`}
                    className="w-16 h-16 object-contain block select-none"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <div className="w-16 h-16 bg-slate-100 flex items-center justify-center text-[9px] text-slate-500">
                    QR Code
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Print Stylesheet for exact CR80 PVC card print rendering */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
            @media print {
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
                border: 1px solid #d97706 !important;
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
            <span>رمز الـ QR مشفر برقم العضوية فقط للمسح السريع.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handleDownloadQrOnly}
              disabled={!qrDataUrl}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
              title="تحميل صورة رمز الـ QR بصيغة PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل QR</span>
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
