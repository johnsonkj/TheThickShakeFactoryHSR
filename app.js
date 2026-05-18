// =============================================================================
//  app.js — Firebase initialization and database helpers
//  -----------------------------------------------------------------------------
//  You shouldn't need to edit this file. All config goes in firebase-config.js.
// =============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper: today's date as YYYY-MM-DD (in local timezone)
function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// =============================================================================
//  CHECKLISTS
// =============================================================================

/**
 * Save an opening or closing checklist for today.
 * @param {'opening' | 'closing'} type
 * @param {object} data { tasks, completed, worker, timestamp }
 */
export async function saveChecklist(type, data) {
  const date = todayStr();
  const docRef = doc(db, `checklists_${type}`, date);
  await setDoc(docRef, { ...data, date }, { merge: false });
}

/**
 * Get today's checklist (or null if none).
 */
export async function getTodayChecklist(type) {
  return getChecklistByDate(type, todayStr());
}

/**
 * Get a checklist for a specific date string YYYY-MM-DD.
 */
export async function getChecklistByDate(type, date) {
  const docRef = doc(db, `checklists_${type}`, date);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
}

// =============================================================================
//  INVENTORY
// =============================================================================

/**
 * Save today's inventory snapshot.
 * @param {object} data { items, worker, timestamp }
 *   items = { categoryKey: { itemName: qty, ... }, ... }
 */
export async function saveInventory(data) {
  const date = todayStr();
  const docRef = doc(db, "inventory", date);
  await setDoc(docRef, { ...data, date }, { merge: false });
}

export async function getTodayInventory() {
  return getInventoryByDate(todayStr());
}

export async function getInventoryByDate(date) {
  const docRef = doc(db, "inventory", date);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
}

/**
 * Get the most recent inventory entry (any date).
 */
export async function getLatestInventory() {
  const q = query(collection(db, "inventory"), orderBy("date", "desc"), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data();
}

// =============================================================================
//  WALK-IN SALES  (walkin_sales/{billNo})
//  -----------------------------------------------------------------------------
//  Doc id = bill number (globally unique, e.g. "HSR3241").
//  Body: { billNo, amount, method ("upi"|"cash"), worker, date, ts }
// =============================================================================

export async function addWalkinSale(entry) {
  const billNo = String(entry.billNo || '').trim();
  if (!billNo) throw new Error('Bill number required');
  if (!Number.isFinite(entry.amount) || entry.amount <= 0) throw new Error('Amount must be greater than 0');
  if (entry.method !== 'upi' && entry.method !== 'cash') throw new Error('Pick UPI or Cash');
  if (!entry.worker) throw new Error('Worker required');
  if (!entry.date) throw new Error('Date required');

  const ref = doc(db, "walkin_sales", billNo);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const ex = snap.data();
    throw new Error(`Bill ${billNo} already exists (${ex.date}, ₹${ex.amount}).`);
  }
  const payload = {
    billNo,
    amount: Math.round(entry.amount), // whole rupees
    method: entry.method,
    worker: entry.worker,
    date: entry.date,
    ts: entry.ts || new Date().toISOString(),
  };
  await setDoc(ref, payload);
  return payload;
}

export async function getWalkinSalesByDate(date) {
  const q = query(collection(db, "walkin_sales"), where("date", "==", date));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data()).sort((a, b) => (a.ts || '').localeCompare(b.ts || ''));
}

export async function getWalkinSalesByMonth(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const start = `${yyyymm}-01`;
  const end = `${yyyymm}-${String(lastDay).padStart(2, '0')}`;
  const q = query(
    collection(db, "walkin_sales"),
    where("date", ">=", start),
    where("date", "<=", end)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data()).sort((a, b) => (a.ts || '').localeCompare(b.ts || ''));
}

export async function deleteWalkinSale(billNo) {
  await deleteDoc(doc(db, "walkin_sales", billNo));
}

// =============================================================================
//  BONUS CONFIG + INCENTIVE
//  -----------------------------------------------------------------------------
//  Admin sets a list of bonus section names and a percent. When workers save the
//  closing checklist, they include `bonusSales: { sectionName: { qty, amount } }`
//  and `bonusPercent` (snapshot of percent at save-time, so past days don't
//  retroactively change when admin updates the percent).
//
//  Total day incentive = sum(amounts) × bonusPercent / 100.
//  Per-worker share    = day incentive / 2  (split 50/50 between Surya & Sushanth).
// =============================================================================

export async function getBonusConfig() {
  const ref = doc(db, "config", "bonus_config");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const d = snap.data();
    return {
      sections: Array.isArray(d.sections) ? d.sections : [],
      percent: Number.isFinite(d.percent) ? d.percent : 0,
    };
  }
  return { sections: [], percent: 0 };
}

export async function setBonusConfig(config) {
  const safe = {
    sections: Array.isArray(config.sections)
      ? config.sections.map(s => String(s).trim()).filter(Boolean)
      : [],
    percent: Number.isFinite(Number(config.percent)) && Number(config.percent) >= 0
      ? Number(config.percent)
      : 0,
  };
  // Dedupe section names while preserving order
  const seen = new Set();
  safe.sections = safe.sections.filter(n => {
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });
  const ref = doc(db, "config", "bonus_config");
  await setDoc(ref, safe);
  return safe;
}

export function currentYyyymm() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Compute month-to-date incentive from stored closing checklists.
 * Each day uses its own snapshotted bonusPercent.
 */
export async function getMonthlyIncentive(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const dates = [];
  for (let d = 1; d <= lastDay; d++) {
    dates.push(`${yyyymm}-${String(d).padStart(2, '0')}`);
  }
  const docs = await Promise.all(dates.map(async date => {
    const ref = doc(db, "checklists_closing", date);
    const snap = await getDoc(ref);
    return snap.exists() ? { date, data: snap.data() } : null;
  }));

  const days = [];
  let monthBonusTotal = 0;
  let monthIncentive = 0;
  docs.forEach(item => {
    if (!item || !item.data || !item.data.bonusSales) return;
    const sales = item.data.bonusSales;
    const dayBonusTotal = Object.values(sales).reduce((s, x) => s + (Number(x.amount) || 0), 0);
    if (dayBonusTotal === 0) return;
    const pct = Number(item.data.bonusPercent) || 0;
    const dayIncentive = (dayBonusTotal * pct) / 100;
    days.push({
      date: item.date,
      bonusTotal: dayBonusTotal,
      bonusPercent: pct,
      dayIncentive,
      dayPerWorker: dayIncentive / 2,
      sales,
    });
    monthBonusTotal += dayBonusTotal;
    monthIncentive += dayIncentive;
  });
  return {
    yyyymm,
    days,
    monthBonusTotal,
    monthIncentive,
    perWorkerShare: monthIncentive / 2,
  };
}

// =============================================================================
//  EXPENSES  (expenses/{auto-id})
//  -----------------------------------------------------------------------------
//  Workers log purchases made for the shop (lemon, batteries, etc.). One entry
//  per bill — `items` is the parsed list of item names; `amount` is the bill
//  total. Bill numbers from external vendors can collide, so we use auto-ids.
// =============================================================================

export async function addExpense(entry) {
  const billNo = String(entry.billNo || '').trim();
  if (!billNo) throw new Error('Bill number required');
  if (!Number.isFinite(entry.amount) || entry.amount <= 0) throw new Error('Amount must be greater than 0');
  if (!Array.isArray(entry.items) || entry.items.length === 0) throw new Error('Enter at least one item');
  if (!entry.worker) throw new Error('Worker required');
  if (!entry.date) throw new Error('Date required');

  const payload = {
    billNo,
    items: entry.items.map(s => String(s).trim()).filter(Boolean),
    amount: Math.round(entry.amount),
    worker: entry.worker,
    date: entry.date,
    ts: entry.ts || new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, "expenses"), payload);
  return { id: ref.id, ...payload };
}

export async function getExpensesByDate(date) {
  const q = query(collection(db, "expenses"), where("date", "==", date));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.ts || '').localeCompare(b.ts || ''));
}

export async function getExpensesByMonth(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const start = `${yyyymm}-01`;
  const end = `${yyyymm}-${String(lastDay).padStart(2, '0')}`;
  const q = query(
    collection(db, "expenses"),
    where("date", ">=", start),
    where("date", "<=", end)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.ts || '').localeCompare(b.ts || ''));
}

export async function deleteExpense(id) {
  await deleteDoc(doc(db, "expenses", id));
}

// =============================================================================
//  ADMIN: RESET TRANSACTIONAL DATA
//  -----------------------------------------------------------------------------
//  Deletes every document inside the given collection. Used by the owner
//  dashboard's "Danger Zone" reset buttons. Returns the count of deleted docs.
//
//  NOTE: config/* documents (passwords, thresholds, bonus_config) live in the
//  `config` collection, which is intentionally never passed to this helper —
//  the owner UI only exposes reset for transactional collections.
// =============================================================================

export async function clearCollection(collectionName) {
  if (collectionName === "config") {
    throw new Error("Cowardly refusing to clear the `config` collection from the helper.");
  }
  const snap = await getDocs(collection(db, collectionName));
  if (snap.empty) return 0;
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  return snap.docs.length;
}

// =============================================================================
//  STATUS / DASHBOARD
// =============================================================================

/**
 * Get today's status: which of the 3 things have been submitted.
 */
export async function getTodayStatus() {
  const date = todayStr();
  const [opening, closing, inventory] = await Promise.all([
    getChecklistByDate('opening', date),
    getChecklistByDate('closing', date),
    getInventoryByDate(date)
  ]);
  return {
    opening: !!opening,
    closing: !!closing,
    inventory: !!inventory
  };
}

// =============================================================================
//  INVENTORY THRESHOLDS  (config/inventory_thresholds)
//  Stored as flat map: { "categoryKey/itemName": minQty, ... }
//  Effective threshold = override here, falling back to the default in inventory-data.js
// =============================================================================

export async function getInventoryThresholds() {
  const ref = doc(db, "config", "inventory_thresholds");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function setInventoryThresholdsBatch(updates) {
  if (!updates || Object.keys(updates).length === 0) return;
  const ref = doc(db, "config", "inventory_thresholds");
  await setDoc(ref, updates, { merge: true });
}

// =============================================================================
//  WORKER PASSWORDS  (config/worker_passwords)
// =============================================================================

export async function getWorkerPasswords() {
  const ref = doc(db, "config", "worker_passwords");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function setWorkerPassword(worker, password) {
  const ref = doc(db, "config", "worker_passwords");
  await setDoc(ref, { [worker]: password }, { merge: true });
}

// =============================================================================
//  ATTENDANCE  (attendance/{YYYY-MM-DD}_{worker})
// =============================================================================

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/**
 * Append a check-in or check-out event for today.
 * Throws on invalid sequencing (e.g. checking in twice in a row).
 */
export async function recordAttendanceEvent(worker, type) {
  if (type !== 'in' && type !== 'out') throw new Error('Invalid event type');
  const date = todayStr();
  const ref = doc(db, "attendance", `${date}_${worker}`);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data() : { date, worker, events: [] };
  const events = Array.isArray(existing.events) ? existing.events.slice() : [];
  const last = events[events.length - 1];

  if (type === 'in' && last && last.type === 'in') {
    throw new Error(`${cap(worker)} is already checked in.`);
  }
  if (type === 'out' && (!last || last.type === 'out')) {
    throw new Error(`${cap(worker)} hasn't checked in yet.`);
  }

  events.push({ type, ts: new Date().toISOString() });
  await setDoc(ref, { date, worker, events });
}

export async function getAttendanceForDate(date, worker) {
  const ref = doc(db, "attendance", `${date}_${worker}`);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/**
 * Get attendance for every day in YYYY-MM (worker scoped).
 * Returns an array of { date, worker, events } for each day in the month.
 */
export async function getAttendanceForMonth(yyyymm, worker) {
  const [y, m] = yyyymm.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const dates = [];
  for (let d = 1; d <= lastDay; d++) {
    dates.push(`${yyyymm}-${String(d).padStart(2, '0')}`);
  }
  const results = await Promise.all(dates.map(async date => {
    const ref = doc(db, "attendance", `${date}_${worker}`);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : { date, worker, events: [] };
  }));
  return results;
}

/**
 * Get last N days of activity for the recent-activity table.
 */
export async function getRecentActivity(days = 14) {
  const today = new Date();
  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }

  const results = await Promise.all(dates.map(async date => {
    const [op, cl, inv] = await Promise.all([
      getChecklistByDate('opening', date),
      getChecklistByDate('closing', date),
      getInventoryByDate(date)
    ]);
    return {
      date,
      opening: !!op,
      closing: !!cl,
      inventory: !!inv
    };
  }));

  return results;
}
