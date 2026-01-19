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
  const nodeResourcesEl = document.getElementById("node-resources");
  const nodeTerminalEl = document.getElementById("node-terminal");

  const btnBack = document.getElementById("btn-back");
  const btnReset = document.getElementById("btn-reset");
  const btnHome = document.getElementById("btn-home");

  // -------- Home buttons --------
  const btnStartAcute = document.getElementById("btn-start-acute");
  const btnStartStable = document.getElementById("btn-start-stable");
  const btnEvidence = document.getElementById("btnEvidence");
  const btnContra = document.getElementById("btnContra");

  // Evidence/Contra home buttons
  const btnEvidenceHome = document.getElementById("btn-evidence-home");
  const btnContraHome = document.getElementById("btn-contra-home");

  // -------- Modal --------
  const modalOverlay = document.getElementById("modalOverlay");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");
  let lastFocusedEl = null;

  // -------- Utilities --------
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

  function showView(viewKey) {
    Object.values(VIEWS).forEach((v) => v && v.classList.add("hidden"));
    VIEWS[viewKey]?.classList.remove("hidden");
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
  // Guideline markdown parser (generic)
  // ----------------------------
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
      const t = (h || "").replaceAll("**", "").trim();
      return t;
    }

    lines.forEach((line) => {
      const t = line.trim();
      if (!t || t === "---") return;

      if (t.startsWith("# ")) {
        // ignore top-level title
        return;
      }
      if (t.startsWith("## ")) {
        pushCurrent();
        current = {
          title: normalizeHeading(t.slice(3)),
          paragraphs: [],
          bullets: [],
          sub: [],
        };
        return;
      }
      if (t.startsWith("### ")) {
        if (!current) {
          current = { title: "Section", paragraphs: [], bullets: [], sub: [] };
        }
        current.sub.push({
          title: normalizeHeading(t.slice(4)),
          paragraphs: [],
          bullets: [],
        });
        return;
      }
      const isBullet = t.startsWith("* ");
      const isBoldOnlySub = t.startsWith("**(") && t.endsWith(")**");
      const activeSub = current?.sub?.length ? current.sub[current.sub.length - 1] : null;

      if (isBoldOnlySub) {
        // treat as a paragraph line (generic)
        const text = t.replaceAll("**", "").trim();
        if (activeSub) activeSub.paragraphs.push(text);
        else current?.paragraphs.push(text);
        return;
      }

      if (isBullet) {
        const text = t.slice(2).trim();
        if (activeSub) activeSub.bullets.push(text);
        else current?.bullets.push(text);
        return;
      }

      // plain paragraph
      if (activeSub) activeSub.paragraphs.push(t);
      else current?.paragraphs.push(t);
    });

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
          const bullets = (b.bullets || []).map((li) => `<li>${escapeHtml(li)}</li>`).join("");
          const ul = bullets ? `<ul>${bullets}</ul>` : "";
          return `${paras}${ul}`;
        };

        const subHtml = (sec.sub || [])
          .map((sub) => {
            const subBlob = JSON.stringify(sub).toLowerCase();
            if (q && !subBlob.includes(q)) return "";
            return `
              <div class="acc-subblock">
                <div class="acc-subhead">${escapeHtml(sub.title)}</div>
                ${renderBlock(sub)}
              </div>
            `;
          })
          .join("");

        const openAttr = openFirst && idx === 0 && !q ? "open" : "";
        return `
          <details ${openAttr}>
            <summary>${escapeHtml(sec.title)}</summary>
            <div class="acc-body">
              ${renderBlock(sec)}
              ${subHtml}
            </div>
          </details>
        `;
      })
      .join("");

    containerEl.innerHTML = html || `<p class="muted">No matches.</p>`;
  }

  // -------- Recommendations parsing (topic dropdowns + COR/LOE after each claim) --------
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

    const ensure = (title) => {
      if (!current)
        current = {
          title: stripSectionNumber(title || "Recommendations"),
          claims: [],
          sub: [],
        };
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
        addClaim(t.slice(2));
        continue;
      }

      const corloe = extractCorLoe(t);
      if (corloe) {
        attachCorToLast(corloe);
        continue;
      }

      // narrative line
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

  // -------- Contraindications rendering (dropdown per modality only) --------
  function renderContraindicationsByModality(containerEl, raw) {
    const lines = (raw || "").split("\n");
    const sections = [];
    let cur = null;

    const push = () => {
      if (!cur) return;
      const has = (cur.bodyLines && cur.bodyLines.some((x) => x.trim()));
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

      if (!cur) continue; // ignore preface

      cur.bodyLines.push(t);
    }
    push();

    const html = sections
      .map((sec, idx) => {
        const body = sec.bodyLines || [];
        const pieces = [];

        for (const line of body) {
          if (/^Contraindicated\s+or\s+Not\s+Appropriate\s+When:/i.test(line)) {
            pieces.push(
              `<div class="acc-subhead">Contraindicated or Not Appropriate When:</div>`
            );
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
  // Evidence / Contra content loading
  // ----------------------------
  let RECOMMENDATIONS_RAW = "";
  let CONTRA_RAW = "";
  let RECOMMENDATIONS_SECTIONS = [];

  const evidenceContentEl = document.getElementById("evidence-content");
  const evidenceSearchEl = document.getElementById("evidence-search");
  const evidenceFigureLinkEl = document.getElementById("evidence-figure-link");
  const contraContentEl = document.getElementById("contra-content");

  async function ensureEvidenceLoaded() {
    if (RECOMMENDATIONS_RAW && RECOMMENDATIONS_SECTIONS.length) return;
    RECOMMENDATIONS_RAW = await loadTextAsset("./Recommendations.txt");
    RECOMMENDATIONS_SECTIONS = parseRecommendations(RECOMMENDATIONS_RAW);
  }

  async function ensureContraLoaded() {
    if (CONTRA_RAW) return;
    CONTRA_RAW = await loadTextAsset("./ContraindicationsImagingModality.txt");
  }

  // Evidence search + initial render
  if (evidenceContentEl && evidenceSearchEl) {
    ensureEvidenceLoaded()
      .then(() => {
        renderRecommendations(
          evidenceContentEl,
          RECOMMENDATIONS_SECTIONS,
          evidenceSearchEl.value || ""
        );
      })
      .catch((err) => {
        console.error(err);
        evidenceContentEl.innerHTML = `<p class="muted">Unable to load recommendations.</p>`;
      });

    evidenceSearchEl.addEventListener("input", () => {
      renderRecommendations(
        evidenceContentEl,
        RECOMMENDATIONS_SECTIONS,
        evidenceSearchEl.value || ""
      );
    });
  }

  if (evidenceFigureLinkEl) {
    evidenceFigureLinkEl.addEventListener("click", (e) => {
      e.preventDefault();
      openDocModal("ACC/AHA COR/LOE interpretation", "./Recomendations.png");
    });
  }

  if (contraContentEl) {
    ensureContraLoaded()
      .then(() => {
        renderContraindicationsByModality(contraContentEl, CONTRA_RAW);
      })
      .catch((err) => {
        console.error(err);
        contraContentEl.innerHTML = `<p class="muted">Unable to load contraindications.</p>`;
      });
  }

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

  // -------- Runner state --------
  let activePathwayKey = "acute";
  let activeNodeId = "A0";
  let historyStack = [];

  function startPathway(pathwayKey, startNodeId) {
    activePathwayKey = pathwayKey;
    activeNodeId = startNodeId;
    historyStack = [];
    showView("runner");
    renderRunner();
  }

  function resetPathway() {
    const pathway = PATHWAYS[activePathwayKey];
    const startNode = pathway?.start || "A0";
    activeNodeId = startNode;
    historyStack = [];
    renderRunner();
  }

  function backOne() {
    const prev = historyStack.pop();
    if (!prev) return;
    activeNodeId = prev;
    renderRunner();
  }

  // -------- Runner rendering --------
  function renderRunner() {
    const nodes = PATHWAYS[activePathwayKey];
    const node = nodes?.[activeNodeId];
    if (!node) return;

    // Runner title + terminal pill
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
    runnerStepEl.textContent = `${activePathwayKey.toUpperCase()} • ${pageId}`;

    // Clear subactions per your requirements (no contraindications link on non-home pages)
    runnerSubactionsEl.innerHTML = "";

    nodeTitleEl.textContent = node.title || "";
    nodeBodyEl.textContent = node.body || "";

    // Flags
    nodeFlagsEl.innerHTML = "";
    if (node.flags && node.flags.length) {
      node.flags.forEach((f) => {
        nodeFlagsEl.insertAdjacentHTML("beforeend", makeFlagPill(f.text, f.level));
      });
    }

    // Resources
    nodeResourcesEl.innerHTML = "";
    if (node.resources && node.resources.length) {
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
          if (isPdf(url) || isImage(url)) {
            openDocModal(b.textContent?.trim() || "Resource", url);
          } else {
            window.open(url, "_blank", "noopener,noreferrer");
          }
        });
      });
    }

    // Options / terminal
    nodeOptionsEl.innerHTML = "";
    nodeTerminalEl.classList.add("hidden");
    nodeTerminalEl.innerHTML = "";

    if (node.type === "decision") {
      (node.options || []).forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.innerHTML = `
          <div class="choice-label">${escapeHtml(opt.label)}</div>
          ${opt.sub ? `<div class="choice-sub">${escapeHtml(opt.sub)}</div>` : ""}
        `;
        btn.addEventListener("click", () => {
          historyStack.push(activeNodeId);
          activeNodeId = opt.next;
          renderRunner();
        });
        nodeOptionsEl.appendChild(btn);
      });

      // optional secondary action button if present
      if (node.secondaryAction) {
        const btn2 = document.createElement("button");
        btn2.className = "choice-btn secondary";
        btn2.innerHTML = `
          <div class="choice-label">${escapeHtml(node.secondaryAction.label || "More")}</div>
        `;
        btn2.addEventListener("click", () => {
          if (node.secondaryAction.action === "OPEN_MODAL") {
            openModalityModal(node.secondaryAction.title || "Reference", node.secondaryAction.html || "");
          } else if (node.secondaryAction.action === "OPEN_URL") {
            window.open(node.secondaryAction.url, "_blank", "noopener,noreferrer");
          }
        });
        nodeOptionsEl.appendChild(btn2);
      }
    } else if (node.type === "terminal") {
      // Terminal nodes: no large "End of pathway" box; use small pill near header.
      nodeTerminalEl.classList.add("hidden");
      nodeTerminalEl.innerHTML = "";

      // Show terminal disposition in main body
      nodeBodyEl.textContent = node.disposition || "";

      // No options for terminal nodes
      nodeOptionsEl.innerHTML = "";
    }

    btnBack.disabled = historyStack.length === 0;
  }

  // -------- Routing / buttons --------
  btnStartAcute?.addEventListener("click", () => startPathway("acute", "A0"));

  // Stable opens module immediately (leave as-is if you already have stable module wiring)
  btnStartStable?.addEventListener("click", () => {
    // If stable module exists, it likely handles its own routing.
    // Keeping your existing behavior: open in new tab if you currently do so elsewhere.
    // Replace this with your stable module call if needed.
    window.location.hash = "#home";
    showView("home");
  });

  function goHome() {
    showView("home");
    window.location.hash = "#home";
  }

  btnEvidence?.addEventListener("click", () => {
    showView("evidence");
    window.location.hash = "#evidence";
    if (evidenceContentEl && evidenceSearchEl) {
      ensureEvidenceLoaded()
        .then(() => {
          renderRecommendations(
            evidenceContentEl,
            RECOMMENDATIONS_SECTIONS,
            evidenceSearchEl.value || ""
          );
        })
        .catch(console.error);
    }
  });

  btnContra?.addEventListener("click", () => {
    showView("contra");
    window.location.hash = "#contra";
    if (contraContentEl) {
      ensureContraLoaded()
        .then(() => {
          renderContraindicationsByModality(contraContentEl, CONTRA_RAW);
        })
        .catch(console.error);
    }
  });

  btnEvidenceHome?.addEventListener("click", goHome);
  btnContraHome?.addEventListener("click", goHome);

  btnBack?.addEventListener("click", backOne);
  btnReset?.addEventListener("click", resetPathway);
  btnHome?.addEventListener("click", goHome);

  function routeFromHash() {
    if (window.location.hash === "#runner") {
      showView("runner");
      renderRunner();
      return true;
    }
    if (window.location.hash === "#evidence") {
      showView("evidence");
      if (evidenceContentEl && evidenceSearchEl) {
        ensureEvidenceLoaded()
          .then(() => {
            renderRecommendations(
              evidenceContentEl,
              RECOMMENDATIONS_SECTIONS,
              evidenceSearchEl.value || ""
            );
          })
          .catch(console.error);
      }
      return true;
    }
    if (window.location.hash === "#contra") {
      showView("contra");
      if (contraContentEl) {
        ensureContraLoaded()
          .then(() => {
            renderContraindicationsByModality(contraContentEl, CONTRA_RAW);
          })
          .catch(console.error);
      }
      return true;
    }
    return false;
  }

  if (!routeFromHash()) goHome();
  window.addEventListener("hashchange", () => {
    if (!routeFromHash()) goHome();
  });
});
