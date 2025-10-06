import { Dimensions, ImageBackground, StyleSheet, View } from "react-native";
import React, { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome, Feather, Ionicons } from "@expo/vector-icons";

import colors, { errorGradient, successGradient } from "../helpers/colors";
import AppText from "./AppText";
import Animated, {
  Easing,
  runOnJS,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AnimatedImageBackground =
  Animated.createAnimatedComponent(LinearGradient);

const { width, height } = Dimensions.get("screen");

const POP_HEIGHT = height * 0.18;

const PopMessage = ({ popData = { vis: true }, setPopData }) => {
  const { vis, msg, type, timer, point, cb } = popData;
  if (!vis) return null;

  const translateY = useSharedValue(-POP_HEIGHT);

  let textColor, overlay, boxBg, boxTxt, bgImg;
  switch (type) {
    case "success":
      textColor = colors.greenLighter;
      overlay = colors.extraLight;
      boxBg = colors.white;
      boxTxt = colors.greenDark;
      bgImg = successGradient;
      break;

    case "failed":
      textColor = colors.heartLighter;
      overlay = colors.heartLightly;
      boxBg = colors.heartLighter;
      boxTxt = colors.heartDeep;
      bgImg = errorGradient;
      break;

    default:
      textColor = colors.white;
      break;
  }

  useEffect(() => {
    if (vis) {
      translateY.value = withSequence(
        withSpring(0, { duration: 600, dampingRatio: 1.5 }),
        withDelay(
          timer ?? 400,
          withTiming(
            -POP_HEIGHT,
            { duration: 700, easing: Easing.quad },
            () => {
              translateY.value = -POP_HEIGHT;
              cb && runOnJS(cb)();
              runOnJS(setPopData)({ vis: false });
            }
          )
        )
      );
    }
  }, [vis, timer]);

  return (
    <AnimatedImageBackground
      colors={bgImg}
      style={[
        styles.container,
        {
          // backgroundColor: bgColor,
          transform: [{ translateY }],
        },
      ]}
    >
      <AppText
        // style={{ ...styles.text, color: "#fff" }}
        style={{ ...styles.text, color: colors.light }}
        fontWeight="bold"
        size={"xlarge"}
      >
        {msg}
      </AppText>
      {point && (
        <View style={[styles.pointOverlay, { backgroundColor: overlay }]}>
          <View style={[styles.point, { backgroundColor: boxBg }]}>
            <AppText
              fontWeight="heavy"
              size={"large"}
              style={{ ...styles.pointTxt, color: boxTxt }}
            >
              {point}
            </AppText>
          </View>
        </View>
      )}
      <View style={styles.overlay}>
        <View
          style={{
            ...styles.overlayIcons,
            transform: [{ rotate: `${Math.random() * 180}deg` }],
            top: "40%",
            right: "30%",
          }}
        >
          <FontAwesome name="plus" color={textColor} size={25} />
        </View>
        <View
          style={{
            ...styles.overlayIcons,
            transform: [{ rotate: `${Math.random() * 180}deg` }],
            top: 40,
            left: 30,
          }}
        >
          <FontAwesome name="plus" color={textColor} size={25} />
        </View>
        <View
          style={{
            ...styles.overlayIcons,
            transform: [{ rotate: `${Math.random() * 180}deg` }],
            top: "15%",
            right: "20%",
          }}
        >
          <FontAwesome name="plus" color={textColor} size={25} />
        </View>
        <View
          style={{
            ...styles.overlayIcons,
            transform: [{ rotate: `${Math.random() * 180}deg` }],
            left: 20,
            bottom: 5,
          }}
        >
          <FontAwesome name="plus" color={textColor} size={25} />
        </View>
        <View
          style={{
            ...styles.overlayIcons,
            transform: [{ rotate: `${Math.random() * 180}deg` }],
            right: 20,
            bottom: 5,
          }}
        >
          <FontAwesome name="minus" color={textColor} size={25} />
        </View>
        <View
          style={{
            ...styles.overlayIcons,
            transform: [{ rotate: `${Math.random() * 180}deg` }],
            top: 5,
            left: "24%",
          }}
        >
          <FontAwesome name="minus" color={textColor} size={25} />
        </View>
        <View
          style={{
            ...styles.overlayIcons,
            transform: [{ rotate: `${Math.random() * 180}deg` }],
            top: 40,
            right: 30,
          }}
        >
          <FontAwesome name="circle" color={textColor} size={25} />
        </View>
        <View
          style={{
            ...styles.overlayIcons,
            transform: [{ rotate: `${Math.random() * 180}deg` }],
            bottom: 40,
            left: 30,
          }}
        >
          <FontAwesome name="circle-o" color={textColor} size={25} />
        </View>
        <View
          style={{
            ...styles.overlayIcons,
            transform: [{ rotate: `${Math.random() * 180}deg` }],
            top: "40%",
            left: "30%",
          }}
        >
          <FontAwesome name="circle-o" color={textColor} size={25} />
        </View>
        <View
          style={{
            ...styles.overlayIcons,
            transform: [{ rotate: `${Math.random() * 180}deg` }],
            top: "20%",
            left: width / 2,
          }}
        >
          <Feather name="triangle" color={textColor} size={25} />
        </View>
        <View
          style={{
            ...styles.overlayIcons,
            transform: [{ rotate: `${Math.random() * 180}deg` }],
            top: 40,
            left: width / 2 - 30,
          }}
        >
          <Ionicons name="triangle" color={textColor} size={25} />
        </View>
      </View>
    </AnimatedImageBackground>
  );
};

export default PopMessage;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    width: width,
    height: POP_HEIGHT,
    justifyContent: "flex-end",
    alignItems: "center",
    elevation: 10,
    paddingBottom: 12,
  },
  text: {
    width: "75%",
    textAlign: "center",
    // marginBottom: 20,
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
    backgroundColor: colors.extraLight,
    borderRadius: 100,
    paddingBottom: 4,
    // marginBottom: 15,
    elevation: 8,
    marginTop: 8,
  },
  point: {
    paddingHorizontal: 25,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderRadius: 100,
  },
  pointTxt: {
    color: colors.greenDark,
  },
});
