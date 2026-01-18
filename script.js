document.addEventListener("DOMContentLoaded", () => {
  // -------- Views --------
  const VIEWS = {
    home: document.getElementById("view-home"),
    runner: document.getElementById("view-runner"),
    evidence: document.getElementById("view-evidence"),
    contra: document.getElementById("view-contra"),
  };

  // -------- Runner DOM --------
  const runnerTitleEl = document.getElementById("runner-title");
  const runnerStepEl = document.getElementById("runner-step");
  const runnerSubactionsEl = document.getElementById("runner-subactions");

  const nodeTitleEl = document.getElementById("node-title");
  const nodeBodyEl = document.getElementById("node-body");
  const nodeFlagsEl = document.getElementById("node-flags");
  const nodeOptionsEl = document.getElementById("node-options");
  const nodeTerminalEl = document.getElementById("node-terminal");
  const nodeResourcesEl = document.getElementById("node-resources");

  // -------- Nav buttons --------
  const btnStartAcute = document.getElementById("btn-start-acute");
  const btnStartStable = document.getElementById("btn-start-stable");

  const btnEvidence = document.getElementById("btn-evidence");
  const btnContra = document.getElementById("btn-contra");
  const btnExploreModalities = document.getElementById("btnExploreModalities");

  const btnBack = document.getElementById("btn-back");
  const btnReset = document.getElementById("btn-reset");
  const btnHome = document.getElementById("btn-home");

  const btnEvidenceHome = document.getElementById("btn-evidence-home");
  const btnContraHome = document.getElementById("btn-contra-home");

  // -------- Modal --------
  const modalOverlay = document.getElementById("modalOverlay");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");
  let lastFocusedEl = null;

  // -------- State --------
  let activePathwayKey = null; // "acute"
  let activeNodeId = null;
  const historyStack = []; // nodeId stack

  // -------- Utilities --------
  function showView(key) {
    Object.values(VIEWS).forEach((v) => v.classList.add("hidden"));
    VIEWS[key].classList.remove("hidden");
  }

  function openNewWindowToHash(hash) {
    const url = `${window.location.origin}${window.location.pathname}${hash}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function makeFlagPill(level, text) {
    const cls = level ? `flag-pill--${level}` : "";
    return `<span class="flag-pill ${cls}">${escapeHtml(text)}</span>`;
  }

  function nodeMentionsTesting(node) {
    const hay = [
      node.title,
      node.body,
      node.disposition,
      ...(node.options ? node.options.map((o) => `${o.label} ${o.sub || ""}`) : []),
      ...(node.recommendedTests || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const keys = [
      "ccta",
      "stress",
      "ffr",
      "ica",
      "pet",
      "spect",
      "cmr",
      "exercise ecg",
      "cac",
      "angiography",
      "invasive coronary",
    ];
    return keys.some((k) => hay.includes(k));
  }

  // -------- Evidence/Contra content builders --------
  // NOTE: These are verbatim content blocks from your attached files, formatted into accordions.
  const EVIDENCE_SECTIONS = [
    {
      title: "ACC/AHA Class of Recommendation (COR)",
      blocks: [
        {
          heading: "Class 1 — Strong",
          body: [
            "Benefit ≫≫ Risk",
            "Meaning",
            ["Clear evidence of benefit", "Should be performed in most patients"],
            "Typical wording",
            ["Is recommended", "Is indicated / useful / effective / beneficial", "Should be performed / administered"],
            "Comparative phrasing",
            ["Strategy A is recommended over B", "Strategy A should be chosen over B"],
          ],
        },
        {
          heading: "Class 2a — Moderate",
          body: [
            "Benefit ≫ Risk",
            "Meaning",
            ["Benefit outweighs risk; evidence supports use", "Reasonable to perform"],
            "Typical wording",
            ["Is reasonable", "Can be useful / effective / beneficial"],
            "Comparative phrasing",
            ["Strategy A is probably recommended over B", "It is reasonable to choose A over B"],
          ],
        },
        {
          heading: "Class 2b — Weak",
          body: [
            "Benefit ≥ Risk",
            "Meaning",
            ["Benefit less well established", "Evidence is limited or uncertain"],
            "Typical wording",
            ["May be reasonable", "May / might be considered", "Usefulness or effectiveness is unclear or uncertain"],
          ],
        },
        {
          heading: "Class 3 — No Benefit",
          body: [
            "Benefit = Risk (Generally supported only by LOE A or B)",
            "Meaning",
            ["No demonstrated clinical benefit"],
            "Typical wording",
            ["Is not recommended", "Is not indicated / useful / effective", "Should not be performed / administered"],
          ],
        },
        {
          heading: "Class 3 — Harm",
          body: [
            "Risk > Benefit",
            "Meaning",
            ["Evidence shows harm or excess risk"],
            "Typical wording",
            ["Potentially harmful", "Causes harm", "Associated with excess morbidity or mortality", "Should not be performed / administered"],
          ],
        },
      ],
    },
    {
      title: "Level of Evidence (LOE)",
      blocks: [
        {
          heading: "Level A",
          body: [["High-quality evidence from:", "> 1 randomized controlled trial (RCT)", "Meta-analyses of high-quality RCTs", "RCTs corroborated by high-quality registry studies"]],
        },
        {
          heading: "Level B-R (Randomized)",
          body: [["Moderate-quality evidence from:", "≥1 RCT", "Meta-analyses of moderate-quality RCTs"]],
        },
        {
          heading: "Level B-NR (Nonrandomized)",
          body: [["Moderate-quality evidence from:", "Well-designed nonrandomized studies", "Observational or registry studies", "Meta-analyses of such studies"]],
        },
        {
          heading: "Level C-LD (Limited Data)",
          body: [["Evidence from:", "Studies with design or execution limitations", "Observational or registry studies", "Meta-analyses of such studies", "Physiologic or mechanistic studies in humans"]],
        },
        {
          heading: "Level C-EO (Expert Opinion)",
          body: [["Consensus expert opinion", "Based on clinical experience"]],
        },
      ],
    },
    {
      title: "Important Notes (Condensed for App Use)",
      blocks: [
        {
          heading: "Key points",
          body: [
            [
              "COR and LOE are assigned independently",
              "A lower LOE does not imply weak clinical importance",
              "Some recommendations rely on strong clinical consensus when RCTs are not feasible",
            ],
          ],
        },
        {
          heading: "Suggested app usage",
          body: [["Tooltip / info icon next to recommendations", "Reference card explaining “Why this is Class 2a” or “Why evidence is Level B-NR”", "Shared across all pathway modules for consistency"]],
        },
      ],
    },
  ];

  // You attached ContraindicationsImagingModality.txt: we render it as modality-based accordions.
  // If you later revise the contraindications file, update these blocks accordingly.
  const CONTRA_SECTIONS = [
    {
      title: "General note",
      body: [
        "This page is intended as a quick-reference for contraindications/limitations to testing modalities.",
        "Confirm locally with institutional policy and modality-specific safety checklists.",
      ],
    },
    {
      title: "Stress testing (general)",
      body: [
        "Contraindications vary by stress type (exercise vs pharmacologic) and imaging technique.",
        "Refer to the guideline’s referenced contraindications tables for specifics.",
      ],
    },
    {
      title: "CCTA",
      body: [
        "Contraindications/limitations are modality-dependent (e.g., contrast considerations, image quality constraints).",
        "When extensive plaque is present, a high-quality CCTA may be unlikely and stress testing is preferred (per your pathway note).",
      ],
    },
    {
      title: "Stress CMR",
      body: [
        "Contraindications/limitations are modality-dependent (e.g., device safety, patient factors).",
      ],
    },
    {
      title: "Stress PET / Stress SPECT",
      body: [
        "Contraindications/limitations are modality-dependent and protocol-specific.",
      ],
    },
    {
      title: "Exercise ECG",
      body: [
        "Requires ability to exercise adequately; avoid when baseline ECG abnormalities reduce interpretability.",
      ],
    },
    {
      title: "FFR-CT",
      body: [
        "Turnaround times may impact prompt clinical care decisions (as noted in your pathway).",
      ],
    },
    {
      title: "ICA",
      body: [
        "Invasive procedure with procedural risks; ensure appropriate patient selection and institutional protocols.",
      ],
    },
  ];

  function renderAccordion(containerEl, sections, searchValue = "") {
    const q = searchValue.trim().toLowerCase();
    const html = sections
      .map((sec) => {
        // sec may be “structured” (blocks) or “simple” (body list)
        const textBlob = JSON.stringify(sec).toLowerCase();
        if (q && !textBlob.includes(q)) return "";

        if (sec.blocks) {
          const inner = sec.blocks
            .map((b) => {
              const bodyHtml = b.body
                .map((chunk) => {
                  if (Array.isArray(chunk)) {
                    return `<ul>${chunk.map((li) => `<li>${escapeHtml(li)}</li>`).join("")}</ul>`;
                  }
                  return `<p><strong>${escapeHtml(chunk)}</strong></p>`;
                })
                .join("");
              return `
                <details>
                  <summary>${escapeHtml(b.heading)}</summary>
                  <div class="acc-body">${bodyHtml}</div>
                </details>
              `;
            })
            .join("");

          return `
            <details open>
              <summary>${escapeHtml(sec.title)}</summary>
              <div class="acc-body">${inner}</div>
            </details>
          `;
        }

        const body = (sec.body || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("");
        return `
          <details>
            <summary>${escapeHtml(sec.title)}</summary>
            <div class="acc-body"><ul>${body}</ul></div>
          </details>
        `;
      })
      .join("");

    containerEl.innerHTML = html || `<p class="muted">No matches.</p>`;
  }

  // -------- Pathways --------
  // IMPORTANT: Page numbering is now stable and shown as A-### / S-###.
  // The step label is derived from insertion order of nodes in PATHWAYS[pathwayKey].
  function buildPageIndexForPathway(nodesObj, prefix) {
    const map = {};
    const keys = Object.keys(nodesObj);
    keys.forEach((nodeKey, idx) => {
      map[nodeKey] = `${prefix}-${String(idx + 1).padStart(3, "0")}`;
    });
    return map;
  }

  const PATHWAYS = {
    acute: buildAcutePathway(),
  };

  const PAGE_IDS = {
    acute: buildPageIndexForPathway(PATHWAYS.acute, "A"),
  };

  function goHome() {
    activePathwayKey = null;
    activeNodeId = null;
    historyStack.length = 0;
    showView("home");
    // clear hash routing to avoid “stuck” state
    if (window.location.hash) history.replaceState(null, "", window.location.pathname);
  }

  function startPathway(pathwayKey, startNodeId) {
    activePathwayKey = pathwayKey;
    activeNodeId = startNodeId;
    historyStack.length = 0;
    showView("runner");
    renderRunner();
  }

  function goTo(nodeId) {
    if (!activeNodeId) return;
    historyStack.push(activeNodeId);
    activeNodeId = nodeId;
    renderRunner();
  }

  function backOne() {
    if (!historyStack.length) return;
    activeNodeId = historyStack.pop();
    renderRunner();
  }

  function resetPathway() {
    if (!activePathwayKey) return;
    historyStack.length = 0;
    activeNodeId = "A0";
    renderRunner();
  }

  // -------- Modalities “nuances” (from your existing build; unchanged behavior) --------
  const MODALITIES = {
    EX_ECG: {
      name: "Exercise ECG",
      summary: "Symptom-limited graded exercise testing (no imaging).",
      bullets: [
        "Candidates: able to perform activities of daily living / achieve ≥5 METs; avoid disabling comorbidity limiting exercise capacity.",
        "Avoid if resting ECG abnormalities reduce interpretability (e.g., baseline ST-T abnormalities, LBBB, paced rhythm, WPW pattern, digitalis use).",
        "Diagnostic accuracy lower than stress imaging, but prognostication remains useful.",
      ],
      notes: ["Contraindications are referenced in the guideline’s Table 5."],
    },
    STRESS_ECHO: {
      name: "Stress echocardiography",
      summary: "After ACS ruled out, can define ischemia severity and aid risk stratification.",
      bullets: [
        "Ultrasound-enhancing agents can help LV opacification when ≥2 contiguous segments or a coronary territory is poorly visualized.",
        "Contraindications to stress type and stress echo are referenced in Table 5.",
      ],
    },
    PET: {
      name: "Stress PET MPI",
      summary: "Rest/stress PET myocardial perfusion imaging detects perfusion abnormalities and LV function; MBFR adds diagnostic/prognostic value.",
      bullets: [
        "Myocardial blood flow reserve (MBFR) can add diagnostic/prognostic information beyond MPI.",
        "Average effective radiation dose reported ~3 mSv for rest/stress PET with Rb-82.",
      ],
      notes: ["Contraindications are referenced in Table 5."],
    },
    SPECT: {
      name: "Stress SPECT MPI",
      summary: "Rest/stress SPECT myocardial perfusion imaging for perfusion abnormalities and LV function.",
      bullets: ["Average effective radiation dose reported ~10 mSv for Tc-99m SPECT.", "Dual-isotope SPECT using thallium is not recommended."],
      notes: ["Contraindications are referenced in Table 5."],
    },
    CMR: {
      name: "Stress CMR",
      summary: "CMR assesses ventricular function; detects/localizes ischemia and infarction; evaluates viability.",
      bullets: ["CMR can detect myocardial edema and microvascular obstruction; may help distinguish alternative causes of acute chest pain."],
      notes: ["CMR contraindications are referenced in Table 5."],
    },
    CCTA: {
      name: "CCTA",
      summary: "Anatomic test to diagnose/exclude obstructive CAD and identify plaque; used across acute pathways.",
      bullets: ["Guideline highlights use after stress testing to diagnose/exclude obstructive CAD and identify who may benefit from ICA referral."],
      notes: ["Test selection should be guided by local availability/expertise (per pathway notes)."],
    },
    FFRCT: {
      name: "FFR-CT",
      summary: "Functional assessment derived from CCTA data to guide vessel-specific ischemia assessment and revascularization decisions.",
      bullets: ["Used when stenosis is in the 40–90% range in a proximal/mid segment on CCTA (per guideline recommendations)."],
      notes: ["Guideline notes: turnaround times may impact prompt clinical care decisions."],
    },
    ICA: {
      name: "Invasive coronary angiography (ICA)",
      summary: "Invasive anatomic test; used for high-risk presentations and specific intermediate/high-risk branches.",
      bullets: ["Guideline discusses ICA as effective for diagnosing obstructive CAD and guiding revascularization decisions."],
    },
    CAC: {
      name: "Coronary artery calcium (CAC)",
      summary: "CAC can refine risk assessment and may help reduce diagnostic uncertainty / guide preventive management in selected stable patients.",
      bullets: ["CAC score of zero can identify a low-risk cohort who may not require additional diagnostic testing (stable chest pain context)."],
    },
  };

  function openModalityModal(modKey) {
    const m = MODALITIES[modKey];
    if (!m) return;

    lastFocusedEl = document.activeElement;

    modalTitle.textContent = m.name || "Testing modality";
    const bullets = (m.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("");
    const notes = (m.notes || []).map((n) => `<li>${escapeHtml(n)}</li>`).join("");

    modalBody.innerHTML = `
      <p><strong>Summary:</strong> ${escapeHtml(m.summary || "")}</p>
      ${bullets ? `<h4>Nuances</h4><ul>${bullets}</ul>` : ""}
      ${notes ? `<h4>Notes</h4><ul>${notes}</ul>` : ""}
    `;

    modalOverlay.classList.remove("hidden");
    modalClose.focus();
  }

  function closeModalityModal() {
    modalOverlay.classList.add("hidden");
    modalBody.innerHTML = "";
    if (lastFocusedEl && typeof lastFocusedEl.focus === "function") lastFocusedEl.focus();
    lastFocusedEl = null;
  }

  modalClose.addEventListener("click", closeModalityModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModalityModal();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalOverlay.classList.contains("hidden")) closeModalityModal();
  });

  // -------- Runner rendering --------
  function renderRunner() {
    const nodes = PATHWAYS[activePathwayKey];
    const node = nodes?.[activeNodeId];
    if (!node) return;

    runnerTitleEl.textContent =
      activePathwayKey === "acute" ? "Acute chest pain pathway" : "Pathway";

    const pageId = PAGE_IDS[activePathwayKey]?.[activeNodeId] || "—";
    runnerStepEl.textContent = `${activePathwayKey === "acute" ? "Acute" : "—"} • ${pageId}`;

    nodeTitleEl.textContent = node.title || "";
    nodeBodyEl.textContent = node.body || "";

    // Subactions (contextual links)
    runnerSubactionsEl.innerHTML = "";
    if (nodeMentionsTesting(node)) {
      const btn = document.createElement("button");
      btn.className = "linklike";
      btn.textContent = "Open testing contraindications (new window)";
      btn.addEventListener("click", () => openNewWindowToHash("#contra"));
      runnerSubactionsEl.appendChild(btn);
    }

    // Flags
    nodeFlagsEl.innerHTML = "";
    if (node.flags && node.flags.length) {
      nodeFlagsEl.innerHTML = node.flags
        .map((f) => makeFlagPill(f.level || "ok", f.text || ""))
        .join("");
    }

    // Resources
    if (node.resources && node.resources.length) {
      nodeResourcesEl.classList.remove("hidden");
      nodeResourcesEl.innerHTML = `
        <div class="resources-title">Resources (2021 ACC/AHA Chest Pain Guideline)</div>
        <div class="resources-grid">
          ${node.resources
            .map(
              (r) => `
              <button class="resource-btn" data-url="${escapeHtml(r.url)}">
                ${escapeHtml(r.label)}
              </button>
            `
            )
            .join("")}
        </div>
        <div class="muted" style="margin-top:.6rem;font-size:.9rem;">
          Citation: 2021 ACC/AHA Chest Pain Guideline. DOI: 10.1161/CIR.0000000000001029
        </div>
      `;

      nodeResourcesEl.querySelectorAll("button[data-url]").forEach((b) => {
        b.addEventListener("click", () => {
          const url = b.getAttribute("data-url");
          window.open(url, "_blank", "noopener,noreferrer");
        });
      });
    } else {
      nodeResourcesEl.classList.add("hidden");
      nodeResourcesEl.innerHTML = "";
    }

    // Options / terminal
    nodeOptionsEl.innerHTML = "";
    nodeTerminalEl.classList.add("hidden");
    nodeTerminalEl.innerHTML = "";

    if (node.type === "decision") {
      node.options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.innerHTML = `
          <div>${escapeHtml(opt.label)}</div>
          ${opt.sub ? `<span class="choice-sub">${escapeHtml(opt.sub)}</span>` : ""}
        `;

        btn.addEventListener("click", () => {
          if (opt.action === "OPEN_HEART") {
            window.open("https://heart-score-calculator.netlify.app", "_blank", "noopener,noreferrer");
            return;
          }
          if (opt.action === "OPEN_MODALITY" && opt.modalityKey) {
            openModalityModal(opt.modalityKey);
            return;
          }
          if (opt.action === "OPEN_URL" && opt.url) {
            window.open(opt.url, "_blank", "noopener,noreferrer");
            return;
          }
          if (opt.next) goTo(opt.next);
        });

        nodeOptionsEl.appendChild(btn);
      });
    } else if (node.type === "step") {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = node.continueLabel || "Continue";
      btn.addEventListener("click", () => {
        if (node.action === "OPEN_HEART") {
          window.open("https://heart-score-calculator.netlify.app", "_blank", "noopener,noreferrer");
          return;
        }
        if (node.next) goTo(node.next);
      });
      nodeOptionsEl.appendChild(btn);

      // Optional secondary button (used for Page A-004 requirement)
      if (node.secondaryAction) {
        const btn2 = document.createElement("button");
        btn2.className = "choice-btn";
        btn2.textContent = node.secondaryAction.label;
        btn2.addEventListener("click", () => {
          if (node.secondaryAction.action === "OPEN_HEART") {
            window.open("https://heart-score-calculator.netlify.app", "_blank", "noopener,noreferrer");
          } else if (node.secondaryAction.action === "OPEN_URL") {
            window.open(node.secondaryAction.url, "_blank", "noopener,noreferrer");
          }
        });
        nodeOptionsEl.insertBefore(btn2, btn);
      }
    } else if (node.type === "terminal") {
      nodeTerminalEl.classList.remove("hidden");
      nodeTerminalEl.innerHTML = `
        <div class="terminal-title">End of pathway</div>
        <p class="terminal-body">${escapeHtml(node.disposition || "")}</p>
      `;

      // If terminal recommends tests, show them as modality links
      if (node.recommendedTests && node.recommendedTests.length) {
        const wrap = document.createElement("div");
        wrap.style.marginTop = "0.75rem";
        wrap.innerHTML = `<div class="muted" style="margin-bottom:.5rem;">Testing modality info:</div>`;
        node.recommendedTests.forEach((t) => {
          const map = {
            EX_ECG: "EX_ECG",
            "Exercise ECG": "EX_ECG",
            "Stress echo": "STRESS_ECHO",
            "Stress echocardiography": "STRESS_ECHO",
            "Stress PET": "PET",
            PET: "PET",
            SPECT: "SPECT",
            "Stress SPECT": "SPECT",
            CMR: "CMR",
            "Stress CMR": "CMR",
            CCTA: "CCTA",
            "FFR-CT": "FFRCT",
            FFRCT: "FFRCT",
            ICA: "ICA",
            CAC: "CAC",
          };

          const key = map[t] || null;
          const btn = document.createElement("button");
          btn.className = "linklike";
          btn.textContent = `Open: ${t}`;
          btn.addEventListener("click", () => {
            if (!key) return;
            openModalityModal(key);
          });
          wrap.appendChild(btn);
          wrap.appendChild(document.createElement("br"));
        });
        nodeTerminalEl.appendChild(wrap);
      }
    }

    // Update nav buttons
    btnBack.disabled = historyStack.length === 0;
  }

  // -------- Acute pathway definition (with your requested edits) --------
  function buildAcutePathway() {
    // DOI link for resource box
    const DOI_URL = "https://doi.org/10.1161/CIR.0000000000001029";

    return {
      // Page A-001
      A0: {
        id: "A0",
        type: "step",
        title: "Initial evaluation",
        body: "ECG (review for STEMI within 10 minutes), history, physical examination, chest XR, and troponins",
        continueLabel: "Continue",
        next: "A1",
      },

      // Page A-002 (buttons consistent + STEMI + examples + resources)
      A1: {
        id: "A1",
        type: "decision",
        title: "ECG / initial assessment outcome",
        body: "Select the best match for the current presentation.",
        resources: [
          { label: "Probability of ischemia based on chest pain description (Figure 2)", url: DOI_URL },
          { label: "Chest pain history (Table 3)", url: DOI_URL },
          { label: "Chest pain physical exam (Table 4)", url: DOI_URL },
          { label: "EKG interpretation flowsheet (Figure 4)", url: DOI_URL },
        ],
        options: [
          {
            label: "STEMI",
            sub: "Meets STEMI criteria on ECG.",
            next: "A_STEMI",
          },
          {
            label: "Obvious noncardiac cause",
            sub: "Examples: PE, aortic dissection, esophageal rupture, esophagitis, PUD, gallbladder dz, PNA, pneumothorax, costochondritis, Tietze syndrome, herpes zoster.",
            next: "A2_NONCARDIAC",
          },
          {
            label: "Obvious non-ischemic cardiac cause",
            sub: "Examples: arrhythmia, aortic stenosis, aortic regurgitation, hypertrophic cardiomyopathy, pericarditis, myocarditis.",
            next: "A2_NONISCHEMIC_CARDIAC",
          },
          {
            label: "Possible ACS",
            sub: "Examples: UA, NSTEMI.",
            next: "A3_POSSIBLE_ACS",
          },
        ],
      },

      A_STEMI: {
        id: "A_STEMI",
        type: "terminal",
        title: "STEMI pathway",
        disposition:
          "STEMI guidelines: ASA load, supplemental O2 of SpO2<90%, reperfusion (door-to-balloon under 90mins [120 minutes if transfer possible] OR fibrinolysis within 30 mins of arrival followed by PCI within 3-24 hrs), P2Y12 inhibitor, high-intensity statin, beta-blocker (if no contraindications), ACEi/ARB within 24 hrs, MRA (if HF), pain control.",
        flags: [{ level: "danger", text: "End of pathway" }],
      },

      A2_NONCARDIAC: {
        id: "A2_NONCARDIAC",
        type: "terminal",
        title: "Obvious noncardiac cause",
        disposition: "No cardiac testing required (per guideline pathway).",
        flags: [{ level: "ok", text: "End of pathway" }],
      },

      A2_NONISCHEMIC_CARDIAC: {
        id: "A2_NONISCHEMIC_CARDIAC",
        type: "terminal",
        title: "Obvious non-ischemic cardiac cause",
        disposition: "Other cardiac testing as needed (per guideline pathway).",
        flags: [{ level: "ok", text: "End of pathway" }],
      },

      // Page A-004 requirement: CDP click opens HEART score app
      A3_POSSIBLE_ACS: {
        id: "A3_POSSIBLE_ACS",
        type: "step",
        title: "Possible ACS",
        body: "Obtain troponin.",
        continueLabel: "Troponin obtained → continue",
        next: "A4_RISK_STRATIFY",
      },

      A4_RISK_STRATIFY: {
        id: "A4_RISK_STRATIFY",
        type: "step",
        title: "Risk stratification",
        body: "Use a clinical decision pathway (CDP) to risk stratify.",
        // Secondary button opens HEART calculator without advancing
        secondaryAction: { label: "Open CDP (HEART score) in new window", action: "OPEN_HEART" },
        continueLabel: "Continue",
        next: "A5_RISK_BUCKET",
      },

      // Page A-005: buttons styled consistently (CSS does this)
      A5_RISK_BUCKET: {
        id: "A5_RISK_BUCKET",
        type: "decision",
        title: "Risk category",
        body: "Select risk category.",
        options: [
          { label: "Low risk", next: "A_TERM_LOW" },
          { label: "Intermediate risk", next: "A6_INTERMEDIATE_CAD_KNOWN" },
          { label: "High risk", next: "A_TERM_ICA_CLASS1" },
        ],
      },

      A_TERM_LOW: {
        id: "A_TERM_LOW",
        type: "terminal",
        title: "Low risk",
        disposition: "No testing required → discharge.",
        flags: [{ level: "ok", text: "End of pathway" }],
      },

      // Page A-006: known CAD definition + routing fix
      A6_INTERMEDIATE_CAD_KNOWN: {
        id: "A6_INTERMEDIATE_CAD_KNOWN",
        type: "decision",
        title: "Intermediate risk",
        body: "Known CAD? Note: known CAD is prior MI, revascularization, known obstructive or nonobstructive CAD on invasive or CCTA.",
        options: [
          { label: "No known CAD", next: "A_INO0" },
          // FIX: Known CAD goes directly to A-030 equivalent (A_IK1)
          { label: "Known CAD", next: "A_IK1" },
        ],
      },

      // ---------------- ACUTE INTERMEDIATE: NO KNOWN CAD ----------------
      A_INO0: {
        id: "A_INO0",
        type: "decision",
        title: "Intermediate risk + no known CAD",
        body: "Prior testing available?",
        options: [
          { label: "Yes", next: "A_INO_PRIOR_Y" },
          { label: "No", next: "A_INO_PRIOR_N" },
        ],
      },

      A_INO_PRIOR_Y: {
        id: "A_INO_PRIOR_Y",
        type: "decision",
        title: "Prior testing (yes)",
        body: "Which best describes prior testing?",
        options: [
          {
            label: "Recent negative test*",
            sub: "Normal CCTA ≤2 years OR negative stress test ≤1 year (adequate stress).",
            next: "A_TERM_DISCHARGE_INOCA",
          },
          {
            label: "Prior inconclusive or mildly abnormal stress test ≤1 year",
            next: "A_INO_CCTA_AFTER_INCONC_STRESS",
          },
          {
            label: "Prior moderate–severely abnormal ≤1 year (no interval ICA)",
            next: "A_TERM_ICA_CLASS1",
          },
        ],
      },

      // Page A-013 change
      A_INO_CCTA_AFTER_INCONC_STRESS: {
        id: "A_INO_CCTA_AFTER_INCONC_STRESS",
        type: "step",
        title: "Next test",
        body: "CCTA (2a recommendation)",
        continueLabel: "CCTA result available → continue",
        next: "A_INO_CCTA_RESULTS_1",
      },

      // Page A-014: indicate Class 1 for stress and CCTA
      A_INO_PRIOR_N: {
        id: "A_INO_PRIOR_N",
        type: "decision",
        title: "No prior testing",
        body: "Select initial test strategy (guided by local availability/expertise).",
        options: [
          {
            label: "Stress testing (Class 1 recommendation)",
            sub: "Exercise ECG, stress CMR, stress echocardiography, stress PET, or stress SPECT.",
            next: "A_INO_STRESS_RESULTS",
          },
          { label: "CCTA (Class 1 recommendation)", next: "A_INO_CCTA_RESULTS_ENTRY" },
        ],
      },

      A_INO_STRESS_RESULTS: {
        id: "A_INO_STRESS_RESULTS",
        type: "decision",
        title: "Stress testing result",
        body: "Select stress testing outcome.",
        options: [
          { label: "Negative or mildly abnormal", next: "A_TERM_DISCHARGE_INOCA" },
          { label: "Moderate–severe ischemia", next: "A_TERM_ICA_CLASS1" },
          { label: "Inconclusive", next: "A_INO_CCTA_AFTER_INCONCLUSIVE_STRESS" },
        ],
      },

      // Page A-016: remove parenthetical + indicate class 1
      A_INO_CCTA_AFTER_INCONCLUSIVE_STRESS: {
        id: "A_INO_CCTA_AFTER_INCONCLUSIVE_STRESS",
        type: "step",
        title: "Next test",
        body: "CCTA (Class 1 recommendation).",
        continueLabel: "CCTA result available → continue",
        next: "A_INO_CCTA_RESULTS_2",
      },

      A_INO_CCTA_RESULTS_ENTRY: {
        id: "A_INO_CCTA_RESULTS_ENTRY",
        type: "step",
        title: "CCTA performed",
        body: "Proceed with CCTA.",
        continueLabel: "CCTA result available → continue",
        next: "A_INO_CCTA_RESULTS_2",
      },

      A_INO_CCTA_RESULTS_1: {
        id: "A_INO_CCTA_RESULTS_1",
        type: "decision",
        title: "CCTA result",
        body: "Select CCTA interpretation.",
        options: [
          { label: "Nonobstructive CAD (<50% stenosis)", next: "A_TERM_DISCHARGE_INOCA" },
          { label: "Inconclusive stenosis", next: "A_INO_FFRCT_STRESS_OR_MED" },
          { label: "Obstructive CAD (≥50% stenosis)", next: "A_INO_OBS_BRANCH" },
        ],
      },

      A_INO_CCTA_RESULTS_2: {
        id: "A_INO_CCTA_RESULTS_2",
        type: "decision",
        title: "CCTA result",
        body: "Select CCTA interpretation.",
        options: [
          { label: "Nonobstructive CAD (<50% stenosis)", next: "A_TERM_DISCHARGE_INOCA" },
          // YOUR REQUEST: if inconclusive OR obstructive>50% without high-risk/frequent angina → allow FFR-CT, stress, OR treat medically
          { label: "Inconclusive stenosis", next: "A_INO_FFRCT_STRESS_OR_MED" },
          { label: "Obstructive CAD (≥50% stenosis)", next: "A_INO_OBS_BRANCH" },
        ],
      },

      // Page A-020 / A-021 equivalent: include (2a) + remove decision-to-treat-medically in the *old* A-020; now this node includes it per your newest spec
      A_INO_FFRCT_STRESS_OR_MED: {
        id: "A_INO_FFRCT_STRESS_OR_MED",
        type: "decision",
        title: "Next step after inconclusive CCTA / obstructive CAD without high-risk features",
        body: "Choose add-on test or decision to treat medically.",
        flags: [{ level: "warning", text: "FFR-CT turnaround time may affect prompt care decisions." }],
        options: [
          { label: "FFR-CT (2a recommendation)", next: "A_INO_FFRCT_RESULTS" },
          { label: "Stress testing (2a recommendation)", next: "A_INO_STRESS_RESULTS_POSTCCTA" },
          { label: "Decision to treat medically", next: "A_INO_GDMT_DISCHARGE_CLASS1" },
        ],
      },

      A_INO_FFRCT_RESULTS: {
        id: "A_INO_FFRCT_RESULTS",
        type: "decision",
        title: "FFR-CT / stress result available",
        body: "FFR-CT ≤0.8 or moderate–severe ischemia?",
        options: [
          { label: "No", next: "A_INO_GDMT_DISCHARGE_CLASS1" },
          { label: "Yes", next: "A_TERM_ICA_CLASS1" },
        ],
      },

      A_INO_STRESS_RESULTS_POSTCCTA: {
        id: "A_INO_STRESS_RESULTS_POSTCCTA",
        type: "decision",
        title: "Stress testing result (post-CCTA)",
        body: "Moderate–severe ischemia?",
        options: [
          { label: "No", next: "A_INO_GDMT_DISCHARGE_CLASS1" },
          { label: "Yes", next: "A_TERM_ICA_CLASS1" },
        ],
      },

      // Page A-024 / A-028: class 1 GDMT then discharge
      A_INO_GDMT_DISCHARGE_CLASS1: {
        id: "A_INO_GDMT_DISCHARGE_CLASS1",
        type: "terminal",
        title: "Guideline-directed medical therapy",
        disposition: "Proceed with guideline-directed medical therapy (GDMT) (Class 1 recommendation) → discharge.",
        flags: [{ level: "ok", text: "End of pathway" }],
      },

      // Page A-025: high-risk CAD definition + branch
      A_INO_OBS_BRANCH: {
        id: "A_INO_OBS_BRANCH",
        type: "decision",
        title: "Obstructive CAD (≥50% stenosis)",
        body: "High-risk CAD or frequent angina? High-risk CAD means left main stenosis ≥ 50%; anatomically significant 3-vessel disease (≥70% stenosis).",
        options: [
          { label: "High-risk CAD or frequent angina", next: "A_TERM_ICA_CLASS1" },
          // Not high-risk/frequent angina -> per your request: allow treat medically OR FFR-CT/stress
          { label: "Not high-risk CAD / not frequent angina", next: "A_INO_FFRCT_STRESS_OR_MED" },
        ],
      },

      // ---------------- ACUTE INTERMEDIATE: KNOWN CAD ----------------
      // Page A-030 notes: obstructive includes prior CABG/PCI + high-risk definition
      A_IK1: {
        id: "A_IK1",
        type: "decision",
        title: "Intermediate risk + known CAD",
        body:
          "Select known CAD category.\n\nObstructive CAD includes prior coronary artery bypass graft/percutaneous coronary intervention.\nHigh-risk CAD means left main stenosis ≥50%; anatomically significant 3-vessel disease (≥70% stenosis).",
        options: [
          { label: "Nonobstructive CAD (<50% stenosis)", next: "A_IK_NONOBS_OPTIONS" },
          { label: "Obstructive CAD (≥50% stenosis)", next: "A_IK_OBS_STRESS" },
        ],
      },

      // Page A-030 nonobstructive branch: CCTA 2a, stress 2a, defer testing + intensify GDMT class 1
      A_IK_NONOBS_OPTIONS: {
        id: "A_IK_NONOBS_OPTIONS",
        type: "decision",
        title: "Nonobstructive CAD options",
        body:
          "Choose testing strategy or defer testing.\n\nNote: If extensive plaque is present a high-quality CCTA is unlikely to be achieved, and stress testing is preferred.",
        options: [
          { label: "CCTA (2a recommendation)", next: "A_IK_NONOBS_CCTA_RES" },
          {
            label: "Stress testing (2a recommendation)",
            sub: "Stress CMR, stress echo, stress PET, or stress SPECT (all 2a recommendations).",
            next: "A_IK_NONOBS_STRESS_RES",
          },
          { label: "Defer testing and intensify GDMT (Class 1 recommendation)", next: "A_IK_GDMT_DEFER" },
        ],
      },

      A_IK_GDMT_DEFER: {
        id: "A_IK_GDMT_DEFER",
        type: "terminal",
        title: "GDMT optimization",
        disposition: "Option to defer testing and intensify GDMT (Class 1 recommendation) → discharge.",
        flags: [{ level: "ok", text: "End of pathway" }],
      },

      A_IK_NONOBS_CCTA_RES: {
        id: "A_IK_NONOBS_CCTA_RES",
        type: "decision",
        title: "CCTA result",
        body: "Select CCTA interpretation.",
        options: [
          { label: "No change", next: "A_TERM_DISCHARGE_SIMPLE" },
          { label: "Obstructive CAD (≥50% stenosis)", next: "A_IK_NONOBS_FFR_OR_STRESS" },
        ],
      },

      // Page A-033: add (2a) and remove “per pathway”
      A_IK_NONOBS_FFR_OR_STRESS: {
        id: "A_IK_NONOBS_FFR_OR_STRESS",
        type: "decision",
        title: "Next step",
        body: "Choose add-on test.",
        options: [
          { label: "FFR-CT (2a recommendation)", next: "A_IK_NONOBS_FFR_RES" },
          { label: "Stress testing (2a recommendation)", next: "A_IK_NONOBS_FFR_RES" },
        ],
      },

      A_IK_NONOBS_FFR_RES: {
        id: "A_IK_NONOBS_FFR_RES",
        type: "decision",
        title: "FFR-CT / stress result",
        body: "FFR-CT ≤0.8 or moderate–severe ischemia?",
        options: [
          { label: "No", next: "A_IK_GDMT_DEFER" },
          { label: "Yes", next: "A_TERM_ICA_CLASS1" },
        ],
      },

      A_IK_NONOBS_STRESS_RES: {
        id: "A_IK_NONOBS_STRESS_RES",
        type: "decision",
        title: "Stress testing result",
        body: "Select result.",
        options: [
          { label: "Mild ischemia", next: "A_IK_GDMT_DEFER" },
          { label: "Moderate–severe ischemia", next: "A_TERM_ICA_CLASS1" },
          { label: "Inconclusive", next: "A_IK_NONOBS_FFR_OR_STRESS" },
        ],
      },

      // Page A-035: indicate tests are 2a
      A_IK_OBS_STRESS: {
        id: "A_IK_OBS_STRESS",
        type: "step",
        title: "Stress testing (2a recommendation)",
        body: "Stress CMR, stress echocardiography, stress PET, or stress SPECT (2a recommendations).",
        continueLabel: "Stress test result available → continue",
        next: "A_IK_OBS_STRESS_RES",
      },

      A_IK_OBS_STRESS_RES: {
        id: "A_IK_OBS_STRESS_RES",
        type: "decision",
        title: "Functional test result",
        body: "Select functional test outcome.",
        options: [
          // NEW terminal discharge so it does not go to INOCA discharge
          { label: "Normal functional test", next: "A_TERM_DISCHARGE_SIMPLE" },
          { label: "Abnormal functional test", next: "A_IK_OBS_ABN_NOTE" },
        ],
      },

      // Page A-037: update text
      A_IK_OBS_ABN_NOTE: {
        id: "A_IK_OBS_ABN_NOTE",
        type: "step",
        title: "Abnormal functional test",
        body: "Per pathway: option to defer ICA with mildly abnormal test (discuss with cardiologist); otherwise proceed to ICA.",
        continueLabel: "Proceed",
        next: "A_TERM_ICA_CLASS1",
      },

      // Terminals
      A_TERM_DISCHARGE_SIMPLE: {
        id: "A_TERM_DISCHARGE_SIMPLE",
        type: "terminal",
        title: "Discharge",
        disposition: "Discharge.",
        flags: [{ level: "ok", text: "End of pathway" }],
      },

      // Page A-038: update discharge text
      A_TERM_DISCHARGE_INOCA: {
        id: "A_TERM_DISCHARGE_INOCA",
        type: "terminal",
        title: "Discharge",
        disposition: "Discharge and consider INOCA pathway as an outpatient for frequent or persistent symptoms",
        flags: [{ level: "ok", text: "End of pathway" }],
      },

      // Page A-039: ICA class 1
      A_TERM_ICA_CLASS1: {
        id: "A_TERM_ICA_CLASS1",
        type: "terminal",
        title: "Invasive coronary angiography",
        disposition: "Invasive coronary angiography (ICA) (Class 1 recommendation).",
        flags: [{ level: "danger", text: "End of pathway" }],
        recommendedTests: ["ICA"],
      },
    };
  }

  // -------- Evidence view init --------
  const evidenceContentEl = document.getElementById("evidence-content");
  const evidenceSearchEl = document.getElementById("evidence-search");
  renderAccordion(evidenceContentEl, EVIDENCE_SECTIONS);

  evidenceSearchEl.addEventListener("input", () => {
    renderAccordion(evidenceContentEl, EVIDENCE_SECTIONS, evidenceSearchEl.value);
  });

  // -------- Contra view init --------
  const contraContentEl = document.getElementById("contra-content");
  renderAccordion(contraContentEl, CONTRA_SECTIONS);

  // -------- Routing / buttons --------
  btnStartAcute.addEventListener("click", () => startPathway("acute", "A0"));

  // Stable should immediately open module (your request)
  btnStartStable.addEventListener("click", () => {
    window.location.href = "./stable/index.html";
  });

  btnExploreModalities.addEventListener("click", () => openModalityModal("CCTA"));
  // (You can later replace this with your separate “overview page” when you upload the text.)

  btnEvidence.addEventListener("click", () => {
    showView("evidence");
    window.location.hash = "#evidence";
  });

  btnContra.addEventListener("click", () => {
    showView("contra");
    window.location.hash = "#contra";
  });

  btnEvidenceHome.addEventListener("click", goHome);
  btnContraHome.addEventListener("click", goHome);

  btnBack.addEventListener("click", backOne);
  btnReset.addEventListener("click", resetPathway);
  btnHome.addEventListener("click", goHome);

  // Hash routing on load (supports “open in new window”)
  function routeFromHash() {
    if (window.location.hash === "#evidence") {
      showView("evidence");
      return true;
    }
    if (window.location.hash === "#contra") {
      showView("contra");
      return true;
    }
    return false;
  }
  if (!routeFromHash()) {
    goHome();
  }
  window.addEventListener("hashchange", () => {
    if (!routeFromHash()) goHome();
  });
});
