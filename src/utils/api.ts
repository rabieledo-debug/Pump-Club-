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

const API_BASE = '/api';

export async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    console.error(`Non-JSON response from ${endpoint}:`, text.substring(0, 200));
    if (!res.ok) {
      throw new Error(`خطأ في الخادم (${res.status}): ${res.statusText}`);
    }
    throw new Error('استجابة غير صالحة من الخادم (تأكد من تشغيل خادم الـ API)');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'حدث خطأ أثناء الاتصال بالخادم');
  }
  return data;
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    request<{ user: any; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  changePassword: (data: { username: string; currentPassword: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Dashboard
  getStats: () =>
    request<{
      stats: DashboardStats;
      recentCheckIns: any[];
      expiringSoon: Customer[];
      expiringSoonList?: Customer[];
      expired: Customer[];
      expiredList?: Customer[];
    }>('/dashboard/stats'),

  getDashboardStats: () =>
    request<{
      stats: DashboardStats;
      recentCheckIns: any[];
      expiringSoon: Customer[];
      expired: Customer[];
    }>('/dashboard/stats'),

  // Customers
  getCustomers: (params?: { search?: string; status?: string; coach_id?: string | number; is_private?: string | number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.coach_id) query.append('coach_id', String(params.coach_id));
    if (params?.is_private !== undefined) query.append('is_private', String(params.is_private));
    return request<{ customers: Customer[]; total: number }>(`/customers?${query.toString()}`);
  },

  getCustomer: (id: number) =>
    request<{
      customer: Customer;
      history: SubscriptionHistoryItem[];
      freezes: FreezeRecord[];
      checkIns: CheckInRecord[];
      stats: { total_check_ins: number; last_check_in: string | null };
    }>(`/customers/${id}`),

  createCustomer: (formData: FormData) =>
    request<{ customer: Customer; message: string }>('/customers', {
      method: 'POST',
      body: formData,
    }),

  updateCustomer: (id: number, formData: FormData) =>
    request<{ customer: Customer; message: string }>(`/customers/${id}`, {
      method: 'PUT',
      body: formData,
    }),

  deleteCustomer: (id: number) =>
    request<{ success: boolean; message: string }>(`/customers/${id}`, {
      method: 'DELETE',
    }),

  renewCustomer: (id: number, data: { plan_type: string; duration_months: number; price_paid: number; notes?: string }) =>
    request<{ customer: Customer; message: string }>(`/customers/${id}/renew`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  freezeCustomer: (id: number, data: { start_date: string; end_date?: string; days_count?: number; reason?: string }) =>
    request<{ customer: Customer; new_end_date: string; message: string }>(`/customers/${id}/freeze`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Check-in
  scanCheckIn: (barcode: string) =>
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

  getCheckInHistory: (params?: { search?: string; date?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.date) query.append('date', params.date);
    if (params?.limit) query.append('limit', String(params.limit));
    return request<{ history: CheckInRecord[] }>(`/check-in/history?${query.toString()}`);
  },

  // Coaches
  getCoaches: () => request<{ coaches: Coach[] }>('/coaches'),
  getCoach: (id: number) => request<{ coach: Coach; customers: Customer[] }>(`/coaches/${id}`),
  createCoach: (formData: FormData) =>
    request<{ coach: Coach; message: string }>('/coaches', {
      method: 'POST',
      body: formData,
    }),
  updateCoach: (id: number, formData: FormData) =>
    request<{ coach: Coach; message: string }>(`/coaches/${id}`, {
      method: 'PUT',
      body: formData,
    }),
  deleteCoach: (id: number) => request<{ success: boolean; message: string }>(`/coaches/${id}`, { method: 'DELETE' }),

  // Reports
  getReports: () =>
    request<{
      summary: any;
      plansDistribution: { name: string; value: number }[];
      dailyTrend: { date: string; label: string; checkIns: number }[];
    }>('/reports'),

  // Notifications
  getNotifications: () =>
    request<{ notifications: NotificationItem[]; unreadCount?: number; unread_count?: number }>('/notifications'),
  markNotificationsRead: (id?: number) =>
    request<{ success: boolean }>('/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),
  clearNotifications: () => request<{ success: boolean }>('/notifications/clear-all', { method: 'POST' }),

  // Settings
  getSettings: () => request<{ settings: GymSettings }>('/settings'),
  saveSettings: (settings: GymSettings | Record<string, any>) =>
    request<{ success: boolean; message: string }>('/settings', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    }),
  updateSettings: (settings: Partial<GymSettings>) =>
    request<{ success: boolean; message: string }>('/settings', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    }),

  // Backup & System
  getBackupUrl: () => `${API_BASE}/backup/download`,
  getSystemInfo: () => request<SystemInfo>('/system/info'),
  restoreBackup: (formData: FormData) =>
    request<{ success: boolean; message: string }>('/backup/restore', {
      method: 'POST',
      body: formData,
    }),
};
