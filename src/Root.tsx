import React from "react";
import { Composition } from "remotion";
import scenesData from "./data/scenes.json";
import { Reel } from "./Reel";

const durationInFrames = scenesData.scenes.reduce((sum, scene) => sum + scene.duration, 0);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Reel"
        component={Reel}
        durationInFrames={durationInFrames}
        fps={scenesData.fps}
        width={scenesData.width}
        height={scenesData.height}
      />
    </>
  );
};
