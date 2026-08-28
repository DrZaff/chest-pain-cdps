function normalizeChestPainAssessment(value) {
  const allowed = [
    "cardiac",
    "possible_cardiac",
    "noncardiac"
  ];

  return allowed.includes(value) ? value : null;
}

function getChestPainAssessmentModifier(
  testKey,
  chestPainAssessment
) {
  // Neutral placeholder for now.
  // We will add evidence-based weights later.
  return 0;
}

export function recommendStableNoKnownCad(inputs) {
  const chestPainAssessment =
  normalizeChestPainAssessment(inputs.chestPainAssessment);
  
  const candidates = [
    {
      key: "ccta",
      label: "CCTA",
      confidence: "A",
      score: 100,
      apply: { riskCat: "intermediate_high", indexTest: "ccta" },
      why: [
        "Guideline-supported COR 1 index anatomic test.",
        "Useful when plaque/anatomic assessment is desired.",
        "Can identify nonobstructive and obstructive CAD."
      ],
      how: "CCTA uses ECG-gated CT with iodinated contrast to image the coronary arteries. It primarily evaluates coronary plaque and stenosis. Image quality depends on heart rate, rhythm, calcium burden, and contrast feasibility.",
      evidence: [
        "2021 ACC/AHA Chest Pain Guideline: CCTA COR 1 for intermediate-high risk stable chest pain with no known CAD.",
        "PROMISE and SCOT-HEART support anatomic testing as an evidence-based strategy."
      ]
    },
    {
      key: "stress_pet",
      label: "Stress PET",
      confidence: "A",
      score: 95,
apply: {
  riskCat: "intermediate_high",
  indexTest: "stress",
  stressModality: "stress_pet"
},
      why: [
        "Guideline-supported stress imaging option.",
        "High diagnostic performance.",
        "Useful when obesity, LBBB/paced rhythm, or suspected CMD makes PET especially helpful."
      ],
      how: "Stress PET evaluates myocardial perfusion during stress and rest using radiotracers. It can quantify myocardial blood flow reserve when available. This may improve assessment of multivessel disease and microvascular dysfunction.",
      evidence: [
        "2021 ACC/AHA Chest Pain Guideline: stress imaging COR 1.",
        "PET is reasonable in preference to SPECT when available to improve diagnostic accuracy and reduce nondiagnostic tests."
      ]
    },
    {
      key: "stress_cmr",
      label: "Stress CMR",
      confidence: "B",
      score: 92,
      apply: { riskCat: "intermediate_high", indexTest: "stress", stressModality: "stress_cmr" },
      why: [
        "Guideline-supported stress imaging option.",
        "No ionizing radiation.",
        "Useful when myocardial function, scar, or microvascular assessment is relevant."
      ],
      how: "Stress CMR evaluates myocardial perfusion, function, and tissue characteristics during pharmacologic stress. It does not use ionizing radiation. It may be limited by MRI-unsafe devices, claustrophobia, or local protocols.",
      evidence: [
        "2021 ACC/AHA Chest Pain Guideline: stress CMR included among COR 1 stress imaging options.",
        "CMR evidence supports diagnostic and prognostic assessment in stable chest pain."
      ]
    },
    {
      key: "stress_echo",
      label: "Stress echocardiography",
      confidence: "B",
      score: 88,
      apply: { riskCat: "intermediate_high", indexTest: "stress", stressModality: "stress_echo" },
      why: [
        "Guideline-supported stress imaging option.",
        "No ionizing radiation.",
        "Useful when valve or structural assessment is also helpful."
      ],
      how: "Stress echocardiography evaluates wall motion during exercise or pharmacologic stress. It can also provide structural and valvular information. Image quality depends on acoustic windows and operator expertise.",
      evidence: [
        "2021 ACC/AHA Chest Pain Guideline: stress echocardiography included among COR 1 stress imaging options.",
        "ASE guidance supports stress echo for ischemia assessment and selected structural questions."
      ]
    },
    {
      key: "stress_spect",
      label: "Stress SPECT",
      confidence: "B",
      score: 84,
apply: {
  riskCat: "intermediate_high",
  indexTest: "stress",
  stressModality: "stress_spect"
},
      why: [
        "Guideline-supported stress imaging option.",
        "Widely available.",
        "Acceptable alternative when PET is unavailable."
      ],
      how: "Stress SPECT evaluates myocardial perfusion using radiotracer imaging during stress and rest. Modern attenuation correction and newer camera systems can improve image quality. It may be limited by attenuation artifact, especially in obesity.",
      evidence: [
        "2021 ACC/AHA Chest Pain Guideline: stress SPECT included among COR 1 stress imaging options.",
        "ASNC guidance supports contemporary SPECT best practices."
      ]
    },
    {
      key: "exercise_ecg",
      label: "Exercise ECG",
      confidence: "B",
      score: 70,
      apply: { riskCat: "intermediate_high", indexTest: "stress", stressModality: "exercise_ecg" },
      why: [
        "Reasonable in selected patients.",
        "Requires adequate exercise capacity.",
        "Requires interpretable baseline ECG."
      ],
      how: "Exercise ECG evaluates symptoms, exercise capacity, hemodynamics, and ischemic ECG changes during treadmill or bicycle exercise. It does not provide imaging. It is most useful when the baseline ECG is interpretable and the patient can exercise adequately.",
      evidence: [
        "2021 ACC/AHA Chest Pain Guideline: exercise ECG COR 2a in selected intermediate-high risk patients.",
        "Exercise ECG is lower in hierarchy than CCTA or stress imaging for most intermediate-high risk patients."
      ]
    }
  ];

  const flags = [];

  function adjust(key, delta, reason) {
    const c = candidates.find((x) => x.key === key);
    if (c) {
      c.score += delta;
      if (reason) c.why.push(reason);
    }
  }

  candidates.forEach((candidate) => {
  candidate.score += getChestPainAssessmentModifier(
    candidate.key,
    chestPainAssessment
  );
});

  function exclude(key, reason) {
    const c = candidates.find((x) => x.key === key);
    if (c) {
      c.excluded = true;
      c.excludeReason = reason;
      flags.push({ severity: "warning", code: `EXCLUDE_${key.toUpperCase()}`, message: reason });
    }
  }

  if (inputs.canExercise === "yes") {
    adjust("exercise_ecg", 10, "Patient can exercise adequately.");
  }

  if (inputs.canExercise === "no") {
    exclude("exercise_ecg", "Exercise ECG removed: patient cannot exercise adequately.");
  }

  if (inputs.ecgInterpretable === "yes") {
    adjust("exercise_ecg", 10, "Baseline ECG is interpretable.");
  }

  if (inputs.ecgInterpretable === "no") {
    exclude("exercise_ecg", "Exercise ECG removed: baseline ECG is not interpretable for ischemia.");
  }

  if (inputs.renalConcern === "yes") {
    adjust("ccta", -10, "Renal/contrast concern lowers CCTA feasibility.");
    flags.push({
      severity: "warning",
      code: "RENAL_CONTRAST",
      message: "Renal/contrast concern should be interpreted using local protocols."
    });
  }

  const ranked = candidates
    .filter((c) => !c.excluded)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((c, idx) => ({
      category: idx === 0 ? "Primary Test" : idx === 1 ? "Secondary Test" : "Acceptable Alternative",
      stars: idx === 0 ? "★★★★★" : idx === 1 ? "★★★★☆" : "★★★☆☆",
      ...c
    }));

return {
  rankedTests: ranked,
  flags,
  inputContext: {
    chestPainAssessment,
    canExercise: inputs.canExercise || null,
    ecgInterpretable: inputs.ecgInterpretable || null,
    renalConcern: inputs.renalConcern || null
  }
}


