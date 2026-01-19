// INOCA noninvasive chooser: modals + optional stress testing helper

document.addEventListener("DOMContentLoaded", () => {
  setupModals();
  setupOptionalStressHelper();
});

function setupOptionalStressHelper() {
  const modEl = document.getElementById("optStressModality");
  const mbfrWrap = document.getElementById("mbfrWrap");
  const cfvrWrap = document.getElementById("cfvrWrap");
  const mbfrEl = document.getElementById("optMbfrAvailable");
  const cfvrEl = document.getElementById("optCfvrAvailable");

  const outEl = document.getElementById("optStressOutput");
  const btnRow = document.getElementById("optStressBtns");
  const btnGoMbfr = document.getElementById("btnGoMbfr");
  const btnGoCfvr = document.getElementById("btnGoCfvr");

  const show = (el, on) => {
    if (!el) return;
    el.style.display = on ? "" : "none";
  };

  function render() {
    const mod = modEl?.value || "";
    const mbfr = mbfrEl?.value || "";
    const cfvr = cfvrEl?.value || "";

    // conditional questions
    show(mbfrWrap, mod === "pet" || mod === "cmr");
    show(cfvrWrap, mod === "echo");

    if (!outEl) return;

    if (!mod) {
      outEl.innerHTML = `<strong>Guidance</strong><p class="micro-note">Select a modality to see suggested next steps.</p>`;
      show(btnRow, false);
      return;
    }

    // default: show buttons row once modality chosen
    show(btnRow, true);

    // show/hide CFVR shortcut button
    show(btnGoCfvr, mod === "echo");

    // guidance text
    const lines = [];

    if (mod === "pet" || mod === "cmr") {
      lines.push("Preferred INOCA noninvasive approach is stress PET/CMR **with MBFR** when available (COR 2a).");

      if (mbfr === "yes") {
        lines.push("MBFR is available locally → use the PET/CMR (MBFR) module for interpretation buckets.");
      } else if (mbfr === "no") {
        lines.push("MBFR not available/uncertain → PET/CMR may still help detect ischemia, but CMD specificity is limited without MBFR; consider invasive testing if high suspicion persists (COR 2a).");
      } else {
        lines.push("If unsure about MBFR availability, you can still open the PET/CMR (MBFR) module to see what is required.");
      }
    }

    if (mod === "echo") {
      lines.push("Stress echo with **CFVR** may be reasonable to evaluate CMD in suspected INOCA (COR 2b).");

      if (cfvr === "yes") {
        lines.push("CFVR available locally → use the Echo (CFVR) module for interpretation buckets.");
      } else if (cfvr === "no") {
        lines.push("CFVR not available/uncertain → standard stress echo may identify ischemia but is less CMD-specific; consider PET/CMR (MBFR) if available or invasive testing when suspicion remains high.");
      } else {
        lines.push("If unsure about CFVR availability, open the Echo (CFVR) module to review what is required.");
      }
    }

    if (mod === "spect") {
      lines.push("Stress SPECT can detect ischemia, but does not provide MBFR/CFVR for CMD-focused INOCA classification.");
      lines.push("If symptoms persist and nonobstructive anatomy does not explain symptoms, consider PET/CMR (MBFR) or invasive testing depending on feasibility.");
    }

    if (mod === "exercise_ecg") {
      lines.push("Exercise ECG can assess ischemic symptoms/functional capacity, but is not CMD-specific for INOCA.");
      lines.push("If clinical suspicion for CMD/vasospasm is high, consider PET/CMR (MBFR), Echo (CFVR), or invasive testing depending on feasibility.");
    }

    outEl.innerHTML = `
      <strong>Guidance</strong>
      <ul style="margin:0.45rem 0 0; padding-left:1.15rem;">
        ${lines.map((x) => `<li>${escapeHtmlLoose(x)}</li>`).join("")}
      </ul>
      <p class="micro-note" style="margin-top:0.5rem;">
        This helper ranks options; it does not override guideline-directed decisions or local protocols.
      </p>
    `;
  }

  modEl?.addEventListener("change", render);
  mbfrEl?.addEventListener("change", render);
  cfvrEl?.addEventListener("change", render);

  render();
}

// ---- modal system (matches your other modules) ----
function setupModals() {
  const backdrop = document.getElementById("modal-backdrop");
  const triggers = document.querySelectorAll("[data-modal]");
  const closeBtns = document.querySelectorAll("[data-close='true']");

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("is-open");
    backdrop?.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    backdrop?.setAttribute("aria-hidden", "false");
  }

  function closeAll() {
    document.querySelectorAll(".modal.is-open").forEach((m) => {
      m.classList.remove("is-open");
      m.setAttribute("aria-hidden", "true");
    });
    backdrop?.classList.remove("is-open");
    backdrop?.setAttribute("aria-hidden", "true");
  }

  triggers.forEach((t) => t.addEventListener("click", () => openModal(t.getAttribute("data-modal"))));
  closeBtns.forEach((b) => b.addEventListener("click", closeAll));
  backdrop?.addEventListener("click", closeAll);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });
}

// We want to preserve bold markers in bullets without injecting HTML.
// So we escape and keep ** as plain text (safe).
function escapeHtmlLoose(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[m]));
}
