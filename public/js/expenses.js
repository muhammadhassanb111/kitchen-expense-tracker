// ==========================================
// Kitchen Expense Tracker - Expenses Module
// ==========================================

const Expenses = {
  currentExpenses: [],
  cachedData: {},
  searchDebounceTimer: null,
  pendingDeleteId: null,

  init() {
    this.bindEvents();
  },

  async load() {
    try {
      const search = document.getElementById('expenseSearchInput').value.trim();
      const categoryId = document.getElementById('expenseCategoryFilter').value;

      let url = `/api/expenses?startDate=${App.state.startDate}&endDate=${App.state.endDate}`;
      if (categoryId && categoryId !== 'all') url += `&categoryId=${encodeURIComponent(categoryId)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const cacheKey = url;
      if (this.cachedData[cacheKey]) {
        const cached = this.cachedData[cacheKey];
        this.currentExpenses = cached.expenses || [];
        this.renderSummary(cached.summary);
        this.renderExpensesList();
      }

      const data = await App.apiFetch(url);
      this.cachedData[cacheKey] = data;
      this.currentExpenses = data.expenses || [];
      this.renderSummary(data.summary);
      this.renderExpensesList();
    } catch (err) {
      console.error('Failed to load expenses:', err);
    }
  },

  renderSummary(summary) {
    document.getElementById('filteredCount').textContent = summary ? summary.count : 0;
    document.getElementById('filteredTotal').textContent = App.formatCurrency(summary ? summary.totalAmount : 0);
  },

  renderExpensesList() {
    const container = document.getElementById('expensesContainer');

    if (this.currentExpenses.length === 0) {
      container.className = 'expenses-wrapper';
      const noExpTitle = window.I18n ? window.I18n.t('no_expenses_found', 'No Expenses Found') : 'No Expenses Found';
      const noExpDesc = window.I18n ? window.I18n.t('no_expenses_hint', 'No expenses match the current filter or date range. Tap below to record one.') : 'No expenses match the current filter or date range. Tap below to record one.';
      const addExpText = window.I18n ? window.I18n.t('add_expense', '+ Add Expense') : '+ Add New Expense';

      container.innerHTML = `
        <div class="card empty-state" style="padding: 60px 20px;">
          <div class="empty-state-icon">
            ${window.Icons ? window.Icons.get('expenses', '', 32) : '🧾'}
          </div>
          <h4>${noExpTitle}</h4>
          <p>${noExpDesc}</p>
          <button class="btn btn-primary btn-sm mt-2" onclick="Expenses.openAddModal()">
            ${window.Icons ? window.Icons.get('plus', '', 16) : '+'} ${addExpText}
          </button>
        </div>
      `;
      return;
    }

    const editIcon = window.Icons ? window.Icons.get('edit', '', 16) : '✏️';
    const trashIcon = window.Icons ? window.Icons.get('trash', '', 16) : '🗑️';

    // 1. Mobile Cards View
    const cardsHtml = `
      <div class="expenses-wrapper has-desktop-view">
        ${this.currentExpenses.map((item) => {
          const catName = window.I18n ? window.I18n.getCategoryName(item.category_name) : item.category_name;
          const unitStr = item.unit ? (window.I18n ? window.I18n.getUnitName(item.unit) : item.unit) : '';
          return `
          <div class="expense-card" data-id="${item.id}">
            <div class="exp-card-header">
              <div class="flex-1">
                <div class="exp-item-title">${this.escapeHtml(item.item_name)}</div>
                <div class="exp-card-meta mt-1">
                  <span class="category-pill" style="background-color: ${item.category_color}">
                    ${this.escapeHtml(catName)}
                  </span>
                  <span>${App.formatDate(item.date)}</span>
                  ${item.quantity ? `<span>• ${item.quantity} ${this.escapeHtml(unitStr)}</span>` : ''}
                </div>
              </div>
              <div class="exp-card-amount">
                ${App.formatCurrency(item.amount)}
              </div>
            </div>

            <div class="exp-card-footer">
              <div class="exp-vendor-note">
                ${item.vendor ? `🏪 <strong>${this.escapeHtml(item.vendor)}</strong>` : ''}
                ${item.vendor && item.notes ? ' • ' : ''}
                ${item.notes ? `<em>${this.escapeHtml(item.notes)}</em>` : ''}
              </div>
              <div class="exp-actions">
                <button class="btn-icon-action edit-expense-btn" data-id="${item.id}" title="Edit Expense" aria-label="Edit">
                  ${editIcon}
                </button>
                <button class="btn-icon-action delete-action delete-expense-btn" data-id="${item.id}" title="Delete Expense" aria-label="Delete">
                  ${trashIcon}
                </button>
              </div>
            </div>
          </div>
        `;}).join('')}
      </div>
    `;

    // 2. Desktop Table View
    const thDate = window.I18n ? window.I18n.t('form_date', 'Date') : 'Date';
    const thItem = window.I18n ? window.I18n.t('form_item_name', 'Item Name') : 'Item Name';
    const thCat = window.I18n ? window.I18n.t('form_category', 'Category') : 'Category';
    const thQty = window.I18n ? window.I18n.t('form_quantity', 'Quantity') : 'Quantity';
    const thVendor = window.I18n ? window.I18n.t('form_vendor', 'Vendor') : 'Vendor';
    const thNotes = window.I18n ? window.I18n.t('form_notes', 'Notes') : 'Notes';
    const thAmount = window.I18n ? window.I18n.t('form_amount', 'Amount') : 'Amount';
    const thActions = window.I18n ? window.I18n.t('th_actions', 'Actions') : 'Actions';

    const tableHtml = `
      <div class="desktop-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>${thDate}</th>
              <th>${thItem}</th>
              <th>${thCat}</th>
              <th>${thQty}</th>
              <th>${thVendor}</th>
              <th>${thNotes}</th>
              <th style="text-align: right;">${thAmount}</th>
              <th style="text-align: center; width: 90px;">${thActions}</th>
            </tr>
          </thead>
          <tbody>
            ${this.currentExpenses.map((item) => {
              const catName = window.I18n ? window.I18n.getCategoryName(item.category_name) : item.category_name;
              const unitStr = item.unit ? (window.I18n ? window.I18n.getUnitName(item.unit) : item.unit) : '';
              return `
              <tr data-id="${item.id}">
                <td style="white-space: nowrap; font-weight: 600; color: var(--text-muted);">${App.formatDate(item.date)}</td>
                <td><strong style="color: var(--text-main);">${this.escapeHtml(item.item_name)}</strong></td>
                <td>
                  <span class="category-pill" style="background-color: ${item.category_color}">
                    ${this.escapeHtml(catName)}
                  </span>
                </td>
                <td style="color: var(--text-muted); font-weight: 500;">${item.quantity ? `${item.quantity} ${this.escapeHtml(unitStr)}` : '—'}</td>
                <td style="color: var(--text-muted);">${item.vendor ? this.escapeHtml(item.vendor) : '—'}</td>
                <td style="color: var(--text-muted); font-size: 0.825rem; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${item.notes ? this.escapeHtml(item.notes) : '—'}
                </td>
                <td style="text-align: right; font-weight: 800; color: var(--outflow); white-space: nowrap;">
                  ${App.formatCurrency(item.amount)}
                </td>
                <td style="text-align: center;">
                  <div style="display: flex; gap: 6px; justify-content: center;">
                    <button class="btn-icon-action edit-expense-btn" data-id="${item.id}" title="Edit">${editIcon}</button>
                    <button class="btn-icon-action delete-action delete-expense-btn" data-id="${item.id}" title="Delete">${trashIcon}</button>
                  </div>
                </td>
              </tr>
            `;}).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.className = '';
    container.innerHTML = cardsHtml + tableHtml;

    container.querySelectorAll('.edit-expense-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        const item = this.currentExpenses.find((e) => e.id === id);
        if (item) this.openEditModal(item);
      });
    });

    container.querySelectorAll('.delete-expense-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        const item = this.currentExpenses.find((e) => e.id === id);
        if (item) this.promptDelete(item);
      });
    });
  },

  openAddModal(preselectedCategoryId = null) {
    document.getElementById('expenseModalTitle').textContent = window.I18n ? window.I18n.t('modal_add_expense_title', 'Add Expense') : 'Add Expense';
    const saveBtn = document.getElementById('saveExpenseBtn');
    if (saveBtn) saveBtn.textContent = window.I18n ? window.I18n.t('btn_save_expense', 'Add Expense') : 'Add Expense';
    document.getElementById('expenseIdInput').value = '';
    document.getElementById('expenseForm').reset();
    document.getElementById('expDateInput').value = App.todayString();
    document.getElementById('expItemInput').value = '';

    // Reset scroll position of modal body to top
    const modalBody = document.querySelector('#expenseModal .modal-body');
    if (modalBody) modalBody.scrollTop = 0;

    // Apply preselected category if passed
    const catSelect = document.getElementById('expCategorySelect');
    if (preselectedCategoryId && catSelect) {
      catSelect.value = preselectedCategoryId;
    }

    App.openModal('expenseModal');
  },

  openEditModal(item) {
    document.getElementById('expenseModalTitle').textContent = window.I18n ? window.I18n.t('modal_edit_expense_title', 'Edit Expense') : 'Edit Expense';
    const saveBtn = document.getElementById('saveExpenseBtn');
    if (saveBtn) saveBtn.textContent = window.I18n ? window.I18n.t('btn_update_expense', 'Save Changes') : 'Save Changes';
    document.getElementById('expenseIdInput').value = item.id;
    document.getElementById('expDateInput').value = item.date;
    document.getElementById('expCategorySelect').value = item.category_id;
    document.getElementById('expItemInput').value = item.item_name || '';
    document.getElementById('expAmountInput').value = item.amount;
    document.getElementById('expQtyInput').value = item.quantity || '';
    document.getElementById('expUnitSelect').value = item.unit || '';
    document.getElementById('expVendorInput').value = item.vendor || '';
    document.getElementById('expNotesInput').value = item.notes || '';

    // Reset scroll position of modal body to top
    const modalBody = document.querySelector('#expenseModal .modal-body');
    if (modalBody) modalBody.scrollTop = 0;

    App.openModal('expenseModal');
  },

  async saveExpense(formData) {
    const isEdit = !!formData.id;
    const url = isEdit ? `/api/expenses/${formData.id}` : '/api/expenses';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      await App.apiFetch(url, {
        method,
        body: formData
      });
      App.closeModal('expenseModal');
      const toastMsg = isEdit
        ? (window.I18n ? window.I18n.t('toast_expense_updated', 'Expense updated!') : 'Expense updated!')
        : (window.I18n ? window.I18n.t('toast_expense_added', 'Expense added successfully!') : 'Expense added successfully!');
      App.showToast(toastMsg, 'success');
      this.cachedData = {};
      if (window.Dashboard) window.Dashboard.cachedData = {};
      if (window.Categories) {
        window.Categories.categoryExpensesCache = {};
        window.Categories.load();
      }
      App.loadCategories();
      this.load();
      if (App.state.currentTab === 'dashboard') Dashboard.load();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  promptDelete(item) {
    const confirmMsg = window.I18n && window.I18n.isUrdu()
      ? `کیا آپ واقعی <strong>"${this.escapeHtml(item.item_name)}"</strong> کا خرچہ (<strong class="text-danger">${App.formatCurrency(item.amount)}</strong>) حذف کرنا چاہتے ہیں؟<br><span class="text-muted text-xs">اس عمل کو واپس نہیں لایا جا سکتا۔</span>`
      : `Are you sure you want to delete <strong>"${this.escapeHtml(item.item_name)}"</strong> for <strong class="text-danger">${App.formatCurrency(item.amount)}</strong>?<br><span class="text-muted text-xs">This action cannot be undone.</span>`;

    App.promptDeleteConfirm(
      confirmMsg,
      async () => {
        try {
          await App.apiFetch(`/api/expenses/${item.id}`, { method: 'DELETE' });
          App.closeModal('deleteConfirmModal');
          const delToast = window.I18n ? window.I18n.t('toast_expense_deleted', 'Expense deleted') : 'Expense deleted';
          App.showToast(delToast, 'success');
          this.cachedData = {};
          if (window.Dashboard) window.Dashboard.cachedData = {};
          if (window.Categories) {
            window.Categories.categoryExpensesCache = {};
            window.Categories.load();
          }
          App.loadCategories();
          this.load();
          if (App.state.currentTab === 'dashboard') Dashboard.load();
        } catch (err) {
          App.showToast(err.message, 'error');
        }
      }
    );
  },

  exportCsv() {
    const categoryId = document.getElementById('expenseCategoryFilter').value;
    const search = document.getElementById('expenseSearchInput').value.trim();

    let url = `/api/export/csv?startDate=${App.state.startDate}&endDate=${App.state.endDate}`;
    if (categoryId && categoryId !== 'all') url += `&categoryId=${encodeURIComponent(categoryId)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const filename = `expenses_${App.state.startDate}_to_${App.state.endDate}.csv`;
    App.downloadFile(url, filename);
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
    // Search input with debounce
    const searchInput = document.getElementById('expenseSearchInput');
    const clearBtn = document.getElementById('clearSearchBtn');

    searchInput.addEventListener('input', () => {
      clearBtn.style.display = searchInput.value ? 'block' : 'none';
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.load();
      }, 250);
    });

    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      this.load();
    });

    // Category filter in expenses list change
    document.getElementById('expenseCategoryFilter').addEventListener('change', () => {
      this.load();
    });

    // CSV export button
    document.getElementById('exportCsvBtn').addEventListener('click', () => {
      this.exportCsv();
    });

    // When Category in Add/Edit modal changes, update placeholder of item input
    const catSelect = document.getElementById('expCategorySelect');
    const itemInput = document.getElementById('expItemInput');
    if (catSelect && itemInput) {
      catSelect.addEventListener('change', () => {
        const cat = App.state.categories.find((c) => c.id === parseInt(catSelect.value, 10));
        if (cat) {
          const catDisplayName = window.I18n ? window.I18n.getCategoryName(cat.name) : cat.name;
          itemInput.placeholder = catDisplayName;
        }
      });
    }

    // Save Expense Form submit
    document.getElementById('expenseForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('expenseIdInput').value;
      const date = document.getElementById('expDateInput').value;
      const category_id = parseInt(document.getElementById('expCategorySelect').value, 10);
      let item_name = document.getElementById('expItemInput').value.trim();

      // If item name is empty, default to the chosen category's name
      if (!item_name) {
        const catObj = App.state.categories.find((c) => c.id === category_id);
        item_name = catObj ? catObj.name : 'Expense';
      }

      const amount = parseFloat(document.getElementById('expAmountInput').value);
      const quantity = document.getElementById('expQtyInput').value ? parseFloat(document.getElementById('expQtyInput').value) : null;
      const unit = document.getElementById('expUnitSelect').value || null;
      const vendor = document.getElementById('expVendorInput').value.trim() || null;
      const notes = document.getElementById('expNotesInput').value.trim() || null;

      this.saveExpense({
        id: id || undefined,
        date,
        category_id,
        item_name,
        amount,
        quantity,
        unit,
        vendor,
        notes
      });
    });
  }
};

window.Expenses = Expenses;
document.addEventListener('DOMContentLoaded', () => Expenses.init());
