import { StyleSheet } from "react-native";

import AppText from "../AppText";
import { FONT_SCALE } from "../../helpers/jambConfig";

/**
 * AppText wrapper for the predictor. Every numeric `size` (and lineHeight) is
 * multiplied by FONT_SCALE so the whole feature can be tuned from ONE number
 * in jambConfig.js.
 */
const JambText = ({ size = 13, style, ...rest }) => {
  const flat = StyleSheet.flatten(style) || {};
  const scaled =
    typeof size === "number"
      ? Math.max(Math.round(size * FONT_SCALE * 10) / 10, 9)
      : size;

  // AppText spreads `style` into an object, so it must receive a plain object.
  const next = { ...flat };
  if (flat.lineHeight) next.lineHeight = Math.round(flat.lineHeight * FONT_SCALE);

  return <AppText size={scaled} style={next} {...rest} />;
};

export default JambText;
