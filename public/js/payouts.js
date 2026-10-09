// ==========================================
// Kitchen Expense Tracker - Payouts & P&L Module
// ==========================================

const Payouts = {
  currentPayouts: [],
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
      console.error('Failed to load payouts:', err);
    }
  },

  renderPayouts() {
    const container = document.getElementById('payoutsListContainer');

    if (this.currentPayouts.length === 0) {
      container.innerHTML = `
        <div class="card empty-state" style="padding: 60px 20px;">
          <div class="empty-state-icon">
            ${window.Icons ? window.Icons.get('payouts', '', 32) : '💰'}
          </div>
          <h4>No Payouts Recorded</h4>
          <p>
            Record payments received from Foodpanda or catering channels to compare against grocery expenses and reveal your net profit margin.
          </p>
          <button class="btn btn-primary btn-sm mt-2" onclick="Payouts.openAddModal()">
            ${window.Icons ? window.Icons.get('plus', '', 16) : '+'} Record First Payout
          </button>
        </div>
      `;
      return;
    }

    const editIcon = window.Icons ? window.Icons.get('edit', '', 16) : '✏️';
    const trashIcon = window.Icons ? window.Icons.get('trash', '', 16) : '🗑️';

    container.innerHTML = this.currentPayouts.map((p) => {
      const isProfit = p.net_profit >= 0;
      const profitClass = isProfit ? 'is-profit' : 'is-loss';
      const profitSign = isProfit ? '+' : '-';
      const profitAbs = Math.abs(p.net_profit);

      return `
        <div class="payout-card" data-id="${p.id}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <span class="payout-cycle-badge">
                ${window.Icons ? window.Icons.get('calendar', '', 14) : '📅'} Period: ${App.formatDate(p.period_start)} – ${App.formatDate(p.period_end)}
              </span>
              <h3 style="font-size: 1.15rem; margin-top: 8px; font-weight: 800; letter-spacing:-0.02em;">
                ${this.escapeHtml(p.notes || 'Payout Settlement')}
              </h3>
              <span class="text-muted text-xs" style="font-weight:600;">
                Received on ${App.formatDate(p.payout_date)}
              </span>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="btn-icon-action edit-payout-btn" data-id="${p.id}" title="Edit Payout">${editIcon}</button>
              <button class="btn-icon-action delete-action delete-payout-btn" data-id="${p.id}" title="Delete Payout">${trashIcon}</button>
            </div>
          </div>

          <!-- 3-Column Math Box: Payout - Expenses = Net Profit -->
          <div class="payout-math-row">
            <div class="payout-math-box">
              <label>Payout Received</label>
              <span class="text-success">${App.formatCurrency(p.amount)}</span>
            </div>
            <div class="payout-math-box">
              <label>Kitchen Expenses</label>
              <span class="text-danger">${App.formatCurrency(p.total_expenses)}</span>
              <div class="text-xs text-muted" style="font-weight:600;">(${p.expense_count} items)</div>
            </div>
            <div class="payout-math-box">
              <label>Net Profit / Loss</label>
              <span class="${isProfit ? 'text-success' : 'text-danger'}">
                ${profitSign} ${App.formatCurrency(profitAbs)}
              </span>
              <div class="mt-1">
                <span class="pulse-badge ${profitClass}">
                  ${p.profit_margin_pct}% margin
                </span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach click events
    container.querySelectorAll('.edit-payout-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        const item = this.currentPayouts.find((p) => p.id === id);
        if (item) this.openEditModal(item);
      });
    });

    container.querySelectorAll('.delete-payout-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        const item = this.currentPayouts.find((p) => p.id === id);
        if (item) this.promptDelete(item);
      });
    });
  },

  openAddModal() {
    document.getElementById('payoutModalTitle').textContent = 'Record Payout';
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
    App.openModal('payoutModal');
  },

  openEditModal(payout) {
    document.getElementById('payoutModalTitle').textContent = 'Edit Payout';
    document.getElementById('payoutIdInput').value = payout.id;
    document.getElementById('payoutDateInput').value = payout.payout_date;
    document.getElementById('payoutAmountInput').value = payout.amount;
    document.getElementById('payoutPeriodStart').value = payout.period_start;
    document.getElementById('payoutPeriodEnd').value = payout.period_end;
    document.getElementById('payoutNotesInput').value = payout.notes || '';
    App.openModal('payoutModal');
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
      App.showToast(isEdit ? 'Payout updated!' : 'Payout saved successfully!', 'success');
      this.load();
      if (App.state.currentTab === 'dashboard') Dashboard.load();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  promptDelete(payout) {
    this.pendingDeleteId = payout.id;
    document.getElementById('deleteConfirmText').innerHTML = `
      Are you sure you want to delete payout <strong>"${this.escapeHtml(payout.notes || 'Payout')}"</strong> 
      for <strong class="text-success">${App.formatCurrency(payout.amount)}</strong>?
      <br><span class="text-muted text-xs">This will remove the P&L comparison record.</span>
    `;
    App.openModal('deleteConfirmModal');
  },

  async confirmDelete() {
    if (!this.pendingDeleteId) return;

    try {
      await App.apiFetch(`/api/payouts/${this.pendingDeleteId}`, { method: 'DELETE' });
      App.closeModal('deleteConfirmModal');
      App.showToast('Payout deleted', 'success');
      this.pendingDeleteId = null;
      this.load();
      if (App.state.currentTab === 'dashboard') Dashboard.load();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
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
    document.getElementById('openAddPayoutModalBtn').addEventListener('click', () => {
      this.openAddModal();
    });

    document.getElementById('payoutForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('payoutIdInput').value;
      const payout_date = document.getElementById('payoutDateInput').value;
      const amount = parseFloat(document.getElementById('payoutAmountInput').value);
      const period_start = document.getElementById('payoutPeriodStart').value;
      const period_end = document.getElementById('payoutPeriodEnd').value;
      const notes = document.getElementById('payoutNotesInput').value.trim() || null;

      if (period_start > period_end) {
        App.showToast('Period start date cannot be after end date', 'error');
        return;
      }

      this.savePayout({
        id: id || undefined,
        payout_date,
        amount,
        period_start,
        period_end,
        notes
      });
    });
  }
};

window.Payouts = Payouts;
document.addEventListener('DOMContentLoaded', () => Payouts.init());
