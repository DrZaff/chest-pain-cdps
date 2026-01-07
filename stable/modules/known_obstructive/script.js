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

  // CABG gate (your requirement)
  if (inputs.priorCabg === true) {
    values.branchesTaken.push("priorCABG=yes");
    nextSteps.push(step("Prior CABG pathway", "Prior CABG history selected → use the dedicated Prior CABG module.", null, "info", "/stable/modules/prior_cabg/index.html"));
    return finalize(values, flags, {
      disposition: "Route to Prior CABG module",
      summary: "Known obstructive CAD with prior CABG: open Prior CABG module for appropriate testing strategy.",
      nextSteps,
    });
  }

  if (inputs.priorCabg === null) {
    pushFlag("warning", "REQ_CABG", "Select whether prior CABG history is present.");
    return finalize(values, flags, { disposition: "Incomplete", summary: "Missing prior CABG selection.", nextSteps });
  }

  values.branchesTaken.push("priorCABG=no");

  // GDMT emphasis (COR 1)
  nextSteps.push(step("Evaluate adequacy of GDMT", "Assess symptom control and optimization of guideline-directed medical therapy.", "COR 1", "info"));
  if (inputs.gdmtOptimized === false) {
    values.branchesTaken.push("gdmtOptimized=no");
    pushFlag("info", "GDMT_NOT_OPTIMIZED", "GDMT not optimized/uncertain → emphasize intensification and option to defer testing.");
    nextSteps.push(step("Intensify GDMT ± defer testing", "Intensify preventive/antianginal therapies; deferring testing may be reasonable while optimizing.", "COR 1", "info"));
  } else if (inputs.gdmtOptimized === true) {
    values.branchesTaken.push("gdmtOptimized=yes");
    nextSteps.push(step("GDMT optimized", "Proceed with downstream decision-making based on symptoms and risk features.", null, "info"));
  } else {
    // not selected
    pushFlag("warning", "REQ_GDMT", "Select whether GDMT is optimized/adequate (or choose 'No/uncertain').");
  }

  // High-risk CAD / frequent angina node
  if (inputs.highRiskCad === true) {
    values.branchesTaken.push("highRiskCad=yes");
    nextSteps.push(step("Invasive coronary angiography with FFR/iFR", "High-risk CAD or frequent angina → ICA with physiologic assessment.", "COR 1", "warning"));
    nextSteps.push(step("CCTA for selected prior revascularization", "CCTA may be reasonable for selected prior revascularization evaluation.", "COR 2a", "info"));
    return finalize(values, flags, {
      disposition: "Refer for ICA with FFR/iFR",
      summary: "Known obstructive CAD + high-risk features/frequent angina → ICA with FFR/iFR (COR 1).",
      nextSteps,
    });
  }

  if (inputs.highRiskCad === false) {
    values.branchesTaken.push("highRiskCad=no");

    // Layer 3 soft guidance: stress feasibility + alternatives
    addStressFeasibilityGuidance(inputs, pushFlag, nextSteps);

    // Stress testing pathway (COR 1 for imaging; exercise ECG COR 2a)
    if (!inputs.stressResult) {
      pushFlag("warning", "REQ_STRESS_RESULT", "Select the stress testing result to complete the branch.");
      nextSteps.unshift(step("Stress testing", "Proceed with stress testing when not high-risk/frequent angina.", "COR 1 (imaging); Exercise ECG COR 2a", "info"));
      return finalize(values, flags, {
        disposition: "Stress testing",
        summary: "Not high-risk/frequent angina → stress testing; awaiting result selection.",
        nextSteps,
      });
    }

    values.branchesTaken.push(`stressResult=${inputs.stressResult}`);

    if (inputs.stressResult === "modsev") {
      nextSteps.unshift(step("Stress testing", "Moderate–severe ischemia branch.", "COR 1 (imaging)", "warning"));
      nextSteps.push(step("ICA with FFR/iFR consideration", "Moderate–severe ischemia supports escalation to invasive evaluation in symptomatic obstructive CAD.", "COR 1", "warning"));
      nextSteps.push(step("GDMT according to SIHD guideline", "Continue/optimize GDMT alongside invasive evaluation considerations.", null, "info"));
      return finalize(values, flags, {
        disposition: "Moderate–severe ischemia",
        summary: "Stress testing shows moderate–severe ischemia → consider invasive evaluation; continue GDMT per SIHD guidance.",
        nextSteps,
      });
    }

    if (inputs.stressResult === "mild") {
      nextSteps.unshift(step("Stress testing", "Mild ischemia branch.", "COR 1 (imaging)", "info"));
      nextSteps.push(step("GDMT according to SIHD guideline", "Mild ischemia → optimize GDMT; follow symptoms over time.", null, "info"));
      return finalize(values, flags, {
        disposition: "Mild ischemia",
        summary: "Mild ischemia → GDMT per SIHD guideline; follow symptom burden.",
        nextSteps,
      });
    }

    // none
    nextSteps.unshift(step("Stress testing", "No ischemia branch.", "COR 1 (imaging)", "info"));
    nextSteps.push(step("GDMT according to SIHD guideline", "No ischemia → continue GDMT and reassess as needed.", null, "info"));
    return finalize(values, flags, {
      disposition: "No ischemia",
      summary: "No ischemia → continue GDMT per SIHD guideline.",
      nextSteps,
    });
  }

  pushFlag("warning", "REQ_HIGH_RISK", "Select whether high-risk CAD or frequent angina is present.");
  return finalize(values, flags, { disposition: "Incomplete", summary: "Missing high-risk/frequent angina selection.", nextSteps });
}

function addStressFeasibilityGuidance(inputs, pushFlag, nextSteps) {
  if (inputs.layer3?.stressAnyLimit === true && inputs.stressModality) {
    pushFlag("warning", "STRESS_LIMITED", formatNote(`Selected stress modality may be limited (${prettyMod(inputs.stressModality)}).`, inputs.layer3?.stressNotes));
    nextSteps.push({
      label: "Suggested alternatives (non-blocking)",
      detail: "Consider a different stress imaging modality when feasibility is limited; choose based on contraindications and local availability.",
      strength: null,
      level: "info",
    });
  }
}

function validate(inputs) {
  const flags = [];
  const warn = (code, message) => flags.push({ severity: "warning", code, message });

  if (inputs.priorCabg === null) warn("REQ_CABG", "Prior CABG selection is required.");

  // if no CABG, need high-risk selection
  if (inputs.priorCabg === false) {
    if (inputs.highRiskCad === null) warn("REQ_HIGH_RISK", "High-risk CAD/frequent angina selection is required.");
    // GDMT is advisory but still should be selected
    if (inputs.gdmtOptimized === null) warn("REQ_GDMT", "GDMT optimization selection is required (or choose 'No/uncertain').");

    // if not high risk, stress result should be chosen to complete branch
    if (inputs.highRiskCad === false) {
      if (!inputs.stressModality) warn("REQ_STRESS_MODALITY", "Select a stress modality (even if for documentation only).");
      if (!inputs.stressResult) warn("REQ_STRESS_RESULT", "Stress test result selection is required.");
    }
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
    .replace("exercise_ecg", "Exercise ECG")
    .replace("stress_echo", "Stress echocardiography")
    .replace("stress_nuclear", "Stress nuclear (PET/SPECT)")
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

  const priorCabg = document.getElementById("priorCabg");
  const highRiskCad = document.getElementById("highRiskCad");

  const stressModalityWrap = document.getElementById("stressModalityWrap");
  const stressModality = document.getElementById("stressModality");
  const stressFeasWrap = document.getElementById("stressFeasWrap");
  const stressAbbrevList = document.getElementById("stressAbbrevList");
  const stressResultWrap = document.getElementById("stressResultWrap");

  function setDisplay(el, show) {
    if (!el) return;
    el.style.display = show ? "" : "none";
  }

  function setStressAbbrev(mod) {
    const content = {
      exercise_ecg: `
        <strong>Exercise ECG (abbrev)</strong>
        <ul>
          <li>Interpretable baseline ECG</li>
          <li>Adequate exercise capacity</li>
          <li>Consider arrhythmias/AS/HTN limitations</li>
        </ul>`,
      stress_echo: `
        <strong>Stress echo (abbrev)</strong>
        <ul>
          <li>Image quality / acoustic windows</li>
          <li>Dobutamine limitations when used</li>
          <li>Arrhythmias may reduce feasibility</li>
        </ul>`,
      stress_nuclear: `
        <strong>PET/SPECT (abbrev)</strong>
        <ul>
          <li>Caffeine/theophylline may interfere</li>
          <li>Bronchospasm can limit vasodilators</li>
          <li>Consider hypotension/instability</li>
        </ul>`,
      stress_cmr: `
        <strong>Stress CMR (abbrev)</strong>
        <ul>
          <li>MRI-unsafe devices/claustrophobia</li>
          <li>Low GFR constraints (local protocol)</li>
          <li>Caffeine may interfere with vasodilator</li>
        </ul>`,
    };
    stressAbbrevList.innerHTML = content[mod] || `<strong>Select a modality to view abbreviated considerations.</strong>`;
  }

  function normalize() {
    const cabg = priorCabg.value || "";
    const cabgNo = cabg === "no";
    const cabgYes = cabg === "yes";

    // If CABG yes, we don't need stress fields
    if (cabgYes) {
      setDisplay(stressModalityWrap, false);
      setDisplay(stressFeasWrap, false);
      setDisplay(stressResultWrap, false);
      return;
    }

    // Only show stress pathway when cabg=no AND highRisk=no
    const hr = highRiskCad.value || "";
    const showStress = cabgNo && hr === "no";

    setDisplay(stressModalityWrap, showStress);
    setDisplay(stressFeasWrap, showStress && !!(stressModality?.value));
    setDisplay(stressResultWrap, showStress);

    setStressAbbrev(stressModality?.value || "");
  }

  priorCabg.addEventListener("change", normalize);
  highRiskCad.addEventListener("change", normalize);
  stressModality?.addEventListener("change", normalize);

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
    priorCabg: yesNoToBool(get("priorCabg")),
    gdmtOptimized: yesNoToBool(get("gdmtOptimized")),
    highRiskCad: yesNoToBool(get("highRiskCad")),

    stressModality: get("stressModality") || null,
    stressResult: get("stressResult") || null,

    layer3: {
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

// Rendering (supports step.link)
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
