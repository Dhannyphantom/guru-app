import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import React from "react";

import logo from "../../assets/images/icon.png";
import AppText from "./AppText";

const { width, height } = Dimensions.get("screen");

const AppLogo = ({ hideName = false, onPress, size = 60 }) => {
  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Image
        source={logo}
        style={[styles.logo, { width: size, height: size }]}
      />
      {!hideName && (
        <AppText style={{ color: "#fff" }} fontWeight="black">
          Guru
        </AppText>
      )}
    </Pressable>
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
