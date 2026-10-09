// ==========================================
// Kitchen Expense Tracker - Categories Module
// ==========================================

const Categories = {
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
        <div class="category-card" data-id="${cat.id}">
          ${!isDefault && count === 0 ? `
            <button class="category-card-delete delete-cat-btn" data-id="${cat.id}" data-name="${this.escapeHtml(cat.name)}" title="Delete Category">✕</button>
          ` : ''}

          <div class="category-card-icon" style="background-color: ${cat.color || '#6366f1'}">
            ${cat.icon || '🏷️'}
          </div>
          <div class="category-card-name">${this.escapeHtml(cat.name)}</div>
          <div class="category-card-count">
            <strong>${count}</strong> expenses (${App.formatCurrency(total)})
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.delete-cat-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id, 10);
        const name = btn.dataset.name;
        this.promptDelete(id, name);
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
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  promptDelete(id, name) {
    document.getElementById('deleteConfirmText').innerHTML = `
      Are you sure you want to delete category <strong>"${this.escapeHtml(name)}"</strong>?
    `;
    const confirmBtn = document.getElementById('confirmDeleteActionBtn');

    // One-time click handler for category delete
    const handleCategoryDelete = async () => {
      confirmBtn.removeEventListener('click', handleCategoryDelete);
      try {
        await App.apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
        App.closeModal('deleteConfirmModal');
        App.showToast(`Category "${name}" deleted`, 'success');
        this.load();
      } catch (err) {
        App.showToast(err.message, 'error');
      }
    };

    confirmBtn.addEventListener('click', handleCategoryDelete, { once: true });
    App.openModal('deleteConfirmModal');
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
    document.getElementById('openAddCategoryModalBtn').addEventListener('click', () => {
      this.openAddModal();
    });

    // Color picker change updates preview
    const colorInput = document.getElementById('catColorInput');
    const colorPreview = document.getElementById('colorPreviewBox');
    colorInput.addEventListener('input', (e) => {
      colorPreview.style.background = e.target.value;
    });

    // Emoji chip picker
    document.querySelectorAll('.emoji-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.getElementById('catIconInput').value = chip.dataset.emoji;
      });
    });

    // Form submit
    document.getElementById('categoryForm').addEventListener('submit', (e) => {
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
};

window.Categories = Categories;
document.addEventListener('DOMContentLoaded', () => Categories.init());
