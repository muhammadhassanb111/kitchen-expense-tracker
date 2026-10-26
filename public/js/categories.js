// ==========================================
// Kitchen Expense Tracker - Categories Module
// Ultra-Fast & Smooth Edition (Instant Cache + Prefetch)
// ==========================================

const Categories = {
  currentCategory: null,
  currentCategoryExpenses: [],
  categoryExpensesCache: {},
  isPrefetching: false,

  init() {
    this.bindEvents();
  },

  async load() {
    try {
      const categories = await App.apiFetch('/api/categories');
      App.state.categories = categories;
      App.populateCategorySelects();
      this.renderCategoriesList(categories);

      // Background prefetch all expenses so tapping any category is 0ms instant
      this.prefetchAllCategoryExpenses();
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  },

  async prefetchAllCategoryExpenses() {
    if (this.isPrefetching) return;
    this.isPrefetching = true;
    try {
      const data = await App.apiFetch('/api/expenses');
      const all = data.expenses || [];
      const grouped = {};
      all.forEach((item) => {
        const cid = item.category_id;
        if (!grouped[cid]) grouped[cid] = [];
        grouped[cid].push(item);
      });
      (App.state.categories || []).forEach((c) => {
        this.categoryExpensesCache[c.id] = grouped[c.id] || [];
      });
    } catch (e) {
      // Background prefetch fails silently without blocking UI
    } finally {
      this.isPrefetching = false;
    }
  },

  renderCategoriesList(categories) {
    const container = document.getElementById('categoriesListContainer');

    if (!categories || categories.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px; color: var(--text-muted); grid-column: 1 / -1;">
          No categories found.
        </div>
      `;
      return;
    }

    const viewHintText = window.I18n ? window.I18n.t('cat_view_expenses', 'View expenses') : 'View expenses';
    const arrowSym = window.I18n && window.I18n.isUrdu() ? '‹' : '›';

    container.innerHTML = categories.map((cat) => {
      const isDefault = cat.is_default === 1;
      const count = cat.expense_count || 0;
      const total = cat.total_spent || 0;
      const displayName = window.I18n ? window.I18n.getCategoryName(cat.name) : cat.name;
      const countText = window.I18n && window.I18n.isUrdu()
        ? `<strong>${count}</strong> اخراجات (${App.formatCurrency(total)})`
        : `<strong>${count}</strong> ${count === 1 ? 'expense' : 'expenses'} (${App.formatCurrency(total)})`;

      return `
        <div class="category-card category-card-interactive" data-id="${cat.id}" role="button" tabindex="0" title="${displayName}">
          ${!isDefault && count === 0 ? `
            <button class="category-card-delete delete-cat-btn" data-id="${cat.id}" data-name="${this.escapeHtml(cat.name)}" title="Delete Category" aria-label="Delete">
              ${window.Icons ? window.Icons.get('close', '', 14) : '✕'}
            </button>
          ` : ''}

          <div class="category-card-icon" style="background-color: ${cat.color || '#6366f1'}">
            ${cat.icon || '🏷️'}
          </div>
          <div class="category-card-name">${this.escapeHtml(displayName)}</div>
          <div class="category-card-count">
            ${countText}
          </div>
          <div class="category-card-view-hint">
            <span>${viewHintText}</span>
            <span class="hint-arrow">${arrowSym}</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach card click handlers to open category expenses modal
    container.querySelectorAll('.category-card-interactive').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.delete-cat-btn')) return;
        const id = parseInt(card.dataset.id, 10);
        const cat = categories.find((c) => c.id === id);
        if (cat) {
          this.openCategoryExpenses(cat);
        }
      });
      // Keyboard accessibility (Enter/Space)
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const id = parseInt(card.dataset.id, 10);
          const cat = categories.find((c) => c.id === id);
          if (cat) this.openCategoryExpenses(cat);
        }
      });
    });

    // Delete category button handlers
    container.querySelectorAll('.delete-cat-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id, 10);
        const name = btn.dataset.name;
        this.promptDelete(id, name);
      });
    });
  },

  async openCategoryExpenses(cat) {
    this.currentCategory = cat;
    const catDisplayName = window.I18n ? window.I18n.getCategoryName(cat.name) : cat.name;

    const iconEl = document.getElementById('catExpHeaderIcon');
    if (iconEl) {
      iconEl.textContent = cat.icon || '🏷️';
      iconEl.style.backgroundColor = cat.color || 'var(--primary)';
      iconEl.style.boxShadow = `0 4px 14px ${cat.color ? cat.color + '40' : 'rgba(0,0,0,0.15)'}`;
    }

    const titleEl = document.getElementById('catExpModalTitle');
    if (titleEl) {
      titleEl.textContent = window.I18n && window.I18n.isUrdu()
        ? `${catDisplayName} کے اخراجات`
        : `${cat.name} Expenses`;
    }

    const subtitleEl = document.getElementById('catExpModalSubtitle');
    if (subtitleEl) {
      subtitleEl.textContent = window.I18n && window.I18n.isUrdu()
        ? `${cat.expense_count || 0} اخراجات درج ہیں`
        : `${cat.expense_count || 0} expenses recorded`;
    }

    const totalEl = document.getElementById('catExpTotalSpent');
    if (totalEl) totalEl.textContent = App.formatCurrency(cat.total_spent || 0);

    const countEl = document.getElementById('catExpCount');
    if (countEl) countEl.textContent = cat.expense_count || 0;

    const listContainer = document.getElementById('categoryExpensesListContainer');

    // 1. INSTANT 0ms RENDER FROM CACHE
    const cached = this.categoryExpensesCache[cat.id];
    if (cached) {
      this.currentCategoryExpenses = cached;
      this.renderCategoryExpensesModal(cat, cached);
      App.openModal('categoryExpensesModal');

      // Revalidate silently in background to ensure data freshness
      App.apiFetch(`/api/expenses?categoryId=${cat.id}`).then((fresh) => {
        const freshList = fresh.expenses || [];
        this.categoryExpensesCache[cat.id] = freshList;
        this.currentCategoryExpenses = freshList;
        if (freshList.length !== cached.length || JSON.stringify(freshList) !== JSON.stringify(cached)) {
          this.renderCategoryExpensesModal(cat, freshList);
        }
      }).catch(() => {});
      return;
    }

    // 2. COLD START (Not yet cached): Render high-fidelity skeleton placeholders immediately
    if (listContainer) {
      listContainer.innerHTML = `
        <div class="cat-expenses-list">
          ${[1, 2, 3].map(() => `
            <div class="cat-expense-card skeleton-card">
              <div class="cat-expense-card-left">
                <div class="skeleton-line" style="width: 70px; height: 11px; margin-bottom: 6px;"></div>
                <div class="skeleton-line" style="width: 150px; height: 16px; margin-bottom: 6px;"></div>
                <div class="skeleton-line" style="width: 110px; height: 12px;"></div>
              </div>
              <div class="cat-expense-card-right">
                <div class="skeleton-line" style="width: 70px; height: 18px;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    App.openModal('categoryExpensesModal');

    // Fetch and populate cache
    try {
      const data = await App.apiFetch(`/api/expenses?categoryId=${cat.id}`);
      this.currentCategoryExpenses = data.expenses || [];
      this.categoryExpensesCache[cat.id] = this.currentCategoryExpenses;
      this.renderCategoryExpensesModal(cat, this.currentCategoryExpenses);
    } catch (err) {
      if (listContainer) {
        listContainer.innerHTML = `
          <div style="text-align: center; padding: 30px; color: var(--outflow);">
            Failed to load expenses: ${this.escapeHtml(err.message)}
          </div>
        `;
      }
    }
  },

  renderCategoryExpensesModal(cat, expenses) {
    const listContainer = document.getElementById('categoryExpensesListContainer');
    const totalEl = document.getElementById('catExpTotalSpent');
    const countEl = document.getElementById('catExpCount');
    const subtitleEl = document.getElementById('catExpModalSubtitle');
    const catDisplayName = window.I18n ? window.I18n.getCategoryName(cat.name) : cat.name;

    const totalSpent = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    if (totalEl) totalEl.textContent = App.formatCurrency(totalSpent);
    if (countEl) countEl.textContent = expenses.length;
    if (subtitleEl) {
      subtitleEl.textContent = window.I18n && window.I18n.isUrdu()
        ? `${expenses.length} اخراجات درج ہیں`
        : `${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'} recorded`;
    }

    if (!expenses || expenses.length === 0) {
      const emptyTitle = window.I18n && window.I18n.isUrdu()
        ? `${catDisplayName} میں کوئی خرچہ نہیں ہے`
        : `No Expenses in ${this.escapeHtml(cat.name)}`;
      const emptyDesc = window.I18n ? window.I18n.t('cat_modal_no_expenses', 'No purchase records found for this category yet.') : 'No purchase records found for this category yet.';
      const emptyBtnText = window.I18n && window.I18n.isUrdu()
        ? `+ نیا ${catDisplayName} خرچہ درج کریں`
        : `+ Add First ${this.escapeHtml(cat.name)} Expense`;

      listContainer.innerHTML = `
        <div class="empty-state" style="padding: 40px 20px;">
          <div class="empty-state-icon" style="font-size: 2.2rem; margin-bottom: 8px;">
            ${cat.icon || '🏷️'}
          </div>
          <h4 style="margin: 0 0 6px 0;">${emptyTitle}</h4>
          <p style="color: var(--text-muted); font-size: 0.875rem; margin: 0 0 16px 0;">
            ${emptyDesc}
          </p>
          <button type="button" class="btn btn-primary btn-sm" id="catModalEmptyAddBtn">
            ${emptyBtnText}
          </button>
        </div>
      `;
      const emptyAddBtn = document.getElementById('catModalEmptyAddBtn');
      if (emptyAddBtn) {
        emptyAddBtn.addEventListener('click', () => {
          App.closeModal('categoryExpensesModal');
          if (window.Expenses) window.Expenses.openAddModal(cat.id);
        });
      }
      return;
    }

    const editIcon = window.Icons ? window.Icons.get('edit', '', 14) : '✏️';
    const trashIcon = window.Icons ? window.Icons.get('trash', '', 14) : '🗑️';

    listContainer.innerHTML = `
      <div class="cat-expenses-list">
        ${expenses.map((item) => {
          const catName = window.I18n ? window.I18n.getCategoryName(item.category_name || item.item_name) : (item.category_name || item.item_name);
          const unitStr = item.unit ? (window.I18n ? window.I18n.getUnitName(item.unit) : item.unit) : '';
          return `
          <div class="cat-expense-card" data-id="${item.id}">
            <div class="cat-expense-card-left">
              <div class="cat-expense-date-badge">
                ${App.formatDate(item.date)}
              </div>
              <div class="cat-expense-title">${this.escapeHtml(catName)}</div>
              <div class="cat-expense-details">
                ${item.quantity ? `<span><strong>${item.quantity}</strong> ${this.escapeHtml(unitStr)}</span>` : ''}
              </div>
            </div>

            <div class="cat-expense-card-right">
              <div class="cat-expense-amount">
                ${App.formatCurrency(item.amount)}
              </div>
              <div class="cat-expense-actions">
                <button type="button" class="btn-icon-action cat-item-edit-btn" data-id="${item.id}" title="Edit Expense" aria-label="Edit">
                  ${editIcon}
                </button>
                <button type="button" class="btn-icon-action delete-action cat-item-delete-btn" data-id="${item.id}" title="Delete Expense" aria-label="Delete">
                  ${trashIcon}
                </button>
              </div>
            </div>
          </div>
        `;}).join('')}
      </div>
    `;

    // Bind Edit Buttons
    listContainer.querySelectorAll('.cat-item-edit-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id, 10);
        const item = expenses.find((x) => x.id === id);
        if (item && window.Expenses) {
          App.closeModal('categoryExpensesModal');
          window.Expenses.openEditModal(item);
        }
      });
    });

    // Bind Delete Buttons
    listContainer.querySelectorAll('.cat-item-delete-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id, 10);
        const item = expenses.find((x) => x.id === id);
        if (item) {
          const delMsg = window.I18n && window.I18n.isUrdu()
            ? `کیا آپ واقعی <strong>"${this.escapeHtml(item.item_name)}"</strong> کا خرچہ (<strong class="text-danger">${App.formatCurrency(item.amount)}</strong>) حذف کرنا چاہتے ہیں؟`
            : `Are you sure you want to delete <strong>"${this.escapeHtml(item.item_name)}"</strong> for <strong class="text-danger">${App.formatCurrency(item.amount)}</strong>?`;

          App.promptDeleteConfirm(
            delMsg,
            async () => {
              try {
                await App.apiFetch(`/api/expenses/${item.id}`, { method: 'DELETE' });
                App.closeModal('deleteConfirmModal');
                const delToast = window.I18n ? window.I18n.t('toast_expense_deleted', 'Expense deleted') : 'Expense deleted';
                App.showToast(delToast, 'success');

                // Invalidate caches
                delete this.categoryExpensesCache[cat.id];

                // Refresh background lists
                await this.load();
                if (window.Expenses) window.Expenses.load();
                if (window.Dashboard && App.state.currentTab === 'dashboard') window.Dashboard.load();

                // Re-fetch category expenses for modal
                const updated = await App.apiFetch(`/api/expenses?categoryId=${cat.id}`);
                this.categoryExpensesCache[cat.id] = updated.expenses || [];
                this.renderCategoryExpensesModal(cat, this.categoryExpensesCache[cat.id]);
              } catch (err) {
                App.showToast(err.message, 'error');
              }
            }
          );
        }
      });
    });
  },

  openAddModal() {
    document.getElementById('categoryForm').reset();
    document.getElementById('catColorInput').value = '#10b981';
    document.getElementById('colorPreviewBox').style.background = '#10b981';
    document.getElementById('catIconInput').value = '🏷️';
    App.openModal('categoryModal');
  },

  async saveCategory(formData) {
    try {
      await App.apiFetch('/api/categories', {
        method: 'POST',
        body: formData
      });
      App.closeModal('categoryModal');
      App.showToast('Category created successfully!', 'success');
      this.load();
      if (App.loadCategories) App.loadCategories();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  promptDelete(id, name) {
    const displayName = window.I18n ? window.I18n.getCategoryName(name) : name;
    const confirmMsg = window.I18n && window.I18n.isUrdu()
      ? `کیا آپ واقعی کیٹیگری <strong>"${this.escapeHtml(displayName)}"</strong> حذف کرنا چاہتے ہیں؟`
      : `Are you sure you want to delete category <strong>"${this.escapeHtml(name)}"</strong>?`;

    App.promptDeleteConfirm(
      confirmMsg,
      async () => {
        try {
          await App.apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
          App.closeModal('deleteConfirmModal');
          const toastMsg = window.I18n && window.I18n.isUrdu()
            ? `کیٹیگری "${displayName}" حذف کر دی گئی`
            : `Category "${name}" deleted`;
          App.showToast(toastMsg, 'success');
          this.load();
          if (App.loadCategories) App.loadCategories();
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
    const addCatBtn = document.getElementById('openAddCategoryModalBtn');
    if (addCatBtn) {
      addCatBtn.addEventListener('click', () => this.openAddModal());
    }

    // Modal quick action: + Add Expense in this category
    const catExpAddBtn = document.getElementById('catExpAddBtn');
    if (catExpAddBtn) {
      catExpAddBtn.addEventListener('click', () => {
        const cat = this.currentCategory;
        App.closeModal('categoryExpensesModal');
        if (window.Expenses) {
          window.Expenses.openAddModal(cat ? cat.id : null);
        }
      });
    }

    // Modal quick action: View in Expenses Tab
    const catExpViewInTabBtn = document.getElementById('catExpViewInTabBtn');
    if (catExpViewInTabBtn) {
      catExpViewInTabBtn.addEventListener('click', () => {
        const cat = this.currentCategory;
        App.closeModal('categoryExpensesModal');
        if (cat) {
          const filterSelect = document.getElementById('expenseCategoryFilter');
          if (filterSelect) filterSelect.value = cat.id;
          const searchInput = document.getElementById('expenseSearchInput');
          if (searchInput) searchInput.value = '';
        }
        App.switchTab('expenses');
        if (window.Expenses) window.Expenses.load();
      });
    }

    // Color picker change updates preview
    const colorInput = document.getElementById('catColorInput');
    const colorPreview = document.getElementById('colorPreviewBox');
    if (colorInput && colorPreview) {
      colorInput.addEventListener('input', (e) => {
        colorPreview.style.background = e.target.value;
      });
    }

    // Emoji chip picker
    document.querySelectorAll('.emoji-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const iconInput = document.getElementById('catIconInput');
        if (iconInput) iconInput.value = chip.dataset.emoji;
      });
    });

    // Form submit
    const catForm = document.getElementById('categoryForm');
    if (catForm) {
      catForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('catNameInput').value.trim();
        const color = document.getElementById('catColorInput').value;
        const icon = document.getElementById('catIconInput').value.trim() || '🏷️';

        if (!name) {
          App.showToast('Please enter category name', 'error');
          return;
        }

        this.saveCategory({ name, color, icon });
      });
    }
  }
};

window.Categories = Categories;
document.addEventListener('DOMContentLoaded', () => Categories.init());
