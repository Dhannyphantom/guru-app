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
  let fontSize,
    weight = fontWeight;

  const stylesObj = { ...style };

  if (style?.fontSize > 0) {
    fontSize = scaleFont(style?.fontSize - 4);
  } else if (typeof size === "number") {
    fontSize = scaleFont(size);
  } else {
    fontSize = FONT_SIZES[size];
  }

  if (style?.fontWeight === "600") {
    weight = "semibold";
  } else if (style?.fontWeight === "700") {
    weight = "bold";
  } else if (style?.fontWeight === "800") {
    weight = "black";
  }

  delete stylesObj?.fontWeight;
  delete stylesObj?.fontSize;

  return animated ? (
    <Animated.Text
      animatedProps={animatedProps}
      style={[
        styles.text,
        { fontSize, fontFamily: `sf-${weight}` },
        stylesObj,
        animatedStyle,
      ]}
      {...otherProps}
    >
      {children}
    </Animated.Text>
  ) : (
    <Text
      style={[styles.text, { fontSize, fontFamily: `sf-${weight}` }, stylesObj]}
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
