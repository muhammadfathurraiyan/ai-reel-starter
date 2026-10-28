/**
 * Sanity-checks the files that drive the reel: src/data/scenes.json,
 * src/data/voiceover.json and the scene registration in src/Reel.tsx.
 *
 *   npm run check
 *
 * It catches the mistakes that are annoying to debug mid-render: gaps between
 * scenes, stale voiceover timings, missing assets, unregistered scenes and
 * sound cues pointing at a scene id that no longer exists.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const readJson = (path) => JSON.parse(read(path));

const data = readJson("src/data/scenes.json");
const voice = readJson("src/data/voiceover.json");
const FPS = data.fps;
const VO_OFFSET = 4; // frames — matches AUDIO_OFFSET in Reel.tsx

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

const seconds = (frames) => frames / FPS;
const timecode = (frames) => {
  const t = frames / FPS;
  return `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, "0")}`;
};

if (!Number.isInteger(FPS) || FPS <= 0) fail(`scenes.json has an invalid fps: ${FPS}`);
if (!Number.isInteger(data.width) || !Number.isInteger(data.height)) {
  fail("scenes.json needs integer width and height");
}

const reel = read("src/Reel.tsx");
const componentsBlock = reel.match(/const COMPONENTS[^{]*\{([\s\S]*?)\};/)?.[1] ?? "";
const registered = new Set(
  [...componentsBlock.matchAll(/^\s*([a-z0-9-]+):/gm)].map((match) => match[1]),
);

const ids = new Set();
let cursor = 0;
const rows = [];

for (const [i, scene] of data.scenes.entries()) {
  const name = scene.id ?? `#${i + 1}`;

  if (!scene.id) fail(`scene ${i + 1} has no id`);
  if (ids.has(scene.id)) fail(`duplicate scene id "${scene.id}"`);
  ids.add(scene.id);

  if (!Number.isInteger(scene.duration) || scene.duration <= 0) {
    fail(`"${name}" needs a positive integer duration in frames`);
    continue;
  }
  if (scene.from !== cursor) {
    fail(
      `"${name}" starts at frame ${scene.from} but the previous scene ends at ${cursor} ` +
        `(${scene.from < cursor ? "overlap" : "gap"} of ${Math.abs(scene.from - cursor)} frames)`,
    );
  }
  cursor = scene.from + scene.duration;

  if (!scene.narration?.trim()) fail(`"${name}" has no narration text`);
  if (!scene.title?.trim()) warn(`"${name}" has no on-screen title`);
  if (!registered.has(name)) fail(`"${name}" is not registered in COMPONENTS (src/Reel.tsx)`);

  const windowSeconds = seconds(scene.duration);
  const timing = voice.scenes?.[name];

  if (!timing) {
    fail(`no voiceover timings for "${name}" — run \`npm run voiceover\``);
  } else {
    if (!existsSync(join(root, "public", timing.file))) {
      fail(`missing audio file public/${timing.file} for "${name}"`);
    }
    if (timing.duration + seconds(VO_OFFSET) > windowSeconds + 0.05) {
      fail(
        `"${name}" voiceover is ${timing.duration.toFixed(2)}s but the scene window is ` +
          `${windowSeconds.toFixed(2)}s — shorten the read or lengthen the scene`,
      );
    }

    let previous = -1;
    for (const word of timing.words ?? []) {
      if (word.start < 0) fail(`"${name}" has a negative caption start ("${word.w}")`);
      if (word.start < previous - 0.001) {
        fail(`"${name}" caption timings are out of order around "${word.w}"`);
      }
      previous = word.start;
    }

    const lastWord = timing.words?.at(-1)?.end ?? 0;
    if (lastWord + seconds(VO_OFFSET) > windowSeconds) {
      fail(
        `"${name}" last caption ends at ${lastWord.toFixed(2)}s, past the ` +
          `${windowSeconds.toFixed(2)}s scene window`,
      );
    }
    if (timing.tempo > 1.18) warn(`"${name}" voiceover was sped up ${timing.tempo}x to fit`);
  }

  rows.push({
    scene: `${String(i + 1).padStart(2, "0")} ${name}`,
    start: timecode(scene.from),
    frames: scene.duration,
    seconds: `${windowSeconds.toFixed(2)}s`,
    narration: `${scene.narration?.length ?? 0} chars`,
  });
}

// Sound cues and scene ids referenced from Reel.tsx.
for (const [, scene] of reel.matchAll(/scene: "([^"]+)"/g)) {
  if (!ids.has(scene)) fail(`Reel.tsx has a sound cue for unknown scene "${scene}"`);
}
const sfxFiles = new Set([...reel.matchAll(/file: "([^"]+\.wav)"/g)].map((match) => match[1]));
for (const file of sfxFiles) {
  if (!existsSync(join(root, "public", "audio", file))) fail(`missing SFX public/audio/${file}`);
}

const totalFrames = cursor;
const totalSeconds = seconds(totalFrames);

console.log(
  `\nTimeline  ${data.width}×${data.height} @ ${FPS}fps  ·  ${data.scenes.length} scenes  ·  ` +
    `${totalFrames} frames / ${totalSeconds.toFixed(2)}s\n`,
);
const widths = { scene: 18, start: 8, frames: 7, seconds: 8 };
console.log(
  "scene".padEnd(widths.scene) +
    "start".padEnd(widths.start) +
    "frames".padEnd(widths.frames) +
    "length".padEnd(widths.seconds) +
    "narration",
);
for (const row of rows) {
  console.log(
    row.scene.padEnd(widths.scene) +
      row.start.padEnd(widths.start) +
      String(row.frames).padEnd(widths.frames) +
      row.seconds.padEnd(widths.seconds) +
      row.narration,
  );
}

if (warnings.length) {
  console.log("\nWarnings");
  for (const warning of warnings) console.log(`  · ${warning}`);
}

if (errors.length) {
  console.error("\nErrors");
  for (const error of errors) console.error(`  ✗ ${error}`);
  console.error(`\n${errors.length} problem(s) found.\n`);
  process.exit(1);
}

console.log("\n✓ Timeline, voiceover timings and audio cues look consistent.\n");
