import React, { useEffect, useMemo, useCallback } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome, Feather, Ionicons } from "@expo/vector-icons";

import colors, { successGradient, errorGradient } from "../helpers/colors";
import AppText from "./AppText";

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);
const { width, height } = Dimensions.get("screen");
const POP_HEIGHT = height * 0.18;

const PopMessage = ({ popData = { vis: false }, setPopData }) => {
  const { vis, msg, type, timer, point, cb } = popData;

  const translateY = useSharedValue(-POP_HEIGHT);

  // ------------------------------------------
  // COLOR PRESETS
  // ------------------------------------------
  const { textColor, overlay, boxBg, boxTxt, bgImg } = useMemo(() => {
    switch (type) {
      case "success":
        return {
          textColor: colors.greenLighter,
          overlay: colors.extraLight,
          boxBg: colors.white,
          boxTxt: colors.greenDark,
          bgImg: successGradient,
        };
      case "failed":
        return {
          textColor: colors.heartLighter,
          overlay: colors.heartLightly,
          boxBg: colors.heartLighter,
          boxTxt: colors.heartDeep,
          bgImg: errorGradient,
        };
      default:
        return {
          textColor: colors.white,
          overlay: colors.extraLight,
          boxBg: colors.white,
          boxTxt: colors.dark,
          bgImg: successGradient,
        };
    }
  }, [type]);

  // ------------------------------------------
  // SAFE JS CALLBACKS (VERY IMPORTANT)
  // ------------------------------------------
  const handleCallback = useCallback(() => {
    if (typeof cb === "function") {
      cb();
    }
  }, [cb]);

  const hidePop = useCallback(() => {
    setPopData({ vis: false });
  }, [setPopData]);

  // ------------------------------------------
  // ANIMATION STYLE
  // ------------------------------------------
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: interpolate(translateY.value, [-POP_HEIGHT, 0], [0, 1]),
  }));

  // ------------------------------------------
  // ANIMATION LOGIC
  // ------------------------------------------
  useEffect(() => {
    if (!vis) return;

    translateY.value = withSequence(
      withSpring(0, { damping: 60 }),
      withDelay(
        timer ?? 400,
        withTiming(-POP_HEIGHT, { duration: 700, easing: Easing.quad }, () => {
          runOnJS(handleCallback)();
          runOnJS(hidePop)();
        })
      )
    );
  }, [vis, timer, handleCallback, hidePop]);

  // ------------------------------------------
  // RANDOM ICON POSITIONS (STATIC)
  // ------------------------------------------
  const icons = useMemo(
    () =>
      [
        {
          Icon: FontAwesome,
          name: "plus",
          size: 25,
          style: { top: "40%", right: "30%" },
        },
        {
          Icon: FontAwesome,
          name: "plus",
          size: 25,
          style: { top: 40, left: 30 },
        },
        {
          Icon: FontAwesome,
          name: "plus",
          size: 25,
          style: { top: "15%", right: "20%" },
        },
        {
          Icon: FontAwesome,
          name: "plus",
          size: 25,
          style: { left: 20, bottom: 5 },
        },
        {
          Icon: FontAwesome,
          name: "minus",
          size: 25,
          style: { right: 20, bottom: 5 },
        },
        {
          Icon: FontAwesome,
          name: "minus",
          size: 25,
          style: { top: 5, left: "24%" },
        },
        {
          Icon: FontAwesome,
          name: "circle",
          size: 25,
          style: { top: 40, right: 30 },
        },
        {
          Icon: FontAwesome,
          name: "circle-o",
          size: 25,
          style: { bottom: 40, left: 30 },
        },
        {
          Icon: FontAwesome,
          name: "circle-o",
          size: 25,
          style: { top: "40%", left: "30%" },
        },
        {
          Icon: Feather,
          name: "triangle",
          size: 25,
          style: { top: "20%", left: width / 2 },
        },
        {
          Icon: Ionicons,
          name: "triangle",
          size: 25,
          style: { top: 40, left: width / 2 - 30 },
        },
      ].map((i) => ({
        ...i,
        rotate: `${Math.random() * 180}deg`,
      })),
    []
  );

  // ------------------------------------------
  // RENDER
  // ------------------------------------------
  return (
    <AnimatedGradient colors={bgImg} style={[styles.container, animatedStyle]}>
      <AppText
        style={{ ...styles.text, color: colors.light }}
        fontWeight="bold"
        size="xlarge"
      >
        {msg}
      </AppText>

      {point && (
        <View style={[styles.pointOverlay, { backgroundColor: overlay }]}>
          <View style={[styles.point, { backgroundColor: boxBg }]}>
            <AppText fontWeight="heavy" size="large" style={{ color: boxTxt }}>
              {point}
            </AppText>
          </View>
        </View>
      )}

      <View style={styles.overlay}>
        {icons.map((item, index) => {
          const { Icon, name, style, size, rotate } = item;
          return (
            <View
              key={index}
              style={[styles.overlayIcons, style, { transform: [{ rotate }] }]}
            >
              <Icon name={name} size={size} color={textColor} />
            </View>
          );
        })}
      </View>
    </AnimatedGradient>
  );
};

export default PopMessage;

// ------------------------------------------
// STYLES
// ------------------------------------------
const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    width,
    height: POP_HEIGHT,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 12,
  },
  text: {
    width: "75%",
    textAlign: "center",
  },
  overlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  overlayIcons: {
    position: "absolute",
    opacity: 0.3,
  },
  pointOverlay: {
    borderRadius: 100,
    paddingBottom: 4,
    elevation: 8,
    marginTop: 8,
  },
  point: {
    paddingHorizontal: 25,
    paddingVertical: 8,
    borderRadius: 100,
  },
});
