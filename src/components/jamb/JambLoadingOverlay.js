import { StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import AppText from "./JambText";
import LottieAnimator from "../LottieAnimator";
import { T } from "./JambTheme";

/**
 * Full-area loading state, centered in the middle of the screen.
 * Use it instead of any bottom-anchored "Saving…" loader:
 *
 *   {saving && <JambLoadingOverlay label="Saving your subjects…" />}
 *
 * Render it inside the screen's root View (the one with flex: 1) so it covers
 * the content and blocks taps while the request is running.
 */
const JambLoadingOverlay = ({ label = "Saving your subjects…", sub }) => (
  <Animated.View
    entering={FadeIn.duration(200)}
    exiting={FadeOut.duration(150)}
    style={styles.overlay}
  >
    <LottieAnimator size={110} />
    <AppText fontWeight="black" size={18} style={styles.label}>
      {label}
    </AppText>
    {Boolean(sub) && (
      <AppText fontWeight="medium" size={13} style={styles.sub}>
        {sub}
      </AppText>
    )}
  </Animated.View>
);

export default JambLoadingOverlay;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(255,248,231,0.96)",
  },
  label: { color: T.ink, marginTop: 14, textAlign: "center" },
  sub: { color: T.sub, marginTop: 6, textAlign: "center" },
});
