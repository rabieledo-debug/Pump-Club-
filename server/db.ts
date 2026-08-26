import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Ensure data directories exist
export const DATA_DIR = path.join(process.cwd(), 'data');
export const CUSTOMER_IMAGES_DIR = path.join(DATA_DIR, 'customer-images');
export const COACH_IMAGES_DIR = path.join(DATA_DIR, 'coach-images');
export const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
export const DB_PATH = path.join(DATA_DIR, 'pumpclub.db');

[DATA_DIR, CUSTOMER_IMAGES_DIR, COACH_IMAGES_DIR, BACKUPS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Password hashing utility using standard crypto
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const checkHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return checkHash === hash;
}

// Universal SQLite wrapper that supports native node:sqlite or sql.js
export interface DatabaseDriver {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: any[]): any;
    all(...params: any[]): any[];
  };
  save(): void;
  close(): void;
}

let dbInstance: DatabaseDriver | null = null;

export async function initDatabase(): Promise<DatabaseDriver> {
  if (dbInstance) return dbInstance;

  try {
    // Try node:sqlite (native in Node 22+)
    // @ts-ignore
    const sqliteModule = await import('node:sqlite');
    if (sqliteModule && sqliteModule.DatabaseSync) {
      const nativeDb = new sqliteModule.DatabaseSync(DB_PATH);
      nativeDb.exec('PRAGMA foreign_keys = ON;');
      nativeDb.exec('PRAGMA journal_mode = WAL;');

      dbInstance = {
        exec(sql: string) {
          nativeDb.exec(sql);
        },
        prepare(sql: string) {
          const stmt = nativeDb.prepare(sql);
          return {
            run(...params: any[]) {
              const res = stmt.run(...params);
              return {
                changes: Number(res.changes || 0),
                lastInsertRowid: res.lastInsertRowid ? Number(res.lastInsertRowid) : 0,
              };
            },
            get(...params: any[]) {
              return stmt.get(...params);
            },
            all(...params: any[]) {
              return stmt.all(...params);
            },
          };
        },
        save() {
          // Native SQLite automatically flushes to DB_PATH
        },
        close() {
          nativeDb.close();
        },
      };
      console.log('SQLite initialized using native node:sqlite on disk:', DB_PATH);
    }
  } catch (err) {
    console.log('node:sqlite not available, falling back to sql.js with disk sync:', (err as any)?.message);
  }

  // Fallback to sql.js with automatic file disk synchronization
  if (!dbInstance) {
    // @ts-ignore
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    let sqlDb: any;

    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      sqlDb = new SQL.Database(fileBuffer);
    } else {
      sqlDb = new SQL.Database();
    }

    const saveToDisk = () => {
      try {
        const data = sqlDb.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
      } catch (e) {
        console.error('Failed to save SQLite database to disk:', e);
      }
    };

    dbInstance = {
      exec(sql: string) {
        sqlDb.exec(sql);
        saveToDisk();
      },
      prepare(sql: string) {
        return {
          run(...params: any[]) {
            const stmt = sqlDb.prepare(sql);
            stmt.run(params);
            stmt.free();
            saveToDisk();
            
            // Get last inserted ID and changes
            const res = sqlDb.exec('SELECT last_insert_rowid() as id, changes() as changes');
            const lastId = res[0]?.values[0]?.[0] || 0;
            const changes = res[0]?.values[0]?.[1] || 0;
            return { changes: Number(changes), lastInsertRowid: Number(lastId) };
          },
          get(...params: any[]) {
            const stmt = sqlDb.prepare(sql);
            stmt.bind(params);
            if (stmt.step()) {
              const row = stmt.getAsObject();
              stmt.free();
              return row;
            }
            stmt.free();
            return undefined;
          },
          all(...params: any[]) {
            const stmt = sqlDb.prepare(sql);
            stmt.bind(params);
            const results = [];
            while (stmt.step()) {
              results.push(stmt.getAsObject());
            }
            stmt.free();
            return results;
          },
        };
      },
      save() {
        saveToDisk();
      },
      close() {
        saveToDisk();
        sqlDb.close();
      },
    };
    console.log('SQLite initialized using sql.js with disk sync:', DB_PATH);
  }

  // Create tables if not exists
  createTables(dbInstance);
  seedDefaultAdmin(dbInstance);

  return dbInstance;
}

function createTables(db: DatabaseDriver) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      full_name TEXT DEFAULT 'مدير النادي',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coaches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      image_path TEXT,
      specialty TEXT,
      notes TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      membership_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      national_id TEXT,
      image_path TEXT,
      barcode TEXT UNIQUE NOT NULL,
      plan_type TEXT NOT NULL,
      duration_months INTEGER NOT NULL DEFAULT 1,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      original_end_date TEXT NOT NULL,
      is_private INTEGER DEFAULT 0,
      coach_id INTEGER,
      price_paid REAL DEFAULT 0,
      notes TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscription_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      plan_type TEXT,
      duration_months INTEGER,
      start_date TEXT,
      end_date TEXT,
      amount REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS freezes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days_count INTEGER NOT NULL,
      reason TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS check_ins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      check_in_time TEXT NOT NULL,
      barcode TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      customer_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_barcode ON customers(barcode);
    CREATE INDEX IF NOT EXISTS idx_customers_membership_id ON customers(membership_id);
    CREATE INDEX IF NOT EXISTS idx_check_ins_customer ON check_ins(customer_id);
    CREATE INDEX IF NOT EXISTS idx_check_ins_time ON check_ins(check_in_time);
  `);

  // Default settings
  const defaultSettings: Record<string, string> = {
    gym_name: 'PUMP CLUB',
    gym_tagline: 'Elite Fitness & Strength Club',
    gym_phone: '+20 100 000 0000',
    gym_address: 'Main Branch - Cairo',
    currency: 'EGP',
    expiring_soon_days: '7',
    whatsapp_expired_msg: 'أهلاً بك في Pump Club 👋\nنود إبلاغك أن اشتراكك في الجيم قد انتهى.\nيمكنك تجديد اشتراكك للاستمرار في التدريب معنا 💪\nنتمنى لك تمرينًا موفقًا ❤️',
    whatsapp_expiring_soon_msg: 'مرحباً بك من Pump Club 👋\nنود تذكيرك بأن اشتراكك سينتهي قريباً بتاريخ {endDate}.\nيمكنك التجديد الآن للاستفادة من العروض المستمرة! 💪',
    whatsapp_welcome_msg: 'مرحباً بك في أسرة Pump Club! 🏋️‍♂️\nرقم عضويتك: {membershipId}\nنحن سعداء بانضمامك إلينا ونتمنى لك رحلة رياضية مميزة.',
    whatsapp_freeze_msg: 'تم بنجاح تجميد اشتراكك في Pump Club لمدة {days} يوم.\nتاريخ انتهاء الاشتراك الجديد: {endDate}.\nنتمنى لك السلامة وننتظر عودتك! 🥊',
  };

  const getStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const setStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  for (const [key, value] of Object.entries(defaultSettings)) {
    const existing = getStmt.get(key);
    if (!existing) {
      setStmt.run(key, value);
    }
  }
}

function seedDefaultAdmin(db: DatabaseDriver) {
  const pumpUser = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get('Pump') as any;
  const { hash, salt } = hashPassword('Pump777');
  const now = new Date().toISOString();

  if (!pumpUser) {
    db.prepare(`
      INSERT INTO users (username, password_hash, salt, role, full_name, created_at, updated_at)
      VALUES (?, ?, ?, 'admin', 'مدير النظام', ?, ?)
    `).run('Pump', hash, salt, now, now);
    console.log('User Pump initialized');
  } else {
    // Ensure credentials match Pump777
    db.prepare('UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?').run(
      hash,
      salt,
      now,
      pumpUser.id
    );
  }
}

export function getDb(): DatabaseDriver {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}
