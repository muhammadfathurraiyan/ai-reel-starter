import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import voiceData from "../data/voiceover.json";
import { COLORS, clamp, pop } from "../lib/motion";
import { INTER } from "../lib/fonts";

type Word = { w: string; start: number; end: number };
type SceneVoice = {
  file: string;
  duration: number;
  startOffset: number;
  tempo: number;
  words: Word[];
};

export const VOICEOVER = voiceData.scenes as unknown as Record<string, SceneVoice>;

/** Word-level captions driven by the generated narration timings. */
export const Captions: React.FC<{
  sceneId: string;
  frame: number;
  dark?: boolean;
  top?: number;
}> = ({ sceneId, frame, dark = false, top = 1484 }) => {
  const { fps } = useVideoConfig();
  const voice = VOICEOVER[sceneId];
  if (!voice) return null;

  const t = frame / fps;
  let current = -1;
  for (let i = 0; i < voice.words.length; i++) {
    if (voice.words[i].start <= t + 0.01) current = i;
  }

  const enter = pop(frame, fps, 3, { damping: 200, stiffness: 90, mass: 1 });
  const fadeOut = clamp(frame, [voice.duration * fps + 6, voice.duration * fps + 20], [1, 0.35]);
  const ink = dark ? COLORS.cream : COLORS.espresso;
  const past = dark ? "rgba(244,232,213,0.66)" : "rgba(53,37,29,0.58)";
  const future = dark ? "rgba(244,232,213,0.26)" : "rgba(53,37,29,0.24)";

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 84,
          top,
          display: "flex",
          gap: 18,
          opacity: enter * fadeOut,
          translate: `0 ${(1 - enter) * 18}px`,
        }}
      >
        <div
          style={{
            width: 3,
            flexShrink: 0,
            marginTop: 8,
            height: 58,
            backgroundColor: COLORS.caramel,
            opacity: 0.9,
          }}
        />
        <div
          style={{
            fontFamily: INTER,
            fontWeight: 600,
            fontSize: 37,
            lineHeight: 1.34,
            letterSpacing: "-0.006em",
            color: ink,
            maxWidth: 890,
          }}
        >
          {voice.words.map((word, i) => {
            const isCurrent = i === current;
            const isPast = i < current;
            return (
              <span
                key={`${word.w}-${i}`}
                style={{
                  display: "inline-block",
                  padding: "1px 7px",
                  margin: "0 1px 4px 0",
                  borderRadius: 9,
                  backgroundColor: isCurrent ? COLORS.caramel : "transparent",
                  color: isCurrent ? COLORS.creamLight : isPast ? past : future,
                  scale: isCurrent ? "1.015" : "1",
                }}
              >
                {word.w}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
