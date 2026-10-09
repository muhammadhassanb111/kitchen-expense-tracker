// ==========================================
// Kitchen Expense Tracker - App Core Controller
// 2026 Next-Gen Fintech Edition
// ==========================================

const App = {
  state: {
    theme: localStorage.getItem('kitchen_theme') || 'light',
    currency: 'PKR',
    kitchenName: 'Cloud Kitchen',
    currentTab: 'dashboard',
    period: 'month',
    startDate: '',
    endDate: '',
    categories: []
  },

  async init() {
    this.initTheme();
    this.setupDateRanges('month');
    this.bindEvents();
    if (window.Icons) window.Icons.replacePlaceholders();

    await this.loadSettings();
    await this.loadCategories();
    this.refreshCurrentTab();
  },

  // ------------------------------------------
  // Theme Management (Light / Dark Mode)
  // ------------------------------------------
  initTheme() {
    this.setTheme(this.state.theme);
  },

  setTheme(theme) {
    this.state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kitchen_theme', theme);

    // Update Mobile and Desktop Theme Buttons
    const isDark = theme === 'dark';
    const mobileIconEl = document.getElementById('mobileThemeIcon');
    const desktopIconEl = document.getElementById('desktopThemeIcon');
    const desktopLabelEl = document.getElementById('desktopThemeLabel');

    const iconHtml = window.Icons ? window.Icons.get(isDark ? 'sun' : 'moon', '', 18) : (isDark ? '☀️' : '🌙');

    if (mobileIconEl) mobileIconEl.innerHTML = iconHtml;
    if (desktopIconEl) desktopIconEl.innerHTML = iconHtml;
    if (desktopLabelEl) desktopLabelEl.textContent = isDark ? 'Theme: Dark' : 'Theme: Light';
  },

  toggleTheme() {
    const next = this.state.theme === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    this.showToast(`Switched to ${next} theme`, 'info');
  },

  // ------------------------------------------
  // API Fetch Helper
  // ------------------------------------------
  async apiFetch(url, options = {}) {
    options.headers = options.headers || {};
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  },

  // ------------------------------------------
  // Tab Switching & Navigation
  // ------------------------------------------
  switchTab(tabName) {
    this.state.currentTab = tabName;

    // Update bottom nav & desktop nav buttons
    document.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab panes with smooth glide transition
    document.querySelectorAll('.tab-pane').forEach((pane) => {
      pane.classList.remove('active');
    });
    const activePane = document.getElementById(`tab-${tabName}`);
    if (activePane) activePane.classList.add('active');

    // Filter bar visibility (only on Dashboard & Expenses)
    const filterBar = document.getElementById('globalFilterBar');
    if (tabName === 'dashboard' || tabName === 'expenses') {
      filterBar.style.display = 'flex';
    } else {
      filterBar.style.display = 'none';
    }

    // Refresh content for this tab
    this.refreshCurrentTab();
  },

  refreshCurrentTab() {
    switch (this.state.currentTab) {
      case 'dashboard':
        if (window.Dashboard) window.Dashboard.load();
        break;
      case 'expenses':
        if (window.Expenses) window.Expenses.load();
        break;
      case 'payouts':
        if (window.Payouts) window.Payouts.load();
        break;
      case 'categories':
        if (window.Categories) window.Categories.load();
        break;
      case 'settings':
        this.renderSettingsView();
        break;
    }
  },

  // ------------------------------------------
  // Date Range Handling & Segmented Control
  // ------------------------------------------
  setupDateRanges(periodType) {
    this.state.period = periodType;
    const now = new Date();
    const formatYMD = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (periodType === 'today') {
      const todayStr = formatYMD(now);
      this.state.startDate = todayStr;
      this.state.endDate = todayStr;
    } else if (periodType === 'week') {
      const day = now.getDay();
      const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMon));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      this.state.startDate = formatYMD(monday);
      this.state.endDate = formatYMD(sunday);
    } else if (periodType === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      this.state.startDate = formatYMD(firstDay);
      this.state.endDate = formatYMD(lastDay);
    }

    this.updatePeriodDisplay();
  },

  updatePeriodDisplay() {
    const customRow = document.getElementById('customDateRow');
    if (this.state.period === 'custom') {
      customRow.style.display = 'flex';
      document.getElementById('filterStartDate').value = this.state.startDate;
      document.getElementById('filterEndDate').value = this.state.endDate;
    } else {
      customRow.style.display = 'none';
    }

    const label = document.getElementById('activePeriodLabel');
    if (label) {
      const calIcon = window.Icons ? window.Icons.get('calendar', '', 14) : '📅';
      label.innerHTML = `${calIcon} <span>${this.formatDate(this.state.startDate)} – ${this.formatDate(this.state.endDate)}</span>`;
    }
  },

  // ------------------------------------------
  // Settings & Network Information
  // ------------------------------------------
  async loadSettings() {
    try {
      const data = await this.apiFetch('/api/settings');
      this.state.currency = data.currency || 'PKR';
      this.state.kitchenName = data.kitchenName || 'Cloud Kitchen';

      const titleDesktop = document.getElementById('kitchenTitleDisplay');
      const titleMobile = document.getElementById('mobileKitchenTitle');
      if (titleDesktop) titleDesktop.textContent = this.state.kitchenName;
      if (titleMobile) titleMobile.textContent = this.state.kitchenName;

      document.querySelectorAll('.currency-label').forEach((el) => {
        el.textContent = this.state.currency;
      });
      document.getElementById('kitchenNameInput').value = this.state.kitchenName;
      document.getElementById('currencySelect').value = this.state.currency;

      this.renderNetworkIPs(data.localIPs, data.port);
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  },

  renderNetworkIPs(ips, port) {
    const container = document.getElementById('wifiAddressesContainer');
    if (!container) return;

    if (!ips || ips.length === 0) {
      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-chip); padding:10px 14px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
          <code style="font-weight:700; color:var(--brand); font-family:monospace; font-size:1rem;">http://localhost:${port}</code>
          <button class="btn btn-sm btn-outline copy-ip-btn" data-url="http://localhost:${port}">Copy</button>
        </div>
      `;
      return;
    }

    container.innerHTML = ips.map((ip) => {
      const url = `http://${ip}:${port}`;
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-chip); padding:10px 14px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
          <code style="font-weight:700; color:var(--brand); font-family:monospace; font-size:1rem;">${url}</code>
          <button class="btn btn-sm btn-outline copy-ip-btn" data-url="${url}">Copy Link</button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.copy-ip-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.url).then(() => {
          this.showToast('Copied address to clipboard!', 'success');
        });
      });
    });
  },

  renderSettingsView() {
    this.loadSettings();
    this.loadBackupStatus();
  },

  async loadBackupStatus() {
    try {
      const data = await this.apiFetch('/api/backup/status');
      const dot = document.getElementById('cloudStatusDot');
      const title = document.getElementById('cloudBackupTitle');
      const subtitle = document.getElementById('cloudBackupSubtitle');
      const snapshotsList = document.getElementById('localSnapshotsContainer');

      if (!dot || !title || !subtitle) return;

      if (data.isSyncing) {
        dot.style.background = 'var(--brand)';
        dot.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.6)';
        title.textContent = 'Syncing with GitHub...';
        subtitle.textContent = 'Sending latest database changes to remote repository';
      } else if (data.lastSyncStatus === 'success') {
        dot.style.background = 'var(--inflow)';
        dot.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.6)';
        title.textContent = 'Cloud Auto-Backup Active';
        const timeFormatted = data.lastSyncTime ? new Date(data.lastSyncTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Just now';
        subtitle.textContent = `GitHub Synced at ${timeFormatted} • ${data.stats.expenses} expenses, ${data.stats.payouts} payouts safely stored`;
      } else if (data.lastSyncStatus === 'offline') {
        dot.style.background = 'var(--accent-warn, #f59e0b)';
        dot.style.boxShadow = '0 0 10px rgba(245, 158, 11, 0.6)';
        title.textContent = 'Offline Mode (Local Backups Safe)';
        subtitle.textContent = 'All changes saved in SQLite and local disk snapshots. Will sync to GitHub when reconnected.';
      } else {
        dot.style.background = 'var(--inflow)';
        title.textContent = 'Auto-Backup & Local Protection Active';
        subtitle.textContent = data.lastSyncMessage || 'Every record is instantly saved.';
      }

      if (snapshotsList && data.localBackups) {
        if (data.localBackups.length === 0) {
          snapshotsList.innerHTML = '<span class="text-muted text-xs">No snapshots created yet. Add an expense to trigger the first backup!</span>';
        } else {
          snapshotsList.innerHTML = data.localBackups.slice(0, 5).map(snap => {
            const dateStr = new Date(snap.modified).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
            return `
              <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); padding:8px 12px; border-radius:var(--radius-xs); border:1px solid var(--border-subtle);">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:0.82rem; font-weight:600; color:var(--text-main); font-family:monospace;">${snap.name}</span>
                  <span class="text-muted text-xs">(${snap.sizeKb} KB • ${dateStr})</span>
                </div>
                <button class="btn btn-xs btn-outline restore-snapshot-btn" data-file="${snap.name}">Restore</button>
              </div>
            `;
          }).join('');
        }
      }
    } catch (e) {
      console.warn('Could not load backup status:', e);
    }
  },

  async loadCategories() {
    try {
      this.state.categories = await this.apiFetch('/api/categories');
      this.populateCategorySelects();
    } catch (e) {
      console.error('Failed to load categories:', e);
    }
  },

  populateCategorySelects() {
    const modalSelect = document.getElementById('expCategorySelect');
    if (modalSelect) {
      modalSelect.innerHTML = this.state.categories.map((c) => `
        <option value="${c.id}">${c.name}</option>
      `).join('');
    }

    const filterSelect = document.getElementById('expenseCategoryFilter');
    if (filterSelect) {
      const currentVal = filterSelect.value || 'all';
      filterSelect.innerHTML = `<option value="all">All Categories</option>` +
        this.state.categories.map((c) => `
          <option value="${c.id}">${c.name}</option>
        `).join('');
      filterSelect.value = currentVal;
    }
  },

  // ------------------------------------------
  // Formatting & Animated Count-Up Numbers
  // ------------------------------------------
  formatCurrency(amount) {
    const num = Number(amount) || 0;
    return `${this.state.currency} ${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  },

  todayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  animateCount(elementId, targetValue, prefix = '', suffix = '') {
    const el = document.getElementById(elementId);
    if (!el) return;

    const start = 0;
    const end = Math.round(Number(targetValue) || 0);
    const duration = 650;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * ease);

      el.textContent = `${prefix}${current.toLocaleString('en-US')}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = `${prefix}${end.toLocaleString('en-US')}${suffix}`;
      }
    };

    requestAnimationFrame(step);
  },

  // ------------------------------------------
  // Modal & Toast Helpers
  // ------------------------------------------
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconName = 'info';
    if (type === 'success') iconName = 'check';
    if (type === 'error') iconName = 'alertTriangle';

    const iconSvg = window.Icons ? window.Icons.get(iconName, '', 18) : '✓';
    toast.innerHTML = `<span style="display:flex;align-items:center;">${iconSvg}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px) scale(0.95)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  },

  // ------------------------------------------
  // Global Event Listeners
  // ------------------------------------------
  bindEvents() {
    // Theme toggle buttons (Mobile and Desktop)
    const mobileToggle = document.getElementById('mobileThemeToggleBtn');
    const desktopToggle = document.getElementById('desktopThemeToggleBtn');
    if (mobileToggle) mobileToggle.addEventListener('click', () => this.toggleTheme());
    if (desktopToggle) desktopToggle.addEventListener('click', () => this.toggleTheme());

    // Navigation buttons (Sidebar & Bottom Nav)
    document.addEventListener('click', (e) => {
      const navBtn = e.target.closest('[data-tab]');
      if (navBtn) {
        this.switchTab(navBtn.dataset.tab);
      }
    });

    // Segmented Period Filter
    document.querySelectorAll('.segment-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.segment-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const period = btn.dataset.period;
        if (period === 'custom') {
          this.state.period = 'custom';
          document.getElementById('customDateRow').style.display = 'flex';
        } else {
          this.setupDateRanges(period);
          this.refreshCurrentTab();
        }
      });
    });

    // Custom date range apply button
    document.getElementById('applyCustomDatesBtn').addEventListener('click', () => {
      const start = document.getElementById('filterStartDate').value;
      const end = document.getElementById('filterEndDate').value;
      if (!start || !end) {
        this.showToast('Please select both start and end dates', 'error');
        return;
      }
      if (start > end) {
        this.showToast('Start date cannot be after end date', 'error');
        return;
      }
      this.state.startDate = start;
      this.state.endDate = end;
      this.updatePeriodDisplay();
      this.refreshCurrentTab();
      this.showToast('Date range applied', 'info');
    });

    // Close modals on [data-close-modal] buttons
    document.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('[data-close-modal]');
      if (closeBtn) {
        this.closeModal(closeBtn.dataset.closeModal);
      }
    });

    // Close modals when clicking backdrop
    document.querySelectorAll('.modal-overlay').forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('open');
        }
      });
    });

    // View All Expenses button on Dashboard
    const viewAllBtn = document.getElementById('viewAllExpensesBtn');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', () => this.switchTab('expenses'));
    }

    // Quick Add buttons (Mobile FAB, Desktop Top, Expenses Header)
    const fabBtn = document.getElementById('fabAddBtn');
    const desktopQuickBtn = document.getElementById('desktopQuickAddBtn');
    const addHeaderBtn = document.getElementById('addExpenseHeaderBtn');

    if (fabBtn) fabBtn.addEventListener('click', () => window.Expenses && window.Expenses.openAddModal());
    if (desktopQuickBtn) desktopQuickBtn.addEventListener('click', () => window.Expenses && window.Expenses.openAddModal());
    if (addHeaderBtn) addHeaderBtn.addEventListener('click', () => window.Expenses && window.Expenses.openAddModal());

    // Save Kitchen Preferences Form
    document.getElementById('kitchenSettingsForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const kitchenName = document.getElementById('kitchenNameInput').value.trim();
      const currency = document.getElementById('currencySelect').value;

      try {
        await this.apiFetch('/api/settings', {
          method: 'POST',
          body: { kitchenName, currency }
        });
        this.state.kitchenName = kitchenName;
        this.state.currency = currency;
        const dTitle = document.getElementById('kitchenTitleDisplay');
        const mTitle = document.getElementById('mobileKitchenTitle');
        if (dTitle) dTitle.textContent = kitchenName;
        if (mTitle) mTitle.textContent = kitchenName;

        document.querySelectorAll('.currency-label').forEach((el) => {
          el.textContent = currency;
        });
        this.showToast('Preferences saved successfully', 'success');
        this.refreshCurrentTab();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    // Clear All Data Button in Settings
    const clearDataBtn = document.getElementById('clearAllDataBtn');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete ALL expenses and payouts? Everything will be reset to 0.')) {
          try {
            await this.apiFetch('/api/data/clear', { method: 'POST' });
            this.showToast('All expense and payout data cleared!', 'success');
            await this.loadCategories();
            this.refreshCurrentTab();
          } catch (err) {
            this.showToast(err.message, 'error');
          }
        }
      });
    }

    // CSV Download All
    document.getElementById('downloadAllCsvBtn').addEventListener('click', () => {
      window.location.href = '/api/export/csv';
    });

    // Database Download backup button
    document.getElementById('downloadDbBtn').addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/api/backup/db';
    });

    // Manual GitHub Cloud Sync Button
    const syncGitBtn = document.getElementById('syncGitNowBtn');
    const syncGitText = document.getElementById('syncGitBtnText');
    if (syncGitBtn) {
      syncGitBtn.addEventListener('click', async () => {
        syncGitBtn.disabled = true;
        if (syncGitText) syncGitText.textContent = 'Syncing...';
        try {
          await this.apiFetch('/api/backup/sync-now', { method: 'POST' });
          this.showToast('Database backed up to GitHub!', 'success');
          await this.loadBackupStatus();
        } catch (err) {
          this.showToast('Git sync notice: ' + err.message, 'error');
        } finally {
          syncGitBtn.disabled = false;
          if (syncGitText) syncGitText.textContent = 'Sync GitHub Now';
        }
      });
    }

    // Database File Restore Trigger & Upload
    const restoreTrigger = document.getElementById('restoreDbTriggerBtn');
    const restoreInput = document.getElementById('restoreDbFileInput');
    if (restoreTrigger && restoreInput) {
      restoreTrigger.addEventListener('click', () => restoreInput.click());
      restoreInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm(`Restore from backup file "${file.name}"?\n\nThis will replace the active database with the data in this backup file.`)) {
          restoreInput.value = '';
          return;
        }

        try {
          const response = await fetch('/api/backup/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: file
          });
          const res = await response.json();
          if (!response.ok) throw new Error(res.error || 'Restore failed');
          this.showToast(res.message || 'Database restored successfully!', 'success');
          await this.loadCategories();
          this.refreshCurrentTab();
          await this.loadBackupStatus();
        } catch (err) {
          this.showToast(err.message, 'error');
        } finally {
          restoreInput.value = '';
        }
      });
    }

    // Restore from local snapshot button click
    document.addEventListener('click', async (e) => {
      const snapBtn = e.target.closest('.restore-snapshot-btn');
      if (snapBtn) {
        const filename = snapBtn.dataset.file;
        if (!confirm(`Restore from snapshot "${filename}"?\n\nThis will safely roll back the database to this point in time.`)) return;

        try {
          const res = await this.apiFetch('/api/backup/restore-snapshot', {
            method: 'POST',
            body: { filename }
          });
          this.showToast(res.message || 'Snapshot restored successfully!', 'success');
          await this.loadCategories();
          this.refreshCurrentTab();
          await this.loadBackupStatus();
        } catch (err) {
          this.showToast(err.message, 'error');
        }
      }
    });
  }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
