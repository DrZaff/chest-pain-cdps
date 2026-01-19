// TEMP STUB — Stable module logic is owned by partner.
// This file prevents 404 errors and can show a “module loading” message.
// Partner can replace this file anytime with their real implementation.

async function loadPathwayMeta() {
  try {
    const res = await fetch("./pathway.json", { cache: "no-store" });
    if (!res.ok) throw new Error("pathway.json not found");
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

function setPlaceholderResults(meta) {
  const results = document.getElementById("results-container");
  const flags = document.getElementById("flags-container");
  if (!results || !flags) return;

  results.innerHTML = `
    <p class="results-placeholder">
      Stable module UI loaded. Logic is under active development.
      ${meta?.title ? `<br/><br/><strong>${meta.title}</strong> (${meta.version || "version ?"})` : ""}
    </p>
  `;

  flags.innerHTML = `
    <span class="flag-pill flag-pill--warning">
      Module not finalized. Outputs may be incomplete.
    </span>
  `;
}

document.addEventListener("DOMContentLoaded", async () => {
  const meta = await loadPathwayMeta();
  setPlaceholderResults(meta);

  // Basic Reset button wiring (so the UI feels alive even before full logic)
  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => window.location.reload());
  }
});

// ------------------------------
// Back stack (Brandon-style) for form modules
// ------------------------------
let historyStack = [];
let isRestoring = false;

function captureState(formEl) {
  const data = new FormData(formEl);
  const state = {};
  for (const [k, v] of data.entries()) state[k] = v;
  return state;
}

function restoreState(formEl, state) {
  isRestoring = true;

  // Reset first so cleared fields get cleared
  formEl.reset();

  // Restore known values
  Object.entries(state || {}).forEach(([name, value]) => {
    const el = formEl.elements.namedItem(name);
    if (!el) return;

    // Handles <select>, <input>, etc.
    el.value = value;
  });

  isRestoring = false;
}

function pushHistory(formEl) {
  if (isRestoring) return;
  const snapshot = captureState(formEl);

  // Prevent duplicates (optional but nice)
  const last = historyStack[historyStack.length - 1];
  if (last && JSON.stringify(last) === JSON.stringify(snapshot)) return;

  historyStack.push(snapshot);
}

function backOne(formEl, normalizeFn, resultsContainer, flagsContainer) {
  if (!historyStack.length) return;

  const prev = historyStack.pop();
  restoreState(formEl, prev);

  // Re-run your UI visibility logic
  normalizeFn();

  // Optional: clear results so users don’t mistake old results for new
  if (resultsContainer) {
    resultsContainer.innerHTML = `<p class="results-placeholder">Adjusted inputs. Tap “Run pathway” to update results.</p>`;
  }
  if (flagsContainer) {
    flagsContainer.innerHTML = `<p class="results-placeholder">Flags will update after you run the pathway.</p>`;
  }
}
