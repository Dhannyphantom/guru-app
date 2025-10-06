import { Dimensions, StyleSheet, View } from "react-native";

import colors from "../helpers/colors";
const { width } = Dimensions.get("screen");

const ProgressBar = ({ numberOfBars = 2, currentBar = 0 }) => {
  const arr = Array(numberOfBars)
    .fill("x")
    .map((str, idx) => idx);
  const BarWidth = (width * 0.9) / numberOfBars - 15;

  return (
    <View style={styles.container}>
      {arr.map((idx) => (
        <View key={idx.toString()} style={[styles.bar, { width: BarWidth }]}>
          <View
            style={{
              borderRadius: 20,
              height: "100%",
              backgroundColor: colors.primary,
              width: idx < currentBar ? BarWidth : 0,
            }}
          />
        </View>
      ))}
    </View>
  );
};

export default ProgressBar;

const styles = StyleSheet.create({
  bar: {
    height: 5,
    backgroundColor: colors.white,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
  },
});
