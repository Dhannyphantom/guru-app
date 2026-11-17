import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import LottieAnimator from "../LottieAnimator";
import { P } from "./PayTheme";
import { PayText } from "./PayUI";

/** Full-screen "confirming your payment…" overlay while we verify with the server. */
const PayVerifying = () => (
  <Animated.View
    entering={FadeIn.duration(180)}
    exiting={FadeOut.duration(160)}
    style={styles.overlay}
  >
    <View style={styles.card}>
      <LottieAnimator size={84} />
      <PayText fontWeight="black" size={17} style={{ color: P.ink, marginTop: 2 }}>
        Confirming your payment…
      </PayText>
      <PayText
        fontWeight="medium"
        size={12}
        style={{ color: P.sub, marginTop: 4, textAlign: "center" }}
      >
        This only takes a moment. Please don't close the app.
      </PayText>
    </View>
  </Animated.View>
);

export default PayVerifying;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
    backgroundColor: "rgba(255,249,236,0.94)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    alignItems: "center",
    backgroundColor: P.card,
    borderRadius: 24,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: P.line,
    paddingVertical: 22,
    paddingHorizontal: 18,
  },
});
