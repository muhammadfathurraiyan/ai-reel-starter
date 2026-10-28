import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS } from "../lib/motion";

/** Warm paper backdrop shared by every scene. */
export const Backdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(900px 700px at 86% -8%, rgba(197,139,84,0.30), transparent 62%),
        radial-gradient(700px 700px at -10% 108%, rgba(197,139,84,0.18), transparent 58%),
        linear-gradient(180deg, #F8EEDD 0%, ${COLORS.cream} 52%, #EFE0CB 100%)`,
    }}
  >
    {/* column grid */}
    <AbsoluteFill style={{ opacity: 0.5 }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 64 + i * (952 / 6),
            top: 118,
            bottom: 96,
            width: 1,
            backgroundColor: "rgba(53,37,29,0.055)",
          }}
        />
      ))}
    </AbsoluteFill>

    {/* frame */}
    <div
      style={{
        position: "absolute",
        left: 40,
        top: 40,
        right: 40,
        bottom: 40,
        border: "1px solid rgba(53,37,29,0.10)",
      }}
    />

    {/* vignette */}
    <AbsoluteFill
      style={{
        background: "radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(53,37,29,0.10) 100%)",
      }}
    />
  </AbsoluteFill>
);
