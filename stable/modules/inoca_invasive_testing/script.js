export function evaluateInocaInvasiveTesting(inputs) {
  const values = {
    pathwayId: "stable-inoca-invasive-testing",
    version: "v1.0",
    inputSummary: { ...inputs },
    branchesTaken: [],
  };

  const flags = [];
  const nextSteps = [];
  const pushFlag = (severity, code, message) => flags.push({ severity, code, message });

  pushFlag("info", "SCOPE", "Invasive INOCA phenotyping module (CMD vs VSA vs mixed). Optional prompts only.");

  // Non-blocking feasibility guidance
  if (inputs.anyLimit === true) {
    pushFlag("warning", "FEAS_LIMIT", formatNote("Invasive testing may be limited by feasibility/patient/site factors.", inputs.limitNotes));
    nextSteps.push({
      label: "Suggested alternatives (non-blocking)",
      detail: "Consider PET/CMR with MBFR or echo CFVR if invasive coronary function testing is not feasible.",
      strength: null,
      level: "info",
      link: "/stable/modules/inoca_invasive/index.html",
    });
  }

  if (!inputs.phenotype) {
    pushFlag("warning", "REQ_PHENOTYPE", "Select a phenotype/result bucket to summarize interpretation.");
    return finalize(values, flags, { disposition: "Incomplete", summary: "Missing phenotype selection.", nextSteps });
  }

  values.branchesTaken.push(`phenotype=${inputs.phenotype}`);

  const dispositionMap = {
    cmd: "CMD phenotype (per invasive testing)",
    vsa: "Vasospastic phenotype (per invasive testing)",
    mixed: "Mixed CMD + vasospasm phenotype",
    normal: "No CMD/VSA identified",
    inconclusive: "Inconclusive / incomplete invasive testing",
  };

  let disposition = dispositionMap[inputs.phenotype] || "Interpretation";
  let summary = "";
  const cor = "COR 2a (invasive testing)";

  // Conservative, non-treatment phrasing
  switch (inputs.phenotype) {
    case "cmd":
      summary = "Findings align with coronary microvascular dysfunction (CMD). Consider documenting phenotype and aligning management with institutional guidance and specialist input.";
      nextSteps.push({
        label: "Document phenotype",
        detail: "Record invasive findings and CMD phenotype in the medical record to guide downstream decision-making.",
        strength: cor,
        level: "info",
      });
      nextSteps.push({
        label: "Consider symptom-focused management pathway",
        detail: "Use local INOCA/CMD pathways for symptom-focused management and risk factor optimization (not provided by this tool).",
        strength: null,
        level: "info",
      });
      break;

    case "vsa":
      summary = "Findings align with a vasospastic angina (VSA) phenotype. Consider documenting phenotype and aligning management with institutional guidance and specialist input.";
      nextSteps.push({
        label: "Document phenotype",
        detail: "Record vasoreactivity results and VSA phenotype in the medical record to guide downstream decision-making.",
        strength: cor,
        level: "info",
      });
      nextSteps.push({
        label: "Consider trigger review / protocolized pathway",
        detail: "Follow local VSA pathways for trigger review and symptom-focused care (not provided by this tool).",
        strength: null,
        level: "info",
      });
      break;

    case "mixed":
      summary = "Findings suggest mixed CMD + vasospasm phenotype. Consider documenting phenotype and aligning management with institutional guidance and specialist input.";
      nextSteps.push({
        label: "Document mixed phenotype",
        detail: "Record both microvascular and vasospastic findings to guide downstream decision-making.",
        strength: cor,
        level: "warning",
      });
      nextSteps.push({
        label: "Specialist follow-up",
        detail: "Mixed phenotypes may benefit from structured follow-up within a local INOCA program, when available.",
        strength: null,
        level: "info",
      });
      break;

    case "normal":
      summary = "No CMD/VSA phenotype identified on invasive testing. If symptoms persist, consider alternative diagnoses and reassessment per local pathways.";
      nextSteps.push({
        label: "Reassess differential",
        detail: "If symptoms persist, reassess alternative cardiac and non-cardiac causes using local protocols.",
        strength: null,
        level: "info",
      });
      break;

    case "inconclusive":
      summary = "Testing was incomplete or inconclusive. Consider repeating/finishing phenotyping if feasible, or using noninvasive INOCA strategies.";
      nextSteps.push({
        label: "Consider alternative INOCA strategy",
        detail: "If invasive testing cannot be completed, consider PET/CMR (MBFR) or echo (CFVR).",
        strength: null,
        level: "info",
        link: "/stable/modules/inoca_invasive/index.html",
      });
      break;

    default:
      pushFlag("warning", "UNKNOWN_PHENOTYPE", "Unknown phenotype selection.");
      return finalize(values, flags, { disposition: "Incomplete", summary: "Unknown phenotype.", nextSteps });
  }

  // Navigation links
  nextSteps.push({
    label: "Return to INOCA chooser",
    detail: "Switch to PET/CMR (MBFR) or echo (CFVR) modules if desired.",
    strength: null,
    level: "info",
    link: "/stable/modules/inoca_invasive/index.html",
  });

  return finalize(values, flags, { disposition, summary, nextSteps });
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

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("tool-form");
  const resetBtn = document.getElementById("resetBtn");
  const resultsContainer = document.getElementById("results-container");
  const flagsContainer = document.getElementById("flags-container");
const backBtn = document.getElementById("backBtn");
backBtn?.addEventListener("click", () => window.history.back());
  setupModals();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const inputs = readInputs();
    const result = evaluateInocaInvasiveTesting(inputs);
    renderResults(resultsContainer, result);
    renderFlags(flagsContainer, result.flags);
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    resultsContainer.innerHTML = `<p class="results-placeholder">Select a phenotype/result bucket, then tap “Run pathway.”</p>`;
    flagsContainer.innerHTML = `<p class="results-placeholder">Non-blocking notes and alternatives appear here.</p>`;
  });
});

function readInputs() {
  const get = (id) => document.getElementById(id)?.value ?? "";
  const getText = (id) => (document.getElementById(id)?.value ?? "").trim();

  return {
    anyLimit: yesNoToBool(get("anyLimit")),
    limitNotes: getText("limitNotes"),
    phenotype: get("phenotype") || null,
  };
}

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
    const map = { "&": "&amp;", "<": "&lt;", ">": "&amp;", '"': "&quot;", "'": "&#039;" };
    return map[m];
  });
}
