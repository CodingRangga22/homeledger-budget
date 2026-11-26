// Calculations for HomeLedger: one job, pure functions that turn the stored
// transactions into the numbers the page shows. No DOM access in this file,
// so every figure can be reasoned about and tested on its own.

export function monthKeyOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(monthKey, delta) {
  const [year, month] = monthKey.split("-").map(Number);
  const shifted = new Date(year, month - 1 + delta, 1);
  return monthKeyOf(shifted);
}

export function transactionsInMonth(transactions, monthKey) {
  return transactions.filter((transaction) => transaction.date.startsWith(monthKey));
}

export function summariseMonth(transactions, monthKey) {
  let income = 0;
  let expenses = 0;
  for (const transaction of transactionsInMonth(transactions, monthKey)) {
    if (transaction.type === "income") income += transaction.amount;
    else expenses += transaction.amount;
  }
  return {
    income,
    expenses,
    balance: income - expenses,
    savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
  };
}

// Percentage change versus the previous month; null when there is no base.
export function percentChange(current, previous) {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// Expense totals per category for one month, biggest first, with shares.
export function expenseBreakdown(transactions, monthKey) {
  const totals = new Map();
  let totalExpenses = 0;
  for (const transaction of transactionsInMonth(transactions, monthKey)) {
    if (transaction.type !== "expense") continue;
    totals.set(transaction.category, (totals.get(transaction.category) || 0) + transaction.amount);
    totalExpenses += transaction.amount;
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      share: totalExpenses > 0 ? amount / totalExpenses : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

// Budget usage per category that has a limit, for one month.
export function budgetUsage(transactions, budgets, monthKey) {
  const spentByCategory = {};
  for (const transaction of transactionsInMonth(transactions, monthKey)) {
    if (transaction.type === "expense") {
      spentByCategory[transaction.category] = (spentByCategory[transaction.category] || 0) + transaction.amount;
    }
  }
  return Object.entries(budgets)
    .filter(([, limit]) => Number(limit) > 0)
    .map(([category, limit]) => {
      const spent = spentByCategory[category] || 0;
      return { category, limit: Number(limit), spent, ratio: spent / Number(limit) };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

// Safe to spend per day, the figure that sets HomeLedger apart:
//   (this month's balance so far - budget money still set aside)
//   divided by the days left in the month, today included.
// "Balance" here is the current month only, never a cumulative all-time
// balance. Only defined for the current month; returns null otherwise, and
// a negative result is reported as overPlan instead of a raw negative.
export function safeToSpendPerDay(transactions, budgets, monthKey, today = new Date()) {
  if (monthKey !== monthKeyOf(today)) return null;
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const monthTransactions = transactionsInMonth(transactions, monthKey)
    .filter((transaction) => transaction.date <= todayIso);
  let income = 0;
  let expenses = 0;
  const spentByCategory = {};
  for (const transaction of monthTransactions) {
    if (transaction.type === "income") income += transaction.amount;
    else {
      expenses += transaction.amount;
      spentByCategory[transaction.category] = (spentByCategory[transaction.category] || 0) + transaction.amount;
    }
  }
  let reserved = 0;
  for (const [category, limit] of Object.entries(budgets)) {
    const numericLimit = Number(limit);
    if (numericLimit > 0) reserved += Math.max(0, numericLimit - (spentByCategory[category] || 0));
  }
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - today.getDate() + 1);
  const available = income - expenses - reserved;
  return {
    amount: available / daysLeft,
    overPlan: available < 0,
    daysLeft,
    reserved,
  };
}

// Income and expenses for each of the last six months, oldest first.
export function sixMonthTrend(transactions, endMonthKey) {
  const months = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const key = shiftMonth(endMonthKey, -offset);
    const summary = summariseMonth(transactions, key);
    const [year, month] = key.split("-").map(Number);
    const label = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short" });
    months.push({ key, label, income: summary.income, expenses: summary.expenses });
  }
  return months;
}
