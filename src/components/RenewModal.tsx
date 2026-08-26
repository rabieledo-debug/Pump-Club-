import React, { useState } from 'react';
import { X, RefreshCw, Calendar, DollarSign, CheckCircle2 } from 'lucide-react';
import { Customer } from '../types';
import { api } from '../utils/api';

interface RenewModalProps {
  customer: Customer;
  onClose: () => void;
  onSuccess: () => void;
}

export const RenewModal: React.FC<RenewModalProps> = ({ customer, onClose, onSuccess }) => {
  const [planType, setPlanType] = useState<string>(customer.plan_type || 'Monthly');
  const [durationMonths, setDurationMonths] = useState<number>(customer.duration_months || 1);
  const [pricePaid, setPricePaid] = useState<string>('0');
  const [notes, setNotes] = useState<string>('تجديد الاشتراك');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExpired = customer.status === 'expired';
  const todayStr = new Date().toISOString().split('T')[0];

  const calculateNewEndDate = () => {
    try {
      const baseDate = isExpired ? todayStr : customer.end_date;
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + durationMonths);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return {
        startDate: isExpired ? todayStr : customer.end_date,
        endDate: `${year}-${month}-${day}`,
      };
    } catch {
      return { startDate: todayStr, endDate: '' };
    }
  };

  const calculated = calculateNewEndDate();

  const handlePlanSelect = (name: string, months: number) => {
    setPlanType(name);
    setDurationMonths(months);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.renewCustomer(customer.id, {
        plan_type: planType,
        duration_months: durationMonths,
        price_paid: parseFloat(pricePaid) || 0,
        notes,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'فشل تجديد الاشتراك');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">تجديد اشتراك العميل</h2>
              <p className="text-xs text-slate-400">
                العميل: <span className="text-white font-bold">{customer.full_name}</span> ({customer.membership_id})
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Current Status info */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">حالة الاشتراك الحالي:</span>
            <span className={`font-bold ${isExpired ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isExpired ? `منتهي (تاريخ ${customer.end_date})` : `نشط حتى (${customer.end_date})`}
            </span>
          </div>

          {/* Plans Grid */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">اختر مدة التجديد الجديدة</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { name: 'Monthly', label: 'شهر', months: 1 },
                { name: '3 Months', label: '3 أشهر', months: 3 },
                { name: '6 Months', label: '6 أشهر', months: 6 },
                { name: 'Yearly', label: 'سنة', months: 12 },
              ].map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handlePlanSelect(p.name, p.months)}
                  className={`p-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                    planType === p.name && durationMonths === p.months
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* New Dates Preview */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>فترة الاشتراك بعد التجديد:</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
              <div>
                <span className="text-slate-400 block mb-0.5">تاريخ البداية:</span>
                <span className="font-mono font-bold text-white">{calculated.startDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">تاريخ الانتهاء الجديد:</span>
                <span className="font-mono text-base font-bold text-amber-400">{calculated.endDate}</span>
              </div>
            </div>
          </div>

          {/* Price Paid & Notes */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>المبلغ المدفوع</span>
              </label>
              <input
                type="number"
                value={pricePaid}
                onChange={(e) => setPricePaid(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">ملاحظات التجديد</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="تجديد عادي..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
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
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'جاري التجديد...' : 'تأكيد التجديد وحفظ السجل'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
