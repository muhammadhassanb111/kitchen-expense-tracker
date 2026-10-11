// ==========================================
// Kitchen Expense Tracker - Categories Module
// ==========================================

const Categories = {
  currentCategory: null,
  currentCategoryExpenses: [],

  init() {
    this.bindEvents();
  },

  async load() {
    try {
      const categories = await App.apiFetch('/api/categories');
      App.state.categories = categories;
      App.populateCategorySelects();
      this.renderCategoriesList(categories);
    } catch (err) {
      console.error('Failed to load categories:', err);
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

    container.innerHTML = categories.map((cat) => {
      const isDefault = cat.is_default === 1;
      const count = cat.expense_count || 0;
      const total = cat.total_spent || 0;

      return `
        <div class="category-card category-card-interactive" data-id="${cat.id}" role="button" tabindex="0" title="Click to view all ${this.escapeHtml(cat.name)} expenses">
          ${!isDefault && count === 0 ? `
            <button class="category-card-delete delete-cat-btn" data-id="${cat.id}" data-name="${this.escapeHtml(cat.name)}" title="Delete Category" aria-label="Delete">
              ${window.Icons ? window.Icons.get('close', '', 14) : '✕'}
            </button>
          ` : ''}

          <div class="category-card-icon" style="background-color: ${cat.color || '#6366f1'}">
            ${cat.icon || '🏷️'}
          </div>
          <div class="category-card-name">${this.escapeHtml(cat.name)}</div>
          <div class="category-card-count">
            <strong>${count}</strong> ${count === 1 ? 'expense' : 'expenses'} (${App.formatCurrency(total)})
          </div>
          <div class="category-card-view-hint">
            <span>View expenses</span>
            <span class="hint-arrow">›</span>
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

    const iconEl = document.getElementById('catExpHeaderIcon');
    if (iconEl) {
      iconEl.textContent = cat.icon || '🏷️';
      iconEl.style.backgroundColor = cat.color || 'var(--primary)';
      iconEl.style.boxShadow = `0 4px 14px ${cat.color ? cat.color + '40' : 'rgba(0,0,0,0.15)'}`;
    }

    const titleEl = document.getElementById('catExpModalTitle');
    if (titleEl) titleEl.textContent = `${cat.name} Expenses`;

    const subtitleEl = document.getElementById('catExpModalSubtitle');
    if (subtitleEl) subtitleEl.textContent = `${cat.expense_count || 0} expenses recorded`;

    const totalEl = document.getElementById('catExpTotalSpent');
    if (totalEl) totalEl.textContent = App.formatCurrency(cat.total_spent || 0);

    const countEl = document.getElementById('catExpCount');
    if (countEl) countEl.textContent = cat.expense_count || 0;

    const listContainer = document.getElementById('categoryExpensesListContainer');
    if (listContainer) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <div class="spinner" style="margin: 0 auto 12px auto;"></div>
          Loading ${this.escapeHtml(cat.name)} expenses...
        </div>
      `;
    }

    App.openModal('categoryExpensesModal');

    try {
      const data = await App.apiFetch(`/api/expenses?categoryId=${cat.id}`);
      this.currentCategoryExpenses = data.expenses || [];
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

    const totalSpent = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    if (totalEl) totalEl.textContent = App.formatCurrency(totalSpent);
    if (countEl) countEl.textContent = expenses.length;
    if (subtitleEl) subtitleEl.textContent = `${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'} recorded`;

    if (!expenses || expenses.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state" style="padding: 40px 20px;">
          <div class="empty-state-icon" style="font-size: 2.2rem; margin-bottom: 8px;">
            ${cat.icon || '🏷️'}
          </div>
          <h4 style="margin: 0 0 6px 0;">No Expenses in ${this.escapeHtml(cat.name)}</h4>
          <p style="color: var(--text-muted); font-size: 0.875rem; margin: 0 0 16px 0;">
            No purchase records found for this category yet.
          </p>
          <button type="button" class="btn btn-primary btn-sm" id="catModalEmptyAddBtn">
            + Add First ${this.escapeHtml(cat.name)} Expense
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
        ${expenses.map((item) => `
          <div class="cat-expense-card" data-id="${item.id}">
            <div class="cat-expense-card-left">
              <div class="cat-expense-date-badge">
                ${App.formatDate(item.date)}
              </div>
              <div class="cat-expense-title">${this.escapeHtml(item.item_name)}</div>
              <div class="cat-expense-details">
                ${item.quantity ? `<span>${item.quantity} ${item.unit || ''}</span>` : ''}
                ${item.quantity && item.vendor ? '<span class="sep">•</span>' : ''}
                ${item.vendor ? `<span>🏪 ${this.escapeHtml(item.vendor)}</span>` : ''}
                ${(item.quantity || item.vendor) && item.notes ? '<span class="sep">•</span>' : ''}
                ${item.notes ? `<em>${this.escapeHtml(item.notes)}</em>` : ''}
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
        `).join('')}
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
          App.promptDeleteConfirm(
            `Are you sure you want to delete <strong>"${this.escapeHtml(item.item_name)}"</strong> for <strong class="text-danger">${App.formatCurrency(item.amount)}</strong>?`,
            async () => {
              try {
                await App.apiFetch(`/api/expenses/${item.id}`, { method: 'DELETE' });
                App.closeModal('deleteConfirmModal');
                App.showToast('Expense deleted successfully', 'success');
                // Refresh categories list in background
                await this.load();
                if (window.Expenses) window.Expenses.load();
                if (window.Dashboard && App.state.currentTab === 'dashboard') window.Dashboard.load();

                // Re-fetch category expenses for modal
                const updated = await App.apiFetch(`/api/expenses?categoryId=${cat.id}`);
                this.renderCategoryExpensesModal(cat, updated.expenses || []);
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
    App.promptDeleteConfirm(
      `Are you sure you want to delete category <strong>"${this.escapeHtml(name)}"</strong>?`,
      async () => {
        try {
          await App.apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
          App.closeModal('deleteConfirmModal');
          App.showToast(`Category "${name}" deleted`, 'success');
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
