import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";

const { width } = Dimensions.get("window");

export default function UpdateModal({
  visible,
  forceUpdate,
  message,
  onUpdate,
  onLater,
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          damping: 18,
          stiffness: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none">
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.card, { opacity, transform: [{ scale }] }]}
        >
          <Text style={styles.title}>Update available</Text>

          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            {!forceUpdate && (
              <Pressable onPress={onLater}>
                <Text style={styles.later}>Later</Text>
              </Pressable>
            )}

            <Pressable style={styles.updateBtn} onPress={onUpdate}>
              <Text style={styles.updateText}>Update now</Text>
            </Pressable>
          </View>

          {forceUpdate && (
            <Text style={styles.footer}>
              This update is required to continue.
            </Text>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: width * 0.86,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#111",
  },
  message: {
    fontSize: 14.5,
    color: "#555",
    lineHeight: 20,
    marginBottom: 20,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 14,
  },
  later: {
    fontSize: 14,
    color: "#666",
  },
  updateBtn: {
    backgroundColor: "#7c3aed",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  updateText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  footer: {
    marginTop: 14,
    fontSize: 12,
    color: "#888",
    textAlign: "center",
  },
});

/**
 * 
 * const {
  status,
  message,
  forceUpdate,
  openStore,
} = useAppUpdate({
  endpoint: "https://api.guruedutech.com/app/version",
  androidPackageName: "com.guru.app",
  iosAppId: "1234567890",
});

<UpdateModal
  visible={status === "soft" || status === "force"}
  forceUpdate={forceUpdate}
  message={message}
  onUpdate={openStore}
  onLater={() => {}}
/>;

 */
