/** Motion presets (spec §3). Three signature moments; everything else quiet and fast. */
export const easing = {
  micro: [0.4, 0, 0.2, 1] as const,
  panel: [0.16, 1, 0.3, 1] as const,
  expo: [0.16, 1, 0.3, 1] as const,
};

export const duration = {
  micro: 0.15,
  panel: 0.3,
  paletteSummon: 0.2,
};

/** Micro-interactions: hover, toggle, badge. */
export const microTransition = {
  duration: duration.micro,
  ease: easing.micro,
};

/** Panel/route transitions. */
export const panelTransition = {
  duration: duration.panel,
  ease: easing.panel,
};

/** Dashboard first-load stat reveal — staggered count-up, once per session. */
export const statRevealStagger = 0.06;

/** Command palette summon — backdrop scale+blur. */
export const paletteSummonTransition = {
  duration: duration.paletteSummon,
  ease: easing.expo,
};

export const fadeInUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: panelTransition,
};
