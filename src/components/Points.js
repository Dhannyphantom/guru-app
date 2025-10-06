import { StyleSheet, View } from "react-native";
import React from "react";
import { FontAwesome6 } from "@expo/vector-icons";

import colors from "../helpers/colors";
import AppText from "./AppText";
import { capFirstLetter, formatPoints } from "../helpers/helperFunctions";

const Points = ({
  value,
  style,
  type = "token",
  fontSize = "medium",
  fontWeight = "black",
  hideSuffix,
  size = 22,
}) => {
  let iconName, text;

  switch (type) {
    case "token":
      iconName = "bolt-lightning";
      text = formatPoints(value);
      if (hideSuffix) text = text?.slice(0, -3);
      break;
    case "award":
      iconName = "award";
      text = capFirstLetter(value);
      break;
    case "logo":
      iconName = "bolt-lightning";
      text = null;
      break;
  }

  return (
    <View
      style={[
        styles.points,
        !Boolean(text)
          ? styles.pointsBlank
          : { paddingVertical: 5, paddingRight: 10 },
        style,
      ]}
    >
      <View
        style={[
          styles.pointIcon,
          !Boolean(text) ? { elevation: 8 } : { marginLeft: 4, marginRight: 8 },
          { width: size, height: size },
        ]}
      >
        <FontAwesome6 name={iconName} color={"#fff"} size={size / 2} />
      </View>
      {Boolean(text) && (
        <AppText
          fontWeight={fontWeight}
          size={fontSize}
          style={styles.pointText}
        >
          {text}
        </AppText>
      )}
    </View>
  );
};

export default Points;

const styles = StyleSheet.create({
  points: {
    backgroundColor: colors.lightly,
    borderRadius: 100,
    flexDirection: "row",
    alignItems: "center",
  },
  pointsBlank: {
    alignSelf: "flex-start",
    padding: 5,
  },
  pointIcon: {
    backgroundColor: colors.primary,
    borderRadius: 100,
    // marginLeft: 4,
    // marginRight: 8,

    // width: 22,
    // height: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});
