import React, { useState } from 'react';
import { X, MessageCircle, Send, CheckCircle2, Phone, Sparkles } from 'lucide-react';
import { Customer, GymSettings } from '../types';

interface WhatsAppModalProps {
  customer: Customer;
  settings?: GymSettings;
  onClose: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ customer, settings, onClose }) => {
  const isExpired = customer.status === 'expired';
  const isExpiringSoon = customer.status === 'expiring_soon';

  const defaultTemplates = {
    expired:
      settings?.whatsapp_expired_msg ||
      `أهلاً بك في Pump Club 👋\nنود إبلاغك أن اشتراكك في الجيم قد انتهى.\nيمكنك تجديد اشتراكك للاستمرار في التدريب معنا 💪\nنتمنى لك تمرينًا موفقًا ❤️`,
    expiring_soon:
      settings?.whatsapp_expiring_soon_msg?.replace('{endDate}', customer.end_date) ||
      `مرحباً بك من Pump Club 👋\nنود تذكيرك بأن اشتراكك سينتهي قريباً بتاريخ ${customer.end_date}.\nيمكنك التجديد الآن للاستمرار في التدريب بدون انقطاع! 💪`,
    welcome:
      `مرحباً بك في أسرة Pump Club! 🏋️‍♂️\nرقم عضويتك: ${customer.membership_id}\nنحن سعداء بانضمامك إلينا ونتمنى لك رحلة رياضية مميزة.`,
    freeze:
      `تم بنجاح تجميد اشتراكك في Pump Club.\nتاريخ انتهاء الاشتراك الجديد: ${customer.end_date}.\nنتمنى لك السلامة وننتظر عودتك! 🥊`,
  };

  const initialTemplate = isExpired
    ? defaultTemplates.expired
    : isExpiringSoon
    ? defaultTemplates.expiring_soon
    : defaultTemplates.welcome;

  const [message, setMessage] = useState<string>(initialTemplate);
  const [selectedType, setSelectedType] = useState<string>(
    isExpired ? 'expired' : isExpiringSoon ? 'expiring_soon' : 'welcome'
  );

  const handleSelectTemplate = (type: keyof typeof defaultTemplates) => {
    setSelectedType(type);
    setMessage(defaultTemplates[type]);
  };

  const handleSend = () => {
    // Clean phone number
    let cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    // If starts with 2001 (e.g. +20 010...), remove leading zero after country code to standard 201...
    if (cleanPhone.startsWith('2001')) {
      cleanPhone = '20' + cleanPhone.substring(3);
    } else if (cleanPhone.startsWith('01')) {
      cleanPhone = '2' + cleanPhone;
    }

    const encodedMsg = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    window.open(waUrl, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">إرسال رسالة عبر WhatsApp</h2>
              <p className="text-xs text-slate-400">
                العميل: <span className="text-white font-bold">{customer.full_name}</span> ({customer.phone})
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

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Template Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">اختر قالب الرسالة</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectTemplate('expired')}
                className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                  selectedType === 'expired'
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                تنبيه انتهاء
              </button>
              <button
                type="button"
                onClick={() => handleSelectTemplate('expiring_soon')}
                className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                  selectedType === 'expiring_soon'
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                تذكير بقرب الانتهاء
              </button>
              <button
                type="button"
                onClick={() => handleSelectTemplate('welcome')}
                className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                  selectedType === 'welcome'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                ترحيب بالعضوية
              </button>
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">نص الرسالة (يمكنك تعديلها)</label>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-100 leading-relaxed focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>سيتم فتح المحادثة مباشرة مع الرقم: <span className="font-mono text-white" dir="ltr">{customer.phone}</span></span>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSend}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4 rotate-180" />
              <span>إرسال عبر WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
