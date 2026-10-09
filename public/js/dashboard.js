// ==========================================
// Kitchen Expense Tracker - Dashboard Module
// ==========================================

const Dashboard = {
  async load() {
    try {
      const url = `/api/dashboard/stats?startDate=${App.state.startDate}&endDate=${App.state.endDate}`;
      const data = await App.apiFetch(url);
      this.renderSummary(data.summary, data.dailyTrend);
      this.renderDonutChart(data.categoryBreakdown, data.summary.totalSpent);
      this.renderTrendChart(data.dailyTrend);
      this.renderRecentExpenses(data.recentExpenses);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  },

  renderSummary(summary, dailyTrend) {
    document.getElementById('dashTotalSpent').textContent = App.formatCurrency(summary.totalSpent);
    document.getElementById('dashExpenseCount').textContent = `${summary.expenseCount} purchases recorded`;

    document.getElementById('dashTotalPayouts').textContent = App.formatCurrency(summary.totalPayouts);

    const netProfitEl = document.getElementById('dashNetProfit');
    const netIconEl = document.getElementById('dashNetIcon');
    const marginEl = document.getElementById('dashProfitMargin');

    if (summary.totalPayouts > 0) {
      if (summary.netProfit >= 0) {
        netProfitEl.className = 'stat-value text-success';
        netProfitEl.textContent = `+ ${App.formatCurrency(summary.netProfit)}`;
        netIconEl.textContent = '📈';
        marginEl.textContent = `${summary.profitMarginPct}% profit margin`;
      } else {
        netProfitEl.className = 'stat-value text-danger';
        netProfitEl.textContent = `- ${App.formatCurrency(Math.abs(summary.netProfit))}`;
        netIconEl.textContent = '📉';
        marginEl.textContent = `Deficit for selected period`;
      }
    } else {
      netProfitEl.className = 'stat-value text-muted';
      netProfitEl.textContent = 'No Payout Yet';
      netIconEl.textContent = '⚖️';
      marginEl.textContent = 'Add a payout to track P&L';
    }

    // Daily average based on days with spend
    const activeDaysCount = dailyTrend && dailyTrend.length > 0 ? dailyTrend.length : 1;
    const dailyAvg = summary.totalSpent > 0 ? (summary.totalSpent / activeDaysCount) : 0;
    document.getElementById('dashDailyAvg').textContent = App.formatCurrency(dailyAvg);
  },

  renderDonutChart(categories, totalSpent) {
    const container = document.getElementById('donutChartContainer');
    const legend = document.getElementById('categoryLegend');
    const countBadge = document.getElementById('categoryCountBadge');

    if (!categories || categories.length === 0 || totalSpent === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 30px; color: var(--text-muted);">
          <span style="font-size:2rem; display:block; margin-bottom: 6px;">📊</span>
          No expense data for this period
        </div>
      `;
      legend.innerHTML = '';
      countBadge.textContent = '0 categories';
      return;
    }

    countBadge.textContent = `${categories.length} categories`;

    // Build SVG Donut Chart
    const size = 180;
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
        >
          <title>${cat.name}: ${App.formatCurrency(cat.total)} (${cat.percentage}%)</title>
        </circle>
      `;
      accumulatedPct += pct;
    });

    container.innerHTML = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg); border-radius: 50%;">
        ${svgPaths}
      </svg>
      <div style="position: absolute; text-align: center; pointer-events: none;">
        <span style="font-size: 0.75rem; color: var(--text-muted); display: block; font-weight: 600;">TOTAL</span>
        <strong style="font-size: 1.05rem; font-weight: 800; color: var(--text-main);">${App.formatCurrency(totalSpent)}</strong>
      </div>
    `;

    // Build Legend
    legend.innerHTML = categories.map((cat) => `
      <div class="legend-item">
        <div class="legend-left">
          <span class="legend-dot" style="background-color: ${cat.color || '#6366f1'}"></span>
          <span>${cat.icon || '🏷️'} ${cat.name}</span>
        </div>
        <div class="legend-right">
          <span class="legend-amount">${App.formatCurrency(cat.total)}</span>
          <span class="legend-pct">${cat.percentage}%</span>
        </div>
      </div>
    `).join('');
  },

  renderTrendChart(dailyTrend) {
    const container = document.getElementById('trendChartContainer');

    if (!dailyTrend || dailyTrend.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 40px; color: var(--text-muted);">
          <span style="font-size:2rem; display:block; margin-bottom: 6px;">📈</span>
          No daily trend data available for this range
        </div>
      `;
      return;
    }

    const maxAmount = Math.max(...dailyTrend.map((d) => d.total), 1);
    const height = 180;
    const barWidth = Math.max(16, Math.min(42, Math.floor(340 / dailyTrend.length) - 6));

    const bars = dailyTrend.map((d) => {
      const barHeight = Math.max(6, Math.round((d.total / maxAmount) * (height - 40)));
      const dayLabel = d.date.slice(8); // get DD
      const monthLabel = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(d.date.slice(5, 7), 10) - 1];

      return `
        <div style="display:flex; flex-direction:column; align-items:center; flex:1; min-width: ${barWidth}px;">
          <div style="font-size: 0.65rem; color: var(--text-muted); margin-bottom: 4px; font-weight: 600;">
            ${d.total >= 1000 ? (d.total / 1000).toFixed(1) + 'k' : d.total}
          </div>
          <div style="height: ${height - 40}px; display:flex; align-items:flex-end; width:100%; justify-content:center;">
            <div 
              style="width: 80%; max-width: ${barWidth}px; height: ${barHeight}px; background: linear-gradient(180deg, var(--primary), var(--primary-hover)); border-radius: 4px 4px 0 0; transition: height 0.3s ease; cursor: pointer;"
              title="${d.date}: ${App.formatCurrency(d.total)} (${d.count} items)"
            ></div>
          </div>
          <div style="font-size: 0.7rem; font-weight: 600; color: var(--text-muted); margin-top: 6px;">
            ${dayLabel}
          </div>
          <div style="font-size: 0.6rem; color: var(--text-light);">
            ${monthLabel}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="display: flex; gap: 8px; align-items: flex-end; overflow-x: auto; padding-bottom: 6px; width: 100%;">
        ${bars}
      </div>
    `;
  },

  renderRecentExpenses(recent) {
    const container = document.getElementById('dashRecentList');
    if (!recent || recent.length === 0) {
      container.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted);">
          No recent expenses recorded yet.
        </div>
      `;
      return;
    }

    container.innerHTML = recent.map((item) => `
      <div class="expense-card" style="margin: 8px 12px; box-shadow: none;">
        <div class="exp-card-header">
          <div>
            <div class="exp-item-title">${item.item_name}</div>
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
      </div>
    `).join('');
  }
};

window.Dashboard = Dashboard;
