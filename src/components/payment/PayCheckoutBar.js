/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { P } from "./PayTheme";
import { PayText, formatMoney, useTween } from "./PayUI";

/**
 * Bar entrance: a short rise + fade with a subtle settle. The bar travels
 * only a few px (not the whole screen height like SlideInDown, which caused
 * the jump), and the spring is only lightly underdamped, so it overshoots by
 * ~3px and settles once.
 *   critical damping = 2*sqrt(220*1) ≈ 29.7 ; damping 19 -> ratio ≈ 0.64
 * Want more bounce? lower damping (16). Less? raise it (23).
 */
const BAR_SPRING = { damping: 19, stiffness: 220, mass: 1 };
const barEnter = () => {
  "worklet";
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 44 }] },
    animations: {
      opacity: withTiming(1, {
        duration: 260,
        easing: Easing.out(Easing.quad),
      }),
      transform: [
        {
          translateY: withSpring(0, BAR_SPRING),
        },
      ],
    },
  };
};

/**
 * Sticky bottom bar: live total (the number tweens when the plan changes) on
 * the left, the pay button (passed as children) on the right.
 */
const PayCheckoutBar = ({ plan, children, bottomOffset = 0 }) => {
  const insets = useSafeAreaInsets();
  const shown = useTween(plan?.amount ?? 0, { duration: 450 });

  // If the tab-bar offset resolves a moment after mount (0 -> real value),
  // glide to it instead of snapping, so there is no visible jump.
  const bottom = useSharedValue(bottomOffset);
  useEffect(() => {
    bottom.value = withTiming(bottomOffset, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [bottomOffset]);
  const bottomStyle = useAnimatedStyle(() => ({ bottom: bottom.value }));

  return (
    <Animated.View
      entering={barEnter}
      style={[
        styles.bar,
        bottomStyle,
        {
          // sit ABOVE the tab bar (which already covers the safe-area)
          paddingBottom: bottomOffset > 0 ? 12 : Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View style={styles.sum}>
        <PayText fontWeight="semibold" size={11.5} style={{ color: P.sub }}>
          Total
        </PayText>
        <PayText fontWeight="black" size={24} style={{ color: P.ink }}>
          {formatMoney(shown)}
        </PayText>
        <View style={styles.secure}>
          <Ionicons name="lock-closed" size={10} color={P.greenDark} />
          <PayText
            fontWeight="bold"
            size={10.5}
            numberOfLines={1}
            style={{ color: P.greenDark, marginLeft: 3 }}
          >
            {plan ? `${plan.label} · secure` : "Select a plan"}
          </PayText>
        </View>
      </View>
      <View style={styles.action}>{children}</View>
    </Animated.View>
  );
};

export default PayCheckoutBar;

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 5,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: P.line,
    paddingTop: 14,
    paddingHorizontal: 18,
    shadowColor: "#1F1B3D",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 14,
  },
  sum: { flex: 1, paddingRight: 12 },
  secure: { flexDirection: "row", alignItems: "center", marginTop: 1 },
  action: { flex: 1.15 },
});
