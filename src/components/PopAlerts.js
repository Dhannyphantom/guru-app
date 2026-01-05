import React, { useEffect, useCallback, useState } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
  LinearTransition,
} from "react-native-reanimated";

import AppText from "./AppText";

const { width } = Dimensions.get("screen");
const ALERT_HEIGHT = 44;
const GAP = 8;

const TYPE_PRESET = {
  success: {
    bg: "#E9F9F0",
    text: "#1E7F4D",
    icon: "check-circle",
  },
  failed: {
    bg: "#FDECEC",
    text: "#9B1C1C",
    icon: "times-circle",
  },
  info: {
    bg: "#EEF4FF",
    text: "#1E40AF",
    icon: "info-circle",
  },
  warning: {
    bg: "#FFF6E5",
    text: "#92400E",
    icon: "warning",
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

  const handleDone = useCallback(() => {
    if (typeof item.cb === "function") {
      item.cb();
    }
    onDone(item.id);
  }, [item.cb, item.id, onDone]);

  useEffect(() => {
    // Slide in from right
    translateX.value = withSequence(
      withTiming(0, { duration: 350 }),
      withDelay(
        item.timer ?? 2000,
        withTiming(width, { duration: 300 }, (finished) => {
          if (finished) {
            runOnJS(handleDone)();
          }
        })
      )
    );

    opacity.value = withTiming(0.85, { duration: 250 });
  }, [item.timer, handleDone]);

  const preset = TYPE_PRESET[item.type] || TYPE_PRESET.info;

  return (
    <Animated.View
      layout={LinearTransition}
      style={[
        styles.alert,
        animatedStyle,
        {
          top: index * (ALERT_HEIGHT + GAP),
          backgroundColor: preset.bg,
          borderColor: preset?.text + "60",
        },
      ]}
    >
      <View style={styles.main}>
        <FontAwesome name={preset?.icon} color={preset?.text} size={18} />
        <AppText
          numberOfLines={2}
          style={{ color: preset.text }}
          fontWeight="bold"
        >
          {item.msg}
        </AppText>
      </View>
    </Animated.View>
  );
};

/* ---------------------------------------------
 * MAIN POP ALERTS
 * ------------------------------------------- */
const PopAlerts = ({ popData = { vis: false }, setPopData, max = 3 }) => {
  const { vis, msg, type, timer, cb } = popData;
  const [alerts, setAlerts] = useState([]);

  const addAlert = useCallback(() => {
    if (!msg) return;

    setAlerts((prev) => {
      const next = [
        {
          id: Date.now().toString(),
          msg,
          type: type || "info",
          timer,
          cb,
        },
        ...prev,
      ];

      return next.slice(0, max);
    });
  }, [msg, type, timer, cb, max]);

  const removeAlert = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  useEffect(() => {
    if (!vis) return;
    addAlert();
    setPopData({ vis: false });
  }, [vis, addAlert, setPopData]);

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
    zIndex: 9999,
  },
  alert: {
    position: "absolute",
    maxWidth: "100%",
    height: ALERT_HEIGHT,
    borderWidth: 1,
    opacity: 0.3,
    borderBottomWidth: 4,
    marginHorizontal: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignSelf: "flex-end",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  main: {
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
});
