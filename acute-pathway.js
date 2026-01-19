/* acute-pathway.js
 * Extracted from Script-old.js buildAcutePathway() return object.
 * Loads BEFORE script.js so script.js can read window.__ACUTE_PATHWAY__.
 */

(() => {
  // DOI link for resource box
  const DOI_URL = "https://doi.org/10.1161/CIR.0000000000001029";

  window.__ACUTE_PATHWAY__ = {
    // Page A-001
    A0: {
      id: "A0",
      type: "step",
      title: "Initial evaluation",
      body: "ECG (review for STEMI within 10 minutes), history, physical examination, chest XR, and troponins",
      continueLabel: "Continue",
      next: "A1",
    },

    // Page A-002 (buttons consistent + STEMI + examples + resources)
    A1: {
      id: "A1",
      type: "decision",
      title: "ECG / initial assessment outcome",
      body: "Select the best match for the current presentation.",
      resources: [
        { label: "Probability of ischemia based on chest pain description (Figure 2)", url: DOI_URL },
        { label: "Chest pain history (Table 3)", url: DOI_URL },
        { label: "Chest pain physical exam (Table 4)", url: DOI_URL },
        { label: "EKG interpretation flowsheet (Figure 4)", url: DOI_URL },
      ],
      options: [
        {
          label: "STEMI",
          sub: "Meets STEMI criteria on ECG.",
          next: "A_STEMI",
        },
        {
          label: "Obvious noncardiac cause",
          sub: "Examples: PE, aortic dissection, esophageal rupture, esophagitis, PUD, gallbladder dz, PNA, pneumothorax, costochondritis, Tietze syndrome, herpes zoster.",
          next: "A2_NONCARDIAC",
        },
        {
          label: "Obvious non-ischemic cardiac cause",
          sub: "Examples: arrhythmia, aortic stenosis, aortic regurgitation, hypertrophic cardiomyopathy, pericarditis, myocarditis.",
          next: "A2_NONISCHEMIC_CARDIAC",
        },
        {
          label: "Possible ACS",
          sub: "Examples: UA, NSTEMI.",
          next: "A3_POSSIBLE_ACS",
        },
      ],
    },

    A_STEMI: {
      id: "A_STEMI",
      type: "terminal",
      title: "STEMI pathway",
      disposition:
        "STEMI guidelines: ASA load, supplemental O2 of SpO2<90%, reperfusion (door-to-balloon under 90mins [120 minutes if transfer possible] OR fibrinolysis within 30 mins of arrival followed by PCI within 3-24 hrs), P2Y12 inhibitor, high-intensity statin, beta-blocker (if no contraindications), ACEi/ARB within 24 hrs, MRA (if HF), pain control.",
      flags: [{ level: "danger", text: "End of pathway" }],
    },

    A2_NONCARDIAC: {
      id: "A2_NONCARDIAC",
      type: "terminal",
      title: "Obvious noncardiac cause",
      disposition: "No cardiac testing required (per guideline pathway).",
      flags: [{ level: "ok", text: "End of pathway" }],
    },

    A2_NONISCHEMIC_CARDIAC: {
      id: "A2_NONISCHEMIC_CARDIAC",
      type: "terminal",
      title: "Obvious non-ischemic cardiac cause",
      disposition: "Other cardiac testing as needed (per guideline pathway).",
      flags: [{ level: "ok", text: "End of pathway" }],
    },

    // Page A-004 requirement: CDP click opens HEART score app
    A3_POSSIBLE_ACS: {
      id: "A3_POSSIBLE_ACS",
      type: "step",
      title: "Possible ACS",
      body: "Obtain troponin.",
      continueLabel: "Troponin obtained → continue",
      next: "A4_RISK_STRATIFY",
    },

    A4_RISK_STRATIFY: {
      id: "A4_RISK_STRATIFY",
      type: "step",
      title: "Risk stratification",
      body: "Use a clinical decision pathway (CDP) to risk stratify.",
      // Secondary button opens HEART calculator without advancing
      secondaryAction: { label: "Open CDP (HEART score) in new window", action: "OPEN_HEART" },
      continueLabel: "Continue",
      next: "A5_RISK_BUCKET",
    },

    // Page A-005: buttons styled consistently (CSS does this)
    A5_RISK_BUCKET: {
      id: "A5_RISK_BUCKET",
      type: "decision",
      title: "Risk category",
      body: "Select risk category.",
      options: [
        { label: "Low risk", next: "A_TERM_LOW" },
        { label: "Intermediate risk", next: "A6_INTERMEDIATE_CAD_KNOWN" },
        { label: "High risk", next: "A_TERM_ICA_CLASS1" },
      ],
    },

    A_TERM_LOW: {
      id: "A_TERM_LOW",
      type: "terminal",
      title: "Low risk",
      disposition: "No testing required → discharge.",
      flags: [{ level: "ok", text: "End of pathway" }],
    },

    // Page A-006: known CAD definition + routing fix
    A6_INTERMEDIATE_CAD_KNOWN: {
      id: "A6_INTERMEDIATE_CAD_KNOWN",
      type: "decision",
      title: "Intermediate risk",
      body: "Known CAD? Note: known CAD is prior MI, revascularization, known obstructive or nonobstructive CAD on invasive or CCTA.",
      options: [
        { label: "No known CAD", next: "A_INO0" },
        // FIX: Known CAD goes directly to A-030 equivalent (A_IK1)
        { label: "Known CAD", next: "A_IK1" },
      ],
    },

    // ---------------- ACUTE INTERMEDIATE: NO KNOWN CAD ----------------
    A_INO0: {
      id: "A_INO0",
      type: "decision",
      title: "Intermediate risk + no known CAD",
      body: "Prior testing available?",
      options: [
        { label: "Yes", next: "A_INO_PRIOR_Y" },
        { label: "No", next: "A_INO_PRIOR_N" },
      ],
    },

    A_INO_PRIOR_Y: {
      id: "A_INO_PRIOR_Y",
      type: "decision",
      title: "Prior testing (yes)",
      body: "Which best describes prior testing?",
      options: [
        {
          label: "Recent negative test*",
          sub: "Normal CCTA ≤2 years OR negative stress test ≤1 year (adequate stress).",
          next: "A_TERM_DISCHARGE_INOCA",
        },
        {
          label: "Prior inconclusive or mildly abnormal stress test ≤1 year",
          next: "A_INO_CCTA_AFTER_INCONC_STRESS",
        },
        {
          label: "Prior moderate–severely abnormal ≤1 year (no interval ICA)",
          next: "A_TERM_ICA_CLASS1",
        },
      ],
    },

    // Page A-013 change
    A_INO_CCTA_AFTER_INCONC_STRESS: {
      id: "A_INO_CCTA_AFTER_INCONC_STRESS",
      type: "step",
      title: "Next test",
      body: "CCTA (2a recommendation)",
      continueLabel: "CCTA result available → continue",
      next: "A_INO_CCTA_RESULTS_1",
    },

    // Page A-014: indicate Class 1 for stress and CCTA
    A_INO_PRIOR_N: {
      id: "A_INO_PRIOR_N",
      type: "decision",
      title: "No prior testing",
      body: "Select initial test strategy (guided by local availability/expertise).",
      options: [
        {
          label: "Stress testing (Class 1 recommendation)",
          sub: "Exercise ECG, stress CMR, stress echocardiography, stress PET, or stress SPECT.",
          next: "A_INO_STRESS_RESULTS",
        },
        { label: "CCTA (Class 1 recommendation)", next: "A_INO_CCTA_RESULTS_ENTRY" },
      ],
    },

    A_INO_STRESS_RESULTS: {
      id: "A_INO_STRESS_RESULTS",
      type: "decision",
      title: "Stress testing result",
      body: "Select stress testing outcome.",
      options: [
        { label: "Negative or mildly abnormal", next: "A_TERM_DISCHARGE_INOCA" },
        { label: "Moderate–severe ischemia", next: "A_TERM_ICA_CLASS1" },
        { label: "Inconclusive", next: "A_INO_CCTA_AFTER_INCONCLUSIVE_STRESS" },
      ],
    },

    // Page A-016: remove parenthetical + indicate class 1
    A_INO_CCTA_AFTER_INCONCLUSIVE_STRESS: {
      id: "A_INO_CCTA_AFTER_INCONCLUSIVE_STRESS",
      type: "step",
      title: "Next test",
      body: "CCTA (Class 1 recommendation).",
      continueLabel: "CCTA result available → continue",
      next: "A_INO_CCTA_RESULTS_2",
    },

    A_INO_CCTA_RESULTS_ENTRY: {
      id: "A_INO_CCTA_RESULTS_ENTRY",
      type: "step",
      title: "CCTA performed",
      body: "Proceed with CCTA.",
      continueLabel: "CCTA result available → continue",
      next: "A_INO_CCTA_RESULTS_2",
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
      title: "FFR-CT / stress result available",
      body: "FFR-CT ≤0.8 or moderate–severe ischemia?",
      options: [
        { label: "No", next: "A_INO_GDMT_DISCHARGE_CLASS1" },
        { label: "Yes", next: "A_TERM_ICA_CLASS1" },
      ],
    },

    A_INO_STRESS_RESULTS_POSTCCTA: {
      id: "A_INO_STRESS_RESULTS_POSTCCTA",
      type: "decision",
      title: "Stress testing result (post-CCTA)",
      body: "Moderate–severe ischemia?",
      options: [
        { label: "No", next: "A_INO_GDMT_DISCHARGE_CLASS1" },
        { label: "Yes", next: "A_TERM_ICA_CLASS1" },
      ],
    },

    A_INO_GDMT_DISCHARGE_CLASS1: {
      id: "A_INO_GDMT_DISCHARGE_CLASS1",
      type: "terminal",
      title: "Guideline-directed medical therapy",
      disposition: "Proceed with guideline-directed medical therapy (GDMT) (Class 1 recommendation) → discharge.",
      flags: [{ level: "ok", text: "End of pathway" }],
    },

    A_INO_OBS_BRANCH: {
      id: "A_INO_OBS_BRANCH",
      type: "decision",
      title: "Obstructive CAD (≥50% stenosis)",
      body: "High-risk CAD or frequent angina? High-risk CAD means left main stenosis ≥ 50%; anatomically significant 3-vessel disease (≥70% stenosis).",
      options: [
        { label: "High-risk CAD or frequent angina", next: "A_TERM_ICA_CLASS1" },
        { label: "Not high-risk CAD / not frequent angina", next: "A_INO_FFRCT_STRESS_OR_MED" },
      ],
    },

    // ---------------- ACUTE INTERMEDIATE: KNOWN CAD ----------------
    A_IK1: {
      id: "A_IK1",
      type: "decision",
      title: "Intermediate risk + known CAD",
      body:
        "Select known CAD category.\n\nObstructive CAD includes prior coronary artery bypass graft/percutaneous coronary intervention.\nHigh-risk CAD means left main stenosis ≥50%; anatomically significant 3-vessel disease (≥70% stenosis).",
      options: [
        { label: "Nonobstructive CAD (<50% stenosis)", next: "A_IK_NONOBS_OPTIONS" },
        { label: "Obstructive CAD (≥50% stenosis)", next: "A_IK_OBS_STRESS" },
      ],
    },

    A_IK_NONOBS_OPTIONS: {
      id: "A_IK_NONOBS_OPTIONS",
      type: "decision",
      title: "Nonobstructive CAD options",
      body:
        "Choose testing strategy or defer testing.\n\nNote: If extensive plaque is present a high-quality CCTA is unlikely to be achieved, and stress testing is preferred.",
      options: [
        { label: "CCTA (2a recommendation)", next: "A_IK_NONOBS_CCTA_RES" },
        {
          label: "Stress testing (2a recommendation)",
          sub: "Stress CMR, stress echo, stress PET, or stress SPECT (all 2a recommendations).",
          next: "A_IK_NONOBS_STRESS_RES",
        },
        { label: "Defer testing and intensify GDMT (Class 1 recommendation)", next: "A_IK_GDMT_DEFER" },
      ],
    },

    A_IK_GDMT_DEFER: {
      id: "A_IK_GDMT_DEFER",
      type: "terminal",
      title: "GDMT optimization",
      disposition: "Option to defer testing and intensify GDMT (Class 1 recommendation) → discharge.",
      flags: [{ level: "ok", text: "End of pathway" }],
    },

    A_IK_NONOBS_CCTA_RES: {
      id: "A_IK_NONOBS_CCTA_RES",
      type: "decision",
      title: "CCTA result",
      body: "Select CCTA interpretation.",
      options: [
        { label: "No change", next: "A_TERM_DISCHARGE_SIMPLE" },
        { label: "Obstructive CAD (≥50% stenosis)", next: "A_IK_NONOBS_FFR_OR_STRESS" },
      ],
    },

    A_IK_NONOBS_FFR_OR_STRESS: {
      id: "A_IK_NONOBS_FFR_OR_STRESS",
      type: "decision",
      title: "Next step",
      body: "Choose add-on test.",
      options: [
        { label: "FFR-CT (2a recommendation)", next: "A_IK_NONOBS_FFR_RES" },
        { label: "Stress testing (2a recommendation)", next: "A_IK_NONOBS_FFR_RES" },
      ],
    },

    A_IK_NONOBS_FFR_RES: {
      id: "A_IK_NONOBS_FFR_RES",
      type: "decision",
      title: "FFR-CT / stress result",
      body: "FFR-CT ≤0.8 or moderate–severe ischemia?",
      options: [
        { label: "No", next: "A_IK_GDMT_DEFER" },
        { label: "Yes", next: "A_TERM_ICA_CLASS1" },
      ],
    },

    A_IK_NONOBS_STRESS_RES: {
      id: "A_IK_NONOBS_STRESS_RES",
      type: "decision",
      title: "Stress testing result",
      body: "Select result.",
      options: [
        { label: "Mild ischemia", next: "A_IK_GDMT_DEFER" },
        { label: "Moderate–severe ischemia", next: "A_TERM_ICA_CLASS1" },
        { label: "Inconclusive", next: "A_IK_NONOBS_FFR_OR_STRESS" },
      ],
    },

    A_IK_OBS_STRESS: {
      id: "A_IK_OBS_STRESS",
      type: "step",
      title: "Stress testing (2a recommendation)",
      body: "Stress CMR, stress echocardiography, stress PET, or stress SPECT (2a recommendations).",
      continueLabel: "Stress test result available → continue",
      next: "A_IK_OBS_STRESS_RES",
    },

    A_IK_OBS_STRESS_RES: {
      id: "A_IK_OBS_STRESS_RES",
      type: "decision",
      title: "Functional test result",
      body: "Select functional test outcome.",
      options: [
        { label: "Normal functional test", next: "A_TERM_DISCHARGE_SIMPLE" },
        { label: "Abnormal functional test", next: "A_IK_OBS_ABN_NOTE" },
      ],
    },

    A_IK_OBS_ABN_NOTE: {
      id: "A_IK_OBS_ABN_NOTE",
      type: "step",
      title: "Abnormal functional test",
      body: "Per pathway: option to defer ICA with mildly abnormal test (discuss with cardiologist); otherwise proceed to ICA.",
      continueLabel: "Proceed",
      next: "A_TERM_ICA_CLASS1",
    },

    A_TERM_DISCHARGE_SIMPLE: {
      id: "A_TERM_DISCHARGE_SIMPLE",
      type: "terminal",
      title: "Discharge",
      disposition: "Discharge.",
      flags: [{ level: "ok", text: "End of pathway" }],
    },

    A_TERM_DISCHARGE_INOCA: {
      id: "A_TERM_DISCHARGE_INOCA",
      type: "terminal",
      title: "Discharge",
      disposition: "Discharge and consider INOCA pathway as an outpatient for frequent or persistent symptoms",
      flags: [{ level: "ok", text: "End of pathway" }],
    },

    A_TERM_ICA_CLASS1: {
      id: "A_TERM_ICA_CLASS1",
      type: "terminal",
      title: "Invasive coronary angiography",
      disposition: "Invasive coronary angiography (ICA) (Class 1 recommendation).",
      flags: [{ level: "danger", text: "End of pathway" }],
      recommendedTests: ["ICA"],
    },
  };
})();
