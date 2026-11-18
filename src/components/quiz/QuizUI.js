/* eslint-disable react-hooks/purity */
/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  FadeIn,
  ZoomIn,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppText from "../AppText";
import { Q, STEPS, TONES } from "./QuizTheme";
import { LAYOUT, SPRING, enter } from "./QuizMotion";

export { enter };

// ─── Motion helpers ──────────────────────────────────────────────────────────

export const useCountUp = (target = 0, duration = 1000, delay = 0, decimals = 0) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf;
    let start;
    const timer = setTimeout(() => {
      const tick = (now) => {
        if (!start) start = now;
        const k = Math.min((now - start) / duration, 1);
        setValue(Number((Number(target) * (1 - Math.pow(1 - k, 3))).toFixed(decimals)));
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

export const useFloat = (delay = 0, duration = 2600, amplitude = 5) => {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-amplitude, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, []);
  return useAnimatedStyle(() => ({ transform: [{ translateY: v.value }] }));
};

// ─── Primitives ──────────────────────────────────────────────────────────────

export const QuizPressable = ({ children, style, contentStyle, onPress, disabled, scaleTo = 0.97, ...rest }) => {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[animated, style]}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(scaleTo, { duration: 100, easing: Easing.out(Easing.quad) });
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

/** Pushable surface: coloured face on a darker lip; pressing sinks the face. */
export const Chunky = ({
  children, onPress, disabled, face = TONES.green.face, lip = TONES.green.lip,
  faceBorder, radius = 16, depth = 5, style, contentStyle,
}) => {
  const press = useSharedValue(0);
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: press.value * depth }] }));
  return (
    <View style={[{ paddingBottom: depth }, style]}>
      <View
        style={{ position: "absolute", left: 0, right: 0, top: depth, bottom: 0, borderRadius: radius, backgroundColor: lip }}
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
            { backgroundColor: face, borderRadius: radius, borderWidth: faceBorder ? 2 : 0, borderColor: faceBorder },
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

const BTN = {
  primary: { face: TONES.green.face, lip: TONES.green.lip, text: "#FFFFFF" },
  yellow: { face: TONES.yellow.face, lip: TONES.yellow.lip, text: Q.ink },
  purple: { face: TONES.purple.face, lip: TONES.purple.lip, text: "#FFFFFF" },
  blue: { face: TONES.blue.face, lip: TONES.blue.lip, text: "#FFFFFF" },
  coral: { face: TONES.coral.face, lip: TONES.coral.lip, text: "#FFFFFF" },
  ink: { face: TONES.ink.face, lip: TONES.ink.lip, text: "#FFFFFF" },
  ghost: { face: "#FFFFFF", lip: Q.lineDark, text: Q.ink, border: Q.lineDark },
  off: { face: "#E7E3D4", lip: "#D2CCB6", text: "#A29D88" },
};

export const QuizButton = ({ title, onPress, disabled = false, icon = "arrow-forward", variant = "primary", small = false, style }) => {
  const k = disabled ? BTN.off : (BTN[variant] ?? BTN.primary);
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
        <AppText fontWeight="black" size={small ? 13 : 15} style={{ color: k.text, letterSpacing: 0.6, textTransform: "uppercase" }}>
          {title}
        </AppText>
        {Boolean(icon) && <Ionicons name={icon} size={small ? 15 : 18} color={k.text} style={{ marginLeft: 8 }} />}
      </Chunky>
    </Animated.View>
  );
};

export const QuizIconButton = ({ icon = "arrow-back", onPress, variant = "ghost", size = 52, style }) => {
  const k = BTN[variant] ?? BTN.ghost;
  return (
    <Chunky
      onPress={onPress}
      face={k.face}
      lip={k.lip}
      faceBorder={k.border}
      radius={18}
      depth={5}
      style={style}
      contentStyle={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={icon} size={22} color={k.text} />
    </Chunky>
  );
};

export const QuizCard = ({ children, style, index = 0, base = 0, animateIn = true, tone }) => {
  const t = tone ? TONES[tone] : null;
  return (
    <Animated.View
      entering={animateIn ? enter(index, base) : undefined}
      layout={LAYOUT}
      style={[styles.card, t && { backgroundColor: t.soft, borderColor: t.line }, style]}
    >
      {children}
    </Animated.View>
  );
};

export const Chip = ({ label, color = TONES.green.ink, bg = TONES.green.soft, icon, style }) => (
  <View style={[styles.chip, { backgroundColor: bg }, style]}>
    {Boolean(icon) && <Ionicons name={icon} size={13} color={color} style={{ marginRight: 5 }} />}
    <AppText fontWeight="bold" size={11.5} style={{ color }}>
      {label}
    </AppText>
  </View>
);

export const AnimatedBar = ({ percent = 0, color = TONES.green.face, height = 12, delay = 150, track = Q.track }) => {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(delay, withTiming(Math.min(Math.max(percent, 0), 100), { duration: 800, easing: Easing.out(Easing.cubic) }));
  }, [percent]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: "hidden" }}>
      <Animated.View style={[{ height, borderRadius: height, backgroundColor: color }, fill]}>
        <View
          style={{
            position: "absolute", top: Math.max(height * 0.22, 2), left: 6, right: 6,
            height: Math.max(height * 0.22, 2), borderRadius: 4, backgroundColor: "rgba(255,255,255,0.35)",
          }}
        />
      </Animated.View>
    </View>
  );
};

export const StarRow = ({ count = 0, total = 3, size = 40, delay = 500 }) => (
  <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
    {Array.from({ length: total }).map((_, i) => {
      const on = i < count;
      return (
        <Animated.View key={i} entering={ZoomIn.springify().damping(12).delay(delay + i * 180)} style={{ marginTop: i === 1 ? -8 : 0 }}>
          <Ionicons name={on ? "star" : "star-outline"} size={i === 1 ? size + 8 : size} color={on ? TONES.yellow.face : Q.lineDark} />
        </Animated.View>
      );
    })}
  </View>
);

export const FooterBar = ({ children, style }) => (
  <View style={[styles.footer, style]}>{children}</View>
);

// ─── Step header ─────────────────────────────────────────────────────────────

const FACES = STEPS.map((s) => TONES[s.tone].face);
const LIPS = STEPS.map((s) => TONES[s.tone].lip);

const Pips = ({ step }) => (
  <View style={styles.pips}>
    {STEPS.map((s, i) => (
      <Animated.View
        key={s.key}
        layout={LAYOUT}
        style={[
          styles.pip,
          { flex: i === step ? 2.4 : 1 },
          i < step && { backgroundColor: "#FFFFFF" },
          i === step && { backgroundColor: TONES.yellow.face },
        ]}
      />
    ))}
  </View>
);

export const StepHeader = ({ step = 0, onClose }) => {
  const idx = Math.min(Math.max(step, 0), STEPS.length - 1);
  const meta = STEPS[idx];
  const float = useFloat();
  const colorIdx = useSharedValue(idx);

  useEffect(() => {
    colorIdx.value = withTiming(idx, { duration: 380 });
  }, [idx]);

  const idxs = STEPS.map((_, i) => i);
  const lipStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(colorIdx.value, idxs, LIPS) }));
  const faceStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(colorIdx.value, idxs, FACES) }));

  return (
    <Animated.View style={[styles.hdrWrap, lipStyle]}>
      <Animated.View style={[styles.hdrClip, faceStyle]}>
        <View pointerEvents="none" style={[styles.decor, { top: -26, right: -18, width: 96, height: 96, borderRadius: 48 }]} />
        <View pointerEvents="none" style={[styles.decor, { bottom: -22, left: 70, width: 54, height: 54, borderRadius: 14, transform: [{ rotate: "22deg" }] }]} />
        <View pointerEvents="none" style={[styles.decor, { top: 54, right: 64, width: 14, height: 14, borderRadius: 7 }]} />

        <View style={styles.hdrTop}>
          <Pips step={idx} />
          <QuizPressable onPress={onClose} scaleTo={0.9} hitSlop={10} contentStyle={styles.closeBtn}>
            <Ionicons name="close" size={20} color={Q.ink} />
          </QuizPressable>
        </View>

        <Animated.View key={meta.key} entering={FadeIn.duration(280)} style={styles.hdrMain}>
          <Animated.View style={[styles.hdrBadge, float]}>
            <Ionicons name={meta.icon} size={28} color={TONES[meta.tone].face} />
          </Animated.View>
          <View style={{ flex: 1 }}>
            <AppText fontWeight="black" size={11} style={styles.hdrKicker}>
              STEP {idx + 1} OF {STEPS.length}
            </AppText>
            <AppText fontWeight="black" size={22} style={styles.hdrTitle}>
              {meta.title}
            </AppText>
            <AppText fontWeight="medium" size={12.5} style={styles.hdrSub}>
              {meta.sub}
            </AppText>
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

// ─── Modals ──────────────────────────────────────────────────────────────────

/**
 * Shared modal plumbing: stays mounted until the exit animation finishes,
 * backdrop fades, content springs in. variant = "sheet" (bottom) | "dialog".
 */
const ModalShell = ({ visible, onClose, variant = "sheet", dismissable = true, children }) => {
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(Boolean(visible));
  const p = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      p.value = withSpring(1, { ...SPRING.smooth, overshootClamping: true });
    } else {
      p.value = withTiming(0, { duration: 190 }, (fin) => {
        if (fin) runOnJS(setMounted)(false);
      });
    }
  }, [visible]);

  const backdrop = useAnimatedStyle(() => ({ opacity: p.value }));
  const body = useAnimatedStyle(() =>
    variant === "sheet"
      ? { transform: [{ translateY: (1 - p.value) * height }] }
      : { opacity: p.value, transform: [{ scale: 0.88 + 0.12 * p.value }] },
  );

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={dismissable ? onClose : () => {}}>
      <View style={[styles.modalRoot, { justifyContent: variant === "sheet" ? "flex-end" : "center" }]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]}>
          <Pressable style={{ flex: 1 }} onPress={dismissable ? onClose : undefined} />
        </Animated.View>
        <Animated.View style={body}>{children}</Animated.View>
      </View>
    </Modal>
  );
};

/** Bottom sheet. `fill` gives it a fixed tall height (use with FlatList children). */
export const QuizSheet = ({
  visible, onClose, title, subtitle, icon = "list", tone = "blue",
  children, footer, fill = false, maxHeightRatio = 0.82, dismissable = true,
}) => {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const t = TONES[tone];
  const maxH = height * maxHeightRatio;

  return (
    <ModalShell visible={visible} onClose={onClose} variant="sheet" dismissable={dismissable}>
      <View style={[styles.sheet, fill ? { height: maxH } : { maxHeight: maxH }, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.grabber} />
        <View style={styles.sheetHead}>
          <View style={[styles.sheetIcon, { backgroundColor: t.soft, borderColor: t.line }]}>
            <Ionicons name={icon} size={20} color={t.ink} />
          </View>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <AppText fontWeight="black" size={18} style={{ color: Q.ink }} numberOfLines={1}>
              {title}
            </AppText>
            {Boolean(subtitle) && (
              <AppText fontWeight="medium" size={12} style={{ color: Q.sub, marginTop: 1 }}>
                {subtitle}
              </AppText>
            )}
          </View>
          <QuizPressable onPress={onClose} scaleTo={0.9} hitSlop={10} contentStyle={styles.sheetClose}>
            <Ionicons name="close" size={18} color={Q.ink} />
          </QuizPressable>
        </View>
        <View style={fill ? { flex: 1 } : { flexShrink: 1 }}>{children}</View>
        {Boolean(footer) && <View style={{ marginTop: 12 }}>{footer}</View>}
      </View>
    </ModalShell>
  );
};

export const QuizDialog = ({ visible, onClose, children, dismissable = true }) => {
  const { width } = useWindowDimensions();
  return (
    <ModalShell visible={visible} onClose={onClose} variant="dialog" dismissable={dismissable}>
      <View style={[styles.dialog, { width: Math.min(width - 48, 380) }]}>{children}</View>
    </ModalShell>
  );
};

/**
 * Drop-in replacement for PromptModal. Same contract:
 *   prompt = { vis, data: { title, msg, btn, type }, cb?, penalize? }
 *   setPrompt(next), onPress(type, prompt)
 */
export const QuizPrompt = ({ prompt, setPrompt, onPress }) => {
  const data = prompt?.data ?? {};
  const isQuit = data.type === "quit";
  const t = TONES[isQuit ? "coral" : "blue"];

  const close = () => setPrompt?.({ ...prompt, vis: false });
  const confirm = () => {
    prompt?.cb?.();
    onPress?.(data.type, prompt);
    close();
  };

  return (
    <QuizDialog visible={Boolean(prompt?.vis)} onClose={close}>
      <View style={[styles.promptIcon, { backgroundColor: t.soft, borderColor: t.line }]}>
        <Ionicons name={isQuit ? "exit-outline" : "help-circle"} size={34} color={t.ink} />
      </View>
      <AppText fontWeight="black" size={20} style={styles.promptTitle}>
        {data.title}
      </AppText>
      <AppText fontWeight="medium" size={13.5} style={styles.promptMsg}>
        {data.msg}
      </AppText>
      {Boolean(prompt?.penalize) && (
        <Chip icon="warning" label="Points at risk" color={TONES.coral.ink} bg={TONES.coral.soft} style={{ alignSelf: "center", marginTop: 10 }} />
      )}
      <View style={styles.promptBtns}>
        <QuizButton title={data.cancel ?? "Stay"} variant="ghost" icon={null} small onPress={close} style={{ flex: 1 }} />
        <QuizButton title={data.btn ?? "Confirm"} variant="coral" icon={null} small onPress={confirm} style={{ flex: 1 }} />
      </View>
    </QuizDialog>
  );
};

// ─── Confetti ────────────────────────────────────────────────────────────────

const CONFETTI = [TONES.yellow.face, TONES.green.face, TONES.coral.face, TONES.blue.face, TONES.purple.face];
const rnd = (i, n) => Math.abs((Math.sin(i * 97.13 + n * 31.7) * 10000) % 1);

const Piece = ({ i, progress, width, height }) => {
  const cfg = useMemo(
    () => ({
      x: rnd(i, 1) * width,
      size: 7 + rnd(i, 2) * 7,
      delay: rnd(i, 3) * 0.35,
      sway: 14 + rnd(i, 4) * 26,
      freq: 4 + rnd(i, 5) * 6,
      rot: 360 + rnd(i, 6) * 540,
      color: CONFETTI[i % CONFETTI.length],
      round: rnd(i, 7) > 0.55,
    }),
    [],
  );
  const style = useAnimatedStyle(() => {
    const t = Math.min(Math.max((progress.value - cfg.delay) / (1 - cfg.delay), 0), 1);
    return {
      opacity: t <= 0 ? 0 : t > 0.8 ? (1 - t) / 0.2 : 1,
      transform: [
        { translateX: Math.sin(t * cfg.freq) * cfg.sway },
        { translateY: -24 + t * height * 0.85 },
        { rotate: `${t * cfg.rot}deg` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        { position: "absolute", top: 0, left: cfg.x, width: cfg.size, height: cfg.size * (cfg.round ? 1 : 1.6), borderRadius: cfg.round ? cfg.size : 2, backgroundColor: cfg.color },
        style,
      ]}
    />
  );
};

export const Confetti = ({ count = 28 }) => {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(250, withTiming(1, { duration: 3200, easing: Easing.linear }));
  }, []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }).map((_, i) => (
        <Piece key={i} i={i} progress={progress} width={width} height={height} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15, paddingHorizontal: 22 },
  btnSmall: { paddingVertical: 11, paddingHorizontal: 18 },
  card: { backgroundColor: Q.card, borderRadius: 22, borderWidth: 2, borderBottomWidth: 5, borderColor: Q.line, padding: 14, marginBottom: 14 },
  chip: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
  footer: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6,
    backgroundColor: Q.paper, borderTopWidth: 2, borderTopColor: Q.line,
  },
  // header
  hdrWrap: { marginHorizontal: 16, marginTop: 6, marginBottom: 12, borderRadius: 26, paddingBottom: 5 },
  hdrClip: { borderRadius: 26, overflow: "hidden", padding: 14 },
  decor: { position: "absolute", backgroundColor: "rgba(255,255,255,0.14)" },
  hdrTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  pips: { flex: 1, flexDirection: "row", gap: 6 },
  pip: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.32)" },
  closeBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  hdrMain: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  hdrBadge: { width: 58, height: 58, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginRight: 14 },
  hdrKicker: { color: "rgba(255,255,255,0.8)", letterSpacing: 1.2 },
  hdrTitle: { color: "#FFFFFF", marginTop: 1 },
  hdrSub: { color: "rgba(255,255,255,0.9)", marginTop: 2 },
  // modals
  modalRoot: { flex: 1 },
  backdrop: { backgroundColor: "rgba(15,20,45,0.55)" },
  sheet: {
    backgroundColor: Q.paper, borderTopLeftRadius: 30, borderTopRightRadius: 30,
    borderWidth: 2, borderBottomWidth: 0, borderColor: Q.line, paddingHorizontal: 16, paddingTop: 8,
  },
  grabber: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: Q.lineDark, marginBottom: 12 },
  sheetHead: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  sheetIcon: { width: 42, height: 42, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center", marginRight: 12 },
  sheetClose: { width: 34, height: 34, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 2, borderBottomWidth: 3, borderColor: Q.line, alignItems: "center", justifyContent: "center" },
  dialog: { alignSelf: "center", backgroundColor: Q.paper, borderRadius: 28, borderWidth: 2, borderBottomWidth: 6, borderColor: Q.line, padding: 20, alignItems: "stretch" },
  promptIcon: { alignSelf: "center", width: 72, height: 72, borderRadius: 24, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  promptTitle: { color: Q.ink, textAlign: "center", marginTop: 14 },
  promptMsg: { color: Q.sub, textAlign: "center", marginTop: 6, lineHeight: 20 },
  promptBtns: { flexDirection: "row", gap: 10, marginTop: 18 },
});
