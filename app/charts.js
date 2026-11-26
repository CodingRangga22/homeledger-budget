// HomeLedger charts: hand-built inline SVG (donut + grouped bars), no library.
// Both charts are pure functions of their data so every number on the page
// agrees with the ledger underneath it.
import { CATEGORY_COLORS } from './data.js';

function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}
function arcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const [x1, y1] = polar(cx, cy, rOuter, startAngle);
  const [x2, y2] = polar(cx, cy, rOuter, endAngle);
  const [x3, y3] = polar(cx, cy, rInner, endAngle);
  const [x4, y4] = polar(cx, cy, rInner, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${rInner} ${rInner} 0 ${large} 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z`;
}

export function donutChartSVG(totals, formatMoney) {
  const entries = Object.entries(totals).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total <= 0) return '<p class="empty-note">No spending recorded this month yet.</p>';
  let angle = 0;
  const slices = entries.map(([name, value]) => {
    const sweep = (value / total) * 360;
    const path = sweep >= 359.9
      ? arcPath(90, 90, 78, 48, 0, 359.9)
      : arcPath(90, 90, 78, 48, angle, angle + sweep);
    angle += sweep;
    return `<path d="${path}" fill="${CATEGORY_COLORS[name] || '#94a3b8'}"><title>${name}: ${formatMoney(value)}</title></path>`;
  }).join('');
  return `<svg class="donut" viewBox="0 0 180 180" role="img" aria-label="Spending by category donut chart">${slices}<text x="90" y="86" text-anchor="middle" class="donut-total">${formatMoney(total)}</text><text x="90" y="104" text-anchor="middle" class="donut-label">spent</text></svg>`;
}

export function trendChartSVG(months, formatMoney) {
  // months: [{label, income, expense}] oldest first, up to 6 entries.
  const width = 560; const height = 210; const baseline = 178;
  const maxValue = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  const groupWidth = width / Math.max(1, months.length);
  const barWidth = Math.min(30, groupWidth / 3);
  const bars = months.map((m, i) => {
    const gx = i * groupWidth + groupWidth / 2;
    const incomeH = (m.income / maxValue) * 140;
    const expenseH = (m.expense / maxValue) * 140;
    return `<rect x="${(gx - barWidth - 3).toFixed(1)}" y="${(baseline - incomeH).toFixed(1)}" width="${barWidth}" height="${incomeH.toFixed(1)}" rx="4" fill="#16a34a"><title>${m.label} income ${formatMoney(m.income)}</title></rect>`
      + `<rect x="${(gx + 3).toFixed(1)}" y="${(baseline - expenseH).toFixed(1)}" width="${barWidth}" height="${expenseH.toFixed(1)}" rx="4" fill="#dc2626"><title>${m.label} expenses ${formatMoney(m.expense)}</title></rect>`
      + `<text x="${gx.toFixed(1)}" y="198" text-anchor="middle" class="trend-label">${m.label}</text>`;
  }).join('');
  return `<svg class="trend" viewBox="0 0 ${width} ${height}" role="img" aria-label="Income versus expenses for the last six months"><line x1="8" y1="${baseline}" x2="${width - 8}" y2="${baseline}" class="trend-axis"/>${bars}</svg>`
    + '<p class="legend"><span class="dot dot-in"></span> Income <span class="dot dot-out"></span> Expenses</p>';
}
