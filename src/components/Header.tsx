import React, { useState, useEffect } from 'react';
import {
  Search,
  Bell,
  Plus,
  QrCode,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { NotificationItem, Customer } from '../types';
import { api } from '../utils/api';

interface HeaderProps {
  onOpenAddCustomer: () => void;
  onNavigateToCheckIn: () => void;
  onSelectCustomer: (customerId: number) => void;
  unreadCount: number;
  onRefreshData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddCustomer,
  onNavigateToCheckIn,
  onSelectCustomer,
  unreadCount,
  onRefreshData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('ar-EG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateTimer();
    const interval = setInterval(updateTimer, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle live global search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.getCustomers({ search: searchTerm.trim() });
        setSearchResults(res.customers || []);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleToggleNotifications = () => {
    if (!showNotifications) {
      loadNotifications();
    }
    setShowNotifications(!showNotifications);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markNotificationsRead();
      onRefreshData();
      loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      await api.clearNotifications();
      setNotifications([]);
      onRefreshData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Bar */}
      <div className="relative w-96">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm && setShowSearchDropdown(true)}
            placeholder="بحث بالاسم، الهاتف، الباركود أو رقم العضوية..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-2.5" />
          {isSearching && (
            <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin absolute left-3.5 top-3" />
          )}
        </div>

        {/* Live Search Dropdown */}
        {showSearchDropdown && (
          <div className="absolute top-full mt-2 w-full bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">لا توجد نتائج مطابقة</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {searchResults.map((cust) => (
                  <button
                    key={cust.id}
                    onClick={() => {
                      onSelectCustomer(cust.id);
                      setShowSearchDropdown(false);
                      setSearchTerm('');
                    }}
                    className="w-full text-right p-3 hover:bg-slate-800/80 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                        {cust.image_path ? (
                          <img
                            src={cust.image_path}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-xs font-bold text-slate-400">
                            {cust.full_name.substring(0, 1)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">{cust.full_name}</p>
                        <p className="text-[10px] text-slate-400">
                          {cust.phone} • {cust.membership_id}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        cust.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : cust.status === 'expiring_soon'
                          ? 'bg-amber-500/20 text-amber-400'
                          : cust.status === 'frozen'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {cust.status === 'active'
                        ? 'نشط'
                        : cust.status === 'expiring_soon'
                        ? 'ينتهي قريباً'
                        : cust.status === 'frozen'
                        ? 'مجمد'
                        : 'منتهي'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Live Clock / Date */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-lg">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>{currentTime}</span>
        </div>

        {/* Quick Check-in Button */}
        <button
          onClick={onNavigateToCheckIn}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
        >
          <QrCode className="w-4 h-4" />
          <span>Check-in سريع</span>
        </button>

        {/* Add Customer Button */}
        <button
          onClick={onOpenAddCustomer}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>عميل جديد</span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={handleToggleNotifications}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors relative cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '+9' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute left-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold text-slate-200">مركز التنبيهات</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMarkAllRead}
                    title="تحديد الكل كمقروء"
                    className="text-[10px] text-amber-400 hover:underline"
                  >
                    تحديد كمقروء
                  </button>
                  <button
                    onClick={handleClearAllNotifications}
                    title="مسح الكل"
                    className="text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
                {loadingNotifications ? (
                  <div className="p-6 text-center text-xs text-slate-500">جاري تحميل التنبيهات...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">لا توجد تنبيهات جديدة</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (n.customer_id) onSelectCustomer(n.customer_id);
                        setShowNotifications(false);
                      }}
                      className={`p-3 transition-colors cursor-pointer ${
                        n.is_read ? 'bg-transparent hover:bg-slate-800/50' : 'bg-slate-800/60 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {n.type === 'expired' ? (
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        ) : n.type === 'expiring_soon' ? (
                          <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-200">{n.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                          <span className="text-[9px] text-slate-500 mt-1 block">
                            {new Date(n.created_at).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
