export function evaluateInocaEchoCfvr(inputs) {
  const values = {
    pathwayId: "stable-inoca-echo-cfvr",
    version: "v1.0",
    inputSummary: { ...inputs },
    branchesTaken: [],
  };

  const flags = [];
  const nextSteps = [];
  const pushFlag = (severity, code, message) => flags.push({ severity, code, message });

  pushFlag("info", "SCOPE", "INOCA noninvasive module (stress echo with CFVR). Optional prompts only.");

  // Feasibility (non-blocking)
  if (inputs.anyLimit === true) {
    pushFlag("warning", "FEAS_LIMIT", formatNote("Stress echo CFVR may be limited by feasibility/patient/site factors.", inputs.limitNotes));
    nextSteps.push({
      label: "Suggested alternatives (non-blocking)",
      detail: "Consider PET/CMR with MBFR or invasive coronary function testing if echo CFVR is not feasible.",
      strength: null,
      level: "info",
      link: "/stable/modules/inoca_invasive/index.html",
    });
  }

  if (!inputs.resultBucket) {
    pushFlag("warning", "REQ_RESULT", "Select a result bucket to summarize interpretation.");
    return finalize(values, flags, { disposition: "Incomplete", summary: "Missing result bucket.", nextSteps });
  }

  values.branchesTaken.push(`resultBucket=${inputs.resultBucket}`);

  const cor = "COR 2b";
  let disposition = "Interpretation";
  let summary = "";

  // Conservative, figure-aligned buckets (no numeric thresholds assigned here)
  switch (inputs.resultBucket) {
    case "normal_cfvr_no_ischemia":
      disposition = "Lower event risk (per figure)";
      summary = "Normal CFVR with no ischemia aligns with a lower-risk bucket in the figure framework.";
      nextSteps.push({
        label: "Preventive + symptom-guided GDMT",
        detail: "Continue/intensify preventive strategies and symptom-guided GDMT.",
        strength: "COR 1 (general)",
        level: "info",
      });
      break;

    case "normal_cfvr_ischemia":
      disposition = "INOCA: ischemia without CMD (per figure)";
      summary = "Ischemia with normal CFVR aligns with INOCA without CMD in the figure framework.";
      nextSteps.push({
        label: "Consider phenotyping (if persistent symptoms)",
        detail: "If symptoms persist, consider further phenotyping per local protocols (noninvasive vs invasive).",
        strength: cor,
        level: "info",
      });
      break;

    case "reduced_cfvr_no_ischemia":
      disposition = "CMD criteria (per figure)";
      summary = "Reduced CFVR without ischemia aligns with CMD in the figure framework.";
      nextSteps.push({
        label: "Elevated risk for MACE (per figure)",
        detail: "Figure categorizes reduced flow reserve buckets as higher risk; intensify prevention and symptom-guided therapy.",
        strength: cor,
        level: "warning",
      });
      break;

    case "reduced_cfvr_ischemia":
      disposition = "CMD + ischemia criteria (per figure)";
      summary = "Reduced CFVR with ischemia aligns with CMD + ischemia in the figure framework.";
      nextSteps.push({
        label: "Elevated risk for MACE (per figure)",
        detail: "Figure categorizes this bucket as elevated risk; intensify prevention and symptom-guided therapy.",
        strength: cor,
        level: "warning",
      });
      break;

    default:
      pushFlag("warning", "UNKNOWN_BUCKET", "Unknown result bucket.");
      return finalize(values, flags, { disposition: "Incomplete", summary: "Unknown bucket.", nextSteps });
  }

  // Helpful navigation (non-blocking)
  nextSteps.push({
    label: "Return to INOCA chooser",
    detail: "Switch to PET/CMR (MBFR) or invasive testing if needed.",
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

  setupModals();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const inputs = readInputs();
    const result = evaluateInocaEchoCfvr(inputs);
    renderResults(resultsContainer, result);
    renderFlags(flagsContainer, result.flags);
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    resultsContainer.innerHTML = `<p class="results-placeholder">Select a result bucket, then tap “Run pathway.”</p>`;
    flagsContainer.innerHTML = `<p class="results-placeholder">Non-blocking notes and alternatives appear here.</p>`;
  });
});

function readInputs() {
  const get = (id) => document.getElementById(id)?.value ?? "";
  const getText = (id) => (document.getElementById(id)?.value ?? "").trim();

  return {
    anyLimit: yesNoToBool(get("anyLimit")),
    limitNotes: getText("limitNotes"),
    resultBucket: get("resultBucket") || null,
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
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[m];
  });
}
