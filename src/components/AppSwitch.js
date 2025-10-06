import React, { useEffect, useState } from "react";
import { StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  runOnJS,
} from "react-native-reanimated";
import colors from "../helpers/colors";

const TRACK_WIDTH = 45;

const AppSwitch = ({ style, isEnabled, setIsEnabled }) => {
  const switchTranslateX = useSharedValue(0);

  // Toggle Function
  const toggleSwitch = () => {
    setIsEnabled(!isEnabled);
  };

  // Animated Styles
  const thumbStyle = useAnimatedStyle(() => {
    const clampedValue = Math.min(Math.max(switchTranslateX.value, 0), 25);
    return {
      transform: [
        {
          translateX: withTiming(clampedValue, { duration: 200 }),
        },
      ],
      backgroundColor: interpolateColor(
        switchTranslateX.value,
        [0, 25],
        [colors.medium, colors.primary]
        // Thumb color for OFF and ON
      ),
    };
  });

  useEffect(() => {
    switchTranslateX.value = isEnabled ? 0 : 25; // Adjust based on size
  }, [isEnabled]);

  const trackStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        switchTranslateX.value,
        [0, 25],
        [colors.unchange, colors.primaryLight] // Track color for OFF and ON
      ),
    };
  });

  return (
    <Pressable onPress={toggleSwitch} style={[styles.switchContainer, style]}>
      <Animated.View style={[styles.track, trackStyle]} />
      <Animated.View style={[styles.thumb, thumbStyle]} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  switchContainer: {
    width: 50,
    height: 24,
    justifyContent: "center",
  },
  track: {
    width: 50,
    height: 26,
    borderRadius: 120,
    position: "absolute",
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: "absolute",
    top: 2,
    left: 2,
    elevation: 5,
  },
});

export default AppSwitch;
