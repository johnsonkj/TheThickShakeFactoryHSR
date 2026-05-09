# The Shake Factory — Shop Portal

Internal portal for the shop. Workers handle attendance, opening/closing checklists, inventory, walk-in sales, and bonus sales tracking. The owner sees daily and monthly reports, sets minimum stock levels, manages bonus rules, and reconciles cash.

**Stack:** Plain HTML + Tailwind (CDN) + Vanilla JS modules + Firebase Firestore. Hosted on GitHub Pages. No build step. **Zero monthly cost.**

> First-time setup (Firebase project, GitHub Pages, owner & worker passwords) lives in [SETUP-GUIDE.md](SETUP-GUIDE.md). Read this README to understand what's in the repo and how to use it day-to-day.

---

## ✨ What the portal does

### Worker side (the home page has 5 cards)

| Card | What it does |
|---|---|
| 🕒 **Attendance** | Workers check in / check out as many times per day as needed. Each click asks for the worker's password (so two workers can share the same device). Live ticking total per worker for today. |
| 🌅 **Opening Checklist** | 21 opening tasks + a cash counter (denominations 500, 200, 100, 50, 20, 10, 5, 2, 1) with auto-calculated total. |
| 🌙 **Closing Checklist** | 7 closing tasks + bonus-section sales entry (qty + amount per category) + closing cash counter. Live "Today's incentive ₹X each" tile while typing. |
| 📦 **Inventory Update** | Tabbed by category. On Save, a low-stock dialog appears for any item below its admin-set minimum (Cancel & Edit / Save Anyway). |
| 💵 **Walk-in Sales** | Log each customer's bill: bill no (globally unique), amount (₹), UPI/Cash, recorded by. Live UPI/Cash/Total tiles; today's entries with delete buttons. |

A 🎉 banner at the top of the home page shows month-to-date incentive **per worker**.

### Admin side (`owner.html`, password-gated)

- 🔑 **Worker Passwords** — set or change Surya's and Sushanth's passwords (stored in Firestore, not in code).
- 🕒 **Attendance** — daily view (driven by date picker) and monthly view with CSV export.
- 🎁 **Bonus Configuration** — set the bonus % and the list of sections (Sundae, Waffles, …) workers fill in closing.
- 💰 **Bonus Incentive** — daily breakdown + monthly table with per-section amounts, day incentive, per-worker share, running total, CSV export.
- 💵 **Walk-in Sales** — daily / monthly views with UPI/Cash/Total tiles, per-day breakdown, all-bills detail, CSV export, admin-side delete.
- 💵 **Cash** — opening / closing / difference per day; monthly totals + per-day table + CSV export.
- ⚠️ **Items Below Reorder Threshold** — auto-flagged from the latest inventory using the admin-set minimums.
- 📋 **Minimum Quantity Levels** — admin sets per-item minimums (tabbed by category). Falls back to the file default if not yet set.
- 📦 **Inventory Snapshot** — full saved inventory for the selected date.
- ✅ **Today's checklists** — opening & closing status + incomplete-tasks summary.
- 📅 **Last 14 days activity** — at-a-glance grid of opening / closing / inventory submissions.

---

## 🔐 Authentication model

- **Owner** logs in with `OWNER_PASSWORD` from `firebase-config.js` (kept in the code; this repo is public, so don't reuse this password elsewhere).
- **Workers** authenticate per card click with a username dropdown (Surya / Sushanth) + password. Worker passwords live in Firestore (`config/worker_passwords`) and are managed from the owner dashboard.
- **Attendance** is the one exception: each Check In / Check Out asks for a password individually, so both workers can share a device without logging in/out.
- **Walk-in Sales** asks for password once on card open; on the page itself a "Recorded by" dropdown attributes each entry without a re-prompt.
- Auth tokens for opening / closing / inventory / walk-in pages live in `sessionStorage` and expire after **60 minutes**.

---

## 📁 Project files

| File | Purpose |
|------|---------|
| `index.html` | Worker home — 5 cards + month-to-date incentive banner |
| `attendance.html` | Worker attendance: per-action Check In / Check Out |
| `opening.html` | Opening checklist (21 tasks + cash counter) |
| `closing.html` | Closing checklist (7 tasks + bonus sales + cash counter) |
| `inventory.html` | Inventory entry, tabbed by category, low-stock dialog on save |
| `walkin.html` | Walk-in sales entry & today's listing |
| `owner.html` | Owner dashboard (password-protected) |
| `firebase-config.js` | **YOU EDIT THIS** — Firebase keys + owner password |
| `app.js` | Firestore helpers (checklists, attendance, inventory, walk-in, bonus, etc.) |
| `auth-modal.js` | Shared password modal for card auth |
| `attendance-shared.js` | Pure helpers for attendance (duration math, sessions) |
| `cash-shared.js` | Denominations list + reusable cash counter widget |
| `inventory-data.js` | Master item list + default reorder thresholds. Edit to add/remove items. |
| `styles.css` | Minor custom styling |
| `SETUP-GUIDE.md` | First-time Firebase + hosting setup |

---

## 🗄 Firestore data model

Collections used by the portal:

| Collection / Doc | Shape | Notes |
|---|---|---|
| `checklists_opening/{YYYY-MM-DD}` | `{ tasks, completed, worker, timestamp, cash }` | One doc per day. `cash = { denominations, total }`. |
| `checklists_closing/{YYYY-MM-DD}` | `{ tasks, completed, worker, timestamp, cash, bonusSales, bonusPercent }` | `bonusSales = { sectionName: { qty, amount } }`. `bonusPercent` is a snapshot at save-time so past days don't re-compute when admin changes the rate. |
| `inventory/{YYYY-MM-DD}` | `{ items: { categoryKey: { itemName: qty } }, worker, timestamp }` | Save now stores a **complete** snapshot — blank inputs become 0. |
| `attendance/{YYYY-MM-DD}_{worker}` | `{ date, worker, events: [{ type, ts }, ...] }` | `type` is `"in"` or `"out"`. Total hours = sum of paired in/out durations. |
| `walkin_sales/{billNo}` | `{ billNo, amount, method, worker, date, ts }` | Doc id = bill number for cheap global uniqueness. `method` is `"upi"` or `"cash"`. |
| `config/worker_passwords` | `{ surya, sushanth }` | Set from the owner dashboard, not in the repo. |
| `config/inventory_thresholds` | `{ "categoryKey/itemName": minQty, ... }` | Admin overrides; fall back to `inventory-data.js` defaults. |
| `config/bonus_config` | `{ sections: [...], percent: number }` | Drives the bonus section in closing.html. |

---

## 👷 Daily use

### For workers
- Bookmark `https://YOUR_USERNAME.github.io/TheThickShakeFactoryHSR/` on the shop device.
- Tap **Attendance** at start of shift → Check In. Tap again to Check Out (or for shift breaks).
- During the day, log each customer bill via the **Walk-in Sales** card.
- Open the shop → **Opening Checklist** → tick tasks + count opening cash → Save.
- Close the shop → **Closing Checklist** → tick tasks + enter bonus sales + count closing cash → Save.
- Update **Inventory** when stock changes.
- The 🎉 banner on home shows month-to-date incentive per worker. Motivating.

### For owner
- `owner.html` → enter password.
- **First time**: scroll to 🔑 *Worker Passwords*, set both workers' passwords. Then 🎁 *Bonus Configuration*, add sections + the bonus %.
- **Daily**: pick a date → see attendance, walk-in, cash, bonus, checklists for that day.
- **Monthly**: each section has a Monthly toggle + CSV export.
- Use **📋 Minimum Quantity Levels** to tune low-stock thresholds. ⚠️ list updates instantly.

---

## 🔧 Common tasks

### Change the owner password
Edit `firebase-config.js`, update `OWNER_PASSWORD`, commit. Live in ~1 min.

### Add / remove a worker
Currently the portal hard-codes Surya & Sushanth in the dropdowns (`auth-modal.js`, `attendance.html`, `walkin.html`). To add a third worker: add to those dropdowns, then set their password from the owner dashboard.

### Change worker passwords
Owner dashboard → 🔑 *Worker Passwords* → pick worker → enter new password → Save.

### Add or remove an inventory item
Edit `inventory-data.js`. New items appear in the worker UI immediately (with their default threshold) and in the admin's *Minimum Quantity Levels* panel as "(default)" until admin overrides.

### Change a checklist task
Edit the `tasks` array near the top of the `<script>` in `opening.html` or `closing.html`.

### Change the bonus % or sections
Owner dashboard → 🎁 *Bonus Configuration* → edit → Save. Past days keep their snapshotted percent; only future closings use the new rate.

### Look at raw data
Firebase Console → Firestore Database. Collections listed in the data-model table above.

### Hide owner.html from search engines (optional)
Create `robots.txt`:
```
User-agent: *
Disallow: /owner.html
```

---

## 💰 Costs

**Zero.** All within free tiers:
- Firestore free: 1 GB storage, 50K reads/day, 20K writes/day
- GitHub Pages free: 100 GB/month bandwidth

A typical day's reads on the admin dashboard load: ~200 docs (cheap multi-read fetches across attendance, walk-in, cash, bonus). Worker home: 1 fetch (cached 5 min). Easily within free quotas.

---

## 🆘 Troubleshooting

**Workers see "Worker passwords not configured" when clicking a card**
→ Owner needs to set both workers' passwords once from `owner.html` → 🔑 Worker Passwords.

**"Please open this page from the home portal" appears on a worker page**
→ The auth token in `sessionStorage` expired (60-min TTL) or they navigated directly. Tell them to go back to home and tap the card.

**Bonus section doesn't appear on closing checklist**
→ Owner hasn't set up bonus sections. Owner dashboard → 🎁 Bonus Configuration → add at least one section → Save Configuration.

**A bonus section the worker is editing was just removed by admin**
→ When the worker hits Save, an alert pops up: "Bonus sections were updated…". The page re-renders without the removed section. Worker reviews and saves again.

**Walk-in Sales says "Bill HSR0001 already exists"**
→ Bill numbers are globally unique (the doc id). Use a fresh number, or delete the old entry first if it was a mistake.

**Site loads but Save fails with permission error**
→ Firestore rules aren't published. SETUP-GUIDE.md → Step 3.

**Owner login shows "Incorrect password"**
→ Check `OWNER_PASSWORD` in `firebase-config.js`. Case-sensitive.

**I want to export all my data**
→ Firebase Console → Firestore → use the export feature, or ask for a small script.
