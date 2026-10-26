// ==========================================
// Kitchen Expense Tracker - Dashboard Module
// 2026 Next-Gen Fintech Edition
// ==========================================

const Dashboard = {
  cachedData: {},

  async load() {
    const cacheKey = `${App.state.startDate}_${App.state.endDate}`;
    if (this.cachedData[cacheKey]) {
      const cached = this.cachedData[cacheKey];
      this.renderSummary(cached.summary, cached.dailyTrend);
      this.renderDonutChart(cached.categoryBreakdown, cached.summary.totalSpent);
      this.renderTrendChart(cached.dailyTrend);
      this.renderRecentExpenses(cached.recentExpenses);
    }

    try {
      const url = `/api/dashboard/stats?startDate=${App.state.startDate}&endDate=${App.state.endDate}`;
      const data = await App.apiFetch(url);
      this.cachedData[cacheKey] = data;
      this.renderSummary(data.summary, data.dailyTrend);
      this.renderDonutChart(data.categoryBreakdown, data.summary.totalSpent);
      this.renderTrendChart(data.dailyTrend);
      this.renderRecentExpenses(data.recentExpenses);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  },

  renderSummary(summary, dailyTrend) {
    // 1. Total Spent
    App.animateCount('dashTotalSpent', summary.totalSpent, `${App.state.currency} `);
    const countText = window.I18n && window.I18n.isUrdu() ? `${summary.expenseCount} خریداریاں درج ہوئیں` : `${summary.expenseCount} purchases recorded`;
    document.getElementById('dashExpenseCount').textContent = countText;

    // 2. Payouts Received
    App.animateCount('dashTotalPayouts', summary.totalPayouts, `${App.state.currency} `);

    // 3. Net Profit / Loss
    const netProfitEl = document.getElementById('dashNetProfit');
    const netIconEl = document.getElementById('dashNetIcon');
    const marginEl = document.getElementById('dashProfitMargin');
    const netBadgeEl = document.getElementById('dashNetBadge');

    if (summary.totalPayouts > 0) {
      const isProfit = summary.netProfit >= 0;
      if (isProfit) {
        netProfitEl.className = 'stat-value text-success';
        App.animateCount('dashNetProfit', summary.netProfit, `+ ${App.state.currency} `);
        if (netIconEl) netIconEl.innerHTML = window.Icons.get('trendUp', 'text-success', 20);
        marginEl.className = 'pulse-badge is-profit';
        marginEl.textContent = window.I18n && window.I18n.isUrdu() ? `${summary.profitMarginPct}% منافع` : `${summary.profitMarginPct}% profit margin`;
        if (netBadgeEl) netBadgeEl.className = 'stat-icon-badge stat-badge-payouts';
      } else {
        netProfitEl.className = 'stat-value text-danger';
        App.animateCount('dashNetProfit', Math.abs(summary.netProfit), `- ${App.state.currency} `);
        if (netIconEl) netIconEl.innerHTML = window.Icons.get('trendDown', 'text-danger', 20);
        marginEl.className = 'pulse-badge is-loss';
        marginEl.textContent = window.I18n && window.I18n.isUrdu() ? 'اس مدت میں نقصان' : 'Deficit for period';
        if (netBadgeEl) netBadgeEl.className = 'stat-icon-badge stat-badge-spent';
      }
    } else {
      netProfitEl.className = 'stat-value text-muted stat-dense-sm';
      netProfitEl.textContent = window.I18n && window.I18n.isUrdu() ? 'ابھی کوئی آمدنی نہیں' : 'No Payout Yet';
      netProfitEl.removeAttribute('title');
      if (netIconEl) netIconEl.innerHTML = window.Icons.get('scale', 'text-muted', 20);
      marginEl.className = 'pulse-badge';
      marginEl.textContent = window.I18n && window.I18n.isUrdu() ? 'آمدنی درج کریں تاکہ منافع معلوم ہو' : 'Record a payout to track P&L';
      if (netBadgeEl) netBadgeEl.className = 'stat-icon-badge stat-badge-net';
    }

    // 4. Daily average
    const activeDaysCount = dailyTrend && dailyTrend.length > 0 ? dailyTrend.length : 1;
    const dailyAvg = summary.totalSpent > 0 ? (summary.totalSpent / activeDaysCount) : 0;
    App.animateCount('dashDailyAvg', Math.round(dailyAvg), `${App.state.currency} `);
  },

  renderDonutChart(categories, totalSpent) {
    const container = document.getElementById('donutChartContainer');
    const legend = document.getElementById('categoryLegend');
    const countBadge = document.getElementById('categoryCountBadge');

    if (!categories || categories.length === 0 || totalSpent === 0) {
      const emptyTitle = window.I18n && window.I18n.isUrdu() ? 'اس مدت میں کوئی خرچہ نہیں ہے' : 'No Expenses in this Period';
      const emptyDesc = window.I18n && window.I18n.isUrdu() ? 'کیٹیگری کا جائزہ دیکھنے کے لیے اپنی پہلی خریداری درج کریں۔' : 'Add your first kitchen grocery purchase to see category distribution.';
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            ${window.Icons ? window.Icons.get('categories', '', 28) : '📊'}
          </div>
          <h4>${emptyTitle}</h4>
          <p>${emptyDesc}</p>
        </div>
      `;
      legend.innerHTML = '';
      countBadge.textContent = window.I18n && window.I18n.isUrdu() ? '0 کیٹیگریز' : '0 categories';
      return;
    }

    countBadge.textContent = window.I18n && window.I18n.isUrdu() ? `${categories.length} کیٹیگریز` : `${categories.length} categories`;

    // Modern SVG Donut Chart with sweeping stroke
    const size = 200;
    const strokeWidth = 26;
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;

    let accumulatedPct = 0;
    let svgPaths = '';

    categories.forEach((cat) => {
      const pct = cat.percentage / 100;
      const strokeDasharray = `${pct * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedPct * circumference;
      const catDisplayName = window.I18n ? window.I18n.getCategoryName(cat.name) : cat.name;

      svgPaths += `
        <circle 
          cx="${center}" 
          cy="${center}" 
          r="${radius}" 
          fill="transparent" 
          stroke="${cat.color || '#6366f1'}" 
          stroke-width="${strokeWidth}" 
          stroke-dasharray="${strokeDasharray}" 
          stroke-dashoffset="${strokeDashoffset}"
          class="donut-segment"
          data-name="${catDisplayName}"
          data-amount="${App.formatCurrency(cat.total)}"
          data-pct="${cat.percentage}%"
        >
          <title>${catDisplayName}: ${App.formatCurrency(cat.total)} (${cat.percentage}%)</title>
        </circle>
      `;
      accumulatedPct += pct;
    });

    const totalLabel = window.I18n && window.I18n.isUrdu() ? 'کل خرچ' : 'TOTAL';
    container.innerHTML = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg); border-radius: 50%;">
        ${svgPaths}
      </svg>
      <div style="position: absolute; text-align: center; pointer-events: none;">
        <span style="font-size: 0.725rem; color: var(--text-muted); display: block; font-weight: 700; letter-spacing: 0.05em;">${totalLabel}</span>
        <strong style="font-size: 1.15rem; font-weight: 800; color: var(--text-main);">${App.formatCurrency(totalSpent)}</strong>
      </div>
    `;

    // Modern Legend
    legend.innerHTML = categories.map((cat) => {
      const catDisplayName = window.I18n ? window.I18n.getCategoryName(cat.name) : cat.name;
      return `
        <div class="legend-item clickable-legend-item" data-id="${cat.id}" style="cursor: pointer;" title="Click to view ${catDisplayName} expenses">
          <div class="legend-left">
            <span class="legend-dot" style="background-color: ${cat.color || '#6366f1'}; box-shadow: 0 0 6px ${cat.color || '#6366f1'};"></span>
            <span>${catDisplayName}</span>
          </div>
          <div class="legend-right">
            <span class="legend-amount">${App.formatCurrency(cat.total)}</span>
            <span class="legend-pct">${cat.percentage}%</span>
            <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 4px;">›</span>
          </div>
        </div>
      `;
    }).join('');

    legend.querySelectorAll('.clickable-legend-item').forEach((itemEl) => {
      itemEl.addEventListener('click', () => {
        const id = parseInt(itemEl.dataset.id, 10);
        const cat = categories.find((c) => c.id === id);
        if (cat && window.Categories) {
          window.Categories.openCategoryExpenses({
            id: cat.id,
            name: cat.name,
            color: cat.color,
            icon: cat.icon,
            total_spent: cat.total,
            expense_count: cat.count
          });
        }
      });
    });
  },

  renderTrendChart(dailyTrend) {
    const container = document.getElementById('trendChartContainer');

    if (!dailyTrend || dailyTrend.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="width:100%;">
          <div class="empty-state-icon">
            ${window.Icons ? window.Icons.get('trendUp', '', 28) : '📈'}
          </div>
          <h4>No Spending Trend Yet</h4>
          <p>Daily purchase totals will appear here over your selected date range.</p>
        </div>
      `;
      return;
    }

    const maxAmount = Math.max(...dailyTrend.map((d) => d.total), 1);
    const chartHeight = 180;
    const barWidth = Math.max(16, Math.min(42, Math.floor(340 / dailyTrend.length) - 8));

    const bars = dailyTrend.map((d, index) => {
      const barHeight = Math.max(8, Math.round((d.total / maxAmount) * (chartHeight - 45)));
      const dayLabel = d.date.slice(8);
      const monthLabel = window.I18n && window.I18n.isUrdu()
        ? ['جنوری','فروری','مارچ','اپریل','مئی','جون','جولائی','اگست','ستمبر','اکتوبر','نومبر','دسمبر'][parseInt(d.date.slice(5, 7), 10) - 1]
        : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(d.date.slice(5, 7), 10) - 1];

      return `
        <div class="trend-bar-column" style="min-width: ${barWidth}px;">
          <div style="font-size: 0.675rem; color: var(--text-muted); margin-bottom: 6px; font-weight: 700;">
            ${d.total >= 1000 ? (d.total / 1000).toFixed(1) + 'k' : d.total}
          </div>
          <div style="height: ${chartHeight - 45}px; display:flex; align-items:flex-end; width:100%; justify-content:center;">
            <div 
              class="trend-bar"
              style="width: 85%; max-width: ${barWidth}px; height: ${barHeight}px;"
              title="${d.date}: ${App.formatCurrency(d.total)}"
            ></div>
          </div>
          <div style="font-size: 0.725rem; font-weight: 700; color: var(--text-main); margin-top: 6px;">
            ${dayLabel}
          </div>
          <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 600;">
            ${monthLabel}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="trend-bars-wrapper">
        ${bars}
      </div>
    `;
  },

  renderRecentExpenses(recent) {
    const container = document.getElementById('dashRecentList');
    if (!recent || recent.length === 0) {
      const emptyTitle = window.I18n && window.I18n.isUrdu() ? 'کوئی حالیہ خریداری نہیں ہے' : 'No Purchases Recorded';
      const emptyDesc = window.I18n && window.I18n.isUrdu() ? 'نئی خریداری درج کرنے کے لیے "+ نیا خرچہ" پر کلک کریں۔' : 'Tap "+ Add Expense" to record daily grocery, meat, or supply purchases.';
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            ${window.Icons ? window.Icons.get('receipt', '', 28) : '🧾'}
          </div>
          <h4>${emptyTitle}</h4>
          <p>${emptyDesc}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = recent.map((item) => {
      const catName = window.I18n ? window.I18n.getCategoryName(item.category_name || item.item_name) : (item.category_name || item.item_name);
      const unitStr = item.unit ? (window.I18n ? window.I18n.getUnitName(item.unit) : item.unit) : '';

      return `
      <div class="expense-card" style="border:none; border-bottom: 1px solid var(--border-subtle); border-radius: 0; box-shadow: none; margin: 0; padding: 16px 20px;">
        <div class="exp-card-header">
          <div style="flex:1;">
            <div class="exp-item-title">
              <span class="category-pill" style="background-color: ${item.category_color}; font-size: 0.95rem; padding: 4px 10px;">
                ${this.escapeHtml(catName)}
              </span>
            </div>
            <div class="exp-card-meta mt-1">
              <span>${App.formatDate(item.date)}</span>
              ${item.quantity ? `<span>• <strong>${item.quantity}</strong> ${this.escapeHtml(unitStr)}</span>` : ''}
            </div>
          </div>
          <div class="exp-card-amount">
            ${App.formatCurrency(item.amount)}
          </div>
        </div>
      </div>
    `;}).join('');
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

window.Dashboard = Dashboard;
