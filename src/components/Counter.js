import { StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import colors from "../helpers/colors";

const Counter = ({ count, size = 50, percentage, style, fontSize }) => {
  const fontSizer = fontSize ?? size * 0.45;
  let bgColor, overlayColor, txtColor;

  if (percentage) {
    if (count > 70) {
      bgColor = colors.primary;
      overlayColor = colors.primaryLight;
      txtColor = colors.white;
    } else if (count > 50) {
      bgColor = colors.warning;
      overlayColor = colors.warningLight;
      txtColor = colors.heartLighter;
    } else {
      bgColor = colors.heart;
      overlayColor = colors.heartLight;
      txtColor = colors.heartLighter;
    }
  }

  return (
    <View
      style={[
        styles.overlay,
        {
          backgroundColor: percentage ? overlayColor : colors.primaryLighter,
          ...style,
        },
      ]}
    >
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            backgroundColor: percentage ? bgColor : colors.primary,
          },
        ]}
      >
        <AppText
          style={{
            ...styles.text,
            color: percentage ? txtColor : colors.white,
          }}
          fontWeight="heavy"
          size={fontSizer}
        >
          {count}
          {percentage ? "%" : ""}
        </AppText>
      </View>
    </View>
  );
};

export default Counter;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    borderRadius: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    paddingBottom: 3,
    paddingRight: 2,
    backgroundColor: colors.primaryLight,
    borderRadius: 1000,
    alignSelf: "flex-start",
    elevation: 5,
  },
  text: {
    color: colors.white,
  },
});
