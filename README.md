# AI Reel Starter

A minimal starter for **9:16 explainer reels**. Every frame is code: motion graphics in
[Remotion](https://www.remotion.dev), narration from [ElevenLabs](https://elevenlabs.io) with
word-level timestamps, and a procedurally generated music bed + whoosh so there is nothing to
license.

The repo ships with a **2-scene, 8-second example** — an intro and an outro — so you can see the
whole pipeline working without reading much code. Replace its content with your own.

```
1080 × 1920  ·  30 fps  ·  240 frames / 8.00 s  ·  English  ·  H.264 + AAC
```

---

## What's in the box

- **Two example scenes** (`intro`, `outro`) showing the full pattern: headline, kicker, note,
  captions, dark finale card.
- **A small design system** — espresso/cream/caramel palette, paper backdrop, masked headline
  reveals, upward clip-path wipe between scenes.
- **Word-level captions** generated from ElevenLabs alignment — no hand timing.
- **Audio pipeline** — ElevenLabs voiceover, synthesized music bed, one soft transition whoosh.
- **A timeline checker** (`npm run check`) that catches gaps, stale voiceover and missing assets.
- **Docs for humans and agents** — this file plus `AGENTS.md`.

---

## Requirements

| Tool | Why | Notes |
|---|---|---|
| Node.js `20.19+`, `22.13+` or `24+` | Remotion | see `engines` in `package.json` |
| `ffmpeg` + `ffprobe` on `PATH` | voiceover processing | `brew install ffmpeg` on macOS |
| ElevenLabs API key | only when generating **new** narration | the demo audio is included |
| Chrome/Chromium | Remotion downloads it on first render | automatic |

---

## Quickstart

```console
npm install
npm run dev        # Remotion Studio at http://localhost:3000
```

Render the example:

```console
npm run render     # → out/reel.mp4
npm run still      # → out/cover.png (frame 30)
```

`out/` is gitignored; nothing in the repo depends on a rendered file.

### Adding your ElevenLabs key

Only needed for new narration. Copy the template and paste your key:

```console
cp .env.example .env.local
```

```dotenv
ELEVENLABS_API_KEY=sk_...
```

`.env.local` is gitignored. `npm run voiceover` loads it automatically and also works if the key
is exported in your shell.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Remotion Studio preview with hot reload |
| `npm run render` | render `Reel` → `out/reel.mp4` (H.264 CRF 18, AAC 192 kbps, 48 kHz) |
| `npm run still` | export a cover frame → `out/cover.png` (frame 30) |
| `npm run check` | ESLint + TypeScript + timeline/voiceover/asset validation |
| `npm run voiceover` | synthesize all narration from `scenes.json` |
| `npm run voiceover -- outro` | re-synthesize only the listed scene ids (saves credits) |
| `npm run audio` | rebuild music + whoosh |
| `node scripts/generate-audio.mjs whoosh` | rebuild a single sound |
| `npm run build` | Remotion bundle (for serving/embedding) |
| `npm run upgrade` | upgrade Remotion packages |

`npm run check` is the gate. A green `tsc` alone does not mean the timeline is valid.

---

## Project map

```text
src/
  index.ts                 Remotion entry point
  Root.tsx                 registers composition "Reel"; duration derives from scenes.json
  Reel.tsx                 the composition: scene sequencing, wipe, music, VO, SFX
  data/
    scenes.json            ← timeline + narration (SOURCE OF TRUTH — edit this first)
    voiceover.json         ← generated: WAV path, duration, word timings (never hand-edit)
  components/
    Backdrop.tsx           paper gradient, column grid, frame, vignette
    SceneShell.tsx         upward clip-path wipe shared by every scene
    Text.tsx               Kicker, MaskedLine, withAccent
    Captions.tsx           word-highlight captions driven by voiceover.json
  scenes/
    Intro.tsx              light paper scene
    Outro.tsx              dark espresso finale card
  lib/
    motion.ts              COLORS, EASE, clamp, pop
    fonts.ts               Anton + Inter Tight + IBM Plex Mono (Google Fonts)
    types.ts               SceneData / SceneProps
public/
  audio/                   music.wav, whoosh.wav (48 kHz WAV, generated)
  voiceover/               intro.wav, outro.wav (48 kHz mono WAV, generated)
scripts/
  generate-audio.mjs       procedural music + whoosh synthesis
  generate-voiceover.mjs   ElevenLabs TTS + word-timing mapping
  check-timeline.mjs       the validator behind `npm run check`
docs/
  ARCHITECTURE.md          render graph, timeline, wipe, audio graph, data contracts
  AUTHORING.md             layout grid, type scale, motion recipes, pacing, scene checklist
  AUDIO.md                 voices, processing chain, mix levels, loudness QA
AGENTS.md                  context brief for AI coding agents
.agents/skills/            vendored Remotion skill docs (optional, for agents)
```

---

## How it works

**One file defines time.** `src/data/scenes.json` holds `fps`, `width`, `height` and the scene
list. Each scene has `id`, `label`, `title`, `accent`, `note`, `narration`, `from` and
`duration` — all in **frames**. `Root.tsx` sums the durations, so the composition length can
never drift from the data.

**Scenes stack with a shared wipe.** `Reel.tsx` renders each scene in a `Sequence` at
`scene.from`, giving every scene but the last ten extra frames. `SceneShell` clips the outgoing
scene upward and draws a caramel edge, revealing the next scene underneath.

**Audio is layered.** Music runs for the whole reel, each scene's VO starts four frames after
its cut, and SFX are declared relative to a scene (`{ file, scene, at, volume }`, negative `at`
starts before the cut).

```
0                    120                   240
│ intro (4.00s)      │ outro (4.00s)       │
                     ├ whoosh (at -6)  ⟶  │
```

**Captions follow the real voice.** `npm run voiceover` asks ElevenLabs for character timings,
maps them onto the narrated words, trims the read to its scene window, and writes
`voiceover.json`. `Captions` then highlights the current word.

The full breakdown — render graph, timeline contract, wipe mechanics, audio graph, checker
rules — is in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

---

## Documentation

| Document | Read it when |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | you need the render graph, timeline math, wipe mechanics or data contracts |
| [docs/AUTHORING.md](docs/AUTHORING.md) | you are designing a scene: safe area, type scale, motion recipes, copy budgets |
| [docs/AUDIO.md](docs/AUDIO.md) | you are changing the voice, processing, mix levels or loudness |
| [AGENTS.md](AGENTS.md) | you are handing the repo to an AI coding agent |

---

## Make it yours

1. Rewrite `src/data/scenes.json` — ids, copy, `from`, `duration`. Keep scenes contiguous:
   `from` must equal the previous `from + duration`.
2. Edit `src/scenes/Intro.tsx` / `Outro.tsx` (or add a scene file) and register it in
   `COMPONENTS` inside `src/Reel.tsx`.
3. Every scene ends with `<Captions sceneId={scene.id} frame={frame} />` so captions stay wired.
4. Put your key in `.env.local`, then `npm run voiceover` (or `npm run voiceover -- my-scene`).
5. Re-time the whoosh in `src/Reel.tsx`, then run `npm run check`.
6. `npm run render`, review stills, publish.

To change the look, edit `COLORS` / `EASE` in `src/lib/motion.ts` (every scene follows) and the
font loaders in `src/lib/fonts.ts`.

Voice defaults to Brian (`nPczCjzI2devNBz1zQrb`, `eleven_v4`). Override without touching code:

```dotenv
ELEVENLABS_VOICE_ID=...
ELEVENLABS_VOICE_NAME=...
ELEVENLABS_MODEL=eleven_v4
```

---

## Output spec

- 1080 × 1920, square pixels, 30 fps
- H.264 High, CRF 18, `yuv420p` (plays everywhere)
- AAC 192 kbps, 48 kHz stereo

Check a render:

```console
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate,sample_rate -of default=noprint_wrappers=1 out/reel.mp4
ffmpeg -hide_banner -nostats -i out/reel.mp4 -af loudnorm=I=-14:TP=-1.5:print_format=json -f null -
```

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `ELEVENLABS_API_KEY is not set` | create `.env.local` from `.env.example`, or export the key |
| `403 subscription_required` | free/starter plans reject `wav_44100`; the script already requests `mp3_44100_128` and converts locally |
| `ffmpeg: command not found` | install ffmpeg and make sure both `ffmpeg` and `ffprobe` are on `PATH` |
| captions drift after editing narration | re-run `npm run voiceover` — timings are generated, never hand-edited |
| a line runs past its scene | shorten the copy or raise `duration`; the script speeds up to 1.18× max, then warns |
| `npm run check` reports a gap/overlap | `from` must equal the previous scene's `from + duration` |
| voice sounds rushed | cut words rather than raising the `atempo` cap in `scripts/generate-voiceover.mjs` |
| render is slow | lower `--concurrency`, or iterate with `npm run still` instead of full renders |

---

## Sharing this repo

- **Secrets**: `.env.local` is gitignored and must never be committed or zipped with the repo.
  Share `.env.example` instead.
- **Audio**: the demo `public/audio` and `public/voiceover` are checked in so a friend can render
  immediately without an API key. Delete them if you want a truly empty starter (then
  `npm run voiceover` is mandatory before rendering).
- **Fonts**: Anton, Inter Tight, IBM Plex Mono via Google Fonts (SIL OFL).
- **Music/SFX**: synthesized by `scripts/generate-audio.mjs`. No third-party samples.
- **Narration**: generated with your own ElevenLabs account — check their terms before publishing.
- **Licence**: `UNLICENSED` in `package.json`; add one before publishing publicly.
- `.agents/skills/` contains vendored Remotion skill docs (from `remotion-dev/skills`); optional
  reading, not required to build.

Built with Remotion 4, React 19 and the ElevenLabs JS SDK.
