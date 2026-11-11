/**
 * Design tokens for the JAMB predictor — "school exercise book" look.
 *
 * Idea: warm paper background, navy ink text, chalkboard hero, pencil-yellow
 * accents, and chunky "lip" cards/buttons (a thicker bottom edge) instead of
 * soft blurry shadows and gradients.
 *
 * Everything visual in the predictor reads from here, so the whole feature
 * can be re-skinned from this one file.
 */
export const T = {
  // surfaces
  paper: "#FFF8E7", // screen background (exercise-book paper)
  card: "#FFFFFF",
  board: "#17463A", // chalkboard (hero)
  boardDark: "#0F2F27", // chalkboard lip
  chalk: "#FFF8E7",
  chalkSoft: "#BFD9CE",

  // text
  ink: "#1E2A4A",
  sub: "#5A6685",
  faint: "#9AA3B8",

  // lines
  line: "#E8DFC6",
  lineDark: "#D6CAA6",

  // brand green
  green: "#22A559",
  greenDark: "#167A40",
  greenSoft: "#DFF5E6",
  greenLine: "#A8DDB9",

  // pencil yellow
  yellow: "#FFC736",
  yellowDark: "#D99F00",
  yellowSoft: "#FFF3C4",
  yellowLine: "#F2D675",
  yellowInk: "#6B5200",

  // sky blue
  blue: "#3B82F6",
  blueDark: "#2358C4",
  blueSoft: "#E1EDFF",
  blueLine: "#B5D0FA",

  // marker red
  coral: "#FF6B57",
  coralDark: "#C9442F",
  coralSoft: "#FFE5E0",
  coralLine: "#FFBEB3",

  // highlighter purple
  purple: "#8B5CF6",
  purpleDark: "#5F36C4",
  purpleSoft: "#EDE5FF",
  purpleLine: "#CDBBFB",

  // neutrals for locked / disabled states
  lockedBg: "#F1EEE4",
  lockedLine: "#DDD6C0",
  track: "#EFE7D0",
};

/** Per-subject accent colours (cycled by index). */
export const TINTS = [
  { bg: T.blueSoft, border: T.blueLine, bar: T.blue, ink: T.blueDark },
  { bg: T.yellowSoft, border: T.yellowLine, bar: "#F5B700", ink: T.yellowInk },
  { bg: T.coralSoft, border: T.coralLine, bar: T.coral, ink: T.coralDark },
  { bg: T.purpleSoft, border: T.purpleLine, bar: T.purple, ink: T.purpleDark },
];

export default T;
