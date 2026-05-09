// =============================================================================
//  attendance-shared.js — pure helpers (no Firestore deps)
//  Used by both attendance.html (worker) and owner.html (admin).
// =============================================================================

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(ms) {
  if (!ms || ms < 0) return '0h 0m';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}

/**
 * Sum completed in/out pairs. If still checked in AND isToday, add elapsed up to now.
 */
export function computeTotalMs(events, isToday = true) {
  let total = 0;
  let inAt = null;
  for (const e of (events || [])) {
    if (e.type === 'in') {
      inAt = new Date(e.ts).getTime();
    } else if (e.type === 'out' && inAt != null) {
      total += new Date(e.ts).getTime() - inAt;
      inAt = null;
    }
  }
  if (inAt != null && isToday) {
    total += Date.now() - inAt;
  }
  return total;
}

export function renderEventList(events) {
  if (!events || events.length === 0) {
    return '<p class="text-gray-400 italic">No activity yet.</p>';
  }
  let html = '<ul class="space-y-1.5">';
  let inAt = null;
  for (const e of events) {
    if (e.type === 'in') {
      inAt = new Date(e.ts).getTime();
      html += `<li class="text-gray-700">🟢 <span class="font-semibold">In</span> &nbsp; ${formatTime(e.ts)}</li>`;
    } else {
      const dur = inAt != null ? formatDuration(new Date(e.ts).getTime() - inAt) : '—';
      html += `<li class="text-gray-700">🔴 <span class="font-semibold">Out</span> ${formatTime(e.ts)} <span class="text-xs text-gray-400 ml-1">(${dur})</span></li>`;
      inAt = null;
    }
  }
  if (inAt != null) {
    html += `<li class="text-green-600 font-semibold mt-2">⏱ Currently in</li>`;
  }
  html += '</ul>';
  return html;
}

/** Build sessions array (paired in/out) from events. Unpaired trailing 'in' becomes ongoing. */
export function buildSessions(events, isToday = true) {
  const sessions = [];
  let inAt = null;
  for (const e of (events || [])) {
    if (e.type === 'in') {
      inAt = e.ts;
    } else if (e.type === 'out' && inAt != null) {
      sessions.push({ in: inAt, out: e.ts, ongoing: false });
      inAt = null;
    }
  }
  if (inAt != null) {
    sessions.push({ in: inAt, out: null, ongoing: isToday });
  }
  return sessions;
}
