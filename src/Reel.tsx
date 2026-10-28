import React from "react";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import scenesData from "./data/scenes.json";
import { VOICEOVER } from "./components/Captions";
import { Backdrop } from "./components/Backdrop";
import { SceneShell } from "./components/SceneShell";
import { COLORS } from "./lib/motion";
import type { SceneData, SceneProps } from "./lib/types";
import { Intro } from "./scenes/Intro";
import { Outro } from "./scenes/Outro";

const SCENES = scenesData.scenes as SceneData[];

const COMPONENTS: Record<string, React.FC<SceneProps>> = {
  intro: Intro,
  outro: Outro,
};

const SCENE_FROM: Record<string, number> = Object.fromEntries(
  SCENES.map((scene) => [scene.id, scene.from]),
);

/** SFX are placed relative to a scene; a negative `at` starts before the cut. */
const SFX = [{ file: "whoosh.wav", scene: "outro", at: -6, volume: 0.16 }];

/** VO starts just after the cut so it never collides with the wipe. */
const AUDIO_OFFSET = 4;

const Soundtrack: React.FC = () => {
  const { durationInFrames } = useVideoConfig();

  return (
    <>
      <Sequence durationInFrames={durationInFrames} layout="none" name="Music">
        <Audio src={staticFile("audio/music.wav")} volume={0.33} />
      </Sequence>

      {SCENES.map((scene) => {
        const voice = VOICEOVER[scene.id];
        if (!voice) return null;
        return (
          <Sequence
            key={scene.id}
            from={scene.from + AUDIO_OFFSET}
            durationInFrames={scene.duration}
            layout="none"
            name={`VO ${scene.id}`}
          >
            <Audio src={staticFile(voice.file)} volume={1} />
          </Sequence>
        );
      })}

      {SFX.map((cue, i) => (
        <Sequence
          key={i}
          from={SCENE_FROM[cue.scene] + cue.at}
          durationInFrames={90}
          layout="none"
          name={`SFX ${cue.file}`}
        >
          <Audio src={staticFile(`audio/${cue.file}`)} volume={cue.volume} />
        </Sequence>
      ))}
    </>
  );
};

export const Reel: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.cream }}>
      <Backdrop />

      {SCENES.map((scene, i) => {
        const Scene = COMPONENTS[scene.id];
        if (!Scene) return null;
        const overlap = i === SCENES.length - 1 ? 0 : 10;

        return (
          <Sequence
            key={scene.id}
            name={scene.id}
            from={scene.from}
            durationInFrames={scene.duration + overlap}
            layout="none"
          >
            <SceneShell index={i + 1} duration={scene.duration} overlap={overlap}>
              <Scene scene={scene} index={i + 1} />
            </SceneShell>
          </Sequence>
        );
      })}

      <Soundtrack />
    </AbsoluteFill>
  );
};
