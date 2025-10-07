import { Pressable, StyleSheet } from "react-native";

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const RAnimatedPressable = Animated.createAnimatedComponent(Pressable);

const AnimatedPressable = ({ children, onPress, style, ...otherProps }) => {
  const scaler = useSharedValue(1);

  const rStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaler.value }],
    };
  });

  const handlePressIn = () => {
    scaler.value = withSpring(0.85);
  };

  // Function to handle press out (spring back up)
  const handlePressOut = () => {
    scaler.value = withSpring(1);
  };

  return (
    <RAnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[style, rStyle]}
      {...otherProps}
    >
      {children}
    </RAnimatedPressable>
  );
};

export default AnimatedPressable;

const styles = StyleSheet.create({});
