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

  // ----------------------------
  // Recommendations + Contra data
  // ----------------------------

  // Recommendations.txt (raw, embedded)  :contentReference[oaicite:2]{index=2}
  const RECOMMENDATIONS_RAW = `### How this works well in the APP

* Each section can be:
  * Collapsible
  * Filtered by **COR strength**
  * Tagged to **acute-entry**, **history**, or **diagnostic-testing** modules
* COR/LOE labels align cleanly with your existing **reference + explanation patterns**

# ACC/AHA Chest Pain Guideline — Key Recommendations (Condensed)

---

## **1.4.2. Defining Chest Pain**

**Initial triage**

* Use early assessment of chest pain to triage patients based on likelihood of myocardial ischemia¹–⁷
  **(COR 1, LOE B-NR)**

**Terminology**

* Avoid the term *“atypical chest pain”*
* Describe symptoms as:
  * **Cardiac**
  * **Possibly cardiac**
  * **Noncardiac**
    These terms are more specific and reduce misclassification¹–⁷
    **(COR 1, LOE C-LD)**

---

## **2. Initial Evaluation**

### **2.1. History**

* Obtain a **focused history** that includes:
  * Symptom characteristics
  * Symptom duration
  * Associated features
  * Cardiovascular risk factors
    **(COR 1, LOE C-LD)**

---

### **2.1.1. Focus on the Uniqueness of Chest Pain in Women**

* Women presenting with chest pain are at risk for **underdiagnosis**; cardiac causes should **always be considered**¹–⁷
  **(COR 1, LOE B-NR)**

* History in women should emphasize **accompanying symptoms** more common in ACS (e.g., dyspnea, fatigue, nausea)¹–⁷
  **(COR 1, LOE B-NR)**

---

### **2.1.2. Considerations for Older Patients With Chest Pain**

* In patients **>75 years**, consider ACS when chest pain is accompanied by:
  * Shortness of breath
  * Syncope
  * Acute delirium
  * Unexplained fall
    **(COR 1, LOE C-LD)**

---

### **2.1.3. Considerations for Diverse Patient Populations**

* Use **cultural competency training** to improve outcomes in patients from diverse racial and ethnic backgrounds
  **(COR 1, LOE C-LD)**

* When English is not a patient’s primary language, use **formal medical translation services** to address language barriers
  **(COR 1, LOE C-LD)**

---

### **2.1.4. Patient-Centric Considerations**

* For **acute chest pain**, patients or bystanders should activate **9-1-1** to initiate EMS transport to the nearest ED
  **(COR 1, LOE C-LD)**

---

## **2.2. Physical Examination**

* Perform an **initial focused cardiovascular examination** to:
  * Aid in diagnosis of ACS
  * Identify other life-threatening causes (e.g., aortic dissection, PE, esophageal rupture)
  * Detect complications
    **(COR 1, LOE C-EO)**

---

## **2.3. Diagnostic Testing**

### **2.3.1. Setting Considerations**

* If no clear noncardiac cause is evident, obtain an **ECG** for patients with stable chest pain seen in office settings; refer to the ED if ECG is unavailable¹–⁵
  **(COR 1, LOE B-NR)**

* Patients with suspected ACS or other life-threatening causes in the office setting should be **urgently transported to the ED**, ideally by EMS¹–⁹
  **(COR 1, LOE C-LD)**

* In **all settings**, obtain and review an ECG within **10 minutes** of arrival for patients with acute chest pain¹,³,⁶,⁷,¹⁰
  **(COR 1, LOE C-LD)**

* Measure **cardiac troponin (cTn)** as soon as possible after ED presentation in suspected ACS⁸,⁹
  **(COR 1, LOE C-LD)**

* **Avoid delayed ED transfer** for patients with suspected ACS initially evaluated in outpatient settings when diagnostic testing (e.g., cTn) is required
  **(COR 3: Harm, LOE C-LD)**

---

### **2.3.2. Electrocardiogram**

* If the initial ECG is nondiagnostic, perform **serial ECGs** to detect ischemic changes, especially when:
  * Clinical suspicion for ACS is high
  * Symptoms persist
  * Clinical status worsens¹
    **(COR 1, LOE C-EO)**

* Treat patients with ECG findings consistent with ACS according to **STEMI or NSTE-ACS guidelines**¹,²
  **(COR 1, LOE C-EO)**

* In patients with intermediate-to-high suspicion for ACS and a nondiagnostic ECG, **posterior leads (V7–V9)** are reasonable to evaluate for posterior MI³–⁵
  **(COR 2a, LOE B-NR)**

---

### **2.3.3. Chest Radiography**

* Obtain a **chest radiograph** in acute chest pain to evaluate for alternative cardiac, pulmonary, or thoracic causes
  **(COR 1, LOE C-EO)**

---

## **2.3.4. Biomarkers**

* Serial **cardiac troponin (cTn)** measurements are useful to identify abnormal values and **rising or falling patterns** consistent with acute myocardial injury¹–²¹
  **(COR 1, LOE B-NR)**

* **High-sensitivity cTn (hs-cTn)** is the **preferred biomarker** for acute chest pain because it improves detection and exclusion of myocardial injury and increases diagnostic accuracy¹,⁷,²¹–²⁶
  **(COR 1, LOE B-NR)**

* Clinicians should be familiar with the **99th percentile upper reference limit** for the specific cTn assay used at their institution²³,²⁶
  **(COR 1, LOE C-EO)**

* With availability of cTn, **CK-MB and myoglobin are not useful** for diagnosing acute myocardial injury²⁷–³²
  **(COR 3: No Benefit, LOE B-NR)**
`;

  // ContraindicationsImagingModality.txt (raw, embedded)  :contentReference[oaicite:3]{index=3}
  const CONTRA_RAW = `# Contraindications by Imaging Modality

---

## **Exercise ECG**

**Contraindicated or Not Appropriate When:**

* Abnormal resting ECG limiting interpretation:
  * Left bundle branch block
  * Ventricular paced rhythm
  * Parkinson-White pattern
* Unable to achieve ≥5 METs or unsafe to exercise
* High-risk or active ischemia:
  * High-risk unstable angina
  * Active ACS or AMI (<2 days)
* Uncontrolled cardiac conditions:
  * Heart failure
  * Significant arrhythmias (VT, complete AV block, high-risk QT-related arrhythmias)
* Severe symptomatic aortic stenosis
* Severe **systemic arterial hypertension** (≈ ≥200/110 mm Hg)
* Acute systemic illness:
  * Acute PE
  * Acute myocarditis/pericarditis
  * Acute aortic dissection

---

## **Stress Nuclear Imaging (SPECT / PET)**

**Contraindicated or Not Appropriate When:**

* High-risk unstable angina or complicated ACS / AMI (<2 days)
* Contraindications to vasodilator stress:
  * Significant arrhythmias (VT, advanced AV block)
  * Sinus bradycardia (<45 bpm)
  * Hypotension (SBP <90 mm Hg)
  * Known or suspected bronchoconstrictive or bronchospastic disease
* Recent use of dipyridamole or dipyridamole-containing medications
* Recent methylxanthine use (e.g., caffeine, aminophylline within 12 h)
* Known hypersensitivity to adenosine or regadenoson
* Severe **systemic arterial hypertension** (≈ ≥200/110 mm Hg)

---

## **Stress Echocardiography**

**Contraindicated or Limited When:**

* Poor acoustic windows (e.g., COPD, obesity)
* Inability to reach target heart rate
* Uncontrolled heart failure
* High-risk unstable angina or active ACS / AMI (<2 days)
* Serious ventricular arrhythmias or high-risk QT prolongation
* Significant respiratory failure:
  * Severe COPD
  * Acute pulmonary embolism
  * Severe pulmonary hypertension
* Critical aortic stenosis
* Acute illnesses:
  * Acute PE
  * Acute myocarditis/pericarditis
  * Acute aortic dissection
* Hemodynamically significant LV outflow tract obstruction
* Contraindications to atropine:
  * Narrow-angle glaucoma
  * Myasthenia gravis
  * Obstructive uropathy
  * Obstructive gastrointestinal disorders
* Severe **systemic arterial hypertension** (≈ ≥200/110 mm Hg)

**Contrast-Specific Contraindications:**

* Hypersensitivity to perflutren
* Hypersensitivity to blood products or albumin (Optison only)

---

## **Stress Cardiac MRI (CMR)**

**Contraindicated or Limited When:**

* Reduced renal function (eGFR <30 mL/min/1.73 m²)
* Contraindications to vasodilator stress
* Implanted devices not MRI-safe or causing major artifact
* Significant claustrophobia
* Caffeine ingestion within past 12 hours

---

## **Coronary CT Angiography (CCTA)**

**Contraindicated or Limited When:**

* Allergy to iodinated contrast
* Inability to cooperate with scan or breath-hold instructions
* Clinical instability:
  * Acute respiratory distress
  * Severe hypotension
  * Unstable arrhythmia
* Renal impairment per institutional protocol
* Inability to achieve adequate heart rate control:
  * Contraindication to beta-blockers
  * No alternative rate-control agents available
* Significant heart rate variability or arrhythmia
* Contraindication to nitroglycerin (if required for protocol)

---

## **Global Imaging Considerations**

* Inability to obtain **diagnostic image quality** should prompt alternative testing, especially in obese patients
* Pregnancy screening should follow institutional radiation-safety policies
* Low-dose dobutamine may be useful for assessing low-gradient aortic stenosis
`;

  /**
   * Parse markdown-ish text into mobile-friendly accordion sections.
   * - Top-level sections: lines starting with "## "
   * - Subsections (optional): lines starting with "### " or "**Title**"
   * - Bullets: lines starting with "* "
   * - Other text: collected into paragraphs
   */
  function parseGuidelineMarkdown(raw) {
    const lines = raw.split("\n");
    const sections = [];
    let current = null;

    function pushCurrent() {
      if (!current) return;
      const hasContent =
        (current.paragraphs && current.paragraphs.length) ||
        (current.bullets && current.bullets.length) ||
        (current.sub && current.sub.length);
      if (hasContent) sections.push(current);
      current = null;
    }

    function normalizeHeading(h) {
      return h
        .replaceAll("**", "")
        .replaceAll("#", "")
        .replaceAll("---", "")
        .trim();
    }

    function startSection(title) {
      pushCurrent();
      current = { title: normalizeHeading(title), paragraphs: [], bullets: [], sub: [] };
    }

    function addSubheading(title) {
      if (!current) startSection("Section");
      current.sub.push({ heading: normalizeHeading(title), paragraphs: [], bullets: [] });
    }

    function addPara(text) {
      if (!current) startSection("Section");
      const target = current.sub.length ? current.sub[current.sub.length - 1] : current;
      target.paragraphs.push(text);
    }

    function addBullet(text) {
      if (!current) startSection("Section");
      const target = current.sub.length ? current.sub[current.sub.length - 1] : current;
      target.bullets.push(text);
    }

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];

      if (ln.trim().startsWith("## ")) {
        startSection(ln.trim().slice(3));
        continue;
      }
      if (ln.trim().startsWith("### ")) {
        addSubheading(ln.trim().slice(4));
        continue;
      }

      // Bold-only lines often used as subheadings in your file (e.g., **Initial triage**)
      const boldOnly = ln.trim().match(/^\*\*.+\*\*$/);
      if (boldOnly) {
        addSubheading(ln.trim());
        continue;
      }

      // Bullets
      if (ln.trim().startsWith("* ")) {
        addBullet(ln.trim().slice(2));
        continue;
      }

      // Ignore separators
      if (ln.trim() === "---" || ln.trim() === "") continue;

      // Paragraph
      addPara(ln.trim());
    }

    pushCurrent();
    return sections;
  }

  function renderParsedAccordion(containerEl, sections, searchValue = "", options = {}) {
    const q = searchValue.trim().toLowerCase();
    const openFirst = options.openFirst ?? false;

    const html = sections
      .map((sec, idx) => {
        const blob = JSON.stringify(sec).toLowerCase();
        if (q && !blob.includes(q)) return "";

        const renderBlock = (b) => {
          const paras = (b.paragraphs || [])
            .map((p) => `<p>${escapeHtml(p)}</p>`)
            .join("");

          const bullets = (b.bullets || []).length
            ? `<ul>${b.bullets.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`
            : "";

          return `<div class="acc-body">${paras}${bullets}</div>`;
        };

        const subHtml = (sec.sub || [])
          .map(
            (s) => `
              <details>
                <summary>${escapeHtml(s.heading)}</summary>
                ${renderBlock(s)}
              </details>
            `
          )
          .join("");

        const topParas = (sec.paragraphs || []).length
          ? sec.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")
          : "";

        const topBullets = (sec.bullets || []).length
          ? `<ul>${sec.bullets.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`
          : "";

        return `
          <details ${openFirst && idx === 0 ? "open" : ""}>
            <summary>${escapeHtml(sec.title)}</summary>
            <div class="acc-body">
              ${topParas}
              ${topBullets}
              ${subHtml}
            </div>
          </details>
        `;
      })
      .join("");

    containerEl.innerHTML = html || `<p class="muted">No matches.</p>`;
  }

  // Build accordions from the uploaded-file content
  const RECOMMENDATIONS_SECTIONS = parseGuidelineMarkdown(RECOMMENDATIONS_RAW);
  const CONTRA_SECTIONS = parseGuidelineMarkdown(CONTRA_RAW);

  // -------- Pathways --------
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

  // -------- Modalities “nuances” (kept from your current build) --------
  const MODALITIES = {
    EX_ECG: {
      name: "Exercise ECG",
      summary: "Symptom-limited graded exercise testing (no imaging).",
      bullets: [
        "Candidates: able to perform activities of daily living / achieve ≥5 METs; avoid disabling comorbidity limiting exercise capacity.",
        "Avoid if resting ECG abnormalities reduce interpretability (e.g., baseline ST-T abnormalities, LBBB, paced rhythm, WPW pattern, digitalis use).",
        "Diagnostic accuracy lower than stress imaging, but prognostication remains useful.",
      ],
    },
    STRESS_ECHO: {
      name: "Stress echocardiography",
      summary: "Stress echo can define ischemia severity and aid risk stratification.",
      bullets: ["Consider limitations with poor acoustic windows; protocol-dependent contraindications apply."],
    },
    PET: {
      name: "Stress PET",
      summary: "Rest/stress PET MPI detects perfusion abnormalities; MBFR adds diagnostic/prognostic value.",
      bullets: ["Protocol-dependent contraindications apply (vasodilator stress, etc.)."],
    },
    SPECT: {
      name: "Stress SPECT",
      summary: "Rest/stress SPECT MPI evaluates perfusion abnormalities.",
      bullets: ["Protocol-dependent contraindications apply (vasodilator stress, etc.)."],
    },
    CMR: {
      name: "Stress CMR",
      summary: "CMR assesses function; detects/localizes ischemia and infarction; evaluates viability.",
      bullets: ["MRI-safety considerations and renal function constraints may apply (protocol dependent)."],
    },
    CCTA: {
      name: "CCTA",
      summary: "Anatomic test to diagnose/exclude obstructive CAD and identify plaque.",
      bullets: ["Contrast allergy, instability, rhythm/HR control limitations may affect feasibility."],
    },
    FFRCT: {
      name: "FFR-CT",
      summary: "Functional assessment derived from CCTA data; used for 40–90% stenoses on CCTA.",
      bullets: ["Turnaround time may affect prompt clinical care decisions."],
    },
    ICA: {
      name: "Invasive coronary angiography (ICA)",
      summary: "Invasive anatomic test for high-risk branches and selected intermediate-risk branches.",
      bullets: ["Procedural risk and institutional selection protocols apply."],
    },
    CAC: {
      name: "Coronary artery calcium (CAC)",
      summary: "Risk refinement tool in selected stable contexts.",
      bullets: ["Use depends on patient selection and testing context."],
    },
  };

  function openModalityModal(modKey) {
    const m = MODALITIES[modKey];
    if (!m) return;
    lastFocusedEl = document.activeElement;

    modalTitle.textContent = m.name || "Testing modality";
    const bullets = (m.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("");

    modalBody.innerHTML = `
      <p><strong>Summary:</strong> ${escapeHtml(m.summary || "")}</p>
      ${bullets ? `<h4>Nuances</h4><ul>${bullets}</ul>` : ""}
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

    runnerTitleEl.textContent = activePathwayKey === "acute" ? "Acute chest pain pathway" : "Pathway";

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
      nodeFlagsEl.innerHTML = node.flags.map((f) => makeFlagPill(f.level || "ok", f.text || "")).join("");
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
    }

    btnBack.disabled = historyStack.length === 0;
  }

  // -------- Acute pathway definition (unchanged from your current build) --------
  // NOTE: Keep your existing acute pathway content here.
  // If your current script.js already contains buildAcutePathway(), paste it in place below
  // (I’m leaving it unchanged so we don’t unintentionally overwrite prior pathway edits).
  function buildAcutePathway() {
    // === IMPORTANT ===
    // Paste your existing buildAcutePathway() implementation here (from your current project).
    // If you already have it in this file (below in your version), keep it exactly as-is.
    // =================
    return window.__ACUTE_PATHWAY__ || {};
  }

  // -------- Evidence/Contra view init --------
  const evidenceContentEl = document.getElementById("evidence-content");
  const evidenceSearchEl = document.getElementById("evidence-search");
  renderParsedAccordion(evidenceContentEl, RECOMMENDATIONS_SECTIONS, "", { openFirst: true });

  evidenceSearchEl.addEventListener("input", () => {
    renderParsedAccordion(evidenceContentEl, RECOMMENDATIONS_SECTIONS, evidenceSearchEl.value, {
      openFirst: true,
    });
  });

  const contraContentEl = document.getElementById("contra-content");
  renderParsedAccordion(contraContentEl, CONTRA_SECTIONS, "", { openFirst: true });

  // -------- Routing / buttons --------
  btnStartAcute.addEventListener("click", () => startPathway("acute", "A0"));

  // Stable opens module immediately
  btnStartStable.addEventListener("click", () => {
    window.location.href = "./stable/index.html";
  });

  btnExploreModalities.addEventListener("click", () => openModalityModal("CCTA"));

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
