/**
 * Design tokens for the quiz flow — "arcade sticker book".
 * Same family as the JAMB exercise-book look (paper, ink, chunky lips) but
 * every step of the journey gets its own accent colour so the flow feels
 * like levelling up instead of filling in forms.
 */
export const Q = {
  paper: "#FFF9EC",
  card: "#FFFFFF",
  ink: "#1B2447",
  sub: "#5C6688",
  faint: "#A0A8C0",
  line: "#E9E0C8",
  lineDark: "#D8CCA8",
  track: "#EFE7D0",
};

export const TONES = {
  green: { face: "#22A559", lip: "#167A40", soft: "#DFF5E6", line: "#A8DDB9", ink: "#0F5C2E", text: "#FFFFFF" },
  purple: { face: "#8B5CF6", lip: "#5F36C4", soft: "#EDE5FF", line: "#CDBBFB", ink: "#46229F", text: "#FFFFFF" },
  blue: { face: "#3B82F6", lip: "#2358C4", soft: "#E1EDFF", line: "#B5D0FA", ink: "#173F94", text: "#FFFFFF" },
  coral: { face: "#FF6B57", lip: "#C9442F", soft: "#FFE5E0", line: "#FFBEB3", ink: "#8E2A1A", text: "#FFFFFF" },
  yellow: { face: "#FFC736", lip: "#D99F00", soft: "#FFF3C4", line: "#F2D675", ink: "#6B5200", text: "#1B2447" },
  ink: { face: "#1B2447", lip: "#0C1230", soft: "#E6E9F4", line: "#C3C9DE", ink: "#1B2447", text: "#FFFFFF" },
};

/** Cycled for tiles / subject blocks so grids feel colourful. */
export const TONE_CYCLE = ["blue", "yellow", "coral", "purple", "green"];

/** The 4-step journey. Index = position in the header pips. */
export const STEPS = [
  { key: "mode", tone: "purple", icon: "game-controller", title: "Pick your mode", sub: "Go solo or take on your squad" },
  { key: "category", tone: "blue", icon: "compass", title: "Choose your arena", sub: "Which exam category are you tackling?" },
  { key: "subjects", tone: "coral", icon: "library", title: "Pick your subjects", sub: "Choose up to 2 subjects to practise" },
  { key: "study", tone: "green", icon: "rocket", title: "Warm-up time", sub: "Revise your topics, then blast off" },
];

export const STEP_BY_VIEW = { mode: 0, category: 1, subjects: 2, study: 3 };

export default Q;
