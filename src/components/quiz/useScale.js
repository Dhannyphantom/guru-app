import { useWindowDimensions } from "react-native";

// Design baseline: a 390dp-wide phone.
const BASE = 390;

/**
 * Responsive sizing for the quiz screens.
 *   s        scale factor (0.82 – 1.25), from the SHORT side so landscape doesn't blow up
 *   ms(n)    scale a size (font, icon, padding)
 *   compact  short screens / landscape phones: tighter paddings
 *   maxContent  content column width cap, so tablets / web stay readable
 */
export const useScale = () => {
  const { width, height } = useWindowDimensions();
  const short = Math.min(width, height);
  const compact = height < 700;
  let s = Math.min(Math.max(short / BASE, 0.82), 1.25);
  if (compact) s *= 0.94;
  const ms = (n) => Math.round(n * s * 10) / 10;
  return { s, ms, compact, width, height, maxContent: Math.min(width, 640) };
};
