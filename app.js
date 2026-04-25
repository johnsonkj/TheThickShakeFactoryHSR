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
