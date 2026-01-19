export function evaluateInocaChooser(inputs) {
  const values = {
    pathwayId: "stable-inoca-chooser",
    version: "v1.0",
    inputSummary: { ...inputs },
    branchesTaken: [],
  };

  const flags = [];
  const nextSteps = [];
  const pushFlag = (severity, code, message) => flags.push({ severity, code, message });
  const step = (label, detail, strength = null, level = "info", link = null) => ({ label, detail, strength, level, link });

  pushFlag("info", "SCOPE", "INOCA chooser module. Select a diagnostic strategy; feasibility guidance is non-blocking.");

  if (!inputs.pathChoice) {
    pushFlag("warning", "REQ_PATH", "Choose an INOCA diagnostic pathway to proceed.");
    return finalize(values, flags, {
      disposition: "Incomplete",
      summary: "No pathway selected.",
      nextSteps,
    });
  }

  values.branchesTaken.push(`pathChoice=${inputs.pathChoice}`);

  // Layer 3: if limitation chosen, warn + suggest alternatives
  if (inputs.anyLimit === true) {
    pushFlag("warning", "FEAS_LIMIT", formatNote("Selected pathway may be limited by feasibility/patient/site factors.", inputs.limitNotes));
    nextSteps.push(step(
      "Suggested alternatives (non-blocking)",
      "If feasibility is limited, consider a different INOCA strategy based on availability and patient factors.",
      null,
      "info"
    ));
  }

  // Route to downstream module (links)
  if (inputs.pathChoice === "invasive") {
    nextSteps.push(step(
      "Invasive coronary function testing",
      "Proceed to invasive coronary function testing pathway (CFR/IMR ± acetylcholine, per local protocol).",
      "COR 2a",
      "info",
      "/stable/modules/inoca_invasive_testing/index.html"
    ));
    return finalize(values, flags, {
      disposition: "Invasive coronary function testing",
      summary: "Invasive INOCA evaluation selected (COR 2a).",
      nextSteps,
    });
  }

  if (inputs.pathChoice === "pet_cmr") {
    nextSteps.push(step(
      "Stress PET or stress CMR with MBFR",
      "Proceed to noninvasive INOCA pathway using PET/CMR with myocardial blood flow reserve.",
      "COR 2a",
      "info",
      "/stable/modules/inoca_pet_cmr/index.html"
    ));
    return finalize(values, flags, {
      disposition: "Stress PET/CMR (MBFR)",
      summary: "Noninvasive PET/CMR INOCA evaluation selected (COR 2a).",
      nextSteps,
    });
  }

  if (inputs.pathChoice === "echo_cfvr") {
    nextSteps.push(step(
      "Stress echo with CFVR",
      "Proceed to echo-based INOCA pathway using coronary flow velocity reserve (CFVR).",
      "COR 2b",
      "info",
      "/stable/modules/inoca_echo_cfvr/index.html"
    ));
    return finalize(values, flags, {
      disposition: "Stress echo (CFVR)",
      summary: "Echo-based INOCA evaluation selected (COR 2b).",
      nextSteps,
    });
  }

  pushFlag("warning", "UNKNOWN_PATH", "Unrecognized pathway selection.");
  return finalize(values, flags, { disposition: "Incomplete", summary: "Unknown pathway.", nextSteps });
}

function finalize(values, flags, interpretation) {
  return { values, flags, interpretation };
}

function yesNoToBool(v) {
  if (!v) return null;
  if (v === "yes") return true;
  if (v === "no") return false;
  return null;
}

function formatNote(prefix, note) {
  const trimmed = (note || "").trim();
  return trimmed ? `${prefix} Note: ${trimmed}` : prefix;
}

// ------------------------------
// UI glue
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("tool-form");
  const resetBtn = document.getElementById("resetBtn");
  const resultsContainer = document.getElementById("results-container");
  const flagsContainer = document.getElementById("flags-container");

  const pathChoice = document.getElementById("pathChoice");
  const layer3Wrap = document.getElementById("layer3Wrap");
  const feasAbbrev = document.getElementById("feasAbbrev");
  const backBtn = document.getElementById("backBtn");
backBtn?.addEventListener("click", () => window.history.back());

  function setDisplay(el, show) {
    if (!el) return;
    el.style.display = show ? "" : "none";
  }

  function updateFeasAbbrev(choice) {
    const map = {
      invasive: `
        <strong>Invasive testing (3)</strong>
        <ul>
          <li>Requires cath lab capability and expertise</li>
          <li>Consider bleeding/vascular access considerations</li>
          <li>Use local protocol for vasoreactivity testing</li>
        </ul>`,
      pet_cmr: `
        <strong>PET/CMR with MBFR (3)</strong>
        <ul>
          <li>Requires MBFR-capable PET/CMR workflow</li>
          <li>Caffeine can interfere with vasodilator stress</li>
          <li>CMR may be limited by devices/claustrophobia</li>
        </ul>`,
      echo_cfvr: `
        <strong>Echo with CFVR (3)</strong>
        <ul>
          <li>Operator dependence / acoustic windows</li>
          <li>CFVR workflow may not be widely available</li>
          <li>Arrhythmias may reduce feasibility</li>
        </ul>`,
    };
    feasAbbrev.innerHTML = map[choice] || `
      <strong>Abbreviated considerations (3)</strong>
      <ul>
        <li>Local availability/experience varies by modality</li>
        <li>Patient factors may limit test feasibility</li>
        <li>If limited, consider an alternative INOCA pathway</li>
      </ul>`;
  }

  function normalize() {
    const choice = pathChoice.value || "";
    const showL3 = !!choice;
    setDisplay(layer3Wrap, showL3);
    updateFeasAbbrev(choice);
  }

  pathChoice.addEventListener("change", normalize);
  normalize();
  setupModals();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const inputs = readInputs();
    const result = evaluateInocaChooser(inputs);
    renderResults(resultsContainer, result);
    renderFlags(flagsContainer, result.flags);
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    normalize();
    resultsContainer.innerHTML = `<p class="results-placeholder">Choose a pathway and tap “Run pathway.”</p>`;
    flagsContainer.innerHTML = `<p class="results-placeholder">Non-blocking notes and alternatives appear here.</p>`;
  });
});

function readInputs() {
  const get = (id) => document.getElementById(id)?.value ?? "";
  const getText = (id) => (document.getElementById(id)?.value ?? "").trim();

  return {
    pathChoice: get("pathChoice") || null,
    anyLimit: yesNoToBool(get("anyLimit")),
    limitNotes: getText("limitNotes"),
  };
}

// Modals
function setupModals() {
  const backdrop = document.getElementById("modal-backdrop");
  const triggers = document.querySelectorAll("[data-modal]");
  const closeBtns = document.querySelectorAll("[data-close='true']");

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("is-open");
    backdrop.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    backdrop.setAttribute("aria-hidden", "false");
  }

  function closeAll() {
    document.querySelectorAll(".modal.is-open").forEach((m) => {
      m.classList.remove("is-open");
      m.setAttribute("aria-hidden", "true");
    });
    backdrop.classList.remove("is-open");
    backdrop.setAttribute("aria-hidden", "true");
  }

  triggers.forEach((t) => t.addEventListener("click", () => openModal(t.getAttribute("data-modal"))));
  closeBtns.forEach((b) => b.addEventListener("click", closeAll));
  backdrop?.addEventListener("click", closeAll);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });
}

// Rendering (supports step.link)
function renderResults(container, result) {
  if (!container) return;

  const disp = result?.interpretation?.disposition ?? "—";
  const summary = result?.interpretation?.summary ?? "";

  const steps = (result?.interpretation?.nextSteps || [])
    .map((s) => {
      const strength = s.strength ? `<div style="color: var(--color-text-secondary); margin-top: 0.15rem;">${escapeHtml(s.strength)}</div>` : "";
      const link = s.link
        ? `<div style="margin-top:0.45rem;"><a class="link-btn" href="${escapeHtml(s.link)}">Open module</a></div>`
        : "";
      return `
        <div style="margin:0.6rem 0; padding-top:0.4rem; border-top:1px solid rgba(255,255,255,0.06);">
          <div><strong>${escapeHtml(s.label)}</strong></div>
          <div style="color: var(--color-text-secondary); margin-top: 0.15rem;">${escapeHtml(s.detail || "")}</div>
          ${strength}
          ${link}
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div>
      <div style="margin-bottom: 0.6rem;">
        <div style="color: var(--color-text-secondary); font-size: 0.9rem;">Disposition</div>
        <div style="font-size: 1.05rem;"><strong>${escapeHtml(disp)}</strong></div>
        ${summary ? `<div style="color: var(--color-text-secondary); margin-top:0.25rem;">${escapeHtml(summary)}</div>` : ""}
      </div>

      <hr class="hr" />

      <div>
        <div style="color: var(--color-text-secondary); font-size: 0.9rem;">Next steps</div>
        ${steps || `<p class="results-placeholder">No next steps.</p>`}
      </div>
    </div>
  `;
}

function renderFlags(container, flags) {
  if (!container) return;

  if (!flags || flags.length === 0) {
    container.innerHTML = `<p class="results-placeholder">No flags raised.</p>`;
    return;
  }

  container.innerHTML = flags
    .map((f) => {
      const cls =
        f.severity === "high"
          ? "flag-pill flag-pill--danger"
          : f.severity === "warning"
          ? "flag-pill flag-pill--warning"
          : "flag-pill flag-pill--info";
      return `<div class="${cls}"><strong>${escapeHtml(f.code)}:</strong> ${escapeHtml(f.message)}</div>`;
    })
    .join("");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[m];
  });
}
