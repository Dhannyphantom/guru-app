import { StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import colors from "../helpers/colors";

const Counter = ({ count, size = 50, percentage, style, fontSize }) => {
  const fontSizer = fontSize ?? size * 0.45;
  let bgColor;

  if (percentage) {
    if (count > 70) {
      bgColor = colors.primary;
    } else if (count > 50) {
      bgColor = colors.warning;
    } else {
      bgColor = colors.heart;
    }
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          backgroundColor: percentage ? bgColor + 20 : colors.primary + 20,
          borderWidth: 1,
          borderBottomWidth: 3,
          borderColor: percentage ? bgColor : colors.primary,
        },
        style,
      ]}
    >
      <AppText
        style={{
          ...styles.text,
          color: percentage ? bgColor : colors.primary,
        }}
        fontWeight="heavy"
        size={fontSizer}
      >
        {count}
        {percentage ? "%" : ""}
      </AppText>
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
