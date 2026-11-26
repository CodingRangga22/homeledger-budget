# HomeLedger — Household Budget

[![make.fun bounty](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/CodingRangga22/homeledger-budget/rank.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/CodingRangga22/homeledger-budget/reward.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457)

HomeLedger is a household budget site for one household and one month at a
glance — built for the make.fun bounty
[Make the best household budget site](https://make.fun/bounty/best-household-budget-site-20261126-1457).
It runs entirely from static files in `app/`, works offline in a desktop
browser and on a phone, and keeps every figure on this device in
localStorage. No account, no server, no network requests.

![HomeLedger dashboard](screenshots/1-dashboard.jpg)

## What it does

- **Overview** — total income, total expenses, balance (with the change vs
  last month), savings rate, and **Safe to spend per day**: this month's
  balance so far, minus the budget room still reserved in every category
  limit, divided by the days left in the month including today. A category
  donut (hand-built SVG) and the last six months as an income-vs-expenses
  bar chart sit beside the five most recent transactions.
- **Ledger** — every transaction grouped by date, with text search, type
  and category filters, add / edit / delete with an Undo toast, friendly
  validation, and an "Add recurring items" action that copies monthly
  recurring entries into the selected month without duplicates.
- **Budgets** — four envelopes (Essentials, Food & Home, Health & Learning,
  Fun & Future) group the ten expense categories. Move money between
  category budgets with one form and the envelopes follow. Every category
  shows a progress bar that turns amber as it fills and red when it passes
  its limit, and each limit can be edited in place.
- **Bills** — rent, electricity, internet and a streaming subscription with
  due dates, amounts and paid / due states you can toggle; the page totals
  what is still due and what is already paid.
- **Planner** — two savings goals with progress and one-tap monthly
  contributions, plus a monthly rollover panel: last month's balance rolls
  into this month's envelopes, with a look ahead at next month.
- **Your data** — export and import a JSON backup, export CSV, reset
  everything with a confirmation, choose USD (default), EUR, GBP, JPY, IDR
  or AUD with locale formatting, and switch between light and dark themes.

First run loads a realistic demo household: 42 November transactions plus
five earlier months, generated relative to today with a seeded random
generator, so there are never future-dated entries and the savings rate,
category shares and the two flagged budgets (Groceries about 85% used,
Dining slightly over) land on target on any day of the month. A banner
offers to clear the demo data at any time.

## Run it

Requires Node.js 22.18 or later. No install, no build step.

```
node serve.ts            # serves app/ at http://localhost:8080
```

Or open `app/index.html` through any static file server.

Build the hand-in output (copies `app/` and `screenshots/`, writes
`dossier.json`):

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `main.ts` — the hand-in program; writes the dossier with the kit library.
- `serve.ts` — a tiny local preview server for `app/`.
- `app/index.html` — page structure for the five views.
- `app/style.css` — design tokens, light/dark themes, responsive layout.
- `app/data.js` — categories, hand-drawn SVG icons, bills, goals, demo seed.
- `app/state.js` — the versioned localStorage state and month helpers.
- `app/charts.js` — the donut and six-month trend charts as inline SVG.
- `app/views.js` — rendering for each section, envelopes, Safe to spend.
- `app/main.js` — routing, rendering orchestration and every control.
- `screenshots/` — real browser renders of the site (desktop, budgets,
  the add-transaction form, and a phone view).
- `vendor/makefun-frontend.ts` — the kit's dossier library, unchanged.

## Design choices

Offline-first and zero-dependency: the first load is a handful of small
files, fonts are a system stack, charts are inline SVG drawn by the site's
own code, and category icons are simple stroke pictograms (never emoji, so
nothing renders as an empty box). Numbers use tabular figures and every
total on every page is computed from the same ledger, so the figures
always agree.

## License

MIT — see `LICENSE`.
