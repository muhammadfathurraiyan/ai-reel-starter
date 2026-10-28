# AGENTS.md

Context for AI coding agents working in this repository. Humans: see [README.md](README.md);
the deep dive is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## What this is

A **9:16 explainer-reel starter**: Remotion 4 + React 19 + TypeScript, with ElevenLabs
narration and procedurally generated music/SFX. The checked-in example is a deliberately
minimal 2-scene, 8-second reel (`intro` → `outro`). It exists to show the pipeline, not to be
preserved — the job is to turn it into the next real reel.

Hard spec: **1080 × 1920, 30 fps, English**, espresso/cream/caramel editorial palette,
word-level captions, voice-first mix.

## Commands

```console
npm run dev        # Remotion Studio
npm run check      # ESLint + tsc + timeline/VO/asset validation — run before finishing
npm run render     # out/reel.mp4
npm run still      # out/cover.png (frame 30)
npm run voiceover  # regenerate all narration (costs ElevenLabs credits)
npm run voiceover -- outro   # regenerate only those scene ids
npm run audio      # rebuild music + whoosh
node scripts/generate-audio.mjs whoosh   # rebuild one sound
```

`npm run check` is the gate. A green `tsc` alone does not mean the timeline is valid.

## Source of truth

| File | Role | Edit? |
|---|---|---|
| `src/data/scenes.json` | timeline: `id`, `label`, `title`, `accent`, `note`, `narration`, `from`, `duration`; plus `fps`, `width`, `height` | yes — primary edits |
| `src/data/voiceover.json` | generated per-scene WAV path, duration, `startOffset`, `tempo`, word timings | **no** — regenerate |
| `src/Root.tsx` | composition `Reel`; duration derived from `scenes.json` | rename id here + in `package.json` scripts |
| `src/Reel.tsx` | scene sequencing, wipe overlap, `COMPONENTS` map, music, VO, SFX cues | when adding scenes or retiming audio |
| `src/scenes/*.tsx` | visuals, one scene per file | yes |
| `src/components/Text.tsx` | `Kicker`, `MaskedLine`, `withAccent` | when adding type patterns |
| `src/components/Captions.tsx` | word-highlight captions | rarely |
| `src/lib/motion.ts` | `COLORS`, `EASE`, `clamp`, `pop` | palette/feel changes |
| `src/lib/types.ts` | `SceneData`, `SceneProps` | when the data shape changes |
| `src/lib/fonts.ts` | Anton, Inter Tight, IBM Plex Mono loaders | type changes |
| `scripts/generate-voiceover.mjs` | ElevenLabs TTS + timestamp mapping | rarely |
| `scripts/generate-audio.mjs` | procedural music/SFX | rarely |
| `scripts/check-timeline.mjs` | validator behind `npm run check` | extend if you add invariants |
| `docs/ARCHITECTURE.md` | how the frame is assembled: render graph, timeline, wipe, audio, contracts | when you change one of those contracts |
| `docs/AUTHORING.md` | safe area, type scale, motion vocabulary, pacing, scene checklist | when adding or redesigning a scene |
| `docs/AUDIO.md` | voice settings, ffmpeg chain, mix levels, loudness QA | when touching voice, music or SFX |

## Invariants

1. **Scenes are contiguous.** For every scene, `from === previous.from + previous.duration`;
   the first starts at 0. No gaps, no overlaps in the data (the 10-frame visual overlap lives in
   `Reel.tsx` / `SceneShell`, not in the timeline).
2. **Every scene id has** a `narration`, an entry in `voiceover.json`, a WAV in
   `public/voiceover/`, and a component registered in `COMPONENTS` (`src/Reel.tsx`).
3. **VO starts 4 frames after the cut** (`AUDIO_OFFSET` in `Reel.tsx`). Caption timings already
   include that offset plus a 0.12 s lead — do not add another offset.
4. **VO must fit the scene window.** `generate-voiceover.mjs` trims silence and applies `atempo`
   up to 1.18×; beyond that it warns. Fix by shortening copy or extending `duration` — do not
   raise the cap casually.
5. **Audio is layered**: music `0.33` under VO `1.0`; the whoosh is deliberately soft (`0.16`).
   Do not restore louder values.
6. **Everything is frame-based.** Never express scene timing in seconds in the data files.
7. **Secrets stay out of code.** `ELEVENLABS_API_KEY` comes from `.env.local` / the shell.
   Never print, commit or hard-code it. `.env.local` is gitignored.
8. **`out/` and `.tmp/` are disposable.** Never make the build depend on a rendered file.
9. **The music length follows the timeline** (`scripts/generate-audio.mjs` reads `scenes.json`).
   Re-run `npm run audio` after a big timing change so the bed still covers the reel.

## Adding or changing a scene

1. Add/update the entry in `scenes.json`; recompute `from` for every later scene and keep the
   list contiguous.
2. Create `src/scenes/MyScene.tsx`. Copy `Intro.tsx` (light) or `Outro.tsx` (dark) and take
   `{ scene, index }` from `SceneProps`.
3. Register it: `const COMPONENTS = { ..., "my-scene": MyScene }` in `src/Reel.tsx`.
4. End the scene with `<Captions sceneId={scene.id} frame={frame} />`.
5. Add SFX cues in `Reel.tsx` (`{ file: "whoosh.wav", scene: "my-scene", at: 12, volume: 0.16 }`).
6. `npm run voiceover -- my-scene` (needs a key), then `npm run check`.
7. Preview in Studio; render a still to verify the frame, then a full render.

## Design system rules

- Use `COLORS`, `EASE`, `clamp`, `pop` from `src/lib/motion.ts`; do not invent hex values in
  scenes.
- Type roles: Anton = display headlines, Inter Tight = captions/body, IBM Plex Mono = labels,
  kickers, notes. Keep the existing scale (headline 150–172, caption 37, mono 17–18).
- Layout: 64 px side margins, content column 952 px, content between `y 118` and `y 1400`,
  captions at `top: 1484`. Respect the safe area.
- Motion vocabulary: masked `MaskedLine` reveal, spring `pop` entrances, `SceneShell` clip-path
  wipe — no bounce/elastic gimmicks, no linear moves.
- One idea per scene. The visual must not animate faster than the sentence being spoken.

## Pitfalls seen in this repo

- `wav_44100` output is Pro-tier only; the script uses `mp3_44100_128` and converts to WAV.
  A `403 subscription_required` means someone changed the output format.
- ElevenLabs punctuation can carry inflated end times; word ends use the last alphanumeric
  character. Reuse the existing mapping instead of writing a new parser.
- `ffmpeg`/`ffprobe` must be on `PATH` for `npm run voiceover`.
- `Captions` returns `null` when a scene has no `voiceover.json` entry — a silent scene with no
  captions is usually a missing `npm run voiceover`, not a layout bug.
- `SceneShell` z-index is `40 - index`, so earlier scenes paint above later ones; that is what
  makes the wipe a reveal. Do not "fix" it.
- The music generator uses `Math.random()` for its air layer, so rebuilding `music.wav` changes
  its texture. Expected, not a regression.
- `Outro.tsx` is a full-bleed espresso card and hides the `Backdrop`; that is intentional.

## Definition of done

- `npm run check` passes.
- Rendered stills at each scene boundary look correct (no clipped type, no overlaps).
- Audio: VO intelligible over music, no clipping, no harsh whoosh.
- `out/` and `.tmp/` are not in version control; no `.env.local`, secrets or scratch renders
  added.
