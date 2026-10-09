// ==========================================
// Kitchen Expense Tracker - App Core Controller
// ==========================================

const App = {
  state: {
    currency: 'PKR',
    kitchenName: 'Cloud Kitchen',
    currentTab: 'dashboard',
    period: 'month',
    startDate: '',
    endDate: '',
    categories: []
  },

  async init() {
    this.setupDateRanges('month');
    this.bindEvents();
    await this.loadSettings();
    await this.loadCategories();
    this.refreshCurrentTab();
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

    // Update tab panes
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
  // Date Range Handling
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
      label.textContent = `Period: ${this.formatDate(this.state.startDate)} – ${this.formatDate(this.state.endDate)}`;
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

      document.getElementById('kitchenTitleDisplay').textContent = this.state.kitchenName;
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
        <div class="ip-box">
          <code>http://localhost:${port}</code>
          <button class="btn btn-sm btn-outline copy-ip-btn" data-url="http://localhost:${port}">Copy</button>
        </div>
      `;
      return;
    }

    container.innerHTML = ips.map((ip) => {
      const url = `http://${ip}:${port}`;
      return `
        <div class="ip-box">
          <code>${url}</code>
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
        <option value="${c.id}">${c.icon} ${c.name}</option>
      `).join('');
    }

    const filterSelect = document.getElementById('expenseCategoryFilter');
    if (filterSelect) {
      const currentVal = filterSelect.value || 'all';
      filterSelect.innerHTML = `<option value="all">All Categories</option>` +
        this.state.categories.map((c) => `
          <option value="${c.id}">${c.icon} ${c.name}</option>
        `).join('');
      filterSelect.value = currentVal;
    }
  },

  // ------------------------------------------
  // Formatting Utilities
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
    const icon = type === 'success' ? '✓' : type === 'error' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  },

  // ------------------------------------------
  // Global Event Listeners
  // ------------------------------------------
  bindEvents() {
    // Navigation (Desktop & Mobile)
    document.addEventListener('click', (e) => {
      const navBtn = e.target.closest('[data-tab]');
      if (navBtn) {
        this.switchTab(navBtn.dataset.tab);
      }
    });

    // Period Filter Pills
    document.querySelectorAll('.pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pill-btn').forEach((b) => b.classList.remove('active'));
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
    document.getElementById('viewAllExpensesBtn').addEventListener('click', () => {
      this.switchTab('expenses');
    });

    // FAB Add button and desktop Add button
    document.getElementById('fabAddBtn').addEventListener('click', () => {
      if (window.Expenses) window.Expenses.openAddModal();
    });
    document.getElementById('addExpenseHeaderBtn').addEventListener('click', () => {
      if (window.Expenses) window.Expenses.openAddModal();
    });

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
        document.getElementById('kitchenTitleDisplay').textContent = kitchenName;
        document.querySelectorAll('.currency-label').forEach((el) => {
          el.textContent = currency;
        });
        this.showToast('Preferences saved successfully', 'success');
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
  }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
