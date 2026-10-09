const express = require('express');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { db, dbPath, clearAllData } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Get local IPv4 addresses
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

// Helper to get settings
function getSetting(key, defaultValue = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

// -------------------------------------------------------------
// AUTH ROUTES (Screen lock disabled as requested for single user)
// -------------------------------------------------------------
app.get('/api/auth/status', (req, res) => {
  res.json({
    pinRequired: false,
    authenticated: true
  });
});

// -------------------------------------------------------------
// NETWORK INFO
// -------------------------------------------------------------
app.get('/api/network-info', (req, res) => {
  const ips = getLocalIPs();
  res.json({
    port: PORT,
    localIPs: ips,
    kitchenName: getSetting('kitchen_name', 'Cloud Kitchen'),
    currency: getSetting('currency', 'PKR')
  });
});

// -------------------------------------------------------------
// SETTINGS ROUTES
// -------------------------------------------------------------
app.get('/api/settings', (req, res) => {
  const currency = getSetting('currency', 'PKR');
  const kitchenName = getSetting('kitchen_name', 'Cloud Kitchen');
  const ips = getLocalIPs();
  res.json({ currency, kitchenName, localIPs: ips, port: PORT });
});

app.post('/api/settings', (req, res) => {
  const { currency, kitchenName } = req.body;
  if (currency) setSetting('currency', currency.trim());
  if (kitchenName) setSetting('kitchen_name', kitchenName.trim());
  res.json({
    success: true,
    currency: getSetting('currency', 'PKR'),
    kitchenName: getSetting('kitchen_name', 'Cloud Kitchen')
  });
});

// Reset / Clear Data endpoint
app.post('/api/data/clear', (req, res) => {
  try {
    clearAllData();
    res.json({ success: true, message: 'All expense and payout data cleared successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CATEGORIES ROUTES
// -------------------------------------------------------------
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, 
             COUNT(e.id) as expense_count,
             COALESCE(SUM(e.amount), 0) as total_spent
      FROM categories c
      LEFT JOIN expenses e ON c.id = e.category_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', (req, res) => {
  try {
    const { name, color, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const trimmedName = name.trim();
    const catColor = color && color.trim() ? color.trim() : '#6366f1';
    const catIcon = icon && icon.trim() ? icon.trim() : '🏷️';

    const insert = db.prepare(`
      INSERT INTO categories (name, color, icon, is_default)
      VALUES (?, ?, ?, 0)
    `);
    const result = insert.run(trimmedName, catColor, catIcon);
    const newCat = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newCat);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Category already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  try {
    const { id } = req.params;
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!cat) return res.status(404).json({ error: 'Category not found' });

    const expensesCount = db.prepare('SELECT COUNT(*) as count FROM expenses WHERE category_id = ?').get(id).count;
    if (expensesCount > 0) {
      return res.status(400).json({
        error: `Cannot delete "${cat.name}" because it contains ${expensesCount} expense records. Reassign them first.`
      });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ success: true, message: `Category "${cat.name}" deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// EXPENSES ROUTES
// -------------------------------------------------------------
app.get('/api/expenses', (req, res) => {
  try {
    const { startDate, endDate, categoryId, search } = req.query;
    let query = `
      SELECT e.*, 
             c.name as category_name, 
             c.color as category_color, 
             c.icon as category_icon
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += ` AND e.date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND e.date <= ?`;
      params.push(endDate);
    }
    if (categoryId && categoryId !== 'all') {
      query += ` AND e.category_id = ?`;
      params.push(categoryId);
    }
    if (search && search.trim()) {
      query += ` AND (e.item_name LIKE ? OR e.vendor LIKE ? OR e.notes LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY e.date DESC, e.id DESC`;

    const expenses = db.prepare(query).all(...params);

    const totalAmount = expenses.reduce((sum, item) => sum + item.amount, 0);
    const count = expenses.length;

    res.json({
      expenses,
      summary: {
        totalAmount,
        count
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', (req, res) => {
  try {
    const { date, item_name, category_id, amount, quantity, unit, vendor, notes } = req.body;

    if (!date) return res.status(400).json({ error: 'Date is required (YYYY-MM-DD)' });
    if (!item_name || !item_name.trim()) return res.status(400).json({ error: 'Item name is required' });
    if (!category_id) return res.status(400).json({ error: 'Category is required' });
    if (amount === undefined || amount === null || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount greater than 0 is required' });
    }

    const insert = db.prepare(`
      INSERT INTO expenses (date, item_name, category_id, amount, quantity, unit, vendor, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      date,
      item_name.trim(),
      category_id,
      Number(amount),
      quantity ? Number(quantity) : null,
      unit ? unit.trim() : null,
      vendor ? vendor.trim() : null,
      notes ? notes.trim() : null
    );

    const created = db.prepare(`
      SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/expenses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { date, item_name, category_id, amount, quantity, unit, vendor, notes } = req.body;

    const existing = db.prepare('SELECT id FROM expenses WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Expense not found' });

    if (!date) return res.status(400).json({ error: 'Date is required' });
    if (!item_name || !item_name.trim()) return res.status(400).json({ error: 'Item name is required' });
    if (!category_id) return res.status(400).json({ error: 'Category is required' });
    if (amount === undefined || amount === null || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount greater than 0 is required' });
    }

    const update = db.prepare(`
      UPDATE expenses
      SET date = ?, item_name = ?, category_id = ?, amount = ?, quantity = ?, unit = ?, vendor = ?, notes = ?
      WHERE id = ?
    `);

    update.run(
      date,
      item_name.trim(),
      category_id,
      Number(amount),
      quantity ? Number(quantity) : null,
      unit ? unit.trim() : null,
      vendor ? vendor.trim() : null,
      notes ? notes.trim() : null,
      id
    );

    const updated = db.prepare(`
      SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.id = ?
    `).get(id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT id FROM expenses WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Expense not found' });

    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// PAYOUTS & PROFIT / LOSS ROUTES
// -------------------------------------------------------------
app.get('/api/payouts', (req, res) => {
  try {
    const payouts = db.prepare(`
      SELECT * FROM payouts ORDER BY payout_date DESC, id DESC
    `).all();

    const expenseStmt = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses,
             COUNT(*) as expense_count
      FROM expenses
      WHERE date >= ? AND date <= ?
    `);

    const result = payouts.map((p) => {
      const stats = expenseStmt.get(p.period_start, p.period_end);
      const totalExpenses = stats.total_expenses;
      const netProfit = p.amount - totalExpenses;
      const profitMarginPct = p.amount > 0 ? ((netProfit / p.amount) * 100).toFixed(1) : 0;

      return {
        ...p,
        total_expenses: totalExpenses,
        expense_count: stats.expense_count,
        net_profit: netProfit,
        profit_margin_pct: Number(profitMarginPct)
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payouts', (req, res) => {
  try {
    const { payout_date, amount, period_start, period_end, notes } = req.body;

    if (!payout_date) return res.status(400).json({ error: 'Payout date is required' });
    if (amount === undefined || amount === null || isNaN(amount) || Number(amount) < 0) {
      return res.status(400).json({ error: 'Valid payout amount is required' });
    }
    if (!period_start || !period_end) {
      return res.status(400).json({ error: 'Period start and end dates are required' });
    }
    if (period_start > period_end) {
      return res.status(400).json({ error: 'Period start date cannot be after end date' });
    }

    const insert = db.prepare(`
      INSERT INTO payouts (payout_date, amount, period_start, period_end, notes)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      payout_date,
      Number(amount),
      period_start,
      period_end,
      notes ? notes.trim() : null
    );

    const created = db.prepare('SELECT * FROM payouts WHERE id = ?').get(result.lastInsertRowid);
    const stats = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses, COUNT(*) as expense_count
      FROM expenses WHERE date >= ? AND date <= ?
    `).get(created.period_start, created.period_end);

    const netProfit = created.amount - stats.total_expenses;
    const profitMarginPct = created.amount > 0 ? ((netProfit / created.amount) * 100).toFixed(1) : 0;

    res.status(201).json({
      ...created,
      total_expenses: stats.total_expenses,
      expense_count: stats.expense_count,
      net_profit: netProfit,
      profit_margin_pct: Number(profitMarginPct)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/payouts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { payout_date, amount, period_start, period_end, notes } = req.body;

    const existing = db.prepare('SELECT id FROM payouts WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Payout not found' });

    if (!payout_date) return res.status(400).json({ error: 'Payout date is required' });
    if (amount === undefined || amount === null || isNaN(amount) || Number(amount) < 0) {
      return res.status(400).json({ error: 'Valid payout amount is required' });
    }
    if (!period_start || !period_end) {
      return res.status(400).json({ error: 'Period start date cannot be after end date' });
    }
    if (period_start > period_end) {
      return res.status(400).json({ error: 'Period start date cannot be after end date' });
    }

    db.prepare(`
      UPDATE payouts
      SET payout_date = ?, amount = ?, period_start = ?, period_end = ?, notes = ?
      WHERE id = ?
    `).run(payout_date, Number(amount), period_start, period_end, notes ? notes.trim() : null, id);

    const updated = db.prepare('SELECT * FROM payouts WHERE id = ?').get(id);
    const stats = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses, COUNT(*) as expense_count
      FROM expenses WHERE date >= ? AND date <= ?
    `).get(updated.period_start, updated.period_end);

    const netProfit = updated.amount - stats.total_expenses;
    const profitMarginPct = updated.amount > 0 ? ((netProfit / updated.amount) * 100).toFixed(1) : 0;

    res.json({
      ...updated,
      total_expenses: stats.total_expenses,
      expense_count: stats.expense_count,
      net_profit: netProfit,
      profit_margin_pct: Number(profitMarginPct)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/payouts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT id FROM payouts WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Payout not found' });

    db.prepare('DELETE FROM payouts WHERE id = ?').run(id);
    res.json({ success: true, message: 'Payout deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// DASHBOARD & ANALYTICS ROUTES
// -------------------------------------------------------------
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [];
    if (startDate && endDate) {
      dateFilter = 'WHERE e.date >= ? AND e.date <= ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE e.date >= ?';
      params.push(startDate);
    } else if (endDate) {
      dateFilter = 'WHERE e.date <= ?';
      params.push(endDate);
    }

    // 1. Total spent & count
    const totalRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_spent, COUNT(*) as expense_count
      FROM expenses e
      ${dateFilter}
    `).get(...params);

    // 2. Category breakdown
    const categoryBreakdown = db.prepare(`
      SELECT c.id, c.name, c.color, c.icon,
             COALESCE(SUM(e.amount), 0) as total,
             COUNT(e.id) as count
      FROM categories c
      LEFT JOIN expenses e ON c.id = e.category_id ${dateFilter ? 'AND ' + dateFilter.replace('WHERE ', '') : ''}
      GROUP BY c.id
      HAVING total > 0
      ORDER BY total DESC
    `).all(...params);

    const totalSpent = totalRow.total_spent;
    const categoryWithPct = categoryBreakdown.map((c) => ({
      ...c,
      percentage: totalSpent > 0 ? Number(((c.total / totalSpent) * 100).toFixed(1)) : 0
    }));

    // 3. Daily spending trend
    const dailyTrend = db.prepare(`
      SELECT e.date, COALESCE(SUM(e.amount), 0) as total, COUNT(*) as count
      FROM expenses e
      ${dateFilter}
      GROUP BY e.date
      ORDER BY e.date ASC
    `).all(...params);

    // 4. Payouts covering or within this period
    let payoutFilter = '';
    const payoutParams = [];
    if (startDate && endDate) {
      payoutFilter = 'WHERE (period_start <= ? AND period_end >= ?) OR (payout_date >= ? AND payout_date <= ?)';
      payoutParams.push(endDate, startDate, startDate, endDate);
    }
    const payoutsInPeriod = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_payouts, COUNT(*) as payout_count
      FROM payouts
      ${payoutFilter}
    `).get(...payoutParams);

    const totalPayouts = payoutsInPeriod.total_payouts;
    const netProfit = totalPayouts - totalSpent;

    // 5. Recent 5 expenses
    const recentExpenses = db.prepare(`
      SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      ${dateFilter}
      ORDER BY e.date DESC, e.id DESC
      LIMIT 5
    `).all(...params);

    res.json({
      summary: {
        totalSpent,
        expenseCount: totalRow.expense_count,
        totalPayouts,
        netProfit,
        profitMarginPct: totalPayouts > 0 ? Number(((netProfit / totalPayouts) * 100).toFixed(1)) : null
      },
      categoryBreakdown: categoryWithPct,
      dailyTrend,
      recentExpenses
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CSV EXPORT ROUTE
// -------------------------------------------------------------
app.get('/api/export/csv', (req, res) => {
  try {
    const { startDate, endDate, categoryId, search } = req.query;

    let query = `
      SELECT e.id, e.date, e.item_name, c.name as category_name,
             e.amount, e.quantity, e.unit, e.vendor, e.notes
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += ` AND e.date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND e.date <= ?`;
      params.push(endDate);
    }
    if (categoryId && categoryId !== 'all') {
      query += ` AND e.category_id = ?`;
      params.push(categoryId);
    }
    if (search && search.trim()) {
      query += ` AND (e.item_name LIKE ? OR e.vendor LIKE ? OR e.notes LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY e.date ASC, e.id ASC`;
    const rows = db.prepare(query).all(...params);

    const currency = getSetting('currency', 'PKR');

    const headers = ['ID', 'Date', 'Item Name', 'Category', `Amount (${currency})`, 'Quantity', 'Unit', 'Vendor', 'Notes'];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += headers.map(escapeCsv).join(',') + '\r\n';

    let totalAmount = 0;
    for (const row of rows) {
      totalAmount += row.amount;
      csvContent += [
        row.id,
        row.date,
        row.item_name,
        row.category_name,
        row.amount.toFixed(2),
        row.quantity !== null ? row.quantity : '',
        row.unit || '',
        row.vendor || '',
        row.notes || ''
      ].map(escapeCsv).join(',') + '\r\n';
    }

    csvContent += ['', '', 'TOTAL', '', totalAmount.toFixed(2), '', '', '', ''].map(escapeCsv).join(',') + '\r\n';

    const filename = `expenses_${startDate || 'all'}_to_${endDate || 'all'}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// DATABASE BACKUP ROUTE
// -------------------------------------------------------------
app.get('/api/backup/db', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const backupFileName = `kitchen_backup_${timestamp}.db`;
    const tempBackupPath = path.join(os.tmpdir(), backupFileName);

    await db.backup(tempBackupPath);

    res.download(tempBackupPath, backupFileName, (err) => {
      try {
        if (fs.existsSync(tempBackupPath)) fs.unlinkSync(tempBackupPath);
      } catch (e) {}
    });
  } catch (err) {
    res.status(500).json({ error: 'Database backup failed: ' + err.message });
  }
});

// Serve frontend for all non-API paths
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server listening on 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log('\n======================================================');
  console.log('  🍳  KITCHEN EXPENSE TRACKER IS ONLINE');
  console.log('======================================================');
  console.log(`  Local:            http://localhost:${PORT}`);
  if (ips.length > 0) {
    ips.forEach((ip) => {
      console.log(`  On your Wi-Fi:    http://${ip}:${PORT}`);
    });
  } else {
    console.log(`  Network:          http://0.0.0.0:${PORT}`);
  }
  console.log('  Mode:             Single User (Screen Lock Disabled)');
  console.log('======================================================\n');
});
