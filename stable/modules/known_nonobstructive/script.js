export function evaluateKnownNonobstructive(inputs) {
  const values = {
    pathwayId: "stable-known-nonobstructive",
    version: "v1.0.1",
    inputSummary: { ...inputs },
    branchesTaken: [],
  };

  const flags = [];
  const nextSteps = [];

  const pushFlag = (severity, code, message) => flags.push({ severity, code, message });
  const step = (label, detail, strength = null, level = "info") => ({ label, detail, strength, level });

  pushFlag("info", "SCOPE", "Stable chest pain + known nonobstructive CAD module. Decision-support only.");

  // Layer 3 (soft guidance): feasibility warnings + alternatives (non-blocking)
  addFeasibilityGuidance(inputs, pushFlag, nextSteps);

  // Validation
  const v = validate(inputs);
  if (!v.ok) flags.push(...v.flags);

  // Branch 1: no persistent symptoms
  if (inputs.persistentSymptoms === false) {
    values.branchesTaken.push("persistentSymptoms=no");

    nextSteps.push(step("Optimize preventive therapies", "Assess adequacy of GDMT; intensify preventive strategies.", "COR 1", "info"));
    nextSteps.push(step("May defer further testing", "If symptoms are not persistent/frequent, deferring testing is reasonable per pathway.", "COR 1", "info"));

    // Optional INOCA link (non-blocking) — if clinician toggled yes
    addInocaLinkIfAppropriate(inputs, nextSteps);

    return finalize(values, flags, {
      disposition: "Preventive optimization; testing may be deferred",
      summary: "Known nonobstructive CAD with no persistent/frequent symptoms: optimize preventive therapies; may defer testing (COR 1).",
      nextSteps: [...nextSteps],
    });
  }

  // Branch 2: persistent symptoms
  if (inputs.persistentSymptoms === true) {
    values.branchesTaken.push("persistentSymptoms=yes");

    if (!inputs.testStrategy) {
      pushFlag("warning", "MISSING_STRATEGY", "Select a testing strategy (CCTA±FFR-CT vs stress testing).");
      // Optional INOCA link (non-blocking)
      addInocaLinkIfAppropriate(inputs, nextSteps);

      return finalize(values, flags, {
        disposition: "Incomplete",
        summary: "Persistent symptoms: choose a testing strategy to continue.",
        nextSteps,
      });
    }

    if (inputs.testStrategy === "ccta_ffrct") {
      values.branchesTaken.push("strategy=ccta_ffrct");
      nextSteps.unshift(step("CCTA ± FFR-CT", "For persistent symptoms with known nonobstructive CAD.", "COR 2a", "info"));

      if (inputs.stenosis4090 === true) {
        values.branchesTaken.push("stenosis40_90=yes");

        if (inputs.ffrctLow === true) {
          values.branchesTaken.push("ffrct<=0.80=yes");
          nextSteps.push(step("Invasive coronary angiography", "FFR-CT ≤ 0.80 suggests hemodynamically significant disease.", "COR 1", "warning"));

          // ✅ FIX: still show INOCA pathway link (non-blocking) when clinician suspects INOCA
          addInocaLinkIfAppropriate(inputs, nextSteps);

          return finalize(values, flags, {
            disposition: "Refer for invasive coronary angiography",
            summary: "Persistent symptoms + CCTA/FFR-CT with FFR-CT ≤ 0.80 → ICA (COR 1).",
            nextSteps,
          });
        }

        if (inputs.ffrctLow === false) {
          values.branchesTaken.push("ffrct<=0.80=no");
          nextSteps.push(step("No hemodynamically significant disease on FFR-CT", "Consider alternative explanations for symptoms.", null, "info"));

          addInocaLinkIfAppropriate(inputs, nextSteps);
          return finalize(values, flags, {
            disposition: "No flow-limiting disease on FFR-CT",
            summary: "Persistent symptoms with non-flow-limiting findings: consider INOCA pathway when clinically suspected.",
            nextSteps,
          });
        }

        pushFlag("warning", "MISSING_FFRCT", "If 40–90% stenosis is present, indicate whether FFR-CT ≤ 0.80.");

        // Optional INOCA link (non-blocking)
        addInocaLinkIfAppropriate(inputs, nextSteps);

        return finalize(values, flags, {
          disposition: "Incomplete",
          summary: "Awaiting FFR-CT selection.",
          nextSteps,
        });
      }

      if (inputs.stenosis4090 === false) {
        values.branchesTaken.push("stenosis40_90=no");
        nextSteps.push(step("No 40–90% stenosis trigger", "FFR-CT may not be required in this branch.", null, "info"));

        addInocaLinkIfAppropriate(inputs, nextSteps);
        return finalize(values, flags, {
          disposition: "Persistent symptoms; consider INOCA when suspected",
          summary: "Persistent symptoms with nonobstructive findings: consider INOCA pathway when clinically suspected.",
          nextSteps,
        });
      }

      pushFlag("warning", "MISSING_STENOSIS", "Indicate whether 40–90% stenosis is present on CCTA.");

      // Optional INOCA link (non-blocking)
      addInocaLinkIfAppropriate(inputs, nextSteps);

      return finalize(values, flags, { disposition: "Incomplete", summary: "Awaiting stenosis selection.", nextSteps });
    }

    if (inputs.testStrategy === "stress") {
      values.branchesTaken.push("strategy=stress");
      nextSteps.unshift(step("Stress testing", "For persistent symptoms with known nonobstructive CAD.", "COR 2a", "info"));

      if (!inputs.stressResult) {
        pushFlag("warning", "MISSING_STRESS_RESULT", "Select the stress test result to continue.");

        // Optional INOCA link (non-blocking)
        addInocaLinkIfAppropriate(inputs, nextSteps);

        return finalize(values, flags, {
          disposition: "Incomplete",
          summary: "Awaiting stress test result selection.",
          nextSteps,
        });
      }

      if (inputs.stressResult === "modsev") {
        values.branchesTaken.push("stressResult=modsev");
        nextSteps.push(step("Invasive coronary angiography", "Moderate–severe ischemia suggests higher-risk disease.", "COR 1", "warning"));

        // ✅ FIX: still show INOCA pathway link (non-blocking) when clinician suspects INOCA
        addInocaLinkIfAppropriate(inputs, nextSteps);

        return finalize(values, flags, {
          disposition: "Refer for invasive coronary angiography",
          summary: "Persistent symptoms + moderate–severe ischemia → ICA (COR 1).",
          nextSteps,
        });
      }

      // None/mild or inconclusive → consider INOCA when suspected
      values.branchesTaken.push(`stressResult=${inputs.stressResult}`);
      nextSteps.push(step("No clear high-risk ischemia signal", "Consider other mechanisms for symptoms (including INOCA) when clinically suspected.", null, "info"));

      addInocaLinkIfAppropriate(inputs, nextSteps);
      return finalize(values, flags, {
        disposition: "Persistent symptoms; consider INOCA when suspected",
        summary: "If symptoms persist and testing does not explain symptoms, consider INOCA pathway when clinically suspected.",
        nextSteps,
      });
    }
  }

  pushFlag("warning", "MISSING_SYMPTOMS", "Select whether symptoms are persistent/frequent.");

  // Optional INOCA link (non-blocking)
  addInocaLinkIfAppropriate(inputs, nextSteps);

  return finalize(values, flags, { disposition: "Incomplete", summary: "Missing symptom status.", nextSteps });
}

function addInocaLinkIfAppropriate(inputs, nextSteps) {
  // Current behavior:
  // - If clinician selected "Suspected INOCA = Yes", show a stronger link
  // - Otherwise show an "INOCA (optional)" link (still non-blocking)

  if (inputs.suspectInoca === true) {
    nextSteps.push({
      label: "Consider INOCA pathway",
      detail: "Suspected INOCA selected. Open the INOCA module for decision-support on diagnostic options.",
      strength: "COR varies by diagnostic strategy; see INOCA module",
      level: "info",
      link: "/stable/modules/inoca_invasive/index.html",
    });
  } else {
    nextSteps.push({
      label: "INOCA (optional)",
      detail: "If clinical suspicion is high and symptoms persist despite nonobstructive findings, consider INOCA evaluation.",
      strength: null,
      level: "info",
      link: "/stable/modules/inoca_invasive/index.html",
    });
  }
}

function addFeasibilityGuidance(inputs, pushFlag, nextSteps) {
  const cctaLimited = inputs.layer3?.cctaAnyLimit === true;
  const stressLimited = inputs.layer3?.stressAnyLimit === true;

  if (inputs.testStrategy === "ccta_ffrct" && cctaLimited) {
    pushFlag("warning", "CCTA_LIMITED", formatNote("CCTA may be limited by patient/site factors.", inputs.layer3?.cctaNotes));
    nextSteps.push({
      label: "Suggested alternatives (non-blocking)",
      detail: "Consider stress imaging (stress echo, PET/SPECT, stress CMR) when CCTA feasibility is limited; choose based on availability and patient factors.",
      strength: null,
      level: "info",
    });
  }

  if (inputs.testStrategy === "stress" && inputs.stressModality && stressLimited) {
    pushFlag("warning", "STRESS_LIMITED", formatNote(`Selected stress modality may be limited (${prettyMod(inputs.stressModality)}).`, inputs.layer3?.stressNotes));
    nextSteps.push({
      label: "Suggested alternatives (non-blocking)",
      detail: "Consider a different stress modality or CCTA±FFR-CT if feasible; choose based on contraindications and local availability.",
      strength: null,
      level: "info",
    });
  }
}

function validate(inputs) {
  const flags = [];
  const warn = (code, message) => flags.push({ severity: "warning", code, message });

  if (inputs.persistentSymptoms === null) warn("REQ_SYMPTOMS", "Persistent/frequent symptoms selection is required.");

  if (inputs.persistentSymptoms === true) {
    if (!inputs.testStrategy) warn("REQ_STRATEGY", "Testing strategy selection is required for persistent symptoms.");
    if (inputs.testStrategy === "ccta_ffrct") {
      if (inputs.stenosis4090 === null) warn("REQ_STENOSIS", "40–90% stenosis selection is required for the CCTA branch.");
      if (inputs.stenosis4090 === true && inputs.ffrctLow === null) warn("REQ_FFRCT", "FFR-CT ≤ 0.80 selection is required when 40–90% stenosis is present.");
    }
    if (inputs.testStrategy === "stress") {
      if (!inputs.stressResult) warn("REQ_STRESS_RESULT", "Stress test result is required.");
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

  const persistentSymptoms = document.getElementById("persistentSymptoms");
  const inocaSuspectWrap = document.getElementById("inocaSuspectWrap");
  const testStrategyWrap = document.getElementById("testStrategyWrap");
  const testStrategy = document.getElementById("testStrategy");

  const cctaFeasWrap = document.getElementById("cctaFeasWrap");
  const stenosisWrap = document.getElementById("stenosisWrap");
  const ffrctWrap = document.getElementById("ffrctWrap");

  const stressModalityWrap = document.getElementById("stressModalityWrap");
  const stressModality = document.getElementById("stressModality");
  const stressFeasWrap = document.getElementById("stressFeasWrap");
  const stressAbbrevList = document.getElementById("stressAbbrevList");
  const stressResultWrap = document.getElementById("stressResultWrap");
const backBtn = document.getElementById("backBtn");
backBtn?.addEventListener("click", () => window.history.back());
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
    const ps = persistentSymptoms.value || "";
    const psYes = ps === "yes";

    setDisplay(inocaSuspectWrap, psYes);
    setDisplay(testStrategyWrap, psYes);

    const strat = testStrategy?.value || "";
    const isCcta = strat === "ccta_ffrct";
    const isStress = strat === "stress";

    // CCTA branch
    setDisplay(cctaFeasWrap, psYes && isCcta);
    setDisplay(stenosisWrap, psYes && isCcta);

    const sten = document.getElementById("stenosis4090")?.value || "";
    setDisplay(ffrctWrap, psYes && isCcta && sten === "yes");

    // Stress branch
    setDisplay(stressModalityWrap, psYes && isStress);
    setDisplay(stressFeasWrap, psYes && isStress && !!(stressModality?.value));
    setDisplay(stressResultWrap, psYes && isStress);

    setStressAbbrev(stressModality?.value || "");
  }

  persistentSymptoms.addEventListener("change", normalize);
  testStrategy?.addEventListener("change", normalize);
  stressModality?.addEventListener("change", normalize);
  document.getElementById("stenosis4090")?.addEventListener("change", normalize);

  normalize();
  setupModals();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const inputs = readInputs();
    const result = evaluateKnownNonobstructive(inputs);
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
    persistentSymptoms: yesNoToBool(get("persistentSymptoms")),
    suspectInoca: yesNoToBool(get("suspectInoca")),
    testStrategy: get("testStrategy") || null,

    stenosis4090: yesNoToBool(get("stenosis4090")),
    ffrctLow: yesNoToBool(get("ffrctLow")),

    stressModality: get("stressModality") || null,
    stressResult: get("stressResult") || null,

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
