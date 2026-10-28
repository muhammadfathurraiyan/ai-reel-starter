/**
 * Synthesizes the ambient music bed and transition whoosh into public/audio.
 * The music length follows the total duration in src/data/scenes.json.
 *
 *   npm run audio
 *   node scripts/generate-audio.mjs whoosh
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SR = 48000;
const TAU = Math.PI * 2;
const root = process.cwd();
const outDir = join(root, "public", "audio");
mkdirSync(outDir, { recursive: true });

const data = JSON.parse(readFileSync(join(root, "src/data/scenes.json"), "utf8"));
const totalFrames = data.scenes.reduce((sum, scene) => sum + scene.duration, 0);
const duration = totalFrames / data.fps;

const writeWav = (name, channels) => {
  const length = channels[0].length;
  const buffer = Buffer.alloc(44 + length * channels.length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + length * channels.length * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels.length, 22);
  buffer.writeUInt32LE(SR, 24);
  buffer.writeUInt32LE(SR * channels.length * 2, 28);
  buffer.writeUInt16LE(channels.length * 2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(length * channels.length * 2, 40);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < channels.length; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      buffer.writeInt16LE(Math.round(s * 32767), offset);
      offset += 2;
    }
  }

  writeFileSync(join(outDir, name), buffer);
  console.log(`wrote public/audio/${name} (${(length / SR).toFixed(2)}s)`);
};

const normalize = (channels, peak) => {
  let max = 0;
  for (const ch of channels) for (const sample of ch) max = Math.max(max, Math.abs(sample));
  const gain = max > 0 ? peak / max : 1;
  for (const ch of channels) for (let i = 0; i < ch.length; i++) ch[i] *= gain;
};

const makeBuffer = (seconds) => ({
  n: Math.round(seconds * SR),
  l: new Float64Array(Math.round(seconds * SR)),
  r: new Float64Array(Math.round(seconds * SR)),
});

/* ------------------------------ music ------------------------------ */

const buildMusic = () => {
  const { n, l, r } = makeBuffer(duration);
  const half = duration / 2;
  const chords = [
    { at: 0, notes: [110.0, 164.81, 261.63, 329.63, 493.88] }, // Am9
    { at: half, notes: [87.31, 130.81, 220.0, 329.63, 392.0] }, // Fmaj9
  ];

  const chordGain = (t, at) => {
    const local = t - at;
    if (local < 0 || local > half + 2) return 0;
    const inG = Math.min(1, local / 1.2);
    const outG = Math.min(1, (half + 2 - local) / 1.5);
    return Math.max(0, Math.min(inG, outG));
  };

  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let left = 0;
    let right = 0;

    for (const chord of chords) {
      const gain = chordGain(t, chord.at);
      if (gain <= 0) continue;

      chord.notes.forEach((f, k) => {
        const pan = (k / (chord.notes.length - 1) - 0.5) * 0.6;
        const gl = Math.cos((pan + 1) * Math.PI * 0.25);
        const gr = Math.sin((pan + 1) * Math.PI * 0.25);
        const drift = 1 + 0.0016 * Math.sin(TAU * 0.07 * t + k);
        const v =
          Math.sin(TAU * f * drift * t) * 0.62 + Math.sin(TAU * f * 0.9983 * t + k * 1.7) * 0.38;
        const trem = 1 + 0.06 * Math.sin(TAU * 0.11 * t + k);
        const a = 0.026 * gain * (k === 0 ? 1.25 : 1);
        left += v * a * gl * trem;
        right += v * a * gr * trem;
      });
    }

    // soft sub pulse every 3 seconds
    const pulseT = t % 3;
    if (pulseT < 1.4) {
      const env = Math.exp(-7.5 * pulseT) * (1 - Math.exp(-60 * pulseT));
      const f = 52 + 16 * Math.exp(-14 * pulseT);
      const v = Math.sin(TAU * f * pulseT) * env * 0.05;
      left += v;
      right += v;
    }

    // airy hiss
    const noise = Math.random() * 2 - 1;
    const breath = 0.0022 * (0.65 + 0.35 * Math.sin(TAU * 0.045 * t));
    left += noise * breath;
    right += noise * breath * 0.92;

    l[i] = left;
    r[i] = right;
  }

  // remove DC build-up
  let pl = 0;
  let pr = 0;
  for (let i = 0; i < n; i++) {
    pl = pl * 0.9995 + l[i] * 0.0005;
    pr = pr * 0.9995 + r[i] * 0.0005;
    l[i] -= pl;
    r[i] -= pr;
  }

  // fades
  const fadeIn = 1.2 * SR;
  const fadeOut = 1.5 * SR;
  for (let i = 0; i < n; i++) {
    let g = 1;
    if (i < fadeIn) g *= i / fadeIn;
    if (i > n - fadeOut) g *= Math.max(0, (n - i) / fadeOut);
    l[i] = Math.tanh(l[i] * 1.1) * g;
    r[i] = Math.tanh(r[i] * 1.1) * g;
  }

  normalize([l, r], 0.3);
  writeWav("music.wav", [l, r]);
};

/* ------------------------------ whoosh ------------------------------ */

const buildWhoosh = () => {
  const { n, l, r } = makeBuffer(0.6);

  // A band-passed sweep keeps the body of the sound in the mid range instead
  // of turning into hiss above 4 kHz, which reads as "too loud" at low gain.
  const LOW_CUT = 160;
  const SMOOTH = 6800;
  const onePole = (fc) => 1 - Math.exp((-TAU * fc) / SR);
  const aLowCut = onePole(LOW_CUT);
  const aSmooth = onePole(SMOOTH);

  const chans = [
    { out: l, lp: 0, hp: 0, sm: 0, gain: 1 },
    { out: r, lp: 0, hp: 0, sm: 0, gain: 0.94 },
  ];

  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const p = t / 0.6;
    const env = Math.pow(Math.sin(Math.PI * Math.pow(p, 0.75)), 1.7);
    const cutoff = 420 + 3400 * Math.sin(Math.PI * p) ** 2;
    const aSweep = onePole(cutoff);

    for (const ch of chans) {
      const noise = Math.random() * 2 - 1;
      ch.lp += aSweep * (noise - ch.lp);
      ch.hp += aLowCut * (noise - ch.hp);
      const band = ch.lp - ch.hp;
      ch.sm += aSmooth * (band - ch.sm);
      ch.out[i] = ch.sm * env * ch.gain;
    }
  }

  normalize([l, r], 0.45);
  writeWav("whoosh.wav", [l, r]);
};

const builders = { music: buildMusic, whoosh: buildWhoosh };
const requested = process.argv.slice(2);
const names = requested.length ? requested : Object.keys(builders);

for (const name of names) {
  const build = builders[name];
  if (!build) {
    console.error(`Unknown sound "${name}". Try: ${Object.keys(builders).join(", ")}`);
    process.exit(1);
  }
  build();
}
