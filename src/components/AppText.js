import { StyleSheet, Text } from "react-native";
import Animated from "react-native-reanimated";
import { FONT_SIZES, scaleFont } from "../helpers/scaleFont";

const AppText = ({
  children,
  size = "regular",
  fontWeight = "regular",
  style,
  animated = false,
  animatedProps,
  animatedStyle,
  ...otherProps
}) => {
  let fontSize;

  if (typeof size === "number") {
    fontSize = scaleFont(size);
  } else {
    fontSize = FONT_SIZES[size];
  }

  return animated ? (
    <Animated.Text
      animatedProps={animatedProps}
      style={[
        styles.text,
        { fontSize, fontFamily: `sf-${fontWeight}` },
        style,
        animatedStyle,
      ]}
      {...otherProps}
    >
      {children}
    </Animated.Text>
  ) : (
    <Text
      style={[styles.text, { fontSize, fontFamily: `sf-${fontWeight}` }, style]}
      // numberOfLines={2}
      // ellipsizeMode="middle"
      {...otherProps}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    color: "black",
  },
});

export default AppText;
