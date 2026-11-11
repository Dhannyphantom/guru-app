import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import AppText from "./JambText";
import { T } from "./JambTheme";

/**
 * YoYo loop: progress goes 0 -> 1, then back 1 -> 0, forever.
 * `withRepeat(..., -1, true)` reverses (yoyo) instead of snapping back.
 *
 * Options:
 *   delay      - ms before the first loop (stagger pieces)
 *   duration   - ms for ONE direction
 *   distance   - vertical travel in px (keep tiny)
 *   rotate     - extra sway in degrees, +/- around `baseRotate`
 *   scale      - extra scale at the peak
 *   baseRotate - resting rotation in degrees
 */
const useYoyo = ({
  delay = 0,
  duration = 2400,
  distance = 3,
  rotate = 0,
  scale = 0,
  baseRotate = 0,
} = {}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(progress);
  }, [delay, duration, progress]);

  return useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [
        { translateY: interpolate(p, [0, 1], [distance, -distance]) },
        {
          rotate: `${
            baseRotate + interpolate(p, [0, 1], [-rotate, rotate])
          }deg`,
        },
        { scale: 1 + interpolate(p, [0, 1], [0, scale]) },
      ],
    };
  });
};

/**
 * "Report card" sticker illustration (swap in real artwork with `source`).
 *
 *   - report card : left / top, tilted, ink outline + thick bottom edge
 *   - star badge  : top-right (score / books variants)
 *   - pencil      : bottom-right (score / result variants)
 *   - book stack  : bottom-right (books variant)
 *
 * variant: "score" | "result" | "books"
 */
const JambIllustration = ({
  variant = "score",
  value = "280+",
  outOf,
  caption = "Score",
  source,
  size = 132,
  style,
}) => {
  const W = size * 1.15;
  const H = size;

  const yoyoCard = useYoyo({
    delay: 0,
    duration: 2600,
    distance: 3,
    rotate: 1.5,
    baseRotate: -5,
  });
  const yoyoPencil = useYoyo({
    delay: 600,
    duration: 2900,
    distance: 3,
    rotate: 2,
    baseRotate: -32,
  });
  const yoyoBooks = useYoyo({ delay: 600, duration: 2900, distance: 3 });
  const yoyoStar = useYoyo({
    delay: 1100,
    duration: 2200,
    distance: 4,
    scale: 0.1,
    rotate: 6,
  });

  if (source) {
    return (
      <Image
        source={source}
        resizeMode="contain"
        style={[{ width: W, height: H }, style]}
      />
    );
  }

  const isBooks = variant === "books";
  const isResult = variant === "result";
  const bookH = Math.max(H * 0.1, 11);

  return (
    <View style={[{ width: W, height: H }, style]}>
      {/* soft sun behind everything */}
      <View
        style={[
          styles.sun,
          {
            width: H * 0.82,
            height: H * 0.82,
            borderRadius: H,
            left: W * 0.1,
            top: H * 0.1,
          },
        ]}
      />

      {/* Report card */}
      <Animated.View
        style={[
          styles.card,
          { width: W * 0.66, left: W * 0.02, top: H * 0.1 },
          yoyoCard,
        ]}
      >
        <View style={styles.cardHead}>
          <View style={styles.cardDot} />
          <AppText
            fontWeight="black"
            size={10}
            style={{ color: T.ink, letterSpacing: 0.8 }}
          >
            JAMB
          </AppText>
        </View>
        <View style={styles.redRule} />

        {isBooks ? (
          <View style={{ marginTop: 7 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.checkRow}>
                <View style={styles.checkBox}>
                  <Ionicons name="checkmark" size={9} color="#fff" />
                </View>
                <View style={styles.checkLine} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.scoreBox}>
            <AppText
              fontWeight="bold"
              size={9}
              style={{
                color: T.sub,
                letterSpacing: 0.8,
                textTransform: "uppercase",
              }}
            >
              {caption}
            </AppText>
            <View style={styles.valueRow}>
              <View style={styles.marker} />
              <AppText
                fontWeight="black"
                size={22}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                style={{ color: T.ink, flexShrink: 1 }}
              >
                {value}
              </AppText>
              {Boolean(outOf) && (
                <AppText
                  fontWeight="bold"
                  size={10.5}
                  numberOfLines={1}
                  style={{ color: T.sub, marginLeft: 1 }}
                >
                  /{outOf}
                </AppText>
              )}
            </View>
          </View>
        )}

        {isResult && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={15} color="#fff" />
          </View>
        )}
      </Animated.View>

      {/* Star badge */}
      {!isBooks && !isResult && (
        <Animated.View style={[styles.star, yoyoStar]}>
          <Ionicons name="star" size={17} color={T.ink} />
        </Animated.View>
      )}

      {/* Pencil */}
      {!isBooks && (
        <Animated.View style={[styles.pencil, yoyoPencil]}>
          <View style={styles.eraser} />
          <View style={styles.ferrule} />
          <View style={styles.pencilBody} />
          <View style={styles.wood} />
          <View style={styles.lead} />
        </Animated.View>
      )}

      {/* Books + cap */}
      {isBooks && (
        <Animated.View style={[styles.books, yoyoBooks]}>
          <Ionicons
            name="school"
            size={H * 0.24}
            color={T.ink}
            style={{
              marginBottom: -3,
              marginRight: W * 0.03,
              alignSelf: "center",
            }}
          />
          <View
            style={[
              styles.book,
              { backgroundColor: T.green, width: W * 0.38, height: bookH },
            ]}
          />
          <View
            style={[
              styles.book,
              {
                backgroundColor: T.yellow,
                width: W * 0.42,
                height: bookH,
                marginLeft: 5,
              },
            ]}
          />
          <View
            style={[
              styles.book,
              { backgroundColor: T.blue, width: W * 0.38, height: bookH },
            ]}
          />
        </Animated.View>
      )}
    </View>
  );
};

export default JambIllustration;

const styles = StyleSheet.create({
  sun: {
    position: "absolute",
    backgroundColor: "#FFC736",
    opacity: 0.22,
  },
  // NOTE: no static `transform` here - the card's tilt lives in useYoyo
  // (baseRotate), because an animated transform would override a static one.
  card: {
    position: "absolute",
    zIndex: 2,
    backgroundColor: "#FFFDF5",
    borderRadius: 10,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.ink,
    padding: 8,
  },
  cardHead: { flexDirection: "row", alignItems: "center" },
  cardDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: T.coral,
    marginRight: 5,
  },
  redRule: {
    height: 2,
    backgroundColor: T.coral,
    opacity: 0.6,
    marginTop: 5,
    borderRadius: 1,
  },
  scoreBox: { marginTop: 6, alignItems: "center" },
  valueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  marker: {
    position: "absolute",
    left: 2,
    right: 2,
    bottom: 2,
    height: 9,
    borderRadius: 3,
    backgroundColor: T.yellow,
    opacity: 0.75,
  },
  checkRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  checkBox: {
    width: 12,
    height: 12,
    borderRadius: 4,
    backgroundColor: T.green,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLine: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: T.line,
    marginLeft: 5,
  },
  checkBadge: {
    position: "absolute",
    left: -9,
    bottom: -11,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.green,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: T.ink,
  },
  star: {
    position: "absolute",
    zIndex: 4,
    top: 0,
    right: 34,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.yellow,
    borderWidth: 2,
    borderColor: T.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  pencil: {
    position: "absolute",
    zIndex: 3,
    right: -4,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  eraser: {
    width: 9,
    height: 12,
    backgroundColor: "#FF8FA3",
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderWidth: 1.5,
    borderColor: T.ink,
  },
  ferrule: {
    width: 6,
    height: 12,
    backgroundColor: "#C7CEDB",
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: T.ink,
  },
  pencilBody: {
    width: 38,
    height: 12,
    backgroundColor: T.yellow,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: T.ink,
  },
  wood: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 10,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#F3D3A2",
  },
  lead: {
    width: 4,
    height: 4,
    marginLeft: -4,
    borderRadius: 2,
    backgroundColor: T.ink,
  },
  books: { position: "absolute", zIndex: 3, right: 0, bottom: 0 },
  book: { borderRadius: 4, marginTop: 3, borderWidth: 2, borderColor: T.ink },
});
