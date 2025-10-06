import { Dimensions, StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import colors from "../helpers/colors";

const { width, height } = Dimensions.get("screen");

const ListEmpty = ({ message = "", style, vis = true }) => {
  if (!vis) return null;
  return (
    <View style={[styles.container, style]}>
      <AppText style={styles.text} fontWeight="bold">
        {message}
      </AppText>
    </View>
  );
};

export default ListEmpty;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: height * 0.3,
    width,
  },
  text: {
    textAlign: "center",
    maxWidth: "90%",
    lineHeight: 25,
    color: colors.medium,
    marginVertical: 10,
  },
});
