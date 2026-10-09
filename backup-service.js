const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Simple .env loader without external dependencies
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)?$/);
        if (match) {
          const key = match[1];
          let value = (match[2] || '').trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    } catch (e) {
      console.warn('Could not read .env file:', e.message);
    }
  }
}

loadEnv();

const projectDir = __dirname;
const dataDir = path.join(projectDir, 'data');
const dbPath = path.join(dataDir, 'kitchen.db');
const backupsDir = path.join(projectDir, 'backups');

if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

let dbInstance = null;
let debounceTimer = null;

const syncState = {
  enabled: process.env.AUTO_GIT_BACKUP !== 'false',
  isSyncing: false,
  lastSyncTime: null,
  lastSyncStatus: 'idle', // 'idle' | 'success' | 'offline' | 'error'
  lastSyncMessage: 'Auto-backup initialized and ready',
  stats: { expenses: 0, payouts: 0 }
};

function setDb(db) {
  dbInstance = db;
  // Create initial local snapshot on startup
  try {
    checkpointWal();
    createLocalBackup('startup');
  } catch (e) {
    console.warn('[Backup] Startup snapshot notice:', e.message);
  }
}

// Checkpoint SQLite WAL mode so kitchen.db contains all transactions
function checkpointWal() {
  if (!dbInstance) return;
  try {
    dbInstance.pragma('wal_checkpoint(TRUNCATE)');
  } catch (e) {
    console.warn('[Backup] WAL checkpoint warning:', e.message);
  }
}

// Create a local backup in the backups/ directory
function createLocalBackup(prefix = 'kitchen_backup') {
  if (!fs.existsSync(dbPath)) return null;

  try {
    checkpointWal();

    // 1. Always maintain latest snapshot
    const latestPath = path.join(backupsDir, 'kitchen_backup_latest.db');
    fs.copyFileSync(dbPath, latestPath);

    // 2. Maintain a daily timestamped snapshot
    const today = new Date().toISOString().split('T')[0];
    const dailyPath = path.join(backupsDir, `kitchen_backup_${today}.db`);
    if (!fs.existsSync(dailyPath) || prefix === 'daily') {
      fs.copyFileSync(dbPath, dailyPath);
    }

    // Prune daily backups older than 30 days to avoid clutter
    pruneOldBackups(30);

    return latestPath;
  } catch (e) {
    console.error('[Backup] Failed to create local backup:', e.message);
    return null;
  }
}

// Keep disk clean: prune old backup files beyond maxDays
function pruneOldBackups(maxDays = 30) {
  try {
    const files = fs.readdirSync(backupsDir);
    const now = Date.now();
    const maxAgeMs = maxDays * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (file.startsWith('kitchen_backup_') && file.endsWith('.db') && file !== 'kitchen_backup_latest.db') {
        const filePath = path.join(backupsDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
        }
      }
    }
  } catch (e) {}
}

// Get current database record counts for commit messages & UI
function getDbCounts() {
  if (!dbInstance) return { expenses: 0, payouts: 0 };
  try {
    const expenses = dbInstance.prepare('SELECT COUNT(*) as c FROM expenses').get().c;
    const payouts = dbInstance.prepare('SELECT COUNT(*) as c FROM payouts').get().c;
    return { expenses, payouts };
  } catch (e) {
    return { expenses: 0, payouts: 0 };
  }
}

// Push latest DB to GitHub repository
async function pushToGit(reason = 'data change') {
  if (syncState.isSyncing) return;
  syncState.isSyncing = true;

  try {
    checkpointWal();
    createLocalBackup();

    const counts = getDbCounts();
    syncState.stats = counts;

    // Check if git is available
    let isGitRepo = false;
    try {
      execSync('git rev-parse --is-inside-work-tree', { cwd: projectDir, stdio: 'pipe' });
      isGitRepo = true;
    } catch (e) {
      isGitRepo = false;
    }

    if (!isGitRepo) {
      syncState.lastSyncStatus = 'offline';
      syncState.lastSyncMessage = 'Local backup saved. Git repo not initialized.';
      syncState.isSyncing = false;
      return;
    }

    // Stage data/kitchen.db
    execSync('git add data/kitchen.db', { cwd: projectDir, stdio: 'pipe' });

    // Check if data/kitchen.db has staged changes
    const statusOutput = execSync('git status --porcelain data/kitchen.db', { cwd: projectDir, stdio: 'pipe' }).toString().trim();

    if (!statusOutput) {
      // No changes to commit, but check if there are unpushed commits
      try {
        const unpushed = execSync('git log origin/main..HEAD --oneline', { cwd: projectDir, stdio: 'pipe' }).toString().trim();
        if (!unpushed) {
          syncState.lastSyncStatus = 'success';
          syncState.lastSyncMessage = `Database in sync with GitHub (${counts.expenses} expenses, ${counts.payouts} payouts)`;
          syncState.isSyncing = false;
          return;
        }
      } catch (e) {
        // Can continue to push if remote tracking check fails
      }
    } else {
      // Commit changed database
      const now = new Date();
      const timeStr = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const commitMsg = `Auto-backup database: ${timeStr} [${counts.expenses} expenses, ${counts.payouts} payouts] (${reason})`;
      
      execSync(`git commit -m "${commitMsg}"`, { cwd: projectDir, stdio: 'pipe' });
    }

    // Push to GitHub using authenticated URL if token is present
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO || 'https://github.com/muhammadhassanb111/kitchen-expense-tracker.git';

    let pushUrl = repo;
    if (token) {
      const cleanRepo = repo.replace(/^https?:\/\//, '');
      pushUrl = `https://${token}@${cleanRepo}`;
    }

    execSync(`git push ${pushUrl} main`, { cwd: projectDir, stdio: 'pipe' });

    syncState.lastSyncTime = new Date().toISOString();
    syncState.lastSyncStatus = 'success';
    syncState.lastSyncMessage = `Successfully synced to GitHub (${counts.expenses} expenses, ${counts.payouts} payouts)`;
    console.log(`[Cloud Backup] ${syncState.lastSyncMessage}`);
  } catch (err) {
    const errMsg = err.message || '';
    if (errMsg.includes('Could not resolve host') || errMsg.includes('fatal: unable to access') || errMsg.includes('Network is unreachable')) {
      syncState.lastSyncStatus = 'offline';
      syncState.lastSyncMessage = 'Offline: Saved in local DB & backups/. Will push to GitHub when connected.';
      console.warn(`[Cloud Backup] Offline mode active: changes safe locally.`);
    } else {
      syncState.lastSyncStatus = 'error';
      syncState.lastSyncMessage = 'Backup saved locally. Git push notice: ' + (errMsg.split('\n')[0] || 'Unknown issue');
      console.warn(`[Cloud Backup] Git notice: ${errMsg}`);
    }
  } finally {
    syncState.isSyncing = false;
  }
}

// Debounced auto-backup triggered on every write (expenses, payouts, categories)
function triggerAutoBackup(reason = 'update') {
  // 1. Immediately checkpoint and create local disk snapshot (0ms latency for physical data safety)
  try {
    checkpointWal();
    createLocalBackup();
  } catch (e) {
    console.error('[Backup] Instant local save notice:', e.message);
  }

  // 2. Debounce git push (wait 4s after last change to batch rapid entries)
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    pushToGit(reason);
  }, 4000);
}

// Get full status for UI and health checks
function getStatus() {
  const counts = getDbCounts();
  let localFiles = [];
  try {
    const files = fs.readdirSync(backupsDir);
    localFiles = files
      .filter(f => f.endsWith('.db'))
      .map(name => {
        const filePath = path.join(backupsDir, name);
        const stat = fs.statSync(filePath);
        return {
          name,
          sizeKb: Math.round(stat.size / 1024),
          modified: stat.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.modified) - new Date(a.modified));
  } catch (e) {}

  return {
    ...syncState,
    stats: counts,
    localBackups: localFiles
  };
}

module.exports = {
  setDb,
  checkpointWal,
  createLocalBackup,
  triggerAutoBackup,
  pushToGit,
  getStatus,
  backupsDir,
  dbPath
};
