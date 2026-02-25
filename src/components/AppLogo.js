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

const AppLogo = ({ hideName = false, onPress, size = 40 }) => {
  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Image
        source={logo}
        style={[
          styles.logo,
          { width: size, height: size, borderRadius: size * 0.4 },
        ]}
      />
      {!hideName && (
        <AppText
          size="xlarge"
          style={{ color: "#2d2d2d", marginLeft: 6 }}
          fontWeight="black"
        >
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
    backgroundColor: "#2d2d2d",
  },
});
