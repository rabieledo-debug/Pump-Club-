import React from 'react';
import {
  Users,
  UserCheck,
  AlertTriangle,
  Clock,
  Snowflake,
  UserPlus,
  QrCode,
  ArrowUpRight,
  MessageCircle,
  RefreshCw,
  TrendingUp,
  ShieldAlert,
  Dumbbell,
  CheckCircle2,
} from 'lucide-react';
import { DashboardStats, Customer, CheckInRecord } from '../types';

interface DashboardViewProps {
  stats: DashboardStats;
  recentCheckIns: any[];
  expiringSoonList: Customer[];
  expiredList: Customer[];
  onNavigateTab: (tab: any) => void;
  onSelectCustomer: (id: number) => void;
  onOpenAddCustomer: () => void;
  onOpenRenew: (customer: Customer) => void;
  onOpenWhatsApp: (customer: Customer) => void;
  onRefresh: () => void;
  loading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  recentCheckIns,
  expiringSoonList,
  expiredList,
  onNavigateTab,
  onSelectCustomer,
  onOpenAddCustomer,
  onOpenRenew,
  onOpenWhatsApp,
  onRefresh,
  loading,
}) => {
  const statCards = [
    {
      title: 'إجمالي العملاء',
      value: stats.total_customers,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      onClick: () => onNavigateTab('customers'),
    },
    {
      title: 'الاشتراكات النشطة',
      value: stats.active_customers,
      icon: UserCheck,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      onClick: () => onNavigateTab('customers'),
    },
    {
      title: 'الاشتراكات المنتهية',
      value: stats.expired_customers,
      icon: AlertTriangle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      badge: stats.expired_customers > 0 ? 'تنبيه' : undefined,
      onClick: () => onNavigateTab('customers'),
    },
    {
      title: 'تنتهي قريباً (خلال 7 أيام)',
      value: stats.expiring_soon_customers,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      badge: stats.expiring_soon_customers > 0 ? 'تذكير' : undefined,
      onClick: () => onNavigateTab('customers'),
    },
    {
      title: 'الاشتراكات المجمدة',
      value: stats.frozen_customers,
      icon: Snowflake,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      onClick: () => onNavigateTab('customers'),
    },
    {
      title: 'عملاء Private مع كوتش',
      value: stats.private_customers,
      icon: Dumbbell,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      onClick: () => onNavigateTab('coaches'),
    },
    {
      title: 'عدد دخول العملاء اليوم',
      value: stats.today_checkins,
      icon: QrCode,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      highlight: true,
      onClick: () => onNavigateTab('check-in'),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              لوحة التحكم الرئيسية
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
              النظام متصل محلياً (SQLite)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>مرحباً بك في</span>
            </h1>
            <img
              src="https://i.postimg.cc/zDpJmgGy/1000243171-removebg-preview.png"
              alt="Pump Club"
              className="h-8 w-auto max-w-[140px] object-contain drop-shadow"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            نظام إدارة الاشتراكات وتسجيل الدخول السريع وقاعدة البيانات المحلية على الجهاز.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => onNavigateTab('check-in')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>شاشة Check-in</span>
          </button>
          <button
            onClick={onOpenAddCustomer}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة عميل جديد</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.onClick}
              className={`p-5 rounded-2xl bg-slate-900/80 border ${card.border} hover:border-amber-500/40 transition-all shadow-lg hover:shadow-xl cursor-pointer group relative overflow-hidden`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400">{card.title}</span>
                <div className={`p-2 rounded-xl ${card.bg} ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-white tracking-tight">{card.value}</span>
                {card.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase ${
                    card.badge === 'تنبيه' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {card.badge}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center text-[10px] text-slate-500 group-hover:text-amber-400 transition-colors">
                <span>عرض التفاصيل</span>
                <ArrowUpRight className="w-3 h-3 mr-1 rotate-180" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Alerts & Expiring Subscriptions vs Recent Check-ins */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left/Main Column: Alerts and Subscriptions Ending Soon */}
        <div className="lg:col-span-7 space-y-6">
          {/* Expiring Soon Alerts */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-200">
                  اشتراكات تنتهي قريباً ({expiringSoonList.length})
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('customers')}
                className="text-xs text-amber-400 hover:underline cursor-pointer"
              >
                عرض كل العملاء
              </button>
            </div>

            {expiringSoonList.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/40" />
                <span>لا توجد اشتراكات تنتهي خلال الأيام القادمة</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {expiringSoonList.map((cust) => {
                  const days = cust.days_remaining ?? 0;
                  const urgencyColor =
                    days <= 1
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                      : days <= 3
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300';

                  return (
                    <div
                      key={cust.id}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 transition-all"
                    >
                      <div
                        onClick={() => onSelectCustomer(cust.id)}
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                          {cust.image_path ? (
                            <img
                              src={cust.image_path}
                              alt=""
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-xs font-bold text-amber-400">
                              {cust.full_name.substring(0, 1)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate">{cust.full_name}</p>
                          <p className="text-[10px] text-slate-400">
                            {cust.phone} • {cust.membership_id}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border ${urgencyColor}`}>
                          {days === 0 ? 'ينتهي اليوم!' : `ينتهي بعد ${days} يوم`}
                        </span>

                        <button
                          onClick={() => onOpenWhatsApp(cust)}
                          title="إرسال تذكير عبر واتساب"
                          className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onOpenRenew(cust)}
                          title="تجديد الاشتراك"
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          تجديد
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expired Subscriptions Alerts */}
          {expiredList.length > 0 && (
            <div className="bg-slate-900/80 border border-rose-500/20 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-bold text-rose-300">
                    اشتراكات منتهية تحتاج للتجديد ({expiredList.length})
                  </h3>
                </div>
              </div>

              <div className="space-y-2.5">
                {expiredList.slice(0, 5).map((cust) => (
                  <div
                    key={cust.id}
                    className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between gap-3"
                  >
                    <div
                      onClick={() => onSelectCustomer(cust.id)}
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                        {cust.image_path ? (
                          <img
                            src={cust.image_path}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-xs font-bold text-rose-400">
                            {cust.full_name.substring(0, 1)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate">{cust.full_name}</p>
                        <p className="text-[10px] text-slate-400">
                          انتهى بتاريخ: <span className="text-rose-400 font-mono">{cust.end_date}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenWhatsApp(cust)}
                        title="إرسال رسالة تجديد واتساب"
                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onOpenRenew(cust)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        تجديد الآن
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recent Check-ins Live Feed */}
        <div className="lg:col-span-5">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-200">
                  آخر تسجيلات الدخول (Recent Check-ins)
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('check-in')}
                className="text-xs text-emerald-400 hover:underline cursor-pointer"
              >
                سجل الدخول الكامل
              </button>
            </div>

            {recentCheckIns.length === 0 ? (
              <div className="flex-1 py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                <QrCode className="w-10 h-10 text-slate-700" />
                <span>لم يتم تسجيل دخول أي عميل اليوم بعد</span>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[480px]">
                {recentCheckIns.map((ci) => {
                  const isGranted = ci.status === 'granted';
                  return (
                    <div
                      key={ci.id}
                      onClick={() => onSelectCustomer(ci.customer_id)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isGranted
                          ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          : 'bg-rose-500/5 border-rose-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                          {ci.image_path ? (
                            <img
                              src={ci.image_path}
                              alt=""
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-xs font-bold text-slate-400">
                              {ci.full_name?.substring(0, 1) || 'ع'}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate">{ci.full_name}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {ci.membership_id} • {ci.plan_type}
                          </p>
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-md font-bold block mb-1 ${
                            isGranted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {isGranted ? 'ACCESS GRANTED' : 'DENIED'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(ci.check_in_time).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
