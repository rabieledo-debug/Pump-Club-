import {
  Customer,
  Coach,
  DashboardStats,
  GymSettings,
  NotificationItem,
  SystemInfo,
  CheckInRecord,
  SubscriptionHistoryItem,
  FreezeRecord,
} from '../types';
import { offlineStore, initOfflineStore } from './offlineStore';

export const api = {
  // Auth
  login: async (credentials: { username: string; password: string }) => {
    initOfflineStore();
    return offlineStore.login(credentials);
  },

  changePassword: async (data: { username: string; currentPassword: string; newPassword: string }) =>
    offlineStore.changePassword(data),

  // Dashboard
  getStats: () => offlineStore.getDashboardStats(),
  getDashboardStats: () => offlineStore.getDashboardStats(),

  // Customers
  getCustomers: (params?: { search?: string; status?: string; coach_id?: string | number; is_private?: string | number }) =>
    offlineStore.getCustomers(params),

  getCustomer: (id: number) => offlineStore.getCustomer(id),

  createCustomer: (formData: FormData) => offlineStore.createCustomer(formData),

  updateCustomer: (id: number, formData: FormData) => offlineStore.updateCustomer(id, formData),

  deleteCustomer: (id: number) => offlineStore.deleteCustomer(id),

  renewCustomer: (id: number, data: { plan_type: string; duration_months: number; price_paid: number; notes?: string }) =>
    offlineStore.renewCustomer(id, data),

  freezeCustomer: (id: number, data: { start_date: string; end_date?: string; days_count?: number; reason?: string }) =>
    offlineStore.freezeCustomer(id, data),

  // Check-in
  scanCheckIn: (barcode: string) => offlineStore.scanCheckIn(barcode),

  getCheckInHistory: (params?: { search?: string; date?: string; limit?: number }) =>
    offlineStore.getCheckInHistory(params),

  // Coaches
  getCoaches: () => offlineStore.getCoaches(),

  getCoach: (id: number) => offlineStore.getCoach(id),

  createCoach: (formData: FormData) => offlineStore.createCoach(formData),

  updateCoach: (id: number, formData: FormData) => offlineStore.updateCoach(id, formData),

  deleteCoach: (id: number) => offlineStore.deleteCoach(id),

  // Reports
  getReports: () => offlineStore.getReports(),

  // Notifications
  getNotifications: () => offlineStore.getNotifications(),

  markNotificationsRead: (id?: number) => offlineStore.markNotificationsRead(id),

  clearNotifications: () => offlineStore.clearNotifications(),

  // Settings
  getSettings: () => offlineStore.getSettings(),

  saveSettings: (settings: Partial<GymSettings>) => offlineStore.updateSettings(settings),

  updateSettings: (settings: Partial<GymSettings>) => offlineStore.updateSettings(settings),

  // Backup & System
  getBackupUrl: () => {
    // Generate data URI or direct JSON export for instant local download
    const backupJson = offlineStore.exportDatabaseBackup();
    return 'data:application/json;charset=utf-8,' + encodeURIComponent(backupJson);
  },

  exportBackup: () => offlineStore.exportDatabaseBackup(),

  getSystemInfo: () => offlineStore.getSystemInfo(),

  restoreBackup: async (formData: FormData) => {
    const file = formData.get('backup') as File;
    if (!file) throw new Error('يرجى اختيار ملف النسخة الاحتياطية');
    const text = await file.text();
    return offlineStore.restoreDatabaseBackup(text);
  },
};
