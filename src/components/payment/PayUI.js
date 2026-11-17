/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import AppText from "../AppText";
import { P } from "./PayTheme";
import { LAYOUT, SPRING, enter } from "./PayMotion";
import { CURRENCY_SYMBOL } from "../../helpers/payConfig";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** 12500 -> "₦12,500" (manual grouping, so it never depends on Intl support). */
export const formatMoney = (n = 0) =>
  `${CURRENCY_SYMBOL}${String(Math.round(Number(n) || 0)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ",",
  )}`;

/**
 * Number that tweens to `target` (from its previous value, or from `initial`
 * on first mount). Used for the total price and the "+N days" celebration.
 */
export const useTween = (
  target = 0,
  { duration = 500, initial = target, delay = 0 } = {},
) => {
  const [value, setValue] = useState(initial);
  const from = useRef(initial);

  useEffect(() => {
    let raf;
    let t0;
    const start = from.current;
    const timer = setTimeout(() => {
      const tick = (now) => {
        if (!t0) t0 = now;
        const k = Math.min((now - t0) / duration, 1);
        const v = start + (target - start) * (1 - Math.pow(1 - k, 3));
        from.current = v;
        setValue(Math.round(v));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target]);

  return value;
};

/** Gentle looping float (translateY) for decorative pieces. */
export const useFloat = (delay = 0, duration = 2800, amplitude = 5) => {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-amplitude, {
            duration: duration / 2,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0, {
            duration: duration / 2,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        false,
      ),
    );
  }, []);
  return useAnimatedStyle(() => ({ transform: [{ translateY: v.value }] }));
};

// ─── Text ────────────────────────────────────────────────────────────────────

/**
 * AppText wrapper. AppText spreads `style` into an object, so it must receive
 * a plain object — this flattens arrays for you.
 */
export const PayText = ({ size = 13, style, ...rest }) => {
  const flat = StyleSheet.flatten(style) || {};
  return <AppText size={size} style={{ ...flat }} {...rest} />;
};

// ─── Pressables ──────────────────────────────────────────────────────────────

/** Scale-on-press wrapper (iOS-feeling tactile response). */
export const PressScale = ({
  children,
  style,
  contentStyle,
  onPress,
  disabled,
  scaleTo = 0.97,
  ...rest
}) => {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animated, style]}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(scaleTo, {
            duration: 100,
            easing: Easing.out(Easing.quad),
          });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, SPRING.press);
        }}
        style={contentStyle}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

/**
 * Chunky "pushable" surface: a coloured face sitting on a darker lip.
 * Pressing sinks the face onto the lip. The lip is absolutely positioned so the
 * layout never shifts while pressing.
 */
export const Chunky = ({
  children,
  onPress,
  disabled,
  face = P.green,
  lip = P.greenDark,
  faceBorder,
  radius = 18,
  depth = 5,
  style,
  contentStyle,
}) => {
  const press = useSharedValue(0);
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * depth }],
  }));

  return (
    <View style={[{ paddingBottom: depth }, style]}>
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: depth,
          bottom: 0,
          borderRadius: radius,
          backgroundColor: lip,
        }}
      />
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          press.value = withTiming(1, { duration: 70 });
        }}
        onPressOut={() => {
          press.value = withSpring(0, SPRING.press);
        }}
      >
        <Animated.View
          style={[
            {
              backgroundColor: face,
              borderRadius: radius,
              borderWidth: faceBorder ? 2 : 0,
              borderColor: faceBorder,
              overflow: "hidden",
            },
            faceStyle,
            contentStyle,
          ]}
        >
          {children}
        </Animated.View>
      </Pressable>
    </View>
  );
};

/** A soft light streak that sweeps across a button every few seconds. */
const Shine = () => {
  const x = useSharedValue(-90);
  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withDelay(
          1800,
          withTiming(460, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        ),
        withTiming(-90, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { rotate: "18deg" }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: -20,
          bottom: -20,
          width: 34,
          backgroundColor: "rgba(255,255,255,0.28)",
        },
        style,
      ]}
    />
  );
};

const BUTTONS = {
  primary: { face: P.green, lip: P.greenDark, text: "#FFFFFF" },
  brand: { face: P.brand, lip: P.brandDeep, text: "#FFFFFF" },
  gold: { face: P.gold, lip: P.goldDark, text: P.ink },
  ghost: {
    face: "#FFFFFF",
    lip: P.lineDark,
    text: P.brandDark,
    border: P.lineDark,
  },
  off: { face: "#E7E3D4", lip: "#D2CCB6", text: "#A29D88" },
};

export const PayButton = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  icon = "arrow-forward",
  variant = "primary",
  small = false,
  shine = false,
  style,
}) => {
  const k = disabled ? BUTTONS.off : (BUTTONS[variant] ?? BUTTONS.primary);

  return (
    <Animated.View style={style} layout={LAYOUT}>
      <Chunky
        disabled={disabled || loading}
        onPress={onPress}
        face={k.face}
        lip={k.lip}
        faceBorder={disabled ? undefined : k.border}
        radius={small ? 14 : 18}
        depth={small ? 4 : 5}
        contentStyle={[styles.btn, small && styles.btnSmall]}
      >
        {shine && !disabled && !loading && <Shine />}
        <PayText
          fontWeight="black"
          size={small ? 13 : 15}
          style={{
            color: k.text,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {title}
        </PayText>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={k.text}
            style={{ marginLeft: 8 }}
          />
        ) : (
          Boolean(icon) && (
            <Ionicons
              name={icon}
              size={small ? 15 : 18}
              color={k.text}
              style={{ marginLeft: 8 }}
            />
          )
        )}
      </Chunky>
    </Animated.View>
  );
};

// ─── Surfaces ────────────────────────────────────────────────────────────────

/** White card with a thicker bottom edge (stacked-card / notebook-tab look). */
export const Card = ({
  children,
  style,
  index = 0,
  base = 0,
  animateIn = true,
}) => (
  <Animated.View
    entering={animateIn ? enter(index, base) : undefined}
    layout={LAYOUT}
    style={[styles.card, style]}
  >
    {children}
  </Animated.View>
);

export const Chip = ({
  label,
  color = P.greenDark,
  bg = P.greenSoft,
  icon,
  style,
}) => (
  <View style={[styles.chip, { backgroundColor: bg }, style]}>
    {Boolean(icon) && (
      <Ionicons
        name={icon}
        size={12}
        color={color}
        style={{ marginRight: 4 }}
      />
    )}
    <PayText fontWeight="bold" size={11.5} style={{ color }}>
      {label}
    </PayText>
  </View>
);

/** Section heading: coloured icon tile + title (+ subtitle). */
export const SectionTitle = ({
  icon,
  color = P.brandDark,
  bg = P.brandSoft,
  title,
  sub,
  style,
}) => (
  <View style={[styles.sectionHead, style]}>
    <View style={[styles.sectionIcon, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <PayText fontWeight="black" size={17} style={{ color: P.ink }}>
        {title}
      </PayText>
      {Boolean(sub) && (
        <PayText
          fontWeight="medium"
          size={11.5}
          style={{ color: P.sub, marginTop: 1 }}
        >
          {sub}
        </PayText>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  btnSmall: { paddingVertical: 11, paddingHorizontal: 16 },
  card: {
    backgroundColor: P.card,
    borderRadius: 22,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: P.line,
    padding: 14,
    marginBottom: 14,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 10,
  },
  sectionHead: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
});
