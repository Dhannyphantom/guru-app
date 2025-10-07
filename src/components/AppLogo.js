import { Dimensions, Image, StyleSheet, Text, View } from "react-native";
import React from "react";

import logo from "../../assets/images/icon.png";
import AppText from "./AppText";

const { width, height } = Dimensions.get("screen");

const AppLogo = ({ hideName = false, size = 60 }) => {
  return (
    <View style={styles.container}>
      <Image
        source={logo}
        style={[styles.logo, { width: size, height: size }]}
      />
      {!hideName && (
        <AppText style={{ color: "#fff" }} fontWeight="black">
          Guru
        </AppText>
      )}
    </View>
  );
};

export default AppLogo;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 40,
    height: 40,
  },
});
