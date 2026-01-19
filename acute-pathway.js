/* acute-pathway.js
 * Extracted from Script-old.js buildAcutePathway() return object.
 * Loads BEFORE script.js so script.js can read window.__ACUTE_PATHWAY__.
 */

(() => {
  // DOI link for resource references (kept centralized if you want to use later)
  const DOI_URL = "https://doi.org/10.1161/CIR.0000000000001029";

  window.__ACUTE_PATHWAY__ = {
    // -----------------------------
    // A-001
    // -----------------------------
    A0: {
      id: "A0",
      type: "step",
      title: "Initial evaluation",
      body: "ECG (review for STEMI within 10 minutes), history, physical examination, chest XR, and troponins.",
      continueLabel: "Continue",
      next: "A1",
      flags: [{ level: "ok", text: "Start of pathway" }],
    },

    // -----------------------------
    // A-002 (triage after ECG)
    // NOTE: resources positioning/sizing is controlled by script.js render order.
    // -----------------------------
    A1: {
      id: "A1",
      type: "decision",
      title: "ECG result / initial triage",
      body: "Select the clinical picture after initial evaluation.",
      resources: [
        { label: "Probability of ischemia based on chest pain description (Figure 2)", url: DOI_URL },
        { label: "Chest pain history (Table 3)", url: DOI_URL },
        { label: "Chest pain physical exam (Table 4)", url: DOI_URL },
        { label: "ECG interpretation flowsheet (Figure 4)", url: DOI_URL },
      ],
      flags: [{ level: "warning", text: "Use clinical judgment; consider life-threatening etiologies." }],
      options: [
        {
          label: "STEMI",
          sub: "Follow STEMI protocol",
          next: "A_STEMI",
        },
        {
          label: "Obvious noncardiac cause",
          sub:
            "Examples: PE, aortic dissection, esophageal rupture, esophagitis, PUD, gallbladder disease, PNA, pneumothorax, costochondritis, Tietze syndrome, herpes zoster",
          next: "A2_NONCARDIAC",
        },
        {
          label: "Obvious non-ischemic cardiac cause",
          sub:
            "Examples: arrhythmia, aortic stenosis/regurgitation, hypertrophic cardiomyopathy, pericarditis, myocarditis",
          next: "A2_NONISCHEMIC_CARDIAC",
        },
        {
          label: "Possible ACS",
          sub: "Examples: UA, NSTEMI",
          next: "A3_POSSIBLE_ACS",
        },
      ],
    },

    // -----------------------------
    // A-003
    // -----------------------------
    A_STEMI: {
      id: "A_STEMI",
      type: "terminal",
      title: "FOLLOW STEMI PROTOCOL",
      disposition:
        "STEMI Protocol Summary:\n• ASA load\n• Supplemental O2 if SpO2 < 90%\n• Reperfusion: door-to-balloon <90 min (or <120 min if transfer) OR fibrinolysis within 30 min of arrival followed by PCI within 3–24 h\n• P2Y12 inhibitor\n• High-intensity statin\n• Beta-blocker (if no contraindications)\n• ACEi/ARB within 24 h\n• MRA (if HF)\n• Pain control",
      flags: [{ level: "danger", text: "End of pathway" }],
      resources: [{ label: "COR/LOE interpretation figure", url: "./Recomendations.png" }],
    },

    // -----------------------------
    // A-004
    // -----------------------------
    A2_NONCARDIAC: {
      id: "A2_NONCARDIAC",
      type: "terminal",
      title: "Obvious noncardiac cause: no further cardiac testing required",
      disposition: "No further cardiac testing required.",
      flags: [{ level: "danger", text: "End of pathway" }],
    },

    // -----------------------------
    // A-005
    // -----------------------------
    A2_NONISCHEMIC_CARDIAC: {
      id: "A2_NONISCHEMIC_CARDIAC",
      type: "terminal",
      title: "Obvious non-ischemic cardiac cause: evaluate and treat condition",
      disposition: "Evaluate and treat condition; other cardiac testing as needed.",
      flags: [{ level: "danger", text: "End of pathway" }],
    },

    // -----------------------------
    // A-006
    // -----------------------------
    A3_POSSIBLE_ACS: {
      id: "A3_POSSIBLE_ACS",
      type: "step",
      title: "Possible ACS",
      body: "Obtain troponin (if not already drawn).",
      continueLabel: "Continue",
      next: "A4_RISK_STRATIFY",
    },

    // -----------------------------
    // A-007 + A-008 merged here
    // -----------------------------
    A4_RISK_STRATIFY: {
      id: "A4_RISK_STRATIFY",
      type: "decision",
      title: "Risk stratification",
      body:
        "Use a clinical decision pathway (CDP) to risk stratify (HEART score: https://heart-score-calculator.netlify.app). Then select risk category.",
      options: [
        { label: "Open HEART score (new window)", action: "OPEN_HEART" },
        { label: "Low risk", next: "A_TERM_LOW" },
        { label: "Intermediate risk", next: "A6_INTERMEDIATE_CAD_KNOWN" },
        { label: "High risk", next: "A_TERM_ICA_CLASS1" },
      ],
    },

    // -----------------------------
    // A-009
    // -----------------------------
    A_TERM_LOW: {
      id: "A_TERM_LOW",
      type: "terminal",
      title: "Low risk: No testing required → discharge patient.",
      disposition: "",
      flags: [{ level: "danger", text: "End of pathway" }],
    },

    // -----------------------------
    // A-006 branch (intermediate)
    // -----------------------------
    A6_INTERMEDIATE_CAD_KNOWN: {
      id: "A6_INTERMEDIATE_CAD_KNOWN",
      type: "decision",
      title: "Intermediate risk",
      body:
        "Determine whether patient has known CAD. Known CAD includes prior MI, revascularization, or known obstructive/nonobstructive CAD on invasive angiography or CCTA.",
      options: [
        { label: "No known CAD", next: "A_INO_PRIOR_TEST" },
        { label: "Known CAD", next: "A_IK_ENTRY" },
      ],
    },

    // -----------------------------
    // Intermediate risk — No known CAD
    // -----------------------------
    A_INO_PRIOR_TEST: {
      id: "A_INO_PRIOR_TEST",
      type: "decision",
      title: "Prior testing?",
      body: "Has there been prior testing?",
      options: [
        { label: "Yes", next: "A_INO_PRIOR_Y" },
        { label: "No", next: "A_INO_PRIOR_N" },
      ],
    },

    A_INO_PRIOR_Y: {
      id: "A_INO_PRIOR_Y",
      type: "decision",
      title: "Prior testing result",
      body: "Select the most applicable prior testing result.",
      options: [
        { label: "Recent negative test*", next: "A_TERM_DISCHARGE_INOCA" },
        { label: "Prior inconclusive or mildly abnormal stress test ≤1y", next: "A_INO_CCTA_AFTER_INCONC_STRESS" },
        { label: "Prior moderate-severely abnormal ≤1y (no interval ICA)", next: "A_TERM_ICA_CLASS1" },
      ],
    },

    // A-013
    A_INO_CCTA_AFTER_INCONC_STRESS: {
      id: "A_INO_CCTA_AFTER_INCONC_STRESS",
      type: "step",
      title: "CCTA (2a recommendation)",
      resources: [
        { label: "CCTA summary (PDF)", url: "./CCTA-summary.pdf" },
        { label: "COR/LOE interpretation figure", url: "./Recomendations.png" },
      ],
      body: "Proceed to CCTA and interpret results.",
      continueLabel: "Continue",
      next: "A_INO_CCTA_RESULTS_1",
    },

    A_INO_CCTA_RESULTS_1: {
      id: "A_INO_CCTA_RESULTS_1",
      type: "decision",
      title: "CCTA result",
      body: "Select CCTA interpretation.",
      options: [
        { label: "Nonobstructive CAD (<50% stenosis)", next: "A_TERM_DISCHARGE_INOCA" },
        { label: "Inconclusive stenosis", next: "A_INO_FFRCT_STRESS_OR_MED" },
        { label: "Obstructive CAD (≥50% stenosis)", next: "A_INO_OBS_BRANCH" },
      ],
    },

    A_INO_PRIOR_N: {
      id: "A_INO_PRIOR_N",
      type: "decision",
      title: "No prior testing",
      body:
        "Select an initial diagnostic testing strategy.\nStress testing options include exercise ECG, stress CMR, stress echo, stress PET, or stress SPECT.",
      resources: [
        { label: "CCTA summary (PDF)", url: "./CCTA-summary.pdf" },
        { label: "COR/LOE interpretation figure", url: "./Recomendations.png" },
      ],
      options: [
        { label: "Stress testing (Class 1 recommendation)", next: "A_INO_STRESS_RESULTS_PRETEST" },
        { label: "CCTA (Class 1 recommendation)", next: "A_INO_CCTA_RESULTS_2" },
      ],
    },

    A_INO_STRESS_RESULTS_PRETEST: {
      id: "A_INO_STRESS_RESULTS_PRETEST",
      type: "decision",
      title: "Stress test result",
      body: "Select stress test interpretation.",
      options: [
        { label: "Negative or mildly abnormal", next: "A_TERM_DISCHARGE_INOCA" },
        { label: "Moderate-severe ischemia", next: "A_TERM_ICA_CLASS1" },
        { label: "Inconclusive", next: "A_INO_CCTA_AFTER_INCONC_STRESS" },
      ],
    },

    A_INO_CCTA_RESULTS_2: {
      id: "A_INO_CCTA_RESULTS_2",
      type: "decision",
      title: "CCTA result",
      body: "Select CCTA interpretation.",
      options: [
        { label: "Nonobstructive CAD (<50% stenosis)", next: "A_TERM_DISCHARGE_INOCA" },
        { label: "Inconclusive stenosis", next: "A_INO_FFRCT_STRESS_OR_MED" },
        { label: "Obstructive CAD (≥50% stenosis)", next: "A_INO_OBS_BRANCH" },
      ],
    },

    // For inconclusive CCTA or obstructive CAD without high-risk/frequent angina:
    A_INO_FFRCT_STRESS_OR_MED: {
      id: "A_INO_FFRCT_STRESS_OR_MED",
      type: "decision",
      title: "Next step after inconclusive CCTA / obstructive CAD without high-risk features",
      body: "Choose add-on test or decision to treat medically.",
      flags: [{ level: "warning", text: "FFR-CT turnaround time may affect prompt care decisions." }],
      options: [
        { label: "FFR-CT (2a recommendation)", next: "A_INO_FFRCT_RESULTS" },
        { label: "Stress testing (2a recommendation)", next: "A_INO_STRESS_RESULTS_POSTCCTA" },
        { label: "Decision to treat medically", next: "A_INO_GDMT_DISCHARGE_CLASS1" },
      ],
    },

    A_INO_FFRCT_RESULTS: {
      id: "A_INO_FFRCT_RESULTS",
      type: "decision",
      title: "FFR-CT result",
      body: "Select FFR-CT interpretation.",
      options: [
        { label: "FFR-CT > 0.80", next: "A_INO_GDMT_DISCHARGE_CLASS1" },
        { label: "FFR-CT ≤ 0.80", next: "A_TERM_ICA_CLASS1" },
      ],
    },

    A_INO_STRESS_RESULTS_POSTCCTA: {
      id: "A_INO_STRESS_RESULTS_POSTCCTA",
      type: "decision",
      title: "Stress test result",
      body: "Select stress test interpretation.",
      options: [
        { label: "Mild ischemia", next: "A_INO_GDMT_DISCHARGE_CLASS1" },
        { label: "Moderate-severe ischemia", next: "A_TERM_ICA_CLASS1" },
        { label: "Inconclusive", next: "A_INO_GDMT_DISCHARGE_CLASS1" },
      ],
    },

    A_INO_OBS_BRANCH: {
      id: "A_INO_OBS_BRANCH",
      type: "decision",
      title: "Obstructive CAD (≥50% stenosis)",
      body:
        "High-risk CAD or frequent angina? High-risk CAD means left main stenosis ≥ 50%; anatomically significant 3-vessel disease (≥70% stenosis).",
      options: [
        { label: "High-risk CAD or frequent angina", next: "A_TERM_ICA_CLASS1" },
        { label: "No high-risk CAD / no frequent angina", next: "A_INO_FFRCT_STRESS_OR_MED" },
      ],
    },

    // -----------------------------
    // A-028 / A-024 style GDMT discharge (Class 1)
    // -----------------------------
    A_INO_GDMT_DISCHARGE_CLASS1: {
      id: "A_INO_GDMT_DISCHARGE_CLASS1",
      type: "terminal",
      title: "Proceed with guideline-directed medical therapy (GDMT) (Class 1 recommendation) → discharge",
      disposition: "",
      flags: [{ level: "danger", text: "End of pathway" }],
      recommendedTests: ["GDMT"],
    },

    // -----------------------------
    // Discharge terminals
    // -----------------------------
    A_TERM_DISCHARGE_SIMPLE: {
      id: "A_TERM_DISCHARGE_SIMPLE",
      type: "terminal",
      title: "Discharge",
      disposition: "Discharge.",
      flags: [{ level: "danger", text: "End of pathway" }],
    },

    A_TERM_DISCHARGE_INOCA: {
      id: "A_TERM_DISCHARGE_INOCA",
      type: "terminal",
      title: "Discharge",
      disposition: "Discharge and consider INOCA pathway as an outpatient for frequent or persistent symptoms",
      flags: [{ level: "danger", text: "End of pathway" }],
    },

    // -----------------------------
    // Intermediate risk — Known CAD pathway entry
    // -----------------------------
    A_IK_ENTRY: {
      id: "A_IK_ENTRY",
      type: "decision",
      title: "Intermediate risk with known CAD",
      body: "Select known CAD phenotype.",
      flags: [
        {
          level: "warning",
          text: "Obstructive CAD includes prior CABG/PCI. High-risk CAD means left main stenosis ≥50%; anatomically significant 3-vessel disease (≥70% stenosis).",
        },
      ],
      options: [
        { label: "Nonobstructive CAD (<50% stenosis)", next: "A_IK_NONOBS_OPTIONS" },
        { label: "Obstructive CAD (≥50% stenosis)", next: "A_IK_OBS_OPTIONS" },
      ],
    },

    // Nonobstructive known CAD options
    A_IK_NONOBS_OPTIONS: {
      id: "A_IK_NONOBS_OPTIONS",
      type: "decision",
      title: "Known nonobstructive CAD",
      body:
        "Testing options (2a) or defer testing and intensify GDMT (Class 1). If extensive plaque is present, high-quality CCTA may be unlikely and stress testing is preferred.",
      resources: [
        { label: "CCTA summary (PDF)", url: "./CCTA-summary.pdf" },
        { label: "COR/LOE interpretation figure", url: "./Recomendations.png" },
      ],
      options: [
        { label: "CCTA (2a recommendation)", next: "A_IK_NONOBS_CCTA_RES" },
        {
          label: "Stress testing (2a recommendation)",
          sub: "Stress CMR, stress echo, stress PET, or stress SPECT",
          next: "A_IK_NONOBS_STRESS_RES",
        },
        { label: "Defer testing & intensify GDMT (Class 1 recommendation)", next: "A_INO_GDMT_DISCHARGE_CLASS1" },
      ],
    },

    A_IK_NONOBS_CCTA_RES: {
      id: "A_IK_NONOBS_CCTA_RES",
      type: "decision",
      title: "CCTA result (known nonobstructive CAD)",
      body: "Select CCTA result.",
      resources: [
        { label: "CCTA summary (PDF)", url: "./CCTA-summary.pdf" },
        { label: "COR/LOE interpretation figure", url: "./Recomendations.png" },
      ],
      options: [
        { label: "No change", next: "A_TERM_DISCHARGE_SIMPLE" },
        { label: "Obstructive CAD (≥50% stenosis)", next: "A_INO_FFRCT_STRESS_OR_MED" },
      ],
    },

    A_IK_NONOBS_STRESS_RES: {
      id: "A_IK_NONOBS_STRESS_RES",
      type: "decision",
      title: "Stress test result (known nonobstructive CAD)",
      body: "Select stress test result.",
      options: [
        { label: "Mild ischemia", next: "A_INO_GDMT_DISCHARGE_CLASS1" },
        { label: "Moderate-severe ischemia", next: "A_TERM_ICA_CLASS1" },
        { label: "No ischemia", next: "A_INO_GDMT_DISCHARGE_CLASS1" },
      ],
    },

    // Obstructive known CAD options
    A_IK_OBS_OPTIONS: {
      id: "A_IK_OBS_OPTIONS",
      type: "decision",
      title: "Known obstructive CAD",
      body:
        "Evaluate adequacy of GDMT. Option to defer testing and intensify GDMT (Class 1). If high-risk CAD or frequent angina, proceed to ICA.",
      options: [
        { label: "High-risk CAD or frequent angina", next: "A_TERM_ICA_CLASS1" },
        { label: "Stress testing (2a recommendation)", next: "A_IK_OBS_STRESS_RES" },
        { label: "Intensify GDMT & option to defer testing (Class 1 recommendation)", next: "A_INO_GDMT_DISCHARGE_CLASS1" },
      ],
    },

    A_IK_OBS_STRESS_RES: {
      id: "A_IK_OBS_STRESS_RES",
      type: "decision",
      title: "Stress test result (known obstructive CAD)",
      body: "Select stress test interpretation.",
      options: [
        { label: "Normal functional test", next: "A_TERM_DISCHARGE_SIMPLE" },
        { label: "Abnormal functional test", next: "A_IK_OBS_ABN_NOTE" },
      ],
    },

    // -----------------------------
    // A-034 updated: mild vs grossly abnormal
    // -----------------------------
    A_IK_OBS_ABN_NOTE: {
      id: "A_IK_OBS_ABN_NOTE",
      type: "decision",
      title: "Abnormal functional test",
      body: "Select degree of abnormality.",
      options: [
        { label: "Mildly abnormal test", next: "A_TERM_DEFER_ICA" },
        { label: "Grossly abnormal test", next: "A_TERM_ICA_CLASS1" },
      ],
    },

    A_TERM_DEFER_ICA: {
      id: "A_TERM_DEFER_ICA",
      type: "terminal",
      title: "Discuss next steps",
      disposition: "Discuss whether to pursue invasive coronary angiography (ICA) with cardiologist.",
      resources: [{ label: "Invasive Coronary Angiography (ICA) summary (PDF)", url: "./ICA-summary.pdf" }],
      flags: [{ level: "danger", text: "End of pathway" }],
    },

    // -----------------------------
    // A-037 terminal ICA page
    // -----------------------------
    A_TERM_ICA_CLASS1: {
      id: "A_TERM_ICA_CLASS1",
      type: "terminal",
      title: "Perform Invasive coronary angiography (ICA) (Class 1 recommendation).",
      disposition: "Proceed to invasive coronary angiography per pathway.",
      resources: [
        { label: "Invasive Coronary Angiography (ICA) summary (PDF)", url: "./ICA-summary.pdf" },
        { label: "COR/LOE interpretation figure", url: "./Recomendations.png" },
      ],
      flags: [{ level: "danger", text: "End of pathway" }],
      recommendedTests: ["ICA"],
    },
  };
})();
