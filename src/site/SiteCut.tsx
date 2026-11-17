import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { cameraAt } from "./camera";

/** Pixel size of the source recording (Retina 2x of a 1512 x 982 screen). */
export const SOURCE_W = 3024;
export const SOURCE_H = 1964;

/**
 * Silent portfolio-site cut. The recording plays 1:1 while a virtual camera
 * eases toward the region under the cursor — hovers, clicks and the site's
 * own animation peaks. Output ratio matches the source.
 *
 * z = 1.0 shows the ENTIRE recording (fitted to the composition); larger z
 * crops in. The transform is clamped so the view never pans past the edges.
 */
export const SiteCut: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { z, x, y } = cameraAt(frame);

  // The video is drawn fitted (width x height), i.e. source px * 0.5, so a
  // source point p lands on screen at tx + 0.5 * z * p. Centre the focus
  // point, then clamp so no out-of-bounds black can enter the frame.
  const tx = Math.min(0, Math.max(width * (1 - z), width / 2 - (z / 2) * x));
  const ty = Math.min(0, Math.max(height * (1 - z), height / 2 - (z / 2) * y));

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${z})`,
          transformOrigin: "0 0",
        }}
      >
        <OffthreadVideo
          src={staticFile("video/site-source.mp4")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          muted
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
