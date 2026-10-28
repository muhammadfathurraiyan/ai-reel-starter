/** The shape of an entry in src/data/scenes.json. */
export type SceneData = {
  id: string;
  label: string;
  title: string;
  /** Word in `title` to paint caramel instead of espresso. */
  accent?: string;
  /** Small mono line under the headline. */
  note?: string;
  /** Spoken by ElevenLabs and used as the caption text. */
  narration: string;
  /** Start frame. Contiguous: must equal the previous scene's start + duration. */
  from: number;
  /** Length in frames. */
  duration: number;
};

/** Props every scene receives from Reel.tsx. */
export type SceneProps = {
  scene: SceneData;
  /** 1-based position in the reel; used for the on-screen kicker. */
  index: number;
};
