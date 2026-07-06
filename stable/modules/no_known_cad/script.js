import { recommendStableNoKnownCad } from "../../spear-engine.js";

export function evaluatePathway(inputs) {
  const values = {
    pathwayId: "stable-no-known-cad",
    version: "v1.4-spear",
    inputSummary: { ...inputs },
    branchesTaken: [],
  };

  const flags = [];
  const nextSteps = [];
  const pushFlag = (severity, code, message) => flags.push({ severity, code, message });

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

  addLayer3Guidance(inputs, pushFlag, nextSteps);

  const v = validateInputs(inputs);
  if (!v.ok) flags.push(...v.flags);

  if (inputs.riskCat === "low") {
    values.branchesTaken.push("riskCat=low");

    if (inputs.lowRiskChoice === "no_testing") {
      values.branchesTaken.push("lowRiskChoice=no_testing");
      return finalize(values, flags, {
        disposition: "No testing recommended",
        summary: "Low-risk stable chest pain: no testing recommended (COR 1).",
        nextSteps: [
          step("No testing recommended", "Low-risk stable chest pain branch.", "COR 1", "info"),
          ...nextSteps,
        ],
      });
    }

    if (inputs.lowRiskChoice === "selected_cac_execg") {
      values.branchesTaken.push("lowRiskChoice=selected_cac_execg");
      return finalize(values, flags, {
        disposition: "CAC or exercise ECG in selected cases",
        summary: "Low-risk stable chest pain: CAC or exercise ECG may be considered in selected cases (COR 2a).",
        nextSteps: [
          step("CAC or exercise ECG", "Selected low-risk cases.", "COR 2a", "info"),
          ...nextSteps,
        ],
      });
    }

    pushFlag("warning", "MISSING_LOW_RISK_CHOICE", "Apply a low-risk recommendation before running the pathway.");
    return finalize(values, flags, {
      disposition: "Incomplete",
      summary: "Missing low-risk recommendation selection.",
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
        nextSteps.push(step("Consider INOCA pathway", "Consider INOCA pathway for frequent or persistent symptoms.", null, "info"));
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
          nextSteps.push(step("FFR-CT for 40–90% stenosis OR stress testing", "Consider add-on testing per figure.", "COR 2a", "info"));
        } else if (inputs.stenosis4090 === false) {
          values.branchesTaken.push("stenosis4090=no");
          nextSteps.push(step("Consider INOCA pathway", "For frequent or persistent symptoms.", null, "info"));
        } else {
          pushFlag("warning", "MISSING_40_90", "For nonobstructive CAD, specify whether 40–90% stenosis is present.");
        }

        return finalize(values, flags, {
          disposition: "Nonobstructive CAD (<50%)",
          summary: "Nonobstructive CAD branch; add-on testing may be considered depending on stenosis range and symptoms.",
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
          nextSteps.push(step("Follow-up testing / intensification of GDMT", "Follow-up based on results and symptom burden.", null, "info"));
          return finalize(values, flags, {
            disposition: "Obstructive CAD (≥50%)",
            summary: "Obstructive CAD identified; emphasize follow-up and GDMT intensification by symptoms and results.",
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
          "Stress imaging options. Exercise ECG may be used in selected cases.",
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
          summary: "Mild ischemia → optimize preventive therapies; CAC may be considered.",
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
            summary: "Optimize/continue preventive therapies; ICA reserved for persistent symptoms per figure.",
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
        nextSteps.push(step("Further evaluation after inconclusive stress test", "Further evaluation may include CCTA and/or ICA depending on context.", null, "warning"));
        return finalize(values, flags, {
          disposition: "Inconclusive stress test",
          summary: "Inconclusive stress test → further evaluation per pathway.",
          nextSteps,
        });
      }
    }

    pushFlag("warning", "MISSING_SPEAR_APPLICATION", "Apply one SPEAR recommendation before running the pathway.");
    return finalize(values, flags, {
      disposition: "Incomplete",
      summary: "Apply a SPEAR recommendation to continue.",
      nextSteps,
    });
  }

  pushFlag("warning", "MISSING_RISK", "Select the clinical risk category to start the pathway.");
  return finalize(values, flags, { disposition: "Incomplete", summary: "Missing risk category.", nextSteps });
}

function addLayer3Guidance(inputs, pushFlag, nextSteps) {
  const cctaLimited = inputs.layer3?.cctaAnyLimit === true;
  const stressLimited = inputs.layer3?.stressAnyLimit === true;

  if (inputs.indexTest === "ccta" && cctaLimited) {
    pushFlag("warning", "CCTA_LIMITED", formatNote("CCTA may be limited by patient/site factors.", inputs.layer3?.cctaNotes));
    nextSteps.push({
      label: "Suggested alternatives",
      detail: "Consider stress imaging when CCTA feasibility is limited; choose based on local availability and patient factors.",
      strength: null,
      level: "info",
    });
  }

  if (inputs.indexTest === "stress" && inputs.stressModality && stressLimited) {
    pushFlag("warning", "STRESS_MODALITY_LIMITED", formatNote(`Selected stress modality may be limited (${prettyMod(inputs.stressModality)}).`, inputs.layer3?.stressNotes));
    nextSteps.push({
      label: "Suggested alternatives",
      detail: "Consider another stress modality or CCTA if feasible.",
      strength: null,
      level: "info",
    });
  }
}

function validateInputs(inputs) {
  const flags = [];
  const warn = (code, message) => flags.push({ severity: "warning", code, message });

  if (!inputs.riskCat) warn("REQ_RISKCAT", "Risk category is required.");

  if (inputs.riskCat === "low") {
    if (!inputs.lowRiskChoice) warn("REQ_LOWRISK_CHOICE", "Apply a low-risk recommendation before running the pathway.");
  }

  if (inputs.riskCat === "intermediate_high") {
    if (!inputs.indexTest) warn("REQ_INDEX_TEST", "Apply a SPEAR recommendation before running the pathway.");

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

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("tool-form");
  const resetBtn = document.getElementById("resetBtn");
  const resultsContainer = document.getElementById("results-container");
  const flagsContainer = document.getElementById("flags-container");

  const riskCat = document.getElementById("riskCat");

  const lowRiskRecommendationWrap = document.getElementById("lowRiskRecommendationWrap");
  const spearRecommenderWrap = document.getElementById("spearRecommenderWrap");

  const applyNoTesting = document.getElementById("applyNoTesting");
  const applyLowRiskSelected = document.getElementById("applyLowRiskSelected");

  const lowRiskChoice = document.getElementById("lowRiskChoice");
  const indexTest = document.getElementById("indexTest");

  const cctaLayer3Wrap = document.getElementById("cctaLayer3Wrap");
  const cctaResultWrap = document.getElementById("cctaResultWrap");
  const cctaResult = document.getElementById("cctaResult");
  const stenosis4090Wrap = document.getElementById("stenosis4090Wrap");
  const highRiskCadWrap = document.getElementById("highRiskCadWrap");

  const stressModalityWrap = document.getElementById("stressModalityWrap");
  const stressModality = document.getElementById("stressModality");
  const stressLayer3Wrap = document.getElementById("stressLayer3Wrap");
  const stressAbbrevList = document.getElementById("stressAbbrevList");
  const stressResultWrap = document.getElementById("stressResultWrap");
  const stressResult = document.getElementById("stressResult");
  const persistentSymptomsWrap = document.getElementById("persistentSymptomsWrap");

  const rec = {
    canExercise: document.getElementById("rec_canExercise"),
    ecgWrap: document.getElementById("rec_ecgWrap"),
    ecg: document.getElementById("rec_ecgInterpretable"),
    renalWrap: document.getElementById("rec_renalWrap"),
    renal: document.getElementById("rec_renalConcern"),
    output: document.getElementById("rec_output"),
  };

  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", () => window.history.back());

  function setDisplay(el, show) {
    if (!el) return;
    el.style.display = show ? "" : "none";
  }

  function v(el) {
    return el?.value || "";
  }

  function clearSpearInputs() {
    if (rec.canExercise) rec.canExercise.value = "";
    if (rec.ecg) rec.ecg.value = "";
    if (rec.renal) rec.renal.value = "";
    if (rec.output) {
      rec.output.innerHTML = `
        <strong>Ranked recommendations</strong>
        <p class="micro-note">Answer the first question to generate recommendations.</p>
      `;
    }
  }

  function clearAppliedSelections() {
    if (lowRiskChoice) lowRiskChoice.value = "";
    if (indexTest) indexTest.value = "";
    if (stressModality) stressModality.value = "";
    if (cctaResult) cctaResult.value = "";
    if (stressResult) stressResult.value = "";
  }

  function normalize() {
    const rc = riskCat?.value || "";
    const it = indexTest?.value || "";

    setDisplay(lowRiskRecommendationWrap, rc === "low");
    setDisplay(spearRecommenderWrap, rc === "intermediate_high");

    setDisplay(cctaResultWrap, rc === "intermediate_high" && it === "ccta");
    setDisplay(cctaLayer3Wrap, rc === "intermediate_high" && it === "ccta");

    setDisplay(stressResultWrap, rc === "intermediate_high" && it === "stress");
    setDisplay(stressModalityWrap, rc === "intermediate_high" && it === "stress");
    setDisplay(stressLayer3Wrap, rc === "intermediate_high" && it === "stress" && !!(stressModality?.value));

    const sr = stressResult?.value || "";
    setDisplay(persistentSymptomsWrap, rc === "intermediate_high" && it === "stress" && sr === "modsev");

    const cr = cctaResult?.value || "";
    setDisplay(stenosis4090Wrap, rc === "intermediate_high" && it === "ccta" && cr === "nonobstructive_lt50");
    setDisplay(highRiskCadWrap, rc === "intermediate_high" && it === "ccta" && cr === "obstructive_ge50");

    setStressAbbrev(stressModality?.value || "");
  }

  function setStressAbbrev(mod) {
    if (!stressAbbrevList) return;

    const content = {
      exercise_ecg: `
        <strong>Exercise ECG</strong>
        <ul>
          <li>Baseline ECG must be interpretable for ischemia</li>
          <li>Requires adequate exercise capacity</li>
        </ul>`,
      stress_echo: `
        <strong>Stress echocardiography</strong>
        <ul>
          <li>Limited acoustic windows can reduce performance</li>
          <li>Useful when structural/valvular information is helpful</li>
        </ul>`,
      stress_nuclear: `
        <strong>Stress nuclear PET/SPECT</strong>
        <ul>
          <li>Vasodilator contraindications may limit use</li>
          <li>PET preferred over SPECT when available in selected cases</li>
        </ul>`,
      stress_cmr: `
        <strong>Stress CMR</strong>
        <ul>
          <li>MRI-unsafe devices or severe claustrophobia may limit use</li>
          <li>No ionizing radiation</li>
        </ul>`,
    };

    stressAbbrevList.innerHTML =
      content[mod] || `<strong>Abbreviated considerations will appear after selecting a modality.</strong>`;
  }

  function readSpearInputs() {
    return {
      canExercise: v(rec.canExercise),
      ecgInterpretable: v(rec.ecg),
      renalConcern: v(rec.renal),
    };
  }

  function applyRecommendation(apply) {
    if (!apply) return;

    if (apply.riskCat && riskCat) riskCat.value = apply.riskCat;
    if (apply.lowRiskChoice && lowRiskChoice) lowRiskChoice.value = apply.lowRiskChoice;
    if (apply.indexTest && indexTest) indexTest.value = apply.indexTest;
    if (apply.stressModality && stressModality) stressModality.value = apply.stressModality;

    normalize();

    if (resultsContainer) {
      resultsContainer.innerHTML = `<p class="results-placeholder">Recommendation applied. Complete downstream fields and tap “Run pathway.”</p>`;
    }
  }

  function renderRecommendationCard(test) {
    const why = (test.why || []).slice(0, 5).map((x) => `<li>${escapeHtml(x)}</li>`).join("");
    const evidence = (test.evidence || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("");

    return `
      <div class="callout" style="margin-top:0.75rem;">
        <strong>${escapeHtml(test.category)}</strong>
        <div style="font-size:1.05rem; margin-top:0.25rem;">
          <strong>${escapeHtml(test.stars || "")} ${escapeHtml(test.label)}<sup>${escapeHtml(test.confidence)}</sup></strong>
        </div>

        <details style="margin-top:0.45rem;">
          <summary><strong>Why?</strong></summary>
          <ul style="margin:0.35rem 0 0; padding-left:1.15rem;">${why}</ul>
        </details>

        <details style="margin-top:0.45rem;">
          <summary><strong>How?</strong></summary>
          <p class="micro-note" style="margin-top:0.35rem;">${escapeHtml(test.how || "")}</p>
        </details>

        <details style="margin-top:0.45rem;">
          <summary><strong>Evidence?</strong></summary>
          <ul style="margin:0.35rem 0 0; padding-left:1.15rem;">${evidence}</ul>
        </details>

        <button type="button" class="btn-primary btn-primary--full" style="margin-top:0.75rem;" data-apply="${escapeHtml(test.key)}">
          Apply ${escapeHtml(test.label)}
        </button>
      </div>
    `;
  }

  function renderSpear() {
    const canEx = v(rec.canExercise);

    setDisplay(rec.ecgWrap, canEx === "yes");

    const ecgNeeded = canEx === "yes";
    const ecgAns = v(rec.ecg);

    const readyForRenal = !!canEx && (!ecgNeeded || !!ecgAns);
    setDisplay(rec.renalWrap, readyForRenal);

    const renalAns = v(rec.renal);
    const gateOk = !!canEx && (!ecgNeeded || !!ecgAns) && !!renalAns;

    if (!rec.output) return;

    if (!canEx) {
      rec.output.innerHTML = `
        <strong>Ranked recommendations</strong>
        <p class="micro-note">Answer the first question to generate recommendations.</p>
      `;
      return;
    }

    if (!gateOk) {
      rec.output.innerHTML = `
        <strong>Ranked recommendations</strong>
        <p class="micro-note">Answer the displayed prompts to generate recommendations.</p>
      `;
      return;
    }

    const result = recommendStableNoKnownCad(readSpearInputs());

    rec.output.innerHTML = `
      <strong>Ranked recommendations</strong>
      <p class="micro-note">
        Internal scores are not shown. A = high confidence, B = moderate confidence, C = lower certainty / feasibility-driven.
      </p>
      ${result.rankedTests.map(renderRecommendationCard).join("")}
    `;

    rec.output.querySelectorAll("[data-apply]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-apply");
        const test = result.rankedTests.find((x) => x.key === key);
        if (test) applyRecommendation(test.apply);
      });
    });
  }

  applyNoTesting?.addEventListener("click", () => {
    applyRecommendation({ riskCat: "low", lowRiskChoice: "no_testing" });
  });

  applyLowRiskSelected?.addEventListener("click", () => {
    applyRecommendation({ riskCat: "low", lowRiskChoice: "selected_cac_execg" });
  });

  riskCat?.addEventListener("change", () => {
    clearAppliedSelections();
    clearSpearInputs();
    normalize();
    renderSpear();

    if (resultsContainer) {
      resultsContainer.innerHTML = `<p class="results-placeholder">Fill in inputs and tap “Run pathway” to see results.</p>`;
    }
    if (flagsContainer) {
      flagsContainer.innerHTML = `<p class="results-placeholder">Warnings and suggested alternatives appear here after you run the pathway.</p>`;
    }
  });

  [rec.canExercise, rec.ecg, rec.renal].forEach((el) => {
    if (!el) return;
    el.addEventListener("change", renderSpear);
  });

  [stressModality, stressResult, cctaResult].forEach((el) => {
    if (!el) return;
    el.addEventListener("change", normalize);
  });

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
    clearSpearInputs();
    normalize();
    renderSpear();
    if (resultsContainer) resultsContainer.innerHTML = `<p class="results-placeholder">Fill in inputs and tap “Run pathway” to see results.</p>`;
    if (flagsContainer) flagsContainer.innerHTML = `<p class="results-placeholder">Warnings and suggested alternatives appear here after you run the pathway.</p>`;
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

function setupModals() {
  const backdrop = document.getElementById("modal-backdrop");
  const triggers = document.querySelectorAll("[data-modal]");
  const closeBtns = document.querySelectorAll("[data-close='true']");

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("is-open");
    backdrop?.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    backdrop?.setAttribute("aria-hidden", "false");
  }

  function closeAll() {
    document.querySelectorAll(".modal.is-open").forEach((m) => {
      m.classList.remove("is-open");
      m.setAttribute("aria-hidden", "true");
    });
    backdrop?.classList.remove("is-open");
    backdrop?.setAttribute("aria-hidden", "true");
  }

  triggers.forEach((t) => t.addEventListener("click", () => openModal(t.getAttribute("data-modal"))));
  closeBtns.forEach((b) => b.addEventListener("click", closeAll));
  backdrop?.addEventListener("click", closeAll);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });
}

function renderResults(container, result) {
  if (!container) return;

  const disp = result?.interpretation?.disposition ?? "—";
  const summary = result?.interpretation?.summary ?? "";
  const branches = (result?.values?.branchesTaken || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("");

  const steps = (result?.interpretation?.nextSteps || [])
    .map((s) => {
      const strength = s.strength
        ? `<div style="color: var(--color-text-secondary); margin-top: 0.15rem;">${escapeHtml(s.strength)}</div>`
        : "";

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

function yesNoToBool(v) {
  if (!v) return null;
  if (v === "yes") return true;
  if (v === "no") return false;
  return null;
}

function prettyMod(mod) {
  const map = {
    exercise_ecg: "Exercise ECG",
    stress_echo: "Stress echocardiography",
    stress_nuclear: "Stress nuclear PET/SPECT",
    stress_cmr: "Stress CMR",
  };
  return map[mod] || mod || "Stress";
}

function formatNote(prefix, note) {
  const trimmed = (note || "").trim();
  return trimmed ? `${prefix} Note: ${trimmed}` : prefix;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[m];
  });
}
