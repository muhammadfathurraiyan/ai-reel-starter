import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const root = process.cwd();
const envFile = join(root, ".env.local");

// Keep `npm run voiceover` working for people who have not created .env.local
// yet: load it when present, otherwise fall back to the shell environment.
if (!process.env.ELEVENLABS_API_KEY && existsSync(envFile)) {
  process.loadEnvFile(envFile);
}
const tmp = join(root, ".tmp", "voice");
const outDir = join(root, "public", "voiceover");
mkdirSync(tmp, { recursive: true });
mkdirSync(outDir, { recursive: true });

const data = JSON.parse(readFileSync(join(root, "src/data/scenes.json"), "utf8"));
const FPS = data.fps;

// Brian — Deep, Resonant and Comforting is the shipped default: a warm,
// premium explainer read. Override with ELEVENLABS_VOICE_ID / _VOICE_NAME.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "nPczCjzI2devNBz1zQrb";
const VOICE_NAME = process.env.ELEVENLABS_VOICE_NAME ?? "Brian — Deep, Resonant and Comforting";
const MODEL = process.env.ELEVENLABS_MODEL ?? "eleven_v4";
const LEAD = 0.12; // caption lead before the first spoken word

if (!process.env.ELEVENLABS_API_KEY) {
  console.error(
    "ELEVENLABS_API_KEY is not set.\n" +
      "Copy .env.example to .env.local and add your key, or export it in your shell.\n" +
      "Get one at https://elevenlabs.io/app/settings/api-keys",
  );
  process.exit(1);
}

const client = new ElevenLabsClient();

const run = (cmd, args) =>
  execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });

const probe = (file) =>
  Number(
    execFileSync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=nw=1:nk=1",
      file,
    ]).toString().trim(),
  );

/**
 * Turn ElevenLabs character alignment into the caption word timings used by
 * Remotion. We match the original narration tokens (with punctuation) against
 * the normalized alignment, ignoring all non-alphanumeric characters.
 */
const buildWords = (narration, alignment) => {
  const chars = alignment?.characters ?? [];
  const starts = alignment?.characterStartTimesSeconds ?? [];
  const ends = alignment?.characterEndTimesSeconds ?? [];

  const condensed = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = String(chars[i]).toLowerCase();
    if (/[a-z0-9]/.test(ch)) {
      condensed.push({ ch, start: starts[i], end: ends[i] });
    }
  }
  if (!condensed.length) throw new Error("No usable character alignment returned");

  const condensedText = condensed.map((c) => c.ch).join("");
  const tokens = narration.split(/\s+/).filter(Boolean);
  let cursor = 0;
  let lastEnd = 0;

  return tokens.map((word) => {
    const key = word.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Standalone punctuation (for example the em dash) is not spoken.
    if (!key) {
      const start = lastEnd;
      const end = start + 0.04;
      lastEnd = end;
      return { w: word, start, end };
    }

    let index = condensedText.indexOf(key, cursor);
    if (index === -1) index = condensedText.indexOf(key);
    if (index === -1) {
      console.warn(`  ! could not align "${word}"; using estimated timing`);
      const start = lastEnd;
      const end = start + Math.max(0.16, key.length * 0.06);
      lastEnd = end;
      return { w: word, start, end };
    }

    const start = condensed[index].start;
    const end = condensed[index + key.length - 1].end;
    cursor = index + key.length;
    lastEnd = end;
    return { w: word, start, end };
  });
};

// Accept scene ids on the command line so a single line can be re-recorded
// without paying for the whole script: `npm run voiceover -- intro outro`.
const only = process.argv.slice(2);
const unknown = only.filter((id) => !data.scenes.some((scene) => scene.id === id));
if (unknown.length) {
  console.error(`Unknown scene id(s): ${unknown.join(", ")}`);
  console.error(`Available: ${data.scenes.map((scene) => scene.id).join(", ")}`);
  process.exit(1);
}

const targets = only.length
  ? data.scenes.filter((scene) => only.includes(scene.id))
  : data.scenes;

const voiceFile = join(root, "src/data/voiceover.json");
let result = { voice: `${VOICE_NAME} (ElevenLabs)`, model: MODEL, lead: LEAD, scenes: {} };

// Partial runs keep the timings of scenes that were not re-recorded.
if (only.length && existsSync(voiceFile)) {
  const previous = JSON.parse(readFileSync(voiceFile, "utf8"));
  result = { ...previous, voice: result.voice, model: result.model, lead: LEAD };
  result.scenes = { ...previous.scenes };
}

for (const scene of targets) {
  const rawFile = join(tmp, `${scene.id}.mp3`);
  const outFile = join(outDir, `${scene.id}.wav`);
  const windowSeconds = scene.duration / FPS;
  const maxSeconds = windowSeconds - 0.5;

  let response;
  try {
    response = await client.textToSpeech.convertWithTimestamps(VOICE_ID, {
      text: scene.narration,
      modelId: MODEL,
      outputFormat: "mp3_44100_128",
      languageCode: "en",
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 0.8,
        useSpeakerBoost: true,
      },
      applyTextNormalization: "on",
    });
  } catch (error) {
    console.error(`ElevenLabs failed for ${scene.id}:`, error.message ?? error);
    process.exit(1);
  }

  writeFileSync(rawFile, Buffer.from(response.audioBase64, "base64"));
  const alignment = response.normalizedAlignment ?? response.alignment;
  const rawWords = buildWords(scene.narration, alignment);
  const rawDuration = probe(rawFile);

  // Trim the quiet head and tail, then use atempo only when the read is too
  // long for the fixed scene window. Timings are scaled to match.
  const firstStart = Math.min(...rawWords.map((w) => w.start));
  const lastSpokenEnd = Math.max(...rawWords.map((w) => w.end));
  const startTrim = Math.max(0, Math.min(firstStart - 0.04, 0.3));
  const endTrim = Math.min(rawDuration - 0.02, lastSpokenEnd + 0.2);
  const trimDuration = Math.max(0.2, endTrim - startTrim);
  const tempo = Math.min(1.18, Math.max(1, trimDuration / maxSeconds));

  if (trimDuration / tempo > maxSeconds + 0.02) {
    console.warn(`  ! ${scene.id} still runs long at 1.18x speed`);
  }

  const filters = [
    tempo > 1.001 ? `atempo=${tempo.toFixed(4)}` : null,
    "highpass=f=88",
    "equalizer=f=280:t=q:w=1.2:g=-1.2",
    "equalizer=f=3600:t=q:w=1.4:g=1.6",
    "equalizer=f=9000:t=h:w=2200:g=1.2",
    "acompressor=threshold=-18dB:ratio=2.4:attack=12:release=180:makeup=2",
    "loudnorm=I=-16:TP=-1.5:LRA=11",
    "aresample=48000",
  ].filter(Boolean);

  run("ffmpeg", [
    "-y", "-v", "error",
    "-i", rawFile,
    "-ss", startTrim.toFixed(3),
    "-t", trimDuration.toFixed(3),
    "-af", filters.join(","),
    "-ac", "1",
    "-ar", "48000",
    "-c:a", "pcm_s16le",
    outFile,
  ]);

  const duration = probe(outFile);
  const mapTime = (t) =>
    Number(Math.min(duration + LEAD, Math.max(LEAD, (t - startTrim) / tempo + LEAD)).toFixed(3));
  const words = rawWords.map((w) => ({
    w: w.w,
    start: mapTime(w.start),
    end: mapTime(w.end),
  }));

  result.scenes[scene.id] = {
    file: `voiceover/${scene.id}.wav`,
    duration: Number(duration.toFixed(3)),
    startOffset: LEAD,
    tempo: Number(tempo.toFixed(3)),
    words,
  };

  console.log(
    `${scene.id.padEnd(9)} raw ${rawDuration.toFixed(2)}s → ${duration.toFixed(2)}s  ` +
      `window ${windowSeconds.toFixed(2)}s  tempo ${tempo.toFixed(3)}  ` +
      `lastWord ${words[words.length - 1].end.toFixed(2)}s`,
  );
}

writeFileSync(voiceFile, JSON.stringify(result, null, 2));
rmSync(tmp, { recursive: true, force: true });
console.log(`\nWrote ${targets.length} voiceover file(s) and updated src/data/voiceover.json`);
