const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'kitchen.db');

function openDatabase(file) {
  const instance = new Database(file);
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');
  instance.pragma('synchronous = NORMAL');
  instance.pragma('cache_size = -64000');
  instance.pragma('temp_store = MEMORY');
  instance.pragma('mmap_size = 268435456');
  return instance;
}

let currentDb = openDatabase(dbPath);

// Transparent proxy so re-opening the database on restore doesn't break existing references
const db = new Proxy({}, {
  get(target, prop) {
    if (prop === '_raw') return currentDb;
    const val = currentDb[prop];
    return typeof val === 'function' ? val.bind(currentDb) : val;
  }
});

function initDatabase() {
  // 1. Settings table
  currentDb.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 2. Categories table
  currentDb.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // 3. Expenses table
  currentDb.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      item_name TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      quantity REAL,
      unit TEXT,
      vendor TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );
  `);

  // 4. Payouts / Income table
  currentDb.exec(`
    CREATE TABLE IF NOT EXISTS payouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payout_date TEXT NOT NULL,
      amount REAL NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      notes TEXT,
      income_type TEXT DEFAULT 'weekly_payout',
      payment_method TEXT DEFAULT 'cash',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);
    CREATE INDEX IF NOT EXISTS idx_payouts_payout_date ON payouts(payout_date);
    CREATE INDEX IF NOT EXISTS idx_payouts_income_type ON payouts(income_type);
  `);

  // Migrate payouts schema if missing income_type or payment_method
  try {
    const payoutCols = currentDb.prepare("PRAGMA table_info(payouts)").all().map(c => c.name);
    if (!payoutCols.includes('income_type')) {
      currentDb.prepare("ALTER TABLE payouts ADD COLUMN income_type TEXT DEFAULT 'weekly_payout'").run();
    }
    if (!payoutCols.includes('payment_method')) {
      currentDb.prepare("ALTER TABLE payouts ADD COLUMN payment_method TEXT DEFAULT 'cash'").run();
    }
  } catch (err) {
    console.error('Payouts migration notice:', err.message);
  }

  // Initialize default settings if not present
  const insertSetting = currentDb.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('currency', 'PKR');
  insertSetting.run('kitchen_name', 'Cloud Kitchen');
  insertSetting.run('pin_enabled', '1');
  insertSetting.run('app_pin', '7327');

  // Initialize and migrate to standard 6 simplified categories
  const standardCategories = [
    { name: 'Vegetables', color: '#10b981', icon: '🥦', is_default: 1 },
    { name: 'Milk - Cheese - Khoya', color: '#06b6d4', icon: '🥛', is_default: 1 },
    { name: 'Meat/Chicken', color: '#ef4444', icon: '🍗', is_default: 1 },
    { name: 'Oil/Ghee', color: '#f59e0b', icon: '🛢️', is_default: 1 },
    { name: 'Packing', color: '#8b5cf6', icon: '📦', is_default: 1 },
    { name: 'Spices', color: '#d97706', icon: '🌶️', is_default: 1 }
  ];

  try {
    // 1. Rename existing legacy category names
    currentDb.prepare(`UPDATE categories SET name = 'Milk - Cheese - Khoya', icon = '🥛', color = '#06b6d4' WHERE name = 'Dairy'`).run();
    currentDb.prepare(`UPDATE categories SET name = 'Oil/Ghee', icon = '🛢️', color = '#f59e0b' WHERE name = 'Oil & Ghee'`).run();
    currentDb.prepare(`UPDATE categories SET name = 'Packing', icon = '📦', color = '#8b5cf6' WHERE name = 'Packaging'`).run();

    // 2. Remove non-standard categories and their associated records to keep only the requested 6
    const allowed = ['Vegetables', 'Milk - Cheese - Khoya', 'Meat/Chicken', 'Oil/Ghee', 'Packing', 'Spices'];
    const placeholders = allowed.map(() => '?').join(',');

    currentDb.prepare(`
      DELETE FROM expenses 
      WHERE category_id IN (
        SELECT id FROM categories WHERE name NOT IN (${placeholders})
      )
    `).run(...allowed);

    currentDb.prepare(`
      DELETE FROM categories WHERE name NOT IN (${placeholders})
    `).run(...allowed);

    // 3. Insert any missing standard categories
    const insertCat = currentDb.prepare('INSERT OR IGNORE INTO categories (name, color, icon, is_default) VALUES (@name, @color, @icon, @is_default)');
    for (const cat of standardCategories) {
      insertCat.run(cat);
    }
  } catch (err) {
    console.error('Category migration notice:', err.message);
  }
}

function clearAllData() {
  currentDb.exec(`
    DELETE FROM expenses;
    DELETE FROM payouts;
    DELETE FROM sqlite_sequence WHERE name IN ('expenses', 'payouts');
  `);
}

function restoreDatabase(bufferOrFilePath) {
  const backupsDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const emergencySafety = path.join(backupsDir, `pre_restore_safety_${Date.now()}.db`);
  try {
    currentDb.pragma('wal_checkpoint(TRUNCATE)');
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, emergencySafety);
    }
  } catch (e) {}

  try {
    currentDb.close();
  } catch (e) {}

  if (fs.existsSync(dbPath + '-wal')) {
    try { fs.unlinkSync(dbPath + '-wal'); } catch (e) {}
  }
  if (fs.existsSync(dbPath + '-shm')) {
    try { fs.unlinkSync(dbPath + '-shm'); } catch (e) {}
  }

  try {
    if (Buffer.isBuffer(bufferOrFilePath)) {
      const header = bufferOrFilePath.slice(0, 16).toString();
      if (!header.startsWith('SQLite format 3')) {
        throw new Error('Not a valid SQLite database file.');
      }
      fs.writeFileSync(dbPath, bufferOrFilePath);
    } else if (typeof bufferOrFilePath === 'string' && fs.existsSync(bufferOrFilePath)) {
      fs.copyFileSync(bufferOrFilePath, dbPath);
    } else {
      throw new Error('Backup source file not found.');
    }

    currentDb = openDatabase(dbPath);
    initDatabase();
    
    // Quick test
    const stats = currentDb.prepare('SELECT COUNT(*) as expCount FROM expenses').get();
    return { success: true, expenses: stats.expCount };
  } catch (err) {
    if (fs.existsSync(emergencySafety)) {
      try {
        fs.copyFileSync(emergencySafety, dbPath);
      } catch (e) {}
    }
    currentDb = openDatabase(dbPath);
    throw err;
  }
}

initDatabase();

module.exports = {
  db,
  dbPath,
  clearAllData,
  restoreDatabase
};
