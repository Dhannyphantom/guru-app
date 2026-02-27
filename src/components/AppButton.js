import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import React from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import colors from "../helpers/colors";
import AppText from "./AppText";
import { useFormikContext } from "formik";
import AnimatedPressable from "./AnimatedPressable";

const { width, height } = Dimensions.get("screen");

export const FormikButton = ({ title, onPress, ...otherProps }) => {
  const { handleSubmit } = useFormikContext();

  const handleBtnPress = () => {
    onPress && onPress();
    handleSubmit();
  };

  return <AppButton title={title} onPress={handleBtnPress} {...otherProps} />;
};

const AppButton = ({
  title,
  disabled = false,
  onPress,
  type = "primary",
  style,
  contStyle,
  icon,
}) => {
  let bgColor = colors.primary,
    color = colors.white,
    overlayColor = colors.primaryDeep,
    Icon = MaterialCommunityIcons;

  switch (type) {
    case "accent":
      bgColor = colors.accent;
      overlayColor = colors.accentDeeper;

      break;
    case "warn":
      bgColor = colors.heartDark;
      overlayColor = colors.heartDeep;
      break;

    case "white":
      bgColor = colors.white;
      overlayColor = colors.lightly;
      color = colors.black;
      break;
  }

  if (disabled) {
    bgColor = colors.light;
    overlayColor = colors.lightly;
    color = colors.medium;
  }

  switch (icon?.type) {
    case "I":
      Icon = Ionicons;
      break;

    default:
      Icon = MaterialCommunityIcons;
      break;
  }

  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.container, { backgroundColor: overlayColor }, contStyle]}
    >
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: bgColor,
            paddingHorizontal: Boolean(icon?.left) ? 16 : 24,
          },
          style,
        ]}
      >
        <View style={{ flexDirection: "row" }}>
          {icon && icon.left && (
            <Icon
              name={icon.name}
              color={icon.color ?? colors.white}
              size={icon.size ?? 17}
              style={{ ...styles.icon, ...icon.style }}
            />
          )}
          <AppText fontWeight="bold" style={{ color }}>
            {title}
          </AppText>
          {icon && icon.right && (
            <Icon
              name={icon.name}
              // name=""
              color={icon.color ?? colors.white}
              size={icon.size ?? 17}
              style={{ ...styles.icon, ...icon.style }}
            />
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
};

export default AppButton;

const styles = StyleSheet.create({
  container: {
    // height: width * 0.12,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    // alignSelf: "flex-start",
    marginBottom: 10,
    // elevation: 2,
    boxShadow: `2px 8px 18px rgba(0, 0, 0, 0.1)`,
  },
  icon: {
    marginRight: 4,
  },

  overlay: {
    borderRadius: 100,
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingVertical: 12,
    alignItems: "center",
    width: "100%",
    marginBottom: 4,
  },
});
