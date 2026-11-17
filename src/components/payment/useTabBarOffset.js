/* global require */
/* eslint-disable react-hooks/rules-of-hooks */
import { useContext } from "react";

import { TAB_BAR_OFFSET } from "../../helpers/payConfig";

// Optional: only resolves when the app uses @react-navigation/bottom-tabs
let TabHeightContext = null;
try {
  TabHeightContext =
    require("@react-navigation/bottom-tabs").BottomTabBarHeightContext ?? null;
} catch (e) {
  TabHeightContext = null;
}

/**
 * How many pixels at the bottom of the screen are covered by the tab bar.
 *  1. TAB_BAR_OFFSET in payConfig.js, if you set a number (manual override)
 *  2. otherwise the real tab-bar height, if this screen sits under a tab navigator
 *  3. otherwise 0 (no tab bar → we use the device safe-area instead)
 */
export default function useTabBarOffset() {
  const ctxHeight = TabHeightContext ? useContext(TabHeightContext) : undefined;
  if (typeof TAB_BAR_OFFSET === "number") return TAB_BAR_OFFSET;
  return ctxHeight || 0;
}
