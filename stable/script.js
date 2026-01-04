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
