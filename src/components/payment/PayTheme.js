import colors from "../../helpers/colors";

/**
 * Design tokens for the subscription flow — same "exercise book" idea as the
 * JAMB predictor (warm paper, chunky lipped cards) but tinted with Guru's own
 * purple + green so it still feels like the same app.
 */
export const P = {
  // surfaces
  paper: "#FFF9EC",
  card: "#FFFFFF",

  // text
  ink: "#1F1B3D",
  sub: "#5E5A7B",
  faint: "#A09CB8",

  // lines
  line: "#EBE3CE",
  lineDark: "#D9CFB0",
  track: "#EFE7D0",

  // brand purple (from colors.accent*)
  brand: colors.accent,
  brandDark: colors.accentDeep,
  brandDeep: colors.accentDeeper,
  brandMid: colors.accentLight,
  brandLine: colors.accentLighter,
  brandSoft: colors.accentLightest,

  // go-green
  green: colors.green,
  greenDark: colors.greenDark,
  greenSoft: "#DDF6E9",
  greenLine: "#A9E3C6",

  // gold
  gold: "#FFC736",
  goldDark: "#D99F00",
  goldSoft: "#FFF3C4",
  goldLine: "#F2D675",
  goldInk: "#6B5200",

  // coral (warnings)
  coral: colors.heart,
  coralDark: colors.heartDark,
  coralSoft: colors.heartLighter,
  coralLine: "#FFBEB3",

  // sky
  blue: "#3B82F6",
  blueDark: "#2358C4",
  blueSoft: "#E1EDFF",
  blueLine: "#B5D0FA",

  white: "#FFFFFF",
};

/** Cycled accent tints (perk icons etc.). */
export const TINTS = [
  { bg: P.brandSoft, ink: P.brandDark, line: P.brandLine },
  { bg: P.greenSoft, ink: P.greenDark, line: P.greenLine },
  { bg: P.goldSoft, ink: P.goldInk, line: P.goldLine },
  { bg: P.blueSoft, ink: P.blueDark, line: P.blueLine },
];

export const CONFETTI_COLORS = [
  P.gold,
  P.green,
  P.brandMid,
  P.coral,
  P.blue,
  "#FFFFFF",
];

export default P;
