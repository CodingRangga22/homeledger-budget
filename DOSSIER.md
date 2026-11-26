# HomeLedger — dossier

**Problem.** A household needs to answer four questions at a glance: how
much came in, how much went out, what is left, and what is still due —
without an account, a bank connection, or a spreadsheet.

**The site.** HomeLedger opens on November 2026 with the whole month on one
screen: five summary cards, a category donut, the five latest transactions,
a six-month income-vs-expenses trend, bills due soon and savings goals.
Five linked pages (Overview, Ledger, Budgets, Bills, Planner) cover the
full job: a searchable ledger of 42 November transactions (252 across six
months) that can be added, edited and deleted with undo; four envelopes
over ten budget categories with money moves between them; four bills and
subscriptions with due dates and paid states; two savings goals and a
monthly rollover that carries last month's balance forward.

**Standout feature — Safe to spend per day.**
`(balance so far − Σ max(0, category limit − spent)) ÷ days left including today`.
It answers "what can I spend today without breaking the plan?" instead of
just reporting the past. Negative results are labelled "Over plan", it is
only shown for the current month, and it can never divide by zero.

**Technical choices.** Static files under `app/`, split by job
(`data.js`, `state.js`, `charts.js`, `views.js`, `main.js`), zero
dependencies, no build step, no network requests: the first load is seven
small files. State lives in one versioned localStorage key
(`homeledger:v1`) behind try/catch with an in-memory fallback. Charts and
icons are hand-built inline SVG; the font is a system stack. Demo data is
seeded with a deterministic generator relative to the day the site is
first opened — never future-dated, with a 20% savings rate, no category
above 30% of spending, Groceries at about 85% of its budget (amber) and
Dining slightly over (red) on any day of the month.

**Why it differs.** Most budget demos show totals; HomeLedger shows a
decision (safe to spend), a plan (envelopes you can rebalance), and what
is due next (bills), with every number on every page computed from the
same ledger so the figures always agree.
