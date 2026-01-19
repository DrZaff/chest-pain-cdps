document.addEventListener("DOMContentLoaded", () => {
  // ----------------------------
  // Views
  // ----------------------------
  const VIEWS = {
    home: document.getElementById("view-home"),
    runner: document.getElementById("view-runner"),
    evidence: document.getElementById("view-evidence"),
    contra: document.getElementById("view-contra"),
  };

  function showView(viewKey) {
    Object.values(VIEWS).forEach((v) => v && v.classList.add("hidden"));
    VIEWS[viewKey]?.classList.remove("hidden");
  }

  // ----------------------------
  // DOM refs (runner)
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
  const btnReset = document.getElementById("btn-reset");
  const btnHome = document.getElementById("btn-home");

  // ----------------------------
  // DOM refs (home + reference buttons)
  // IMPORTANT: match actual IDs in index.html
  // ----------------------------
  const btnStartAcute = document.getElementById("btn-start-acute");
  const btnStartStable = document.getElementById("btn-start-stable");
  const btnEvidence = document.getElementById("btn-evidence");
  const btnContra = document.getElementById("btn-contra");

  const btnEvidenceHome = document.getElementById("btn-evidence-home");
  const btnContraHome = document.getElementById("btn-contra-home");

  // Evidence page elements
  const evidenceContentEl = document.getElementById("evidence-content");
  const evidenceSearchEl = document.getElementById("evidence-search");
  const evidenceFigureLinkEl = document.getElementById("evidence-figure-link");

  // Contra page elements
  const contraContentEl = document.getElementById("contra-content");

  // ----------------------------
  // Modal
  // ----------------------------
  const modalOverlay = document.getElementById("modalOverlay");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");
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

  async function loadTextAsset(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return await res.text();
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

  function makeFlagPill(text, level) {
    const cls = level ? `flag-pill--${level}` : "";
    return `<span class="flag-pill ${cls}">${escapeHtml(text)}</span>`;
  }

  // ----------------------------
  // Pathway normalization (supports acute object-map OR stable module shape)
  // ----------------------------
  function normalizePathway(pw) {
    if (!pw) return null;
    const nodes = pw.nodes ? pw.nodes : pw; // acute-pathway.js is a direct node map
    const start = pw.start ? pw.start : Object.keys(nodes)[0]; // fall back to first key
    return { nodes, start };
  }

  const ACUTE = normalizePathway(window.__ACUTE_PATHWAY__);
  const STABLE = normalizePathway(window.__STABLE_PATHWAY__);

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

  // ----------------------------
  // Runner state
  // ----------------------------
  let activePathwayKey = "acute";
  let activeNodeId = ACUTE?.start || "A0";
  let historyStack = [];

  function startPathway(pathwayKey, startNodeIdOverride) {
    const pw = PATHWAYS[pathwayKey];
    if (!pw) {
      // stable module might be maintained elsewhere; fail-safe to home
      showView("home");
      window.location.hash = "#home";
      return;
    }

    activePathwayKey = pathwayKey;
    activeNodeId = startNodeIdOverride || pw.start;
    historyStack = [];
    showView("runner");
    window.location.hash = "#runner";
    renderRunner();
  }

  function goToNode(nextId) {
    if (!nextId) return;
    historyStack.push(activeNodeId);
    activeNodeId = nextId;
    renderRunner();
  }

  function backOne() {
    const prev = historyStack.pop();
    if (!prev) return;
    activeNodeId = prev;
    renderRunner();
  }

  function resetPathway() {
    const pw = PATHWAYS[activePathwayKey];
    if (!pw) return;
    historyStack = [];
    activeNodeId = pw.start;
    renderRunner();
  }

  // ----------------------------
  // Runner render
  // ----------------------------
  function renderRunner() {
    const pw = PATHWAYS[activePathwayKey];
    if (!pw) return;

    const node = pw.nodes?.[activeNodeId];
    if (!node) return;

    // Title + terminal pill
    {
      const baseTitle =
        activePathwayKey === "acute" ? "Acute chest pain pathway" : "Stable chest pain pathway";
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
    runnerStepEl.textContent = `${activePathwayKey.toUpperCase()} • ${pageId}`;

    // Per your request: no contraindications runner link on non-home pages
    runnerSubactionsEl.innerHTML = "";

    nodeTitleEl.textContent = node.title || "";
    nodeBodyEl.textContent = node.body || "";

    // Flags
    nodeFlagsEl.innerHTML = "";
    (node.flags || []).forEach((f) => {
      nodeFlagsEl.insertAdjacentHTML("beforeend", makeFlagPill(f.text, f.level));
    });

    // Resources (IMPORTANT: unhide when present)
    nodeResourcesEl.innerHTML = "";
    nodeResourcesEl.classList.add("hidden");
    if (node.resources && node.resources.length) {
      nodeResourcesEl.classList.remove("hidden");
      nodeResourcesEl.innerHTML = `
        <div class="resources-title">Resources</div>
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
      `;

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

    // Options / Terminal blocks
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
          // Support action-style options (e.g., OPEN_HEART)
          if (opt.action === "OPEN_HEART") {
            window.open("https://heart-score-calculator.netlify.app", "_blank", "noopener,noreferrer");
            return;
          }
          if (opt.action === "OPEN_URL" && opt.url) {
            window.open(opt.url, "_blank", "noopener,noreferrer");
            return;
          }
          goToNode(opt.next);
        });

        nodeOptionsEl.appendChild(btn);
      });
    } else if (node.type === "step") {
      // IMPORTANT: restore step behavior (continue button)
      const next = node.next;
      const label = node.continueLabel || "Continue";

      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.type = "button";
      btn.innerHTML = `<div>${escapeHtml(label)}</div>`;
      btn.addEventListener("click", () => goToNode(next));
      nodeOptionsEl.appendChild(btn);
    } else if (node.type === "terminal") {
      // No large terminal box; show disposition in main body
      nodeBodyEl.textContent = node.disposition || node.body || "";
      nodeOptionsEl.innerHTML = "";
    }

    btnBack.disabled = historyStack.length === 0;
  }

  // ----------------------------
  // Recommendations parsing/render (from Recommendations.txt)
  // ----------------------------
  function stripSectionNumber(title) {
    return (title || "")
      .replaceAll("**", "")
      .trim()
      .replace(/^\d+(?:\.\d+)*\.\s*/, "")
      .trim();
  }

  function extractCorLoe(line) {
    const m = (line || "").match(/\(\s*COR[^)]*\)/i);
    return m ? m[0].replace(/\s+/g, " ").trim() : "";
  }

  function parseRecommendations(raw) {
    const lines = (raw || "").split("\n");
    const sections = [];
    let current = null;
    let currentSub = null;

    const push = () => {
      if (!current) return;
      const has =
        (current.claims && current.claims.length) ||
        (current.sub && current.sub.some((s) => s.claims && s.claims.length));
      if (has) sections.push(current);
      current = null;
      currentSub = null;
    };

    const addClaim = (text) => {
      if (!current) current = { title: "Recommendations", claims: [], sub: [] };
      const c = { text: (text || "").trim(), corloe: "" };
      if (currentSub) currentSub.claims.push(c);
      else current.claims.push(c);
    };

    const attachCorToLast = (corloe) => {
      if (!corloe || !current) return;
      const list = currentSub ? currentSub.claims : current.claims;
      if (!list.length) return;
      list[list.length - 1].corloe = corloe;
    };

    for (const ln of lines) {
      const t = (ln || "").trim();
      if (!t || t === "---") continue;

      if (t.startsWith("## ")) {
        push();
        current = { title: stripSectionNumber(t.slice(3)), claims: [], sub: [] };
        currentSub = null;
        continue;
      }

      if (t.startsWith("### ")) {
        if (!current) current = { title: "Recommendations", claims: [], sub: [] };
        currentSub = { heading: stripSectionNumber(t.slice(4)), claims: [] };
        current.sub.push(currentSub);
        continue;
      }

      if (t.startsWith("* ")) {
        addClaim(t.slice(2));
        continue;
      }

      const corloe = extractCorLoe(t);
      if (corloe) {
        attachCorToLast(corloe);
        continue;
      }

      // narrative line as claim
      addClaim(t);
    }

    push();
    return sections;
  }

  function renderRecommendations(containerEl, sections, searchValue = "") {
    const q = (searchValue || "").trim().toLowerCase();

    const renderClaimList = (claims) => {
      if (!claims || !claims.length) return "";
      return `<ul>${claims
        .map((c) => {
          const cor = c.corloe ? ` <span class="muted small">${escapeHtml(c.corloe)}</span>` : "";
          return `<li>${escapeHtml(c.text)}${cor}</li>`;
        })
        .join("")}</ul>`;
    };

    const html = (sections || [])
      .map((sec, idx) => {
        const blob = JSON.stringify(sec).toLowerCase();
        if (q && !blob.includes(q)) return "";

        const subHtml = (sec.sub || [])
          .map((s) => {
            const subBlob = JSON.stringify(s).toLowerCase();
            if (q && !subBlob.includes(q)) return "";
            return `
              <div class="acc-subblock">
                <div class="acc-subhead">${escapeHtml(s.heading)}</div>
                ${renderClaimList(s.claims)}
              </div>
            `;
          })
          .join("");

        return `
          <details ${idx === 0 && !q ? "open" : ""}>
            <summary>${escapeHtml(sec.title)}</summary>
            <div class="acc-body">
              ${renderClaimList(sec.claims)}
              ${subHtml}
            </div>
          </details>
        `;
      })
      .join("");

    containerEl.innerHTML = html || `<p class="muted">No matches.</p>`;
  }

  // ----------------------------
  // Contra parsing/render (from ContraindicationsImagingModality.txt)
  // ----------------------------
  function renderContraindicationsByModality(containerEl, raw) {
    const lines = (raw || "").split("\n");
    const sections = [];
    let cur = null;

    const push = () => {
      if (!cur) return;
      const has = (cur.bodyLines || []).some((x) => x.trim());
      if (has) sections.push(cur);
      cur = null;
    };

    for (const ln of lines) {
      const t = (ln || "").trim();
      if (!t || t === "---") continue;

      if (t.startsWith("## ")) {
        push();
        cur = { title: stripSectionNumber(t.slice(3)), bodyLines: [] };
        continue;
      }

      if (!cur) continue;
      cur.bodyLines.push(t);
    }
    push();

    const html = sections
      .map((sec, idx) => {
        const body = sec.bodyLines || [];
        const pieces = [];

        for (const line of body) {
          if (/^Section\s*#\s*Contraindications/i.test(line)) {
            // explicitly remove: "Section # Contraindications by Imaging Modality"
            continue;
          }
          if (/^Contraindicated\s+or\s+Not\s+Appropriate\s+When:/i.test(line)) {
            pieces.push(`<div class="acc-subhead">Contraindicated or Not Appropriate When:</div>`);
            continue;
          }
          if (line.startsWith("* ")) {
            pieces.push({ bullet: line.slice(2).trim() });
            continue;
          }
          pieces.push(`<p>${escapeHtml(line)}</p>`);
        }

        const final = [];
        let ul = [];
        for (const p of pieces) {
          if (typeof p === "object" && p.bullet) {
            ul.push(`<li>${escapeHtml(p.bullet)}</li>`);
          } else {
            if (ul.length) {
              final.push(`<ul>${ul.join("")}</ul>`);
              ul = [];
            }
            final.push(p);
          }
        }
        if (ul.length) final.push(`<ul>${ul.join("")}</ul>`);

        return `
          <details ${idx === 0 ? "open" : ""}>
            <summary>${escapeHtml(sec.title)}</summary>
            <div class="acc-body">
              ${final.join("")}
            </div>
          </details>
        `;
      })
      .join("");

    containerEl.innerHTML = html || `<p class="muted">No contraindications content found.</p>`;
  }

  // ----------------------------
  // Load + render evidence/contra on demand
  // ----------------------------
  let RECOMMENDATIONS_RAW = "";
  let RECS_SECTIONS = [];
  let CONTRA_RAW = "";

  async function ensureEvidenceLoaded() {
    if (RECOMMENDATIONS_RAW && RECS_SECTIONS.length) return;
    RECOMMENDATIONS_RAW = await loadTextAsset("./Recommendations.txt");
    RECS_SECTIONS = parseRecommendations(RECOMMENDATIONS_RAW);
  }

  async function ensureContraLoaded() {
    if (CONTRA_RAW) return;
    CONTRA_RAW = await loadTextAsset("./ContraindicationsImagingModality.txt");
  }

  function openEvidenceView() {
    showView("evidence");
    window.location.hash = "#evidence";
    if (!evidenceContentEl || !evidenceSearchEl) return;

    ensureEvidenceLoaded()
      .then(() => {
        renderRecommendations(evidenceContentEl, RECS_SECTIONS, evidenceSearchEl.value || "");
      })
      .catch((err) => {
        console.error(err);
        evidenceContentEl.innerHTML = `<p class="muted">Unable to load recommendations. Confirm Recommendations.txt exists at repo root.</p>`;
      });
  }

  function openContraView() {
    showView("contra");
    window.location.hash = "#contra";
    if (!contraContentEl) return;

    ensureContraLoaded()
      .then(() => {
        renderContraindicationsByModality(contraContentEl, CONTRA_RAW);
      })
      .catch((err) => {
        console.error(err);
        contraContentEl.innerHTML = `<p class="muted">Unable to load contraindications. Confirm ContraindicationsImagingModality.txt exists at repo root.</p>`;
      });
  }

  // Evidence search binding
  evidenceSearchEl?.addEventListener("input", () => {
    if (!evidenceContentEl) return;
    renderRecommendations(evidenceContentEl, RECS_SECTIONS, evidenceSearchEl.value || "");
  });

  // Evidence figure link: open image in modal
  evidenceFigureLinkEl?.addEventListener("click", (e) => {
    e.preventDefault();
    openDocModal("ACC/AHA COR/LOE interpretation", "./Recomendations.png");
  });

  // ----------------------------
  // Navigation / buttons
  // ----------------------------
  function goHome() {
    showView("home");
    window.location.hash = "#home";
  }

  btnStartAcute?.addEventListener("click", () => startPathway("acute", ACUTE?.start || "A0"));

  // Preserve stable behavior: if stable module exists, run it; otherwise, do nothing destructive
  btnStartStable?.addEventListener("click", () => {
    if (STABLE) startPathway("stable", STABLE.start);
    else {
      // If your partner stable module routes elsewhere, don't break it.
      // (You can replace this later with the partner’s intended handler.)
      alert("Stable pathway module not loaded in this build.");
    }
  });

  btnEvidence?.addEventListener("click", openEvidenceView);
  btnContra?.addEventListener("click", openContraView);

  btnEvidenceHome?.addEventListener("click", goHome);
  btnContraHome?.addEventListener("click", goHome);

  btnBack?.addEventListener("click", backOne);
  btnReset?.addEventListener("click", resetPathway);
  btnHome?.addEventListener("click", goHome);

  // ----------------------------
  // Hash routing (simple)
  // ----------------------------
  function routeFromHash() {
    const h = window.location.hash || "#home";
    if (h === "#runner") {
      showView("runner");
      renderRunner();
      return true;
    }
    if (h === "#evidence") {
      openEvidenceView();
      return true;
    }
    if (h === "#contra") {
      openContraView();
      return true;
    }
    if (h === "#home") {
      goHome();
      return true;
    }
    return false;
  }

  window.addEventListener("hashchange", () => {
    routeFromHash();
  });

  // Boot
  routeFromHash();
  if (VIEWS.runner && !VIEWS.runner.classList.contains("hidden") && ACUTE) {
    renderRunner();
  }
});
