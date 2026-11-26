# HomeLedger — Dossier

## The problem

Households track money in scattered notes and banking apps that show what
already happened, but never answer the one question that matters day to
day: *how much can we safely spend today?* HomeLedger is built around that
answer.

## What it is

A complete household budget site that runs entirely in the browser from
static files: monthly income and expense tracking with categories,
a per-category breakdown with a hand-built SVG donut, budget limits with
progress bars that turn amber near the limit and red over it, a six-month
income-versus-expenses trend, date-grouped transactions with search and
filters, JSON/CSV export and import, multiple currencies, and light/dark
themes. First run seeds six months of realistic demo data, generated
relative to the day the site is opened, so every figure is alive at once.

## The standout feature: Safe to spend per day

> Safe to spend per day = (current month's balance so far − total unused
> budget still set aside) ÷ days left in the month, today included.

The balance is the current month only, never a cumulative all-time
figure; unused budget per category is max(0, limit − spent), and
categories without a limit are ignored. It is shown only for the current
month (other months read "n/a"), never divides by zero, and a negative
result is presented as "Over plan" with an explanation instead of a raw
negative number. A tooltip on the card states the formula in plain words.

## Technical decisions

- **Offline-first, zero dependencies, no build step.** Vanilla HTML, CSS
  and JavaScript modules under `app/`, each file with one clear job, so
  the first load is a handful of small files and the site works from
  `file://` or any static host.
- **Privacy by architecture.** Data lives in a single versioned
  localStorage key with an in-memory fallback; nothing is ever sent
  anywhere.
- **Deterministic demo data.** A seeded PRNG plus amounts scaled to the
  days elapsed in the month keeps the demo honest on any date: savings
  rate 15–25%, no category above 40% of spending, one budget near 85%,
  one slightly over.
- **Icons are hand-drawn inline SVG**, never emoji, so nothing renders as
  an empty box on any system.

## How it differs from a typical budget app

Most budget demos show totals. HomeLedger connects totals, budgets and
time into one daily decision number, works with no account and no
network, and treats its demo data as a designed feature rather than
placeholder text: the first screen a judge or a family opens is already
a real, coherent month.
