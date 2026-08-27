import React from 'react';
import {
  LayoutDashboard,
  Users,
  QrCode,
  CreditCard,
  UserCheck,
  BarChart3,
  Settings,
  Dumbbell,
  LogOut,
  HardDrive,
} from 'lucide-react';
import { User } from '../types';

export type NavTab = 'dashboard' | 'customers' | 'check-in' | 'subscriptions' | 'coaches' | 'reports' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: User;
  onLogout: () => void;
  unreadAlertsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  onLogout,
  unreadAlertsCount,
}) => {
  const menuItems = [
    { id: 'dashboard' as NavTab, label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'customers' as NavTab, label: 'العملاء', icon: Users },
    { id: 'check-in' as NavTab, label: 'تسجيل الدخول (Check-in)', icon: QrCode, badge: 'سريع' },
    { id: 'subscriptions' as NavTab, label: 'الاشتراكات والتجديد', icon: CreditCard },
    { id: 'coaches' as NavTab, label: 'المدربين (Coaches)', icon: UserCheck },
    { id: 'reports' as NavTab, label: 'التقارير والإحصائيات', icon: BarChart3 },
    { id: 'settings' as NavTab, label: 'الإعدادات والنسخ الاحتياطي', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-950/95 border-l border-slate-800/80 flex flex-col h-screen select-none shrink-0 sticky top-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-center">
        <img
          src="https://i.postimg.cc/zDpJmgGy/1000243171-removebg-preview.png"
          alt="Pump Club"
          className="h-12 w-auto max-w-[190px] object-contain drop-shadow-md select-none"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    isActive
                      ? 'bg-slate-950 text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* SQLite Local DB Status Card */}
      <div className="p-3 mx-3 mb-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-300 truncate">SQLite Local Storage</p>
            <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-emerald-500" />
              <span>بيانات محلية 100% بدون إنترنت</span>
            </p>
          </div>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-amber-400 border border-slate-700">
              {currentUser.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{currentUser.full_name || currentUser.username}</p>
              <p className="text-[10px] text-amber-500/90 capitalize">{currentUser.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="تسجيل الخروج"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
