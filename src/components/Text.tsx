import React from "react";
import { COLORS, clamp, pop } from "../lib/motion";

/** Small monospaced scene label: `01 — THE START`. */
export const Kicker: React.FC<{
  index: number;
  label: string;
  frame: number;
  fps: number;
  delay?: number;
  dark?: boolean;
  style?: React.CSSProperties;
}> = ({ index, label, frame, fps, delay = 0, dark = false, style }) => {
  const enter = pop(frame, fps, delay, { damping: 200, stiffness: 90, mass: 1 });
  const rule = clamp(frame, [delay + 2, delay + 16], [0, 1]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: enter, ...style }}>
      <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: 1.5, color: COLORS.caramel }}>
        {String(index).padStart(2, "0")}
      </span>
      <div
        style={{
          height: 1.5,
          width: 34 * rule,
          backgroundColor: dark ? "rgba(244,232,213,0.45)" : "rgba(53,37,29,0.4)",
        }}
      />
      <span
        style={{
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: 3.2,
          color: dark ? COLORS.cream : COLORS.espresso,
          opacity: 0.72,
        }}
      >
        {label}
      </span>
    </div>
  );
};

/** Headline with a masked upward reveal. */
export const MaskedLine: React.FC<{
  frame: number;
  fps: number;
  delay?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ frame, fps, delay = 0, style, children }) => {
  const p = pop(frame, fps, delay, { damping: 26, stiffness: 118, mass: 1.05 });

  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.08em", marginBottom: "-0.08em", ...style }}>
      <div style={{ translate: `0 ${(1 - p) * 100}%`, opacity: clamp(p, [0, 0.35], [0, 1]) }}>
        {children}
      </div>
    </div>
  );
};

/** Paint one word of a headline caramel. */
export const withAccent = (title: string, accent: string | undefined, base: string) =>
  title.split(" ").map((word, i, words) => {
    const clean = word.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const hit = accent ? clean === accent.toLowerCase() : false;
    return (
      <span key={`${word}-${i}`} style={{ color: hit ? COLORS.caramel : base }}>
        {word}
        {i < words.length - 1 ? " " : ""}
      </span>
    );
  });
