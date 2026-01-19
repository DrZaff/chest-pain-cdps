/* script.js
 * Chest Pain Pathways (2021 ACC/AHA) — runner + references pages
 * Surgical: preserves acute pathway runner behavior + adds Recommendations/Contra rendering.
 * IMPORTANT: acute-pathway.js loads before this file and sets window.__ACUTE_PATHWAY__.
 */

(() => {
  "use strict";

  // ----------------------------
  // DOM helpers
  // ----------------------------
  const $ = (id) => document.getElementById(id);

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ----------------------------
  // Views (match your index.html IDs)
  // ----------------------------
  const views = {
    home: $("view-home"),
    runner: $("view-runner"),
    evidence: $("view-evidence"),
    contra: $("view-contra"),
  };

  function showView(key) {
    Object.entries(views).forEach(([k, el]) => {
      if (!el) return;
      el.classList.toggle("hidden", k !== key);
    });
  }

  // ----------------------------
  // Modal (for PDFs/images/resources)
  // ----------------------------
  const modalOverlay = $("modalOverlay");
  const modalTitle = $("modalTitle");
  const modalBody = $("modalBody");
  const modalClose = $("modalClose");
  let lastFocusedEl = null;

  function isPdf(url) {
    return /\.pdf(\?|#|$)/i.test(url || "");
  }
  function isImage(url) {
    return /\.(png|jpg|jpeg|gif|webp)(\?|#|$)/i.test(url || "");
  }

  function openDocModal(title, url) {
    if (!modalOverlay || !modalBody || !modalTitle) return;
    if (!url) return;

    lastFocusedEl = document.activeElement;
    modalTitle.textContent = title || "Reference";

    if (isPdf(url)) {
      modalBody.innerHTML = `
        <div class="doc-frame">
          <iframe src="${url}" title="${escapeHtml(title || "PDF")}"></iframe>
        </div>
      `;
    } else if (isImage(url)) {
      modalBody.innerHTML = `
        <div class="img-frame">
          <img src="${url}" alt="${escapeHtml(title || "Image")}" />
        </div>
      `;
    } else {
      modalBody.innerHTML = `
        <p><a href="${url}" target="_blank" rel="noopener noreferrer">Open resource</a></p>
      `;
    }

    modalOverlay.classList.remove("hidden");
    modalClose?.focus();
  }

  function closeModal() {
    modalOverlay?.classList.add("hidden");
    if (modalBody) modalBody.innerHTML = "";
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
  // Pathway normalization
  // Supports:
  //  - acute-pathway.js: window.__ACUTE_PATHWAY__ is a node-map {A0:{...}, A1:{...}}
  //  - stable module: may be {start:"S0", nodes:{...}} or similar
  // ----------------------------
  function normalizePathway(pw) {
    if (!pw) return null;
    const nodes = pw.nodes ? pw.nodes : pw; // acute is direct map
    const start = pw.start ? pw.start : Object.keys(nodes)[0];
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
  // Runner elements (match your index.html)
  // ----------------------------
  const runnerTitleEl = $("runner-title");
  const runnerStepEl = $("runner-step");
  const runnerSubactionsEl = $("runner-subactions");

  const nodeTitleEl = $("node-title");
  const nodeBodyEl = $("node-body");
  const nodeFlagsEl = $("node-flags");
  const nodeResourcesEl = $("node-resources");
  const nodeOptionsEl = $("node-options");
  const nodeTerminalEl = $("node-terminal"); // kept but we intentionally avoid big terminal boxes

  const btnBack = $("btn-back");
  const btnReset = $("btn-reset");
  const btnHome = $("btn-home");

  // Home buttons
  const btnStartAcute = $("btn-start-acute");
  const btnStartStable = $("btn-start-stable");
  const btnEvidence = $("btn-evidence");
  const btnContra = $("btn-contra");
  const btnExploreModalities = $("btnExploreModalities");

  // Evidence view elements
  const btnEvidenceHome = $("btn-evidence-home");
  const evidenceFigureLinkEl = $("evidence-figure-link");
  const evidenceSearchEl = $("evidence-search");
  const evidenceContentEl = $("evidence-content");

  // Contra view elements
  const btnContraHome = $("btn-contra-home");
  const contraContentEl = $("contra-content");

  // ----------------------------
  // Small “End of pathway” pill in header (no giant terminal box)
  // ----------------------------
  function ensureEndPill(isTerminal) {
    if (!runnerTitleEl) return;
    const existing = runnerTitleEl.querySelector(".end-pill");
    if (existing) existing.remove();
    if (!isTerminal) return;

    const pill = document.createElement("span");
    pill.className = "end-pill";
    pill.textContent = "End of pathway";
    runnerTitleEl.appendChild(pill);
  }

  function makeFlagPill(text, level) {
    const cls = level ? `flag-pill--${level}` : "";
    return `<span class="flag-pill ${cls}">${escapeHtml(text)}</span>`;
  }

  // ----------------------------
  // Runner state
  // ----------------------------
  let activePathwayKey = "acute";
  let activeNodeId = ACUTE?.start || "A0";
  let historyStack = [];

  function startPathway(pathwayKey, startNodeIdOverride) {
    const pw = PATHWAYS[pathwayKey];
    if (!pw) {
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

  function resetPathway() {
    const pw = PATHWAYS[activePathwayKey];
    activeNodeId = pw?.start || "A0";
    historyStack = [];
    renderRunner();
  }

  function backOne() {
    const prev = historyStack.pop();
    if (!prev) return;
    activeNodeId = prev;
    renderRunner();
  }

  function goToNode(nextId) {
    if (!nextId) return;
    historyStack.push(activeNodeId);
    activeNodeId = nextId;
    renderRunner();
  }

  // ----------------------------
  // Runner rendering (supports: decision, step, terminal)
  // ----------------------------
  function renderRunner() {
    const pw = PATHWAYS[activePathwayKey];
    const node = pw?.nodes?.[activeNodeId];
    if (!node) {
      // Fail-safe: do not hard-crash; return home if something is wrong
      console.error("Runner: missing node", activePathwayKey, activeNodeId);
      showView("home");
      window.location.hash = "#home";
      return;
    }

    // Title
    if (runnerTitleEl) {
      const baseTitle =
        activePathwayKey === "acute"
          ? "Acute chest pain pathway"
          : activePathwayKey === "stable"
          ? "Stable chest pain pathway"
          : "Pathway";
      runnerTitleEl.textContent = baseTitle;
      ensureEndPill(node.type === "terminal");
    }

    // Step label
    if (runnerStepEl) {
      const pageId = PAGE_IDS[activePathwayKey]?.[activeNodeId] || "—";
      runnerStepEl.textContent = `${activePathwayKey.toUpperCase()} • ${pageId}`;
    }

    // Per your rule: do not show “Open testing contraindications” link on non-home pages
    if (runnerSubactionsEl) runnerSubactionsEl.innerHTML = "";

    // Node content
    if (nodeTitleEl) nodeTitleEl.textContent = node.title || "—";
    if (nodeBodyEl) nodeBodyEl.textContent = node.body || "";

    // Flags (render from node.flags[] like {level,text})
    if (nodeFlagsEl) {
      const flags = Array.isArray(node.flags) ? node.flags : [];
      nodeFlagsEl.innerHTML = flags.length
        ? flags.map((f) => makeFlagPill(f.text || f.message || "", f.level || "")).join("")
        : "";
    }

    // Resources
    if (nodeResourcesEl) {
      const resources = Array.isArray(node.resources) ? node.resources : [];
      if (!resources.length) {
        nodeResourcesEl.classList.add("hidden");
        nodeResourcesEl.innerHTML = "";
      } else {
        nodeResourcesEl.classList.remove("hidden");
        nodeResourcesEl.innerHTML = resources
          .map((r, idx) => {
            const label = r.label || `Resource ${idx + 1}`;
            const url = r.url || "";
            // Always open via modal for PDFs/images when possible
            return `
              <button class="btn-ghost linklike" type="button" data-res-url="${escapeHtml(
                url
              )}" data-res-label="${escapeHtml(label)}">${escapeHtml(label)}</button>
            `;
          })
          .join("");

        nodeResourcesEl.querySelectorAll("button[data-res-url]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const url = btn.getAttribute("data-res-url") || "";
            const label = btn.getAttribute("data-res-label") || "Reference";
            if (!url) return;
            openDocModal(label, url);
          });
        });
      }
    }

    // Options (decision/step)
    if (nodeOptionsEl) nodeOptionsEl.innerHTML = "";
    if (nodeTerminalEl) {
      // We intentionally suppress large “terminal” boxes per your requirement
      nodeTerminalEl.classList.add("hidden");
      nodeTerminalEl.innerHTML = "";
    }

    if (node.type === "decision") {
      const opts = Array.isArray(node.options) ? node.options : [];
      opts.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.type = "button";

        const sub = opt.sub ? `<span class="choice-sub">${escapeHtml(opt.sub)}</span>` : "";
        btn.innerHTML = `<div>${escapeHtml(opt.label || "Select")}</div>${sub}`;

        btn.addEventListener("click", () => {
          // Action-style options supported (keeps acute module flexibility)
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

        nodeOptionsEl?.appendChild(btn);
      });
    } else if (node.type === "step") {
      // IMPORTANT: step behavior (Continue button)
      const next = node.next;
      const label = node.continueLabel || "Continue";

      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.type = "button";
      btn.innerHTML = `<div>${escapeHtml(label)}</div>`;
      btn.addEventListener("click", () => goToNode(next));
      nodeOptionsEl?.appendChild(btn);
    } else if (node.type === "terminal") {
      // Terminal: show disposition in body; no giant end box
      if (nodeBodyEl) nodeBodyEl.textContent = node.disposition || node.body || "";
      if (nodeOptionsEl) nodeOptionsEl.innerHTML = "";
    }

    if (btnBack) btnBack.disabled = historyStack.length === 0;
  }

  // ----------------------------
  // Recommendations (from Recommendations.txt)
  // Desired behavior:
  // - dropdown list by topic (## headings)
  // - no section numbers shown (stripSectionNumber)
  // - COR/LOE after every claim (pulled from next-line pattern in your file)
  // - search bar (already in index.html)
  // - top link opens recommendations.png figure (modal)
  // ----------------------------
  function stripSectionNumber(title) {
    return (title || "")
      .replaceAll("**", "")
      .trim()
      .replace(/^\d+(?:\.\d+)*\.\s*/, "")
      .trim();
  }

  function extractCorLoe(line) {
    // Accept lines like **(COR 2a, LOE B-NR)** or (COR 1, LOE C-LD)
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

    const ensure = (title) => {
      if (!current) current = { title: stripSectionNumber(title || "Recommendations"), claims: [], sub: [] };
    };

    const addClaim = (text) => {
      ensure("Recommendations");
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
        ensure("Recommendations");
        currentSub = { heading: stripSectionNumber(t.slice(4)), claims: [] };
        current.sub.push(currentSub);
        continue;
      }

      if (t.startsWith("* ")) {
        // Bullet claim line
        addClaim(t.slice(2));
        continue;
      }

      const corloe = extractCorLoe(t);
      if (corloe) {
        // COR/LOE line belongs to the immediately preceding claim
        attachCorToLast(corloe);
        continue;
      }

      // Otherwise: treat as narrative claim (rare in your file but safe)
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
          const cor = c.corloe
            ? ` <span class="muted small">${escapeHtml(c.corloe)}</span>`
            : "";
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

  let RECOMMENDATIONS_SECTIONS = [];

  async function loadRecommendations() {
    const res = await fetch("./Recommendations.txt", { cache: "no-store" });
    if (!res.ok) throw new Error(`Recommendations.txt not found (${res.status})`);
    const raw = await res.text();
    RECOMMENDATIONS_SECTIONS = parseRecommendations(raw);
    if (evidenceContentEl) renderRecommendations(evidenceContentEl, RECOMMENDATIONS_SECTIONS, evidenceSearchEl?.value || "");
  }

  // ----------------------------
  // Contraindications
  // Desired behavior:
  // - dropdown per modality only (## headings)
  // - keep "Contraindicated or Not Appropriate When:" as a subheader (not its own dropdown)
  // NOTE: this expects a file at ./ContraindicationsImagingModality.txt.
  // If you use a different filename, change it below.
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
        // Pull out the “Contraindicated…” line if present
        const body = sec.bodyLines || [];
        const ciIndex = body.findIndex((x) =>
          /^contraindicated or not appropriate when:/i.test(x)
        );

        let ciLine = "";
        let remainder = body;

        if (ciIndex >= 0) {
          ciLine = body[ciIndex];
          remainder = body.slice(ciIndex + 1);
        }

        const remainderHtml = remainder.length
          ? `<ul>${remainder.map((x) => `<li>${escapeHtml(x.replace(/^\*\s*/, ""))}</li>`).join("")}</ul>`
          : "";

        return `
          <details ${idx === 0 ? "open" : ""}>
            <summary>${escapeHtml(sec.title)}</summary>
            <div class="acc-body">
              ${
                ciLine
                  ? `<div class="acc-subhead">${escapeHtml(ciLine)}</div>`
                  : `<div class="acc-subhead">Contraindicated or Not Appropriate When:</div>`
              }
              ${remainderHtml}
            </div>
          </details>
        `;
      })
      .join("");

    containerEl.innerHTML = html || `<p class="muted">Unable to render contraindications.</p>`;
  }

  async function loadContraindications() {
    const res = await fetch("./ContraindicationsImagingModality.txt", { cache: "no-store" });
    if (!res.ok) throw new Error(`ContraindicationsImagingModality.txt not found (${res.status})`);
    const raw = await res.text();
    if (contraContentEl) renderContraindicationsByModality(contraContentEl, raw);
  }

  // ----------------------------
  // “Explore testing modalities” (your home button exists)
  // Minimal behavior: opens modal with a simple chooser + links.
  // (Does not alter pathways.)
  // ----------------------------
  function openExploreModalities() {
    const html = `
      <p class="muted">Quick access references (opens in modal when possible).</p>
      <div class="btn-stack">
        <button class="choice-btn" type="button" data-open-doc="./Recomendations.png" data-open-title="ACC/AHA COR/LOE interpretation">
          <div>COR/LOE interpretation figure</div>
        </button>
      </div>
      <p class="muted small">Add modality PDFs here as you wire them in (CCTA, ICA, etc.).</p>
    `;
    openDocModal("Explore testing modalities", ""); // open modal shell
    // Replace modal body content safely
    if (modalBody) modalBody.innerHTML = html;

    modalBody?.querySelectorAll("button[data-open-doc]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const url = btn.getAttribute("data-open-doc") || "";
        const title = btn.getAttribute("data-open-title") || "Reference";
        openDocModal(title, url);
      });
    });
  }

  // ----------------------------
  // Navigation wiring (IDs match your pasted index.html)
  // ----------------------------
  btnStartAcute?.addEventListener("click", () => startPathway("acute", ACUTE?.start || "A0"));
  btnStartStable?.addEventListener("click", () => startPathway("stable", STABLE?.start));
  btnBack?.addEventListener("click", backOne);
  btnReset?.addEventListener("click", resetPathway);
  btnHome?.addEventListener("click", () => {
    showView("home");
    window.location.hash = "#home";
  });

  btnEvidence?.addEventListener("click", async () => {
    showView("evidence");
    window.location.hash = "#evidence";
    try {
      await loadRecommendations();
    } catch (err) {
      console.error(err);
      if (evidenceContentEl) evidenceContentEl.innerHTML = `<p class="muted">Unable to load recommendations.</p>`;
    }
  });

  btnContra?.addEventListener("click", async () => {
    showView("contra");
    window.location.hash = "#contra";
    try {
      await loadContraindications();
    } catch (err) {
      console.error(err);
      if (contraContentEl) contraContentEl.innerHTML = `<p class="muted">Unable to load contraindications.</p>`;
    }
  });

  btnExploreModalities?.addEventListener("click", () => openExploreModalities());

  btnEvidenceHome?.addEventListener("click", () => {
    showView("home");
    window.location.hash = "#home";
  });

  btnContraHome?.addEventListener("click", () => {
    showView("home");
    window.location.hash = "#home";
  });

  evidenceSearchEl?.addEventListener("input", () => {
    if (!evidenceContentEl) return;
    renderRecommendations(evidenceContentEl, RECOMMENDATIONS_SECTIONS, evidenceSearchEl.value || "");
  });

  // Top link: open the COR/LOE figure image in modal
  evidenceFigureLinkEl?.addEventListener("click", (e) => {
    e.preventDefault();
    openDocModal("ACC/AHA COR/LOE interpretation", "./Recomendations.png");
  });

  // ----------------------------
  // Initial load
  // ----------------------------
  function boot() {
    // Default route: home
    if (!window.location.hash || window.location.hash === "#home") {
      showView("home");
      return;
    }

    // Support direct linking to views
    if (window.location.hash === "#runner") {
      // Keep acute as default if stable missing
      startPathway("acute", ACUTE?.start || "A0");
      return;
    }

    if (window.location.hash === "#evidence") {
      showView("evidence");
      loadRecommendations().catch((err) => {
        console.error(err);
        if (evidenceContentEl) evidenceContentEl.innerHTML = `<p class="muted">Unable to load recommendations.</p>`;
      });
      return;
    }

    if (window.location.hash === "#contra") {
      showView("contra");
      loadContraindications().catch((err) => {
        console.error(err);
        if (contraContentEl) contraContentEl.innerHTML = `<p class="muted">Unable to load contraindications.</p>`;
      });
      return;
    }

    showView("home");
  }

  document.addEventListener("DOMContentLoaded", () => {
    boot();
  });
})();
