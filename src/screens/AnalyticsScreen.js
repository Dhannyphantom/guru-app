import { StyleSheet, View } from "react-native";

import AppText from "../components/AppText";

const AnalyticsScreen = () => {
  return (
    <View style={styles.container}>
      <AppText>AnalyticsScreen</AppText>
    </View>
  );
};

export default AnalyticsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
