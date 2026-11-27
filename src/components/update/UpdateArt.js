import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
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

import AppText from "../jamb/JambText";
import { T } from "../jamb/JambTheme";

/**
 * Yoyo loop (0 -> 1 -> 0 forever). Same idea as the one in JambIllustration,
 * kept local so the Jamb files stay untouched.
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
          rotate: `${baseRotate + interpolate(p, [0, 1], [-rotate, rotate])}deg`,
        },
        { scale: 1 + interpolate(p, [0, 1], [0, scale]) },
      ],
    };
  });
};

/**
 * "New version" sticker illustration, drawn like the JAMB report card:
 *   - a tilted card showing the new version number (marker-highlighted)
 *   - a green rocket sticker blasting off the top-right corner
 *   - twinkling stars + a little "NEW" tag
 */
const UpdateArt = ({ version, size = 132, style }) => {
  const W = size * 1.15;
  const H = size;

  const card = useYoyo({
    delay: 0,
    duration: 2600,
    distance: 3,
    rotate: 1.5,
    baseRotate: -5,
  });
  const rocket = useYoyo({
    delay: 300,
    duration: 1900,
    distance: 5,
    rotate: 3,
    scale: 0.05,
  });
  const starA = useYoyo({
    delay: 700,
    duration: 1500,
    distance: 4,
    scale: 0.25,
    rotate: 10,
  });
  const starB = useYoyo({
    delay: 1200,
    duration: 1800,
    distance: 3,
    scale: 0.3,
    rotate: -12,
  });
  const tag = useYoyo({
    delay: 500,
    duration: 2200,
    distance: 2,
    rotate: 3,
    baseRotate: 8,
  });

  const rocketBox = H * 0.42;

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

      {/* Version card */}
      <Animated.View
        style={[
          styles.card,
          { width: W * 0.64, left: W * 0.02, top: H * 0.26 },
          card,
        ]}
      >
        <View style={styles.cardHead}>
          <View style={styles.cardDot} />
          <AppText
            fontWeight="black"
            size={10}
            style={{ color: T.ink, letterSpacing: 0.8 }}
          >
            GURU
          </AppText>
        </View>
        <View style={styles.redRule} />

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
            Latest version
          </AppText>
          <View style={styles.valueRow}>
            <View style={styles.marker} />
            <AppText
              fontWeight="black"
              size={version ? 21 : 24}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={{ color: T.ink, flexShrink: 1 }}
            >
              {version ? `v${version}` : "NEW!"}
            </AppText>
          </View>
        </View>
      </Animated.View>

      {/* Rocket sticker */}
      <Animated.View
        style={[
          styles.rocket,
          {
            width: rocketBox,
            height: rocketBox,
            borderRadius: rocketBox / 2,
            right: W * 0.01,
            top: 0,
          },
          rocket,
        ]}
      >
        <Ionicons name="rocket" size={rocketBox * 0.56} color="#fff" />
      </Animated.View>

      {/* Stars */}
      <Animated.View style={[styles.starA, { left: W * 0.06, top: H * 0.06 }, starA]}>
        <Ionicons name="star" size={16} color={T.yellow} />
      </Animated.View>
      <Animated.View style={[styles.starB, { right: W * 0.02, bottom: H * 0.1 }, starB]}>
        <Ionicons name="sparkles" size={18} color={T.yellow} />
      </Animated.View>

      {/* NEW tag */}
      <Animated.View style={[styles.tag, { left: W * 0.04, bottom: H * 0.04 }, tag]}>
        <AppText
          fontWeight="black"
          size={10}
          style={{ color: "#fff", letterSpacing: 1 }}
        >
          NEW
        </AppText>
      </Animated.View>
    </View>
  );
};

export default UpdateArt;

const styles = StyleSheet.create({
  sun: {
    position: "absolute",
    backgroundColor: T.yellow,
    opacity: 0.22,
  },
  // NOTE: the tilt lives in useYoyo (baseRotate) because an animated
  // transform overrides a static one.
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
  rocket: {
    position: "absolute",
    zIndex: 4,
    backgroundColor: T.green,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  starA: { position: "absolute", zIndex: 3 },
  starB: { position: "absolute", zIndex: 3 },
  tag: {
    position: "absolute",
    zIndex: 5,
    backgroundColor: T.coral,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: T.ink,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
});
