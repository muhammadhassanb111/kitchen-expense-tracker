const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'kitchen.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and durability
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  // 1. Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 2. Categories table
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('currency', 'PKR');
  insertSetting.run('kitchen_name', 'Cloud Kitchen');

  // Initialize default categories if table is empty
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
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

    const insertCat = db.prepare('INSERT INTO categories (name, color, icon, is_default) VALUES (@name, @color, @icon, @is_default)');
    const insertMany = db.transaction((cats) => {
      for (const cat of cats) insertCat.run(cat);
    });
    insertMany(defaultCategories);
    console.log('Categories initialized.');
  }
}

function clearAllData() {
  db.exec(`
    DELETE FROM expenses;
    DELETE FROM payouts;
    DELETE FROM sqlite_sequence WHERE name IN ('expenses', 'payouts');
  `);
  console.log('All expense and payout data cleared. Database is clean.');
}

initDatabase();

module.exports = {
  db,
  dbPath,
  clearAllData
};
