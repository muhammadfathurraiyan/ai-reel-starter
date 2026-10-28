# Audio

Three layers: **voiceover** (ElevenLabs), **music bed** (synthesized), **SFX** (synthesized).
This doc is about tuning them — voices, levels, processing, QA. For where the `Sequence`s sit and
how captions stay in sync, see [ARCHITECTURE.md §5–7](ARCHITECTURE.md#5-voiceover-contract).

---

## 1. Signal flow

```
scenes.json narration
        │
        ▼
scripts/generate-voiceover.mjs ── ElevenLabs TTS ──► public/voiceover/<id>.wav
        │                              └───────────► src/data/voiceover.json (word timings)
        ▼
src/Reel.tsx ── music.wav  × 0.33   (frame 0, whole reel)
             ── <id>.wav   × 1.00   (scene.from + 4 frames)
             ── whoosh.wav × 0.16   (scene.from − 6 frames)
        ▼
remotion render ── AAC 192 kbps / 48 kHz stereo ──► out/reel.mp4
```

---

## 2. ElevenLabs setup

The key is read from `.env.local` (auto-loaded by the script) or the shell:

```console
cp .env.example .env.local
# paste ELEVENLABS_API_KEY=sk_...
```

`.env.local` is gitignored. Without a key, `npm run voiceover` exits with an actionable message;
everything else (Studio, render, check) still works because the demo WAVs are committed.

### Voice and model

| Variable | Default | Notes |
|---|---|---|
| `ELEVENLABS_VOICE_ID` | `nPczCjzI2devNBz1zQrb` | Brian — Deep, Resonant and Comforting |
| `ELEVENLABS_VOICE_NAME` | `Brian — Deep, Resonant and Comforting` | metadata written to `voiceover.json` |
| `ELEVENLABS_MODEL` | `eleven_v4` | quality/expressive model |

Settings sent with every request: `stability 0.5`, `similarityBoost 0.8`, speaker boost on,
`applyTextNormalization: "on"`, `languageCode: "en"`.

- **Stability 0.5** is the sweet spot for explainers: consistent enough to re-record a single line
  without it sounding like a different take, expressive enough to avoid a flat read.
- Raise stability if a long script drifts between scenes; lower it if the read sounds bored.
- Keep speaker boost on — phone speakers need the presence lift.

To list the voices on your account:

```js
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const client = new ElevenLabsClient();
const { voices } = await client.voices.search({ pageSize: 100 });
for (const v of voices) console.log(v.voiceId, "|", v.name, "|", v.labels);
```

Pick a warm mid-low voice for editorial explainers. Very deep voices lose intelligibility under
music at phone volume; very bright ones fight the caption highlight.

### Output format

The script requests **`mp3_44100_128`** and converts locally. Higher-quality WAV output
(`wav_44100`) is a paid-tier feature — on free/starter plans it returns `403 subscription_required`.
Do not "upgrade" the format unless your plan supports it; the MP3 → 48 kHz WAV path is inaudible
after EQ and compression.

---

## 3. What `npm run voiceover` does

Per scene (or only the ids passed on the CLI):

1. Synthesize with `convertWithTimestamps` → audio + character alignment.
2. Map characters → words; word `end` uses its last alphanumeric character (punctuation carries
   inflated end times).
3. Trim head/tail: 0.04 s before the first phoneme (max 0.3 s), 0.2 s after the last word.
4. Fit the window: usable length is `duration / fps − 0.5 s`; apply `atempo` up to **1.18×**.
5. Process with ffmpeg into 48 kHz mono 16-bit WAV.
6. Write `voiceover.json` (trim + tempo + 0.12 s lead folded into the timings).

Partial regeneration merges into the existing JSON:

```console
npm run voiceover -- outro
npm run check
```

> Each run costs credits. Edit one line at a time and use partial runs.

### Processing chain

```
atempo=<only if the read is too long>
highpass=f=88
equalizer=f=280:t=q:w=1.2:g=-1.2        # remove mud
equalizer=f=3600:t=q:w=1.4:g=1.6        # presence / intelligibility
equalizer=f=9000:t=h:w=2200:g=1.2       # air
acompressor=threshold=-18dB:ratio=2.4:attack=12:release=180:makeup=2
loudnorm=I=-16:TP=-1.5:LRA=11
aresample=48000
```

Each clip lands around **−16 LUFS** with peaks near −1.5 dBFS. That leaves ~2 LU of headroom for
the music bed before the master hits −14.

If you change the voice, re-check the 3.6 kHz presence band — some voices get sibilant there.
Lower `g=1.6` to `g=1.0` before touching the global levels.

---

## 4. Mix levels

Defined in `src/Reel.tsx`.

| Layer | Gain | Why |
|---|---|---|
| Voiceover | `1.00` | reference; everything else is relative to it |
| Music bed | `0.33` | sits ~10 dB under speech without disappearing on phone speakers |
| Whoosh | `0.16` | audible at the cut, decays before the first word |

Two rules:

- **Voice first.** If a sound makes a word harder to hear, lower the sound.
- **Don't raise the whoosh.** It is band-passed on purpose; louder values read as hiss.

The whoosh is cued at `at: -6` frames so it peaks *on* the transition. VO starts 4 frames after
the cut and its captions already carry that offset — never add another.

---

## 5. Procedural music and SFX

`scripts/generate-audio.mjs` writes 48 kHz stereo WAVs; there are no third-party samples.

| File | Design |
|---|---|
| `music.wav` | length = `Σ scene.duration / fps`; two slow pad chords (Am9 → Fmaj9 in the 8 s example), soft 52 Hz sub pulse every 3 s, filtered air noise, DC blocker, fades, normalized to 0.3 peak |
| `whoosh.wav` | 0.6 s band-passed noise sweep: 160 Hz low cut, moving low-pass, 6.8 kHz smoothing, peak around 0.24 s |

Rebuild everything or one file:

```console
npm run audio
node scripts/generate-audio.mjs whoosh
node scripts/generate-audio.mjs music whoosh
```

The music is driven by the timeline, so **re-run `npm run audio` after changing scene durations**
or the bed will end before the reel does. The air layer uses `Math.random()`, so each rebuild is a
slightly different texture — that is expected, not a regression.

If you add a cue type, add its generator here and its file to `public/audio/`; the checker
validates every `file: "…wav"` referenced in `Reel.tsx`.

---

## 6. Loudness and QA

Target: **≈ −14 LUFS integrated, true peak ≤ −1 dBTP** (what Instagram/YouTube normalize to).

```console
ffmpeg -hide_banner -nostats -i out/reel.mp4 \
  -af loudnorm=I=-14:TP=-1.5:print_format=json -f null -
```

Read `input_i` and `input_tp` from the JSON. Useful spot checks:

```console
# whoosh window right before the incoming VO
ffmpeg -hide_banner -nostats -ss 3.95 -t 0.2 -i out/reel.mp4 \
  -af "astats=metadata=1:reset=0" -f null -

# harshness check on the same window
ffmpeg -hide_banner -nostats -ss 3.95 -t 0.2 -i out/reel.mp4 \
  -af "highpass=f=6000,astats=metadata=1:reset=0" -f null -

# per-clip loudness
ffmpeg -hide_banner -nostats -i public/voiceover/outro.wav -af "ebur128" -f null -
```

If the master drifts more than ~0.5 LU from −14, adjust the music bed first. Normalizing the
finished file changes transient impact — last resort.

Also listen once on a phone speaker at low volume: that is where a mix that looks fine in
headphones falls apart.

---

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| `ELEVENLABS_API_KEY is not set` | create `.env.local` from `.env.example` |
| `403 subscription_required` | format changed to a paid-tier WAV; keep `mp3_44100_128` |
| `ffmpeg`/`ffprobe` not found | install ffmpeg; both binaries must be on `PATH` |
| a word highlights early/late | re-run `npm run voiceover` — timings are generated |
| voice sounds rushed | shorten the line or lengthen the scene; don't push `atempo` past 1.18 |
| captions run past the scene | `npm run check` names the scene and the exact timings |
| music ends early | `npm run audio` (it derives length from `scenes.json`) |
| music drowns the voice | lower music gain (0.33), not the VO |
| whoosh sounds harsh | rebuild it; then confirm no cue volume was raised above 0.16 |
| music sounds different after rebuild | `Math.random()` air layer — expected |
