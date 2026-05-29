import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import LottieAnimator from "./LottieAnimator";
import AppText from "./AppText";
import AppButton from "./AppButton";
import colors from "../helpers/colors";

const { width: SCREEN_W } = Dimensions.get("screen");

// ─── Step dot indicator ───────────────────────────────────────────────────────
const StepDot = ({ active }) => {
  const widthAnim = useSharedValue(active ? 24 : 8);
  const opacity = useSharedValue(active ? 1 : 0.35);

  useEffect(() => {
    widthAnim.value = withSpring(active ? 24 : 8);
    opacity.value = withTiming(active ? 1 : 0.35, { duration: 300 });
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({
    width: widthAnim.value,
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, animStyle]} />;
};

// ─── Main Component ───────────────────────────────────────────────────────────
/**
 * AppTutorial — Reusable animated onboarding / tutorial modal
 *
 * Props:
 *  visible  {boolean}   — controls modal visibility
 *  onDone   {function}  — called when user finishes or skips
 *  steps    {Array}     — array of { title, text } objects
 */
const AppTutorial = ({ visible = false, onDone, steps = [] }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [internalVisible, setInternalVisible] = useState(visible);

  // Per-step text block slide/fade — Lottie is NOT included here
  const contentTranslateX = useSharedValue(0);
  const contentOpacity = useSharedValue(1);

  // Card entrance
  const cardEnterScale = useSharedValue(0.88);
  const cardEnterOpacity = useSharedValue(0);

  // Backdrop
  const backdropOpacity = useSharedValue(0);

  const isAnimating = useRef(false);

  // ── Stable JS callbacks for scheduleOnRN ────────────────────────────────
  const hideModal = useCallback(() => {
    setInternalVisible(false);
  }, []);

  const unlockAnimating = useCallback(() => {
    isAnimating.current = false;
  }, []);

  // ── Open / close ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
      setCurrentStep(0);
      contentTranslateX.value = 0;
      contentOpacity.value = 1;
      cardEnterScale.value = 0.88;
      cardEnterOpacity.value = 0;
      setTimeout(() => {
        backdropOpacity.value = withTiming(1, { duration: 350 });
        cardEnterScale.value = withSpring(1);
        cardEnterOpacity.value = withTiming(1, { duration: 300 });
      }, 50);
    } else {
      backdropOpacity.value = withTiming(0, { duration: 250 });
      cardEnterScale.value = withTiming(0.88, { duration: 220 });
      cardEnterOpacity.value = withTiming(0, { duration: 220 }, (finished) => {
        "worklet";
        if (finished) scheduleOnRN(hideModal);
      });
    }
  }, [visible]);

  // ── Step update — called via scheduleOnRN ────────────────────────────────
  const applyStepChange = useCallback(
    (direction, enterX) => {
      setCurrentStep((prev) => {
        const next = direction === "next" ? prev + 1 : prev - 1;
        return Math.max(0, Math.min(steps.length - 1, next));
      });

      contentTranslateX.value = enterX;
      contentOpacity.value = 0;

      contentTranslateX.value = withSpring(0);
      contentOpacity.value = withTiming(1, { duration: 220 }, (finished) => {
        "worklet";
        if (finished) scheduleOnRN(unlockAnimating);
      });
    },
    [steps.length],
  );

  // ── Slide transition ──────────────────────────────────────────────────────
  const animateToStep = useCallback(
    (direction) => {
      if (isAnimating.current) return;
      isAnimating.current = true;

      const exitX = direction === "next" ? -SCREEN_W * 0.3 : SCREEN_W * 0.3;
      const enterX = direction === "next" ? SCREEN_W * 0.3 : -SCREEN_W * 0.3;

      contentTranslateX.value = withTiming(exitX, {
        duration: 200,
        easing: Easing.in(Easing.quad),
      });
      contentOpacity.value = withTiming(0, { duration: 180 }, (finished) => {
        "worklet";
        if (finished) scheduleOnRN(applyStepChange, direction, enterX);
      });
    },
    [applyStepChange],
  );

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      animateToStep("next");
    } else {
      onDone?.();
    }
  }, [currentStep, steps.length, animateToStep, onDone]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) animateToStep("prev");
  }, [currentStep, animateToStep]);

  // ── Animated styles ───────────────────────────────────────────────────────
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const cardWrapStyle = useAnimatedStyle(() => ({
    opacity: cardEnterOpacity.value,
    transform: [{ scale: cardEnterScale.value }],
  }));

  // Only the text block slides — Lottie stays fixed above
  const contentSlideStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateX: contentTranslateX.value }],
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
      onRequestClose={onDone}
    >
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onDone} disabled />
      </Animated.View>

      {/* Card wrapper — entrance scale/fade */}
      <View style={styles.centerer} pointerEvents="box-none">
        <Animated.View
          layout={LinearTransition.springify()}
          style={[styles.card, cardWrapStyle]}
        >
          {/* Skip */}
          <Pressable style={styles.skipBtn} onPress={onDone} hitSlop={12}>
            <AppText style={styles.skipText} fontWeight="semiBold">
              Skip
            </AppText>
          </Pressable>

          {/* ── Fixed Lottie — never slides ── */}
          <View style={styles.lottieWrap}>
            <LottieAnimator name="student_jumping" size={160} loop autoPlay />
          </View>

          {/* ── Sliding text block ── */}
          <Animated.View style={[styles.contentSlide, contentSlideStyle]}>
            <View style={styles.stepBadge}>
              <AppText style={styles.stepBadgeText} fontWeight="bold">
                Step {currentStep + 1} of {steps.length}
              </AppText>
            </View>

            <AppText style={styles.title} fontWeight="bold" numberOfLines={2}>
              {step.title}
            </AppText>

            <AppText style={styles.body}>{step.text}</AppText>
          </Animated.View>

          {/* Dots */}
          <View style={styles.dotsRow}>
            {steps.map((_, i) => (
              <StepDot key={i} active={i === currentStep} />
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.btnRow}>
            {!isFirst && (
              <AppButton
                title="Back"
                type="white"
                onPress={handleBack}
                contStyle={styles.btnFlex1}
                style={styles.btnInner}
              />
            )}
            <AppButton
              title={isLast ? "Let's Go!" : "Next"}
              onPress={handleNext}
              contStyle={isFirst ? styles.btnFlex1 : styles.btnFlex2}
              style={styles.btnInner}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default AppTutorial;

// ─── Default steps ────────────────────────────────────────────────────────────
AppTutorial.defaultSteps = [
  {
    title: "Welcome to Guru! 🎓",
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
    boxShadow: `2px 8px 18px ${colors.primary}25`,

    overflow: "hidden",
  },
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
  lottieWrap: {
    width: 170,
    height: 170,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  contentSlide: {
    alignItems: "center",
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
    marginBottom: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary ?? "#5B6CF8",
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  btnFlex1: {
    flex: 1,
    marginBottom: 0,
  },
  btnFlex2: {
    flex: 2,
    marginBottom: 0,
  },
  btnInner: {
    paddingVertical: 10,
  },
});
