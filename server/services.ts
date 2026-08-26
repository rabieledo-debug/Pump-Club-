import { DatabaseDriver, getDb } from './db.js';

export interface Customer {
  id: number;
  membership_id: string;
  full_name: string;
  phone: string;
  national_id?: string;
  image_path?: string;
  barcode: string;
  plan_type: string;
  duration_months: number;
  start_date: string;
  end_date: string;
  original_end_date: string;
  is_private: number;
  coach_id?: number | null;
  coach_name?: string;
  price_paid: number;
  notes?: string;
  status: 'active' | 'expired' | 'expiring_soon' | 'frozen';
  created_at: string;
  updated_at: string;
  days_remaining?: number;
  total_check_ins?: number;
  last_check_in?: string;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateDaysDiff(fromStr: string, toStr: string): number {
  const from = new Date(fromStr);
  const to = new Date(toStr);
  const diffTime = to.getTime() - from.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Compute live status of a customer
export function computeCustomerStatus(
  customer: {
    start_date: string;
    end_date: string;
    id: number;
  },
  db: DatabaseDriver,
  expiringThresholdDays: number = 7
): { status: 'active' | 'expired' | 'expiring_soon' | 'frozen'; daysRemaining: number } {
  const today = getTodayDateString();

  // Check if currently frozen
  const activeFreeze = db
    .prepare(
      `SELECT * FROM freezes 
       WHERE customer_id = ? AND is_active = 1 AND start_date <= ? AND end_date >= ?
       ORDER BY id DESC LIMIT 1`
    )
    .get(customer.id, today, today);

  const daysRemaining = calculateDaysDiff(today, customer.end_date);

  if (activeFreeze) {
    return { status: 'frozen', daysRemaining };
  }

  if (daysRemaining < 0) {
    return { status: 'expired', daysRemaining };
  }

  if (daysRemaining <= expiringThresholdDays) {
    return { status: 'expiring_soon', daysRemaining };
  }

  return { status: 'active', daysRemaining };
}

// Generate unique sequential Membership ID and Barcode
export function generateMembershipIdAndBarcode(db: DatabaseDriver): { membershipId: string; barcode: string } {
  const maxRow = db.prepare('SELECT MAX(id) as max_id FROM customers').get() as { max_id?: number };
  const nextId = (maxRow?.max_id || 0) + 1;
  const currentYear = new Date().getFullYear();
  const paddedNumber = String(nextId).padStart(4, '0');
  
  const membershipId = `PC-${currentYear}-${paddedNumber}`;
  // 12-digit standard code or formatted membership barcode
  const barcode = `88${currentYear}${paddedNumber}9`;

  return { membershipId, barcode };
}

// Refresh notifications in DB
export function refreshNotifications(db: DatabaseDriver) {
  try {
    const today = getTodayDateString();
    const customers = db.prepare('SELECT id, full_name, end_date, phone FROM customers').all() as any[];
    
    // Clear old unread notifications for fresh sync
    // db.prepare("DELETE FROM notifications WHERE is_read = 0").run();

    for (const cust of customers) {
      const daysRemaining = calculateDaysDiff(today, cust.end_date);
      if (daysRemaining < 0) {
        // Expired
        const exists = db
          .prepare(
            `SELECT id FROM notifications WHERE customer_id = ? AND type = 'expired' AND is_read = 0`
          )
          .get(cust.id);
        if (!exists) {
          db.prepare(
            `INSERT INTO notifications (type, title, message, customer_id, is_read, created_at)
             VALUES ('expired', ?, ?, ?, 0, ?)`
          ).run(
            'اشتراك منتهي',
            `انتهى اشتراك العميل ${cust.full_name} (${cust.phone}) في تاريخ ${cust.end_date}.`,
            cust.id,
            new Date().toISOString()
          );
        }
      } else if (daysRemaining <= 7) {
        // Expiring soon
        const exists = db
          .prepare(
            `SELECT id FROM notifications WHERE customer_id = ? AND type = 'expiring_soon' AND is_read = 0`
          )
          .get(cust.id);
        if (!exists) {
          const daysText = daysRemaining === 0 ? 'اليوم' : `خلال ${daysRemaining} يوم`;
          db.prepare(
            `INSERT INTO notifications (type, title, message, customer_id, is_read, created_at)
             VALUES ('expiring_soon', ?, ?, ?, 0, ?)`
          ).run(
            'اشتراك ينتهي قريباً',
            `اشتراك العميل ${cust.full_name} سينتهي ${daysText} (تاريخ ${cust.end_date}).`,
            cust.id,
            new Date().toISOString()
          );
        }
      }
    }
  } catch (err) {
    console.error('Error refreshing notifications:', err);
  }
}
