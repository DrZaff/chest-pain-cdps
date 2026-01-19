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
  // (Leaving as embedded text for now so your app runs.
  //  You can swap this later to your final Recommendations.txt content.)
  // ----------------------------

  const RECOMMENDATIONS_RAW = `# Recommendations
(Placeholder here — keep as-is for now if your app currently depends on this view.)
`;

  const CONTRA_RAW = `# Contraindications
(Placeholder here — keep as-is for now if your app currently depends on this view.)
`;

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
      return h.replaceAll("**", "").replaceAll("#", "").replaceAll("---", "").trim();
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

      const boldOnly = ln.trim().match(/^\*\*.+\*\*$/);
      if (boldOnly) {
        addSubheading(ln.trim());
        continue;
      }

      if (ln.trim().startsWith("* ")) {
        addBullet(ln.trim().slice(2));
        continue;
      }

      if (ln.trim() === "---" || ln.trim() === "") continue;

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
          const paras = (b.paragraphs || []).map((p) => `<p>${escapeHtml(p)}</p>`).join("");
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

  function buildAcutePathway() {
    // IMPORTANT: acute-pathway.js must set window.__ACUTE_PATHWAY__
    return window.__ACUTE_PATHWAY__ || {};
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
    if (pathwayKey === "acute" && (!PATHWAYS.acute || !PATHWAYS.acute.A0)) {
      alert(
        "Acute pathway failed to load.\n\nCheck that acute-pathway.js exists at the site root and is loaded BEFORE script.js."
      );
      return;
    }
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

  // -------- Modalities “nuances” --------
  const MODALITIES = {
    EX_ECG: { name: "Exercise ECG", summary: "Symptom-limited graded exercise testing (no imaging).", bullets: [] },
    STRESS_ECHO: { name: "Stress echocardiography", summary: "Stress echo (imaging).", bullets: [] },
    PET: { name: "Stress PET", summary: "Rest/stress PET MPI.", bullets: [] },
    SPECT: { name: "Stress SPECT", summary: "Rest/stress SPECT MPI.", bullets: [] },
    CMR: { name: "Stress CMR", summary: "Stress cardiac MRI.", bullets: [] },
    CCTA: { name: "CCTA", summary: "Coronary CT angiography.", bullets: [] },
    FFRCT: { name: "FFR-CT", summary: "Functional assessment derived from CCTA.", bullets: [] },
    ICA: { name: "Invasive coronary angiography (ICA)", summary: "Invasive anatomic test.", bullets: [] },
    CAC: { name: "Coronary artery calcium (CAC)", summary: "Risk refinement tool.", bullets: [] },
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

  // -------- Evidence/Contra view init --------
  const evidenceContentEl = document.getElementById("evidence-content");
  const evidenceSearchEl = document.getElementById("evidence-search");
  if (evidenceContentEl && evidenceSearchEl) {
    renderParsedAccordion(evidenceContentEl, RECOMMENDATIONS_SECTIONS, "", { openFirst: true });
    evidenceSearchEl.addEventListener("input", () => {
      renderParsedAccordion(evidenceContentEl, RECOMMENDATIONS_SECTIONS, evidenceSearchEl.value, {
        openFirst: true,
      });
    });
  }

  const contraContentEl = document.getElementById("contra-content");
  if (contraContentEl) {
    renderParsedAccordion(contraContentEl, CONTRA_SECTIONS, "", { openFirst: true });
  }

  // -------- Routing / buttons --------
  btnStartAcute.addEventListener("click", () => startPathway("acute", "A0"));

  // Stable opens module immediately
  btnStartStable.addEventListener("click", () => {
    window.location.href = "./stable/index.html";
  });

  // Keep your existing behavior (opens a modality sheet modal)
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

  if (!routeFromHash()) goHome();
  window.addEventListener("hashchange", () => {
    if (!routeFromHash()) goHome();
  });
});
