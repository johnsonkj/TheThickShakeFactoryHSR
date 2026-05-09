// =============================================================================
//  auth-modal.js — shared worker authentication modal
//  -----------------------------------------------------------------------------
//  Usage:
//    import { requireWorkerAuth } from './auth-modal.js';
//    const auth = await requireWorkerAuth('Open Opening Checklist');
//    if (auth) { /* auth.worker = "surya" | "sushanth" */ }
// =============================================================================

import { getWorkerPasswords } from './app.js';

const WORKERS = [
  { id: 'surya', label: 'Surya' },
  { id: 'sushanth', label: 'Sushanth' },
];

let pwCache = null;
let pwCacheAt = 0;
const PW_CACHE_MS = 30000;

async function loadPasswords(forceRefresh = false) {
  if (!forceRefresh && pwCache && Date.now() - pwCacheAt < PW_CACHE_MS) {
    return pwCache;
  }
  pwCache = await getWorkerPasswords();
  pwCacheAt = Date.now();
  return pwCache;
}

export async function requireWorkerAuth(actionLabel = 'Continue') {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    overlay.innerHTML = `
      <div class="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full">
        <h3 class="text-lg font-bold text-gray-800 mb-1">Worker authentication</h3>
        <p class="text-sm text-gray-500 mb-4" id="amAction"></p>

        <label class="block text-xs font-semibold text-gray-600 mb-1">Worker</label>
        <select id="amWorker" class="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:border-amber-400 focus:outline-none">
          ${WORKERS.map(w => `<option value="${w.id}">${w.label}</option>`).join('')}
        </select>

        <label class="block text-xs font-semibold text-gray-600 mb-1">Password</label>
        <input id="amPassword" type="password" autocomplete="off" class="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:border-amber-400 focus:outline-none" />

        <p id="amError" class="text-xs text-red-500 mb-3 hidden"></p>

        <div class="flex gap-2 mt-2">
          <button id="amCancel" class="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-gray-700">Cancel</button>
          <button id="amConfirm" class="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#amAction').textContent = actionLabel;
    const pwInput = overlay.querySelector('#amPassword');
    const errEl = overlay.querySelector('#amError');
    const confirmBtn = overlay.querySelector('#amConfirm');
    const cancelBtn = overlay.querySelector('#amCancel');
    const workerSel = overlay.querySelector('#amWorker');

    setTimeout(() => pwInput.focus(), 50);

    function close(result) {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      resolve(result);
    }
    function showErr(msg) {
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
    }
    function hideErr() {
      errEl.classList.add('hidden');
    }

    cancelBtn.addEventListener('click', () => close(null));
    overlay.addEventListener('click', e => { if (e.target === overlay) close(null); });
    document.addEventListener('keydown', escHandler);
    function escHandler(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escHandler);
        close(null);
      }
    }

    async function tryConfirm() {
      hideErr();
      const worker = workerSel.value;
      const pw = pwInput.value;
      if (!pw) { showErr('Enter password'); return; }

      confirmBtn.disabled = true;
      const origText = confirmBtn.textContent;
      confirmBtn.textContent = 'Checking…';
      try {
        const passwords = await loadPasswords(true);
        if (!passwords) {
          showErr('Worker passwords not configured. Ask the admin to set them.');
          confirmBtn.disabled = false;
          confirmBtn.textContent = origText;
          return;
        }
        if (passwords[worker] && passwords[worker] === pw) {
          document.removeEventListener('keydown', escHandler);
          close({ worker });
        } else {
          showErr('Incorrect password');
          confirmBtn.disabled = false;
          confirmBtn.textContent = origText;
          pwInput.value = '';
          pwInput.focus();
        }
      } catch (e) {
        showErr('Error: ' + (e.message || 'unknown'));
        confirmBtn.disabled = false;
        confirmBtn.textContent = origText;
      }
    }

    confirmBtn.addEventListener('click', tryConfirm);
    pwInput.addEventListener('keypress', e => { if (e.key === 'Enter') tryConfirm(); });
  });
}
