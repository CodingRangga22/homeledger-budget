// HomeLedger main module: state, rendering and event handlers. Rendering is
// split into small functions, one per region of the page, and every render
// reads from the same state object so the figures always agree with each
// other. Handlers are wired once at the bottom of this file.

import { categoriesForType, categoryIconSvg, findCategory } from "./categories.js";
import {
  budgetUsage, expenseBreakdown, monthKeyOf, percentChange, safeToSpendPerDay,
  shiftMonth, sixMonthTrend, summariseMonth,
} from "./calculations.js";
import { buildDonutChartSvg, buildTrendChartSvg } from "./charts.js";
import { buildDemoData } from "./demo-data.js";
import { clearStoredState, createEmptyState, loadState, saveState } from "./storage.js";

// ---------------------------------------------------------------- state

let state = loadState();
if (!state) {
  state = createEmptyState();
  const demo = buildDemoData(new Date());
  state.transactions = demo.transactions;
  state.budgets = demo.budgets;
  state.demoSeeded = true;
  saveState(state);
}

let selectedMonth = monthKeyOf(new Date());
let activeCategoryFilter = null;
let editingTransactionId = null;
let formType = "expense";
let lastDeletedTransaction = null;
let toastTimer = null;

const CURRENCY_CODES = ["USD", "EUR", "GBP", "JPY", "IDR", "SGD", "AUD", "CAD", "CHF", "CNY", "INR"];
const element = (id) => document.getElementById(id);

// ------------------------------------------------------------ formatting

function formatMoney(amount) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: state.currency }).format(amount);
  } catch {
    return `${state.currency} ${amount.toFixed(2)}`;
  }
}

function formatSignedPercent(value) {
  if (value === null || !Number.isFinite(value)) return "No data for last month";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}% vs last month`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function localIsoDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function friendlyDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

// ---------------------------------------------------------------- theme

function effectiveTheme() {
  if (state.theme === "dark" || state.theme === "light") return state.theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme() {
  const theme = effectiveTheme();
  document.documentElement.dataset.theme = theme;
  element("themeToggle").innerHTML = theme === "dark"
    ? `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`
    : `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13.5A8.5 8.5 0 1 1 10.5 4 6.8 6.8 0 0 0 20 13.5z"/></svg>`;
}

// -------------------------------------------------------------- rendering

function renderSummary() {
  const summary = summariseMonth(state.transactions, selectedMonth);
  const previous = summariseMonth(state.transactions, shiftMonth(selectedMonth, -1));
  element("totalIncome").textContent = formatMoney(summary.income);
  element("totalExpenses").textContent = formatMoney(summary.expenses);
  const balanceElement = element("balanceValue");
  balanceElement.textContent = formatMoney(summary.balance);
  balanceElement.className = `summary-value ${summary.balance < 0 ? "negative" : "positive"}`;
  element("savingsRate").textContent = `${summary.savingsRate.toFixed(1)}%`;
  element("incomeDelta").textContent = formatSignedPercent(percentChange(summary.income, previous.income));
  element("expensesDelta").textContent = formatSignedPercent(percentChange(summary.expenses, previous.expenses));
  element("balanceDelta").textContent = formatSignedPercent(percentChange(summary.balance, previous.balance));
  element("savingsDelta").textContent = previous.income > 0
    ? `${(summary.savingsRate - previous.savingsRate).toFixed(1)} pts vs last month`
    : "No data for last month";

  const safe = safeToSpendPerDay(state.transactions, state.budgets, selectedMonth, new Date());
  const safeElement = element("safeToSpend");
  if (!safe) {
    safeElement.textContent = "n/a";
    safeElement.className = "summary-value";
    element("safeToSpendNote").textContent = "Shown for the current month";
  } else if (safe.overPlan) {
    safeElement.textContent = "Over plan";
    safeElement.className = "summary-value negative";
    element("safeToSpendNote").textContent = "Spending plus set-aside budgets pass this month's income";
  } else {
    safeElement.textContent = `${formatMoney(safe.amount)} / day`;
    safeElement.className = "summary-value positive";
    element("safeToSpendNote").textContent = `${safe.daysLeft} days left, ${formatMoney(safe.reserved)} set aside in budgets`;
  }
}

function renderMonthBar() {
  const [year, month] = selectedMonth.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  element("monthTitle").textContent = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const count = state.transactions.filter((t) => t.date.startsWith(selectedMonth)).length;
  element("monthSubtitle").textContent = `${count} transaction${count === 1 ? "" : "s"} this month`;
  element("nextMonth").disabled = selectedMonth >= monthKeyOf(new Date());
}

function renderBreakdown() {
  const breakdown = expenseBreakdown(state.transactions, selectedMonth).map((entry) => {
    const category = findCategory(entry.category);
    return { ...entry, color: category.color, label: category.label, formattedAmount: formatMoney(entry.amount) };
  });
  element("donutChart").innerHTML = buildDonutChartSvg(breakdown, formatMoney(breakdown.reduce((sum, e) => sum + e.amount, 0)));
  const list = element("categoryList");
  if (!breakdown.length) {
    list.innerHTML = `<li class="empty-note">No expenses recorded this month yet.</li>`;
    return;
  }
  list.innerHTML = breakdown
    .map((entry) => {
      const category = findCategory(entry.category);
      const selected = activeCategoryFilter === entry.category ? " selected" : "";
      return `<li><button type="button" class="category-row${selected}" data-category="${entry.category}" aria-pressed="${activeCategoryFilter === entry.category}">
        <span class="category-icon">${categoryIconSvg(category)}</span>
        <span><span class="category-name">${category.label}</span>
          <span class="category-bar"><span class="category-bar-fill" style="display:block;width:${Math.round(entry.share * 100)}%;background:${category.color}"></span></span></span>
        <span class="category-amount"><strong>${formatMoney(entry.amount)}</strong><span>${(entry.share * 100).toFixed(1)}%</span></span>
      </button></li>`;
    })
    .join("");
  list.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      activeCategoryFilter = activeCategoryFilter === button.dataset.category ? null : button.dataset.category;
      renderAll();
    });
  });
}

function renderBudgets() {
  const usage = budgetUsage(state.transactions, state.budgets, selectedMonth);
  const container = element("budgetList");
  if (!usage.length) {
    container.innerHTML = `<p class="empty-note">No budgets set yet. Add a monthly limit below and HomeLedger will track it here.</p>`;
    return;
  }
  container.innerHTML = usage
    .map((entry) => {
      const category = findCategory(entry.category);
      const percent = Math.round(entry.ratio * 100);
      const level = entry.ratio > 1 ? "over" : entry.ratio >= 0.8 ? "warn" : "";
      const note = entry.ratio > 1
        ? `<p class="budget-note over">${formatMoney(entry.spent - entry.limit)} over the limit. Consider moving money from another category.</p>`
        : entry.ratio >= 0.8
          ? `<p class="budget-note warn">Getting close: ${formatMoney(entry.limit - entry.spent)} left for this month.</p>`
          : `<p class="budget-note muted">${formatMoney(entry.limit - entry.spent)} left for this month.</p>`;
      return `<div class="budget-row">
        <div class="budget-row-head">
          <span class="budget-name">${categoryIconSvg(category, 16)} ${category.label}</span>
          <span class="budget-figures">${formatMoney(entry.spent)} of ${formatMoney(entry.limit)} (${percent}%)
            <button type="button" class="budget-remove" data-remove-budget="${entry.category}" aria-label="Remove ${category.label} budget">Remove</button></span>
        </div>
        <div class="budget-track"><div class="budget-fill ${level}" style="width:${Math.min(100, percent)}%"></div></div>
        ${note}
      </div>`;
    })
    .join("");
  container.querySelectorAll("[data-remove-budget]").forEach((button) => {
    button.addEventListener("click", () => {
      delete state.budgets[button.dataset.removeBudget];
      saveState(state);
      renderAll();
      showToast("Budget removed");
    });
  });
}

function renderTrend() {
  const trend = sixMonthTrend(state.transactions, selectedMonth);
  element("trendChart").innerHTML = buildTrendChartSvg(trend, formatMoney);
}

function filteredTransactions() {
  const search = element("searchInput").value.trim().toLowerCase();
  const type = element("typeFilter").value;
  return state.transactions
    .filter((t) => t.date.startsWith(selectedMonth))
    .filter((t) => type === "all" || t.type === type)
    .filter((t) => !activeCategoryFilter || t.category === activeCategoryFilter)
    .filter((t) => {
      if (!search) return true;
      const category = findCategory(t.category).label.toLowerCase();
      return t.note.toLowerCase().includes(search) || category.includes(search);
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function renderTransactions() {
  const rows = filteredTransactions();
  element("transactionCount").textContent = `${rows.length} shown`;
  const filterNote = element("activeFilterNote");
  const clearButton = element("clearFilterButton");
  if (activeCategoryFilter) {
    filterNote.hidden = false;
    filterNote.textContent = `Filtered by category: ${findCategory(activeCategoryFilter).label}`;
    clearButton.hidden = false;
  } else {
    filterNote.hidden = true;
    clearButton.hidden = true;
  }
  const container = element("transactionList");
  if (!rows.length) {
    container.innerHTML = `<div class="empty-state"><strong>Nothing here yet</strong>
      No transactions match this view. Add one with the button above, or clear the filters.</div>`;
    return;
  }
  let currentDate = "";
  container.innerHTML = rows
    .map((transaction) => {
      const category = findCategory(transaction.category);
      const groupTitle = transaction.date !== currentDate
        ? `<h3 class="date-group-title">${friendlyDate(transaction.date)}</h3>`
        : "";
      currentDate = transaction.date;
      const sign = transaction.type === "income" ? "+" : "-";
      return `${groupTitle}<div class="transaction-row">
        <span class="transaction-icon">${categoryIconSvg(category, 19)}</span>
        <span><span class="transaction-note">${escapeHtml(transaction.note || category.label)}</span>
          <span class="transaction-category">${category.label}</span></span>
        <span class="transaction-amount ${transaction.type}">${sign}${formatMoney(transaction.amount)}</span>
        <span class="row-actions">
          <button type="button" class="row-action" data-edit="${transaction.id}">Edit</button>
          <button type="button" class="row-action delete" data-delete="${transaction.id}">Delete</button>
        </span>
      </div>`;
    })
    .join("");
  container.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openForm(state.transactions.find((t) => t.id === button.dataset.edit)));
  });
  container.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteTransaction(button.dataset.delete));
  });
}

function renderDemoBanner() {
  element("demoBanner").hidden = !(state.demoSeeded && !state.demoBannerDismissed);
}

function renderAll() {
  renderMonthBar();
  renderSummary();
  renderBreakdown();
  renderBudgets();
  renderTrend();
  renderTransactions();
  renderDemoBanner();
}

// ---------------------------------------------------------------- toast

function showToast(message, withUndo = false) {
  const toast = element("toast");
  element("toastText").textContent = message;
  element("toastUndoButton").hidden = !withUndo;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 6000);
}

// ------------------------------------------------------------ form logic

function fillCategoryOptions(selectElement, type, selectedId) {
  selectElement.innerHTML = categoriesForType(type)
    .map((category) => `<option value="${category.id}">${category.label}</option>`)
    .join("");
  if (selectedId) selectElement.value = selectedId;
}

function setFormType(type) {
  formType = type;
  element("typeExpenseButton").classList.toggle("active", type === "expense");
  element("typeIncomeButton").classList.toggle("active", type === "income");
  fillCategoryOptions(element("categoryInput"), type, element("categoryInput").value);
}

function openForm(transaction = null) {
  editingTransactionId = transaction ? transaction.id : null;
  element("formTitle").textContent = transaction ? "Edit transaction" : "Add transaction";
  element("saveTransactionButton").textContent = transaction ? "Save changes" : "Save transaction";
  element("formError").hidden = true;
  setFormType(transaction ? transaction.type : "expense");
  element("amountInput").value = transaction ? transaction.amount : "";
  fillCategoryOptions(element("categoryInput"), formType, transaction ? transaction.category : undefined);
  element("dateInput").value = transaction ? transaction.date : localIsoDate(new Date());
  element("dateInput").max = localIsoDate(new Date());
  element("noteInput").value = transaction ? transaction.note : "";
  element("formOverlay").hidden = false;
  element("amountInput").focus();
}

function closeForm() {
  element("formOverlay").hidden = true;
  editingTransactionId = null;
}

function showFormError(message) {
  const errorElement = element("formError");
  errorElement.textContent = message;
  errorElement.hidden = false;
}

function handleFormSubmit(event) {
  event.preventDefault();
  const amount = Number(element("amountInput").value);
  const category = element("categoryInput").value;
  const date = element("dateInput").value;
  const note = element("noteInput").value.trim().slice(0, 120);
  if (!Number.isFinite(amount) || amount <= 0) return showFormError("Please enter an amount greater than zero.");
  if (amount > 999999999999) return showFormError("That amount looks too large. Please check it and try again.");
  if (!category) return showFormError("Please choose a category.");
  if (!date) return showFormError("Please pick a date.");
  if (date > localIsoDate(new Date())) return showFormError("The date cannot be in the future.");
  const record = { type: formType, category, amount: Math.round(amount * 100) / 100, date, note };
  if (editingTransactionId) {
    const existing = state.transactions.find((t) => t.id === editingTransactionId);
    if (existing) Object.assign(existing, record);
    showToast("Transaction updated");
  } else {
    state.transactions.push({ id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...record });
    showToast("Transaction added");
  }
  selectedMonth = date.slice(0, 7);
  saveState(state);
  closeForm();
  renderAll();
}

function deleteTransaction(id) {
  const index = state.transactions.findIndex((t) => t.id === id);
  if (index === -1) return;
  lastDeletedTransaction = state.transactions[index];
  state.transactions.splice(index, 1);
  saveState(state);
  renderAll();
  showToast("Transaction deleted", true);
}

function undoDelete() {
  if (!lastDeletedTransaction) return;
  state.transactions.push(lastDeletedTransaction);
  lastDeletedTransaction = null;
  saveState(state);
  element("toast").hidden = true;
  renderAll();
  showToast("Transaction restored");
}

// ------------------------------------------------------------ data tools

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function exportJson() {
  downloadFile("homeledger-backup.json", JSON.stringify({ transactions: state.transactions, budgets: state.budgets, currency: state.currency }, null, 2), "application/json");
  showToast("JSON backup downloaded");
}

function exportCsv() {
  const header = "date,type,category,amount,note";
  const lines = [...state.transactions]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((t) => {
      const note = `"${String(t.note || "").replaceAll('"', '""')}"`;
      return `${t.date},${t.type},${findCategory(t.category).label},${t.amount},${note}`;
    });
  downloadFile("homeledger-transactions.csv", [header, ...lines].join("\n"), "text/csv");
  showToast("CSV downloaded");
}

function importJsonFile(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!parsed || !Array.isArray(parsed.transactions)) throw new Error("shape");
      const clean = parsed.transactions.filter((t) =>
        t && (t.type === "income" || t.type === "expense") &&
        Number.isFinite(Number(t.amount)) && typeof t.date === "string" && typeof t.category === "string");
      if (!clean.length) throw new Error("empty");
      state.transactions = clean.map((t) => ({
        id: String(t.id || `tx-${Math.random().toString(36).slice(2, 10)}`),
        type: t.type, category: t.category, amount: Number(t.amount),
        date: t.date.slice(0, 10), note: String(t.note || "").slice(0, 120),
      }));
      if (parsed.budgets && typeof parsed.budgets === "object") state.budgets = parsed.budgets;
      saveState(state);
      renderAll();
      showToast(`Imported ${clean.length} transactions`);
    } catch {
      showToast("That file could not be imported. Please use a HomeLedger JSON backup.");
    }
  });
  reader.readAsText(file);
}

function resetAllData() {
  if (!window.confirm("Delete all HomeLedger data in this browser and start empty? This cannot be undone.")) return;
  clearStoredState();
  state = createEmptyState();
  saveState(state);
  selectedMonth = monthKeyOf(new Date());
  activeCategoryFilter = null;
  renderAll();
  showToast("All data cleared");
}

function clearDemoData() {
  state.transactions = state.transactions.filter((t) => !t.demo);
  state.demoSeeded = false;
  if (!state.transactions.length) state.budgets = {};
  saveState(state);
  renderAll();
  showToast("Demo data cleared");
}

// ---------------------------------------------------------------- wiring

function initialise() {
  const currencySelect = element("currencySelect");
  currencySelect.innerHTML = CURRENCY_CODES.map((code) => `<option value="${code}">${code}</option>`).join("");
  currencySelect.value = state.currency;
  fillCategoryOptions(element("budgetCategory"), "expense");

  element("previousMonth").addEventListener("click", () => { selectedMonth = shiftMonth(selectedMonth, -1); renderAll(); });
  element("nextMonth").addEventListener("click", () => { selectedMonth = shiftMonth(selectedMonth, 1); renderAll(); });
  element("todayButton").addEventListener("click", () => { selectedMonth = monthKeyOf(new Date()); renderAll(); });
  element("addTransactionTop").addEventListener("click", () => openForm());
  element("addTransactionFab").addEventListener("click", () => openForm());
  element("closeFormButton").addEventListener("click", closeForm);
  element("cancelFormButton").addEventListener("click", closeForm);
  element("formOverlay").addEventListener("click", (event) => { if (event.target === event.currentTarget) closeForm(); });
  element("typeExpenseButton").addEventListener("click", () => setFormType("expense"));
  element("typeIncomeButton").addEventListener("click", () => setFormType("income"));
  element("transactionForm").addEventListener("submit", handleFormSubmit);
  element("searchInput").addEventListener("input", renderTransactions);
  element("typeFilter").addEventListener("change", renderTransactions);
  element("clearFilterButton").addEventListener("click", () => { activeCategoryFilter = null; renderAll(); });
  element("toastUndoButton").addEventListener("click", undoDelete);
  element("themeToggle").addEventListener("click", () => {
    state.theme = effectiveTheme() === "dark" ? "light" : "dark";
    saveState(state);
    applyTheme();
  });
  currencySelect.addEventListener("change", () => { state.currency = currencySelect.value; saveState(state); renderAll(); });
  element("budgetForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const limit = Number(element("budgetLimit").value);
    if (!Number.isFinite(limit) || limit < 0) return showToast("Please enter a budget limit of zero or more.");
    state.budgets[element("budgetCategory").value] = Math.round(limit * 100) / 100;
    element("budgetLimit").value = "";
    saveState(state);
    renderAll();
    showToast("Budget saved");
  });
  element("exportJsonButton").addEventListener("click", exportJson);
  element("exportCsvButton").addEventListener("click", exportCsv);
  element("importFileInput").addEventListener("change", (event) => {
    if (event.target.files[0]) importJsonFile(event.target.files[0]);
    event.target.value = "";
  });
  element("resetButton").addEventListener("click", resetAllData);
  element("clearDemoButton").addEventListener("click", clearDemoData);
  element("dismissDemoButton").addEventListener("click", () => {
    state.demoBannerDismissed = true;
    saveState(state);
    renderDemoBanner();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !element("formOverlay").hidden) closeForm();
  });

  applyTheme();
  renderAll();
}

initialise();
