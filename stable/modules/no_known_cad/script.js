export function evaluatePathway(inputs) {
  const values = {
    pathwayId: "stable-no-known-cad",
    version: "v1.3",
    inputSummary: { ...inputs },
    branchesTaken: [],
  };

  const flags = [];
  const nextSteps = [];

  const pushFlag = (severity, code, message) => flags.push({ severity, code, message });

  // UPDATED: allow optional "info" payload per step
  const step = (label, detail, strength = null, level = "info", info = null) => ({
    label,
    detail,
    strength,
    level,
    info,
  });

  pushFlag(
    "info",
    "SCOPE",
    "Stable chest pain + no known CAD pathway module. Outputs mirror pathway boxes; does not replace clinical judgment or local protocols."
  );

  // Layer 3 soft guidance (warnings + alternatives)
  addLayer3Guidance(inputs, pushFlag, nextSteps);

  // Validation
  const v = validateInputs(inputs);
  if (!v.ok) flags.push(...v.flags);

  if (inputs.riskCat === "low") {
    values.branchesTaken.push("riskCat=low");

    if (inputs.lowRiskChoice === "no_testing") {
      values.branchesTaken.push("lowRiskChoice=no_testing");

      // Base step
      const baseSteps = [
        step("No testing recommended", "Low risk branch.", "COR 1", "info"),
      ];

      // NEW: CAD Consortium “double-check” recommendation + hover/info modal
      const cadInfo = {
        title: "Why confirm low-risk status with contemporary PTP models?",
        bullets: [
          "Typical exertional angina is uncommon (<10%), and symptoms are often infrequent, complicating diagnostic assessment.",
          "Among symptomatic patients undergoing evaluation, the prevalence of obstructive CAD or ischemia is low (≈10%).",
          "Traditional pretest risk scores overestimate disease probability and contribute to unnecessary testing and high normal angiography rates.",
          "Contemporary pretest probability models improve identification of truly low-risk patients who may not require additional diagnostic testing.",
        ],
        link: {
          label: "Open CAD Consortium Score (QxMD)",
          url: "https://qxmd.com/calculate/calculator_287/pre-test-probability-of-cad-cad-consortium",
        },
      };

      const cadStep = step(
        "Optional confirmation (recommended)",
        "Consider using a contemporary pretest probability model (eg, CAD Consortium) to confirm low-risk status before deferring testing.",
        null,
        "info",
        cadInfo
      );

      return finalize(values, flags, {
        disposition: "No testing recommended",
        summary: "Low-risk stable chest pain: no testing recommended (COR 1).",
        nextSteps: [...baseSteps, cadStep, ...nextSteps],
      });
    }

    if (inputs.lowRiskChoice === "selected_cac_execg") {
      values.branchesTaken.push("lowRiskChoice=selected_cac_execg");

      // NEW: “selected cases” guidance, shown in Next Steps
      const guidanceSteps = [
        step(
          "CAC guidance in selected cases",
          "A CAC score of zero identifies a low-risk cohort who may not require additional diagnostic testing. Most events occur among patients with detectable CAC (eg, PROMISE). CAC-guided strategies (eg, CRESCENT-1) reduced downstream testing and were associated with fewer cardiovascular events compared with exercise testing alone.",
          null,
          "info"
        ),
        step(
          "Exercise ECG guidance in selected cases",
          "Exercise testing is an effective diagnostic strategy in low-risk symptomatic women (WOMEN trial), with similar clinical outcomes to exercise MPI and significant cost savings. Practical requirement: adequate exercise capacity and an interpretable baseline ECG.",
          null,
          "info"
        ),
      ];

      return finalize(values, flags, {
        disposition: "CAC or exercise ECG in selected cases",
        summary:
          "Low-risk stable chest pain: CAC or exercise ECG may be considered in selected cases (COR 2a).",
        nextSteps: [
          step("CAC or exercise ECG", "Selected low-risk cases.", "COR 2a", "info"),
          ...guidanceSteps,
          ...nextSteps,
        ],
      });
    }

    pushFlag(
      "warning",
      "MISSING_LOW_RISK_CHOICE",
      "Select the low-risk testing strategy to complete the pathway."
    );
    return finalize(values, flags, {
      disposition: "Incomplete",
      summary: "Missing low-risk branch selection.",
      nextSteps,
    });
  }

  if (inputs.riskCat === "intermediate_high") {
    values.branchesTaken.push("riskCat=intermediate_high");

    if (inputs.indexTest === "ccta") {
      values.branchesTaken.push("indexTest=ccta");
      nextSteps.unshift(step("CCTA", "Index anatomic testing option in intermediate/high risk.", "COR 1", "info"));

      if (!inputs.cctaResult) {
        pushFlag("warning", "MISSING_CCTA_RESULT", "Select the CCTA result to continue the pathway.");
        return finalize(values, flags, {
          disposition: "CCTA selected",
          summary: "Awaiting CCTA result selection.",
          nextSteps,
        });
      }

      if (inputs.cctaResult === "no_cad") {
        values.branchesTaken.push("cctaResult=no_cad");
        nextSteps.push(step("No CAD", "No stenosis or plaque on CCTA.", null, "info"));
        nextSteps.push(
          step(
            "Consider INOCA pathway (outpatient)",
            "Consider INOCA pathway for frequent or persistent symptoms.",
            null,
            "info"
          )
        );
        return finalize(values, flags, {
          disposition: "No CAD on CCTA",
          summary: "No CAD identified; consider outpatient INOCA evaluation if symptoms persist.",
          nextSteps,
        });
      }

      if (inputs.cctaResult === "nonobstructive_lt50") {
        values.branchesTaken.push("cctaResult=nonobstructive_lt50");

        if (inputs.stenosis4090 === true) {
          values.branchesTaken.push("stenosis4090=yes");
          nextSteps.push(
            step(
              "FFR-CT for 40–90% stenosis OR stress testing",
              "Consider add-on testing per figure.",
              "COR 2a",
              "info"
            )
          );
        } else if (inputs.stenosis4090 === false) {
          values.branchesTaken.push("stenosis4090=no");
          nextSteps.push(
            step(
              "Consider INOCA pathway (outpatient)",
              "For frequent or persistent symptoms.",
              null,
              "info"
            )
          );
        } else {
          pushFlag("warning", "MISSING_40_90", "For nonobstructive CAD, specify whether 40–90% stenosis is present.");
        }

        return finalize(values, flags, {
          disposition: "Nonobstructive CAD (<50%)",
          summary:
            "Nonobstructive CAD branch; add-on testing may be considered depending on stenosis range and symptoms.",
          nextSteps,
        });
      }

      if (inputs.cctaResult === "obstructive_ge50") {
        values.branchesTaken.push("cctaResult=obstructive_ge50");

        if (inputs.highRiskCad === true) {
          values.branchesTaken.push("highRiskCad=yes");
          nextSteps.push(step("Invasive coronary angiography", "High-risk CAD or frequent angina branch.", "COR 1", "warning"));
          return finalize(values, flags, {
            disposition: "Refer for invasive coronary angiography",
            summary: "Obstructive CAD with high-risk features/frequent angina → ICA (COR 1).",
            nextSteps,
          });
        }

        if (inputs.highRiskCad === false) {
          values.branchesTaken.push("highRiskCad=no");
          nextSteps.push(
            step(
              "Follow-up testing / intensification of GDMT",
              "Follow-up based on results and symptom burden.",
              null,
              "info"
            )
          );
          return finalize(values, flags, {
            disposition: "Obstructive CAD (≥50%)",
            summary:
              "Obstructive CAD identified; emphasize follow-up and GDMT intensification by symptoms and results.",
            nextSteps,
          });
        }

        pushFlag("warning", "MISSING_HIGH_RISK", "For obstructive CAD, indicate whether high-risk CAD or frequent angina is present.");
        return finalize(values, flags, {
          disposition: "Obstructive CAD (≥50%)",
          summary: "Awaiting high-risk CAD/frequent angina selection.",
          nextSteps,
        });
      }
    }

    if (inputs.indexTest === "stress") {
      values.branchesTaken.push("indexTest=stress");
      if (inputs.stressModality) values.branchesTaken.push(`stressModality=${inputs.stressModality}`);

      nextSteps.unshift(
        step(
          "Stress testing",
          "Stress imaging (CMR/PET/SPECT/echo) options. Exercise ECG may be used in selected cases.",
          "COR 1 (imaging); Exercise ECG COR 2a",
          "info"
        )
      );

      if (!inputs.stressResult) {
        pushFlag("warning", "MISSING_STRESS_RESULT", "Select the stress testing result to continue the pathway.");
        return finalize(values, flags, {
          disposition: "Stress testing selected",
          summary: "Awaiting stress test result selection.",
          nextSteps,
        });
      }

      if (inputs.stressResult === "mild") {
        values.branchesTaken.push("stressResult=mild");
        nextSteps.push(step("Optimize preventive therapies", "Mild ischemia branch.", "COR 1", "info"));
        nextSteps.push(step("Consider CAC", "CAC shown alongside preventive optimization.", "COR 2a", "info"));
        return finalize(values, flags, {
          disposition: "Mild ischemia",
          summary: "Mild ischemia → optimize preventive therapies; CAC may be considered per figure.",
          nextSteps,
        });
      }

      if (inputs.stressResult === "modsev") {
        values.branchesTaken.push("stressResult=modsev");
        nextSteps.push(step("Optimize preventive therapies", "Moderate–severe ischemia branch.", "COR 1", "warning"));

        if (inputs.persistentSymptoms === true) {
          values.branchesTaken.push("persistentSymptoms=yes");
          nextSteps.push(step("Invasive coronary angiography", "Persistent symptoms → ICA.", "COR 1", "warning"));
          return finalize(values, flags, {
            disposition: "Moderate–severe ischemia + persistent symptoms",
            summary: "Optimize prevention; persistent symptoms → ICA.",
            nextSteps,
          });
        }

        if (inputs.persistentSymptoms === false) {
          values.branchesTaken.push("persistentSymptoms=no");
          nextSteps.push(step("Continue preventive therapies", "No persistent symptoms branch.", "COR 1", "info"));
          return finalize(values, flags, {
            disposition: "Moderate–severe ischemia without persistent symptoms",
            summary:
              "Optimize/continue preventive therapies; ICA reserved for persistent symptoms per figure.",
            nextSteps,
          });
        }

        pushFlag("warning", "MISSING_PERSISTENT_SYMPTOMS", "For moderate–severe ischemia, indicate whether persistent symptoms are present.");
        return finalize(values, flags, {
          disposition: "Moderate–severe ischemia",
          summary: "Awaiting persistent symptoms selection.",
          nextSteps,
        });
      }

      if (inputs.stressResult === "inconclusive") {
        values.branchesTaken.push("stressResult=inconclusive");
        nextSteps.push(
          step(
            "Further evaluation after inconclusive stress test",
            "Per figure: further evaluation may include CCTA (COR 2a) and/or ICA (COR 1) depending on context.",
            null,
            "warning"
          )
        );
        return finalize(values, flags, {
          disposition: "Inconclusive stress test",
          summary: "Inconclusive stress test → further evaluation per pathway.",
          nextSteps,
        });
      }
    }

    pushFlag("warning", "MISSING_INDEX_TEST", "For intermediate/high risk, select the index test (CCTA vs stress testing).");
    return finalize(values, flags, { disposition: "Incomplete", summary: "Missing index test selection.", nextSteps });
  }

  pushFlag("warning", "MISSING_RISK", "Select the clinical risk category to start the pathway.");
  return finalize(values, flags, { disposition: "Incomplete", summary: "Missing risk category.", nextSteps });
}

function addLayer3Guidance(inputs, pushFlag, nextSteps) {
  // Soft guidance only: if user says there’s a limitation, we warn + list alternatives
  const cctaLimited = inputs.layer3?.cctaAnyLimit === true;
  const stressLimited = inputs.layer3?.stressAnyLimit === true;

  if (inputs.indexTest === "ccta" && cctaLimited) {
    pushFlag("warning", "CCTA_LIMITED", formatNote("CCTA may be limited by patient/site factors.", inputs.layer3?.cctaNotes));
    nextSteps.push({
      label: "Suggested alternatives (non-blocking)",
      detail:
        "Consider stress imaging modalities (stress echo, PET/SPECT, stress CMR) when CCTA feasibility is limited; choose based on local availability and patient factors.",
      strength: null,
      level: "info",
    });
  }

  if (inputs.indexTest === "stress" && inputs.stressModality && stressLimited) {
    const mod = inputs.stressModality;
    pushFlag("warning", "STRESS_MODALITY_LIMITED", formatNote(`Selected stress modality may be limited (${prettyMod(mod)}).`, inputs.layer3?.stressNotes));

    const alts = suggestStressAlternatives(mod);
    nextSteps.push({
      label: "Suggested alternatives (non-blocking)",
      detail: `Consider: ${alts.join(", ")}. Choose based on feasibility, contraindications, and local availability.`,
      strength: null,
      level: "info",
    });
  }
}

function suggestStressAlternatives(selected) {
  const map = {
    exercise_ecg: ["Stress echocardiography", "PET/SPECT MPI", "Stress CMR", "CCTA (if feasible)"],
    stress_echo: ["PET/SPECT MPI", "Stress CMR", "Exercise ECG (if ECG interpretable + able to exercise)", "CCTA (if feasible)"],
    stress_nuclear: ["Stress echocardiography", "Stress CMR", "Exercise ECG (selected cases)", "CCTA (if feasible)"],
    stress_cmr: ["Stress echocardiography", "PET/SPECT MPI", "Exercise ECG (selected cases)", "CCTA (if feasible)"],
  };
  return map[selected] || ["Stress echocardiography", "PET/SPECT MPI", "Stress CMR", "CCTA (if feasible)"];
}

function prettyMod(mod) {
  return mod
    .replace("exercise_ecg", "Exercise ECG")
    .replace("stress_echo", "Stress echocardiography")
    .replace("stress_nuclear", "Stress nuclear (PET/SPECT)")
    .replace("stress_cmr", "Stress CMR");
}

function formatNote(prefix, note) {
  const trimmed = (note || "").trim();
  return trimmed ? `${prefix} Note: ${trimmed}` : prefix;
}

function validateInputs(inputs) {
  const flags = [];
  const warn = (code, message) => flags.push({ severity: "warning", code, message });

  if (!inputs.riskCat) warn("REQ_RISKCAT", "Risk category is required.");

  if (inputs.riskCat === "low") {
    if (!inputs.lowRiskChoice) warn("REQ_LOWRISK_CHOICE", "Low-risk testing strategy is required.");
  }

  if (inputs.riskCat === "intermediate_high") {
    if (!inputs.indexTest) warn("REQ_INDEX_TEST", "Index test selection is required.");

    if (inputs.indexTest === "stress") {
      if (!inputs.stressResult) warn("REQ_STRESS_RESULT", "Stress testing result is required to complete branch.");
      if (inputs.stressResult === "modsev" && inputs.persistentSymptoms === null) {
        warn("REQ_PERSISTENT_SYMPTOMS", "Persistent symptoms selection is required for moderate–severe ischemia.");
      }
    }

    if (inputs.indexTest === "ccta") {
      if (!inputs.cctaResult) warn("REQ_CCTA_RESULT", "CCTA result is required to complete branch.");
      if (inputs.cctaResult === "nonobstructive_lt50" && inputs.stenosis4090 === null) {
        warn("REQ_40_90", "Specify whether 40–90% stenosis is present.");
      }
      if (inputs.cctaResult === "obstructive_ge50" && inputs.highRiskCad === null) {
        warn("REQ_HIGH_RISK_CAD", "High-risk CAD/frequent angina selection is required for obstructive CAD branch.");
      }
    }
  }

  return { ok: flags.length === 0, flags };
}

function finalize(values, flags, interpretation) {
  return { values, flags, interpretation };
}

// ------------------------------
// UI glue
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("tool-form");
  const resetBtn = document.getElementById("resetBtn");
  const resultsContainer = document.getElementById("results-container");
  const flagsContainer = document.getElementById("flags-container");

  const riskCat = document.getElementById("riskCat");
  const lowRiskChoiceWrap = document.getElementById("lowRiskChoiceWrap");
  const indexTestWrap = document.getElementById("indexTestWrap");
  const indexTest = document.getElementById("indexTest");

  const cctaLayer3Wrap = document.getElementById("cctaLayer3Wrap");

  const stressModalityWrap = document.getElementById("stressModalityWrap");
  const stressModality = document.getElementById("stressModality");
  const stressLayer3Wrap = document.getElementById("stressLayer3Wrap");
  const stressAbbrevList = document.getElementById("stressAbbrevList");

  const stressResultWrap = document.getElementById("stressResultWrap");
  const persistentSymptomsWrap = document.getElementById("persistentSymptomsWrap");

  const cctaResultWrap = document.getElementById("cctaResultWrap");
  const stenosis4090Wrap = document.getElementById("stenosis4090Wrap");
  const highRiskCadWrap = document.getElementById("highRiskCadWrap");

  const stressResult = document.getElementById("stressResult");
  const cctaResult = document.getElementById("cctaResult");

  function setDisplay(el, show) {
    if (!el) return;
    el.style.display = show ? "" : "none";
  }

  function setStressAbbrev(mod) {
    const content = {
      exercise_ecg: `
        <strong>Exercise ECG (abbrev)</strong>
        <ul>
          <li>Baseline ECG must be interpretable for ischemia</li>
          <li>Requires adequate exercise capacity (≥5 METs)</li>
          <li>Consider limitations with major arrhythmias or severe AS/HTN</li>
        </ul>`,
      stress_echo: `
        <strong>Stress echocardiography (abbrev)</strong>
        <ul>
          <li>Limited acoustic windows can reduce performance</li>
          <li>If pharmacologic stress needed, consider dobutamine limitations</li>
          <li>Major arrhythmias/unstable features may limit feasibility</li>
        </ul>`,
      stress_nuclear: `
        <strong>Stress nuclear PET/SPECT (abbrev)</strong>
        <ul>
          <li>Vasodilator contraindications (eg, significant bronchospasm) may limit</li>
          <li>Caffeine/theophylline within 12h can interfere</li>
          <li>Severe hypotension or high-risk ACS features are limiting</li>
        </ul>`,
      stress_cmr: `
        <strong>Stress CMR (abbrev)</strong>
        <ul>
          <li>MRI-unsafe devices / severe claustrophobia may limit</li>
          <li>Low GFR (&lt;30) is a common constraint</li>
          <li>Caffeine within 12h can interfere with vasodilator stress</li>
        </ul>`,
    };

    stressAbbrevList.innerHTML =
      content[mod] || `<strong>Select a stress modality</strong><p class="micro-note">Abbreviated considerations will appear here.</p>`;
  }

  function normalize() {
    const rc = riskCat.value || "";
    setDisplay(lowRiskChoiceWrap, rc === "low");
    setDisplay(indexTestWrap, rc === "intermediate_high");

    const it = indexTest?.value || "";
    setDisplay(cctaResultWrap, rc === "intermediate_high" && it === "ccta");
    setDisplay(stressResultWrap, rc === "intermediate_high" && it === "stress");

    // Layer 3 screens
    setDisplay(cctaLayer3Wrap, rc === "intermediate_high" && it === "ccta");
    setDisplay(stressModalityWrap, rc === "intermediate_high" && it === "stress");
    setDisplay(stressLayer3Wrap, rc === "intermediate_high" && it === "stress" && !!(stressModality?.value));

    const sr = stressResult.value || "";
    setDisplay(persistentSymptomsWrap, rc === "intermediate_high" && it === "stress" && sr === "modsev");

    const cr = cctaResult.value || "";
    setDisplay(stenosis4090Wrap, rc === "intermediate_high" && it === "ccta" && cr === "nonobstructive_lt50");
    setDisplay(highRiskCadWrap, rc === "intermediate_high" && it === "ccta" && cr === "obstructive_ge50");

    setStressAbbrev(stressModality?.value || "");
  }

  riskCat.addEventListener("change", normalize);
  indexTest?.addEventListener("change", normalize);
  stressModality?.addEventListener("change", normalize);
  stressResult?.addEventListener("change", normalize);
  cctaResult?.addEventListener("change", normalize);

  normalize();
  setupModals();

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const inputs = readInputs();
    const result = evaluatePathway(inputs);
    renderResults(resultsContainer, result);
    renderFlags(flagsContainer, result.flags);
  });

  resetBtn?.addEventListener("click", () => {
    form.reset();
    normalize();
    resultsContainer.innerHTML = `<p class="results-placeholder">Fill in inputs and tap “Run pathway” to see results.</p>`;
    flagsContainer.innerHTML = `<p class="results-placeholder">Warnings and suggested alternatives appear here after you run the pathway.</p>`;
  });
});

function readInputs() {
  const get = (id) => document.getElementById(id)?.value ?? "";
  const getText = (id) => (document.getElementById(id)?.value ?? "").trim();

  return {
    riskCat: get("riskCat") || null,
    lowRiskChoice: get("lowRiskChoice") || null,
    indexTest: get("indexTest") || null,

    stressModality: get("stressModality") || null,
    stressResult: get("stressResult") || null,
    persistentSymptoms: yesNoToBool(get("persistentSymptoms")),

    cctaResult: get("cctaResult") || null,
    stenosis4090: yesNoToBool(get("stenosis4090")),
    highRiskCad: yesNoToBool(get("highRiskCad")),

    layer3: {
      cctaAnyLimit: yesNoToBool(get("cctaAnyLimit")),
      cctaNotes: getText("cctaNotes"),
      stressAnyLimit: yesNoToBool(get("stressAnyLimit")),
      stressNotes: getText("stressNotes"),
    },
  };
}

function yesNoToBool(v) {
  if (!v) return null;
  if (v === "yes") return true;
  if (v === "no") return false;
  return null;
}

// Modal system (existing)
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

// NEW: dynamic info modal for Next Steps
function openInfoModal(info) {
  const backdrop = document.getElementById("modal-backdrop");
  if (!backdrop) return;

  // Create or reuse a dynamic modal container
  let modal = document.getElementById("modal-dynamic-info");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "modal-dynamic-info";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3 id="modal-dynamic-title">Info</h3>
          <button class="modal-close" id="modal-dynamic-close">×</button>
        </div>
        <div class="modal-body" id="modal-dynamic-body"></div>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector("#modal-dynamic-close");
    closeBtn.addEventListener("click", () => closeDynamicModal());

    backdrop.addEventListener("click", () => closeDynamicModal());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDynamicModal();
    });
  }

  const titleEl = modal.querySelector("#modal-dynamic-title");
  const bodyEl = modal.querySelector("#modal-dynamic-body");

  titleEl.textContent = info?.title || "Info";

  const bullets = Array.isArray(info?.bullets) ? info.bullets : [];
  const link = info?.link;

  const bulletHtml = bullets.length
    ? `<ul>${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`
    : "";

  const linkHtml =
    link?.url && link?.label
      ? `<div style="margin-top:0.6rem;">
           <a class="link-btn" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
             ${escapeHtml(link.label)}
           </a>
         </div>`
      : "";

  bodyEl.innerHTML = `${bulletHtml}${linkHtml}`;

  // open
  modal.classList.add("is-open");
  backdrop.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  backdrop.setAttribute("aria-hidden", "false");
}

function closeDynamicModal() {
  const backdrop = document.getElementById("modal-backdrop");
  const modal = document.getElementById("modal-dynamic-info");
  if (!modal || !backdrop) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  backdrop.classList.remove("is-open");
  backdrop.setAttribute("aria-hidden", "true");
}

// Rendering
function renderResults(container, result) {
  if (!container) return;

  const disp = result?.interpretation?.disposition ?? "—";
  const summary = result?.interpretation?.summary ?? "";
  const branches = (result?.values?.branchesTaken || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("");

  const steps = (result?.interpretation?.nextSteps || [])
    .map((s, idx) => {
      const strength = s.strength
        ? `<div style="color: var(--color-text-secondary); margin-top: 0.15rem;">${escapeHtml(s.strength)}</div>`
        : "";

      // NEW: info icon if step.info exists
      const infoBtn = s.info
        ? `<span class="info-chip info-chip--inline" data-stepinfo="${idx}" title="More info">i</span>`
        : "";

      return `
        <div style="margin:0.6rem 0; padding-top:0.4rem; border-top:1px solid rgba(255,255,255,0.06);">
          <div><strong>${escapeHtml(s.label)}</strong> ${infoBtn}</div>
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

      <hr class="hr" />

      <div>
        <div style="color: var(--color-text-secondary); font-size: 0.9rem;">Branch trace</div>
        ${
          branches
            ? `<ul style="margin: 0.35rem 0 0; padding-left: 1.1rem;">${branches}</ul>`
            : `<p class="results-placeholder">No branches recorded yet.</p>`
        }
      </div>
    </div>
  `;

  // NEW: wire up info buttons to dynamic modal
  const allSteps = result?.interpretation?.nextSteps || [];
  container.querySelectorAll("[data-stepinfo]").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = Number(el.getAttribute("data-stepinfo"));
      const info = allSteps[idx]?.info;
      if (info) openInfoModal(info);
    });
  });
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
