/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { CONFETTI_COLORS } from "./PayTheme";

const rand = (min, max) => min + Math.random() * (max - min);

const makePieces = (count) =>
  Array.from({ length: count }, (_, id) => {
    // mostly upward cone, so it "pops" out of the badge
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15;
    const dist = rand(110, 260);
    const round = Math.random() > 0.65;
    return {
      id,
      color: CONFETTI_COLORS[id % CONFETTI_COLORS.length],
      w: round ? rand(7, 10) : rand(6, 9),
      h: round ? 0 : rand(11, 16), // 0 => circle (h = w)
      round,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      fall: rand(160, 300),
      sway: rand(-14, 14),
      spin: rand(-540, 540),
      delay: rand(0, 220),
      duration: rand(1800, 2700),
    };
  });

const Piece = ({ cfg }) => {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      cfg.delay,
      withTiming(1, { duration: cfg.duration, easing: Easing.linear }),
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const k = t.value;
    // fast burst out, then gravity takes over
    const out = 1 - Math.pow(1 - Math.min(k * 1.7, 1), 3);
    return {
      opacity: k === 0 ? 0 : k < 0.72 ? 1 : Math.max((1 - k) / 0.28, 0),
      transform: [
        { translateX: cfg.dx * out + cfg.sway * Math.sin(k * 9) },
        { translateY: cfg.dy * out + cfg.fall * k * k },
        { rotate: `${cfg.spin * k}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: cfg.w,
          height: cfg.round ? cfg.w : cfg.h,
          borderRadius: cfg.round ? cfg.w / 2 : 2,
          backgroundColor: cfg.color,
        },
        style,
      ]}
    />
  );
};

/**
 * Confetti burst. Pieces fly out from the CENTRE of the parent view, so drop
 * it inside whatever you want to burst from. Re-mount (change `key`) to replay.
 */
const PayConfetti = ({ count = 40 }) => {
  const pieces = useMemo(() => makePieces(count), [count]);
  return (
    <View pointerEvents="none" style={styles.origin}>
      {pieces.map((p) => (
        <Piece key={p.id} cfg={p} />
      ))}
    </View>
  );
};

export default PayConfetti;

const styles = StyleSheet.create({
  origin: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 0,
    height: 0,
  },
  piece: { position: "absolute", top: 0, left: 0 },
});
