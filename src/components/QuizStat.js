import { Dimensions, StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import colors from "../helpers/colors";

const { width } = Dimensions.get("screen");

const QuizStat = ({ value, subValue, msg, bgColor, border }) => {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bgColor ?? colors.accentDeep,
          borderColor: border ?? colors.accentDeeper,
        },
      ]}
    >
      <AppText
        style={{ color: colors.white, paddingHorizontal: 20 }}
        fontWeight="heavy"
        size={(width * 0.28) / 3}
      >
        {value}
        <AppText
          fontWeight="bold"
          style={{
            color: subValue == "GT" ? colors.light : colors.warningLight,
          }}
        >
          {subValue}
        </AppText>
      </AppText>
      <AppText size={"xxsmall"} style={{ color: colors.lightly }}>
        {msg}
      </AppText>
    </View>
  );
};

export default QuizStat;

const styles = StyleSheet.create({
  container: {
    minWidth: width * 0.28,
    height: width * 0.28,
    justifyContent: "center",
    borderWidth: 10,
    alignItems: "center",
    borderRadius: 20,
    elevation: 5,
  },
});
