// Charts for HomeLedger: one job, building the two hand-made inline SVG
// charts (expense donut and six-month grouped bars) as strings. No chart
// library, no external assets; colours come from the category catalogue.

const DONUT_RADIUS = 70;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

// Donut of expense shares with the total in the middle. Segments are stroke
// arcs on one circle, each starting where the previous one ended.
export function buildDonutChartSvg(breakdown, formattedTotal) {
  if (!breakdown.length) {
    return `<svg viewBox="0 0 200 200" class="donut" aria-hidden="true">
      <circle cx="100" cy="100" r="${DONUT_RADIUS}" fill="none" stroke="var(--border)" stroke-width="26"/>
      <text x="100" y="96" text-anchor="middle" class="donut-empty">No expenses</text>
      <text x="100" y="116" text-anchor="middle" class="donut-empty-sub">yet this month</text>
    </svg>`;
  }
  let offset = 0;
  const segments = breakdown
    .map((entry) => {
      const length = Math.max(0, entry.share * DONUT_CIRCUMFERENCE - 2);
      const segment = `<circle cx="100" cy="100" r="${DONUT_RADIUS}" fill="none" stroke="${entry.color}" stroke-width="26"
        stroke-dasharray="${length} ${DONUT_CIRCUMFERENCE - length}" stroke-dashoffset="${-offset}"
        transform="rotate(-90 100 100)" class="donut-segment"><title>${entry.label}: ${entry.formattedAmount}</title></circle>`;
      offset += entry.share * DONUT_CIRCUMFERENCE;
      return segment;
    })
    .join("");
  return `<svg viewBox="0 0 200 200" class="donut" aria-hidden="true">${segments}
    <text x="100" y="94" text-anchor="middle" class="donut-total-label">Spent</text>
    <text x="100" y="118" text-anchor="middle" class="donut-total">${formattedTotal}</text>
  </svg>`;
}

// Grouped bar chart: one income bar and one expense bar per month.
export function buildTrendChartSvg(trend, formatAmount) {
  const width = 560;
  const height = 210;
  const baseline = 176;
  const chartHeight = 140;
  const maxValue = Math.max(1, ...trend.map((month) => Math.max(month.income, month.expenses)));
  const groupWidth = width / trend.length;
  const barWidth = 22;
  const bars = trend
    .map((month, index) => {
      const groupX = index * groupWidth + groupWidth / 2;
      const incomeHeight = Math.round((month.income / maxValue) * chartHeight);
      const expenseHeight = Math.round((month.expenses / maxValue) * chartHeight);
      return `<g>
        <rect x="${groupX - barWidth - 3}" y="${baseline - incomeHeight}" width="${barWidth}" height="${incomeHeight}" rx="4" class="bar-income"><title>${month.label} income: ${formatAmount(month.income)}</title></rect>
        <rect x="${groupX + 3}" y="${baseline - expenseHeight}" width="${barWidth}" height="${expenseHeight}" rx="4" class="bar-expense"><title>${month.label} expenses: ${formatAmount(month.expenses)}</title></rect>
        <text x="${groupX}" y="${baseline + 20}" text-anchor="middle" class="bar-label">${month.label}</text>
      </g>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${width} ${height}" class="trend-chart" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <line x1="8" y1="${baseline}" x2="${width - 8}" y2="${baseline}" class="axis-line"/>${bars}
  </svg>`;
}
