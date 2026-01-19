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

  const backBtn = document.getElementById("backBtn");
backBtn?.addEventListener("click", () => window.history.back());
  function setDisplay(el, show) {
    if (!el) return;
    el.style.display = show ? "" : "none";
  }

  function normalize() {
    const hr = highRisk?.value || "";
    // Show stress block only when highRisk is explicitly "no"
    setDisplay(stressBlock, hr === "no");
  }
// ==============================
// Wave 2 #1 Guided Recommender — Known Obstructive
// - Lives inside #stressBlock
// - Stepwise prompts (one at a time)
// - Apply buttons only after 3 prompts answered
// - Non-blocking; only sets stressModality
// ==============================

const rec = {
  canExercise: document.getElementById("rec_canExercise"),
  ecgWrap: document.getElementById("rec_ecgWrap"),
  ecg: document.getElementById("rec_ecgInterpretable"),
  // Optional extra sections (if present in your HTML; safe if null)
  hardStopsWrap: document.getElementById("rec_hardStopsWrap"),
  availWrap: document.getElementById("rec_availWrap"),
  renalWrap: document.getElementById("rec_renalWrap"),
  renal: document.getElementById("rec_renalConcern"),
  output: document.getElementById("rec_output"),
  applyRow: document.getElementById("rec_applyRow"),
  btnPrimary: document.getElementById("rec_applyPrimary"),
  btnAlt1: document.getElementById("rec_applyAlt1"),
  btnAlt2: document.getElementById("rec_applyAlt2"),
};

// Module elements
const highRiskEl = document.getElementById("highRisk");
const stressBlockEl = document.getElementById("stressBlock");
const stressModalityEl = document.getElementById("stressModality");

function show(el, on) {
  if (!el) return;
  el.style.display = on ? "" : "none";
}
function v(el) {
  return (el && el.value) ? el.value : "";
}

// If your file doesn't already have escapeHtml, keep this one-liner:
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[m]));
}

function applyLabel(mod) {
  const map = {
    stress_pet: "Apply Stress PET",
    stress_spect: "Apply Stress SPECT",
    stress_cmr: "Apply Stress CMR",
    stress_echo: "Apply Stress echo",
    exercise_ecg: "Apply Exercise ECG",
  };
  return map[mod] || "Apply";
}

// Heuristic modality ranking (non-blocking)
// Inputs: canExercise, ecgInterpretable, renalConcern
function recommendObstructiveStress(r) {
  const out = { primary: null, alternatives: [] };
  if (!r.canExercise) return out;

  const renalYes = r.renalConcern === "yes";
  const canExYes = r.canExercise === "yes";
  const ecgYes = r.ecgInterpretable === "yes";

  const cands = [];

  // Exercise ECG only in selected cases
  if (canExYes && ecgYes) {
    cands.push({
      mod: "exercise_ecg",
      label: "Exercise ECG (selected cases)",
      note: "Selected cases: interpretable baseline ECG + adequate exercise capacity.",
      score: 3,
    });
  }

  // Stress CMR tends to be excellent if available (renal concern may matter locally)
  cands.push({
    mod: "stress_cmr",
    label: "Stress CMR",
    note: renalYes ? "Renal impairment may affect contrast use per local protocol." : "Good option when available and feasible.",
    score: renalYes ? 3 : 4,
  });

  // PET (often highest performance; availability-dependent, but we are not asking availability here)
  cands.push({
    mod: "stress_pet",
    label: "Stress PET",
    note: "Consider if available; useful when echo windows are poor or higher accuracy desired.",
    score: 4,
  });

  // Stress echo
  cands.push({
    mod: "stress_echo",
    label: "Stress echocardiography",
    note: "Good option when image quality is expected to be adequate.",
    score: 3,
  });

  // SPECT as a common alternative
  cands.push({
    mod: "stress_spect",
    label: "Stress SPECT",
    note: "Useful alternative when PET/CMR not available; consider local protocol.",
    score: 2,
  });

  // Sort and pick top 3
  cands.sort((a, b) => b.score - a.score);
  out.primary = cands[0];
  out.alternatives = cands.slice(1, 3);
  return out;
}

function applyRec(mod) {
  if (!stressModalityEl || !mod) return;
  stressModalityEl.value = mod;
  stressModalityEl.dispatchEvent(new Event("change", { bubbles: true }));

  // Re-run your existing UI visibility logic if present
  if (typeof normalize === "function") normalize();
}

function renderRec() {
  // Only relevant when stressBlock is visible AND highRisk = "no"
  const hr = v(highRiskEl);

  const stressVisible =
    !!stressBlockEl &&
    stressBlockEl.style.display !== "none" &&
    hr === "no";

  if (!stressVisible) {
    // Hide everything so it doesn't confuse users
    show(rec.ecgWrap, false);
    show(rec.renalWrap, false);
    show(rec.hardStopsWrap, false);
    show(rec.availWrap, false);
    show(rec.applyRow, false);
    if (rec.output) {
      rec.output.innerHTML = `<strong>Recommendation</strong><p class="micro-note">Available when stress testing is the selected route.</p>`;
    }
    return;
  }

  // Stepwise prompts
  const canEx = v(rec.canExercise);
  show(rec.ecgWrap, canEx === "yes");

  const ecgNeeded = canEx === "yes";
  const ecgAns = v(rec.ecg);

  const readyForRenal = !!canEx && (!ecgNeeded || !!ecgAns);
  show(rec.renalWrap, readyForRenal);

  // Keep extra sections hidden for Option A (reduce overwhelm)
  show(rec.hardStopsWrap, false);
  show(rec.availWrap, false);

  const renalAns = v(rec.renal);

  // Gate: 3 prompts answered (Step 1 + Step 2 if needed + renal)
  const gateOk = !!canEx && (!ecgNeeded || !!ecgAns) && !!renalAns;

  const out = recommendObstructiveStress({
    canExercise: canEx,
    ecgInterpretable: ecgAns,
    renalConcern: renalAns,
  });

  if (!rec.output) return;

  if (!out.primary) {
    rec.output.innerHTML = `<strong>Recommendation</strong><p class="micro-note">Answer the first prompt to begin.</p>`;
    show(rec.applyRow, false);
    return;
  }

  rec.output.innerHTML = `
    <strong>Recommendation</strong>
    <div style="margin-top:0.45rem;"><strong>${escapeHtml(out.primary.label)}</strong></div>
    <p class="micro-note" style="margin-top:0.35rem;">${escapeHtml(out.primary.note || "")}</p>
    ${!gateOk ? `<p class="micro-note">Answer the first 3 prompts to unlock Apply buttons.</p>` : ""}
  `;

  show(rec.applyRow, gateOk);
  if (!gateOk) return;

  // Primary
  rec.btnPrimary.textContent = applyLabel(out.primary.mod);
  rec.btnPrimary.onclick = () => applyRec(out.primary.mod);

  // Alt 1
  if (out.alternatives[0]) {
    show(rec.btnAlt1, true);
    rec.btnAlt1.textContent = applyLabel(out.alternatives[0].mod);
    rec.btnAlt1.onclick = () => applyRec(out.alternatives[0].mod);
  } else {
    show(rec.btnAlt1, false);
  }

  // Alt 2
  if (out.alternatives[1]) {
    show(rec.btnAlt2, true);
    rec.btnAlt2.textContent = applyLabel(out.alternatives[1].mod);
    rec.btnAlt2.onclick = () => applyRec(out.alternatives[1].mod);
  } else {
    show(rec.btnAlt2, false);
  }
}

// Wire events (safe if any missing)
[highRiskEl, rec.canExercise, rec.ecg, rec.renal].forEach((el) => {
  if (!el) return;
  el.addEventListener("change", renderRec);
});

// Initial render
renderRec();
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
