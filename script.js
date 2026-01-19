document.addEventListener("DOMContentLoaded", () => {
  // ----------------------------
  // Views
  // ----------------------------
  const VIEWS = {
    home: document.getElementById("view-home"),
    runner: document.getElementById("view-runner"),
    references: document.getElementById("view-references"),
    recommendations: document.getElementById("view-recommendations"),
    contraindications: document.getElementById("view-contra"),
    background: document.getElementById("view-background"),
    about: document.getElementById("view-about"),
  };

  function showView(key) {
    Object.values(VIEWS).forEach((el) => el && el.classList.add("hidden"));
    if (VIEWS[key]) VIEWS[key].classList.remove("hidden");
  }

  // ----------------------------
  // Pathway data (provided by modules)
  // ----------------------------
  const PATHWAYS = {
    acute: window.__ACUTE_PATHWAY__ || null,
    stable: window.__STABLE_PATHWAY__ || null,
  };

  // ----------------------------
  // Runner state
  // ----------------------------
  let activePathwayKey = null;
  let activeNodeId = null;
  let historyStack = [];

  // ----------------------------
  // Runner DOM refs
  // ----------------------------
  const runnerTitleEl = document.getElementById("runner-title");
  const runnerStepEl = document.getElementById("runner-step");
  const runnerSubactionsEl = document.getElementById("runner-subactions");

  const nodeTitleEl = document.getElementById("node-title");
  const nodeBodyEl = document.getElementById("node-body");
  const nodeFlagsEl = document.getElementById("node-flags");
  const nodeOptionsEl = document.getElementById("node-options");
  const nodeResourcesEl = document.getElementById("node-resources");
  const nodeTerminalEl = document.getElementById("node-terminal");

  const btnBack = document.getElementById("btn-back");
  const btnHome = document.getElementById("btn-home");

  // ----------------------------
  // Modal refs
  // ----------------------------
  const modalOverlay = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  const modalClose = document.getElementById("modal-close");
  let lastFocusedEl = null;

  // ----------------------------
  // Utilities
  // ----------------------------
  function escapeHtml(str) {
    return (str ?? "")
      .toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function openNewWindowToHash(hash) {
    const url = `${window.location.origin}${window.location.pathname}${hash}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function makeFlagPill(text, level) {
    const cls = level ? `flag-pill--${level}` : "";
    return `<span class="flag-pill ${cls}">${escapeHtml(text)}</span>`;
  }

  function openModalityModal(title, html) {
    lastFocusedEl = document.activeElement;
    modalTitle.textContent = title || "Reference";
    modalBody.innerHTML = html || "";
    modalOverlay.classList.remove("hidden");
    modalClose.focus();
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

  function closeModalityModal() {
    modalOverlay.classList.add("hidden");
    modalBody.innerHTML = "";
    if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
      lastFocusedEl.focus();
    }
    lastFocusedEl = null;
  }

  modalClose?.addEventListener("click", closeModalityModal);
  modalOverlay?.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModalityModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOverlay && !modalOverlay.classList.contains("hidden")) {
      closeModalityModal();
    }
  });

  // ----------------------------
  // Routing (hash)
  // ----------------------------
  function parseHash() {
    const raw = (window.location.hash || "").replace("#", "").trim();
    if (!raw) return { view: "home" };
    const [view, ...rest] = raw.split("/");
    const payload = rest.join("/");
    return { view, payload };
  }

  function navigateHash(hash) {
    window.location.hash = hash;
  }

  window.addEventListener("hashchange", () => {
    const { view, payload } = parseHash();
    route(view, payload);
  });

  // ----------------------------
  // Page IDs (A-001 style) based on key order
  // ----------------------------
  function buildPageIndexForPathway(nodes) {
    const ids = {};
    const keys = Object.keys(nodes || {});
    keys.forEach((k, i) => {
      const num = String(i + 1).padStart(3, "0");
      ids[k] = `A-${num}`;
    });
    return ids;
  }

  const PAGE_IDS = {
    acute: PATHWAYS.acute?.nodes ? buildPageIndexForPathway(PATHWAYS.acute.nodes) : {},
    stable: PATHWAYS.stable?.nodes ? buildPageIndexForPathway(PATHWAYS.stable.nodes) : {},
  };

  // ----------------------------
  // Placeholder reference content (kept so app runs)
  // ----------------------------
  const RECOMMENDATIONS_RAW = `
<div class="refs-card">
  <h2>Recommendations</h2>
  <p><em>Placeholder content — partner module expected.</em></p>
</div>`;

  const CONTRA_RAW = `
<div class="refs-card">
  <h2>Testing contraindications</h2>
  <p><em>Placeholder content — partner module expected.</em></p>
</div>`;

  const BACKGROUND_RAW = `
<div class="refs-card">
  <h2>Chest pain background</h2>
  <p><em>Placeholder content — partner module expected.</em></p>
</div>`;

  // ----------------------------
  // Route controller
  // ----------------------------
  function route(view, payload) {
    switch (view) {
      case "home":
      case "":
        showView("home");
        break;

      case "runner":
        showView("runner");
        // payload can be: acute or stable, and optional nodeId after '?'
        // Example: #runner/acute?node=A0_ENTRY
        {
          const [pathwayKeyRaw, query] = (payload || "").split("?");
          const pathwayKey = (pathwayKeyRaw || "").trim();
          const params = new URLSearchParams(query || "");
          const node = params.get("node");
          startRunner(pathwayKey, node || null);
        }
        break;

      case "references":
        showView("references");
        break;

      case "recs":
      case "recommendations":
        showView("recommendations");
        renderRecommendations();
        break;

      case "contra":
      case "contraindications":
        showView("contraindications");
        renderContraindications();
        break;

      case "background":
        showView("background");
        renderBackground();
        break;

      case "about":
        showView("about");
        break;

      default:
        showView("home");
        break;
    }
  }

  // ----------------------------
  // Runner controller
  // ----------------------------
  function startRunner(pathwayKey, startNodeOverride) {
    if (!PATHWAYS[pathwayKey]) {
      // Fail safe: go home if invalid
      navigateHash("#home");
      return;
    }
    activePathwayKey = pathwayKey;
    historyStack = [];

    const pathway = PATHWAYS[activePathwayKey];
    activeNodeId = startNodeOverride || pathway.start;

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
  // Runner rendering
  // ----------------------------
  function renderRunner() {
    const pathway = PATHWAYS[activePathwayKey];
    const nodes = pathway?.nodes;
    const node = nodes?.[activeNodeId];
    if (!node) return;

    // Title + terminal pill (no big end box)
    {
      const baseTitle = activePathwayKey === "acute" ? "Acute chest pain pathway" : "Pathway";
      runnerTitleEl.innerHTML = "";
      runnerTitleEl.appendChild(document.createTextNode(baseTitle));
      if (node.type === "terminal") {
        const pill = document.createElement("span");
        pill.className = "end-pill";
        pill.textContent = "End of pathway";
        runnerTitleEl.appendChild(pill);
      }
    }

    const pageId = PAGE_IDS[activePathwayKey]?.[activeNodeId] || "—";
    runnerStepEl.textContent = `${activePathwayKey === "acute" ? "Acute" : "—"} • ${pageId}`;

    // Node core
    nodeTitleEl.textContent = node.title || "";
    nodeBodyEl.textContent = node.body || "";

    // Subactions (remove testing contraindications injection per request)
    runnerSubactionsEl.innerHTML = "";

    // Flags
    nodeFlagsEl.innerHTML = "";
    (node.flags || []).forEach((f) => {
      const text = f?.text || "";
      const level = f?.level || "";
      nodeFlagsEl.insertAdjacentHTML("beforeend", makeFlagPill(text, level));
    });

    // Resources
    nodeResourcesEl.innerHTML = "";
    if (node.resources && node.resources.length) {
      const wrap = document.createElement("div");
      wrap.className = "resources-wrap";
      node.resources.forEach((r) => {
        const btn = document.createElement("button");
        btn.className = "resource-btn";
        btn.type = "button";
        btn.textContent = r.label || "Resource";
        btn.setAttribute("data-url", r.url || "");
        wrap.appendChild(btn);
      });
      nodeResourcesEl.appendChild(wrap);

      nodeResourcesEl.querySelectorAll("button[data-url]").forEach((b) => {
        b.addEventListener("click", () => {
          const url = b.getAttribute("data-url");
          if (isPdf(url) || isImage(url)) {
            openDocModal(b.textContent?.trim() || "Resource", url);
          } else {
            window.open(url, "_blank", "noopener,noreferrer");
          }
        });
      });
    }

    // Options / Terminal behavior
    nodeOptionsEl.innerHTML = "";
    nodeTerminalEl.classList.add("hidden");
    nodeTerminalEl.innerHTML = "";

    if (node.type === "decision") {
      (node.options || []).forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.type = "button";

        const label = document.createElement("div");
        label.className = "option-label";
        label.textContent = opt.label || "";

        const sub = document.createElement("div");
        sub.className = "option-sub";
        sub.textContent = opt.sub || "";

        btn.appendChild(label);
        if (opt.sub) btn.appendChild(sub);

        btn.addEventListener("click", () => goToNode(opt.next));
        nodeOptionsEl.appendChild(btn);
      });
    } else if (node.type === "terminal") {
      // No large "End of pathway" box; pill is in the header.
      nodeTerminalEl.classList.add("hidden");
      nodeTerminalEl.innerHTML = "";

      // Ensure terminal disposition is visible in the main body.
      nodeBodyEl.textContent = node.disposition || "";

      // No options for terminal nodes.
      nodeOptionsEl.innerHTML = "";
    }

    // Nav buttons
    btnBack.disabled = historyStack.length === 0;
  }

  // ----------------------------
  // Recommendations / Contra / Background rendering
  // ----------------------------
  function renderRecommendations() {
    const el = document.getElementById("recommendations-container");
    if (!el) return;
    el.innerHTML = RECOMMENDATIONS_RAW;
  }

  function renderContraindications() {
    const el = document.getElementById("contra-container");
    if (!el) return;
    el.innerHTML = CONTRA_RAW;
  }

  function renderBackground() {
    const el = document.getElementById("background-container");
    if (!el) return;
    el.innerHTML = BACKGROUND_RAW;
  }

  // ----------------------------
  // UI bindings
  // ----------------------------
  document.getElementById("btn-start-acute")?.addEventListener("click", () => {
    navigateHash("#runner/acute");
  });

  document.getElementById("btn-start-stable")?.addEventListener("click", () => {
    navigateHash("#runner/stable");
  });

  btnBack?.addEventListener("click", () => goBack());
  btnHome?.addEventListener("click", () => navigateHash("#home"));

  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const nav = el.getAttribute("data-nav");
      if (!nav) return;
      navigateHash(nav.startsWith("#") ? nav : `#${nav}`);
    });
  });

  // ----------------------------
  // Boot
  // ----------------------------
  const { view, payload } = parseHash();
  route(view, payload);
});
