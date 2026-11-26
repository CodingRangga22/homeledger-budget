// HomeLedger app entry: wiring, routing, rendering and every control.
// State lives in state.js, seed data in data.js, charts in charts.js and
// page fragments in views.js; this file only connects them to the DOM.
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './data.js';
import { donutChartSVG, trendChartSVG } from './charts.js';
import {
  STORAGE_KEY, clearStoredState, loadState, monthKeyOf, monthLabel, saveState, shiftMonthKey,
  spentByCategory, sumByType, transactionsInMonth,
} from './state.js';
import {
  billsHTML, budgetsHTML, categoryListHTML, envelopesHTML, goalsHTML, ledgerHTML,
  summaryCardsHTML, transactionRowHTML,
} from './views.js';

let state = loadState();
// Persist the seeded demo on the very first run so a refresh keeps it.
try {
  if (!window.localStorage.getItem(STORAGE_KEY)) saveState(state);
} catch {
  saveState(state);
}
let selectedMonth = monthKeyOf(new Date());
let activeView = 'overview';
let categoryFilter = 'all';
let lastDeleted = null;
let toastTimer = null;

const $ = (id) => document.getElementById(id);
const money = (value) => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: state.currency, maximumFractionDigits: state.currency === 'JPY' || state.currency === 'IDR' ? 0 : 2 }).format(value);
  } catch {
    return `$${Number(value || 0).toFixed(2)}`;
  }
};

function applyTheme() {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = state.theme === 'dark' || (state.theme === 'system' && prefersDark);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

function currentMonthRows() { return transactionsInMonth(state.transactions, selectedMonth); }

function render() {
  applyTheme();
  $('currency-select').value = state.currency;
  $('month-title').textContent = monthLabel(selectedMonth);
  $('demo-banner').hidden = !state.isDemo;
  document.querySelectorAll('.main-nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === activeView));
  document.querySelectorAll('.view').forEach((v) => { v.hidden = v.id !== `view-${activeView}`; });

  const rows = currentMonthRows();
  $('summary-cards').innerHTML = summaryCardsHTML(state, selectedMonth, money);
  const totals = spentByCategory(rows);
  $('donut-slot').innerHTML = donutChartSVG(totals, money);
  $('category-list').innerHTML = categoryListHTML(totals, money, 6);
  const recent = [...rows].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
  $('recent-list').innerHTML = recent.length ? recent.map((t) => transactionRowHTML(t, money, false)).join('') : '<p class="empty-note">No transactions this month yet.</p>';

  const trendMonths = [];
  for (let back = 5; back >= 0; back--) {
    const key = shiftMonthKey(selectedMonth, -back);
    const mrows = transactionsInMonth(state.transactions, key);
    const label = new Date(`${key}-02T12:00:00`).toLocaleString('en-US', { month: 'short' });
    trendMonths.push({ label, income: sumByType(mrows, 'income'), expense: sumByType(mrows, 'expense') });
  }
  $('trend-slot').innerHTML = trendChartSVG(trendMonths, money);

  const dueBills = state.bills.filter((b) => !b.paid);
  $('due-list').innerHTML = dueBills.length
    ? dueBills.map((b) => `<p><strong>${b.name}</strong> — ${money(b.amount)}<br><span class="muted">${b.detail}</span></p>`).join('')
    : '<p class="empty-note">Nothing due. Every bill is paid.</p>';
  $('goal-preview').innerHTML = goalsHTML(state, money, false);

  renderLedger();
  $('budget-list').innerHTML = budgetsHTML(state, selectedMonth, money);
  $('envelope-grid').innerHTML = envelopesHTML(state, selectedMonth, money);
  fillCategorySelects();
  $('bill-list').innerHTML = billsHTML(state, money);
  const dueTotal = dueBills.reduce((s, b) => s + b.amount, 0);
  const paidTotal = state.bills.filter((b) => b.paid).reduce((s, b) => s + b.amount, 0);
  $('bill-summary').textContent = `Due this month: ${money(dueTotal)} · Already paid: ${money(paidTotal)}`;
  $('goal-list').innerHTML = goalsHTML(state, money, true);
  renderRollover();
}

function renderRollover() {
  const prevKey = shiftMonthKey(selectedMonth, -1);
  const prevRows = transactionsInMonth(state.transactions, prevKey);
  const surplus = sumByType(prevRows, 'income') - sumByType(prevRows, 'expense');
  const nextKey = shiftMonthKey(selectedMonth, 1);
  const plannedIncome = 3200;
  $('rollover-box').innerHTML = `<p><strong>${monthLabel(prevKey)}</strong> closed with a balance of <strong class="${surplus < 0 ? 'negative' : 'positive'}">${money(surplus)}</strong>.</p>
    <p class="muted">${surplus >= 0
      ? `That surplus rolls into ${monthLabel(selectedMonth)} in the Fun &amp; Future envelope, on top of this month's budgets.`
      : `That shortfall rolls into ${monthLabel(selectedMonth)}: trim an envelope before new spending.`}</p>
    <p>Looking ahead to <strong>${monthLabel(nextKey)}</strong>: expected income about ${money(plannedIncome)}, planned savings ${money(state.goals.reduce((s, g) => s + g.monthly, 0))} across ${state.goals.length} goals, and rent of ${money(state.budgets.Housing ? 768 : 0)} due on the 1st.</p>`;
}

function filteredLedgerRows() {
  const query = ($('search-input').value || '').toLowerCase();
  const type = $('filter-type').value;
  return currentMonthRows().filter((t) => {
    if (type !== 'all' && t.type !== type) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (query && !`${t.note} ${t.category}`.toLowerCase().includes(query)) return false;
    return true;
  });
}
function renderLedger() {
  $('filter-category').value = categoryFilter;
  $('ledger-list').innerHTML = ledgerHTML(filteredLedgerRows(), money);
}

function fillCategorySelects() {
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  const unique = [...new Set(all)];
  const filter = $('filter-category');
  if (filter.options.length !== unique.length + 1) {
    filter.innerHTML = '<option value="all">All categories</option>' + unique.map((c) => `<option value="${c}">${c}</option>`).join('');
  }
  const moveOptions = EXPENSE_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');
  if ($('move-from').options.length !== EXPENSE_CATEGORIES.length) { $('move-from').innerHTML = moveOptions; $('move-to').innerHTML = moveOptions; $('move-to').value = 'Savings'; }
  fillFormCategories();
}
function fillFormCategories() {
  const type = $('field-type').value;
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const current = $('field-category').value;
  $('field-category').innerHTML = list.map((c) => `<option value="${c}">${c}</option>`).join('');
  if (list.includes(current)) $('field-category').value = current;
}

function showToast(message, withUndo) {
  $('toast-text').textContent = message;
  $('toast-undo').hidden = !withUndo;
  $('toast').hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { $('toast').hidden = true; }, 6000);
}

function openForm(transaction) {
  $('sheet-backdrop').hidden = false;
  $('form-title').textContent = transaction ? 'Edit transaction' : 'Add transaction';
  $('field-id').value = transaction ? transaction.id : '';
  $('field-type').value = transaction ? transaction.type : 'expense';
  fillFormCategories();
  $('field-category').value = transaction ? transaction.category : EXPENSE_CATEGORIES[0];
  $('field-amount').value = transaction ? transaction.amount : '';
  $('field-date').value = transaction ? transaction.date : `${selectedMonth}-${String(Math.min(new Date().getDate(), 28)).padStart(2, '0')}`;
  if (selectedMonth !== monthKeyOf(new Date())) $('field-date').value = transaction ? transaction.date : `${selectedMonth}-01`;
  $('field-note').value = transaction ? transaction.note || '' : '';
  $('field-recurring').checked = transaction ? Boolean(transaction.recurring) : false;
  $('form-error').textContent = '';
  $('field-amount').focus();
}
function closeForm() { $('sheet-backdrop').hidden = true; }

function onFormSubmit(event) {
  event.preventDefault();
  const amount = Number($('field-amount').value);
  const date = $('field-date').value;
  const note = $('field-note').value.trim().slice(0, 80);
  if (!Number.isFinite(amount) || amount <= 0) { $('form-error').textContent = 'Please enter an amount above zero.'; return; }
  if (amount > 100000000) { $('form-error').textContent = 'That amount looks too large — please check it.'; return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { $('form-error').textContent = 'Please pick a valid date.'; return; }
  const id = $('field-id').value;
  const record = { id: id || `tx-${Date.now()}-${Math.floor(Math.random() * 9999)}`, type: $('field-type').value, amount: Math.round(amount * 100) / 100, category: $('field-category').value, date, note, recurring: $('field-recurring').checked };
  if (id) {
    state.transactions = state.transactions.map((t) => (t.id === id ? record : t));
    showToast('Transaction updated.', false);
  } else {
    state.transactions.push(record);
    showToast('Transaction added.', false);
  }
  selectedMonth = date.slice(0, 7);
  saveState(state); closeForm(); render();
}

function downloadFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
}

function route() {
  const name = (window.location.hash || '#/overview').replace('#/', '').split('/')[0];
  activeView = ['overview', 'ledger', 'budgets', 'bills', 'planner'].includes(name) ? name : 'overview';
  render();
}

function bindEvents() {
  window.addEventListener('hashchange', route);
  $('month-prev').addEventListener('click', () => { selectedMonth = shiftMonthKey(selectedMonth, -1); render(); });
  $('month-next').addEventListener('click', () => { selectedMonth = shiftMonthKey(selectedMonth, 1); render(); });
  $('month-today').addEventListener('click', () => { selectedMonth = monthKeyOf(new Date()); render(); });
  $('theme-toggle').addEventListener('click', () => {
    const darkNow = document.documentElement.dataset.theme === 'dark';
    state.theme = darkNow ? 'light' : 'dark'; saveState(state); render();
  });
  $('currency-select').addEventListener('change', (e) => { state.currency = e.target.value; saveState(state); render(); });
  $('dismiss-demo').addEventListener('click', () => { $('demo-banner').hidden = true; });
  $('clear-demo').addEventListener('click', () => {
    state = { transactions: [], budgets: {}, bills: [], goals: [], currency: state.currency, theme: state.theme, isDemo: false, recurringApplied: {} };
    saveState(state); render(); showToast('Demo data cleared. Your ledger is empty and ready.', false);
  });
  $('open-add').addEventListener('click', () => openForm(null));
  $('fab-add').addEventListener('click', () => openForm(null));
  $('form-cancel').addEventListener('click', closeForm);
  $('sheet-backdrop').addEventListener('click', (e) => { if (e.target === $('sheet-backdrop')) closeForm(); });
  $('tx-form').addEventListener('submit', onFormSubmit);
  $('field-type').addEventListener('change', fillFormCategories);
  $('search-input').addEventListener('input', renderLedger);
  $('filter-type').addEventListener('change', renderLedger);
  $('filter-category').addEventListener('change', (e) => { categoryFilter = e.target.value; renderLedger(); });
  $('category-list').addEventListener('click', (e) => {
    const row = e.target.closest('[data-filter-category]');
    if (!row) return;
    categoryFilter = row.dataset.filterCategory;
    window.location.hash = '#/ledger';
    render();
  });
  $('ledger-list').addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit]');
    const deleteBtn = e.target.closest('[data-delete]');
    if (editBtn) openForm(state.transactions.find((t) => t.id === editBtn.dataset.edit));
    if (deleteBtn) {
      lastDeleted = state.transactions.find((t) => t.id === deleteBtn.dataset.delete) || null;
      state.transactions = state.transactions.filter((t) => t.id !== deleteBtn.dataset.delete);
      saveState(state); render(); showToast('Transaction deleted.', true);
    }
  });
  $('toast-undo').addEventListener('click', () => {
    if (lastDeleted) { state.transactions.push(lastDeleted); lastDeleted = null; saveState(state); render(); }
    $('toast').hidden = true;
  });
  $('budget-list').addEventListener('change', (e) => {
    const input = e.target.closest('[data-budget-input]');
    if (!input) return;
    const value = Math.max(0, Number(input.value) || 0);
    state.budgets[input.dataset.budgetInput] = value;
    saveState(state); render(); showToast('Budget updated.', false);
  });
  $('move-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const from = $('move-from').value; const to = $('move-to').value; const amount = Number($('move-amount').value);
    if (from === to) { $('move-message').textContent = 'Pick two different categories.'; return; }
    if (!Number.isFinite(amount) || amount <= 0 || amount > (state.budgets[from] || 0)) { $('move-message').textContent = 'Enter an amount within the source budget.'; return; }
    state.budgets[from] -= amount; state.budgets[to] = (state.budgets[to] || 0) + amount;
    saveState(state); render(); $('move-message').textContent = `Moved ${money(amount)} from ${from} to ${to}.`;
  });
  $('bill-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-toggle-bill]');
    if (!btn) return;
    state.bills = state.bills.map((b) => (b.id === btn.dataset.toggleBill ? { ...b, paid: !b.paid } : b));
    saveState(state); render();
  });
  $('goal-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-goal]');
    if (!btn) return;
    state.goals = state.goals.map((g) => (g.id === btn.dataset.addGoal ? { ...g, saved: Math.min(g.target, g.saved + g.monthly) } : g));
    saveState(state); render(); showToast('Monthly contribution added to the goal.', false);
  });
  $('add-recurring').addEventListener('click', () => {
    const sources = state.transactions.filter((t) => t.recurring && t.date.slice(0, 7) < selectedMonth);
    const latestByKey = {};
    for (const t of sources) latestByKey[`${t.category}|${t.note}`] = t;
    let added = 0;
    for (const src of Object.values(latestByKey)) {
      const exists = state.transactions.some((t) => t.recurringFrom === src.id && t.date.startsWith(selectedMonth));
      if (exists) continue;
      const day = Math.min(Number(src.date.slice(8, 10)), 28);
      state.transactions.push({ ...src, id: `tx-rec-${Date.now()}-${added}`, date: `${selectedMonth}-${String(day).padStart(2, '0')}`, recurringFrom: src.id });
      added++;
    }
    saveState(state); render();
    showToast(added ? `${added} recurring item(s) added to ${monthLabel(selectedMonth)}.` : 'No new recurring items for this month.', false);
  });
  $('export-json').addEventListener('click', () => downloadFile('homeledger-backup.json', JSON.stringify(state, null, 2), 'application/json'));
  $('export-csv').addEventListener('click', () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = ['date,type,category,amount,note,recurring', ...state.transactions.map((t) => [t.date, t.type, esc(t.category), t.amount, esc(t.note), t.recurring ? 'yes' : 'no'].join(','))].join('\n');
    downloadFile('homeledger-transactions.csv', csv, 'text/csv');
  });
  $('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        const parsed = JSON.parse(text);
        if (!parsed || !Array.isArray(parsed.transactions)) throw new Error('bad file');
        state = { ...state, ...parsed };
        saveState(state); render();
        $('tools-message').textContent = 'Import complete — your backup is loaded.';
      } catch {
        $('tools-message').textContent = 'That file could not be imported. Please use a HomeLedger JSON backup.';
      }
    });
  });
  $('reset-all').addEventListener('click', () => {
    if (!window.confirm('Delete every transaction, budget, bill and goal on this device?')) return;
    clearStoredState();
    state = { transactions: [], budgets: {}, bills: [], goals: [], currency: 'USD', theme: 'system', isDemo: false, recurringApplied: {} };
    saveState(state); render(); showToast('All data reset.', false);
  });
}

bindEvents();
route();
