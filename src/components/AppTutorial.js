import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";
import LottieAnimator from "./LottieAnimator"; // adjust path as needed
import AppText from "./AppText"; // adjust path as needed
import colors from "../helpers/colors"; // adjust path as needed

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("screen");

// ─── Step dot indicator ───────────────────────────────────────────────────────
const StepDot = ({ active, index, total }) => {
  const scale = useSharedValue(active ? 1 : 0.6);
  const opacity = useSharedValue(active ? 1 : 0.35);
  const widthAnim = useSharedValue(active ? 24 : 8);

  useEffect(() => {
    scale.value = withSpring(active ? 1 : 0.6, { damping: 12 });
    opacity.value = withTiming(active ? 1 : 0.35, { duration: 300 });
    widthAnim.value = withSpring(active ? 24 : 8, { damping: 12 });
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({
    width: widthAnim.value,
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[styles.dot, animStyle]} />;
};

// ─── Main Component ───────────────────────────────────────────────────────────
/**
 * AppTutorial — Reusable animated onboarding / tutorial modal
 *
 * Props:
 *  visible      {boolean}   — controls modal visibility
 *  onDone       {function}  — called when user finishes or skips
 *  steps        {Array}     — array of { title, text, icon? } objects
 *  storageKey   {string}    — AsyncStorage key used externally to gate visibility
 */
const AppTutorial = ({ visible = false, onDone, steps = [] }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [internalVisible, setInternalVisible] = useState(visible);

  // Card slide/fade shared values
  const cardTranslateX = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  // Card entrance animation
  const cardEnterScale = useSharedValue(0.88);
  const cardEnterOpacity = useSharedValue(0);

  // Backdrop
  const backdropOpacity = useSharedValue(0);

  const isAnimating = useRef(false);

  // ── Open / close backdrop ────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
      setCurrentStep(0);
      cardEnterScale.value = 0.88;
      cardEnterOpacity.value = 0;
      setTimeout(() => {
        backdropOpacity.value = withTiming(1, { duration: 350 });
        cardEnterScale.value = withSpring(1, { damping: 14, stiffness: 120 });
        cardEnterOpacity.value = withTiming(1, { duration: 300 });
      }, 50);
    } else {
      backdropOpacity.value = withTiming(0, { duration: 250 });
      cardEnterScale.value = withTiming(0.88, { duration: 220 });
      cardEnterOpacity.value = withTiming(0, { duration: 220 }, () => {
        runOnJS(setInternalVisible)(false);
      });
    }
  }, [visible]);

  // ── Animate to next / prev step ──────────────────────────────────────────
  const animateToStep = useCallback(
    (direction) => {
      if (isAnimating.current) return;
      isAnimating.current = true;

      const exitX = direction === "next" ? -SCREEN_W * 0.3 : SCREEN_W * 0.3;
      const enterX = direction === "next" ? SCREEN_W * 0.3 : -SCREEN_W * 0.3;

      // Slide out
      cardTranslateX.value = withTiming(exitX, {
        duration: 200,
        easing: Easing.in(Easing.quad),
      });
      cardOpacity.value = withTiming(0, { duration: 180 }, () => {
        runOnJS(stepCallback)(direction, enterX);
      });
    },
    [currentStep, steps.length],
  );

  const stepCallback = useCallback(
    (direction, enterX) => {
      setCurrentStep((prev) => {
        const next = direction === "next" ? prev + 1 : prev - 1;
        return Math.max(0, Math.min(steps.length - 1, next));
      });

      // Reset to enter-from-right/left, then slide to center
      cardTranslateX.value = enterX;
      cardOpacity.value = 0;

      cardTranslateX.value = withSpring(0, { damping: 16, stiffness: 140 });
      cardOpacity.value = withTiming(1, { duration: 220 }, () => {
        runOnJS(() => {
          isAnimating.current = false;
        })();
      });
    },
    [steps.length],
  );

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      animateToStep("next");
    } else {
      handleDone();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) animateToStep("prev");
  };

  const handleDone = () => {
    onDone?.();
  };

  // ── Animated styles ──────────────────────────────────────────────────────
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const cardWrapStyle = useAnimatedStyle(() => ({
    opacity: cardEnterOpacity.value,
    transform: [{ scale: cardEnterScale.value }],
  }));

  const cardContentStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateX: cardTranslateX.value }],
  }));

  if (!internalVisible) return null;

  const step = steps[currentStep] ?? {};
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  return (
    <Modal
      transparent
      visible={internalVisible}
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleDone}
    >
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDone} />
      </Animated.View>

      {/* Card wrapper — entrance scale/fade */}
      <View style={styles.centerer} pointerEvents="box-none">
        <Animated.View style={[styles.card, cardWrapStyle]}>
          {/* Skip button */}
          <Pressable style={styles.skipBtn} onPress={handleDone} hitSlop={12}>
            <AppText style={styles.skipText} fontWeight="semiBold">
              Skip
            </AppText>
          </Pressable>

          {/* Per-step content slides */}
          <Animated.View style={[styles.contentSlide, cardContentStyle]}>
            {/* Lottie */}
            <View style={styles.lottieWrap}>
              <LottieAnimator name="student_jumping" size={160} loop autoPlay />
            </View>

            {/* Step badge */}
            <View style={styles.stepBadge}>
              <AppText style={styles.stepBadgeText} fontWeight="bold">
                Step {currentStep + 1} of {steps.length}
              </AppText>
            </View>

            {/* Title */}
            <AppText style={styles.title} fontWeight="bold" numberOfLines={2}>
              {step.title}
            </AppText>

            {/* Body */}
            <AppText style={styles.body}>{step.text}</AppText>
          </Animated.View>

          {/* Step dots */}
          <View style={styles.dotsRow}>
            {steps.map((_, i) => (
              <StepDot
                key={i}
                active={i === currentStep}
                index={i}
                total={steps.length}
              />
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.btnRow}>
            {!isFirst && (
              <Pressable style={styles.backBtn} onPress={handleBack}>
                <AppText style={styles.backBtnText} fontWeight="semiBold">
                  Back
                </AppText>
              </Pressable>
            )}

            <Pressable
              style={[styles.nextBtn, isFirst && styles.nextBtnFull]}
              onPress={handleNext}
            >
              <AppText style={styles.nextBtnText} fontWeight="bold">
                {isLast ? "Let's Go! 🚀" : "Next"}
              </AppText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default AppTutorial;

// ─── Default steps (override via props) ──────────────────────────────────────
AppTutorial.defaultSteps = [
  {
    title: `Welcome to Guru! 🎓`,
    text: "Your all-in-one quiz and learning companion. Let's get you set up in just a few steps.",
  },
  {
    title: "Complete Your Profile",
    text: "Add your details, pick a school, and personalise your Guru experience for the best results.",
  },
  {
    title: "Track Daily Progress",
    text: "Stay consistent — your Daily Task tracker updates every day. Build your streak and climb the ranks!",
  },
  {
    title: "Connect With Friends",
    text: "Invite classmates for multiplayer quiz battles. Learning is way more fun with friends.",
  },
  {
    title: "Pick a Subject & Play",
    text: "Choose any subject, start a session, and earn points. Subscribe to unlock the full Guru experience!",
  },
];

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(10, 14, 36, 0.72)",
  },
  centerer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 20,
    overflow: "hidden",
  },

  // ── Decorative top accent stripe ──
  skipBtn: {
    alignSelf: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: colors.primaryLight ?? "#EEF2FF",
  },
  skipText: {
    fontSize: 13,
    color: colors.primary ?? "#5B6CF8",
  },

  contentSlide: {
    alignItems: "center",
    marginTop: 8,
  },
  lottieWrap: {
    width: 170,
    height: 170,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },

  stepBadge: {
    backgroundColor: colors.primaryLight ?? "#EEF2FF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 14,
  },
  stepBadgeText: {
    fontSize: 12,
    color: colors.primary ?? "#5B6CF8",
    letterSpacing: 0.4,
  },

  title: {
    fontSize: 22,
    color: "#111827",
    textAlign: "center",
    lineHeight: 30,
    marginBottom: 10,
  },
  body: {
    fontSize: 14.5,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 4,
  },

  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary ?? "#5B6CF8",
  },

  btnRow: {
    flexDirection: "row",
    gap: 10,
  },
  backBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.primary ?? "#5B6CF8",
  },
  backBtnText: {
    color: colors.primary ?? "#5B6CF8",
    fontSize: 15,
  },
  nextBtn: {
    flex: 2,
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary ?? "#5B6CF8",
  },
  nextBtnFull: {
    flex: 1,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 15,
  },
});
