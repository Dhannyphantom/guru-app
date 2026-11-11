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
import { T } from "./JambTheme";
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

/**
 * Chunky "pushable" surface: a coloured face sitting on a darker lip.
 * Pressing sinks the face onto the lip. The lip is absolutely positioned so
 * the layout never shifts while pressing.
 */
export const Chunky = ({
  children,
  onPress,
  disabled,
  face = T.green,
  lip = T.greenDark,
  faceBorder,
  radius = 16,
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

const BUTTONS = {
  primary: { face: T.green, lip: T.greenDark, text: "#FFFFFF" },
  yellow: { face: T.yellow, lip: T.yellowDark, text: T.ink },
  ghost: {
    face: "#FFFFFF",
    lip: T.lineDark,
    text: T.greenDark,
    border: T.lineDark,
  },
  off: { face: "#E7E3D4", lip: "#D2CCB6", text: "#A29D88" },
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
  const k = disabled ? BUTTONS.off : (BUTTONS[variant] ?? BUTTONS.primary);

  return (
    <Animated.View style={style} layout={LAYOUT}>
      <Chunky
        disabled={disabled}
        onPress={onPress}
        face={k.face}
        lip={k.lip}
        faceBorder={disabled ? undefined : k.border}
        radius={small ? 14 : 18}
        depth={small ? 4 : 5}
        contentStyle={[styles.btn, small && styles.btnSmall]}
      >
        <AppText
          fontWeight="black"
          size={small ? 13 : 15}
          style={{
            color: k.text,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          {title}
        </AppText>
        {Boolean(icon) && (
          <Ionicons
            name={icon}
            size={small ? 15 : 18}
            color={k.text}
            style={{ marginLeft: 8 }}
          />
        )}
      </Chunky>
    </Animated.View>
  );
};

/** White card with a thicker bottom edge (like a stacked card / notebook tab). */
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

/** Sticky note (teacher's remark) with a strip of tape on top. */
export const Note = ({
  icon = "bulb",
  title,
  children,
  index = 0,
  base = 0,
  onPress,
  right,
  tone = "yellow",
  style,
}) => {
  const c =
    tone === "green"
      ? {
          bg: T.greenSoft,
          line: T.greenLine,
          ico: T.greenDark,
          tape: "rgba(34,165,89,0.35)",
          text: T.ink,
        }
      : {
          bg: T.yellowSoft,
          line: T.yellowLine,
          ico: T.yellowInk,
          tape: "rgba(255,199,54,0.65)",
          text: "#4A4020",
        };

  const body = (
    <View style={styles.noteRow}>
      <View style={[styles.noteIcon, { borderColor: c.line }]}>
        <Ionicons name={icon} size={20} color={c.ico} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText fontWeight="black" size={14.5} style={{ color: T.ink }}>
          {title}
        </AppText>
        {children}
      </View>
      {right}
    </View>
  );

  return (
    <Card
      index={index}
      base={base}
      style={[
        {
          backgroundColor: c.bg,
          borderColor: c.line,
          paddingTop: 18,
          marginTop: 8,
        },
        style,
      ]}
    >
      <View style={[styles.tape, { backgroundColor: c.tape }]} />
      {onPress ? (
        <JambPressable onPress={onPress} scaleTo={0.99}>
          {body}
        </JambPressable>
      ) : (
        body
      )}
    </Card>
  );
};

export const Chip = ({
  label,
  color = T.greenDark,
  bg = T.greenSoft,
  icon,
  style,
}) => (
  <View style={[styles.chip, { backgroundColor: bg }, style]}>
    {Boolean(icon) && (
      <Ionicons
        name={icon}
        size={13}
        color={color}
        style={{ marginRight: 5 }}
      />
    )}
    <AppText fontWeight="bold" size={11.5} style={{ color }}>
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

/** Small section heading: coloured icon tile + title (+ optional right node). */
export const SectionTitle = ({
  icon,
  color = T.green,
  bg = T.greenSoft,
  title,
  sub,
  right,
}) => (
  <View style={styles.sectionHead}>
    <View style={[styles.sectionIcon, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <View style={{ flex: 1, paddingRight: 8 }}>
      <AppText fontWeight="black" size={17} style={{ color: T.ink }}>
        {title}
      </AppText>
      {Boolean(sub) && (
        <AppText
          fontWeight="medium"
          size={11.5}
          style={{ color: T.sub, marginTop: 1 }}
        >
          {sub}
        </AppText>
      )}
    </View>
    {right}
  </View>
);

// ─── Progress ────────────────────────────────────────────────────────────────

export const ProgressRing = ({
  percent = 0,
  size = 84,
  stroke = 10,
  color = T.green,
  track = T.track,
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

/** Chunky progress bar with a glossy highlight stripe. */
export const AnimatedBar = ({
  percent = 0,
  color = T.green,
  height = 12,
  delay = 250,
  track = T.track,
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
      >
        <View
          style={{
            position: "absolute",
            top: Math.max(height * 0.22, 2),
            left: 6,
            right: 6,
            height: Math.max(height * 0.22, 2),
            borderRadius: 4,
            backgroundColor: "rgba(255,255,255,0.35)",
          }}
        />
      </Animated.View>
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
  bg = T.paper,
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
        <Ionicons name={iconName} size={size * 0.6} color={T.greenDark} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 22,
  },
  btnSmall: { paddingVertical: 11, paddingHorizontal: 18 },
  card: {
    backgroundColor: T.card,
    borderRadius: 22,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: T.line,
    padding: 14,
    marginBottom: 14,
  },
  noteRow: { flexDirection: "row", alignItems: "flex-start" },
  noteIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tape: {
    position: "absolute",
    top: -9,
    left: 26,
    width: 54,
    height: 18,
    borderRadius: 3,
    transform: [{ rotate: "-4deg" }],
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  skeleton: {
    backgroundColor: "#EADFC0",
    borderRadius: 14,
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
