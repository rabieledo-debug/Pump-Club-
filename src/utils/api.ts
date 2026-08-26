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

const API_BASE = '/api';

export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (cleanEndpoint.startsWith('/api/')) {
    return cleanEndpoint;
  }
  return `${API_BASE}${cleanEndpoint}`;
}

export async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = getApiUrl(endpoint);
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options?.headers,
      },
    });
  } catch (netErr: any) {
    const errorMsg = 'تعذر الاتصال بالخادم (الوضع غير المتصل)';
    const err = new Error(errorMsg);
    (err as any).isOffline = true;
    throw err;
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || `خطأ (${res.status}): ${res.statusText}`);
      (err as any).status = res.status;
      throw err;
    }
    return data;
  }

  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`خطأ في الخادم (${res.status}): ${res.statusText}`);
    (err as any).status = res.status;
    (err as any).is404 = res.status === 404;
    throw err;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const err = new Error('استجابة غير صالحة من الخادم');
    (err as any).isOffline = true;
    throw err;
  }
}

// Wrapper to try online request and seamlessly fallback to offlineStore on 404 or connection failure
async function withOfflineFallback<T>(onlineFn: () => Promise<T>, offlineFn: () => Promise<T>): Promise<T> {
  try {
    return await onlineFn();
  } catch (err: any) {
    // If it's a 401 / 400 validation error with an explicit error message (not 404 / network fail), bubble it
    if (err.status === 401 || err.status === 400 || err.status === 403) {
      throw err;
    }
    // If it's a 404, network failure, or offline mode, fallback to offlineStore
    return await offlineFn();
  }
}

export const api = {
  // Auth
  login: async (credentials: { username: string; password: string }) => {
    initOfflineStore();
    return withOfflineFallback(
      () =>
        request<{ user: any; message: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials),
        }),
      () => offlineStore.login(credentials)
    );
  },

  changePassword: async (data: { username: string; currentPassword: string; newPassword: string }) =>
    withOfflineFallback(
      () =>
        request<{ success: boolean; message: string }>('/auth/change-password', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => offlineStore.changePassword(data)
    ),

  // Dashboard
  getStats: () =>
    withOfflineFallback(
      () =>
        request<{
          stats: DashboardStats;
          recentCheckIns: any[];
          expiringSoon: Customer[];
          expiringSoonList?: Customer[];
          expired: Customer[];
          expiredList?: Customer[];
        }>('/dashboard/stats'),
      () => offlineStore.getDashboardStats()
    ),

  getDashboardStats: () =>
    withOfflineFallback(
      () =>
        request<{
          stats: DashboardStats;
          recentCheckIns: any[];
          expiringSoon: Customer[];
          expired: Customer[];
        }>('/dashboard/stats'),
      () => offlineStore.getDashboardStats()
    ),

  // Customers
  getCustomers: (params?: { search?: string; status?: string; coach_id?: string | number; is_private?: string | number }) =>
    withOfflineFallback(
      () => {
        const query = new URLSearchParams();
        if (params?.search) query.append('search', params.search);
        if (params?.status) query.append('status', params.status);
        if (params?.coach_id) query.append('coach_id', String(params.coach_id));
        if (params?.is_private !== undefined) query.append('is_private', String(params.is_private));
        return request<{ customers: Customer[]; total: number }>(`/customers?${query.toString()}`);
      },
      () => offlineStore.getCustomers(params)
    ),

  getCustomer: (id: number) =>
    withOfflineFallback(
      () =>
        request<{
          customer: Customer;
          history: SubscriptionHistoryItem[];
          freezes: FreezeRecord[];
          checkIns: CheckInRecord[];
          stats: { total_check_ins: number; last_check_in: string | null };
        }>(`/customers/${id}`),
      () => offlineStore.getCustomer(id)
    ),

  createCustomer: (formData: FormData) =>
    withOfflineFallback(
      () =>
        request<{ customer: Customer; message: string }>('/customers', {
          method: 'POST',
          body: formData,
        }),
      () => offlineStore.createCustomer(formData)
    ),

  updateCustomer: (id: number, formData: FormData) =>
    withOfflineFallback(
      () =>
        request<{ customer: Customer; message: string }>(`/customers/${id}`, {
          method: 'PUT',
          body: formData,
        }),
      () => offlineStore.updateCustomer(id, formData)
    ),

  deleteCustomer: (id: number) =>
    withOfflineFallback(
      () =>
        request<{ success: boolean; message: string }>(`/customers/${id}`, {
          method: 'DELETE',
        }),
      () => offlineStore.deleteCustomer(id)
    ),

  renewCustomer: (id: number, data: { plan_type: string; duration_months: number; price_paid: number; notes?: string }) =>
    withOfflineFallback(
      () =>
        request<{ customer: Customer; message: string }>(`/customers/${id}/renew`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => offlineStore.renewCustomer(id, data)
    ),

  freezeCustomer: (id: number, data: { start_date: string; end_date?: string; days_count?: number; reason?: string }) =>
    withOfflineFallback(
      () =>
        request<{ customer: Customer; new_end_date: string; message: string }>(`/customers/${id}/freeze`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      () => offlineStore.freezeCustomer(id, data)
    ),

  // Check-in
  scanCheckIn: (barcode: string) =>
    withOfflineFallback(
      () =>
        request<{
          granted: boolean;
          status: string;
          message: string;
          customer: Customer;
          check_in_time: string;
        }>('/check-in/scan', {
          method: 'POST',
          body: JSON.stringify({ barcode }),
        }),
      () => offlineStore.scanCheckIn(barcode)
    ),

  getCheckInHistory: (params?: { search?: string; date?: string; limit?: number }) =>
    withOfflineFallback(
      () => {
        const query = new URLSearchParams();
        if (params?.search) query.append('search', params.search);
        if (params?.date) query.append('date', params.date);
        if (params?.limit) query.append('limit', String(params.limit));
        return request<{ history: CheckInRecord[] }>(`/check-in/history?${query.toString()}`);
      },
      () => offlineStore.getCheckInHistory(params)
    ),

  // Coaches
  getCoaches: () =>
    withOfflineFallback(
      () => request<{ coaches: Coach[] }>('/coaches'),
      () => offlineStore.getCoaches()
    ),

  getCoach: (id: number) =>
    withOfflineFallback(
      () => request<{ coach: Coach; customers: Customer[] }>(`/coaches/${id}`),
      () => offlineStore.getCoach(id)
    ),

  createCoach: (formData: FormData) =>
    withOfflineFallback(
      () =>
        request<{ coach: Coach; message: string }>('/coaches', {
          method: 'POST',
          body: formData,
        }),
      () => offlineStore.createCoach(formData)
    ),

  updateCoach: (id: number, formData: FormData) =>
    withOfflineFallback(
      () =>
        request<{ coach: Coach; message: string }>(`/coaches/${id}`, {
          method: 'PUT',
          body: formData,
        }),
      () => offlineStore.updateCoach(id, formData)
    ),

  deleteCoach: (id: number) =>
    withOfflineFallback(
      () => request<{ success: boolean; message: string }>(`/coaches/${id}`, { method: 'DELETE' }),
      () => offlineStore.deleteCoach(id)
    ),

  // Reports
  getReports: () =>
    withOfflineFallback(
      () =>
        request<{
          summary: any;
          plansDistribution: { name: string; value: number }[];
          dailyTrend: { date: string; label: string; checkIns: number }[];
        }>('/reports'),
      () => offlineStore.getReports()
    ),

  // Notifications
  getNotifications: () =>
    withOfflineFallback(
      () => request<{ notifications: NotificationItem[]; unreadCount?: number; unread_count?: number }>('/notifications'),
      () => offlineStore.getNotifications()
    ),

  markNotificationsRead: (id?: number) =>
    withOfflineFallback(
      () =>
        request<{ success: boolean }>('/notifications/mark-read', {
          method: 'POST',
          body: JSON.stringify({ id }),
        }),
      () => offlineStore.markNotificationsRead()
    ),

  clearNotifications: () =>
    withOfflineFallback(
      () => request<{ success: boolean }>('/notifications/clear-all', { method: 'POST' }),
      () => offlineStore.clearNotifications()
    ),

  // Settings
  getSettings: () =>
    withOfflineFallback(
      () => request<{ settings: GymSettings }>('/settings'),
      () => offlineStore.getSettings()
    ),

  saveSettings: (settings: GymSettings | Record<string, any>) =>
    withOfflineFallback(
      () =>
        request<{ success: boolean; message: string }>('/settings', {
          method: 'POST',
          body: JSON.stringify({ settings }),
        }),
      () => offlineStore.updateSettings(settings as Partial<GymSettings>)
    ),

  updateSettings: (settings: Partial<GymSettings>) =>
    withOfflineFallback(
      () =>
        request<{ success: boolean; message: string }>('/settings', {
          method: 'POST',
          body: JSON.stringify({ settings }),
        }),
      () => offlineStore.updateSettings(settings)
    ),

  // Backup & System
  getBackupUrl: () => `${API_BASE}/backup/download`,
  getSystemInfo: () =>
    withOfflineFallback(
      () => request<SystemInfo>('/system/info'),
      () => offlineStore.getSystemInfo()
    ),
  restoreBackup: (formData: FormData) =>
    withOfflineFallback(
      () =>
        request<{ success: boolean; message: string }>('/backup/restore', {
          method: 'POST',
          body: formData,
        }),
      async () => {
        const file = formData.get('backup') as File;
        if (!file) throw new Error('يرجى اختيار ملف النسخة الاحتياطية');
        const text = await file.text();
        return offlineStore.restoreDatabaseBackup(text);
      }
    ),
};
