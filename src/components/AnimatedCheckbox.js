import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { FontAwesome } from "@expo/vector-icons";
import colors from "../helpers/colors";

const AnimatedCheckBox = ({ isChecked, setIsChecked, setter }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  const handleCloseModal = () => {
    setter ? setter() : setIsChecked(!isChecked);
  };

  // Toggle Function
  const toggleCheckBox = () => {
    scale.value = withSpring(isChecked ? 1 : 1.2); // Scaling effect
    opacity.value = withTiming(
      isChecked ? 0 : 1,
      { duration: 200 },
      (finished) => {
        if (finished) {
          runOnJS(handleCloseModal)();
        }
      }
    ); // Opacity change
  };

  // Animated Styles
  const boxStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      backgroundColor: isChecked ? "#4caf50" : "#f4f4f4", // Green when checked
      borderColor: isChecked ? "#4caf50" : "#ccc",
    };
  });

  const checkMarkStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: opacity.value }], // Scale in with opacity
    };
  });

  useEffect(() => {
    if (isChecked) {
      // isChecked
      scale.value = 1.2; // Scaling effect
      opacity.value = 1;
    } else {
      scale.value = 1; // Scaling effect
      opacity.value = 0;
    }
  }, []);

  return (
    <Pressable onPress={toggleCheckBox} style={styles.pressable}>
      <Animated.View style={[styles.box, boxStyle]}>
        <Animated.View style={[styles.checkMark, checkMarkStyle]}>
          <FontAwesome name="check" color={colors.white} size={15} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    padding: 10,
  },
  box: {
    width: 25,
    height: 25,
    borderRadius: 5,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkMark: {},
});

export default AnimatedCheckBox;
