import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import AdmZip from 'adm-zip';
import {
  initDatabase,
  getDb,
  hashPassword,
  verifyPassword,
  CUSTOMER_IMAGES_DIR,
  COACH_IMAGES_DIR,
  BACKUPS_DIR,
  DATA_DIR,
  DB_PATH,
} from './db.js';
import {
  computeCustomerStatus,
  generateMembershipIdAndBarcode,
  getTodayDateString,
  addMonths,
  addDays,
  calculateDaysDiff,
  refreshNotifications,
} from './services.js';

export const router = express.Router();

// Multer storage for customer images
const customerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, CUSTOMER_IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = `cust_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`;
    cb(null, uniqueName);
  },
});
const uploadCustomerImg = multer({ storage: customerStorage });

// Multer storage for coach images
const coachStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, COACH_IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = `coach_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`;
    cb(null, uniqueName);
  },
});
const uploadCoachImg = multer({ storage: coachStorage });

// Multer storage for backup restore
const backupStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, BACKUPS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `restore_${Date.now()}.zip`);
  },
});
const uploadBackup = multer({ storage: backupStorage });

// ================= AUTH ROUTES =================

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(username.trim()) as any;
    if (!user) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const isValid = verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
      },
      message: 'تم تسجيل الدخول بنجاح',
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'حدث خطأ في تسجيل الدخول' });
  }
});

router.post('/auth/change-password', async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    if (!username || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن لا تقل عن 4 أحرف' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(username.trim()) as any;
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    const isValid = verifyPassword(currentPassword, user.password_hash, user.salt);
    if (!isValid) {
      return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    }

    const { hash, salt } = hashPassword(newPassword);
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?').run(
      hash,
      salt,
      now,
      user.id
    );

    return res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'حدث خطأ أثناء تغيير كلمة المرور' });
  }
});

// ================= CUSTOMERS =================

router.get('/customers', (req, res) => {
  try {
    const db = getDb();
    const { search, status, coach_id, is_private } = req.query;
    const today = getTodayDateString();

    let query = `
      SELECT c.*, co.name as coach_name,
        (SELECT COUNT(*) FROM check_ins WHERE customer_id = c.id) as total_check_ins,
        (SELECT MAX(check_in_time) FROM check_ins WHERE customer_id = c.id) as last_check_in
      FROM customers c
      LEFT JOIN coaches co ON c.coach_id = co.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (c.full_name LIKE ? OR c.phone LIKE ? OR c.membership_id LIKE ? OR c.barcode LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    if (coach_id) {
      query += ` AND c.coach_id = ?`;
      params.push(coach_id);
    }

    if (is_private !== undefined && is_private !== '') {
      query += ` AND c.is_private = ?`;
      params.push(Number(is_private));
    }

    query += ` ORDER BY c.id DESC`;

    const rawCustomers = db.prepare(query).all(...params) as any[];

    // Calculate dynamic live status for each customer
    const customers = rawCustomers.map((cust) => {
      const computed = computeCustomerStatus(cust, db);
      return {
        ...cust,
        status: computed.status,
        days_remaining: computed.daysRemaining,
      };
    });

    // Filter by computed status if requested
    const filtered = status && status !== 'all'
      ? customers.filter((c) => c.status === status)
      : customers;

    return res.json({ customers: filtered, total: filtered.length });
  } catch (err: any) {
    console.error('Error fetching customers:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/customers/:id', (req, res) => {
  try {
    const db = getDb();
    const cust = db
      .prepare(
        `SELECT c.*, co.name as coach_name, co.phone as coach_phone
         FROM customers c
         LEFT JOIN coaches co ON c.coach_id = co.id
         WHERE c.id = ?`
      )
      .get(req.params.id) as any;

    if (!cust) {
      return res.status(404).json({ error: 'العميل غير موجود' });
    }

    const computed = computeCustomerStatus(cust, db);
    cust.status = computed.status;
    cust.days_remaining = computed.daysRemaining;

    // Fetch history
    const history = db
      .prepare('SELECT * FROM subscription_history WHERE customer_id = ? ORDER BY id DESC')
      .all(cust.id);

    // Fetch freezes
    const freezes = db
      .prepare('SELECT * FROM freezes WHERE customer_id = ? ORDER BY id DESC')
      .all(cust.id);

    // Fetch check-ins
    const checkIns = db
      .prepare('SELECT * FROM check_ins WHERE customer_id = ? ORDER BY id DESC LIMIT 50')
      .all(cust.id);

    // Stats
    const stats = {
      total_check_ins: checkIns.length,
      last_check_in: checkIns[0]?.check_in_time || null,
    };

    return res.json({
      customer: cust,
      history,
      freezes,
      checkIns,
      stats,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/customers', uploadCustomerImg.single('image'), (req, res) => {
  try {
    const db = getDb();
    const {
      full_name,
      phone,
      national_id,
      plan_type,
      duration_months,
      start_date,
      is_private,
      coach_id,
      price_paid,
      notes,
    } = req.body;

    if (!full_name || !phone || !plan_type) {
      return res.status(400).json({ error: 'الاسم ورقم الهاتف ونوع الاشتراك حقول مطلوبة' });
    }

    // Check duplicate phone
    const existingPhone = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);
    if (existingPhone) {
      return res.status(400).json({ error: 'رقم الهاتف مسجل مسبقاً لعميل آخر' });
    }

    const months = parseInt(duration_months) || 1;
    const startDateStr = start_date || getTodayDateString();
    const endDateStr = addMonths(startDateStr, months);

    const { membershipId, barcode } = generateMembershipIdAndBarcode(db);
    const imagePath = req.file ? `/uploads/customer-images/${req.file.filename}` : null;
    const now = new Date().toISOString();

    const insertResult = db.prepare(`
      INSERT INTO customers (
        membership_id, full_name, phone, national_id, image_path, barcode,
        plan_type, duration_months, start_date, end_date, original_end_date,
        is_private, coach_id, price_paid, notes, status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, 'active', ?, ?
      )
    `).run(
      membershipId,
      full_name,
      phone,
      national_id || null,
      imagePath,
      barcode,
      plan_type,
      months,
      startDateStr,
      endDateStr,
      endDateStr,
      is_private === 'true' || is_private === 1 || is_private === '1' ? 1 : 0,
      coach_id ? Number(coach_id) : null,
      price_paid ? parseFloat(price_paid) : 0,
      notes || null,
      now,
      now
    );

    const newCustomerId = Number(insertResult.lastInsertRowid);

    // Record subscription history
    db.prepare(`
      INSERT INTO subscription_history (
        customer_id, action_type, plan_type, duration_months, start_date, end_date, amount, notes, created_at
      ) VALUES (?, 'start', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newCustomerId,
      plan_type,
      months,
      startDateStr,
      endDateStr,
      price_paid ? parseFloat(price_paid) : 0,
      'اشتراك جديد',
      now
    );

    refreshNotifications(db);

    const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(newCustomerId);
    return res.status(201).json({ customer: newCustomer, message: 'تمت إضافة العميل بنجاح' });
  } catch (err: any) {
    console.error('Error creating customer:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.put('/customers/:id', uploadCustomerImg.single('image'), (req, res) => {
  try {
    const db = getDb();
    const customerId = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'العميل غير موجود' });
    }

    const {
      full_name,
      phone,
      national_id,
      is_private,
      coach_id,
      notes,
    } = req.body;

    // Check duplicate phone for other customer
    if (phone && phone !== existing.phone) {
      const dup = db.prepare('SELECT id FROM customers WHERE phone = ? AND id != ?').get(phone, customerId);
      if (dup) {
        return res.status(400).json({ error: 'رقم الهاتف مسجل مسبقاً لعميل آخر' });
      }
    }

    let imagePath = existing.image_path;
    if (req.file) {
      imagePath = `/uploads/customer-images/${req.file.filename}`;
      // Clean old image if local
      if (existing.image_path && existing.image_path.startsWith('/uploads/customer-images/')) {
        const oldFile = path.join(CUSTOMER_IMAGES_DIR, path.basename(existing.image_path));
        if (fs.existsSync(oldFile)) {
          try { fs.unlinkSync(oldFile); } catch (e) {}
        }
      }
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE customers SET
        full_name = ?,
        phone = ?,
        national_id = ?,
        image_path = ?,
        is_private = ?,
        coach_id = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      full_name || existing.full_name,
      phone || existing.phone,
      national_id !== undefined ? national_id : existing.national_id,
      imagePath,
      is_private === 'true' || is_private === 1 || is_private === '1' ? 1 : 0,
      coach_id ? Number(coach_id) : null,
      notes !== undefined ? notes : existing.notes,
      now,
      customerId
    );

    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    return res.json({ customer: updated, message: 'تم تحديث بيانات العميل بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/customers/:id', (req, res) => {
  try {
    const db = getDb();
    const customerId = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'العميل غير موجود' });
    }

    // Delete image file if present
    if (existing.image_path && existing.image_path.startsWith('/uploads/customer-images/')) {
      const imgFile = path.join(CUSTOMER_IMAGES_DIR, path.basename(existing.image_path));
      if (fs.existsSync(imgFile)) {
        try { fs.unlinkSync(imgFile); } catch (e) {}
      }
    }

    // Cascade delete logs
    db.prepare('DELETE FROM check_ins WHERE customer_id = ?').run(customerId);
    db.prepare('DELETE FROM freezes WHERE customer_id = ?').run(customerId);
    db.prepare('DELETE FROM subscription_history WHERE customer_id = ?').run(customerId);
    db.prepare('DELETE FROM notifications WHERE customer_id = ?').run(customerId);
    db.prepare('DELETE FROM customers WHERE id = ?').run(customerId);

    return res.json({ success: true, message: 'تم حذف العميل وجميع سجلاته بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= SUBSCRIPTION ACTIONS: RENEW & FREEZE =================

router.post('/customers/:id/renew', (req, res) => {
  try {
    const db = getDb();
    const customerId = Number(req.params.id);
    const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as any;
    if (!cust) {
      return res.status(404).json({ error: 'العميل غير موجود' });
    }

    const { plan_type, duration_months, price_paid, notes } = req.body;
    const months = parseInt(duration_months) || 1;
    const plan = plan_type || cust.plan_type || 'Monthly';
    const amount = price_paid ? parseFloat(price_paid) : 0;
    const today = getTodayDateString();

    const currentStatus = computeCustomerStatus(cust, db);
    let newStartDate = today;
    let newEndDate = '';

    // If active, extend from current end date. If expired/frozen, start from today
    if (currentStatus.status === 'active' || currentStatus.status === 'expiring_soon') {
      newStartDate = cust.end_date;
      newEndDate = addMonths(cust.end_date, months);
    } else {
      newStartDate = today;
      newEndDate = addMonths(today, months);
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE customers SET
        plan_type = ?,
        duration_months = ?,
        start_date = ?,
        end_date = ?,
        original_end_date = ?,
        price_paid = ?,
        updated_at = ?
      WHERE id = ?
    `).run(plan, months, newStartDate, newEndDate, newEndDate, amount, now, customerId);

    // Record in history
    db.prepare(`
      INSERT INTO subscription_history (
        customer_id, action_type, plan_type, duration_months, start_date, end_date, amount, notes, created_at
      ) VALUES (?, 'renew', ?, ?, ?, ?, ?, ?, ?)
    `).run(customerId, plan, months, newStartDate, newEndDate, amount, notes || 'تجديد الاشتراك', now);

    refreshNotifications(db);

    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    return res.json({ customer: updated, message: 'تم تجديد الاشتراك بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/customers/:id/freeze', (req, res) => {
  try {
    const db = getDb();
    const customerId = Number(req.params.id);
    const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as any;
    if (!cust) {
      return res.status(404).json({ error: 'العميل غير موجود' });
    }

    const { start_date, end_date, days_count, reason } = req.body;
    const startDate = start_date || getTodayDateString();
    let days = parseInt(days_count) || 0;

    if (!days && end_date) {
      days = calculateDaysDiff(startDate, end_date);
    }

    if (days <= 0) {
      return res.status(400).json({ error: 'عدد أيام التجميد يجب أن يكون أكبر من صفر' });
    }

    const calculatedEndDate = end_date || addDays(startDate, days);

    // Extend customer's subscription end date by exact frozen days
    const newCustomerEndDate = addDays(cust.end_date, days);
    const now = new Date().toISOString();

    // Insert freeze record
    db.prepare(`
      INSERT INTO freezes (customer_id, start_date, end_date, days_count, reason, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(customerId, startDate, calculatedEndDate, days, reason || 'تجميد بطلب العميل', now);

    // Update customer end_date
    db.prepare(`
      UPDATE customers SET
        end_date = ?,
        updated_at = ?
      WHERE id = ?
    `).run(newCustomerEndDate, now, customerId);

    // Log history
    db.prepare(`
      INSERT INTO subscription_history (
        customer_id, action_type, plan_type, duration_months, start_date, end_date, amount, notes, created_at
      ) VALUES (?, 'freeze', ?, 0, ?, ?, 0, ?, ?)
    `).run(
      customerId,
      cust.plan_type,
      startDate,
      calculatedEndDate,
      `تجميد لمدة ${days} يوم. تاريخ الانتهاء الجديد: ${newCustomerEndDate}`,
      now
    );

    refreshNotifications(db);

    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    return res.json({
      customer: updated,
      new_end_date: newCustomerEndDate,
      message: `تم تجميد الاشتراك بنجاح لـ ${days} يوم. تاريخ الانتهاء الجديد: ${newCustomerEndDate}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= CHECK-IN ENGINE =================

router.post('/check-in/scan', (req, res) => {
  try {
    const db = getDb();
    const rawInput = (req.body.barcode || req.body.code || req.body.membership_id || '').trim();
    if (!rawInput) {
      return res.status(400).json({ error: 'يرجى مسح رمز الـ QR أو إدخال رقم العضوية' });
    }

    const cleanInput = rawInput;
    // Search by Membership ID (case insensitive), Barcode, or Phone
    const cust = db
      .prepare(`
        SELECT c.*, co.name as coach_name
        FROM customers c
        LEFT JOIN coaches co ON c.coach_id = co.id
        WHERE LOWER(c.membership_id) = LOWER(?) OR c.barcode = ? OR c.phone = ? OR REPLACE(c.phone, ' ', '') = ?
      `)
      .get(cleanInput, cleanInput, cleanInput, cleanInput) as any;

    if (!cust) {
      return res.status(404).json({
        granted: false,
        status: 'not_found',
        message: 'عضو غير مسجل! لم يتم العثور على رقم العضوية أو رمز الـ QR.',
      });
    }

    const computed = computeCustomerStatus(cust, db);
    const now = new Date().toISOString();

    let accessStatus = 'granted';
    let message = 'مرحباً بك! تم السماح بالدخول بنجاح.';
    let isGranted = true;

    if (computed.status === 'expired') {
      accessStatus = 'expired';
      message = 'عفواً! اشتراك العضو منتهي، يرجى التجديد.';
      isGranted = false;
    } else if (computed.status === 'frozen') {
      accessStatus = 'frozen';
      message = 'عفواً! اشتراك العضو مجمد حالياً.';
      isGranted = false;
    } else if (computed.status === 'expiring_soon') {
      accessStatus = 'granted';
      const daysText = computed.daysRemaining === 0 ? 'اليوم' : `خلال ${computed.daysRemaining} يوم`;
      message = `تم السماح بالدخول! تنبيه: الاشتراك سينتهي ${daysText}.`;
      isGranted = true;
    }

    // Record check-in
    db.prepare(`
      INSERT INTO check_ins (customer_id, check_in_time, barcode, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(cust.id, now, cust.barcode, accessStatus, isGranted ? 'دخول ناجح' : 'محاولة دخول مرفوضة', now);

    // Total check ins count
    const totalCount = db
      .prepare("SELECT COUNT(*) as count FROM check_ins WHERE customer_id = ? AND status = 'granted'")
      .get(cust.id) as { count: number };

    return res.json({
      granted: isGranted,
      status: computed.status,
      message,
      customer: {
        ...cust,
        status: computed.status,
        days_remaining: computed.daysRemaining,
        total_check_ins: totalCount?.count || 1,
      },
      check_in_time: now,
    });
  } catch (err: any) {
    console.error('Check-in scan error:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/check-in/history', (req, res) => {
  try {
    const db = getDb();
    const { search, date, limit = 50 } = req.query;

    let query = `
      SELECT ci.*, c.full_name, c.phone, c.membership_id, c.image_path, c.plan_type, c.is_private, co.name as coach_name
      FROM check_ins ci
      JOIN customers c ON ci.customer_id = c.id
      LEFT JOIN coaches co ON c.coach_id = co.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (c.full_name LIKE ? OR c.phone LIKE ? OR c.membership_id LIKE ? OR ci.barcode LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    if (date) {
      query += ` AND ci.check_in_time LIKE ?`;
      params.push(`${date}%`);
    }

    query += ` ORDER BY ci.id DESC LIMIT ?`;
    params.push(Number(limit));

    const list = db.prepare(query).all(...params);
    return res.json({ history: list });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= COACHES =================

router.get('/coaches', (req, res) => {
  try {
    const db = getDb();
    const coaches = db.prepare(`
      SELECT co.*,
        (SELECT COUNT(*) FROM customers WHERE coach_id = co.id) as total_customers,
        (SELECT COUNT(*) FROM customers WHERE coach_id = co.id AND is_private = 1) as private_customers
      FROM coaches co
      ORDER BY co.id DESC
    `).all();

    return res.json({ coaches });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/coaches/:id', (req, res) => {
  try {
    const db = getDb();
    const coachId = Number(req.params.id);
    const coach = db.prepare('SELECT * FROM coaches WHERE id = ?').get(coachId);
    if (!coach) {
      return res.status(404).json({ error: 'المدرب غير موجود' });
    }

    const assignedCustomers = db.prepare(`
      SELECT c.* FROM customers c WHERE c.coach_id = ? ORDER BY c.id DESC
    `).all(coachId);

    return res.json({ coach, customers: assignedCustomers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/coaches', uploadCoachImg.single('image'), (req, res) => {
  try {
    const db = getDb();
    const { name, phone, specialty, notes } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'اسم الكوتش مطلوب' });
    }

    const imagePath = req.file ? `/uploads/coach-images/${req.file.filename}` : null;
    const now = new Date().toISOString();

    const resDb = db.prepare(`
      INSERT INTO coaches (name, phone, image_path, specialty, notes, active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(name, phone || null, imagePath, specialty || null, notes || null, now);

    const newCoach = db.prepare('SELECT * FROM coaches WHERE id = ?').get(resDb.lastInsertRowid);
    return res.status(201).json({ coach: newCoach, message: 'تمت إضافة المدرب بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/coaches/:id', uploadCoachImg.single('image'), (req, res) => {
  try {
    const db = getDb();
    const coachId = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM coaches WHERE id = ?').get(coachId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'المدرب غير موجود' });
    }

    const { name, phone, specialty, notes, active } = req.body;
    let imagePath = existing.image_path;

    if (req.file) {
      imagePath = `/uploads/coach-images/${req.file.filename}`;
      if (existing.image_path && existing.image_path.startsWith('/uploads/coach-images/')) {
        const oldFile = path.join(COACH_IMAGES_DIR, path.basename(existing.image_path));
        if (fs.existsSync(oldFile)) {
          try { fs.unlinkSync(oldFile); } catch (e) {}
        }
      }
    }

    db.prepare(`
      UPDATE coaches SET
        name = ?, phone = ?, image_path = ?, specialty = ?, notes = ?, active = ?
      WHERE id = ?
    `).run(
      name || existing.name,
      phone !== undefined ? phone : existing.phone,
      imagePath,
      specialty !== undefined ? specialty : existing.specialty,
      notes !== undefined ? notes : existing.notes,
      active !== undefined ? Number(active) : existing.active,
      coachId
    );

    const updated = db.prepare('SELECT * FROM coaches WHERE id = ?').get(coachId);
    return res.json({ coach: updated, message: 'تم تحديث بيانات المدرب بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/coaches/:id', (req, res) => {
  try {
    const db = getDb();
    const coachId = Number(req.params.id);

    // Unassign customers from this coach
    db.prepare('UPDATE customers SET coach_id = NULL WHERE coach_id = ?').run(coachId);
    db.prepare('DELETE FROM coaches WHERE id = ?').run(coachId);

    return res.json({ success: true, message: 'تم حذف المدرب بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= DASHBOARD & STATS =================

router.get('/dashboard/stats', (req, res) => {
  try {
    const db = getDb();
    const today = getTodayDateString();
    refreshNotifications(db);

    const allCustomers = db.prepare('SELECT * FROM customers').all() as any[];
    let activeCount = 0;
    let expiredCount = 0;
    let expiringSoonCount = 0;
    let frozenCount = 0;
    let privateCount = 0;

    const expiringSoonList: any[] = [];
    const expiredList: any[] = [];

    for (const cust of allCustomers) {
      const computed = computeCustomerStatus(cust, db);
      cust.status = computed.status;
      cust.days_remaining = computed.daysRemaining;

      if (cust.is_private) privateCount++;

      if (computed.status === 'active') {
        activeCount++;
      } else if (computed.status === 'expired') {
        expiredCount++;
        expiredList.push(cust);
      } else if (computed.status === 'expiring_soon') {
        expiringSoonCount++;
        expiringSoonList.push(cust);
      } else if (computed.status === 'frozen') {
        frozenCount++;
      }
    }

    // Today check-ins
    const todayCheckInsCount = db
      .prepare(`SELECT COUNT(*) as count FROM check_ins WHERE check_in_time LIKE ? AND status = 'granted'`)
      .get(`${today}%`) as { count: number };

    // Recent check-ins
    const recentCheckIns = db.prepare(`
      SELECT ci.*, c.full_name, c.phone, c.membership_id, c.image_path, c.plan_type
      FROM check_ins ci
      JOIN customers c ON ci.customer_id = c.id
      ORDER BY ci.id DESC LIMIT 10
    `).all();

    // Active coaches count
    const coachesCount = db.prepare('SELECT COUNT(*) as count FROM coaches WHERE active = 1').get() as { count: number };

    return res.json({
      stats: {
        total_customers: allCustomers.length,
        active_customers: activeCount,
        expired_customers: expiredCount,
        expiring_soon_customers: expiringSoonCount,
        frozen_customers: frozenCount,
        private_customers: privateCount,
        today_checkins: todayCheckInsCount?.count || 0,
        active_coaches: coachesCount?.count || 0,
      },
      recentCheckIns,
      expiringSoonList: expiringSoonList.slice(0, 10),
      expiredList: expiredList.slice(0, 10),
    });
  } catch (err: any) {
    console.error('Error in dashboard stats:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ================= REPORTS & CHARTS =================

router.get('/reports', (req, res) => {
  try {
    const db = getDb();
    const allCustomers = db.prepare('SELECT * FROM customers').all() as any[];

    let active = 0, expired = 0, expiringSoon = 0, frozen = 0, privateCount = 0;
    const plansDistribution: Record<string, number> = {};

    for (const c of allCustomers) {
      const computed = computeCustomerStatus(c, db);
      if (computed.status === 'active') active++;
      else if (computed.status === 'expired') expired++;
      else if (computed.status === 'expiring_soon') expiringSoon++;
      else if (computed.status === 'frozen') frozen++;

      if (c.is_private) privateCount++;

      const p = c.plan_type || 'Monthly';
      plansDistribution[p] = (plansDistribution[p] || 0) + 1;
    }

    // Daily check-ins for the last 14 days
    const dailyTrend = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = db
        .prepare(`SELECT COUNT(*) as count FROM check_ins WHERE check_in_time LIKE ? AND status = 'granted'`)
        .get(`${dateStr}%`) as { count: number };
      
      const dayName = d.toLocaleDateString('ar-EG', { weekday: 'short', month: 'numeric', day: 'numeric' });
      dailyTrend.push({ date: dateStr, label: dayName, checkIns: count?.count || 0 });
    }

    // Revenue and Subscriptions summary
    const renewalsCount = db
      .prepare(`SELECT COUNT(*) as count FROM subscription_history WHERE action_type = 'renew'`)
      .get() as { count: number };
    
    const newSubsCount = db
      .prepare(`SELECT COUNT(*) as count FROM subscription_history WHERE action_type = 'start'`)
      .get() as { count: number };

    const totalRevenue = db
      .prepare(`SELECT SUM(amount) as total FROM subscription_history`)
      .get() as { total: number };

    return res.json({
      summary: {
        total_customers: allCustomers.length,
        active,
        expired,
        expiring_soon: expiringSoon,
        frozen,
        private_count: privateCount,
        renewals_count: renewalsCount?.count || 0,
        new_subscriptions_count: newSubsCount?.count || 0,
        total_revenue: totalRevenue?.total || 0,
      },
      plansDistribution: Object.entries(plansDistribution).map(([name, value]) => ({ name, value })),
      dailyTrend,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= NOTIFICATIONS =================

router.get('/notifications', (req, res) => {
  try {
    const db = getDb();
    refreshNotifications(db);
    const notifications = db.prepare('SELECT * FROM notifications ORDER BY id DESC LIMIT 50').all();
    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0').get() as { count: number };
    return res.json({ notifications, unread_count: unreadCount?.count || 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/notifications/mark-read', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.body;
    if (id) {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
    } else {
      db.prepare('UPDATE notifications SET is_read = 1').run();
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/notifications/clear-all', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM notifications').run();
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= SETTINGS =================

router.get('/settings', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all() as any[];
    const settingsMap: Record<string, string> = {};
    rows.forEach((r) => {
      settingsMap[r.key] = r.value;
    });
    return res.json({ settings: settingsMap });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/settings', (req, res) => {
  try {
    const db = getDb();
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'بيانات غير صحيحة' });
    }

    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(settings)) {
      stmt.run(k, String(v));
    }

    return res.json({ success: true, message: 'تم حفظ الإعدادات بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= BACKUP & RESTORE =================

router.get('/backup/download', (req, res) => {
  try {
    const db = getDb();
    db.save(); // ensure disk write

    const zip = new AdmZip();
    
    // Add DB file
    if (fs.existsSync(DB_PATH)) {
      zip.addLocalFile(DB_PATH);
    }

    // Add Customer images
    if (fs.existsSync(CUSTOMER_IMAGES_DIR)) {
      zip.addLocalFolder(CUSTOMER_IMAGES_DIR, 'customer-images');
    }

    // Add Coach images
    if (fs.existsSync(COACH_IMAGES_DIR)) {
      zip.addLocalFolder(COACH_IMAGES_DIR, 'coach-images');
    }

    // Add backup manifest
    const manifest = {
      app: 'Pump Club',
      version: '1.0.0',
      created_at: new Date().toISOString(),
      platform: process.platform,
    };
    zip.addFile('backup_manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)));

    const zipBuffer = zip.toBuffer();
    const today = getTodayDateString();
    const filename = `PumpClub_Backup_${today}.zip`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/zip');
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('Backup error:', err);
    return res.status(500).json({ error: 'فشل إنشاء النسخة الاحتياطية: ' + err.message });
  }
});

router.post('/backup/restore', uploadBackup.single('backup_file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'يرجى اختيار ملف النسخة الاحتياطية' });
    }

    const zipPath = req.file.path;
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();

    // Check if pumpclub.db exists in the zip
    const hasDb = zipEntries.some((entry) => entry.entryName === 'pumpclub.db' || entry.entryName.endsWith('.db'));
    if (!hasDb) {
      return res.status(400).json({ error: 'الملف المرفوع لا يحتوي على قاعدة بيانات Pump Club صالحة' });
    }

    // Extract files to DATA_DIR
    zip.extractAllTo(DATA_DIR, true);

    // Reinitialize DB
    await initDatabase();

    // Clean temp zip
    try { fs.unlinkSync(zipPath); } catch (e) {}

    return res.json({ success: true, message: 'تمت استعادة النسخة الاحتياطية بنجاح!' });
  } catch (err: any) {
    console.error('Restore error:', err);
    return res.status(500).json({ error: 'فشل استعادة النسخة الاحتياطية: ' + err.message });
  }
});

// ================= SYSTEM INFO =================

router.get('/system/info', (req, res) => {
  try {
    const db = getDb();
    const customersCount = db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };
    const checkInsCount = db.prepare('SELECT COUNT(*) as count FROM check_ins').get() as { count: number };
    const coachesCount = db.prepare('SELECT COUNT(*) as count FROM coaches').get() as { count: number };
    
    let dbSize = 0;
    if (fs.existsSync(DB_PATH)) {
      dbSize = fs.statSync(DB_PATH).size;
    }

    return res.json({
      db_path: DB_PATH,
      db_size_kb: Math.round(dbSize / 1024),
      customers_count: customersCount?.count || 0,
      check_ins_count: checkInsCount?.count || 0,
      coaches_count: coachesCount?.count || 0,
      offline_ready: true,
      storage_type: 'Local SQLite (Embedded Disk)',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
