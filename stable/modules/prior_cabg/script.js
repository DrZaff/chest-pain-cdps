export function evaluatePriorCabg(inputs) {
  const values = {
    pathwayId: "stable-prior-cabg",
    version: "v1.0",
    inputSummary: { ...inputs },
    branchesTaken: [],
  };

  const flags = [];
  const nextSteps = [];

  const pushFlag = (severity, code, message) => flags.push({ severity, code, message });
  const step = (label, detail, strength = null, level = "info") => ({ label, detail, strength, level });

  pushFlag("info", "SCOPE", "Stable chest pain + prior CABG module. Decision-support only.");

  // Layer 3 non-blocking feasibility guidance
  addFeasibilityGuidance(inputs, pushFlag, nextSteps);

  // Validate minimal required items
  const v = validate(inputs);
  if (!v.ok) flags.push(...v.flags);

  // Strategy branch
  if (!inputs.strategy) {
    pushFlag("warning", "REQ_STRATEGY", "Select an initial strategy (Stress imaging vs CCTA vs ICA now).");
    return finalize(values, flags, {
      disposition: "Incomplete",
      summary: "Choose an initial strategy to proceed.",
      nextSteps,
    });
  }

  values.branchesTaken.push(`strategy=${inputs.strategy}`);

  // ICA now
  if (inputs.strategy === "ica_now") {
    nextSteps.push(step("Invasive coronary angiography (ICA)", "ICA now selected for very high clinical suspicion / frequent angina.", "COR varies by context", "warning"));
    nextSteps.push(step("Physiologic assessment as appropriate", "Consider FFR/iFR when relevant per local practice.", null, "info"));
    return finalize(values, flags, {
      disposition: "Proceed to ICA",
      summary: "ICA now selected based on clinical context (very high suspicion/frequent angina).",
      nextSteps,
    });
  }

  // Stress imaging
  if (inputs.strategy === "stress") {
    nextSteps.unshift(step("Stress imaging", "Functional assessment in prior CABG population.", "See guideline table", "info"));

    if (!inputs.stressResult) {
      pushFlag("warning", "REQ_STRESS_RESULT", "Select a stress result to continue.");
      return finalize(values, flags, {
        disposition: "Awaiting stress result",
        summary: "Stress imaging selected; awaiting result selection.",
        nextSteps,
      });
    }

    values.branchesTaken.push(`stressResult=${inputs.stressResult}`);

    if (inputs.stressResult === "modsev") {
      nextSteps.push(step("Consider ICA", "Moderate–severe ischemia typically warrants escalation to invasive evaluation.", "See guideline table", "warning"));
      nextSteps.push(step("Optimize GDMT", "Continue/optimize GDMT alongside invasive evaluation considerations.", null, "info"));
      return finalize(values, flags, {
        disposition: "Moderate–severe ischemia",
        summary: "Moderate–severe ischemia → consider ICA; optimize GDMT.",
        nextSteps,
      });
    }

    if (inputs.stressResult === "inconclusive") {
      nextSteps.push(step("Additional anatomic/functional evaluation", "Inconclusive/nondiagnostic test → consider alternative modality (e.g., CCTA if feasible) or ICA depending on suspicion.", "See guideline table", "warning"));
      return finalize(values, flags, {
        disposition: "Inconclusive / nondiagnostic",
        summary: "Inconclusive testing → consider alternative modality or ICA based on clinical suspicion.",
        nextSteps,
      });
    }

    // none/mild
    nextSteps.push(step("Continue GDMT", "No/mild ischemia → continue GDMT and reassess if symptoms persist or change.", null, "info"));
    return finalize(values, flags, {
      disposition: "No / mild ischemia",
      summary: "No/mild ischemia → continue GDMT; reassess with symptom evolution.",
      nextSteps,
    });
  }

  // CCTA (selected cases)
  if (inputs.strategy === "ccta") {
    nextSteps.unshift(step("CCTA (selected cases)", "Anatomic clarification when feasible and clinically useful.", "See guideline table", "info"));

    if (!inputs.cctaResult) {
      pushFlag("warning", "REQ_CCTA_RESULT", "Select a simplified CCTA result summary to continue.");
      return finalize(values, flags, {
        disposition: "Awaiting CCTA summary",
        summary: "CCTA selected; awaiting summary selection.",
        nextSteps,
      });
    }

    values.branchesTaken.push(`cctaResult=${inputs.cctaResult}`);

    if (inputs.cctaResult === "high_risk") {
      nextSteps.push(step("Consider ICA", "Concerning/high-risk findings → consider invasive evaluation.", "See guideline table", "warning"));
      return finalize(values, flags, {
        disposition: "Concerning CCTA findings",
        summary: "High-risk/concerning findings → consider ICA based on context.",
        nextSteps,
      });
    }

    if (inputs.cctaResult === "nondiagnostic") {
      nextSteps.push(step("Alternative test or ICA", "Nondiagnostic/limited CCTA → consider stress imaging or ICA depending on suspicion.", "See guideline table", "warning"));
      return finalize(values, flags, {
        disposition: "Nondiagnostic CCTA",
        summary: "Nondiagnostic CCTA → alternative testing or ICA based on clinical suspicion.",
        nextSteps,
      });
    }

    // no high-risk
    nextSteps.push(step("Continue GDMT", "No high-risk findings → continue GDMT and reassess if symptoms persist/change.", null, "info"));
    return finalize(values, flags, {
      disposition: "No high-risk findings on CCTA",
      summary: "No high-risk findings → continue GDMT; reassess with symptom evolution.",
      nextSteps,
    });
  }

  // Fallback
  pushFlag("warning", "UNKNOWN_STRATEGY", "Unrecognized strategy selection.");
  return finalize(values, flags, { disposition: "Incomplete", summary: "Unknown strategy.", nextSteps });
}

function addFeasibilityGuidance(inputs, pushFlag, nextSteps) {
  // CCTA feasibility warning + alternatives (non-blocking)
  if (inputs.strategy === "ccta" && inputs.layer3?.cctaAnyLimit === true) {
    pushFlag("warning", "CCTA_LIMITED", formatNote("CCTA may be limited by patient/site factors.", inputs.layer3?.cctaNotes));
    nextSteps.push({
      label: "Suggested alternatives (non-blocking)",
      detail: "Consider stress imaging (echo, PET/SPECT, CMR) or ICA depending on clinical suspicion and feasibility.",
      strength: null,
      level: "info",
    });
  }

  // Stress feasibility warning + alternatives (non-blocking)
  if (inputs.strategy === "stress" && inputs.stressModality && inputs.layer3?.stressAnyLimit === true) {
    pushFlag("warning", "STRESS_LIMITED", formatNote(`Selected stress modality may be limited (${prettyMod(inputs.stressModality)}).`, inputs.layer3?.stressNotes));
    nextSteps.push({
      label: "Suggested alternatives (non-blocking)",
      detail: "Consider another stress modality, CCTA (selected cases), or ICA based on suspicion and feasibility.",
      strength: null,
      level: "info",
    });
  }
}

function validate(inputs) {
  const flags = [];
  const warn = (code, message) => flags.push({ severity: "warning", code, message });

  if (!inputs.strategy) warn("REQ_STRATEGY", "Strategy selection is required.");

  if (inputs.strategy === "stress") {
    if (!inputs.stressResult) warn("REQ_STRESS_RESULT", "Stress result selection is required.");
  }

  if (inputs.strategy === "ccta") {
    if (!inputs.cctaResult) warn("REQ_CCTA_RESULT", "CCTA summary selection is required.");
  }

  return { ok: flags.length === 0, flags };
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
  return mod
    .replace("stress_echo", "Stress echocardiography")
    .replace("stress_nuclear", "Stress PET/SPECT")
    .replace("stress_cmr", "Stress CMR");
}

// ------------------------------
// UI glue
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("tool-form");
  const resetBtn = document.getElementById("resetBtn");
  const resultsContainer = document.getElementById("results-container");
  const flagsContainer = document.getElementById("flags-container");

  const strategy = document.getElementById("strategy");

  const cctaFeasWrap = document.getElementById("cctaFeasWrap");
  const stressModalityWrap = document.getElementById("stressModalityWrap");
  const stressFeasWrap = document.getElementById("stressFeasWrap");
  const stressResultWrap = document.getElementById("stressResultWrap");
  const cctaResultWrap = document.getElementById("cctaResultWrap");

  const stressModality = document.getElementById("stressModality");
  const stressAbbrevList = document.getElementById("stressAbbrevList");

const backBtn = document.getElementById("backBtn");
backBtn?.addEventListener("click", () => window.history.back());
  
  function setDisplay(el, show) {
    if (!el) return;
    el.style.display = show ? "" : "none";
  }

  function setStressAbbrev(mod) {
    const content = {
      stress_echo: `
        <strong>Stress echo (3)</strong>
        <ul>
          <li>Poor acoustic windows may reduce accuracy</li>
          <li>Arrhythmias can reduce feasibility</li>
          <li>Dobutamine limitations when used</li>
        </ul>`,
      stress_nuclear: `
        <strong>PET/SPECT (3)</strong>
        <ul>
          <li>Caffeine/theophylline may interfere</li>
          <li>Bronchospasm can limit vasodilators</li>
          <li>Consider hypotension/instability</li>
        </ul>`,
      stress_cmr: `
        <strong>Stress CMR (3)</strong>
        <ul>
          <li>MRI-unsafe devices/claustrophobia</li>
          <li>Low GFR constraints (local protocol)</li>
          <li>Caffeine may interfere with vasodilator</li>
        </ul>`,
    };
    stressAbbrevList.innerHTML = content[mod] || `<strong>Select a modality to view abbreviated considerations.</strong>`;
  }

  function normalize() {
    const s = strategy.value || "";

    const isStress = s === "stress";
    const isCcta = s === "ccta";

    setDisplay(cctaFeasWrap, isCcta);
    setDisplay(cctaResultWrap, isCcta);

    setDisplay(stressModalityWrap, isStress);
    setDisplay(stressFeasWrap, isStress && !!(stressModality?.value));
    setDisplay(stressResultWrap, isStress);

    setStressAbbrev(stressModality?.value || "");
  }

  strategy.addEventListener("change", normalize);
  stressModality?.addEventListener("change", normalize);

  normalize();
  setupModals();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const inputs = readInputs();
    const result = evaluatePriorCabg(inputs);
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
    strategy: get("strategy") || null,

    stressModality: get("stressModality") || null,
    stressResult: get("stressResult") || null,

    cctaResult: get("cctaResult") || null,

    layer3: {
      cctaAnyLimit: yesNoToBool(get("cctaAnyLimit")),
      cctaNotes: getText("cctaNotes"),
      stressAnyLimit: yesNoToBool(get("stressAnyLimit")),
      stressNotes: getText("stressNotes"),
    },
  };
}

// Modals
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

// Rendering
function renderResults(container, result) {
  if (!container) return;

  const disp = result?.interpretation?.disposition ?? "—";
  const summary = result?.interpretation?.summary ?? "";

  const steps = (result?.interpretation?.nextSteps || [])
    .map((s) => {
      const strength = s.strength ? `<div style="color: var(--color-text-secondary); margin-top: 0.15rem;">${escapeHtml(s.strength)}</div>` : "";
      return `
        <div style="margin:0.6rem 0; padding-top:0.4rem; border-top:1px solid rgba(255,255,255,0.06);">
          <div><strong>${escapeHtml(s.label)}</strong></div>
          <div style="color: var(--color-text-secondary); margin-top: 0.15rem;">${escapeHtml(s.detail || "")}</div>
          ${strength}
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
