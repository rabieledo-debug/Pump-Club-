export interface User {
  id: number;
  username: string;
  role: string;
  full_name: string;
}

export type CustomerStatus = 'active' | 'expired' | 'expiring_soon' | 'frozen';

export interface Customer {
  id: number;
  membership_id: string;
  full_name: string;
  phone: string;
  national_id?: string | null;
  image_path?: string | null;
  barcode: string;
  plan_type: string;
  duration_months: number;
  start_date: string;
  end_date: string;
  original_end_date: string;
  is_private: number | boolean;
  coach_id?: number | null;
  coach_name?: string | null;
  coach_phone?: string | null;
  price_paid: number;
  notes?: string | null;
  status: CustomerStatus;
  days_remaining?: number;
  total_check_ins?: number;
  last_check_in?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Coach {
  id: number;
  name: string;
  phone?: string | null;
  image_path?: string | null;
  specialty?: string | null;
  notes?: string | null;
  active: number;
  total_customers?: number;
  private_customers?: number;
  created_at: string;
}

export interface SubscriptionHistoryItem {
  id: number;
  customer_id: number;
  action_type: 'start' | 'renew' | 'freeze' | 'unfreeze' | 'edit';
  plan_type?: string;
  duration_months?: number;
  start_date?: string;
  end_date?: string;
  amount: number;
  notes?: string;
  created_at: string;
}

export interface FreezeRecord {
  id: number;
  customer_id: number;
  start_date: string;
  end_date: string;
  days_count: number;
  reason?: string;
  is_active: number;
  created_at: string;
}

export interface CheckInRecord {
  id: number;
  customer_id: number;
  full_name?: string;
  phone?: string;
  membership_id?: string;
  image_path?: string;
  plan_type?: string;
  coach_name?: string;
  check_in_time: string;
  barcode: string;
  status: 'granted' | 'expired' | 'frozen' | 'denied';
  notes?: string;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  type: 'expired' | 'expiring_soon' | 'frozen' | 'system';
  title: string;
  message: string;
  customer_id?: number;
  is_read: number;
  created_at: string;
}

export interface DashboardStats {
  total_customers: number;
  active_customers: number;
  expired_customers: number;
  expiring_soon_customers: number;
  frozen_customers: number;
  private_customers: number;
  today_checkins: number;
  active_coaches: number;
}

export interface SystemInfo {
  db_path: string;
  db_size_kb: number;
  customers_count: number;
  check_ins_count: number;
  coaches_count: number;
  offline_ready: boolean;
  storage_type: string;
}

export interface GymSettings {
  gym_name?: string;
  gym_tagline?: string;
  gym_phone?: string;
  gym_address?: string;
  currency?: string;
  expiring_soon_days?: string;
  whatsapp_expired_msg?: string;
  whatsapp_expiring_soon_msg?: string;
  whatsapp_welcome_msg?: string;
  whatsapp_freeze_msg?: string;
  [key: string]: string | undefined;
}
