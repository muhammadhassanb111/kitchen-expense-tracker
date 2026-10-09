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

  // 4. Payouts table
  currentDb.exec(`
    CREATE TABLE IF NOT EXISTS payouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payout_date TEXT NOT NULL,
      amount REAL NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Initialize default settings if not present
  const insertSetting = currentDb.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('currency', 'PKR');
  insertSetting.run('kitchen_name', 'Cloud Kitchen');

  // Initialize default categories if table is empty
  const categoryCount = currentDb.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (categoryCount === 0) {
    const defaultCategories = [
      { name: 'Vegetables', color: '#10b981', icon: '🥦', is_default: 1 },
      { name: 'Meat/Chicken', color: '#ef4444', icon: '🍗', is_default: 1 },
      { name: 'Oil & Ghee', color: '#f59e0b', icon: '🛢️', is_default: 1 },
      { name: 'Spices', color: '#d97706', icon: '🌶️', is_default: 1 },
      { name: 'Dairy', color: '#06b6d4', icon: '🥛', is_default: 1 },
      { name: 'Packaging', color: '#8b5cf6', icon: '📦', is_default: 1 },
      { name: 'Gas/Fuel', color: '#64748b', icon: '🔥', is_default: 1 },
      { name: 'Other', color: '#6b7280', icon: '📋', is_default: 1 }
    ];

    const insertCat = currentDb.prepare('INSERT INTO categories (name, color, icon, is_default) VALUES (@name, @color, @icon, @is_default)');
    const insertMany = currentDb.transaction((cats) => {
      for (const cat of cats) insertCat.run(cat);
    });
    insertMany(defaultCategories);
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
