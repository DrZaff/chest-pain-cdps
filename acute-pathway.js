/* acute-pathway.js
 * Acute Chest Pain Pathway — 2021 ACC/AHA
 * Consumed by main runner via buildAcutePathway()
 */

function buildAcutePathwayImpl() {
  return {
    /* ---------------- A0 ---------------- */
    A0: {
      type: "step",
      title: "Initial evaluation",
      body:
        "ECG (review for STEMI within 10 minutes), history, physical examination, chest XR, and troponins.",
      continueLabel: "Continue",
      next: "A1",
    },

    /* ---------------- A1 ---------------- */
    A1: {
      type: "decision",
      title: "Initial assessment",
      body: "Based on initial evaluation, determine the most likely category.",
      options: [
        {
          label: "STEMI",
          sub: "ECG consistent with STEMI",
          next: "A_STEMI",
        },
        {
          label: "Obvious noncardiac cause",
          sub:
            "PE, aortic dissection, esophageal rupture, PUD, gallbladder disease, pneumonia, pneumothorax, costochondritis, herpes zoster",
          next: "A_NONCARDIAC",
        },
        {
          label: "Obvious non-ischemic cardiac cause",
          sub:
            "Arrhythmia, valvular disease, hypertrophic cardiomyopathy, pericarditis, myocarditis",
          next: "A_NONISCHEMIC",
        },
        {
          label: "Possible ACS",
          sub: "Unstable angina or NSTEMI",
          next: "A2",
        },
      ],
    },

    /* ---------------- STEMI ---------------- */
    A_STEMI: {
      type: "terminal",
      title: "STEMI identified",
      disposition:
        "Initiate STEMI management: ASA load, supplemental O₂ if SpO₂ <90%, emergent reperfusion (PCI door-to-balloon ≤90 min [≤120 min if transfer] or fibrinolysis ≤30 min), P2Y12 inhibitor, high-intensity statin, beta-blocker (if no contraindications), ACEi/ARB within 24h, MRA if heart failure, and pain control.",
    },

    /* ---------------- NONCARDIAC ---------------- */
    A_NONCARDIAC: {
      type: "terminal",
      title: "Noncardiac chest pain",
      disposition: "Manage according to identified noncardiac etiology.",
    },

    /* ---------------- NONISCHEMIC ---------------- */
    A_NONISCHEMIC: {
      type: "terminal",
      title: "Non-ischemic cardiac cause",
      disposition: "Manage according to identified cardiac condition.",
    },

    /* ---------------- A2 ---------------- */
    A2: {
      type: "step",
      title: "Cardiac biomarkers",
      body: "Obtain serial cardiac troponins.",
      continueLabel: "Continue",
      next: "A3",
    },

    /* ---------------- A3 ---------------- */
    A3: {
      type: "step",
      title: "Risk stratification",
      body: "Use a clinical decision pathway (CDP) to risk stratify.",
      continueLabel: "Use CDP",
      action: "OPEN_HEART",
      next: "A4",
    },

    /* ---------------- A4 ---------------- */
    A4: {
      type: "decision",
      title: "Risk category",
      body: "Select risk category based on CDP.",
      options: [
        { label: "Low risk", next: "A_LOW" },
        { label: "Intermediate risk", next: "A5" },
        { label: "High risk", next: "A_HIGH" },
      ],
    },

    /* ---------------- LOW ---------------- */
    A_LOW: {
      type: "terminal",
      title: "Low-risk chest pain",
      disposition: "No further cardiac testing required → discharge.",
    },

    /* ---------------- HIGH ---------------- */
    A_HIGH: {
      type: "terminal",
      title: "High-risk chest pain",
      disposition:
        "Proceed with invasive coronary angiography (Class 1 recommendation).",
    },

    /* ---------------- A5 ---------------- */
    A5: {
      type: "decision",
      title: "Known coronary artery disease?",
      body:
        "Known CAD includes prior MI, revascularization, or known obstructive or nonobstructive CAD.",
      options: [
        { label: "No known CAD", next: "A6" },
        { label: "Known CAD", next: "A_KNOWN" },
      ],
    },

    /* ---------------- NO KNOWN CAD ---------------- */
    A6: {
      type: "decision",
      title: "Prior testing?",
      body: "Has the patient had prior cardiac testing?",
      options: [
        {
          label: "No prior testing",
          next: "A7",
        },
        {
          label: "Recent negative test",
          next: "A_LOW",
        },
      ],
    },

    /* ---------------- A7 ---------------- */
    A7: {
      type: "decision",
      title: "Initial test selection",
      body: "Select initial diagnostic test.",
      options: [
        {
          label: "Stress testing",
          sub: "Exercise ECG, stress echo, stress PET, stress SPECT, stress CMR",
          next: "A_STRESS_RES",
        },
        {
          label: "CCTA",
          sub: "Class 1 recommendation",
          next: "A_CCTA_RES",
        },
      ],
    },

    /* ---------------- STRESS RESULTS ---------------- */
    A_STRESS_RES: {
      type: "decision",
      title: "Stress test result",
      body: "Interpret stress test.",
      options: [
        {
          label: "Negative or mildly abnormal",
          next: "A_LOW",
        },
        {
          label: "Moderate–severe ischemia",
          next: "A_ICA",
        },
        {
          label: "Inconclusive",
          next: "A_CCTA_RES",
        },
      ],
    },

    /* ---------------- CCTA RESULTS ---------------- */
    A_CCTA_RES: {
      type: "decision",
      title: "CCTA result",
      body: "Interpret coronary CT angiography.",
      options: [
        {
          label: "Nonobstructive CAD (<50%)",
          next: "A_DISCH_INOCA",
        },
        {
          label: "Inconclusive or obstructive CAD ≥50%",
          sub: "Without high-risk CAD or frequent angina",
          next: "A_CCTA_FOLLOWUP",
        },
      ],
    },

    /* ---------------- FOLLOWUP AFTER CCTA ---------------- */
    A_CCTA_FOLLOWUP: {
      type: "decision",
      title: "Next step after CCTA",
      body: "Select add-on evaluation or management strategy.",
      options: [
        {
          label: "FFR-CT",
          sub: "2a recommendation",
          next: "A_FFR_RES",
        },
        {
          label: "Stress testing",
          sub: "2a recommendation",
          next: "A_STRESS_RES",
        },
        {
          label: "Treat medically (GDMT)",
          next: "A_GDMT_DISCHARGE",
        },
      ],
    },

    /* ---------------- FFR ---------------- */
    A_FFR_RES: {
      type: "decision",
      title: "FFR-CT result",
      body: "Interpret FFR-CT.",
      options: [
        {
          label: "FFR-CT > 0.80",
          next: "A_GDMT_DISCHARGE",
        },
        {
          label: "FFR-CT ≤ 0.80",
          next: "A_ICA",
        },
      ],
    },

    /* ---------------- ICA ---------------- */
    A_ICA: {
      type: "terminal",
      title: "Invasive coronary angiography",
      disposition:
        "Proceed with invasive coronary angiography (Class 1 recommendation).",
    },

    /* ---------------- GDMT ---------------- */
    A_GDMT_DISCHARGE: {
      type: "terminal",
      title: "Medical therapy",
      disposition:
        "Proceed with guideline-directed medical therapy → discharge.",
    },

    /* ---------------- INOCA ---------------- */
    A_DISCH_INOCA: {
      type: "terminal",
      title: "Nonobstructive CAD",
      disposition:
        "Discharge and consider INOCA pathway as an outpatient for frequent or persistent symptoms.",
    },

    /* ---------------- KNOWN CAD ---------------- */
    A_KNOWN: {
      type: "terminal",
      title: "Known CAD",
      disposition:
        "Manage according to known CAD pathway (stress imaging vs ICA depending on risk and symptoms).",
    },
  };
}

/* Export hook for main script */
window.buildAcutePathway = buildAcutePathwayImpl;
