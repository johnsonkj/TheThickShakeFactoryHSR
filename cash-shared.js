// =============================================================================
//  cash-shared.js — denomination list + cash counter widget
//  -----------------------------------------------------------------------------
//  Used by opening.html and closing.html to render the cash count, and by
//  owner.html to compute totals from saved data.
// =============================================================================

export const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

/** Compute the total rupees from a { "500": 7, "200": 2, ... } map. */
export function computeCashTotal(denominations) {
  if (!denominations) return 0;
  let total = 0;
  DENOMINATIONS.forEach(d => {
    total += (Number(denominations[d]) || 0) * d;
  });
  return total;
}

export function fmtRupeesIN(n) {
  return '₹ ' + (Number.isFinite(n) ? n.toLocaleString('en-IN') : '0');
}

/**
 * Mounts a cash counter inside `container`. Returns helpers to read / write state.
 *
 * Options:
 *   container    — DOM element to mount into
 *   headerLabel  — e.g. "Opening Cash" / "Closing Cash"
 *   accent       — tailwind color suffix, e.g. "emerald"  (used for total + focus)
 *   initial      — { "500": 7, "200": 2 } prefilled counts (optional)
 *   onChange     — callback(denominations, total) on every input change
 */
export function setupCashCounter({ container, headerLabel = 'Cash', accent = 'emerald', initial = {}, onChange } = {}) {
  const totalColor = `text-${accent}-700`;
  const focusBorder = `focus:border-${accent}-400`;

  let html = `
    <h2 class="text-lg font-bold text-gray-800 mb-1">💰 ${headerLabel}</h2>
    <p class="text-xs text-gray-500 mb-4">Count notes &amp; coins. Total updates automatically. Blank = 0.</p>
    <div class="space-y-1.5">
  `;
  DENOMINATIONS.forEach(d => {
    const v = initial && initial[d] != null && initial[d] !== '' ? initial[d] : '';
    const sub = (Number(v) || 0) * d;
    html += `
      <div class="grid grid-cols-12 items-center gap-2 py-1">
        <span class="col-span-3 sm:col-span-2 text-sm text-gray-700 font-semibold">₹ ${d}</span>
        <span class="col-span-1 text-gray-400 text-center">×</span>
        <input type="number" min="0" step="1" placeholder="0" value="${v}" data-denom="${d}"
               class="cash-count col-span-3 sm:col-span-2 w-full px-2 py-1 border border-gray-300 rounded text-sm ${focusBorder} focus:outline-none" />
        <span class="col-span-1 text-gray-400 text-center text-sm">=</span>
        <span class="col-span-4 sm:col-span-6 text-sm text-gray-700 text-right cash-subtotal" data-for="${d}">${fmtRupeesIN(sub)}</span>
      </div>
    `;
  });
  html += `
    </div>
    <div class="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
      <span class="text-sm font-semibold text-gray-700">Total cash</span>
      <span class="text-2xl font-bold ${totalColor} cash-total">₹ 0</span>
    </div>
  `;
  container.innerHTML = html;

  function readState() {
    const denoms = {};
    let total = 0;
    container.querySelectorAll('.cash-count').forEach(inp => {
      const d = Number(inp.dataset.denom);
      const c = Number(inp.value);
      const cnt = Number.isFinite(c) && c > 0 ? c : 0;
      denoms[String(d)] = cnt;
      total += cnt * d;
    });
    return { denoms, total };
  }

  function refresh() {
    const { denoms, total } = readState();
    container.querySelectorAll('.cash-subtotal').forEach(el => {
      const d = Number(el.dataset.for);
      el.textContent = fmtRupeesIN((denoms[String(d)] || 0) * d);
    });
    container.querySelector('.cash-total').textContent = fmtRupeesIN(total);
    if (onChange) onChange(denoms, total);
    return { denoms, total };
  }

  container.querySelectorAll('.cash-count').forEach(inp => {
    inp.addEventListener('input', refresh);
  });

  // Initial paint (subtotals + total) reflecting `initial`
  refresh();

  return {
    getDenominations: () => readState().denoms,
    getTotal: () => readState().total,
    setDenominations(d) {
      container.querySelectorAll('.cash-count').forEach(inp => {
        const k = inp.dataset.denom;
        inp.value = d && d[k] != null && d[k] !== 0 ? d[k] : (d && d[k] === 0 ? '' : '');
      });
      refresh();
    },
  };
}
