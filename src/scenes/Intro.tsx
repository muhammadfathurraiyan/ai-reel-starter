import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../lib/motion";
import { ANTON, MONO } from "../lib/fonts";
import type { SceneProps } from "../lib/types";
import { Kicker, MaskedLine, withAccent } from "../components/Text";
import { Captions } from "../components/Captions";

export const Intro: React.FC<SceneProps> = ({ scene, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <Kicker
        index={index}
        label={scene.label}
        frame={frame}
        fps={fps}
        style={{ position: "absolute", left: 64, top: 150, fontFamily: MONO }}
      />

      <div style={{ position: "absolute", left: 64, right: 64, top: 360 }}>
        <MaskedLine
          frame={frame}
          fps={fps}
          delay={6}
          style={{
            fontFamily: ANTON,
            fontSize: 172,
            lineHeight: 0.92,
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
          }}
        >
          {withAccent(scene.title, scene.accent, COLORS.espresso)}
        </MaskedLine>
      </div>

      {scene.note && (
        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            top: 800,
            fontFamily: MONO,
            fontSize: 17,
            letterSpacing: 2.4,
            color: COLORS.espresso,
            opacity: 0.55,
          }}
        >
          {scene.note}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: 64,
          top: 860,
          width: 96,
          height: 4,
          backgroundColor: COLORS.caramel,
        }}
      />

      <Captions sceneId={scene.id} frame={frame} />
    </AbsoluteFill>
  );
};
