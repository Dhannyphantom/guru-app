import { StyleSheet, View } from "react-native";
import { Octicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import colors from "../helpers/colors";

const SubStatus = ({ isSubscribed = false }) => {
  // const isSubscribed = false;

  let text, color;
  switch (isSubscribed) {
    case true:
      text = "PREMIUM";
      color = colors.accentDeep;
      break;

    case false:
      text = "FREEMIUM";
      color = colors.medium;
      break;
  }

  return (
    <View style={styles.container}>
      <AppText
        size={"small"}
        style={{ color, ...styles.text }}
        fontWeight="heavy"
      >
        {text}
      </AppText>
      {isSubscribed && (
        <Octicons name="verified" size={16} color={colors.accentDeep} />
      )}
    </View>
  );
};

export default SubStatus;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  text: {
    elevation: 5,
    letterSpacing: 3,
  },
});
