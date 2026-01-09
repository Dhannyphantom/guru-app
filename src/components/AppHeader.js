import React from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "./AppText";
import Screen from "./Screen";

const { width, height } = Dimensions.get("screen");

const AppHeader = ({
  title = "",
  titleColor = "#000",
  onPress,
  hideNavigator = false,
  Component,
}) => {
  const navigation = useNavigation();
  return (
    <Screen style={{ flex: null }}>
      <View style={styles.container}>
        <Pressable
          onPress={() => (Boolean(onPress) ? onPress() : navigation.goBack())}
          style={styles.nav}
        >
          {!hideNavigator && (
            <Ionicons
              style={{ paddingRight: 5 }}
              name="chevron-back-outline"
              size={20}
              color={titleColor}
            />
          )}
          {title && (
            <AppText
              fontWeight="black"
              size={"xlarge"}
              style={{
                ...styles.title,
                padding: hideNavigator ? 5 : 0,
                marginLeft: hideNavigator ? 10 : 0,
                color: titleColor,
              }}
            >
              {title}
            </AppText>
          )}
        </Pressable>
        {Component && (
          <View style={styles.component}>
            <Component />
          </View>
        )}
      </View>
    </Screen>
  );
};

export default AppHeader;

const styles = StyleSheet.create({
  container: {
    width,
    flexDirection: "row",
  },
  component: {
    flex: 1,
    alignItems: "flex-end",
  },
  btn: {
    padding: 15,
  },
  nav: {
    flexDirection: "row",
    padding: 10,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  title: {
    // padding: 15,
    textTransform: "capitalize",
  },
});
