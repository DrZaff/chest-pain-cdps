document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     VIEW HELPERS
  ========================== */
  const views = {
    home: document.getElementById("view-home"),
    runner: document.getElementById("view-runner"),
    evidence: document.getElementById("view-evidence"),
    contra: document.getElementById("view-contra"),
  };

  function showView(key) {
    Object.values(views).forEach(v => v && v.classList.add("hidden"));
    views[key]?.classList.remove("hidden");
  }

  /* =========================
     MODAL
  ========================== */
  const modalOverlay = document.getElementById("modalOverlay");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");

  function openDocModal(title, url) {
    modalTitle.textContent = title;
    if (url.endsWith(".png")) {
      modalBody.innerHTML = `<img src="${url}" style="max-width:100%;height:auto;">`;
    } else if (url.endsWith(".pdf")) {
      modalBody.innerHTML = `<iframe src="${url}" style="width:100%;height:80vh;"></iframe>`;
    }
    modalOverlay.classList.remove("hidden");
  }

  modalClose.addEventListener("click", () => {
    modalOverlay.classList.add("hidden");
    modalBody.innerHTML = "";
  });

  modalOverlay.addEventListener("click", e => {
    if (e.target === modalOverlay) modalClose.click();
  });

  /* =========================
     FETCH HELPERS
  ========================== */
  async function loadText(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return res.text();
  }

  function stripSectionNumber(t) {
    return t.replace(/^\d+(\.\d+)*\.\s*/, "").trim();
  }

  /* =========================
     RECOMMENDATIONS PARSER
  ========================== */
  function parseRecommendations(raw) {
    const lines = raw.split("\n");
    const sections = [];
    let current = null;
    let lastClaim = null;

    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;

      if (t.startsWith("## ")) {
        current = { title: stripSectionNumber(t.slice(3)), claims: [] };
        sections.push(current);
        lastClaim = null;
        continue;
      }

      if (t.startsWith("* ")) {
        lastClaim = { text: t.slice(2), corloe: "" };
        current?.claims.push(lastClaim);
        continue;
      }

      if (t.startsWith("**(") && t.endsWith(")**") && lastClaim) {
        lastClaim.corloe = t.replace(/\*\*/g, "");
      }
    }

    return sections;
  }

  function renderRecommendations(sections, query = "") {
    const container = document.getElementById("evidence-content");
    const q = query.toLowerCase();

    container.innerHTML = sections
      .filter(sec => JSON.stringify(sec).toLowerCase().includes(q))
      .map((sec, i) => `
        <details ${i === 0 && !q ? "open" : ""}>
          <summary>${sec.title}</summary>
          <ul>
            ${sec.claims.map(c =>
              `<li>${c.text} <span class="muted small">(${c.corloe})</span></li>`
            ).join("")}
          </ul>
        </details>
      `).join("");
  }

  /* =========================
     CONTRA PARSER
  ========================== */
  function renderContra(raw) {
    const container = document.getElementById("contra-content");
    const lines = raw.split("\n");
    let current = null;
    let html = "";

    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;

      if (t.startsWith("## ")) {
        if (current) html += `</div></details>`;
        current = stripSectionNumber(t.slice(3));
        html += `<details><summary>${current}</summary><div class="acc-body">`;
        continue;
      }

      if (/^Section\s*#/.test(t)) continue;

      if (/Contraindicated or Not Appropriate When:/i.test(t)) {
        html += `<div class="acc-subhead">${t}</div>`;
        continue;
      }

      if (t.startsWith("* ")) {
        html += `<li>${t.slice(2)}</li>`;
      } else {
        html += `<p>${t}</p>`;
      }
    }

    if (current) html += `</div></details>`;
    container.innerHTML = html;
  }

  /* =========================
     NAV BUTTONS
  ========================== */
  document.getElementById("btn-evidence").addEventListener("click", async () => {
    showView("evidence");
    const raw = await loadText("Recommendations.txt");
    const sections = parseRecommendations(raw);
    renderRecommendations(sections);

    document.getElementById("evidence-search").oninput = e =>
      renderRecommendations(sections, e.target.value);
  });

  document.getElementById("btn-contra").addEventListener("click", async () => {
    showView("contra");
    const raw = await loadText("ContraindicationsImagingModality.txt");
    renderContra(raw);
  });

  document.getElementById("btn-evidence-home").onclick = () => showView("home");
  document.getElementById("btn-contra-home").onclick = () => showView("home");

  document
    .getElementById("evidence-figure-link")
    .addEventListener("click", e => {
      e.preventDefault();
      openDocModal("ACC/AHA COR / LOE Interpretation", "Recommendations.png");
    });

  /* =========================
     INITIAL STATE
  ========================== */
  showView("home");

});
