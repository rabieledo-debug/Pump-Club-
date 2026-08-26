import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Phone,
  Calendar,
  CreditCard,
  QrCode,
  Dumbbell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Snowflake,
  MessageCircle,
  RefreshCw,
  Edit2,
  Trash2,
  History,
  FileText,
  UserCheck,
} from 'lucide-react';
import { Customer, SubscriptionHistoryItem, FreezeRecord, CheckInRecord } from '../types';
import { api } from '../utils/api';
import { generateQRCodeDataUrl } from '../utils/qrcode';

interface CustomerProfileModalProps {
  customerId: number;
  onClose: () => void;
  onOpenEdit: (customer: Customer) => void;
  onOpenRenew: (customer: Customer) => void;
  onOpenFreeze: (customer: Customer) => void;
  onOpenPrintCard: (customer: Customer) => void;
  onOpenWhatsApp: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  customerId,
  onClose,
  onOpenEdit,
  onOpenRenew,
  onOpenFreeze,
  onOpenPrintCard,
  onOpenWhatsApp,
  onDelete,
}) => {
  const [data, setData] = useState<{
    customer: Customer;
    history: SubscriptionHistoryItem[];
    freezes: FreezeRecord[];
    checkIns: CheckInRecord[];
    stats: { total_check_ins: number; last_check_in: string | null };
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'history' | 'checkins' | 'freezes'>('history');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCustomer(customerId);
      setData(res);
      if (res.customer?.membership_id) {
        const url = await generateQRCodeDataUrl(res.customer.membership_id, {
          width: 200,
          margin: 2,
          errorCorrectionLevel: 'M',
        });
        setQrDataUrl(url);
      }
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات العميل');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [customerId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">جاري تحميل ملف العميل من قاعدة البيانات...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <p className="text-sm text-slate-200 mb-4">{error || 'لم يتم العثور على العميل'}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
          >
            إغلاق
          </button>
        </div>
      </div>
    );
  }

  const { customer, history, freezes, checkIns, stats } = data;

  const getStatusBadge = () => {
    switch (customer.status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>اشتراك نشط ({customer.days_remaining} يوم متبقي)</span>
          </span>
        );
      case 'expiring_soon':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {customer.days_remaining === 0
                ? 'ينتهي اليوم!'
                : `ينتهي قريباً بعد ${customer.days_remaining} يوم`}
            </span>
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>اشتراك منتهي</span>
          </span>
        );
      case 'frozen':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Snowflake className="w-3.5 h-3.5" />
            <span>اشتراك مجمد</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">الملف الشخصي للعميل</h2>
              <span className="text-xs text-slate-400 font-mono">{customer.membership_id}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Profile Card */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-24 h-24 rounded-2xl bg-slate-800 border-2 border-amber-500/30 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                {customer.image_path ? (
                  <img
                    src={customer.image_path}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-3xl font-black text-amber-400">
                    {customer.full_name.substring(0, 1)}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-white">{customer.full_name}</h3>
                  {getStatusBadge()}
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span dir="ltr">{customer.phone}</span>
                  {customer.national_id && (
                    <span className="text-slate-500">• رقم قومي: {customer.national_id}</span>
                  )}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="bg-slate-800/80 px-2.5 py-0.5 rounded-md font-semibold text-slate-300">
                    {customer.plan_type} ({customer.duration_months} شهر)
                  </span>
                  {customer.is_private ? (
                    <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-0.5 rounded-md font-semibold flex items-center gap-1">
                      <Dumbbell className="w-3 h-3" />
                      <span>كوتش: {customer.coach_name || 'مدرب خاص'}</span>
                    </span>
                  ) : (
                    <span className="text-slate-500">اشتراك عام</span>
                  )}
                </div>
              </div>
            </div>

            {/* QR Code & Membership ID */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-center self-stretch md:self-auto min-w-[200px] flex flex-col items-center justify-center gap-2">
              <div className="bg-white rounded-xl p-2 shadow-md flex items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code ${customer.membership_id}`}
                    className="w-20 h-20 object-contain select-none"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-mono">
                    QR Code
                  </div>
                )}
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-amber-400 font-bold block">
                  {customer.membership_id}
                </span>
                <span className="text-[8px] text-slate-400 block">رمز QR للدخول السريع</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">تاريخ البداية</span>
              <span className="text-xs font-mono font-bold text-slate-200">{customer.start_date}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">تاريخ الانتهاء</span>
              <span className="text-xs font-mono font-bold text-amber-400">{customer.end_date}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">مرات الدخول الكلية</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {stats.total_check_ins} مرة
              </span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">آخر دخول</span>
              <span className="text-xs font-mono text-slate-300">
                {stats.last_check_in
                  ? new Date(stats.last_check_in).toLocaleDateString('ar-EG', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'لم يسجل دخول'}
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pb-2 border-b border-slate-800">
            <button
              onClick={() => onOpenWhatsApp(customer)}
              className="flex items-center gap-2 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-600/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>محادثة واتساب</span>
            </button>

            <button
              onClick={() => onOpenRenew(customer)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-amber-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>تجديد الاشتراك</span>
            </button>

            <button
              onClick={() => onOpenFreeze(customer)}
              className="flex items-center gap-2 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Snowflake className="w-4 h-4" />
              <span>تجميد الاشتراك</span>
            </button>

            <button
              onClick={() => onOpenPrintCard(customer)}
              className="flex items-center gap-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>طباعة بطاقة العضوية</span>
            </button>

            <button
              onClick={() => onOpenEdit(customer)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
            >
              <Edit2 className="w-4 h-4" />
              <span>تعديل</span>
            </button>

            <button
              onClick={() => onDelete(customer)}
              className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer mr-auto"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف العميل</span>
            </button>
          </div>

          {/* Sub-Tabs: History, Check-ins, Freezes */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
                  activeTab === 'history'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>سجل الاشتراكات والتجديد ({history.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('checkins')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
                  activeTab === 'checkins'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>سجل تسجيل الدخول Check-in ({checkIns.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('freezes')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
                  activeTab === 'freezes'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950'
                }`}
              >
                <Snowflake className="w-3.5 h-3.5" />
                <span>سجل التجميد ({freezes.length})</span>
              </button>
            </div>

            {/* Tab: Subscription History */}
            {activeTab === 'history' && (
              <div className="space-y-2.5">
                {history.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-6">لا يوجد سجل اشتراكات</p>
                ) : (
                  history.map((h) => (
                    <div
                      key={h.id}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-1 rounded-lg font-bold ${
                            h.action_type === 'start'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : h.action_type === 'renew'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-cyan-500/20 text-cyan-400'
                          }`}
                        >
                          {h.action_type === 'start'
                            ? 'اشتراك جديد'
                            : h.action_type === 'renew'
                            ? 'تجديد اشتراك'
                            : 'تجميد'}
                        </span>
                        <div>
                          <p className="font-bold text-slate-200">
                            {h.plan_type || customer.plan_type} • {h.duration_months} شهر
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            الفترة: {h.start_date} إلى {h.end_date} {h.notes ? `• ${h.notes}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-left font-mono">
                        <span className="font-bold text-slate-200 block">{h.amount} ج.م</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(h.created_at).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Check-in Logs */}
            {activeTab === 'checkins' && (
              <div className="space-y-2">
                {checkIns.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-6">لم يتم تسجيل أي دخول بعد</p>
                ) : (
                  <div className="divide-y divide-slate-800/80 bg-slate-950/60 rounded-xl border border-slate-800 overflow-hidden">
                    {checkIns.map((ci) => (
                      <div
                        key={ci.id}
                        className="p-3 flex items-center justify-between text-xs hover:bg-slate-900/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              ci.status === 'granted' ? 'bg-emerald-400' : 'bg-rose-500'
                            }`}
                          />
                          <div>
                            <span className="font-bold text-slate-200">
                              {ci.status === 'granted' ? 'دخول مصرح به' : 'محاولة دخول مرفوضة'}
                            </span>
                            <span className="text-[10px] text-slate-500 block font-mono">
                              باركود: {ci.barcode}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-slate-400 text-[11px]">
                          {new Date(ci.check_in_time).toLocaleString('ar-EG')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Freezes */}
            {activeTab === 'freezes' && (
              <div className="space-y-2.5">
                {freezes.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-6">لا يوجد سجل تجميد لهذا العميل</p>
                ) : (
                  freezes.map((f) => (
                    <div
                      key={f.id}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <Snowflake className="w-5 h-5 text-cyan-400" />
                        <div>
                          <p className="font-bold text-slate-200">تجميد لمدة {f.days_count} يوم</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            من {f.start_date} إلى {f.end_date} {f.reason ? `• السبب: ${f.reason}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(f.created_at).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
