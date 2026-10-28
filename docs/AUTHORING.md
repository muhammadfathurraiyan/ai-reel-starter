# Authoring scenes

How to design a scene that looks like it belongs in this reel. For how frames are assembled
(timeline, wipe, captions, audio), see [ARCHITECTURE.md](ARCHITECTURE.md).

The shipped example is intentionally bare — two scenes, one headline each. Treat it as a
template to fill in, not a style to copy verbatim.

---

## 1. Canvas and safe area

Everything is authored for **1080 × 1920** at 30 fps. Reels get cropped by platform UI at the top
and bottom, so keep content inside this band:

```
 y = 0
 ┌────────────────────────────────────────┐
 │  kicker            y 150               │  ← "01 — THE START"
 │  headline          y 360 / 420         │  ← Anton, 150–172 px
 │  note              y 800 / 840         │  ← mono, optional
 │  accent rule       y 860 / 900         │  ← 96 × 4 caramel
 │                                        │
 │  (free stage)      y 940 – 1440        │  ← illustrations, data, diagrams
 │                                        │
 │  captions          y 1484              │  ← generated, do not cover
 │                                        │
 └────────────────────────────────────────┘
 y = 1920
```

- Side margins **64 px** — `left: 64, right: 64`, or a fixed `width: 952` column.
- Captions occupy `top: 1484` down to roughly `1700`. Nothing else may live there.
- Hard limit: no content above `y 120` or below `y 1440`.

The two example scenes use different vertical rhythm on purpose (Intro starts lower, Outro is
centred for a finale). Pick a rhythm and keep it across scenes in one reel; drift between scenes
reads as sloppiness.

---

## 2. Type scale

| Role | Font | Size | Notes |
|---|---|---|---|
| Headline | Anton (`ANTON`) | 150–172 | `lineHeight 0.92–0.94`, `letterSpacing -0.02em`, uppercase |
| Kicker label | IBM Plex Mono (`MONO`) | 18 | tracking 3.2, opacity 0.72 |
| Kicker number | IBM Plex Mono | 18 | caramel, weight 600 |
| Note / meta | IBM Plex Mono | 17 | tracking 2.4, opacity 0.5–0.55 |
| Captions | Inter Tight (`INTER`) | 37 | owned by `Captions.tsx`, don't restyle per scene |

Headline width is the real constraint: at 172 px Anton, a 952 px column fits roughly 11
characters per line. The example titles ("MAKE YOUR NEXT REEL", "NOW MAKE IT YOURS") wrap to two
lines — check your own with `npm run still` before assuming.

Colour comes from `COLORS` only. For de-emphasis use `opacity`, not a grey hex — the paper
backdrop should show through.

---

## 3. Scene anatomy

A scene is a plain component receiving `SceneProps` (`{ scene, index }`) and reading
`useCurrentFrame()` itself.

```tsx
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../lib/motion";
import { ANTON, MONO } from "../lib/fonts";
import type { SceneProps } from "../lib/types";
import { Kicker, MaskedLine, withAccent } from "../components/Text";
import { Captions } from "../components/Captions";

export const MyScene: React.FC<SceneProps> = ({ scene, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <Kicker index={index} label={scene.label} frame={frame} fps={fps}
              style={{ position: "absolute", left: 64, top: 150, fontFamily: MONO }} />

      <div style={{ position: "absolute", left: 64, right: 64, top: 360 }}>
        <MaskedLine frame={frame} fps={fps} delay={6}
          style={{ fontFamily: ANTON, fontSize: 168, lineHeight: 0.92,
                   letterSpacing: "-0.02em", textTransform: "uppercase" }}>
          {withAccent(scene.title, scene.accent, COLORS.espresso)}
        </MaskedLine>
      </div>

      {/* stage: illustrations, data, diagrams */}

      <Captions sceneId={scene.id} frame={frame} />
    </AbsoluteFill>
  );
};
```

Rules:

- **Last child is `<Captions sceneId={scene.id} frame={frame} />`.** Use `scene.id`, not a
  literal, so renaming in `scenes.json` cannot desync it.
- **`index` comes from props.** Never hard-code `1`/`2`.
- `dark` on the outro variant flips kicker/caption ink to cream — use it whenever the scene paints
  its own dark background.
- Everything is absolutely positioned. There is no layout flow between blocks, and no shared
  "scene chrome" component anymore — if you want a label rail on every scene, put it in the
  scene or reintroduce a wrapper deliberately.

---

## 4. Motion vocabulary

Three primitives, all already imported by the examples. Resist inventing new ones.

| Recipe | Use for | API |
|---|---|---|
| Masked headline | any title | `<MaskedLine frame fps delay>` — overflow mask + spring translate from 100 % |
| Spring entrance | kicker, rules, chips, cards | `pop(frame, fps, delay, { damping, stiffness, mass })` → drive `opacity`, `scale`, `translate` |
| Eased draw | lines growing, fades, sweeps, progress | `clamp(frame, [a, b], [0, 1], EASE.out \| EASE.inOut)` |
| Accent word | one word of the headline | `withAccent(title, scene.accent, baseColor)` |

Conventions:

- **Springs for arrivals, eased interpolation for draws.** A card *appears* with `pop`; a rule or
  underline *grows* with `clamp`.
- Entrances start **4–8 frames** after the cut and stage ~6–10 frames apart: kicker → headline →
  note/rule → stage content. Everything at once feels like a slide, not a scene.
- The first **10 frames** of a scene are shared with the previous scene's wipe (see
  [ARCHITECTURE.md §3](ARCHITECTURE.md#3-scenes-and-the-wipe)). Nothing important should start
  there.
- No linear eases, no elastic overshoot. `pop` defaults (damping 18 / stiffness 130 / mass 0.75)
  already give a single soft settle; `{ damping: 200, stiffness: 90, mass: 1 }` (as in `Kicker`) is
  the non-bouncy variant.
- Land the visual on the word that names it, not after it. Use the caption timings in
  `voiceover.json` as your reference when in doubt.

---

## 5. Copy and pacing

ElevenLabs reads roughly **2.2–2.5 words per second** at the shipped settings. Budget copy to the
scene window, not the other way round:

| Scene length | Comfortable narration |
|---|---|
| 3 s (90 f) | 6–8 words |
| 4 s (120 f) | 9–11 words |
| 5 s (150 f) | 11–14 words |
| 6 s (180 f) | 14–17 words |
| 7 s (210 f) | 17–20 words |

The example is deliberately shorter than the budget (8 words in 4 s, 7 in 4 s) so there is air
around the lines. That reads better than a wall of speech.

Punctuation is timing. Commas and em dashes create pauses that both the TTS and the caption
mapper respect. Write for the ear, then let the generated timings tell you the truth.

Onscreen `title` and spoken `narration` are separate fields on purpose — they should not be
identical. The title is short and poster-like; the narration is a full sentence.

---

## 6. Adding a scene

1. Add the object to `src/data/scenes.json`; keep `from` contiguous (previous `from + duration`).
2. Create `src/scenes/MyScene.tsx` — copy `Intro.tsx` (light) or `Outro.tsx` (dark).
3. Register it in `COMPONENTS` in `src/Reel.tsx`.
4. End with `<Captions sceneId={scene.id} frame={frame} />`.
5. Add SFX cues in `Reel.tsx` if the scene needs a transition or accent.
6. `npm run voiceover -- my-scene`, then `npm run check`.
7. `npm run still` at the scene's first/middle/last frame; then a full render.

---

## 7. Visual QA

- Render stills at **first frame, mid-point, last frame** of every scene. Type must never be
  clipped by the wipe, the caption block, or the frame edge.
- Check the caption block against the longest word in the script — it should still fit two lines
  at 37 px.
- Scrub the wipe at 0.25× in Studio: the caramel edge should stay visible, not pop in.
- On the dark scene, confirm kicker and captions switch to cream and remain readable.
- Zoom to 100 % on the kicker: the mono number and label should sit on one baseline.

---

## 8. Don'ts

- Don't hard-code colours, font families, scene numbers or captions in a scene.
- Don't express timing in seconds — the timeline is frames.
- Don't put content under `y 1484`; that is the caption band.
- Don't animate more than one focal idea at a time.
- Don't hand-edit `voiceover.json`; regenerate it.
- Don't change the 4-frame VO offset or the 0.12 s caption lead without re-checking every scene.
