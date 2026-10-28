import { Easing, interpolate, spring } from "remotion";

export const COLORS = {
  espresso: "#35251D",
  espressoDeep: "#221510",
  cream: "#F4E8D5",
  creamLight: "#FBF5EA",
  caramel: "#C58B54",
  caramelDeep: "#A66B36",
  latte: "#E8D5BA",
  hairline: "rgba(53,37,29,0.18)",
} as const;

export const EASE = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
} as const;

/** Clamped interpolation — use for anything that is drawn rather than popped. */
export const clamp = (
  frame: number,
  input: number[],
  output: number[],
  easing: (t: number) => number = EASE.out,
) =>
  interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

/** Springy 0 → 1 entrance with sensible defaults. */
export const pop = (
  frame: number,
  fps: number,
  delay = 0,
  config?: { damping?: number; stiffness?: number; mass?: number },
) =>
  spring({
    frame: frame - delay,
    fps,
    config: {
      damping: config?.damping ?? 18,
      stiffness: config?.stiffness ?? 130,
      mass: config?.mass ?? 0.75,
    },
  });
