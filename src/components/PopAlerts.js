import React, { useEffect, useCallback, useMemo, useState } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from "react-native-reanimated";

import colors from "../helpers/colors";
import AppText from "./AppText";

const { width } = Dimensions.get("screen");
const ALERT_HEIGHT = 44;
const GAP = 8;

const TYPE_PRESET = {
  success: {
    bg: "#E9F9F0",
    text: "#1E7F4D",
  },
  failed: {
    bg: "#FDECEC",
    text: "#9B1C1C",
  },
  info: {
    bg: "#EEF4FF",
    text: "#1E40AF",
  },
  warning: {
    bg: "#FFF6E5",
    text: "#92400E",
  },
};

/* ---------------------------------------------
 * SINGLE ALERT ITEM
 * ------------------------------------------- */
const AlertItem = ({ item, index, onDone }) => {
  const translateX = useSharedValue(width);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  useEffect(() => {
    translateX.value = withTiming(0, { duration: 350 });
    opacity.value = withTiming(1, { duration: 250 });

    const timeout = withDelay(
      item.timer ?? 2000,
      withTiming(width, { duration: 300 }, () => {
        runOnJS(onDone)(item.id);
      })
    );

    translateX.value = timeout;
  }, []);

  const preset = TYPE_PRESET[item.type] || TYPE_PRESET.info;

  return (
    <Animated.View
      style={[
        styles.alert,
        animatedStyle,
        {
          top: index * (ALERT_HEIGHT + GAP),
          backgroundColor: preset.bg,
        },
      ]}
    >
      <AppText
        numberOfLines={2}
        style={{ color: preset.text }}
        fontWeight="medium"
      >
        {item.msg}
      </AppText>
    </Animated.View>
  );
};

/* ---------------------------------------------
 * MAIN POP ALERTS
 * ------------------------------------------- */
const PopAlerts = ({ popData = { vis: false }, setPopData, max = 3 }) => {
  const { vis, msg, type, timer } = popData;
  const [alerts, setAlerts] = useState([]);

  const addAlert = useCallback(() => {
    if (!msg) return;

    setAlerts((prev) => {
      const next = [
        {
          id: Date.now().toString(),
          msg,
          type,
          timer,
        },
        ...prev,
      ];

      return next.slice(0, max);
    });
  }, [msg, type, timer, max]);

  const removeAlert = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  useEffect(() => {
    if (!vis) return;
    addAlert();
    setPopData({ vis: false });
  }, [vis]);

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {alerts.map((item, index) => (
        <AlertItem
          key={item.id}
          item={item}
          index={index}
          onDone={removeAlert}
        />
      ))}
    </View>
  );
};

export default PopAlerts;

/* ---------------------------------------------
 * STYLES
 * ------------------------------------------- */
const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 50,
    width: "100%",
    paddingHorizontal: 12,
  },
  alert: {
    position: "absolute",
    width: "100%",
    height: ALERT_HEIGHT,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
});
