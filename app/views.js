// HomeLedger views: pure rendering of each page section from state, so the
// overview, ledger, budgets, bills and planner always show the same numbers.
import { CATEGORY_COLORS, EXPENSE_CATEGORIES, categoryIcon } from './data.js';
import { spentByCategory, sumByType, transactionsInMonth } from './state.js';

export const ENVELOPES = [
  { name: 'Essentials', categories: ['Housing', 'Utilities', 'Transport'] },
  { name: 'Food & Home', categories: ['Groceries', 'Dining', 'Other'] },
  { name: 'Health & Learning', categories: ['Health', 'Education'] },
  { name: 'Fun & Future', categories: ['Entertainment', 'Savings'] },
];

export function escapeHTML(text) {
  return String(text ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

export function budgetStatus(spent, limit) {
  if (!limit || limit <= 0) return { pct: 0, cls: '', label: 'No limit set' };
  const pct = Math.round((spent / limit) * 100);
  if (spent > limit) return { pct, cls: 'red', label: `${pct}% — over budget` };
  if (pct >= 75) return { pct, cls: 'amber', label: `${pct}% used — nearly there` };
  return { pct, cls: '', label: `${pct}% used` };
}

// Safe to spend per day, exactly as documented: this month's balance so far
// minus the budget room still reserved, spread over the days left including
// today. Only meaningful for the current month.
export function safeToSpend(state, monthKey, today = new Date()) {
  const rows = transactionsInMonth(state.transactions, monthKey);
  const balance = sumByType(rows, 'income') - sumByType(rows, 'expense');
  const spent = spentByCategory(rows);
  let reserved = 0;
  for (const [category, limit] of Object.entries(state.budgets)) {
    if (limit > 0) reserved += Math.max(0, limit - (spent[category] || 0));
  }
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - today.getDate() + 1);
  return { value: (balance - reserved) / daysLeft, balance, reserved, daysLeft };
}

export function summaryCardsHTML(state, monthKey, formatMoney) {
  const rows = transactionsInMonth(state.transactions, monthKey);
  const income = sumByType(rows, 'income');
  const expenses = sumByType(rows, 'expense');
  const balance = income - expenses;
  const rate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
  const [py, pm] = monthKey.split('-').map(Number);
  const prevKey = `${pm === 1 ? py - 1 : py}-${String(pm === 1 ? 12 : pm - 1).padStart(2, '0')}`;
  const prevRows = transactionsInMonth(state.transactions, prevKey);
  const prevBalance = sumByType(prevRows, 'income') - sumByType(prevRows, 'expense');
  const diff = balance - prevBalance;
  const diffText = `${diff >= 0 ? '+' : '−'}${formatMoney(Math.abs(diff)).replace('-', '')} vs last month`;
  const today = new Date();
  const isCurrent = monthKey === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const safe = isCurrent ? safeToSpend(state, monthKey, today) : null;
  const safeCard = safe
    ? `<article class="card"><div class="label">Safe to spend / day</div><div class="value ${safe.value < 0 ? 'negative' : ''}">${safe.value < 0 ? 'Over plan' : formatMoney(safe.value)}</div><div class="sub" title="Balance so far minus budget room still reserved, divided by the days left this month including today">for the next ${safe.daysLeft} days</div></article>`
    : '<article class="card"><div class="label">Safe to spend / day</div><div class="value">n/a</div><div class="sub">current month only</div></article>';
  return [
    `<article class="card"><div class="label">Total income</div><div class="value positive">${formatMoney(income)}</div><div class="sub">${rows.filter((t) => t.type === 'income').length} payments in</div></article>`,
    `<article class="card"><div class="label">Total expenses</div><div class="value negative">${formatMoney(expenses)}</div><div class="sub">${rows.filter((t) => t.type === 'expense').length} payments out</div></article>`,
    `<article class="card"><div class="label">Balance</div><div class="value ${balance < 0 ? 'negative' : 'positive'}">${formatMoney(balance)}</div><div class="sub">${diffText}</div></article>`,
    `<article class="card"><div class="label">Savings rate</div><div class="value">${rate}%</div><div class="sub">of income kept this month</div></article>`,
    safeCard,
  ].join('');
}

export function categoryListHTML(totals, formatMoney, maxRows = 99) {
  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  if (total <= 0) return '<p class="empty-note">Nothing spent yet this month.</p>';
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const shown = sorted.slice(0, maxRows);
  const extra = sorted.length - shown.length;
  const rows = shown.map(([name, value]) => {
    const pct = Math.round((value / total) * 100);
    return `<button type="button" class="cat-row" data-filter-category="${escapeHTML(name)}" aria-label="Filter ledger by ${escapeHTML(name)}">
      <span class="cat-icon" style="background:${CATEGORY_COLORS[name] || '#64748b'}">${categoryIcon(name)}</span>
      <span><span class="cat-name">${escapeHTML(name)}</span><span class="cat-bar"><i style="width:${pct}%;background:${CATEGORY_COLORS[name] || '#64748b'}"></i></span></span>
      <span class="cat-amount">${formatMoney(value)}<small>${pct}%</small></span></button>`;
  }).join('');
  return extra > 0 ? rows + `<p class="muted">+ ${extra} more categories — open Budgets for every envelope.</p>` : rows;
}

export function transactionRowHTML(t, formatMoney, withActions) {
  const sign = t.type === 'income' ? '+' : '−';
  const actions = withActions
    ? `<span class="tx-actions"><button type="button" data-edit="${t.id}">Edit</button><button type="button" data-delete="${t.id}">Delete</button></span>` : '';
  return `<div class="tx-row">
    <span class="tx-icon" style="background:${CATEGORY_COLORS[t.category] || '#64748b'}">${categoryIcon(t.category)}</span>
    <span><span class="tx-note">${escapeHTML(t.note || t.category)}</span><br><span class="tx-meta">${escapeHTML(t.category)}${t.recurring ? ' · recurring' : ''}</span></span>
    <span class="tx-amount ${t.type === 'income' ? 'positive' : 'negative'}">${sign}${formatMoney(t.amount)}</span>${actions}</div>`;
}

export function ledgerHTML(rows, formatMoney) {
  if (!rows.length) return '<p class="empty-note">No transactions match. Add one with the button above — it will appear here grouped by date.</p>';
  const sorted = [...rows].sort((a, b) => (a.date < b.date ? 1 : -1) || (a.id < b.id ? 1 : -1));
  let lastDate = '';
  return sorted.map((t) => {
    const head = t.date !== lastDate ? `<div class="tx-group">${escapeHTML(t.date)}</div>` : '';
    lastDate = t.date;
    return head + transactionRowHTML(t, formatMoney, true);
  }).join('');
}

export function budgetsHTML(state, monthKey, formatMoney) {
  const spent = spentByCategory(transactionsInMonth(state.transactions, monthKey));
  return EXPENSE_CATEGORIES.map((name) => {
    const limit = state.budgets[name] || 0;
    const used = spent[name] || 0;
    const st = budgetStatus(used, limit);
    const width = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
    return `<div class="budget-row"><div class="budget-top">
      <span class="budget-name"><span class="cat-icon" style="background:${CATEGORY_COLORS[name]}">${categoryIcon(name)}</span>${name}</span>
      <span class="muted">${formatMoney(used)} of ${limit ? formatMoney(limit) : '—'} · <span class="${st.cls === 'red' ? 'negative' : st.cls === 'amber' ? 'warn' : ''}">${st.label}</span></span></div>
      <div class="progress"><i class="${st.cls}" style="width:${width}%"></i></div>
      <label class="budget-edit muted">Monthly limit <input type="number" min="0" step="1" value="${limit || ''}" data-budget-input="${name}" aria-label="Budget limit for ${name}"></label></div>`;
  }).join('');
}

export function envelopesHTML(state, monthKey, formatMoney) {
  const spent = spentByCategory(transactionsInMonth(state.transactions, monthKey));
  return ENVELOPES.map((env) => {
    const allocated = env.categories.reduce((s, c) => s + (state.budgets[c] || 0), 0);
    const used = env.categories.reduce((s, c) => s + (spent[c] || 0), 0);
    const left = allocated - used;
    const pct = allocated > 0 ? Math.min(100, Math.round((used / allocated) * 100)) : 0;
    return `<div class="envelope"><h3>${env.name}</h3><div class="big ${left < 0 ? 'negative' : ''}">${formatMoney(left)} left</div>
      <div class="muted">${formatMoney(used)} spent of ${formatMoney(allocated)}</div>
      <div class="progress"><i class="${left < 0 ? 'red' : pct >= 75 ? 'amber' : ''}" style="width:${pct}%"></i></div>
      <div class="muted">${env.categories.join(' · ')}</div></div>`;
  }).join('');
}

export function billsHTML(state, formatMoney) {
  return state.bills.map((bill) => `<div class="bill-row">
    <span><strong>${escapeHTML(bill.name)}</strong><br><span class="muted">${escapeHTML(bill.detail)} · ${escapeHTML(bill.category)}</span></span>
    <span><strong>${formatMoney(bill.amount)}</strong> ${bill.paid ? '<span class="paid-tag">Paid</span>' : '<span class="due-tag">Due</span>'}
    <button type="button" class="ghost-btn" data-toggle-bill="${bill.id}">${bill.paid ? 'Mark unpaid' : 'Mark paid'}</button></span></div>`).join('');
}

export function goalsHTML(state, formatMoney, withButtons) {
  return state.goals.map((goal) => {
    const pct = goal.target > 0 ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;
    const monthsLeft = goal.monthly > 0 ? Math.ceil((goal.target - goal.saved) / goal.monthly) : 0;
    return `<div class="goal-row"><span><strong>${escapeHTML(goal.name)}</strong><br><span class="muted">${formatMoney(goal.saved)} of ${formatMoney(goal.target)} · ${formatMoney(goal.monthly)} a month${monthsLeft > 0 ? ` · about ${monthsLeft} months to go` : ' · reached'}</span></span>
      ${withButtons ? `<button type="button" class="ghost-btn" data-add-goal="${goal.id}">Add ${formatMoney(goal.monthly)}</button>` : `<span class="paid-tag">${pct}%</span>`}
      <div class="progress"><i style="width:${pct}%"></i></div></div>`;
  }).join('');
}
