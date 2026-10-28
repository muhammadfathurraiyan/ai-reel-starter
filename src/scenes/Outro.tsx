import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../lib/motion";
import { ANTON, MONO } from "../lib/fonts";
import type { SceneProps } from "../lib/types";
import { Kicker, MaskedLine, withAccent } from "../components/Text";
import { Captions } from "../components/Captions";

export const Outro: React.FC<SceneProps> = ({ scene, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.espresso, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          right: -180,
          bottom: -160,
          width: 720,
          height: 720,
          borderRadius: "50%",
          border: "1px solid rgba(197,139,84,0.28)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 72,
          top: 120,
          width: 10,
          height: 10,
          backgroundColor: COLORS.caramel,
        }}
      />

      <Kicker
        index={index}
        label={scene.label}
        frame={frame}
        fps={fps}
        dark
        style={{ position: "absolute", left: 64, top: 150, fontFamily: MONO }}
      />

      <div style={{ position: "absolute", left: 64, right: 64, top: 420 }}>
        <MaskedLine
          frame={frame}
          fps={fps}
          delay={6}
          style={{
            fontFamily: ANTON,
            fontSize: 150,
            lineHeight: 0.94,
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
          }}
        >
          {withAccent(scene.title, scene.accent, COLORS.cream)}
        </MaskedLine>
      </div>

      {scene.note && (
        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            top: 840,
            fontFamily: MONO,
            fontSize: 17,
            letterSpacing: 2.4,
            color: COLORS.cream,
            opacity: 0.5,
          }}
        >
          {scene.note}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: 64,
          top: 900,
          width: 96,
          height: 4,
          backgroundColor: COLORS.caramel,
        }}
      />

      <Captions sceneId={scene.id} frame={frame} dark />
    </AbsoluteFill>
  );
};
