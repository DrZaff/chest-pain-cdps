import { recommendStableNoKnownCad } from "../../spear-engine.js";

// =========================================================
// SPEAR reusable tap-card controller
// =========================================================
document.addEventListener("click", (event) => {
  const button = event.target.closest(".choice-card");
  if (!button) return;

  const group = button.closest("[data-choice-group]");
  if (!group) return;

  const inputId = group.dataset.choiceGroup;
  const hiddenInput = document.getElementById(inputId);

  if (!hiddenInput) {
    console.warn(`SPEAR could not find hidden input: ${inputId}`);
    return;
  }

  const buttons = group.querySelectorAll(".choice-card");

  // Store selected clinical value
  hiddenInput.value = button.dataset.value || "";

  // Update appearance
  buttons.forEach((btn) => {
    const selected = btn === button;

    btn.classList.toggle("is-selected", selected);
    btn.setAttribute(
      "aria-pressed",
      selected ? "true" : "false"
    );
  });

  // Tell the rest of SPEAR that this value changed
  hiddenInput.dispatchEvent(
    new Event("change", { bubbles: true })
  );
});

export function evaluatePathway(inputs) {
  const values = {
    pathwayId: "stable-no-known-cad",
    version: "v1.5-spear-ui",
    inputSummary: { ...inputs },
    branchesTaken: [],
  };

  const flags = [];
  const nextSteps = [];
  const pushFlag = (severity, code, message) => flags.push({ severity, code, message });

  const step = (label, detail, strength = null, level = "info") => ({
    label,
    detail,
    strength,
    level,
  });

  pushFlag("info", "SCOPE", "Stable chest pain + no known CAD. Decision-support only.");

  const v = validateInputs(inputs);
  if (!v.ok) flags.push(...v.flags);

  if (inputs.riskCat === "low") {
    values.branchesTaken.push("riskCat=low");

    if (inputs.lowRiskChoice === "no_testing") {
      values.branchesTaken.push("lowRiskChoice=no_testing");
      return finalize(values, flags, {
        disposition: "No testing recommended",
        summary: "Low-risk stable chest pain: no testing recommended (COR 1).",
        nextSteps: [step("No testing recommended", "Low-risk branch.", "COR 1", "info")],
      });
    }

    if (inputs.lowRiskChoice === "selected_cac_execg") {
      values.branchesTaken.push("lowRiskChoice=selected_cac_execg");
      return finalize(values, flags, {
        disposition: "CAC or exercise ECG in selected cases",
        summary: "Low-risk stable chest pain: CAC or exercise ECG may be considered in selected cases (COR 2a).",
        nextSteps: [step("CAC or exercise ECG", "Selected low-risk cases.", "COR 2a", "info")],
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
        pushFlag("warning", "MISSING_CCTA_RESULT", "Select the CCTA result to continue.");
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
          nextSteps.push(step("FFR-CT for 40–90% stenosis OR stress testing", "Consider add-on testing per pathway.", "COR 2a", "info"));
        } else if (inputs.stenosis4090 === false) {
          values.branchesTaken.push("stenosis4090=no");
          nextSteps.push(step("Consider INOCA pathway", "For frequent or persistent symptoms.", null, "info"));
        } else {
          pushFlag("warning", "MISSING_40_90", "Specify whether 40–90% stenosis is present.");
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

        pushFlag("warning", "MISSING_HIGH_RISK", "Indicate whether high-risk CAD or frequent angina is present.");
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
        pushFlag("warning", "MISSING_STRESS_RESULT", "Select the stress testing result to continue.");
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
            summary: "Optimize/continue preventive therapies; ICA reserved for persistent symptoms per pathway.",
            nextSteps,
          });
        }

        pushFlag("warning", "MISSING_PERSISTENT_SYMPTOMS", "Indicate whether persistent symptoms are present.");
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

  pushFlag("warning", "MISSING_RISK", "Select the clinical risk category to start.");
  return finalize(values, flags, { disposition: "Incomplete", summary: "Missing risk category.", nextSteps });
}

function validateInputs(inputs) {
  const flags = [];
  const warn = (code, message) => flags.push({ severity: "warning", code, message });

  if (!inputs.riskCat) warn("REQ_RISKCAT", "Risk category is required.");

  if (inputs.riskCat === "low" && !inputs.lowRiskChoice) {
    warn("REQ_LOWRISK_CHOICE", "Apply a low-risk recommendation before running the pathway.");
  }

  if (inputs.riskCat === "intermediate_high") {
    if (!inputs.indexTest) warn("REQ_INDEX_TEST", "Apply a SPEAR recommendation before running the pathway.");

    if (inputs.indexTest === "stress") {
      if (!inputs.stressResult) warn("REQ_STRESS_RESULT", "Stress testing result is required.");
      if (inputs.stressResult === "modsev" && inputs.persistentSymptoms === null) {
        warn("REQ_PERSISTENT_SYMPTOMS", "Persistent symptoms selection is required.");
      }
    }

    if (inputs.indexTest === "ccta") {
      if (!inputs.cctaResult) warn("REQ_CCTA_RESULT", "CCTA result is required.");
      if (inputs.cctaResult === "nonobstructive_lt50" && inputs.stenosis4090 === null) {
        warn("REQ_40_90", "Specify whether 40–90% stenosis is present.");
      }
      if (inputs.cctaResult === "obstructive_ge50" && inputs.highRiskCad === null) {
        warn("REQ_HIGH_RISK_CAD", "High-risk CAD/frequent angina selection is required.");
      }
    }
  }

  return { ok: flags.length === 0, flags };
}

function finalize(values, flags, interpretation) {
  return { values, flags, interpretation };
}

document.addEventListener("DOMContentLoaded", () => {
  const pages = Array.from(document.querySelectorAll(".flow-page"));
  const stepLabel = document.getElementById("stepLabel");
  const pageTitleMini = document.getElementById("pageTitleMini");
  const progressBar = document.getElementById("progressBar");

  const form = document.getElementById("tool-form");
  const riskCat = document.getElementById("riskCat");

  const riskLowCard = document.getElementById("riskLowCard");
const riskIntermediateCard = document.getElementById("riskIntermediateCard");

function selectRiskCard(value) {
  if (!riskCat) return;

  riskCat.value = value;

  const isLow = value === "low";
  const isIntermediate = value === "intermediate_high";

  riskLowCard?.classList.toggle("is-selected", isLow);
  riskIntermediateCard?.classList.toggle("is-selected", isIntermediate);

  riskLowCard?.setAttribute(
    "aria-pressed",
    isLow ? "true" : "false"
  );

  riskIntermediateCard?.setAttribute(
    "aria-pressed",
    isIntermediate ? "true" : "false"
  );
}

riskLowCard?.addEventListener("click", () => {
  selectRiskCard("low");
  go("low");
});

riskIntermediateCard?.addEventListener("click", () => {
  selectRiskCard("intermediate_high");
  go("spear");
});

  const lowRiskChoice = document.getElementById("lowRiskChoice");
  const indexTest = document.getElementById("indexTest");
  const stressModality = document.getElementById("stressModality");

  const recCanExercise = document.getElementById("rec_canExercise");
  const recEcgWrap = document.getElementById("rec_ecgWrap");
  const recEcg = document.getElementById("rec_ecgInterpretable");
  const recRenalWrap = document.getElementById("rec_renalWrap");
  const recRenal = document.getElementById("rec_renalConcern");
  const generateSpearBtn = document.getElementById("generateSpearBtn");
  const rankedCards = document.getElementById("rankedCards");

[recCanExercise, recEcg, recRenal].forEach((el) => {
  if (!el) return;
  el.addEventListener("change", updatePromptVisibility);
});

  const appliedSummary = document.getElementById("appliedSummary");
  const downstreamTitle = document.getElementById("downstreamTitle");

  const cctaFields = document.getElementById("cctaFields");
  const cctaResult = document.getElementById("cctaResult");
  const stenosis4090Wrap = document.getElementById("stenosis4090Wrap");
  const highRiskCadWrap = document.getElementById("highRiskCadWrap");

  const stressFields = document.getElementById("stressFields");
  const stressResult = document.getElementById("stressResult");
  const persistentSymptomsWrap = document.getElementById("persistentSymptomsWrap");

  const resultsContainer = document.getElementById("results-container");
  const flagsContainer = document.getElementById("flags-container");
  const backBtn = document.getElementById("backBtn");
  const startOverBtn = document.getElementById("startOverBtn");

  let page = "risk";
  let historyStack = [];
  let lastSpearResult = null;

  const pageMeta = {
    risk: { step: 1, title: "Risk" },
    low: { step: 2, title: "Low risk" },
    spear: { step: 2, title: "SPEAR" },
    ranked: { step: 3, title: "Ranked" },
    downstream: { step: 4, title: "Pathway" },
    results: { step: 5, title: "Results" },
  };

  function go(nextPage, push = true) {
    if (push && nextPage !== page) historyStack.push(page);
    page = nextPage;

    pages.forEach((p) => p.classList.toggle("active", p.dataset.page === page));

    const meta = pageMeta[page] || pageMeta.risk;
    stepLabel.textContent = `Step ${meta.step} of 5`;
    pageTitleMini.textContent = meta.title;
    progressBar.style.width = `${meta.step * 20}%`;

    backBtn.style.visibility = page === "risk" ? "hidden" : "visible";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function backOne() {
    if (!historyStack.length) {
      go("risk", false);
      return;
    }
    go(historyStack.pop(), false);
  }
  
  function resetChoiceCards() {
  document.querySelectorAll(".choice-card").forEach((button) => {
    button.classList.remove("is-selected");
    button.setAttribute("aria-pressed", "false");
  });

  document.querySelectorAll("[data-choice-group]").forEach((group) => {
    const input = document.getElementById(group.dataset.choiceGroup);
    if (input) input.value = "";
  });
}

  function resetAll() {
    form.reset();
    resetChoiceCards();
    historyStack = [];
    lastSpearResult = null;
    rankedCards.innerHTML = "";
    appliedSummary.innerHTML = "";
    resultsContainer.innerHTML = `<p class="results-placeholder">Results will appear here.</p>`;
    flagsContainer.innerHTML = "";
    updatePromptVisibility();
    updateDownstreamVisibility();
    go("risk", false);
  }

function maybeAutoRunPathway() {
  const rc = riskCat?.value || "";
  const it = indexTest?.value || "";

  // We are only auto-running the intermediate/high pathway for now.
  if (rc !== "intermediate_high") return;

  // -------------------------
  // CCTA branch
  // -------------------------
  if (it === "ccta") {
    const cr = cctaResult?.value || "";

    if (!cr) return;

    // No CAD: result is complete immediately
    if (cr === "no_cad") {
      submitCompletedPathway();
      return;
    }

    // Nonobstructive CAD requires stenosis question
    if (cr === "nonobstructive_lt50") {
      const stenosis =
        document.getElementById("stenosis4090")?.value || "";

      if (!stenosis) return;

      submitCompletedPathway();
      return;
    }

    // Obstructive CAD requires high-risk/frequent-angina question
    if (cr === "obstructive_ge50") {
      const highRisk =
        document.getElementById("highRiskCad")?.value || "";

      if (!highRisk) return;

      submitCompletedPathway();
      return;
    }
  }

  // -------------------------
  // Stress branch
  // -------------------------
  if (it === "stress") {
    const sr = stressResult?.value || "";

    if (!sr) return;

    // These outcomes require no additional question
    if (sr === "mild" || sr === "inconclusive") {
      submitCompletedPathway();
      return;
    }

    // Moderate/severe ischemia requires symptom question
    if (sr === "modsev") {
      const persistent =
        document.getElementById("persistentSymptoms")?.value || "";

      if (!persistent) return;

      submitCompletedPathway();
    }
  }
}

  function submitCompletedPathway() {
  // Let the user's final selection visibly register,
  // then use the EXISTING form submit pathway.
  setTimeout(() => {
    if (form) {
      form.requestSubmit();
    }
  }, 180);
}

function updatePromptVisibility() {
  const canExercise = recCanExercise?.value || "";
  const ecgAnswer = recEcg?.value || "";
  const renalAnswer = recRenal?.value || "";

  // Show ECG question only if patient can exercise
  if (recEcgWrap) {
    recEcgWrap.style.display =
      canExercise === "yes" ? "" : "none";
  }

  const ecgRequired = canExercise === "yes";
  const ecgComplete = !ecgRequired || !!ecgAnswer;

  // Show renal/contrast question after required prior answers
  if (recRenalWrap) {
    recRenalWrap.style.display =
      canExercise && ecgComplete ? "" : "none";
  }

  const ready =
    !!canExercise &&
    ecgComplete &&
    !!renalAnswer;

  if (!ready) return;

  // Automatically generate ranked recommendations
  lastSpearResult = recommendStableNoKnownCad(readSpearInputs());

  if (rankedCards) {
    rankedCards.innerHTML =
      lastSpearResult.rankedTests
        .map(renderRecommendationCard)
        .join("");

    rankedCards
      .querySelectorAll("[data-apply]")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const key = btn.getAttribute("data-apply");
          const test =
            lastSpearResult.rankedTests.find((t) => t.key === key);

          if (test) {
            applyRecommendation(test.apply, test.label);
          }
        });
      });
  }

  // Short delay so the last tap visually registers
  setTimeout(() => {
    go("ranked");
  }, 180);
}

function readSpearInputs() {
  return {
    canExercise: recCanExercise?.value || "",
    ecgInterpretable: recEcg?.value || "",
    renalConcern: recRenal?.value || "",
  };
}

function renderRecommendationCard(test) {
  const why = (test.why || [])
    .slice(0, 5)
    .map((x) => `<li>${escapeHtml(x)}</li>`)
    .join("");

  const evidence = (test.evidence || [])
    .map((x) => `<li>${escapeHtml(x)}</li>`)
    .join("");

  const cardClass =
    test.category === "Primary Test"
      ? "recommendation-card primary"
      : test.category === "Acceptable Alternative"
      ? "recommendation-card gold"
      : "recommendation-card";

  return `
    <div class="${cardClass}">
      <p class="rank">${escapeHtml(test.category)}</p>

      <h3>
        ${escapeHtml(test.label)}
        <sup>${escapeHtml(test.confidence)}</sup>
      </h3>

      <details>
        <summary>Why?</summary>
        <ul>${why}</ul>
      </details>

      <details>
        <summary>How?</summary>
        <p>${escapeHtml(test.how || "")}</p>
      </details>

      <details>
        <summary>Evidence?</summary>
        <ul>${evidence}</ul>
      </details>

      <button
        type="button"
        class="btn btn-primary btn-full"
        data-apply="${escapeHtml(test.key)}"
      >
        Apply ${escapeHtml(test.label)}
      </button>
    </div>
  `;
}
function applyRecommendation(apply, label) {
  if (!apply) return;

  if (apply.riskCat) riskCat.value = apply.riskCat;
  if (apply.lowRiskChoice) lowRiskChoice.value = apply.lowRiskChoice;
  if (apply.indexTest) indexTest.value = apply.indexTest;
  if (apply.stressModality) stressModality.value = apply.stressModality;

  appliedSummary.innerHTML = `Applied: ${escapeHtml(label)}`;

  // LOW RISK:
  // No downstream information is required.
  // Evaluate immediately and move straight to results.
  if (apply.riskCat === "low" && apply.lowRiskChoice) {
    const result = evaluatePathway(readInputs());

    renderResults(resultsContainer, result);
    renderFlags(flagsContainer, result.flags);

    setTimeout(() => {
      go("results");
    }, 180);

    return;
  }

  // INTERMEDIATE / HIGH RISK:
  // Continue to Page 4 because test-result information is still required.
const downstreamTitles = {
  ccta: "CCTA Results",
  stress_pet: "Stress PET Results",
  stress_spect: "Stress SPECT Results",
  stress_cmr: "Stress CMR Results",
  stress_echo: "Stress Echocardiography Results",
  exercise_ecg: "Exercise ECG Results",
};

const downstreamKey =
  apply.indexTest === "ccta"
    ? "ccta"
    : apply.stressModality;

downstreamTitle.textContent =
  downstreamTitles[downstreamKey] || "Test Results";

  updateDownstreamVisibility();

  go("downstream");
}

  function updateDownstreamVisibility() {
    const rc = riskCat.value || "";
    const it = indexTest.value || "";
    const cr = cctaResult.value || "";
    const sr = stressResult.value || "";

    cctaFields.style.display = rc === "intermediate_high" && it === "ccta" ? "" : "none";
    stressFields.style.display = rc === "intermediate_high" && it === "stress" ? "" : "none";

    stenosis4090Wrap.style.display = cr === "nonobstructive_lt50" ? "" : "none";
    highRiskCadWrap.style.display = cr === "obstructive_ge50" ? "" : "none";
    persistentSymptomsWrap.style.display = sr === "modsev" ? "" : "none";
  }

document.getElementById("applyNoTesting").addEventListener("click", () => {
  applyRecommendation(
    { riskCat: "low", lowRiskChoice: "no_testing" },
    "No testing recommended"
  );
});

document.getElementById("applyLowRiskSelected").addEventListener("click", () => {
  applyRecommendation(
    { riskCat: "low", lowRiskChoice: "selected_cac_execg" },
    "CAC or Exercise ECG in selected cases"
  );
});
[cctaResult, stressResult].forEach((el) => {
  if (!el) return;

  el.addEventListener("change", () => {
    updateDownstreamVisibility();
    maybeAutoRunPathway();
  });
});

[
  document.getElementById("stenosis4090"),
  document.getElementById("highRiskCad"),
  document.getElementById("persistentSymptoms"),
].forEach((el) => {
  if (!el) return;

  el.addEventListener("change", () => {
    updateDownstreamVisibility();
    maybeAutoRunPathway();
  });
});

  backBtn.addEventListener("click", backOne);
  startOverBtn.addEventListener("click", resetAll);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const result = evaluatePathway(readInputs());
    renderResults(resultsContainer, result);
    renderFlags(flagsContainer, result.flags);
    go("results");
  });

  setupModals();
  updatePromptVisibility();
  updateDownstreamVisibility();
  go("risk", false);
});

function readInputs() {
  const get = (id) => document.getElementById(id)?.value ?? "";

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
    layer3: {},
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

  const interpretation = result?.interpretation || {};
  const disposition = interpretation.disposition || "Result unavailable";
  const summary = interpretation.summary || "";
  const allSteps = Array.isArray(interpretation.nextSteps)
    ? interpretation.nextSteps
    : [];

  // These steps describe how we arrived at the result
  // but do not represent a new clinician action.
  const redundantLabels = new Set([
    "CCTA",
    "Stress testing",
    "No CAD",
    "No testing recommended"
  ]);

  const actionableSteps = allSteps
    .filter((step) => {
      const label = (step?.label || "").trim();
      return label && !redundantLabels.has(label);
    })
    .filter((step, index, array) => {
      // Remove duplicate labels while preserving order
      return (
        array.findIndex(
          (candidate) => candidate?.label === step?.label
        ) === index
      );
    })
    .slice(0, 2);

  const actionsHtml = actionableSteps.length
    ? `
      <section class="result-section">
        <p class="result-section-label result-section-label--gold">
          Next step${actionableSteps.length > 1 ? "s" : ""}
        </p>

        <div class="next-step-stack">
          ${actionableSteps.map(renderResultAction).join("")}
        </div>
      </section>
    `
    : "";

  container.innerHTML = `
    <section class="result-hero">
      <p class="result-section-label result-section-label--green">
        Result
      </p>

      <h3 class="result-title">
        ${escapeHtml(disposition)}
      </h3>

      ${
        summary
          ? `<p class="result-summary">${escapeHtml(summary)}</p>`
          : ""
      }
    </section>

    ${actionsHtml}
  `;
}

function renderResultAction(step) {
  const label = step?.label || "Next step";
  const detail = step?.detail || "";
  const strength = step?.strength || "";

  const whyHtml = detail
    ? `
      <details class="result-detail">
        <summary>Why?</summary>
        <p>${escapeHtml(detail)}</p>
      </details>
    `
    : "";

  const evidenceHtml = strength
    ? `
      <details class="result-detail">
        <summary>Evidence?</summary>
        <p>
          Recommendation strength:
          <strong>${escapeHtml(strength)}</strong>
        </p>
      </details>
    `
    : "";

  return `
    <article class="next-step-card">
      <h4>${escapeHtml(label)}</h4>

      ${
        detail
          ? `<p class="next-step-preview">${escapeHtml(detail)}</p>`
          : ""
      }

      <div class="result-detail-row">
        ${whyHtml}
        ${evidenceHtml}
      </div>
    </article>
  `;
}

function renderFlags(container, flags) {
  if (!container) return;

  // Page 5 should show only clinically meaningful warnings.
  // Routine informational flags such as SCOPE stay out of the
  // completed-result experience.
  const importantFlags = (flags || []).filter(
    (flag) =>
      flag?.severity === "warning" ||
      flag?.severity === "high"
  );

  if (importantFlags.length === 0) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <section class="result-warning-section">
      <p class="result-section-label result-section-label--red">
        Important considerations
      </p>

      ${importantFlags
        .map((flag) => {
          return `
            <div class="result-warning">
              <span class="result-warning-icon">!</span>
              <div>
                <strong>${escapeHtml(flag.message)}</strong>
              </div>
            </div>
          `;
        })
        .join("")}
    </section>
  `;
}

function yesNoToBool(v) {
  if (!v) return null;
  if (v === "yes") return true;
  if (v === "no") return false;
  return null;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => {
    const map = { "&": "&amp;", "<": "&lt;", ">":"&gt;", '"': "&quot;", "'": "&#039;" };
    return map[m];
  });
}
