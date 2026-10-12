/**
 * HYPERREEL easing registry — pure functions shared by the video
 * renderer, the landing cinematic and the determinism script.
 * Values mirror GSAP formulas so GSAP-driven chrome and Remotion-driven
 * video choreography land on identical numbers.
 */

export type EaseFn = (t: number) => number;

const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

export const linear: EaseFn = (t) => clamp01(t);

export const power2Out: EaseFn = (t) => {
  const u = clamp01(t);
  return 1 - (1 - u) * (1 - u);
};

export const power4In: EaseFn = (t) => {
  const u = clamp01(t);
  return u * u * u * u;
};

export const power4Out: EaseFn = (t) => {
  const u = clamp01(t);
  return 1 - Math.pow(1 - u, 4);
};

/** GSAP "power4.inOut" equivalent. */
export const power4InOut: EaseFn = (t) => {
  const u = clamp01(t);
  return u < 0.5 ? 8 * u * u * u * u : 1 - Math.pow(-2 * u + 2, 4) / 2;
};

/** GSAP "expo.out" equivalent. */
export const expoOut: EaseFn = (t) => {
  const u = clamp01(t);
  return u === 1 ? 1 : 1 - Math.pow(2, -10 * u);
};

/** GSAP "expo.inOut" equivalent. */
export const expoInOut: EaseFn = (t) => {
  const u = clamp01(t);
  if (u === 0 || u === 1) return u;
  return u < 0.5
    ? Math.pow(2, 20 * u - 10) / 2
    : (2 - Math.pow(2, -20 * u + 10)) / 2;
};

/** Punchy overshoot used by kinetic type punches. */
export const backOut: EaseFn = (t) => {
  const u = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
};

export const smoothstep: EaseFn = (t) => {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
};

export const EASING_REGISTRY: Record<string, EaseFn> = {
  linear,
  power2Out,
  power4In,
  power4Out,
  power4InOut,
  expoOut,
  expoInOut,
  backOut,
  smoothstep,
};

/** Look up an easing by name; falls back to linear. */
export const getEasing = (name: string): EaseFn =>
  EASING_REGISTRY[name] ?? linear;
