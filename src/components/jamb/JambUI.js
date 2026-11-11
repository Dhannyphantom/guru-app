/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import AppText from "./JambText";
import { J } from "../../helpers/jambConfig";
import { LAYOUT, SPRING, enter } from "./JambMotion";

export { enter };
import { getImageObj } from "../../helpers/helperFunctions";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Motion helpers ──────────────────────────────────────────────────────────

/** Number that counts up with an ease-out curve. */
export const useCountUp = (target = 0, duration = 1000, delay = 0) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf;
    let start;
    const timer = setTimeout(() => {
      const tick = (now) => {
        if (!start) start = now;
        const k = Math.min((now - start) / duration, 1);
        setValue(Math.round(target * (1 - Math.pow(1 - k, 3))));
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

/** Gentle looping float (translateY) for illustration pieces. */
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

// ─── Primitives ──────────────────────────────────────────────────────────────

export const JambPressable = ({
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

export const JambButton = ({
  title,
  onPress,
  disabled = false,
  icon = "arrow-forward",
  variant = "primary",
  small = false,
  style,
}) => {
  const opacity = useSharedValue(disabled ? 0.5 : 1);
  useEffect(() => {
    opacity.value = withTiming(disabled ? 0.5 : 1, { duration: 220 });
  }, [disabled]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const primary = variant === "primary";

  return (
    <Animated.View style={[fade, style]} layout={LAYOUT}>
      <JambPressable
        disabled={disabled}
        onPress={onPress}
        contentStyle={[
          styles.btn,
          primary ? styles.btnPrimary : styles.btnGhost,
          small && { paddingVertical: 11, paddingHorizontal: 18 },
        ]}
      >
        <AppText
          fontWeight="bold"
          size={small ? 14 : 15.5}
          style={{ color: primary ? "#fff" : J.deep }}
        >
          {title}
        </AppText>
        {Boolean(icon) && (
          <Ionicons
            name={icon}
            size={small ? 16 : 18}
            color={primary ? "#fff" : J.deep}
            style={{ marginLeft: 8 }}
          />
        )}
      </JambPressable>
    </Animated.View>
  );
};

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

export const Chip = ({ label, color = J.deep, bg = J.mint, icon, style }) => (
  <View style={[styles.chip, { backgroundColor: bg }, style]}>
    {Boolean(icon) && (
      <Ionicons
        name={icon}
        size={13}
        color={color}
        style={{ marginRight: 5 }}
      />
    )}
    <AppText fontWeight="bold" size={12} style={{ color }}>
      {label}
    </AppText>
  </View>
);

export const Skeleton = ({ style }) => {
  const o = useSharedValue(0.45);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 750 }), -1, true);
  }, []);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.skeleton, a, style]} />;
};

// ─── Progress ────────────────────────────────────────────────────────────────

export const ProgressRing = ({
  percent = 0,
  size = 84,
  stroke = 10,
  color = J.deep,
  track = J.mintStrong,
  delay = 200,
  children,
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(
      delay,
      withTiming(Math.min(Math.max(percent, 0), 100) / 100, {
        duration: 1100,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [percent]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - p.value),
  }));

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {children}
    </View>
  );
};

export const AnimatedBar = ({
  percent = 0,
  color = J.green,
  height = 8,
  delay = 250,
  track = "#E4EDE0",
}) => {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(
      delay,
      withTiming(Math.min(Math.max(percent, 0), 100), {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [percent]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value}%` }));

  return (
    <View
      style={{
        height,
        borderRadius: height,
        backgroundColor: track,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={[{ height, borderRadius: height, backgroundColor: color }, fill]}
      />
    </View>
  );
};

// ─── Subjects ────────────────────────────────────────────────────────────────

const iconFor = (name = "") => {
  const n = name.toLowerCase();
  if (/math/.test(n)) return "calculator";
  if (/phys/.test(n)) return "nuclear";
  if (/chem/.test(n)) return "flask";
  if (/bio/.test(n)) return "leaf";
  if (/agric/.test(n)) return "sprout";
  if (/gov/.test(n)) return "business";
  if (/econ/.test(n)) return "trending-up";
  if (/lit/.test(n)) return "create";
  if (/engl/.test(n)) return "book";
  return "school";
};

/** Same image resolution logic used by SubjectItem in AppDetails. */
export const getSubjectImage = (subject) => {
  const obj = getImageObj(subject?.image);
  return obj?.uri ? obj : subject?.image;
};

/**
 * Square icon box. The image fills the whole box (resizeMode "contain"
 * keeps its aspect ratio and centers it), so it is as large as the box
 * allows and sits dead-center. Use `imageScale` (0–1) to shrink it if
 * you ever want breathing room inside the box.
 */
export const SubjectIcon = ({
  subject,
  size = 52,
  bg = J.mint,
  radius,
  imageScale = 1,
}) => {
  const src = getSubjectImage(subject);
  const icon = iconFor(subject?.name);
  const iconName = icon === "sprout" ? "leaf" : icon;
  const imgSize = size * imageScale;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? (bg === "transparent" ? 0 : size * 0.3),
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {src ? (
        <Image
          source={src}
          resizeMode="contain"
          style={{
            width: imgSize,
            height: imgSize,
            alignSelf: "center",
          }}
        />
      ) : (
        <Ionicons name={iconName} size={size * 0.6} color={J.deep} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 100,
  },
  btnPrimary: {
    backgroundColor: J.deep,
    shadowColor: J.deepest,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  btnGhost: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: J.green,
  },
  card: {
    backgroundColor: J.card,
    borderRadius: 22,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#1C5B33",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 100,
  },
  skeleton: {
    backgroundColor: "#DCE8D4",
    borderRadius: 14,
  },
});
