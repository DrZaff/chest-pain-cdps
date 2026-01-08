export function evaluateKnownObstructive(inputs) {
  const values = {
    pathwayId: "stable-known-obstructive",
    version: "v1.0",
    inputSummary: { ...inputs },
    branchesTaken: [],
  };

  const flags = [];
  const nextSteps = [];
  const pushFlag = (severity, code, message) => flags.push({ severity, code, message });
  const step = (label, detail, strength = null, level = "info", link = null) => ({ label, detail, strength, level, link });

  pushFlag("info", "SCOPE", "Stable chest pain + known obstructive CAD module. Decision-support only.");

  // Validation
  if (inputs.priorRevasc === null) pushFlag("warning", "REQ_PRIOR_REVASC", "Select whether prior revascularization (CABG/PCI ≥3.0 mm) is present.");
  if (inputs.highRisk === null) pushFlag("warning", "REQ_HIGH_RISK", "Select whether high-risk CAD or frequent angina despite GDMT is present.");

  // Layer 3 soft guidance (does not block)
  if (inputs.anyLimit === true) {
    pushFlag("warning", "FEAS_LIMIT", formatNote("Feasibility/contraindication considerations noted.", inputs.limitNotes));
    nextSteps.push(
      step(
        "Suggested alternatives (non-blocking)",
        "Consider a different stress modality based on feasibility and local availability; exercise ECG is for selected cases only.",
        null,
        "info"
      )
    );
  }

  // If missing required items, return early
  if (inputs.priorRevasc === null || inputs.highRisk === null) {
    return finalize(values, flags, {
      disposition: "Incomplete",
      summary: "Missing required selections.",
      nextSteps,
    });
  }

  values.branchesTaken.push(`priorRevasc=${inputs.priorRevasc ? "yes" : "no"}`);
  values.branchesTaken.push(`highRisk=${inputs.highRisk ? "yes" : "no"}`);

  // Prior revascularization note (COR 2a) - non-blocking
  if (inputs.priorRevasc === true) {
    nextSteps.push(
      step(
        "CCTA for selected prior revascularization",
        "CCTA is reasonable to evaluate bypass graft or stent patency (for stents ≥3 mm).",
        "COR 2a",
        "info"
      )
    );
  }

  // High-risk CAD / frequent angina → ICA (COR 1)
  if (inputs.highRisk === true) {
    nextSteps.unshift(step("Invasive coronary angiography with FFR/iFR", "High-risk CAD or frequent angina despite GDMT.", "COR 1", "warning"));
    return finalize(values, flags, {
      disposition: "Refer for invasive coronary angiography",
      summary: "High-risk CAD/frequent angina despite GDMT → ICA with FFR/iFR (COR 1).",
      nextSteps,
    });
  }

  // Not high risk → stress testing branch
  nextSteps.unshift(
    step(
      "Stress testing",
      "Stress imaging (PET/SPECT/CMR/echo) recommended; exercise ECG may be used in selected cases.",
      "Stress imaging COR 1; Exercise ECG COR 2a",
      "info"
    )
  );

  if (!inputs.stressResult) {
    pushFlag("warning", "REQ_STRESS_RESULT", "Select the stress test result to continue.");
    return finalize(values, flags, {
      disposition: "Stress testing selected",
      summary: "Awaiting stress test result selection.",
      nextSteps,
    });
  }

  values.branchesTaken.push(`stressResult=${inputs.stressResult}`);
  if (inputs.stressModality) values.branchesTaken.push(`stressModality=${inputs.stressModality}`);

  if (inputs.stressResult === "modsev") {
    nextSteps.push(step("Invasive coronary angiography with FFR/iFR", "Moderate/severe ischemia despite GDMT.", "COR 1", "warning"));
    return finalize(values, flags, {
      disposition: "Refer for invasive coronary angiography",
      summary: "Moderate/severe ischemia → ICA to guide decision-making (COR 1).",
      nextSteps,
    });
  }

  if (inputs.stressResult === "mild") {
    nextSteps.push(step("GDMT according to SIHD guideline", "Mild ischemia branch.", null, "info"));
    return finalize(values, flags, {
      disposition: "Continue/optimize GDMT per SIHD",
      summary: "Mild ischemia → GDMT per SIHD guideline; follow-up guided by symptoms and shared decision-making.",
      nextSteps,
    });
  }

  if (inputs.stressResult === "none") {
    nextSteps.push(step("GDMT according to SIHD guideline", "No ischemia branch.", null, "info"));
    return finalize(values, flags, {
      disposition: "Continue GDMT per SIHD",
      summary: "No ischemia → GDMT per SIHD guideline; follow-up guided by symptoms and shared decision-making.",
      nextSteps,
    });
  }

  // Inconclusive: return guidance, non-blocking
  nextSteps.push(
    step(
      "Inconclusive stress test",
      "Consider repeat testing with an alternate modality or ICA depending on symptoms and risk, using local protocols.",
      null,
      "warning"
    )
  );
  return finalize(values, flags, {
    disposition: "Inconclusive stress test",
    summary: "Inconclusive/non-diagnostic stress test → consider alternate testing strategy based on clinical context.",
    nextSteps,
  });
}

function finalize(values, flags, interpretation) {
  return { values, flags, interpretation };
}

function yesNoToBool(v) {
  if (!v) return null;
  if (v === "yes") return true;
  if (v === "no") return false;
  return null;
}

function formatNote(prefix, note) {
  const trimmed = (note || "").trim();
  return trimmed ? `${prefix} Note: ${trimmed}` : prefix;
}

function prettyMod(mod) {
  return (mod || "")
    .replace("stress_pet", "Stress PET")
    .replace("stress_spect", "Stress SPECT")
    .replace("stress_cmr", "Stress CMR")
    .replace("stress_echo", "Stress echocardiography")
    .replace("exercise_ecg", "Exercise ECG");
}

// ------------------------------
// UI glue (matches your established pattern)
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("tool-form");
  const resetBtn = document.getElementById("resetBtn");
  const resultsContainer = document.getElementById("results-container");
  const flagsContainer = document.getElementById("flags-container");

  const highRisk = document.getElementById("highRisk");
  const stressBlock = document.getElementById("stressBlock");

  function setDisplay(el, show) {
    if (!el) return;
    el.style.display = show ? "" : "none";
  }

  function normalize() {
    const hr = highRisk?.value || "";
    // Show stress block only when highRisk is explicitly "no"
    setDisplay(stressBlock, hr === "no");
  }

  highRisk?.addEventListener("change", normalize);
  normalize();
  setupModals();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const inputs = readInputs();
    const result = evaluateKnownObstructive(inputs);
    renderResults(resultsContainer, result);
    renderFlags(flagsContainer, result.flags);
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    normalize();
    resultsContainer.innerHTML = `<p class="results-placeholder">Complete selections and tap “Run pathway.”</p>`;
    flagsContainer.innerHTML = `<p class="results-placeholder">Non-blocking warnings and alternatives appear here.</p>`;
  });
});

function readInputs() {
  const get = (id) => document.getElementById(id)?.value ?? "";
  const getText = (id) => (document.getElementById(id)?.value ?? "").trim();

  return {
    priorRevasc: yesNoToBool(get("priorRevasc")),
    highRisk: yesNoToBool(get("highRisk")),

    stressModality: get("stressModality") || null,
    stressResult: get("stressResult") || null,

    anyLimit: yesNoToBool(get("anyLimit")),
    limitNotes: getText("limitNotes"),
  };
}

// Modal system
function setupModals() {
  const backdrop = document.getElementById("modal-backdrop");
  const triggers = document.querySelectorAll("[data-modal]");
  const closeBtns = document.querySelectorAll("[data-close='true']");

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("is-open");
    backdrop.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    backdrop.setAttribute("aria-hidden", "false");
  }

  function closeAll() {
    document.querySelectorAll(".modal.is-open").forEach((m) => {
      m.classList.remove("is-open");
      m.setAttribute("aria-hidden", "true");
    });
    backdrop.classList.remove("is-open");
    backdrop.setAttribute("aria-hidden", "true");
  }

  triggers.forEach((t) => t.addEventListener("click", () => openModal(t.getAttribute("data-modal"))));
  closeBtns.forEach((b) => b.addEventListener("click", closeAll));
  backdrop?.addEventListener("click", closeAll);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });
}

// Rendering (supports optional step.link)
function renderResults(container, result) {
  if (!container) return;

  const disp = result?.interpretation?.disposition ?? "—";
  const summary = result?.interpretation?.summary ?? "";

  const steps = (result?.interpretation?.nextSteps || [])
    .map((s) => {
      const strength = s.strength ? `<div style="color: var(--color-text-secondary); margin-top: 0.15rem;">${escapeHtml(s.strength)}</div>` : "";
      const link = s.link
        ? `<div style="margin-top:0.45rem;"><a class="link-btn" href="${escapeHtml(s.link)}">Open module</a></div>`
        : "";
      return `
        <div style="margin:0.6rem 0; padding-top:0.4rem; border-top:1px solid rgba(255,255,255,0.06);">
          <div><strong>${escapeHtml(s.label)}</strong></div>
          <div style="color: var(--color-text-secondary); margin-top: 0.15rem;">${escapeHtml(s.detail || "")}</div>
          ${strength}
          ${link}
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div>
      <div style="margin-bottom: 0.6rem;">
        <div style="color: var(--color-text-secondary); font-size: 0.9rem;">Disposition</div>
        <div style="font-size: 1.05rem;"><strong>${escapeHtml(disp)}</strong></div>
        ${summary ? `<div style="color: var(--color-text-secondary); margin-top:0.25rem;">${escapeHtml(summary)}</div>` : ""}
      </div>

      <hr class="hr" />

      <div>
        <div style="color: var(--color-text-secondary); font-size: 0.9rem;">Next steps</div>
        ${steps || `<p class="results-placeholder">No next steps.</p>`}
      </div>
    </div>
  `;
}

function renderFlags(container, flags) {
  if (!container) return;

  if (!flags || flags.length === 0) {
    container.innerHTML = `<p class="results-placeholder">No flags raised.</p>`;
    return;
  }

  container.innerHTML = flags
    .map((f) => {
      const cls =
        f.severity === "high"
          ? "flag-pill flag-pill--danger"
          : f.severity === "warning"
          ? "flag-pill flag-pill--warning"
          : "flag-pill flag-pill--info";
      return `<div class="${cls}"><strong>${escapeHtml(f.code)}:</strong> ${escapeHtml(f.message)}</div>`;
    })
    .join("");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[m];
  });
}
