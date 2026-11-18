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
  // `style` can be an object, an array (nested, with falsy entries) or a
  // registered StyleSheet style — flatten it into one plain object first.
  const {
    fontSize: styleFontSize,
    fontWeight: styleFontWeight,
    ...stylesObj
  } = StyleSheet.flatten(style) || {};

  let fontSize,
    weight = fontWeight;

  if (styleFontSize > 0) {
    fontSize = scaleFont(styleFontSize - 4);
  } else if (typeof size === "number") {
    fontSize = scaleFont(size);
  } else {
    fontSize = FONT_SIZES[size];
  }

  // numeric weights are treated like their string equivalents
  switch (String(styleFontWeight)) {
    case "600":
      weight = "semibold";
      break;
    case "700":
      weight = "bold";
      break;
    case "800":
      weight = "black";
      break;
  }

  const baseStyle = [styles.text, { fontSize, fontFamily: `sf-${weight}` }];

  return animated ? (
    <Animated.Text
      animatedProps={animatedProps}
      style={[...baseStyle, stylesObj, animatedStyle]}
      {...otherProps}
    >
      {children}
    </Animated.Text>
  ) : (
    <Text style={[...baseStyle, stylesObj]} {...otherProps}>
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
