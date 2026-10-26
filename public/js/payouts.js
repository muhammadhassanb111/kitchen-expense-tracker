// ==========================================
// Kitchen Expense Tracker - Income & P&L Module
// Unified Direct Orders & Weekly Payouts
// ==========================================

const Payouts = {
  currentPayouts: [],
  currentFilter: 'all', // 'all' | 'direct_order' | 'weekly_payout'
  pendingDeleteId: null,

  init() {
    this.bindEvents();
  },

  async load() {
    try {
      const data = await App.apiFetch('/api/payouts');
      this.currentPayouts = data || [];
      this.renderPayouts();
    } catch (err) {
      console.error('Failed to load income:', err);
    }
  },

  renderPayouts() {
    const container = document.getElementById('payoutsListContainer');
    if (!container) return;

    let items = this.currentPayouts;
    if (this.currentFilter && this.currentFilter !== 'all') {
      items = items.filter((p) => (p.income_type || 'weekly_payout') === this.currentFilter);
    }

    if (items.length === 0) {
      const emptyTitle = window.I18n ? window.I18n.t('no_payouts_found', 'No income or payouts recorded yet.') : 'No income or payouts recorded yet.';
      const emptyDesc = window.I18n ? window.I18n.t('payouts_desc', 'Record daily direct orders and weekly Foodpanda payouts to compare against grocery costs and reveal your real profit margin.') : 'Record daily direct orders and weekly Foodpanda payouts to compare against grocery costs and reveal your real profit margin.';
      const emptyBtn = window.I18n ? window.I18n.t('btn_add_daily_income', '+ Daily Direct Income') : '+ Add Daily Income';

      container.innerHTML = `
        <div class="card empty-state" style="padding: 60px 20px;">
          <div class="empty-state-icon">
            ${window.Icons ? window.Icons.get('payouts', '', 32) : '💰'}
          </div>
          <h4>${emptyTitle}</h4>
          <p>${emptyDesc}</p>
          <button class="btn btn-primary btn-sm mt-2" onclick="Payouts.openAddModal('direct_order')">
            ${window.Icons ? window.Icons.get('plus', '', 16) : '+'} ${emptyBtn}
          </button>
        </div>
      `;
      return;
    }

    const editIcon = window.Icons ? window.Icons.get('edit', '', 16) : '✏️';
    const trashIcon = window.Icons ? window.Icons.get('trash', '', 16) : '🗑️';

    const lblPeriod = window.I18n ? window.I18n.t('payout_period_label', 'Period:') : 'Period:';
    const lblReceived = window.I18n ? window.I18n.t('payout_received_on', 'Received on') : 'Received on';
    const lblPayoutReceived = window.I18n ? window.I18n.t('payout_received_box', 'Income Received') : 'Income Received';
    const lblKitchenExpenses = window.I18n ? window.I18n.t('payout_kitchen_expenses', 'Kitchen Expenses') : 'Kitchen Expenses';
    const lblNetProfit = window.I18n ? window.I18n.t('kpi_net_profit', 'Net Profit / Loss') : 'Net Profit / Loss';

    container.innerHTML = items.map((p) => {
      const isDirect = (p.income_type === 'direct_order');
      const isProfit = p.net_profit >= 0;
      const profitClass = isProfit ? 'is-profit' : 'is-loss';
      const profitSign = isProfit ? '+' : '-';
      const profitAbs = Math.abs(p.net_profit);
      const itemsCountStr = window.I18n && window.I18n.isUrdu() ? `(${p.expense_count} اشیاء)` : `(${p.expense_count} items)`;
      const marginStr = window.I18n && window.I18n.isUrdu() ? `${p.profit_margin_pct}% منافع` : `${p.profit_margin_pct}% margin`;

      const typeBadge = isDirect
        ? `<span class="badge-income-type badge-direct">💵 ${window.I18n ? window.I18n.t('badge_direct_order', 'Direct Order') : 'Direct Order'}</span>`
        : `<span class="badge-income-type badge-weekly">📅 ${window.I18n ? window.I18n.t('badge_weekly_payout', 'Weekly Payout') : 'Weekly Payout'}</span>`;

      const methodBadge = isDirect
        ? `<span class="badge-method">${p.payment_method === 'online' ? '📲 Online' : '💵 Cash'}</span>`
        : '';

      const cycleInfo = isDirect
        ? `${lblReceived} <strong>${App.formatDate(p.payout_date)}</strong>`
        : `${window.Icons ? window.Icons.get('calendar', '', 14) : '📅'} ${lblPeriod} <strong>${App.formatDate(p.period_start)} – ${App.formatDate(p.period_end)}</strong>`;

      const defaultTitle = isDirect
        ? (window.I18n && window.I18n.isUrdu() ? 'ڈائریکٹ کسٹمر آرڈرز' : 'Direct Customer Orders')
        : (window.I18n && window.I18n.isUrdu() ? 'فوڈ پانڈا ہفتہ وار پے آؤٹ' : 'Foodpanda Settlement');

      return `
        <div class="payout-card" data-id="${p.id}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap: 12px;">
            <div style="flex:1;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                ${typeBadge}
                ${methodBadge}
                <span class="text-muted text-xs" style="font-weight:600;">
                  ${cycleInfo}
                </span>
              </div>
              <h3 style="font-size: 1.15rem; margin-top: 8px; font-weight: 800; letter-spacing:-0.02em;">
                ${this.escapeHtml(p.notes || defaultTitle)}
              </h3>
              ${!isDirect ? `<span class="text-muted text-xs" style="font-weight:600;">${lblReceived} ${App.formatDate(p.payout_date)}</span>` : ''}
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="btn-icon-action edit-payout-btn" data-id="${p.id}" title="Edit Income">${editIcon}</button>
              <button class="btn-icon-action delete-action delete-payout-btn" data-id="${p.id}" title="Delete Income">${trashIcon}</button>
            </div>
          </div>

          <!-- 3-Column Math Box: Income - Expenses = Net Profit -->
          <div class="payout-math-row">
            <div class="payout-math-box">
              <label>${lblPayoutReceived}</label>
              <div class="payout-math-val text-success">${App.formatCurrency(p.amount)}</div>
            </div>
            <div class="payout-math-box">
              <label>${lblKitchenExpenses}</label>
              <div class="payout-math-val text-danger">
                ${App.formatCurrency(p.total_expenses)}
                <span class="text-xs text-muted" style="font-weight:600; display:block;">${itemsCountStr}</span>
              </div>
            </div>
            <div class="payout-math-box">
              <label>${lblNetProfit}</label>
              <div class="payout-math-val ${isProfit ? 'text-success' : 'text-danger'}">
                ${profitSign} ${App.formatCurrency(profitAbs)}
                <div class="mt-1">
                  <span class="pulse-badge ${profitClass}">
                    ${marginStr}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach click events
    container.querySelectorAll('.edit-payout-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id, 10);
        const item = this.currentPayouts.find((p) => p.id === id);
        if (item) this.openEditModal(item);
      });
    });

    container.querySelectorAll('.delete-payout-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id, 10);
        const item = this.currentPayouts.find((p) => p.id === id);
        if (item) this.promptDelete(item);
      });
    });
  },

  setModalType(type) {
    const isDirect = (type === 'direct_order');
    document.getElementById('incomeTypeInput').value = isDirect ? 'direct_order' : 'weekly_payout';

    const btnDirect = document.getElementById('typeBtnDirect');
    const btnWeekly = document.getElementById('typeBtnWeekly');
    if (btnDirect && btnWeekly) {
      if (isDirect) {
        btnDirect.classList.add('active');
        btnWeekly.classList.remove('active');
      } else {
        btnDirect.classList.remove('active');
        btnWeekly.classList.add('active');
      }
    }

    const pmGroup = document.getElementById('paymentMethodGroup');
    if (pmGroup) pmGroup.style.display = isDirect ? 'block' : 'none';

    const periodGroup = document.getElementById('payoutPeriodGroup');
    const startInput = document.getElementById('payoutPeriodStart');
    const endInput = document.getElementById('payoutPeriodEnd');
    if (periodGroup) {
      periodGroup.style.display = isDirect ? 'none' : 'block';
    }
    if (startInput && endInput) {
      startInput.required = !isDirect;
      endInput.required = !isDirect;
    }

    const titleEl = document.getElementById('payoutModalTitle');
    if (titleEl) {
      const isUrdu = window.I18n && window.I18n.isUrdu();
      if (isDirect) {
        titleEl.textContent = isUrdu ? 'روزانہ ڈائریکٹ آمدنی درج کریں' : 'Record Daily Direct Income';
      } else {
        titleEl.textContent = isUrdu ? 'ہفتہ وار فوڈ پانڈا پے آؤٹ درج کریں' : 'Record Weekly Foodpanda Payout';
      }
    }
  },

  openAddModal(defaultType = 'direct_order') {
    const saveBtn = document.getElementById('savePayoutBtn');
    if (saveBtn) saveBtn.textContent = window.I18n ? window.I18n.t('btn_save_payout', 'Save Income') : 'Save Income';
    document.getElementById('payoutIdInput').value = '';
    document.getElementById('payoutForm').reset();
    document.getElementById('payoutDateInput').value = App.todayString();

    // Default period: last 7 days up to today
    const now = new Date();
    const past7 = new Date();
    past7.setDate(now.getDate() - 7);

    const formatYMD = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    document.getElementById('payoutPeriodStart').value = formatYMD(past7);
    document.getElementById('payoutPeriodEnd').value = formatYMD(now);

    // Reset payment method to cash
    const cashRadio = document.getElementById('pmCash');
    if (cashRadio) cashRadio.checked = true;
    this.updatePaymentMethodUI('cash');

    this.setModalType(defaultType);
    App.openModal('payoutModal');
  },

  openEditModal(payout) {
    const saveBtn = document.getElementById('savePayoutBtn');
    if (saveBtn) saveBtn.textContent = window.I18n ? window.I18n.t('btn_update_expense', 'Save Changes') : 'Save Changes';
    document.getElementById('payoutIdInput').value = payout.id;
    document.getElementById('payoutDateInput').value = payout.payout_date;
    document.getElementById('payoutAmountInput').value = payout.amount;
    document.getElementById('payoutPeriodStart').value = payout.period_start || payout.payout_date;
    document.getElementById('payoutPeriodEnd').value = payout.period_end || payout.payout_date;
    document.getElementById('payoutNotesInput').value = payout.notes || '';

    const method = payout.payment_method || 'cash';
    const radio = document.querySelector(`input[name="payment_method"][value="${method}"]`);
    if (radio) radio.checked = true;
    this.updatePaymentMethodUI(method);

    const type = payout.income_type || 'weekly_payout';
    this.setModalType(type);
    App.openModal('payoutModal');
  },

  updatePaymentMethodUI(method) {
    const cashLabel = document.getElementById('pmCashLabel');
    const onlineLabel = document.getElementById('pmOnlineLabel');
    if (cashLabel && onlineLabel) {
      if (method === 'online') {
        onlineLabel.classList.add('active');
        cashLabel.classList.remove('active');
      } else {
        cashLabel.classList.add('active');
        onlineLabel.classList.remove('active');
      }
    }
  },

  async savePayout(formData) {
    const isEdit = !!formData.id;
    const url = isEdit ? `/api/payouts/${formData.id}` : '/api/payouts';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      await App.apiFetch(url, {
        method,
        body: formData
      });
      App.closeModal('payoutModal');
      const toastMsg = window.I18n ? window.I18n.t('toast_income_added', 'Income recorded successfully!') : 'Income recorded successfully!';
      App.showToast(toastMsg, 'success');
      this.load();
      if (window.Dashboard) {
        window.Dashboard.cachedData = {};
        window.Dashboard.load();
      }
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  promptDelete(payout) {
    const defaultTitle = payout.income_type === 'direct_order'
      ? (window.I18n && window.I18n.isUrdu() ? 'ڈائریکٹ کسٹمر آمدنی' : 'Direct Customer Income')
      : (window.I18n && window.I18n.isUrdu() ? 'فوڈ پانڈا پے آؤٹ' : 'Foodpanda Payout');

    const confirmMsg = window.I18n && window.I18n.isUrdu()
      ? `کیا آپ واقعی یہ آمدنی <strong>"${this.escapeHtml(payout.notes || defaultTitle)}"</strong> (<strong class="text-success">${App.formatCurrency(payout.amount)}</strong>) حذف کرنا چاہتے ہیں؟<br><span class="text-muted text-xs" style="margin-top:4px; display:block;">اس سے منافع کا موازنہ ختم ہو جائے گا۔</span>`
      : `Are you sure you want to delete <strong>"${this.escapeHtml(payout.notes || defaultTitle)}"</strong> for <strong class="text-success">${App.formatCurrency(payout.amount)}</strong>?<br><span class="text-muted text-xs" style="margin-top:4px; display:block;">This will update the P&L comparison record.</span>`;

    App.promptDeleteConfirm(
      confirmMsg,
      async () => {
        try {
          await App.apiFetch(`/api/payouts/${payout.id}`, { method: 'DELETE' });
          App.closeModal('deleteConfirmModal');
          const delToast = window.I18n ? window.I18n.t('toast_payout_deleted', 'Record deleted') : 'Record deleted';
          App.showToast(delToast, 'success');
          this.load();
          if (window.Dashboard) {
            window.Dashboard.cachedData = {};
            window.Dashboard.load();
          }
        } catch (err) {
          App.showToast(err.message, 'error');
        }
      }
    );
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  bindEvents() {
    const addDailyBtn = document.getElementById('openAddDailyIncomeBtn');
    if (addDailyBtn) {
      addDailyBtn.addEventListener('click', () => {
        this.openAddModal('direct_order');
      });
    }

    const addWeeklyBtn = document.getElementById('openAddPayoutModalBtn');
    if (addWeeklyBtn) {
      addWeeklyBtn.addEventListener('click', () => {
        this.openAddModal('weekly_payout');
      });
    }

    // Modal Income Type Toggle
    const btnDirect = document.getElementById('typeBtnDirect');
    const btnWeekly = document.getElementById('typeBtnWeekly');
    if (btnDirect) {
      btnDirect.addEventListener('click', () => this.setModalType('direct_order'));
    }
    if (btnWeekly) {
      btnWeekly.addEventListener('click', () => this.setModalType('weekly_payout'));
    }

    // Payment method radio toggles
    const pmRadios = document.querySelectorAll('input[name="payment_method"]');
    pmRadios.forEach((r) => {
      r.addEventListener('change', () => this.updatePaymentMethodUI(r.value));
    });

    // Income Filter Pills in Tab
    const filterToggle = document.getElementById('incomeFilterToggle');
    if (filterToggle) {
      filterToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.income-pill-btn');
        if (!btn) return;
        filterToggle.querySelectorAll('.income-pill-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter || 'all';
        this.renderPayouts();
      });
    }

    // Form Submit
    const form = document.getElementById('payoutForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('payoutIdInput').value;
        const income_type = document.getElementById('incomeTypeInput').value || 'direct_order';
        const payout_date = document.getElementById('payoutDateInput').value;
        const amount = parseFloat(document.getElementById('payoutAmountInput').value);
        const period_start = document.getElementById('payoutPeriodStart').value;
        const period_end = document.getElementById('payoutPeriodEnd').value;
        const notes = document.getElementById('payoutNotesInput').value.trim() || null;
        const pmRadio = document.querySelector('input[name="payment_method"]:checked');
        const payment_method = pmRadio ? pmRadio.value : 'cash';

        if (income_type === 'weekly_payout') {
          if (!period_start || !period_end) {
            App.showToast('Period start and end dates are required for weekly payouts', 'error');
            return;
          }
          if (period_start > period_end) {
            App.showToast('Period start date cannot be after end date', 'error');
            return;
          }
        }

        this.savePayout({
          id: id || undefined,
          income_type,
          payout_date,
          amount,
          payment_method,
          period_start: income_type === 'direct_order' ? payout_date : period_start,
          period_end: income_type === 'direct_order' ? payout_date : period_end,
          notes
        });
      });
    }
  }
};

window.Payouts = Payouts;
document.addEventListener('DOMContentLoaded', () => Payouts.init());
