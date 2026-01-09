import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import colors from "../helpers/colors";
import AppText from "./AppText";

const { width } = Dimensions.get("window");

const TabSelector = ({ options = [], initialIndex = 0, onChange }) => {
  const tabWidth = (width * 0.9) / options.length;
  const translateX = useSharedValue(tabWidth * initialIndex);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handlePress = (index) => {
    setActiveIndex(index);
    translateX.value = withTiming(tabWidth * index, { duration: 250 });
    onChange?.(options[index], index);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabWrapper}>
        <Animated.View
          style={[styles.indicator, { width: tabWidth }, indicatorStyle]}
        />

        {options.map((item, index) => {
          const isActive = index === activeIndex;

          return (
            <Pressable
              key={item.key || index}
              style={[styles.tab, { width: tabWidth }]}
              onPress={() => handlePress(index)}
            >
              {item.icon && (
                <MaterialCommunityIcons
                  name={item.icon}
                  size={18}
                  color={isActive ? "#fff" : "#777"}
                />
              )}
              <AppText
                fontWeight="bold"
                style={[styles.label, { color: isActive ? "#fff" : "#777" }]}
              >
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export default TabSelector;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    alignItems: "center",
  },
  tabWrapper: {
    flexDirection: "row",
    backgroundColor: "#f1f1f1",
    borderRadius: 16,
    overflow: "hidden",
  },
  tab: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    zIndex: 2,
  },
  label: {},
  indicator: {
    position: "absolute",
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 16,
    zIndex: 1,
  },
});
