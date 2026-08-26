import React, { useState, useEffect } from 'react';
import { X, Snowflake, Calendar, AlertCircle } from 'lucide-react';
import { Customer } from '../types';
import { api } from '../utils/api';

interface FreezeModalProps {
  customer: Customer;
  onClose: () => void;
  onSuccess: () => void;
}

export const FreezeModal: React.FC<FreezeModalProps> = ({ customer, onClose, onSuccess }) => {
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [daysCount, setDaysCount] = useState<number>(10);
  const [reason, setReason] = useState<string>('تجميد بطلب العميل (سفر / إصابة)');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to add days
  const addDaysToDate = (dateStr: string, days: number): string => {
    try {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + days);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  const calculatedEndDate = addDaysToDate(startDate, daysCount);
  const newSubscriptionEndDate = addDaysToDate(customer.end_date, daysCount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (daysCount <= 0) {
      setError('عدد أيام التجميد يجب أن يكون أكبر من صفر');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.freezeCustomer(customer.id, {
        start_date: startDate,
        end_date: calculatedEndDate,
        days_count: daysCount,
        reason,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'فشل تجميد الاشتراك');
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
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Snowflake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">تجميد الاشتراك (Freeze)</h2>
              <p className="text-xs text-slate-400">
                العميل: <span className="text-white font-bold">{customer.full_name}</span>
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

          {/* Preset Days */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">مدة التجميد السريعة</label>
            <div className="grid grid-cols-4 gap-2">
              {[7, 10, 15, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDaysCount(d)}
                  className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    daysCount === d
                      ? 'bg-cyan-500 text-slate-950 border-cyan-500 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {d} أيام
                </button>
              ))}
            </div>
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                <span>بداية التجميد</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">عدد الأيام</label>
              <input
                type="number"
                min="1"
                max="90"
                value={daysCount}
                onChange={(e) => setDaysCount(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono font-bold"
                required
              />
            </div>
          </div>

          {/* Live Extension Preview Card */}
          <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>حساب التمديد التلقائي للاشتراك:</span>
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <p>
                فترة التجميد: من <span className="font-mono font-bold text-white">{startDate}</span> إلى{' '}
                <span className="font-mono font-bold text-white">{calculatedEndDate}</span>
              </p>
              <p>
                تاريخ انتهاء الاشتراك السابق: <span className="font-mono line-through text-slate-500">{customer.end_date}</span>
              </p>
              <p className="text-cyan-300 font-bold">
                تاريخ الانتهاء الجديد بعد إضافة {daysCount} يوم:{' '}
                <span className="font-mono text-base underline">{newSubscriptionEndDate}</span>
              </p>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">سبب التجميد</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: سفر، ظروف صحية..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
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
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'جاري التجميد...' : 'تأكيد تجميد الاشتراك وتمديد المدة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
