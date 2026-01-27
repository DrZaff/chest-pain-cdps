document.addEventListener("DOMContentLoaded", () => {
  // ----------------------------
  // Views
  // ----------------------------
  const VIEWS = {
    home: document.getElementById("view-home"),
    runner: document.getElementById("view-runner"),
    background: document.getElementById("view-background"),
    evidence: document.getElementById("view-evidence"),
    contra: document.getElementById("view-contra"),
  };

  function showView(key) {
    Object.values(VIEWS).forEach((el) => el && el.classList.add("hidden"));
    if (VIEWS[key]) VIEWS[key].classList.remove("hidden");
  }

  // ----------------------------
  // Pathways
  // ----------------------------
  function normalizePathway(pw) {
    if (!pw) return null;
    const nodes = pw.nodes ? pw.nodes : pw; // acute is direct map
    const start = pw.start ? pw.start : Object.keys(nodes)[0];
    return { nodes, start };
  }

  const ACUTE = normalizePathway(window.__ACUTE_PATHWAY__);
  let STABLE = normalizePathway(window.__STABLE_PATHWAY__); // may be null at load-time

  const PATHWAYS = {
    acute: ACUTE,
    stable: STABLE,
  };

  function buildPageIndex(nodesObj, prefix) {
    const map = {};
    const keys = Object.keys(nodesObj || {});
    keys.forEach((k, i) => {
      map[k] = `${prefix}-${String(i + 1).padStart(3, "0")}`;
    });
    return map;
  }

  const PAGE_IDS = {
    acute: ACUTE ? buildPageIndex(ACUTE.nodes, "A") : {},
    stable: STABLE ? buildPageIndex(STABLE.nodes, "S") : {},
  };

  // Reverse map for safe reroutes by A-### page ID
  function invertMap(obj) {
    const out = {};
    Object.entries(obj || {}).forEach(([k, v]) => (out[v] = k));
    return out;
  }
  const ACUTE_BY_PAGE = invertMap(PAGE_IDS.acute);

  // ----------------------------
  // Lazy-load Stable pathway module (partner file)
  // ----------------------------
  async function ensureStablePathwayLoaded() {
    if (window.__STABLE_PATHWAY__) return true;

    const candidates = [
      "./stable-pathway.js",
      "./stable-pathway.min.js",
      "./stable_pathway.js",
      "./stable.js",
      "./stable-pathway-module.js",
    ];

    const tryLoadScript = (src) =>
      new Promise((resolve) => {
        // Avoid duplicates
        if ([...document.scripts].some((s) => (s.src || "").includes(src.replace("./", "")))) {
          setTimeout(() => resolve(true), 0);
          return;
        }
        const el = document.createElement("script");
        el.src = src;
        el.async = true;
        el.onload = () => resolve(true);
        el.onerror = () => resolve(false);
        document.head.appendChild(el);
      });

    for (const src of candidates) {
      const ok = await tryLoadScript(src);
      if (ok && window.__STABLE_PATHWAY__) return true;
    }
    return false;
  }

  function refreshStableInRuntime() {
    STABLE = normalizePathway(window.__STABLE_PATHWAY__);
    if (STABLE) {
      PATHWAYS.stable = STABLE;
      PAGE_IDS.stable = buildPageIndex(STABLE.nodes, "S");
      return true;
    }
    return false;
  }

  // ----------------------------
  // Runner state
  // ----------------------------
  let activePathwayKey = null;
  let activeNodeId = null;
  let historyStack = [];

  // ----------------------------
  // Runner DOM
  // ----------------------------
  const runnerTitleEl = document.getElementById("runner-title");
  const runnerStepEl = document.getElementById("runner-step");
  const runnerSubactionsEl = document.getElementById("runner-subactions");

  const nodeTitleEl = document.getElementById("node-title");
  const nodeBodyEl = document.getElementById("node-body");
  const nodeFlagsEl = document.getElementById("node-flags");
  const nodeResourcesEl = document.getElementById("node-resources");
  const nodeOptionsEl = document.getElementById("node-options");
  const nodeTerminalEl = document.getElementById("node-terminal");

  const btnBack = document.getElementById("btn-back");
  const btnReset = document.getElementById("btn-reset");
  const btnHome = document.getElementById("btn-home");

  // Home buttons
  const btnStartAcute = document.getElementById("btn-start-acute");
  const btnStartStable = document.getElementById("btn-start-stable");

  const btnBackground = document.getElementById("btn-background");
  const btnEvidence = document.getElementById("btn-evidence");
  const btnContra = document.getElementById("btn-contra");

  // View home buttons
  const btnBackgroundHome = document.getElementById("btn-background-home");
  const btnEvidenceHome = document.getElementById("btn-evidence-home");
  const btnContraHome = document.getElementById("btn-contra-home");

  // Evidence/Contra DOM
  const evidenceFigureLinkEl = document.getElementById("evidence-figure-link");
  const evidenceSearchEl = document.getElementById("evidence-search");
  const evidenceContentEl = document.getElementById("evidence-content");
  const contraContentEl = document.getElementById("contra-content");

  // Background DOM
  const backgroundContentEl = document.getElementById("background-content");

  // ----------------------------
  // Modal
  // ----------------------------
  const modalOverlay = document.getElementById("modalOverlay");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");
  let lastFocusedEl = null;

  function escapeHtml(str) {
    return (str ?? "")
      .toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function isPdf(url) {
    return typeof url === "string" && url.toLowerCase().endsWith(".pdf");
  }

  function isImage(url) {
    return typeof url === "string" && /\.(png|jpg|jpeg|gif|webp)$/i.test(url);
  }

  function openDocModal(title, url) {
    if (!url) return;
    lastFocusedEl = document.activeElement;
    modalTitle.textContent = title || "Reference";

    if (isPdf(url)) {
      modalBody.innerHTML = `<div class="doc-frame"><iframe src="${url}" title="${escapeHtml(
        title || "PDF"
      )}"></iframe></div>`;
    } else if (isImage(url)) {
      modalBody.innerHTML = `<div class="img-frame"><img src="${url}" alt="${escapeHtml(
        title || "Image"
      )}"></div>`;
    } else {
      modalBody.innerHTML = `<p><a href="${url}" target="_blank" rel="noopener noreferrer">Open resource</a></p>`;
    }

    modalOverlay.classList.remove("hidden");
    modalClose.focus();
  }

  function closeModal() {
    modalOverlay.classList.add("hidden");
    modalBody.innerHTML = "";
    if (lastFocusedEl && typeof lastFocusedEl.focus === "function") lastFocusedEl.focus();
    lastFocusedEl = null;
  }

  modalClose?.addEventListener("click", closeModal);
  modalOverlay?.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOverlay && !modalOverlay.classList.contains("hidden")) {
      closeModal();
    }
  });

  // ----------------------------
  // Fetch helpers
  // ----------------------------
  async function loadTextAsset(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return await res.text();
  }

  // ----------------------------
  // End-of-pathway pill in header (always next to title)
  // ----------------------------
  function setRunnerTitle(baseTitle, isTerminal) {
    runnerTitleEl.innerHTML = "";
    runnerTitleEl.appendChild(document.createTextNode(baseTitle));

    if (isTerminal) {
      const pill = document.createElement("span");
      pill.className = "end-pill";
      pill.textContent = "End of pathway";
      runnerTitleEl.appendChild(pill);
    }
  }

  function makeFlagPill(text, level) {
    const cls = level ? `flag-pill--${level}` : "";
    return `<span class="flag-pill ${cls}">${escapeHtml(text)}</span>`;
  }

  // ----------------------------
  // Runner controller
  // ----------------------------
  function startRunner(pathwayKey, startNodeOverride) {
    if (!PATHWAYS[pathwayKey]) {
      showView("home");
      return;
    }
    activePathwayKey = pathwayKey;
    historyStack = [];
    const pw = PATHWAYS[activePathwayKey];
    activeNodeId = startNodeOverride || pw.start;
    showView("runner");
    window.location.hash = "#runner";
    renderRunner();
  }

  function goToNode(nextNodeId) {
    if (!nextNodeId) return;
    historyStack.push(activeNodeId);
    activeNodeId = nextNodeId;
    renderRunner();
  }

  function goBack() {
    const prev = historyStack.pop();
    if (!prev) return;
    activeNodeId = prev;
    renderRunner();
  }

  // ----------------------------
  // Option reroute overrides (by page ID, surgical)
  // ----------------------------
  function overrideNextByPageId(pageId, optLabel, defaultNext) {
    if (activePathwayKey !== "acute") return defaultNext;

    const goto = (targetPageId) => ACUTE_BY_PAGE[targetPageId] || defaultNext;
    const L = (optLabel || "").trim().toLowerCase();

    if (pageId === "A-012" && L.includes("recent negative test")) return goto("A-023");
    if (pageId === "A-015" && (L.includes("negative") || L.includes("mildly abnormal"))) return goto("A-023");
    if (pageId === "A-019" && L.includes("nonobstructive") && L.includes("<50")) return goto("A-023");

    if (pageId === "A-028" && L.includes("no change")) return goto("A-036");

    if (pageId === "A-026" && L.includes("stress testing")) return goto("A-033");

    if (pageId === "A-033" && L.includes("normal")) return goto("A-036");

    if (pageId === "A-014" && L.includes("ccta") && L.includes("class 1")) return goto("A-019");

    return defaultNext;
  }

  // ----------------------------
  // Runner rendering
  // ----------------------------
  function renderRunner() {
    const pw = PATHWAYS[activePathwayKey];
    const nodes = pw?.nodes;
    const node = nodes?.[activeNodeId];
    if (!node) {
      showView("home");
      return;
    }

    const pageId = PAGE_IDS[activePathwayKey]?.[activeNodeId] || "—";

    const baseTitle =
      activePathwayKey === "acute"
        ? "Acute chest pain pathway"
        : activePathwayKey === "stable"
        ? "Stable chest pain pathway"
        : "Pathway";

    setRunnerTitle(baseTitle, node.type === "terminal");
    runnerStepEl.textContent = `${activePathwayKey.toUpperCase()} • ${pageId}`;

    // Remove “Open testing contraindications…” from every non-home page
    runnerSubactionsEl.innerHTML = "";

    nodeTitleEl.textContent = node.title || "";

    if (node.bodyHtml) {
      nodeBodyEl.innerHTML = node.bodyHtml;
      nodeBodyEl.querySelectorAll("[data-open-doc]").forEach((a) => {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openDocModal(a.getAttribute("data-title") || "Reference", a.getAttribute("data-open-doc"));
        });
      });
      nodeBodyEl.querySelectorAll("[data-open-image]").forEach((a) => {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openDocModal(a.getAttribute("data-title") || "Figure", a.getAttribute("data-open-image"));
        });
      });
    } else {
      nodeBodyEl.textContent = node.body || "";
    }

    nodeFlagsEl.innerHTML = "";
    (node.flags || []).forEach((f) => {
      nodeFlagsEl.insertAdjacentHTML("beforeend", makeFlagPill(f.text, f.level));
    });

    nodeOptionsEl.innerHTML = "";
    nodeTerminalEl.classList.add("hidden");
    nodeTerminalEl.innerHTML = "";

    if (node.type === "decision") {
      (node.options || []).forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.type = "button";
        btn.innerHTML = `
          <div>${escapeHtml(opt.label || "")}</div>
          ${opt.sub ? `<span class="choice-sub">${escapeHtml(opt.sub)}</span>` : ""}
        `;

        btn.addEventListener("click", () => {
          if (opt.action === "OPEN_HEART") {
            window.open("https://heart-score-calculator.netlify.app", "_blank", "noopener,noreferrer");
            return;
          }
          const next = overrideNextByPageId(pageId, opt.label, opt.next);
          goToNode(next);
        });

        nodeOptionsEl.appendChild(btn);
      });
    } else if (node.type === "step") {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.type = "button";
      btn.innerHTML = `<div>${escapeHtml(node.continueLabel || "Continue")}</div>`;
      btn.addEventListener("click", () => goToNode(node.next));
      nodeOptionsEl.appendChild(btn);
    } else if (node.type === "terminal") {
      if (!node.bodyHtml) nodeBodyEl.textContent = node.disposition || node.body || "";
      nodeOptionsEl.innerHTML = "";
    }

    // Resources: compact bottom for A-002
    const resources = Array.isArray(node.resources) ? node.resources : [];
    const isA002 = pageId === "A-002";

    nodeResourcesEl.innerHTML = "";
    nodeResourcesEl.classList.add("hidden");
    nodeResourcesEl.classList.remove("node-resources--compact");

    if (resources.length) {
      nodeResourcesEl.classList.remove("hidden");
      if (isA002) nodeResourcesEl.classList.add("node-resources--compact");

      const title = isA002 ? "" : `<div class="resources-title">Resources</div>`;
      nodeResourcesEl.innerHTML =
        title +
        `<div class="resources-grid">
          ${resources
            .map(
              (r) => `
              <button class="resource-btn" data-url="${escapeHtml(r.url)}">
                ${escapeHtml(r.label)}
              </button>`
            )
            .join("")}
        </div>`;

      nodeResourcesEl.querySelectorAll("button[data-url]").forEach((b) => {
        b.addEventListener("click", () => {
          const url = b.getAttribute("data-url");
          const label = b.textContent?.trim() || "Resource";
          if (isPdf(url) || isImage(url)) openDocModal(label, url);
          else window.open(url, "_blank", "noopener,noreferrer");
        });
      });
    }

    btnBack.disabled = historyStack.length === 0;
  }

  // ============================================================
  // REFERENCE PAGES: "##" dropdowns + NESTED BULLETS BY INDENT
  // Works for both "##Heading" and "## Heading"
  // All dropdowns CLOSED by default.
  // ============================================================
  function isHashHeading(line) {
    return /^##\s*\S/.test(line || "");
  }

  function headingTitle(line) {
    return (line || "").replace(/^##\s*/, "").trim();
  }

  function parseHashSections(raw) {
    const lines = (raw || "").replace(/\r\n/g, "\n").split("\n");

    const sections = [];
    let current = null;

    const push = () => {
      if (!current) return;
      while (current.bodyLines.length && current.bodyLines[current.bodyLines.length - 1].trim() === "") {
        current.bodyLines.pop();
      }
      const body = current.bodyLines.join("\n");
      if (current.title && body.trim()) sections.push({ title: current.title, body });
      current = null;
    };

    for (const line of lines) {
      const t = (line ?? "").trim();
      if (!t || t === "---") continue;

      if (isHashHeading(t)) {
        push();
        current = { title: headingTitle(t), bodyLines: [] };
        continue;
      }

      if (!current) continue;
      current.bodyLines.push((line ?? "").replace(/\s+$/g, ""));
    }

    push();
    return sections;
  }

  function countLeadingSpaces(line) {
    const m = (line || "").match(/^(\s*)/);
    return m ? m[1].length : 0;
  }

  function indentedTextToNestedListHtml(textBlock) {
    const lines = (textBlock || "").replace(/\r\n/g, "\n").split("\n");
    const items = [];

    for (const raw of lines) {
      if (!raw || raw.trim() === "") continue;
      items.push({
        indent: countLeadingSpaces(raw),
        text: escapeHtml(raw.replace(/\s+$/g, "")).trimStart(),
      });
    }

    if (!items.length) return `<p class="muted">No content.</p>`;

    let html = "";
    const stack = []; // indent levels of open ULs

    const openUl = () => (html += `<ul class="ref-ul">`);
    const closeUl = () => (html += `</ul>`);
    const openLi = (t) => (html += `<li>${t}`);
    const closeLi = () => (html += `</li>`);

    openUl();
    stack.push(items[0].indent);
    openLi(items[0].text);

    for (let i = 1; i < items.length; i++) {
      const prev = items[i - 1];
      const cur = items[i];

      if (cur.indent > prev.indent) {
        openUl();
        stack.push(cur.indent);
        openLi(cur.text);
        continue;
      }

      closeLi();

      while (stack.length && cur.indent < stack[stack.length - 1]) {
        closeUl();
        stack.pop();
        closeLi();
      }

      openLi(cur.text);
    }

    closeLi();

    while (stack.length > 1) {
      closeUl();
      stack.pop();
      closeLi();
    }

    closeUl();
    return html;
  }

  function renderHashAccordion(containerEl, sections, searchValue = "") {
    const q = (searchValue || "").trim().toLowerCase();
    const items = Array.isArray(sections) ? sections : [];

    const html = items
      .map((sec) => {
        const hay = (sec.title + "\n" + sec.body).toLowerCase();
        if (q && !hay.includes(q)) return "";

        return `
          <details>
            <summary>${escapeHtml(sec.title)}</summary>
            <div class="acc-body">
              <div class="ref-bullets">
                ${indentedTextToNestedListHtml(sec.body)}
              </div>
            </div>
          </details>
        `;
      })
      .join("");

    containerEl.innerHTML = `<div class="accordion">${html || `<p class="muted">No matches.</p>`}</div>`;
  }

  // ----------------------------
  // Recommendations
  // ----------------------------
  let RECOMMENDATION_SECTIONS = [];

  async function loadRecommendations() {
    const raw = await loadTextAsset("./Recommendations.txt");
    RECOMMENDATION_SECTIONS = parseHashSections(raw);
    renderHashAccordion(evidenceContentEl, RECOMMENDATION_SECTIONS, evidenceSearchEl?.value || "");
  }

  // ----------------------------
  // Contraindications
  // ----------------------------
  let CONTRA_SECTIONS = [];

  async function loadContraindications() {
    const raw = await loadTextAsset("./ContraindicationsImagingModality.txt");
    CONTRA_SECTIONS = parseHashSections(raw);
    renderHashAccordion(contraContentEl, CONTRA_SECTIONS, "");
  }

  // ----------------------------
  // Background
  // ----------------------------
  let BACKGROUND_SECTIONS = [];

  async function loadBackground() {
    const raw = await loadTextAsset("./Chest Pain Background.txt");
    BACKGROUND_SECTIONS = parseHashSections(raw);
    renderHashAccordion(backgroundContentEl, BACKGROUND_SECTIONS, "");
  }

  // ----------------------------
  // Wire buttons
  // ----------------------------
  btnStartAcute?.addEventListener("click", () => startRunner("acute"));

  // FIX: stable pathway no longer breaks if partner module loads after script.js
  btnStartStable?.addEventListener("click", () => {
    startRunner("stable");
  });

  btnBack?.addEventListener("click", goBack);
  btnReset?.addEventListener("click", () => {
    historyStack = [];
    const pw = PATHWAYS[activePathwayKey];
    activeNodeId = pw?.start;
    renderRunner();
  });

  btnHome?.addEventListener("click", () => {
    showView("home");
    window.location.hash = "#home";
  });

  btnBackground?.addEventListener("click", async () => {
    showView("background");
    window.location.hash = "#background";
    try {
      await loadBackground();
    } catch (e) {
      console.error(e);
      backgroundContentEl.innerHTML = `<p class="muted">Unable to load Chest Pain Background.txt</p>`;
    }
  });

  btnEvidence?.addEventListener("click", async () => {
    showView("evidence");
    window.location.hash = "#evidence";
    try {
      await loadRecommendations();
    } catch (e) {
      console.error(e);
      evidenceContentEl.innerHTML = `<p class="muted">Unable to load Recommendations.txt</p>`;
    }
  });

  btnContra?.addEventListener("click", async () => {
    showView("contra");
    window.location.hash = "#contra";
    try {
      await loadContraindications();
    } catch (e) {
      console.error(e);
      contraContentEl.innerHTML = `<p class="muted">Unable to load ContraindicationsImagingModality.txt</p>`;
    }
  });

  btnBackgroundHome?.addEventListener("click", () => {
    showView("home");
    window.location.hash = "#home";
  });
  btnEvidenceHome?.addEventListener("click", () => {
    showView("home");
    window.location.hash = "#home";
  });
  btnContraHome?.addEventListener("click", () => {
    showView("home");
    window.location.hash = "#home";
  });

  // Search (Recommendations only)
  evidenceSearchEl?.addEventListener("input", () => {
    renderHashAccordion(evidenceContentEl, RECOMMENDATION_SECTIONS, evidenceSearchEl.value || "");
  });

  evidenceFigureLinkEl?.addEventListener("click", (e) => {
    e.preventDefault();
    // Keep consistent with your current assets + SW cache + acute pathway resources
    openDocModal("ACC/AHA COR/LOE interpretation", "./Recomendations.png");
  });

  // ----------------------------
  // Boot
  // ----------------------------
  showView("home");
});
