// ==========================================
// Kitchen Expense Tracker - Expenses Module
// ==========================================

const CATEGORY_ITEMS = {
  'vegetables': [
    'Tomatoes', 'Onions', 'Potatoes', 'Ginger & Garlic', 'Green Chilies', 
    'Coriander & Mint', 'Cabbage', 'Capsicum (Shimla Mirch)', 'Cucumbers', 
    'Carrots', 'Lemon (Nimbu)', 'Spinach (Palak)', 'Peas (Matar)'
  ],
  'meat/chicken': [
    'Fresh Broiler Chicken', 'Boneless Chicken Breast', 'Chicken Tikka Cut', 
    'Chicken Mince (Keema)', 'Mutton', 'Beef', 'Fish'
  ],
  'oil & ghee': [
    'Cooking Oil (16L Tin)', 'Cooking Oil (Pouch)', 'Banaspati Ghee', 
    'Desi Ghee', 'Mustard Oil'
  ],
  'spices': [
    'Biryani Masala', 'Red Chilli Powder (Lal Mirch)', 'Turmeric (Haldi)', 
    'Cumin Seeds (Zeera)', 'Black Pepper (Kali Mirch)', 'Coriander Powder (Dhania)', 
    'Garam Masala', 'Salt (Namak)', 'Cardamom (Elaichi)', 'Whole Spices Mix'
  ],
  'dairy': [
    'Fresh Milk', 'Yogurt (Dahi)', 'Cooking Cream', 'Cheese (Mozzarella/Cheddar)', 
    'Butter', 'Eggs (Tray/Dozen)', 'Mayonnaise'
  ],
  'packaging': [
    'Meal Delivery Boxes', 'Brown Paper Bags', 'Aluminum Foil Rolls', 
    'Cling Film Wrap', 'Plastic Spoons / Cutlery', 'Sauce Dipping Cups', 
    'Burger / Roll Wrapping Paper'
  ],
  'gas/fuel': [
    'Commercial LPG Cylinder (45kg)', 'Domestic LPG Cylinder (11.8kg)', 
    'LPG Gas Refill', 'Generator Petrol / Fuel', 'Delivery Bike Petrol'
  ],
  'other': [
    'Dishwashing Liquid', 'Kitchen Cleaning Supplies', 'Tissue Rolls', 
    'Hand Wash Soap', 'Tea Leaves / Chai Patti', 'Sugar (Cheeni)', 'Flour (Atta / Maida)'
  ]
};

const Expenses = {
  currentExpenses: [],
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

      const data = await App.apiFetch(url);
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
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 48px 20px; color: var(--text-muted);">
          <span style="font-size: 3rem; display: block; margin-bottom: 8px;">🧾</span>
          <h4 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 4px;">No Expenses Found</h4>
          <p style="font-size: 0.85rem; margin-bottom: 16px;">No expenses match the current filter or date range.</p>
          <button class="btn btn-primary btn-sm" onclick="Expenses.openAddModal()">+ Add New Expense</button>
        </div>
      `;
      return;
    }

    // 1. Mobile Cards View
    const cardsHtml = `
      <div class="expenses-wrapper has-desktop-view">
        ${this.currentExpenses.map((item) => `
          <div class="expense-card" data-id="${item.id}">
            <div class="exp-card-header">
              <div class="flex-1">
                <div class="exp-item-title">${this.escapeHtml(item.item_name)}</div>
                <div class="exp-card-meta mt-1">
                  <span class="category-pill" style="background-color: ${item.category_color}">
                    ${item.category_icon} ${item.category_name}
                  </span>
                  <span>📅 ${App.formatDate(item.date)}</span>
                  ${item.quantity ? `<span>⚖️ ${item.quantity} ${item.unit || ''}</span>` : ''}
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
                  ✏️
                </button>
                <button class="btn-icon-action delete-action delete-expense-btn" data-id="${item.id}" title="Delete Expense" aria-label="Delete">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // 2. Desktop Table View
    const tableHtml = `
      <div class="desktop-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Item Name</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Vendor</th>
              <th>Notes</th>
              <th style="text-align: right;">Amount</th>
              <th style="text-align: center; width: 90px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.currentExpenses.map((item) => `
              <tr data-id="${item.id}">
                <td style="white-space: nowrap; font-weight: 500;">${App.formatDate(item.date)}</td>
                <td><strong style="color: var(--text-main);">${this.escapeHtml(item.item_name)}</strong></td>
                <td>
                  <span class="category-pill" style="background-color: ${item.category_color}">
                    ${item.category_icon} ${item.category_name}
                  </span>
                </td>
                <td style="color: var(--text-muted);">${item.quantity ? `${item.quantity} ${item.unit || ''}` : '—'}</td>
                <td style="color: var(--text-muted);">${item.vendor ? this.escapeHtml(item.vendor) : '—'}</td>
                <td style="color: var(--text-muted); font-size: 0.825rem; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${item.notes ? this.escapeHtml(item.notes) : '—'}
                </td>
                <td style="text-align: right; font-weight: 800; color: var(--danger); white-space: nowrap;">
                  ${App.formatCurrency(item.amount)}
                </td>
                <td style="text-align: center;">
                  <div style="display: flex; gap: 4px; justify-content: center;">
                    <button class="btn-icon-action edit-expense-btn" data-id="${item.id}" title="Edit">✏️</button>
                    <button class="btn-icon-action delete-action delete-expense-btn" data-id="${item.id}" title="Delete">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
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

  // ------------------------------------------
  // Dynamic Category Suggestions & Combobox
  // ------------------------------------------
  updateCategorySuggestions(categoryId, currentVal = '') {
    const cat = App.state.categories.find((c) => c.id === parseInt(categoryId, 10));
    const label = document.getElementById('suggestionsCategoryLabel');
    const chipsContainer = document.getElementById('quickItemChips');
    const menuContainer = document.getElementById('itemDropdownMenu');
    const input = document.getElementById('expItemInput');

    if (!cat) {
      if (label) label.textContent = 'Suggestions:';
      if (chipsContainer) chipsContainer.innerHTML = '';
      if (menuContainer) menuContainer.innerHTML = '';
      return;
    }

    if (label) {
      label.textContent = `Suggestions for ${cat.name}:`;
    }

    const key = cat.name.toLowerCase().trim();
    let suggestions = CATEGORY_ITEMS[key] || CATEGORY_ITEMS['other'] || [];

    // Also include any previously saved item names for this category from the user
    this.currentExpenses.forEach((exp) => {
      if (exp.category_id === cat.id && exp.item_name && !suggestions.includes(exp.item_name)) {
        suggestions.push(exp.item_name);
      }
    });

    const activeText = (currentVal !== undefined ? currentVal : input.value).trim().toLowerCase();

    // 1. Render Quick Tap Chips
    if (chipsContainer) {
      chipsContainer.innerHTML = suggestions.map((name) => {
        const isSelected = activeText === name.toLowerCase();
        return `
          <button type="button" class="item-chip ${isSelected ? 'selected' : ''}" data-name="${this.escapeHtml(name)}">
            ${this.escapeHtml(name)}
          </button>
        `;
      }).join('');

      chipsContainer.querySelectorAll('.item-chip').forEach((chip) => {
        chip.addEventListener('click', (e) => {
          e.preventDefault();
          const chosenName = chip.dataset.name;
          input.value = chosenName;
          this.highlightSelectedChip(chosenName);
          if (menuContainer) menuContainer.style.display = 'none';
        });
      });
    }

    // 2. Render Combobox Dropdown List
    if (menuContainer) {
      menuContainer.innerHTML = suggestions.map((name) => {
        const isSelected = activeText === name.toLowerCase();
        return `
          <div class="combobox-item ${isSelected ? 'active' : ''}" data-name="${this.escapeHtml(name)}">
            <span>${this.escapeHtml(name)}</span>
            ${isSelected ? '<span style="font-size: 0.8rem;">✓</span>' : ''}
          </div>
        `;
      }).join('');

      menuContainer.querySelectorAll('.combobox-item').forEach((itemEl) => {
        itemEl.addEventListener('click', (e) => {
          e.preventDefault();
          const chosenName = itemEl.dataset.name;
          input.value = chosenName;
          this.highlightSelectedChip(chosenName);
          menuContainer.style.display = 'none';
        });
      });
    }
  },

  highlightSelectedChip(val) {
    const norm = (val || '').trim().toLowerCase();
    const chipsContainer = document.getElementById('quickItemChips');
    if (chipsContainer) {
      chipsContainer.querySelectorAll('.item-chip').forEach((chip) => {
        chip.classList.toggle('selected', chip.dataset.name.toLowerCase() === norm);
      });
    }
    const menuContainer = document.getElementById('itemDropdownMenu');
    if (menuContainer) {
      menuContainer.querySelectorAll('.combobox-item').forEach((itemEl) => {
        itemEl.classList.toggle('active', itemEl.dataset.name.toLowerCase() === norm);
      });
    }
  },

  openAddModal() {
    document.getElementById('expenseModalTitle').textContent = 'Add Expense';
    document.getElementById('expenseIdInput').value = '';
    document.getElementById('expenseForm').reset();
    document.getElementById('expDateInput').value = App.todayString();
    document.getElementById('itemDropdownMenu').style.display = 'none';

    // Update suggestions for the first category
    const catSelect = document.getElementById('expCategorySelect');
    if (catSelect && catSelect.value) {
      this.updateCategorySuggestions(catSelect.value, '');
    }

    App.openModal('expenseModal');
  },

  openEditModal(item) {
    document.getElementById('expenseModalTitle').textContent = 'Edit Expense';
    document.getElementById('expenseIdInput').value = item.id;
    document.getElementById('expDateInput').value = item.date;
    document.getElementById('expCategorySelect').value = item.category_id;
    document.getElementById('expItemInput').value = item.item_name;
    document.getElementById('expAmountInput').value = item.amount;
    document.getElementById('expQtyInput').value = item.quantity || '';
    document.getElementById('expUnitSelect').value = item.unit || '';
    document.getElementById('expVendorInput').value = item.vendor || '';
    document.getElementById('expNotesInput').value = item.notes || '';
    document.getElementById('itemDropdownMenu').style.display = 'none';

    // Update suggestions for item's category and highlight selected item
    this.updateCategorySuggestions(item.category_id, item.item_name);

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
      App.showToast(isEdit ? 'Expense updated!' : 'Expense added successfully!', 'success');
      App.loadCategories();
      this.load();
      if (App.state.currentTab === 'dashboard') Dashboard.load();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  promptDelete(item) {
    this.pendingDeleteId = item.id;
    document.getElementById('deleteConfirmText').innerHTML = `
      Are you sure you want to delete <strong>"${this.escapeHtml(item.item_name)}"</strong> 
      for <strong class="text-danger">${App.formatCurrency(item.amount)}</strong>?
      <br><span class="text-muted text-xs">This action cannot be undone.</span>
    `;
    App.openModal('deleteConfirmModal');
  },

  async confirmDelete() {
    if (!this.pendingDeleteId) return;

    try {
      await App.apiFetch(`/api/expenses/${this.pendingDeleteId}`, { method: 'DELETE' });
      App.closeModal('deleteConfirmModal');
      App.showToast('Expense deleted', 'success');
      this.pendingDeleteId = null;
      App.loadCategories();
      this.load();
      if (App.state.currentTab === 'dashboard') Dashboard.load();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  exportCsv() {
    const categoryId = document.getElementById('expenseCategoryFilter').value;
    const search = document.getElementById('expenseSearchInput').value.trim();

    let url = `/api/export/csv?startDate=${App.state.startDate}&endDate=${App.state.endDate}`;
    if (categoryId && categoryId !== 'all') url += `&categoryId=${encodeURIComponent(categoryId)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    window.location.href = url;
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

    // When Category in Add/Edit modal changes, update item suggestions dynamically!
    document.getElementById('expCategorySelect').addEventListener('change', (e) => {
      this.updateCategorySuggestions(e.target.value);
    });

    // Toggle combobox dropdown menu on ▼ button click
    const toggleBtn = document.getElementById('toggleItemDropdownBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('itemDropdownMenu');
        if (menu) {
          const isVisible = menu.style.display === 'block';
          menu.style.display = isVisible ? 'none' : 'block';
        }
      });
    }

    // When clicking outside the combobox, close the dropdown menu
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('itemDropdownMenu');
      if (menu && menu.style.display === 'block') {
        if (!e.target.closest('.combobox-wrapper')) {
          menu.style.display = 'none';
        }
      }
    });

    // When user types in Item Name input, highlight matching chip
    const itemInput = document.getElementById('expItemInput');
    if (itemInput) {
      itemInput.addEventListener('input', (e) => {
        this.highlightSelectedChip(e.target.value);
      });
    }

    // Save Expense Form submit
    document.getElementById('expenseForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('expenseIdInput').value;
      const date = document.getElementById('expDateInput').value;
      const category_id = parseInt(document.getElementById('expCategorySelect').value, 10);
      const item_name = document.getElementById('expItemInput').value.trim();
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

    // Confirm Delete button handler
    document.getElementById('confirmDeleteActionBtn').addEventListener('click', () => {
      this.confirmDelete();
    });
  }
};

window.Expenses = Expenses;
document.addEventListener('DOMContentLoaded', () => Expenses.init());
