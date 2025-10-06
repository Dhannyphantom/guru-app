import { RefreshControl, StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import colors from "../helpers/colors";

const getRefresher = ({ refreshing, onRefresh }) => {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[
        colors.primary,
        colors.primaryLight,
        colors.primaryDeep,
        colors.primaryDeeper,
      ]}
      tintColor={colors.primary}
      progressBackgroundColor={colors.unchange}
    />
  );
};

export default getRefresher;

const styles = StyleSheet.create({
  container: {
    // justifyContent: "center",
    // alignItems: "center",
  },
});
