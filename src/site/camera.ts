import { Easing } from "remotion";

/**
 * Virtual-camera keyframes for the site cut.
 *
 * Coordinates are in SOURCE pixels (3024 x 1964 — the Retina 2x recording),
 * `f` is the frame in the output (30 fps), and `z` is the crop factor where
 * **1.0 = the entire recording fills the frame** (1.3 ≈ a comfortable 30%
 * push-in). Focus points were mapped from the recording: where the cursor
 * hovers, clicks, or where the site's own animation peaks.
 */
export type CamKey = { f: number; z: number; x: number; y: number };

export const CAM: CamKey[] = [
  // 0–5.5s hero: slow drift toward the chrome head while the hologram follows the cursor
  { f: 0, z: 1.05, x: 1900, y: 900 },
  { f: 60, z: 1.18, x: 2250, y: 750 },
  { f: 120, z: 1.22, x: 2380, y: 880 },
  { f: 165, z: 1.25, x: 2300, y: 850 },

  // 6–7.5s button row: CONNECT ripple, then PROJECT text-scramble
  { f: 180, z: 1.55, x: 550, y: 1290 },
  { f: 200, z: 1.7, x: 640, y: 1330 },
  { f: 225, z: 1.65, x: 460, y: 1320 },

  // 8–10s nav pill: BASE, then CONTACT hover
  { f: 245, z: 1.6, x: 1560, y: 200 },
  { f: 268, z: 1.7, x: 1720, y: 180 },

  // 10–12.5s: the recording zooms into the head by itself — release to 1x and let it play
  { f: 300, z: 1.0, x: 1512, y: 982 },
  { f: 375, z: 1.0, x: 1512, y: 982 },

  // 13–15.5s: FELT_ → MADE_ card (waits for the card to finish sliding in)
  { f: 400, z: 1.15, x: 1700, y: 950 },
  { f: 426, z: 1.35, x: 1920, y: 930 },
  { f: 470, z: 1.0, x: 1512, y: 982 },

  // 20–23.5s: philosophy paragraph highlight sweep (the paragraph is nearly
  // full-bleed in the source, so the push has to stay gentle to fit it)
  { f: 600, z: 1.05, x: 1600, y: 900 },
  { f: 705, z: 1.05, x: 1600, y: 900 },

  // 25–29s: BASE tiles wide, small push for the EITHER WAY panel
  { f: 750, z: 1.0, x: 1512, y: 982 },
  { f: 870, z: 1.15, x: 1500, y: 1000 },

  // 31–37s: scattered letters → "MAKES SENSE." — the recorder bakes its own
  // zoom here, so the camera releases to 1.0 and lets the source play
  { f: 930, z: 1.0, x: 1512, y: 982 },
  { f: 1080, z: 1.0, x: 1512, y: 982 },

  // 38.5–40.5s: release while the contact section fades in
  { f: 1155, z: 1.0, x: 1512, y: 982 },

  // 40.5–46s: contact ribbon, holo colours follow the cursor
  { f: 1215, z: 1.3, x: 1512, y: 990 },
  { f: 1335, z: 1.3, x: 1512, y: 990 },

  // 46–47.5s: CONNECT button scramble
  { f: 1380, z: 1.7, x: 1520, y: 1270 },

  // 48–49s: release into the footer
  { f: 1440, z: 1.0, x: 1512, y: 982 },

  // 49–51s: SECTIONS link hovers (orange)
  { f: 1470, z: 1.5, x: 1970, y: 1100 },
  { f: 1530, z: 1.55, x: 2300, y: 1120 },

  // 52–54s: SAY / HELLO buttons, close on the name
  { f: 1560, z: 1.4, x: 450, y: 1250 },
  { f: 1620, z: 1.4, x: 500, y: 1150 },
];

const SEGMENT_EASE = Easing.bezier(0.65, 0, 0.35, 1);

const smoothstep = (t: number) => {
  const clamped = Math.min(1, Math.max(0, t));
  return SEGMENT_EASE(clamped);
};

/** Interpolated camera state for a frame, plus a faint idle drift so holds stay alive. */
export const cameraAt = (frame: number): { z: number; x: number; y: number } => {
  const keys = CAM;
  const t = frame / 30;

  let a = keys[0];
  let b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (frame >= keys[i].f && frame <= keys[i + 1].f) {
      a = keys[i];
      b = keys[i + 1];
      break;
    }
  }

  const span = Math.max(1, b.f - a.f);
  const p = smoothstep((frame - a.f) / span);

  return {
    z: a.z + (b.z - a.z) * p,
    x: a.x + (b.x - a.x) * p + 7 * Math.sin(t * 0.35),
    y: a.y + (b.y - a.y) * p + 5 * Math.cos(t * 0.28),
  };
};
