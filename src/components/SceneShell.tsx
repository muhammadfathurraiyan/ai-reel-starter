import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, EASE, clamp } from "../lib/motion";

/**
 * Wraps a scene so it exits with an upward wipe that reveals the next scene.
 * Scenes are given a few extra frames in Reel.tsx so the wipe can overlap.
 */
export const SceneShell: React.FC<{
  index: number;
  duration: number;
  overlap?: number;
  children: React.ReactNode;
}> = ({ index, duration, overlap = 10, children }) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const out = overlap > 0 ? clamp(frame, [duration - 1, duration + overlap], [0, 1], EASE.inOut) : 0;

  return (
    <AbsoluteFill style={{ zIndex: 40 - index }}>
      <AbsoluteFill
        style={{
          clipPath: out > 0 ? `inset(0% 0% ${out * 100}% 0%)` : undefined,
          translate: `0 ${-out * 34}px`,
        }}
      >
        {children}
      </AbsoluteFill>

      {out > 0 && out < 1 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: height * (1 - out) - 3,
            height: 5,
            backgroundColor: COLORS.caramel,
            boxShadow: "0 0 24px rgba(197,139,84,0.45)",
          }}
        />
      )}
    </AbsoluteFill>
  );
};
