// The golden fixtures (#102, #112): which states scripts/goldens.mjs shoots.
// Data only, so the suite's size is read here and nowhere else.
//
//   states  the full-page shots: every mode's default, plus two sandbox states
//   matrix  the vessel picture, per preset hull x view x theta x width: only
//           the scene panel is clipped, so a PNG stays small and a reviewer
//           sees the hull, not the page around it

export const states = [
  ['sandbox', '#/sandbox'],
  ['identify', '#/identify'],
  ['quiz', '#/quiz'],
  ['quiz-reverse', '#/quiz?dir=reverse'],
  ['rules', '#/rules'],
  ['sound', '#/sound'],
  ['sandbox-power-60m', '#/sandbox?p=power&a=none&pos=underway&mw=1&len=60'],
  ['sandbox-trawler', '#/sandbox?p=power&a=trawling&pos=underway&mw=0&len=30'],
];

export const widths = [
  [1280, 900],
  [360, 740],
];

// 'model' is the 3D view from a relative bearing (the 2026-10-17 decision);
// 'plan' is the arcs-from-above view. The 2D side profile is unwired from the
// Sandbox (#218), so it has no tab to shoot.
export const matrixViews = ['model', 'plan'];
export const matrixThetas = [0, 45, 90];
// src/data/presets.ts ids; src/data/goldenFixtures.test.ts fails when they drift
export const matrixPresets = [
  'sloop',
  'trawler',
  'ship',
  'tug',
  'pilot',
  'anchor',
  'nuc',
  'ram',
];

/** One matrix entry per preset x view x theta; widths multiply it in goldens.mjs. */
export const matrix = matrixPresets.flatMap((preset) =>
  matrixViews.flatMap((view) =>
    matrixThetas.map((theta) => ({
      name: `${preset}-${view}-${theta}`,
      hash: `#/sandbox/${preset}?view=${view}&th=${theta}`,
      // plan is only offered while the arcs are hidden (Sandbox.tsx, ARCS_KEY)
      arcs: view === 'plan' ? 'hidden' : 'shown',
    })),
  ),
);
