import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadInterTight } from "@remotion/google-fonts/InterTight";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";

export const ANTON = loadAnton("normal", {
  weights: ["400"],
  subsets: ["latin"],
}).fontFamily;

export const INTER = loadInterTight("normal", {
  weights: ["500", "600", "700", "800"],
  subsets: ["latin"],
}).fontFamily;

export const MONO = loadMono("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
}).fontFamily;
