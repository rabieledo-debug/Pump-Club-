import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  Dumbbell,
  Clock,
} from 'lucide-react';
import { DashboardStats, Customer, Coach } from '../types';
import { api } from '../utils/api';

interface ReportsViewProps {
  customers: Customer[];
  coaches: Coach[];
  stats: DashboardStats | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ customers, coaches, stats }) => {
  const [timeframe, setTimeframe] = useState<'all' | 'month' | 'week'>('month');

  // Compute local report metrics
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status === 'active' || c.status === 'expiring_soon').length;
  const expiredCustomers = customers.filter((c) => c.status === 'expired').length;
  const frozenCustomers = customers.filter((c) => c.status === 'frozen').length;
  const privateCustomers = customers.filter((c) => c.is_private).length;

  const totalRevenue = stats?.monthly_revenue ?? 0;

  const exportCSV = () => {
    const headers = 'ID,Full Name,Phone,Membership ID,Plan,Duration Months,Status,Start Date,End Date,Price Paid,Coach\n';
    const rows = customers
      .map(
        (c) =>
          `"${c.id}","${c.full_name}","${c.phone}","${c.membership_id}","${c.plan_type}","${c.duration_months}","${c.status}","${c.start_date}","${c.end_date}","${c.price_paid || 0}","${c.coach_name || ''}"`
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pump-club-members-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <span>التقارير والإحصائيات المالية (Reports)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            تحليل الإيرادات، تجديد الاشتراكات، حركة المشتركين ومعدلات الدخول.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-500" />
            <span>تصدير إلى Excel / CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400">إيرادات الشهر</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono">{totalRevenue.toLocaleString()} ج.م</p>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>محسوبة محلياً من قاعدة البيانات</span>
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400">المشتركين النشطين</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono">{activeCustomers}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            من إجمالي {totalCustomers} عضو مسجل
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400">الاشتراكات المنتهية</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-400 font-mono">{expiredCustomers}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            بحاجة إلى إرسال تذكير للتجديد
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400">تدريب خاص (Private)</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Dumbbell className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-400 font-mono">{privateCustomers}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            تحت إشراف {coaches.length} مدرب
          </p>
        </div>
      </div>

      {/* Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plans Distribution */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            <span>توزيع أنواع الاشتراكات</span>
          </h3>

          <div className="space-y-3">
            {[
              {
                name: 'شهري (Monthly)',
                count: customers.filter((c) => c.plan_type === 'Monthly' || c.duration_months === 1).length,
                color: 'bg-amber-500',
              },
              {
                name: '3 أشهر (3 Months)',
                count: customers.filter((c) => c.plan_type === '3 Months' || c.duration_months === 3).length,
                color: 'bg-emerald-500',
              },
              {
                name: '6 أشهر (6 Months)',
                count: customers.filter((c) => c.plan_type === '6 Months' || c.duration_months === 6).length,
                color: 'bg-blue-500',
              },
              {
                name: 'سنوي (Yearly)',
                count: customers.filter((c) => c.plan_type === 'Yearly' || c.duration_months === 12).length,
                color: 'bg-purple-500',
              },
            ].map((plan) => {
              const pct = totalCustomers > 0 ? Math.round((plan.count / totalCustomers) * 100) : 0;
              return (
                <div key={plan.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{plan.name}</span>
                    <span className="text-slate-400 font-mono">
                      {plan.count} مشترك ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div className={`h-full ${plan.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coaches Performance Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-purple-400" />
            <span>أداء وتوزيع المدربين</span>
          </h3>

          {coaches.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">لا يوجد مدربين مسجلين</p>
          ) : (
            <div className="space-y-3">
              {coaches.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-purple-400">
                      {c.name.substring(0, 1)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">{c.name}</p>
                      <p className="text-[10px] text-slate-400">{c.specialty || 'مدرب'}</p>
                    </div>
                  </div>

                  <div className="text-left font-mono">
                    <span className="font-bold text-purple-400 block">
                      {c.private_customers ?? 0} متدرب خاص
                    </span>
                    <span className="text-[10px] text-slate-500">
                      إجمالي: {c.total_customers ?? 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
