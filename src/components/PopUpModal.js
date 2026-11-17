import { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import colors from "../helpers/colors";
import AppText from "./AppText";

const OPEN_SPRING = { damping: 28, stiffness: 230, mass: 1 };
const SNAP_BACK = { damping: 24, stiffness: 300, mass: 0.9 };
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.9;

const useKeyboardHeight = (active) => {
  const [keyboard, setKeyboard] = useState(0);

  useEffect(() => {
    if (!active || Platform.OS === "web") return undefined;
    const ios = Platform.OS === "ios";
    const show = Keyboard.addListener(
      ios ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboard(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      ios ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboard(0),
    );
    return () => {
      show.remove();
      hide.remove();
      setKeyboard(0);
    };
  }, [active]);

  return keyboard;
};

/**
 * Bottom sheet. Control it with `visible` / `setVisible`.
 * Content can be passed as children (node or `({ closeModal }) => node`)
 * or, for older call sites, as `Component`.
 */
const PopUpModal = ({
  visible,
  setVisible,
  title,
  subtitle,
  mainStyle,
  Component,
  children,
  useDefaultHeight = false,
}) => {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(Boolean(visible));
  const keyboard = useKeyboardHeight(mounted);

  const progress = useSharedValue(0);
  const drag = useSharedValue(0);

  const closeRef = useRef();
  closeRef.current = () => setVisible?.(false);
  const close = () => closeRef.current();

  useEffect(() => {
    if (visible) {
      drag.value = 0;
      setMounted(true);
      progress.value = withSpring(1, OPEN_SPRING);
      return;
    }
    Keyboard.dismiss();
    progress.value = withTiming(
      0,
      { duration: 220, easing: Easing.in(Easing.cubic) },
      (done) => {
        if (done) runOnJS(setMounted)(false);
      },
    );
  }, [visible]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderMove: (_, g) => {
          drag.value = Math.max(0, g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY) {
            closeRef.current();
          } else {
            drag.value = withSpring(0, SNAP_BACK);
          }
        },
        onPanResponderTerminate: () => {
          drag.value = withSpring(0, SNAP_BACK);
        },
      }),
    [],
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity:
      progress.value *
      interpolate(
        drag.value,
        [0, height * 0.5],
        [1, 0.25],
        Extrapolation.CLAMP,
      ),
  }));

  const sheetMotion = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          interpolate(progress.value, [0, 1], [height, 0]) + drag.value,
      },
    ],
  }));

  const topGap = insets.top + 12;
  const available = height - keyboard - topGap;
  const sizing = useDefaultHeight
    ? { maxHeight: Math.min(height * 0.9, available) }
    : { height: Math.min(height * 0.92, available) };

  if (!mounted) return null;

  const content =
    typeof children === "function"
      ? children({ closeModal: close })
      : (children ?? (Component ? <Component closeModal={close} /> : null));

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={close}
    >
      <View style={styles.root}>
        <Animated.View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityLabel="Dismiss"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            sizing,
            {
              marginBottom: keyboard,
              paddingBottom: keyboard ? 8 : Math.max(insets.bottom, 12),
            },
            mainStyle,
            sheetMotion,
          ]}
        >
          <View style={styles.skirt} />

          <View {...pan.panHandlers} style={styles.header}>
            <View style={styles.grabber} />
            <View style={styles.titleRow}>
              <View style={styles.titleBox}>
                <AppText fontWeight="heavy" size="large" numberOfLines={1}>
                  {title}
                </AppText>
                {Boolean(subtitle) && (
                  <AppText
                    fontWeight="medium"
                    size={12.5}
                    numberOfLines={1}
                    style={styles.subtitle}
                  >
                    {subtitle}
                  </AppText>
                )}
              </View>
              <Pressable
                onPress={close}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [
                  styles.closeBtn,
                  pressed && { opacity: 0.6, transform: [{ scale: 0.92 }] },
                ]}
              >
                <Ionicons name="close" size={20} color={colors.medium} />
              </Pressable>
            </View>
          </View>

          {content}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default PopUpModal;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    backgroundColor: "rgba(10,12,20,0.5)",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    width: "100%",
    maxWidth: 700,
    alignSelf: "center",
    overflow: "visible",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: -6 },
      },
      android: { elevation: 24 },
    }),
  },
  skirt: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "100%",
    height: 400,
    backgroundColor: colors.white,
  },
  header: {
    paddingTop: 10,
    paddingHorizontal: 24,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.lightly,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 64,
  },
  titleBox: {
    flex: 1,
    paddingRight: 12,
  },
  subtitle: {
    color: colors.medium,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light,
  },
});
