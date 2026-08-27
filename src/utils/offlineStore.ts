import {
  User,
  Customer,
  Coach,
  DashboardStats,
  GymSettings,
  NotificationItem,
  SystemInfo,
  CheckInRecord,
  SubscriptionHistoryItem,
  FreezeRecord,
  CustomerStatus,
} from '../types';

export const STORAGE_KEYS = {
  USERS: 'pumpclub_offline_users',
  CUSTOMERS: 'pumpclub_offline_customers',
  COACHES: 'pumpclub_offline_coaches',
  CHECK_INS: 'pumpclub_offline_checkins',
  SUBSCRIPTIONS: 'pumpclub_offline_subscriptions',
  FREEZES: 'pumpclub_offline_freezes',
  SETTINGS: 'pumpclub_offline_settings',
  NOTIFICATIONS: 'pumpclub_offline_notifications',
};

// Fallback legacy storage keys to guarantee existing data continuity
const LEGACY_STORAGE_MAP: Record<string, string[]> = {
  [STORAGE_KEYS.CUSTOMERS]: ['pumpclub_customers', 'gym_customers', 'customers_data', 'customers'],
  [STORAGE_KEYS.COACHES]: ['pumpclub_coaches', 'coaches_data', 'coaches'],
  [STORAGE_KEYS.CHECK_INS]: ['pumpclub_checkins', 'checkins_data', 'check_ins'],
  [STORAGE_KEYS.SUBSCRIPTIONS]: ['pumpclub_subscriptions', 'subscriptions_data', 'subscriptions'],
  [STORAGE_KEYS.FREEZES]: ['pumpclub_freezes', 'freezes_data', 'freezes'],
  [STORAGE_KEYS.SETTINGS]: ['pumpclub_settings', 'gym_settings', 'settings'],
  [STORAGE_KEYS.USERS]: ['pumpclub_users', 'users_data', 'users'],
};

export interface LocalUser {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: GymSettings = {
  gym_name: 'PUMP CLUB',
  gym_tagline: 'Elite Fitness & Strength Club',
  phone: '+20 100 000 0000',
  address: 'Main Branch - Cairo',
  currency: 'EGP',
  expiring_soon_days: '7',
  whatsapp_expired_msg:
    'أهلاً بك في Pump Club 👋\nنود إبلاغك أن اشتراكك في الجيم قد انتهى.\nيمكنك تجديد اشتراكك للاستمرار في التدريب معنا 💪\nنتمنى لك تمرينًا موفقًا ❤️',
  whatsapp_expiring_soon_msg:
    'مرحباً من Pump Club 👋\nنود تذكيرك بأن اشتراكك سينتهي قريباً (خلال {days} أيام).\nجدد اشتراكك الآن لتستمتع بتمارينك بدون انقطاع 🔥',
};

// Compress image to ensure it fits comfortably in LocalStorage without quota limits
export function compressImageFile(file: File, maxWidth = 600, maxHeight = 600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Convert File to Base64 data URL
export function fileToBase64(file: File): Promise<string> {
  return compressImageFile(file);
}

export function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed !== null && parsed !== undefined) {
        return parsed as T;
      }
    }
    // Check legacy fallback keys if any
    const legacyKeys = LEGACY_STORAGE_MAP[key] || [];
    for (const lk of legacyKeys) {
      const legacyRaw = localStorage.getItem(lk);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (parsed !== null && parsed !== undefined) {
          // migrate to primary key immediately
          localStorage.setItem(key, JSON.stringify(parsed));
          return parsed as T;
        }
      }
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    const jsonStr = JSON.stringify(value);
    localStorage.setItem(key, jsonStr);
  } catch (err) {
    console.warn(`LocalStorage write warning for key ${key}:`, err);
  }
}

// Compute dynamic customer status and days remaining
export function computeCustomerStatus(
  customer: Partial<Customer>,
  expiringDays: number = 7
): { status: CustomerStatus; daysRemaining: number } {
  if (customer.status === 'frozen') {
    return { status: 'frozen', daysRemaining: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDateStr = customer.end_date || customer.start_date || new Date().toISOString().split('T')[0];
  const end = new Date(endDateStr);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'expired', daysRemaining: diffDays };
  } else if (diffDays <= expiringDays) {
    return { status: 'expiring_soon', daysRemaining: diffDays };
  } else {
    return { status: 'active', daysRemaining: diffDays };
  }
}

// Initialize offline store safely preserving ALL user-entered customer data
export function initOfflineStore(): void {
  // 1. Admin User
  const users = getItem<LocalUser[]>(STORAGE_KEYS.USERS, []);
  const pumpUser = users.find((u) => u.username.toLowerCase() === 'pump');
  const now = new Date().toISOString();

  if (!pumpUser) {
    users.push({
      id: 1,
      username: 'Pump',
      password_hash: 'Pump777',
      role: 'admin',
      full_name: 'مدير النظام',
      created_at: now,
      updated_at: now,
    });
    setItem(STORAGE_KEYS.USERS, users);
  } else if (pumpUser.password_hash !== 'Pump777') {
    pumpUser.password_hash = 'Pump777';
    setItem(STORAGE_KEYS.USERS, users);
  }

  // 2. Settings
  const settings = getItem<GymSettings | null>(STORAGE_KEYS.SETTINGS, null);
  if (!settings) {
    setItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }
}

// Auto-run init safely
initOfflineStore();

export const offlineStore = {
  // 1. Auth
  login: async (credentials: { username: string; password: string }): Promise<{ user: User; message: string }> => {
    initOfflineStore();
    const users = getItem<LocalUser[]>(STORAGE_KEYS.USERS, []);
    const inputUsername = (credentials.username || '').trim().toLowerCase();
    const inputPassword = credentials.password || '';

    const user = users.find((u) => u.username.toLowerCase() === inputUsername);
    if (!user || user.password_hash !== inputPassword) {
      throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
      },
      message: 'تم تسجيل الدخول بنجاح',
    };
  },

  changePassword: async (data: { username: string; currentPassword: string; newPassword: string }) => {
    const users = getItem<LocalUser[]>(STORAGE_KEYS.USERS, []);
    const user = users.find((u) => u.username.toLowerCase() === data.username.trim().toLowerCase());
    if (!user || user.password_hash !== data.currentPassword) {
      throw new Error('كلمة المرور الحالية غير صحيحة');
    }
    user.password_hash = data.newPassword;
    user.updated_at = new Date().toISOString();
    setItem(STORAGE_KEYS.USERS, users);
    return { success: true, message: 'تم تغيير كلمة المرور بنجاح' };
  },

  // 2. Settings
  getSettings: async (): Promise<{ settings: GymSettings }> => {
    const settings = getItem<GymSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    return { settings };
  },

  updateSettings: async (newSettings: Partial<GymSettings>): Promise<{ success: boolean; message: string }> => {
    const current = getItem<GymSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const updated = { ...current, ...newSettings };
    setItem(STORAGE_KEYS.SETTINGS, updated);
    return { success: true, message: 'تم حفظ الإعدادات بنجاح' };
  },

  // 3. Customers
  getCustomers: async (params?: {
    search?: string;
    status?: string;
    coach_id?: string | number;
    is_private?: string | number;
  }): Promise<{ customers: Customer[]; total: number }> => {
    const rawCustomers = getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    const coaches = getItem<Coach[]>(STORAGE_KEYS.COACHES, []);
    const settings = getItem<GymSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const expiringDays = Number(settings.expiring_soon_days) || 7;

    const coachesMap = new Map(coaches.map((c) => [c.id, c.name]));

    let list = rawCustomers.map((c) => {
      const { status, daysRemaining } = computeCustomerStatus(c, expiringDays);
      return {
        ...c,
        status,
        days_remaining: daysRemaining,
        coach_name: c.coach_id ? coachesMap.get(c.coach_id) || c.coach_name : null,
      };
    });

    if (params?.search) {
      const q = params.search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.barcode?.includes(q) ||
          c.membership_id?.toLowerCase().includes(q)
      );
    }

    if (params?.status && params.status !== 'all') {
      list = list.filter((c) => c.status === params.status);
    }

    if (params?.coach_id) {
      list = list.filter((c) => String(c.coach_id) === String(params.coach_id));
    }

    if (params?.is_private !== undefined && params.is_private !== '') {
      list = list.filter((c) => Number(c.is_private) === Number(params.is_private));
    }

    list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return { customers: list, total: list.length };
  },

  getCustomer: async (
    id: number
  ): Promise<{
    customer: Customer;
    history: SubscriptionHistoryItem[];
    freezes: FreezeRecord[];
    checkIns: CheckInRecord[];
    stats: { total_check_ins: number; last_check_in: string | null };
  }> => {
    const rawCustomers = getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    const coaches = getItem<Coach[]>(STORAGE_KEYS.COACHES, []);
    const settings = getItem<GymSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const expiringDays = Number(settings.expiring_soon_days) || 7;

    const c = rawCustomers.find((item) => item.id === id);
    if (!c) throw new Error('العميل غير موجود');

    const coachesMap = new Map(coaches.map((coach) => [coach.id, coach.name]));
    const { status, daysRemaining } = computeCustomerStatus(c, expiringDays);

    const allHistory = getItem<SubscriptionHistoryItem[]>(STORAGE_KEYS.SUBSCRIPTIONS, []);
    const customerHistory = allHistory
      .filter((h) => h.customer_id === id)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    const allFreezes = getItem<FreezeRecord[]>(STORAGE_KEYS.FREEZES, []);
    const customerFreezes = allFreezes
      .filter((f) => f.customer_id === id)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    const allCheckIns = getItem<CheckInRecord[]>(STORAGE_KEYS.CHECK_INS, []);
    const customerCheckIns = allCheckIns
      .filter((ci) => ci.customer_id === id)
      .sort((a, b) => new Date(b.check_in_time || 0).getTime() - new Date(a.check_in_time || 0).getTime());

    const enrichedCustomer: Customer = {
      ...c,
      status,
      days_remaining: daysRemaining,
      coach_name: c.coach_id ? coachesMap.get(c.coach_id) || c.coach_name : null,
      total_check_ins: customerCheckIns.length,
      last_check_in: customerCheckIns.length > 0 ? customerCheckIns[0].check_in_time : null,
    };

    return {
      customer: enrichedCustomer,
      history: customerHistory,
      freezes: customerFreezes,
      checkIns: customerCheckIns,
      stats: {
        total_check_ins: customerCheckIns.length,
        last_check_in: customerCheckIns.length > 0 ? customerCheckIns[0].check_in_time : null,
      },
    };
  },

  createCustomer: async (formData: FormData): Promise<{ customer: Customer; message: string }> => {
    const rawCustomers = getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    const now = new Date().toISOString();

    const fullName = (formData.get('full_name') as string)?.trim();
    const phone = (formData.get('phone') as string)?.trim();
    if (!fullName || !phone) {
      throw new Error('الاسم الكامل ورقم الهاتف مطلوبان');
    }

    // Check duplicate phone
    if (rawCustomers.some((c) => c.phone === phone)) {
      throw new Error('رقم الهاتف مسجل بالفعل لمشترك آخر');
    }

    const nationalId = (formData.get('national_id') as string)?.trim() || null;
    const planType = (formData.get('plan_type') as string) || 'شهر واحد';
    const durationMonths = parseInt(formData.get('duration_months') as string, 10) || 1;
    const startDate = (formData.get('start_date') as string) || now.split('T')[0];

    // Compute end date
    let endDate = formData.get('end_date') as string;
    if (!endDate) {
      const s = new Date(startDate);
      s.setMonth(s.getMonth() + durationMonths);
      endDate = s.toISOString().split('T')[0];
    }

    const isPrivate = formData.get('is_private') === '1' || formData.get('is_private') === 'true' ? 1 : 0;
    const coachIdStr = formData.get('coach_id') as string;
    const coachId = coachIdStr ? parseInt(coachIdStr, 10) : null;
    const pricePaid = parseFloat(formData.get('price_paid') as string) || 0;
    const notes = (formData.get('notes') as string) || null;

    // Handle image file if provided
    let imagePath: string | null = null;
    const imageFile = formData.get('image') as File | null;
    if (imageFile && imageFile instanceof File && imageFile.size > 0 && typeof imageFile.name === 'string') {
      try {
        imagePath = await compressImageFile(imageFile);
      } catch (e) {
        console.warn('Failed to compress image:', e);
      }
    } else if (typeof formData.get('image_path') === 'string') {
      imagePath = formData.get('image_path') as string;
    }

    // Generate unique ID, membership_id, and barcode
    const nextId = rawCustomers.reduce((max, c) => Math.max(max, c.id || 0), 0) + 1;
    const membershipId = (formData.get('membership_id') as string) || `PUMP-${1000 + nextId}`;
    const barcode = (formData.get('barcode') as string) || `${100000 + nextId * 100}`;

    const newCustomer: Customer = {
      id: nextId,
      membership_id: membershipId,
      full_name: fullName,
      phone,
      national_id: nationalId,
      image_path: imagePath,
      barcode,
      plan_type: planType,
      duration_months: durationMonths,
      start_date: startDate,
      end_date: endDate,
      original_end_date: endDate,
      is_private: isPrivate,
      coach_id: coachId,
      price_paid: pricePaid,
      notes,
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    rawCustomers.push(newCustomer);
    setItem(STORAGE_KEYS.CUSTOMERS, rawCustomers);

    // Save initial subscription history
    const allHistory = getItem<SubscriptionHistoryItem[]>(STORAGE_KEYS.SUBSCRIPTIONS, []);
    allHistory.push({
      id: allHistory.length + 1,
      customer_id: nextId,
      action_type: 'start',
      plan_type: planType,
      duration_months: durationMonths,
      start_date: startDate,
      end_date: endDate,
      amount: pricePaid,
      notes: notes || 'اشتراك جديد',
      created_at: now,
    });
    setItem(STORAGE_KEYS.SUBSCRIPTIONS, allHistory);

    return { customer: newCustomer, message: 'تمت إضافة المشترك بنجاح' };
  },

  updateCustomer: async (id: number, formData: FormData): Promise<{ customer: Customer; message: string }> => {
    const rawCustomers = getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    const index = rawCustomers.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('العميل غير موجود');

    const customer = { ...rawCustomers[index] };
    const now = new Date().toISOString();

    const fullName = formData.get('full_name') as string;
    if (fullName) customer.full_name = fullName.trim();

    const phone = formData.get('phone') as string;
    if (phone) {
      const trimmedPhone = phone.trim();
      if (rawCustomers.some((c) => c.phone === trimmedPhone && c.id !== id)) {
        throw new Error('رقم الهاتف مسجل بالفعل لمشترك آخر');
      }
      customer.phone = trimmedPhone;
    }

    if (formData.has('national_id')) customer.national_id = (formData.get('national_id') as string)?.trim() || null;
    if (formData.has('plan_type')) customer.plan_type = formData.get('plan_type') as string;
    if (formData.has('duration_months')) customer.duration_months = parseInt(formData.get('duration_months') as string, 10) || 1;
    if (formData.has('start_date')) customer.start_date = formData.get('start_date') as string;
    if (formData.has('end_date')) customer.end_date = formData.get('end_date') as string;
    if (formData.has('is_private')) customer.is_private = formData.get('is_private') === '1' || formData.get('is_private') === 'true' ? 1 : 0;
    if (formData.has('coach_id')) {
      const cId = formData.get('coach_id') as string;
      customer.coach_id = cId ? parseInt(cId, 10) : null;
    }
    if (formData.has('price_paid')) customer.price_paid = parseFloat(formData.get('price_paid') as string) || 0;
    if (formData.has('notes')) customer.notes = formData.get('notes') as string;

    const imageFile = formData.get('image') as File | null;
    if (imageFile && imageFile instanceof File && imageFile.size > 0 && typeof imageFile.name === 'string') {
      try {
        customer.image_path = await compressImageFile(imageFile);
      } catch (e) {
        console.warn('Failed to compress image:', e);
      }
    }

    customer.updated_at = now;
    rawCustomers[index] = customer;
    setItem(STORAGE_KEYS.CUSTOMERS, rawCustomers);

    return { customer, message: 'تم تحديث بيانات المشترك بنجاح' };
  },

  deleteCustomer: async (id: number): Promise<{ success: boolean; message: string }> => {
    let rawCustomers = getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    rawCustomers = rawCustomers.filter((c) => c.id !== id);
    setItem(STORAGE_KEYS.CUSTOMERS, rawCustomers);

    // Clean up related records
    const history = getItem<SubscriptionHistoryItem[]>(STORAGE_KEYS.SUBSCRIPTIONS, []).filter((h) => h.customer_id !== id);
    setItem(STORAGE_KEYS.SUBSCRIPTIONS, history);

    const checkIns = getItem<CheckInRecord[]>(STORAGE_KEYS.CHECK_INS, []).filter((ci) => ci.customer_id !== id);
    setItem(STORAGE_KEYS.CHECK_INS, checkIns);

    const freezes = getItem<FreezeRecord[]>(STORAGE_KEYS.FREEZES, []).filter((f) => f.customer_id !== id);
    setItem(STORAGE_KEYS.FREEZES, freezes);

    return { success: true, message: 'تم حذف المشترك وكافة سجلاته' };
  },

  renewCustomer: async (
    id: number,
    data: { plan_type: string; duration_months: number; price_paid: number; notes?: string }
  ): Promise<{ customer: Customer; message: string }> => {
    const rawCustomers = getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    const index = rawCustomers.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('المشترك غير موجود');

    const customer = { ...rawCustomers[index] };
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // If current end date is in the future, renew starts from current end date. Otherwise starts today.
    const currentEnd = new Date(customer.end_date);
    const startRenewDate = currentEnd > now ? currentEnd : now;

    const newEnd = new Date(startRenewDate);
    newEnd.setMonth(newEnd.getMonth() + data.duration_months);
    const newEndStr = newEnd.toISOString().split('T')[0];

    customer.plan_type = data.plan_type;
    customer.duration_months = data.duration_months;
    customer.end_date = newEndStr;
    customer.original_end_date = newEndStr;
    customer.price_paid = data.price_paid;
    customer.status = 'active';
    customer.updated_at = now.toISOString();

    rawCustomers[index] = customer;
    setItem(STORAGE_KEYS.CUSTOMERS, rawCustomers);

    // Save history
    const allHistory = getItem<SubscriptionHistoryItem[]>(STORAGE_KEYS.SUBSCRIPTIONS, []);
    allHistory.push({
      id: allHistory.length + 1,
      customer_id: id,
      action_type: 'renew',
      plan_type: data.plan_type,
      duration_months: data.duration_months,
      start_date: todayStr,
      end_date: newEndStr,
      amount: data.price_paid,
      notes: data.notes || 'تجديد اشتراك',
      created_at: now.toISOString(),
    });
    setItem(STORAGE_KEYS.SUBSCRIPTIONS, allHistory);

    return { customer, message: 'تم تجديد الاشتراك بنجاح' };
  },

  freezeCustomer: async (
    id: number,
    data: { start_date: string; end_date?: string; days_count?: number; reason?: string }
  ): Promise<{ customer: Customer; new_end_date: string; message: string }> => {
    const rawCustomers = getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    const index = rawCustomers.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('المشترك غير موجود');

    const customer = { ...rawCustomers[index] };
    const now = new Date().toISOString();

    let daysCount = data.days_count || 0;
    let freezeEndDate = data.end_date;

    if (!freezeEndDate && daysCount > 0) {
      const s = new Date(data.start_date);
      s.setDate(s.getDate() + daysCount);
      freezeEndDate = s.toISOString().split('T')[0];
    } else if (freezeEndDate && !daysCount) {
      const s = new Date(data.start_date);
      const e = new Date(freezeEndDate);
      daysCount = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Extend customer end_date by freeze days
    const currentEnd = new Date(customer.end_date);
    currentEnd.setDate(currentEnd.getDate() + daysCount);
    const newEndDateStr = currentEnd.toISOString().split('T')[0];

    customer.end_date = newEndDateStr;
    customer.status = 'frozen';
    customer.updated_at = now;

    rawCustomers[index] = customer;
    setItem(STORAGE_KEYS.CUSTOMERS, rawCustomers);

    // Save freeze record
    const allFreezes = getItem<FreezeRecord[]>(STORAGE_KEYS.FREEZES, []);
    allFreezes.push({
      id: allFreezes.length + 1,
      customer_id: id,
      start_date: data.start_date,
      end_date: freezeEndDate || newEndDateStr,
      days_count: daysCount,
      reason: data.reason || 'تجميد مؤقت',
      is_active: 1,
      created_at: now,
    });
    setItem(STORAGE_KEYS.FREEZES, allFreezes);

    return {
      customer,
      new_end_date: newEndDateStr,
      message: `تم تجميد الاشتراك لمدة ${daysCount} يوم بنجاح`,
    };
  },

  // 4. Check-in & Scanning
  scanCheckIn: async (barcode: string): Promise<{
    granted: boolean;
    status: string;
    message: string;
    customer: Customer;
    check_in_time: string;
  }> => {
    const rawCustomers = getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    const coaches = getItem<Coach[]>(STORAGE_KEYS.COACHES, []);
    const settings = getItem<GymSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const expiringDays = Number(settings.expiring_soon_days) || 7;

    const trimmed = (barcode || '').trim();
    const customerIndex = rawCustomers.findIndex(
      (c) =>
        c.barcode === trimmed ||
        c.membership_id?.toLowerCase() === trimmed.toLowerCase() ||
        c.phone === trimmed
    );

    if (customerIndex === -1) {
      throw new Error('لم يتم العثور على أي مشترك بهذا الباركود أو رقم الهاتف');
    }

    const customer = { ...rawCustomers[customerIndex] };
    const { status, daysRemaining } = computeCustomerStatus(customer, expiringDays);
    const nowTime = new Date().toISOString();

    let granted = false;
    let message = '';

    if (status === 'frozen') {
      message = 'عذراً، هذا الاشتراك مجمّد حالياً.';
    } else if (status === 'expired') {
      message = 'عذراً، الاشتراك منتهي! يرجى التجديد للاستمرار.';
    } else {
      granted = true;
      message = status === 'expiring_soon'
        ? `أهلاً بك! الاشتراك سينتهي قريباً (متبقي ${daysRemaining} أيام)`
        : 'تم تسجيل الدخول بنجاح! تمرين موفق 💪';
    }

    // Save check-in record
    const allCheckIns = getItem<CheckInRecord[]>(STORAGE_KEYS.CHECK_INS, []);
    allCheckIns.push({
      id: allCheckIns.length + 1,
      customer_id: customer.id,
      full_name: customer.full_name,
      phone: customer.phone,
      membership_id: customer.membership_id,
      image_path: customer.image_path || undefined,
      plan_type: customer.plan_type,
      barcode: customer.barcode,
      check_in_time: nowTime,
      status: granted ? 'granted' : status === 'expired' ? 'expired' : status === 'frozen' ? 'frozen' : 'denied',
      notes: message,
      created_at: nowTime,
    });
    setItem(STORAGE_KEYS.CHECK_INS, allCheckIns);

    // Update customer last check in
    customer.last_check_in = nowTime;
    customer.total_check_ins = (customer.total_check_ins || 0) + (granted ? 1 : 0);
    rawCustomers[customerIndex] = customer;
    setItem(STORAGE_KEYS.CUSTOMERS, rawCustomers);

    const coachesMap = new Map(coaches.map((c) => [c.id, c.name]));
    const enrichedCustomer: Customer = {
      ...customer,
      status,
      days_remaining: daysRemaining,
      coach_name: customer.coach_id ? coachesMap.get(customer.coach_id) || customer.coach_name : null,
    };

    return {
      granted,
      status,
      message,
      customer: enrichedCustomer,
      check_in_time: nowTime,
    };
  },

  getCheckInHistory: async (params?: { search?: string; date?: string; limit?: number }): Promise<{ history: CheckInRecord[] }> => {
    const allCheckIns = getItem<CheckInRecord[]>(STORAGE_KEYS.CHECK_INS, []);
    const rawCustomers = getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    const custMap = new Map(rawCustomers.map((c) => [c.id, c]));

    let list = allCheckIns.map((ci) => {
      const c = custMap.get(ci.customer_id);
      return {
        ...ci,
        full_name: ci.full_name || c?.full_name || 'مشترك',
        phone: ci.phone || c?.phone || '',
        membership_id: ci.membership_id || c?.membership_id || '',
        image_path: ci.image_path || c?.image_path || undefined,
        plan_type: ci.plan_type || c?.plan_type || '',
      };
    });

    if (params?.search) {
      const q = params.search.trim().toLowerCase();
      list = list.filter(
        (ci) =>
          ci.full_name?.toLowerCase().includes(q) ||
          ci.phone?.includes(q) ||
          ci.membership_id?.toLowerCase().includes(q) ||
          ci.barcode?.includes(q)
      );
    }

    if (params?.date) {
      list = list.filter((ci) => ci.check_in_time?.startsWith(params.date!));
    }

    list.sort((a, b) => new Date(b.check_in_time || 0).getTime() - new Date(a.check_in_time || 0).getTime());

    if (params?.limit && params.limit > 0) {
      list = list.slice(0, params.limit);
    }

    return { history: list };
  },

  // 5. Coaches
  getCoaches: async (): Promise<{ coaches: Coach[] }> => {
    const rawCoaches = getItem<Coach[]>(STORAGE_KEYS.COACHES, []);
    const rawCustomers = getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);

    const coachesWithStats = rawCoaches.map((coach) => {
      const coachCusts = rawCustomers.filter((c) => c.coach_id === coach.id);
      return {
        ...coach,
        total_customers: coachCusts.length,
        private_customers: coachCusts.filter((c) => c.is_private).length,
      };
    });

    return { coaches: coachesWithStats };
  },

  getCoach: async (id: number): Promise<{ coach: Coach; customers: Customer[] }> => {
    const rawCoaches = getItem<Coach[]>(STORAGE_KEYS.COACHES, []);
    const coach = rawCoaches.find((c) => c.id === id);
    if (!coach) throw new Error('المدرب غير موجود');

    const { customers } = await offlineStore.getCustomers({ coach_id: id });
    return { coach, customers };
  },

  createCoach: async (formData: FormData): Promise<{ coach: Coach; message: string }> => {
    const rawCoaches = getItem<Coach[]>(STORAGE_KEYS.COACHES, []);
    const now = new Date().toISOString();

    const name = (formData.get('name') as string)?.trim();
    if (!name) throw new Error('اسم المدرب مطلوب');

    let imagePath: string | null = null;
    const imageFile = formData.get('image') as File | null;
    if (imageFile && imageFile instanceof File && imageFile.size > 0 && typeof imageFile.name === 'string') {
      try {
        imagePath = await compressImageFile(imageFile);
      } catch (e) {
        console.warn('Failed to compress coach image:', e);
      }
    }

    const nextId = rawCoaches.reduce((max, c) => Math.max(max, c.id || 0), 0) + 1;
    const newCoach: Coach = {
      id: nextId,
      name,
      phone: (formData.get('phone') as string)?.trim() || null,
      image_path: imagePath,
      specialty: (formData.get('specialty') as string)?.trim() || null,
      notes: (formData.get('notes') as string) || null,
      active: 1,
      created_at: now,
    };

    rawCoaches.push(newCoach);
    setItem(STORAGE_KEYS.COACHES, rawCoaches);

    return { coach: newCoach, message: 'تمت إضافة المدرب بنجاح' };
  },

  updateCoach: async (id: number, formData: FormData): Promise<{ coach: Coach; message: string }> => {
    const rawCoaches = getItem<Coach[]>(STORAGE_KEYS.COACHES, []);
    const index = rawCoaches.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('المدرب غير موجود');

    const coach = { ...rawCoaches[index] };
    const name = formData.get('name') as string;
    if (name) coach.name = name.trim();
    if (formData.has('phone')) coach.phone = (formData.get('phone') as string)?.trim() || null;
    if (formData.has('specialty')) coach.specialty = (formData.get('specialty') as string)?.trim() || null;
    if (formData.has('notes')) coach.notes = (formData.get('notes') as string) || null;
    if (formData.has('active')) coach.active = parseInt(formData.get('active') as string, 10) || 1;

    const imageFile = formData.get('image') as File | null;
    if (imageFile && imageFile instanceof File && imageFile.size > 0 && typeof imageFile.name === 'string') {
      try {
        coach.image_path = await compressImageFile(imageFile);
      } catch (e) {
        console.warn('Failed to compress coach image:', e);
      }
    }

    rawCoaches[index] = coach;
    setItem(STORAGE_KEYS.COACHES, rawCoaches);

    return { coach, message: 'تم تحديث بيانات المدرب بنجاح' };
  },

  deleteCoach: async (id: number): Promise<{ success: boolean; message: string }> => {
    let rawCoaches = getItem<Coach[]>(STORAGE_KEYS.COACHES, []);
    rawCoaches = rawCoaches.filter((c) => c.id !== id);
    setItem(STORAGE_KEYS.COACHES, rawCoaches);
    return { success: true, message: 'تم حذف المدرب بنجاح' };
  },

  // 6. Dashboard Stats
  getDashboardStats: async (): Promise<{
    stats: DashboardStats;
    recentCheckIns: any[];
    expiringSoon: Customer[];
    expired: Customer[];
  }> => {
    const { customers } = await offlineStore.getCustomers();
    const coaches = getItem<Coach[]>(STORAGE_KEYS.COACHES, []);
    const allCheckIns = getItem<CheckInRecord[]>(STORAGE_KEYS.CHECK_INS, []);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayCheckIns = allCheckIns.filter((ci) => ci.check_in_time?.startsWith(todayStr) && ci.status === 'granted');

    const activeList = customers.filter((c) => c.status === 'active');
    const expiringSoonList = customers.filter((c) => c.status === 'expiring_soon');
    const expiredList = customers.filter((c) => c.status === 'expired');
    const frozenList = customers.filter((c) => c.status === 'frozen');
    const privateList = customers.filter((c) => c.is_private);

    const stats: DashboardStats = {
      total_customers: customers.length,
      active_customers: activeList.length,
      expired_customers: expiredList.length,
      expiring_soon_customers: expiringSoonList.length,
      frozen_customers: frozenList.length,
      private_customers: privateList.length,
      today_checkins: todayCheckIns.length,
      active_coaches: coaches.filter((c) => c.active).length,
    };

    const recentCheckIns = allCheckIns
      .slice(-10)
      .reverse()
      .map((ci) => {
        const c = customers.find((cust) => cust.id === ci.customer_id);
        return {
          ...ci,
          full_name: ci.full_name || c?.full_name,
          phone: ci.phone || c?.phone,
          membership_id: ci.membership_id || c?.membership_id,
        };
      });

    return {
      stats,
      recentCheckIns,
      expiringSoon: expiringSoonList,
      expired: expiredList,
    };
  },

  // 7. Reports
  getReports: async () => {
    const { customers } = await offlineStore.getCustomers();
    const allHistory = getItem<SubscriptionHistoryItem[]>(STORAGE_KEYS.SUBSCRIPTIONS, []);
    const allCheckIns = getItem<CheckInRecord[]>(STORAGE_KEYS.CHECK_INS, []);

    // Plan distribution
    const plansCount: Record<string, number> = {};
    customers.forEach((c) => {
      plansCount[c.plan_type] = (plansCount[c.plan_type] || 0) + 1;
    });

    const plansDistribution = Object.entries(plansCount).map(([name, value]) => ({
      name,
      value,
    }));

    // Last 7 days trend
    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('ar-EG', { weekday: 'short' });
      const checkInsCount = allCheckIns.filter(
        (ci) => ci.check_in_time?.startsWith(dateStr) && ci.status === 'granted'
      ).length;

      dailyTrend.push({
        date: dateStr,
        label: dayLabel,
        checkIns: checkInsCount,
      });
    }

    const totalRevenue = allHistory.reduce((sum, h) => sum + (h.amount || 0), 0);

    return {
      summary: {
        totalRevenue,
        totalSubscriptions: allHistory.length,
        totalCheckIns: allCheckIns.length,
        totalCustomers: customers.length,
      },
      plansDistribution,
      dailyTrend,
    };
  },

  // 8. Notifications
  getNotifications: async (): Promise<{ notifications: NotificationItem[]; unreadCount: number }> => {
    const { customers } = await offlineStore.getCustomers();
    const notifications: NotificationItem[] = [];

    customers
      .filter((c) => c.status === 'expiring_soon')
      .forEach((c, idx) => {
        notifications.push({
          id: idx + 1,
          type: 'expiring_soon',
          title: 'اشتراك ينتهي قريباً',
          message: `اشتراك المشترك "${c.full_name}" ينتهي خلال ${c.days_remaining} أيام`,
          customer_id: c.id,
          is_read: 0,
          created_at: new Date().toISOString(),
        });
      });

    customers
      .filter((c) => c.status === 'expired')
      .forEach((c, idx) => {
        notifications.push({
          id: 1000 + idx,
          type: 'expired',
          title: 'اشتراك منتهي',
          message: `اشتراك المشترك "${c.full_name}" منتهي منذ ${Math.abs(c.days_remaining || 0)} يوم`,
          customer_id: c.id,
          is_read: 0,
          created_at: new Date().toISOString(),
        });
      });

    return {
      notifications,
      unreadCount: notifications.length,
    };
  },

  markNotificationsRead: async (_id?: number) => ({ success: true }),
  clearNotifications: async () => ({ success: true }),

  // 9. System & Backup
  getSystemInfo: async (): Promise<SystemInfo> => {
    const rawCustomers = getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    const rawCoaches = getItem<Coach[]>(STORAGE_KEYS.COACHES, []);
    const rawCheckIns = getItem<CheckInRecord[]>(STORAGE_KEYS.CHECK_INS, []);

    let totalStorageBytes = 0;
    try {
      totalStorageBytes = new Blob(Object.values(localStorage)).size;
    } catch {
      totalStorageBytes = JSON.stringify(localStorage).length;
    }

    return {
      db_path: 'متصفح الجهاز المحلي (Local Storage Persistence)',
      db_size_kb: Math.round(totalStorageBytes / 1024),
      customers_count: rawCustomers.length,
      check_ins_count: rawCheckIns.length,
      coaches_count: rawCoaches.length,
      offline_ready: true,
      storage_type: 'Local Browser Storage (دائم على الجهاز)',
    };
  },

  exportDatabaseBackup: (): string => {
    const backup = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      data: {
        users: getItem(STORAGE_KEYS.USERS, []),
        customers: getItem(STORAGE_KEYS.CUSTOMERS, []),
        coaches: getItem(STORAGE_KEYS.COACHES, []),
        check_ins: getItem(STORAGE_KEYS.CHECK_INS, []),
        subscriptions: getItem(STORAGE_KEYS.SUBSCRIPTIONS, []),
        freezes: getItem(STORAGE_KEYS.FREEZES, []),
        settings: getItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
      },
    };
    return JSON.stringify(backup, null, 2);
  },

  restoreDatabaseBackup: async (jsonText: string): Promise<{ success: boolean; message: string }> => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.data) throw new Error('ملف النسخة الاحتياطية غير صالح');

      if (parsed.data.users) setItem(STORAGE_KEYS.USERS, parsed.data.users);
      if (parsed.data.customers) setItem(STORAGE_KEYS.CUSTOMERS, parsed.data.customers);
      if (parsed.data.coaches) setItem(STORAGE_KEYS.COACHES, parsed.data.coaches);
      if (parsed.data.check_ins) setItem(STORAGE_KEYS.CHECK_INS, parsed.data.check_ins);
      if (parsed.data.subscriptions) setItem(STORAGE_KEYS.SUBSCRIPTIONS, parsed.data.subscriptions);
      if (parsed.data.freezes) setItem(STORAGE_KEYS.FREEZES, parsed.data.freezes);
      if (parsed.data.settings) setItem(STORAGE_KEYS.SETTINGS, parsed.data.settings);

      return { success: true, message: 'تمت استعادة البيانات بنجاح' };
    } catch (err: any) {
      throw new Error(`فشل استعادة البيانات: ${err.message}`);
    }
  },
};
