/* ClinicalToolsDEV: Chest Pain Pathways (Guideline-based, decision-tree UX)
 * NOTE: Stable pathway content has been intentionally removed to allow partner ownership.
 * - Acute pathway remains fully implemented.
 * - Stable pathway button launches a stub that can open an external/internal stable module.
 */

document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // CONFIG (Integration hooks)
  // =========================

  /**
   * Stable module entrypoint.
   * Option A (recommended for shared repo): partner adds files at /stable/index.html
   * Option B (GitHub Pages): set to "https://<username>.github.io/<repo>/" or specific stable entry URL
   */
  const STABLE_MODULE_URL = "./stable/index.html";

  // Views
  const viewHome = document.getElementById("view-home");
  const viewRunner = document.getElementById("view-runner");
  const viewModalities = document.getElementById("view-modalities");

  // Home buttons
  document.getElementById("btn-start-acute").addEventListener("click", () => startPathway("acute"));
  document.getElementById("btn-start-stable").addEventListener("click", () => startPathway("stable"));
  document.getElementById("btn-modalities").addEventListener("click", () => showModalities());

  // Runner controls
  document.getElementById("btn-home").addEventListener("click", () => goHome());
  document.getElementById("btn-reset").addEventListener("click", () => resetRunner());
  document.getElementById("btn-back").addEventListener("click", () => stepBack());

  // Modalities view
  document.getElementById("btn-modalities-home").addEventListener("click", () => goHome());

  // Modal
  const modalOverlay = document.getElementById("modal-overlay");
  const modalClose = document.getElementById("modal-close");
  modalClose.addEventListener("click", () => closeModal());
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // State
  let state = {
    active: false,
    pathway: null,      // "acute" | "stable"
    nodeId: null,
    history: [],        // stack of previous nodeIds
  };

  // ---------- Public Actions ----------

  function startPathway(kind) {
    state = {
      active: true,
      pathway: kind,
      nodeId: kind === "acute" ? "A0" : "STABLE_LAUNCH",
      history: [],
    };
    showRunner();
    renderRunner();
  }

  function showModalities() {
    viewHome.classList.add("hidden");
    viewRunner.classList.add("hidden");
    viewModalities.classList.remove("hidden");
    renderModalitiesGrid();
  }

  function goHome() {
    state = { active: false, pathway: null, nodeId: null, history: [] };
    viewHome.classList.remove("hidden");
    viewRunner.classList.add("hidden");
    viewModalities.classList.add("hidden");
    closeModal();
  }

  function showRunner() {
    viewHome.classList.add("hidden");
    viewModalities.classList.add("hidden");
    viewRunner.classList.remove("hidden");
  }

  function resetRunner() {
    if (!state.active) return;
    state.history = [];
    state.nodeId = state.pathway === "acute" ? "A0" : "STABLE_LAUNCH";
    renderRunner();
  }

  function stepBack() {
    if (!state.active) return;
    const prev = state.history.pop();
    if (!prev) return; // already at start
    state.nodeId = prev;
    renderRunner();
  }

  function choose(nextId) {
    state.history.push(state.nodeId);
    state.nodeId = nextId;
    renderRunner();
  }

  function openUrl(url) {
    // Allows stable module to be maintained separately
    window.location.href = url;
  }

  // ---------- Rendering ----------

  function renderRunner() {
    const node = getNode(state.nodeId);
    const titleEl = document.getElementById("runner-title");
    const crumbEl = document.getElementById("runner-breadcrumb");
    const bodyEl = document.getElementById("runner-body");

    titleEl.textContent = state.pathway === "acute" ? "Acute chest pain pathway" : "Stable chest pain pathway";
    crumbEl.textContent = buildBreadcrumb(state);

    // Back disabled at start
    const backBtn = document.getElementById("btn-back");
    backBtn.disabled = state.history.length === 0;
    backBtn.style.opacity = backBtn.disabled ? 0.55 : 1;

    bodyEl.innerHTML = "";

    const header = document.createElement("div");
    header.innerHTML = `
      <h3 style="margin:0 0 .35rem; font-size:1.05rem;">${escapeHtml(node.title)}</h3>
      ${node.body ? `<p class="muted" style="margin:.25rem 0 0;">${escapeHtml(node.body)}</p>` : ``}
    `;
    bodyEl.appendChild(header);

    // Flags / notes
    if (node.flags && node.flags.length) {
      const flagsWrap = document.createElement("div");
      flagsWrap.style.marginTop = ".5rem";
      flagsWrap.innerHTML = node.flags.map(f => pillHtml(f.level, f.text)).join("");
      bodyEl.appendChild(flagsWrap);
    }

    // Terminal: show actions + modality chips
    if (node.type === "terminal") {
      const terminal = document.createElement("div");
      terminal.style.marginTop = ".85rem";
      terminal.innerHTML = `
        ${node.disposition ? `<div class="callout"><h3 class="callout-title">Terminal state</h3><p class="muted">${escapeHtml(node.disposition)}</p></div>` : ``}
        ${node.recommendedTests?.length ? `<h3 class="section-title">Testing links</h3><p class="muted small">Tap a test to open its “nuances” sheet.</p>` : ``}
        <div class="chip-grid" id="terminal-chips"></div>
      `;
      bodyEl.appendChild(terminal);

      const chipGrid = document.getElementById("terminal-chips");
      (node.recommendedTests || []).forEach(key => {
        const btn = document.createElement("button");
        btn.className = "chip";
        btn.textContent = MODALITIES[key]?.name || key;
        btn.addEventListener("click", () => openModality(key));
        chipGrid.appendChild(btn);
      });

      return;
    }

    // Step: show Continue
    if (node.type === "step") {
      const cta = document.createElement("div");
      cta.className = "btn-row";
      const btn = document.createElement("button");
      btn.className = "btn-primary";
      btn.textContent = node.continueLabel || "Continue";
      btn.addEventListener("click", () => {
        if (node.action?.type === "OPEN_URL") {
          openUrl(node.action.url);
          return;
        }
        choose(node.next);
      });
      cta.appendChild(btn);
      bodyEl.appendChild(cta);
      return;
    }

    // Decision: show choices (2–5)
    if (node.type === "decision") {
      const grid = document.createElement("div");
      grid.className = "choice-grid";
      node.options.forEach(opt => {
        const b = document.createElement("button");
        b.className = "choice-btn";
        b.innerHTML = `
          <p class="choice-title">${escapeHtml(opt.label)}</p>
          ${opt.sub ? `<p class="choice-sub">${escapeHtml(opt.sub)}</p>` : ``}
        `;
        b.addEventListener("click", () => {
          if (opt.action?.type === "OPEN_URL") {
            openUrl(opt.action.url);
            return;
          }
          choose(opt.next);
        });
        grid.appendChild(b);
      });
      bodyEl.appendChild(grid);
      return;
    }

    // Fallback
    bodyEl.appendChild(document.createTextNode("Unknown node type."));
  }

  function renderModalitiesGrid() {
    const grid = document.getElementById("modalities-grid");
    grid.innerHTML = "";
    Object.keys(MODALITIES).forEach(key => {
      const btn = document.createElement("button");
      btn.className = "chip";
      btn.textContent = MODALITIES[key].name;
      btn.addEventListener("click", () => openModality(key));
      grid.appendChild(btn);
    });
  }

  // ---------- Modalities Modal ----------

  function openModality(key) {
    const m = MODALITIES[key];
    if (!m) return;

    document.getElementById("modal-title").textContent = m.name;

    const body = document.getElementById("modal-body");
    body.innerHTML = `
      ${m.summary ? `<p>${escapeHtml(m.summary)}</p>` : ``}
      ${m.bullets?.length ? `<ul>${m.bullets.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ``}
      ${m.notes?.length ? `<div class="callout"><h3 class="callout-title">Notes</h3><ul>${m.notes.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div>` : ``}
    `;

    modalOverlay.classList.remove("hidden");
  }

  function closeModal() {
    modalOverlay.classList.add("hidden");
  }

  // ---------- Pure Logic ----------

  function getNode(id) {
    const node = PATHWAYS[id];
    if (!node) {
      return { id, type: "terminal", title: "Missing node", disposition: `Node '${id}' not found.` };
    }
    return node;
  }

  function buildBreadcrumb(s) {
    const parts = [];
    parts.push(s.pathway === "acute" ? "Acute" : "Stable");
    parts.push(`Step ${s.history.length + 1}`);
    return parts.join(" • ");
  }

  function pillHtml(level, text) {
    const cls = level === "danger" ? "flag-pill--danger" : (level === "warning" ? "flag-pill--warning" : "flag-pill--ok");
    return `<span class="flag-pill ${cls}">${escapeHtml(text)}</span>`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[s]));
  }

  // ======================================
  // CONTENT (Pathways)
  // - Acute implemented
  // - Stable intentionally removed (stub)
  // ======================================

  const PATHWAYS = {
    // ---------------- STABLE LAUNCH STUB ----------------
    STABLE_LAUNCH: {
      id: "STABLE_LAUNCH",
      type: "decision",
      title: "Stable chest pain pathway (module)",
      body:
        "Stable/outpatient pathways are maintained separately by your collaborator. " +
        "Use the button below to open the Stable module when it is added to this shared repo.",
      flags: [
        { level: "warning", text: "Stable pathway content intentionally not included in this build." }
      ],
      options: [
        {
          label: "Open Stable module",
          sub: "Opens ./stable/index.html (or your configured Stable module URL).",
          action: { type: "OPEN_URL", url: STABLE_MODULE_URL }
        },
        { label: "Back to Home", next: "STABLE_GO_HOME" }
      ]
    },

    STABLE_GO_HOME: {
      id: "STABLE_GO_HOME",
      type: "step",
      title: "Return",
      body: "Return to home to select a different pathway.",
      continueLabel: "Home",
      action: { type: "OPEN_URL", url: "./index.html" }
    },

    // ---------------- ACUTE START ----------------
    A0: {
      id: "A0",
      type: "step",
      title: "Patient with acute chest pain",
      body: "Initial evaluation: history + physical examination, then ECG.",
      continueLabel: "ECG completed → continue",
      next: "A1"
    },
    A1: {
      id: "A1",
      type: "decision",
      title: "Post-ECG: Which best fits?",
      body: "Choose the branch that matches the current presentation.",
      options: [
        { label: "Obvious noncardiac cause", next: "A_TERM_NONCARDIAC" },
        { label: "Obvious nonischemic cardiac cause", next: "A_TERM_NONISCHEMIC_CARDIAC" },
        { label: "Possible ACS", next: "A2" }
      ]
    },
    A2: { id: "A2", type: "step", title: "Possible ACS", body: "Obtain troponin.", continueLabel: "Troponin obtained → continue", next: "A3" },
    A3: { id: "A3", type: "step", title: "Risk stratify", body: "Use a clinical decision pathway (CDP) to risk stratify.", continueLabel: "Risk category selected → continue", next: "A4" },
    A4: {
      id: "A4",
      type: "decision",
      title: "CDP risk category",
      body: "Select the risk category for short-term MACE per your CDP.",
      options: [
        { label: "Low risk", next: "A_TERM_LOW" },
        { label: "Intermediate risk", next: "A5" },
        { label: "High risk", next: "A_TERM_HIGH" }
      ]
    },
    A5: {
      id: "A5",
      type: "decision",
      title: "Intermediate risk: Known CAD status",
      body: "Select whether the patient has known CAD.",
      options: [
        { label: "No known CAD", next: "A_INO0" },
        { label: "Known CAD", next: "A_IK0" }
      ]
    },

    // ---------------- ACUTE TERMINALS ----------------
    A_TERM_NONCARDIAC: {
      id: "A_TERM_NONCARDIAC",
      type: "terminal",
      title: "Obvious noncardiac cause",
      disposition: "No cardiac testing required (per pathway figure).",
      flags: [{ level: "ok", text: "Terminal pathway" }]
    },
    A_TERM_NONISCHEMIC_CARDIAC: {
      id: "A_TERM_NONISCHEMIC_CARDIAC",
      type: "terminal",
      title: "Obvious nonischemic cardiac cause",
      disposition: "Other cardiac testing as needed (per pathway figure).",
      flags: [{ level: "ok", text: "Terminal pathway" }]
    },
    A_TERM_LOW: {
      id: "A_TERM_LOW",
      type: "terminal",
      title: "Low risk",
      disposition: "No testing required → discharge (per pathway figure).",
      flags: [{ level: "ok", text: "Terminal pathway" }]
    },
    A_TERM_HIGH: {
      id: "A_TERM_HIGH",
      type: "terminal",
      title: "High risk",
      disposition: "Invasive coronary angiography (ICA).",
      flags: [{ level: "danger", text: "High risk pathway" }],
      recommendedTests: ["ICA"]
    },

    // ---------------- ACUTE INTERMEDIATE: NO KNOWN CAD ----------------
    A_INO0: {
      id: "A_INO0",
      type: "decision",
      title: "Intermediate risk + no known CAD",
      body: "Prior testing available?",
      options: [
        { label: "Yes", next: "A_INO_PRIOR_Y" },
        { label: "No", next: "A_INO_PRIOR_N" }
      ]
    },

    A_INO_PRIOR_Y: {
      id: "A_INO_PRIOR_Y",
      type: "decision",
      title: "Prior testing (yes)",
      body: "Which best describes prior testing?",
      options: [
        { label: "Recent negative test*", sub: "Normal CCTA ≤2 years OR negative stress test ≤1 year (adequate stress).", next: "A_TERM_DISCHARGE" },
        { label: "Prior inconclusive or mildly abnormal stress test ≤1 year", next: "A_INO_CCTA_AFTER_INCONC_STRESS" },
        { label: "Prior moderate–severely abnormal ≤1 year (no interval ICA)", next: "A_TERM_ICA" }
      ]
    },

    A_INO_CCTA_AFTER_INCONC_STRESS: {
      id: "A_INO_CCTA_AFTER_INCONC_STRESS",
      type: "step",
      title: "Next test",
      body: "CCTA (after inconclusive/mildly abnormal stress test).",
      continueLabel: "CCTA result available → continue",
      next: "A_INO_CCTA_RESULTS_1"
    },

    A_INO_PRIOR_N: {
      id: "A_INO_PRIOR_N",
      type: "decision",
      title: "No prior testing",
      body: "Select initial test strategy (guided by local availability/expertise).",
      options: [
        { label: "Stress testing", sub: "Exercise ECG, stress CMR, stress echocardiography, stress PET, or stress SPECT.", next: "A_INO_STRESS_RESULTS" },
        { label: "CCTA", next: "A_INO_CCTA_RESULTS_ENTRY" }
      ]
    },

    A_INO_STRESS_RESULTS: {
      id: "A_INO_STRESS_RESULTS",
      type: "decision",
      title: "Stress testing result",
      body: "Select stress testing outcome.",
      options: [
        { label: "Negative or mildly abnormal", next: "A_TERM_DISCHARGE" },
        { label: "Moderate–severe ischemia", next: "A_TERM_ICA" },
        { label: "Inconclusive", next: "A_INO_CCTA_AFTER_INCONCLUSIVE_STRESS" }
      ]
    },

    A_INO_CCTA_AFTER_INCONCLUSIVE_STRESS: {
      id: "A_INO_CCTA_AFTER_INCONCLUSIVE_STRESS",
      type: "step",
      title: "Next test",
      body: "CCTA (after inconclusive stress test).",
      continueLabel: "CCTA result available → continue",
      next: "A_INO_CCTA_RESULTS_2"
    },

    A_INO_CCTA_RESULTS_ENTRY: {
      id: "A_INO_CCTA_RESULTS_ENTRY",
      type: "step",
      title: "CCTA performed",
      body: "Proceed with CCTA.",
      continueLabel: "CCTA result available → continue",
      next: "A_INO_CCTA_RESULTS_2"
    },

    A_INO_CCTA_RESULTS_1: {
      id: "A_INO_CCTA_RESULTS_1",
      type: "decision",
      title: "CCTA result",
      body: "Select CCTA interpretation.",
      options: [
        { label: "Nonobstructive CAD (<50% stenosis)", next: "A_TERM_DISCHARGE" },
        { label: "Inconclusive stenosis", next: "A_INO_FFRCT_OR_STRESS_1" },
        { label: "Obstructive CAD (≥50% stenosis)", next: "A_INO_OBS_BRANCH" }
      ]
    },
    A_INO_CCTA_RESULTS_2: {
      id: "A_INO_CCTA_RESULTS_2",
      type: "decision",
      title: "CCTA result",
      body: "Select CCTA interpretation.",
      options: [
        { label: "Nonobstructive CAD (<50% stenosis)", next: "A_TERM_DISCHARGE" },
        { label: "Inconclusive stenosis", next: "A_INO_FFRCT_OR_STRESS_2" },
        { label: "Obstructive CAD (≥50% stenosis)", next: "A_INO_OBS_BRANCH" }
      ]
    },

    A_INO_FFRCT_OR_STRESS_1: {
      id: "A_INO_FFRCT_OR_STRESS_1",
      type: "decision",
      title: "Next step after inconclusive CCTA",
      body: "Choose add-on test.",
      flags: [{ level: "warning", text: "FFR-CT turnaround time may affect prompt care decisions." }],
      options: [
        { label: "FFR-CT", next: "A_INO_FFRCT_THRESHOLD" },
        { label: "Stress testing", next: "A_INO_STRESS_THRESHOLD" }
      ]
    },
    A_INO_FFRCT_OR_STRESS_2: {
      id: "A_INO_FFRCT_OR_STRESS_2",
      type: "decision",
      title: "Next step after inconclusive CCTA",
      body: "Choose add-on test.",
      flags: [{ level: "warning", text: "FFR-CT turnaround time may affect prompt care decisions." }],
      options: [
        { label: "FFR-CT", next: "A_INO_FFRCT_THRESHOLD" },
        { label: "Stress testing", next: "A_INO_STRESS_THRESHOLD" }
      ]
    },

    A_INO_FFRCT_THRESHOLD: {
      id: "A_INO_FFRCT_THRESHOLD",
      type: "decision",
      title: "FFR-CT / ischemia threshold",
      body: "Select the result category.",
      options: [
        { label: "FFR-CT ≤ 0.8 OR moderate–severe ischemia", next: "A_TERM_ICA" },
        { label: "NO (does not meet threshold)", next: "A_INO_GDMT_DISCHARGE" }
      ]
    },
    A_INO_STRESS_THRESHOLD: {
      id: "A_INO_STRESS_THRESHOLD",
      type: "decision",
      title: "Stress imaging threshold",
      body: "Select the result category.",
      options: [
        { label: "Moderate–severe ischemia", next: "A_TERM_ICA" },
        { label: "Negative / mild ischemia / not moderate–severe", next: "A_INO_GDMT_DISCHARGE" }
      ]
    },

    A_INO_OBS_BRANCH: {
      id: "A_INO_OBS_BRANCH",
      type: "decision",
      title: "Obstructive CAD (≥50%)",
      body: "High-risk CAD or frequent angina?",
      options: [
        { label: "Yes", next: "A_TERM_ICA" },
        { label: "No", next: "A_INO_TREAT_MED_DECISION" }
      ]
    },

    A_INO_TREAT_MED_DECISION: {
      id: "A_INO_TREAT_MED_DECISION",
      type: "decision",
      title: "Management choice",
      body: "Decision to treat medically?",
      options: [
        { label: "Treat medically (GDMT)", next: "A_INO_GDMT_DISCHARGE" },
        { label: "Proceed to ICA", next: "A_TERM_ICA" }
      ]
    },

    A_INO_GDMT_DISCHARGE: {
      id: "A_INO_GDMT_DISCHARGE",
      type: "terminal",
      title: "GDMT → discharge",
      disposition: "Guideline-directed medical therapy (GDMT) → discharge (per pathway figure).",
      flags: [{ level: "ok", text: "Terminal pathway" }]
    },

    // ---------------- ACUTE INTERMEDIATE: KNOWN CAD ----------------
    A_IK0: {
      id: "A_IK0",
      type: "step",
      title: "Intermediate risk + known CAD",
      body: "Optimize/intensify GDMT first; consider deferring testing when appropriate (per guideline recommendations).",
      continueLabel: "Continue",
      next: "A_IK1"
    },

    A_IK1: {
      id: "A_IK1",
      type: "decision",
      title: "Known CAD category",
      body: "Select known CAD subtype for this decision pathway.",
      options: [
        { label: "Nonobstructive CAD (<50% stenosis)", next: "A_IK_NONOBS_CCTA" },
        { label: "Obstructive CAD (≥50% stenosis)", next: "A_IK_OBS_RISK" }
      ]
    },

    A_IK_NONOBS_CCTA: {
      id: "A_IK_NONOBS_CCTA",
      type: "step",
      title: "Next test",
      body: "CCTA can be used to determine progression of plaque/obstructive CAD.",
      continueLabel: "CCTA result available → continue",
      next: "A_IK_NONOBS_CCTA_RES"
    },
    A_IK_NONOBS_CCTA_RES: {
      id: "A_IK_NONOBS_CCTA_RES",
      type: "decision",
      title: "CCTA result (known nonobstructive CAD)",
      body: "Select CCTA outcome.",
      options: [
        { label: "No change", next: "A_TERM_DISCHARGE" },
        { label: "Obstructive CAD (≥50% stenosis)", next: "A_IK_NONOBS_FFR_OR_STRESS" }
      ]
    },
    A_IK_NONOBS_FFR_OR_STRESS: {
      id: "A_IK_NONOBS_FFR_OR_STRESS",
      type: "decision",
      title: "Next test",
      body: "FFR-CT or stress testing (per pathway).",
      flags: [{ level: "warning", text: "FFR-CT turnaround time may affect prompt care decisions." }],
      options: [
        { label: "FFR-CT", next: "A_INO_FFRCT_THRESHOLD" },
        { label: "Stress testing", next: "A_INO_STRESS_THRESHOLD" }
      ]
    },

    A_IK_OBS_RISK: {
      id: "A_IK_OBS_RISK",
      type: "decision",
      title: "Obstructive CAD (known)",
      body: "High-risk CAD or frequent angina?",
      options: [
        { label: "Yes", next: "A_TERM_ICA" },
        { label: "No", next: "A_IK_OBS_STRESS" }
      ]
    },

    A_IK_OBS_STRESS: {
      id: "A_IK_OBS_STRESS",
      type: "step",
      title: "Stress imaging",
      body: "Stress imaging (PET/SPECT MPI, CMR, or stress echocardiography) is reasonable in this setting.",
      continueLabel: "Stress test result available → continue",
      next: "A_IK_OBS_STRESS_RES"
    },
    A_IK_OBS_STRESS_RES: {
      id: "A_IK_OBS_STRESS_RES",
      type: "decision",
      title: "Functional test result",
      body: "Select functional test outcome.",
      options: [
        { label: "Normal functional test", next: "A_TERM_DISCHARGE" },
        { label: "Abnormal functional test", next: "A_IK_OBS_ABN_NOTE" }
      ]
    },
    A_IK_OBS_ABN_NOTE: {
      id: "A_IK_OBS_ABN_NOTE",
      type: "step",
      title: "Abnormal functional test",
      body: "Per pathway: option to defer ICA with mildly abnormal test; otherwise proceed to ICA.",
      continueLabel: "Proceed",
      next: "A_TERM_ICA"
    },

    // Common terminals
    A_TERM_DISCHARGE: {
      id: "A_TERM_DISCHARGE",
      type: "terminal",
      title: "Discharge",
      disposition: "Discharge (per pathway figure).",
      flags: [{ level: "ok", text: "Terminal pathway" }]
    },
    A_TERM_ICA: {
      id: "A_TERM_ICA",
      type: "terminal",
      title: "Invasive coronary angiography",
      disposition: "Invasive coronary angiography (ICA).",
      flags: [{ level: "danger", text: "Invasive testing pathway" }],
      recommendedTests: ["ICA"]
    }
  };

  // ---------- Modality “nuances” (unchanged) ----------
  const MODALITIES = {
    EX_ECG: {
      name: "Exercise ECG",
      summary: "Symptom-limited graded exercise testing (no imaging).",
      bullets: [
        "Candidates: able to perform activities of daily living / achieve ≥5 METs; avoid disabling comorbidity limiting exercise capacity.",
        "Avoid if resting ECG abnormalities reduce interpretability (e.g., baseline ST-T abnormalities, LBBB, paced rhythm, WPW pattern, digitalis use).",
        "Diagnostic accuracy lower than stress imaging, but prognostication remains useful (exercise capacity targets such as ≥85% age-predicted fitness; <5 METs increases risk)."
      ],
      notes: ["Contraindications are referenced in the guideline’s Table 5."]
    },
    STRESS_ECHO: {
      name: "Stress echocardiography",
      summary: "After ACS ruled out, can define ischemia severity and aid risk stratification.",
      bullets: [
        "Ultrasound-enhancing agents can help LV opacification when ≥2 contiguous segments or a coronary territory is poorly visualized.",
        "Contraindications to stress type (exercise vs pharmacologic) and stress echo are referenced in Table 5."
      ]
    },
    PET: {
      name: "Stress PET MPI",
      summary: "Rest/stress PET myocardial perfusion imaging detects perfusion abnormalities and LV function; MBFR adds diagnostic/prognostic value.",
      bullets: [
        "Myocardial blood flow reserve (MBFR) can add diagnostic/prognostic information beyond MPI.",
        "Average effective radiation dose reported ~3 mSv for rest/stress PET with Rb-82."
      ],
      notes: [
        "Contraindications are referenced in Table 5.",
        "Guideline notes PET is reasonable in preference to SPECT (if available) to improve accuracy and reduce nondiagnostic results."
      ]
    },
    SPECT: {
      name: "Stress SPECT MPI",
      summary: "Rest/stress SPECT myocardial perfusion imaging for perfusion abnormalities and LV function.",
      bullets: [
        "Average effective radiation dose reported ~10 mSv for Tc-99m SPECT.",
        "Dual-isotope SPECT using thallium is not recommended."
      ],
      notes: ["Contraindications are referenced in Table 5."]
    },
    CMR: {
      name: "Stress CMR",
      summary: "CMR assesses ventricular function; detects/localizes ischemia and infarction; evaluates viability.",
      bullets: [
        "CMR can detect myocardial edema and microvascular obstruction, helping differentiate acute vs chronic MI and other causes of acute chest pain (e.g., myocarditis)."
      ],
      notes: ["CMR contraindications are referenced in Table 5."]
    },
    CCTA: {
      name: "CCTA",
      summary: "Anatomic test to diagnose/exclude obstructive CAD and identify plaque; used across acute pathways.",
      bullets: [
        "Guideline highlights use after stress testing to diagnose/exclude obstructive CAD and identify who may benefit from ICA referral."
      ],
      notes: ["Test selection should be guided by local availability/expertise (per pathway notes)."]
    },
    FFRCT: {
      name: "FFR-CT",
      summary: "Functional assessment derived from CCTA data to guide vessel-specific ischemia assessment and revascularization decisions.",
      bullets: ["Used when stenosis is in the 40–90% range in a proximal/mid segment on CCTA (per guideline recommendations)."],
      notes: ["Guideline notes: turnaround times may impact prompt clinical care decisions."]
    },
    ICA: {
      name: "Invasive coronary angiography (ICA)",
      summary: "Invasive anatomic test; used for high-risk presentations and specific intermediate/high-risk branches.",
      bullets: ["Guideline discusses ICA as effective for diagnosing obstructive CAD and guiding revascularization decisions."]
    },
    CAC: {
      name: "Coronary artery calcium (CAC)",
      summary: "CAC can refine risk assessment and may help reduce diagnostic uncertainty / guide preventive management in selected stable patients.",
      bullets: ["CAC score of zero can identify a low-risk cohort who may not require additional diagnostic testing (stable chest pain context)."]
    }
  };

  // Init
  goHome();
});
