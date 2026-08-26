import React, { useState, useEffect, useCallback } from 'react';
import { User, Customer, Coach, DashboardStats, GymSettings } from './types';
import { api } from './utils/api';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { CustomersView } from './components/CustomersView';
import { CheckInView } from './components/CheckInView';
import { CoachesView } from './components/CoachesView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { CustomerFormModal } from './components/CustomerFormModal';
import { CustomerProfileModal } from './components/CustomerProfileModal';
import { FreezeModal } from './components/FreezeModal';
import { RenewModal } from './components/RenewModal';
import { MembershipCardModal } from './components/MembershipCardModal';
import { WhatsAppModal } from './components/WhatsAppModal';

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('pumpclub_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Application Data State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);
  const [expiringSoonList, setExpiringSoonList] = useState<Customer[]>([]);
  const [expiredList, setExpiredList] = useState<Customer[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [settings, setSettings] = useState<GymSettings | null>(null);

  const [loading, setLoading] = useState<boolean>(false);

  // Modals state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [profileCustomerId, setProfileCustomerId] = useState<number | null>(null);
  const [renewingCustomer, setRenewingCustomer] = useState<Customer | null>(null);
  const [freezingCustomer, setFreezingCustomer] = useState<Customer | null>(null);
  const [printingCustomer, setPrintingCustomer] = useState<Customer | null>(null);
  const [whatsAppCustomer, setWhatsAppCustomer] = useState<Customer | null>(null);

  // Load all foundational data
  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [dashRes, custRes, coachRes, settRes, notifRes] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getCustomers().catch(() => ({ customers: [] })),
        api.getCoaches().catch(() => ({ coaches: [] })),
        api.getSettings().catch(() => null),
        api.getNotifications().catch(() => ({ notifications: [], unreadCount: 0 })),
      ]);

      if (dashRes) {
        setStats(dashRes.stats);
        setRecentCheckIns(dashRes.recentCheckIns || []);
        setExpiringSoonList(dashRes.expiringSoon || []);
        setExpiredList(dashRes.expired || []);
      }

      if (custRes?.customers) {
        setCustomers(custRes.customers);
      }

      if (coachRes?.coaches) {
        setCoaches(coachRes.coaches);
      }

      if (settRes?.settings) {
        setSettings(settRes.settings);
      }

      if (notifRes) {
        setUnreadNotificationsCount(notifRes.unreadCount || 0);
      }
    } catch (err) {
      console.error('Data refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadData();
      // Periodic background sync
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser, loadData]);

  const handleLogin = (user: User) => {
    localStorage.setItem('pumpclub_user', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('pumpclub_user');
    setCurrentUser(null);
  };

  const handleDeleteCustomer = async (cust: Customer) => {
    if (window.confirm(`هل أنت متأكد من حذف العميل "${cust.full_name}"؟ سيتم حذف سجلاته واشتراكاته بشكل دائم.`)) {
      try {
        await api.deleteCustomer(cust.id);
        if (profileCustomerId === cust.id) {
          setProfileCustomerId(null);
        }
        loadData();
      } catch (err: any) {
        alert(err.message || 'فشل حذف العميل');
      }
    }
  };

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased" dir="rtl">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        unreadAlertsCount={unreadNotificationsCount}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Sticky Header */}
        <Header
          onOpenAddCustomer={() => setShowAddCustomerModal(true)}
          onNavigateToCheckIn={() => setActiveTab('check-in')}
          onSelectCustomer={(id) => setProfileCustomerId(id)}
          unreadCount={unreadNotificationsCount}
          onRefreshData={loadData}
        />

        {/* Dynamic Views */}
        <main className="flex-1 overflow-y-auto pb-12">
          {activeTab === 'dashboard' && stats && (
            <DashboardView
              stats={stats}
              recentCheckIns={recentCheckIns}
              expiringSoonList={expiringSoonList}
              expiredList={expiredList}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onSelectCustomer={(id) => setProfileCustomerId(id)}
              onOpenAddCustomer={() => setShowAddCustomerModal(true)}
              onOpenRenew={(c) => setRenewingCustomer(c)}
              onOpenWhatsApp={(c) => setWhatsAppCustomer(c)}
              onRefresh={loadData}
              loading={loading}
            />
          )}

          {(activeTab === 'customers' || activeTab === 'subscriptions') && (
            <CustomersView
              customers={customers}
              coaches={coaches}
              loading={loading}
              onRefresh={loadData}
              onOpenAdd={() => setShowAddCustomerModal(true)}
              onOpenEdit={(c) => setEditingCustomer(c)}
              onOpenProfile={(id) => setProfileCustomerId(id)}
              onOpenRenew={(c) => setRenewingCustomer(c)}
              onOpenFreeze={(c) => setFreezingCustomer(c)}
              onOpenPrintCard={(c) => setPrintingCustomer(c)}
              onOpenWhatsApp={(c) => setWhatsAppCustomer(c)}
              onDeleteCustomer={handleDeleteCustomer}
            />
          )}

          {activeTab === 'check-in' && (
            <CheckInView
              onOpenRenew={(c) => setRenewingCustomer(c)}
              onOpenWhatsApp={(c) => setWhatsAppCustomer(c)}
              onSelectCustomer={(id) => setProfileCustomerId(id)}
            />
          )}

          {activeTab === 'coaches' && (
            <CoachesView
              coaches={coaches}
              loading={loading}
              onRefresh={loadData}
              onSelectCustomer={(id) => setProfileCustomerId(id)}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              customers={customers}
              coaches={coaches}
              stats={stats}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onRefreshSettings={loadData}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      {/* 1. Add Customer */}
      {showAddCustomerModal && (
        <CustomerFormModal
          coaches={coaches}
          onClose={() => setShowAddCustomerModal(false)}
          onSuccess={() => {
            setShowAddCustomerModal(false);
            loadData();
          }}
        />
      )}

      {/* 2. Edit Customer */}
      {editingCustomer && (
        <CustomerFormModal
          customer={editingCustomer}
          coaches={coaches}
          onClose={() => setEditingCustomer(null)}
          onSuccess={() => {
            setEditingCustomer(null);
            loadData();
          }}
        />
      )}

      {/* 3. Customer Profile */}
      {profileCustomerId && (
        <CustomerProfileModal
          customerId={profileCustomerId}
          onClose={() => setProfileCustomerId(null)}
          onOpenEdit={(c) => {
            setProfileCustomerId(null);
            setEditingCustomer(c);
          }}
          onOpenRenew={(c) => {
            setProfileCustomerId(null);
            setRenewingCustomer(c);
          }}
          onOpenFreeze={(c) => {
            setProfileCustomerId(null);
            setFreezingCustomer(c);
          }}
          onOpenPrintCard={(c) => setPrintingCustomer(c)}
          onOpenWhatsApp={(c) => setWhatsAppCustomer(c)}
          onDelete={(c) => handleDeleteCustomer(c)}
        />
      )}

      {/* 4. Freeze Modal */}
      {freezingCustomer && (
        <FreezeModal
          customer={freezingCustomer}
          onClose={() => setFreezingCustomer(null)}
          onSuccess={() => {
            setFreezingCustomer(null);
            loadData();
          }}
        />
      )}

      {/* 5. Renew Modal */}
      {renewingCustomer && (
        <RenewModal
          customer={renewingCustomer}
          onClose={() => setRenewingCustomer(null)}
          onSuccess={() => {
            setRenewingCustomer(null);
            loadData();
          }}
        />
      )}

      {/* 6. Membership Card Modal */}
      {printingCustomer && (
        <MembershipCardModal
          customer={printingCustomer}
          onClose={() => setPrintingCustomer(null)}
        />
      )}

      {/* 7. WhatsApp Modal */}
      {whatsAppCustomer && (
        <WhatsAppModal
          customer={whatsAppCustomer}
          settings={settings || undefined}
          onClose={() => setWhatsAppCustomer(null)}
        />
      )}
    </div>
  );
}
