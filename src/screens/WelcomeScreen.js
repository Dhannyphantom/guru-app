/* eslint-disable react-hooks/exhaustive-deps */
/**
 * OnboardingScreen.jsx
 * Guru App — Fully animated onboarding with Reanimated 3
 *
 * Animation model:
 *  - Background: interpolateColor between slides
 *  - Text (title/body/nav): slide in from right on forward, left on back
 *  - Primary image: slides in from right/left, slides OUT when user navigates
 *  - Secondary image: keeps the original springy FadeInUp (unchanged)
 *  - Last slide image: replaced by <LottieAnimator name="student_hi" />
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  FadeOutDown,
  interpolateColor,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import AppText from "../components/AppText";
import LottieAnimator from "../components/LottieAnimator"; // ← adjust path
import AppLogo from "../components/AppLogo";

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: W, height: H } = Dimensions.get("window");
const IMAGE_SWAP_DELAY = 2400;
const TRANSITION_DURATION = 400;

// How far things slide off-screen
const SLIDE_OFFSET = W * 0.55;
const TEXT_SLIDE_OFFSET = W * 0.6;

// Spring config for slide-ins
const SPRING_IN = { damping: 18, stiffness: 140, mass: 0.9 };

// ─── Colors ───────────────────────────────────────────────────────────────────

const Colors = {
  primary: "#689F38",
  accent: "#512DA8",
  heart: "#ea4f30",
  warning: "#f3b02d",
  white: "#fff",
  medium: "#707070",
};

// ─── Slides ───────────────────────────────────────────────────────────────────

const SLIDES = [
  {
    id: 0,
    title: "Study Smarter, Not Harder",
    body: "Turn boring study time into fun, interactive quizzes and Start playing your way to better grades.",

    //
    gradientStart: "#7E57C2",
    bgColor: "#EDE7F6",
    accentColor: Colors.accent,
    primaryImage: require("../../assets/images/onboarding/student.png"),
    secondaryImage: require("../../assets/images/onboarding/student_joy.png"),
  },
  {
    id: 1,
    title: "Learn. Play. Win.",
    body: "Answer questions, earn points, and climb the leaderboard as you improve every day.",
    gradientStart: "#EF5350",
    bgColor: "#FFEBEE",
    accentColor: Colors.heart,
    primaryImage: require("../../assets/images/onboarding/question.png"),
    secondaryImage: require("../../assets/images/onboarding/trophy_guy.png"),
  },
  {
    id: 2,
    title: "Turn Knowledge Into Rewards",
    body: "Boost your grades, compete with others, and earn rewards while learning.",
    gradientStart: "#FFB347",
    bgColor: "#FFF3E0",
    accentColor: Colors.warning,
    primaryImage: require("../../assets/images/onboarding/money.png"),
    secondaryImage: require("../../assets/images/onboarding/expend.png"),
  },
  {
    id: 3,
    title: "Welcome to Guru",
    body: "Your smart companion for academic excellence.\nCreate your account or sign in to start learning and winning today.",
    gradientStart: "#66BB6A",
    primaryImage: null, // Lottie replaces image on last slide
    secondaryImage: null,

    bgColor: "#F1F8E9",
    accentColor: Colors.primary,
    isLast: true,
  },
];

// ─── Animated Dot ─────────────────────────────────────────────────────────────

function AnimatedDot({ isActive, accentColor }) {
  const width = useSharedValue(isActive ? 24 : 8);
  const opacity = useSharedValue(isActive ? 1 : 0.35);

  useEffect(() => {
    width.value = withSpring(isActive ? 24 : 8, {
      damping: 14,
      stiffness: 160,
    });
    opacity.value = withTiming(isActive ? 1 : 0.35, { duration: 280 });
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    width: width.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        animStyle,
        { backgroundColor: isActive ? accentColor : Colors.medium },
      ]}
    />
  );
}

function Dots({ total, activeIndex, accentColor }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <AnimatedDot
          key={i}
          isActive={i === activeIndex}
          accentColor={accentColor}
        />
      ))}
    </View>
  );
}

// ─── Slide Images ─────────────────────────────────────────────────────────────
// - Primary image slides IN from the correct side on mount
// - When isExiting=true it slides OUT to the opposite side
// - Secondary image keeps original FadeInUp spring (unchanged)
// - Last slide renders LottieAnimator instead

function SlideImages({ slide, direction, isExiting, exitDirection }) {
  const [showSecondary, setShowSecondary] = useState(false);
  const swapTimer = useRef(null);

  // Primary image shared values
  const primaryX = useSharedValue(
    direction === "back" ? -SLIDE_OFFSET : SLIDE_OFFSET,
  );
  const primaryOpacity = useSharedValue(0);

  // Slide primary in on mount
  useEffect(() => {
    primaryX.value = withSpring(0, SPRING_IN);
    primaryOpacity.value = withTiming(1, { duration: 300 });
  }, []);

  // Slide primary out when parent signals exit
  useEffect(() => {
    if (!isExiting) return;
    const toX = exitDirection === "forward" ? -SLIDE_OFFSET : SLIDE_OFFSET;
    primaryX.value = withTiming(toX, {
      duration: 230,
      easing: Easing.in(Easing.cubic),
    });
    primaryOpacity.value = withTiming(0, { duration: 210 });
  }, [isExiting]);

  // Secondary swap timer (reset on slide.id change)
  useEffect(() => {
    setShowSecondary(false);
    swapTimer.current = setTimeout(
      () => setShowSecondary(true),
      IMAGE_SWAP_DELAY,
    );
    return () => clearTimeout(swapTimer.current);
  }, [slide.id]);

  const primaryAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: primaryX.value }],
    opacity: primaryOpacity.value,
  }));

  // ── Last slide: Lottie ──
  if (slide.isLast) {
    return (
      <View style={styles.imageContainer} pointerEvents="none">
        <Animated.View style={[styles.slideImage, primaryAnimStyle]}>
          <LottieAnimator name="student_hi" style={styles.lottie} />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.imageContainer} pointerEvents="none">
      {/* Primary — slides in/out */}
      {!showSecondary && (
        <Animated.Image
          source={slide.primaryImage}
          style={[styles.slideImage, primaryAnimStyle]}
          resizeMode="contain"
        />
      )}

      {/* Secondary — original springy FadeInUp, unchanged */}
      {showSecondary && (
        <Animated.Image
          key="secondary"
          source={slide.secondaryImage}
          style={styles.slideImage}
          resizeMode="contain"
          entering={FadeInUp.duration(520)
            .springify()
            .damping(14)
            .stiffness(120)}
          exiting={FadeOutDown.duration(300)}
        />
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState("forward");

  // Controls whether SlideImages should animate out its primary image
  const [imageExiting, setImageExiting] = useState(false);

  // Shared values
  const bgProgress = useSharedValue(0);

  // Text block slide shared values
  const titleX = useSharedValue(0);
  const titleOpacity = useSharedValue(1);
  const bodyX = useSharedValue(0);
  const bodyOpacity = useSharedValue(1);

  // Nav row: no slide, just a subtle pulse (scale + opacity)
  const navOpacity = useSharedValue(1);
  const navScale = useSharedValue(1);

  const current = SLIDES[currentIndex];
  const prev = SLIDES[prevIndex];
  const isLast = currentIndex === SLIDES.length - 1;

  // ── Background ──────────────────────────────────────────────────────────
  const bgAnimStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      bgProgress.value,
      [0, 1],
      [prev.bgColor, current.bgColor],
    ),
  }));

  const blobAnimStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      bgProgress.value,
      [0, 1],
      [prev.gradientStart + "55", current.gradientStart + "55"],
    ),
  }));

  // ── Text animated styles ────────────────────────────────────────────────
  const titleAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: titleX.value }],
    opacity: titleOpacity.value,
  }));
  const bodyAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: bodyX.value }],
    opacity: bodyOpacity.value,
  }));
  // Nav pulses: briefly dips then bounces back on each slide change
  const navAnimStyle = useAnimatedStyle(() => ({
    opacity: navOpacity.value,
    transform: [{ scale: navScale.value }],
  }));

  // ── Transition helper ───────────────────────────────────────────────────
  const doTransition = useCallback(
    (nextIndex, dir) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setDirection(dir);

      const outX =
        dir === "forward" ? -TEXT_SLIDE_OFFSET * 0.7 : TEXT_SLIDE_OFFSET * 0.7;
      const outEasing = Easing.in(Easing.cubic);

      // 1. Slide text out + image out simultaneously
      titleX.value = withTiming(outX, { duration: 200, easing: outEasing });
      titleOpacity.value = withTiming(0, { duration: 170 });

      bodyX.value = withTiming(outX, { duration: 215, easing: outEasing });
      bodyOpacity.value = withTiming(0, { duration: 185 });

      // Nav: subtle dip (scale down + dim) then spring back up
      navOpacity.value = withTiming(0.5, { duration: 180 });
      navScale.value = withTiming(0.93, { duration: 180 });

      setImageExiting(true);

      setTimeout(() => {
        // 2. Swap content
        setPrevIndex(currentIndex);
        setCurrentIndex(nextIndex);
        setImageExiting(false); // new SlideImages mounts with fresh key

        // 3. Background transition
        bgProgress.value = 0;
        bgProgress.value = withTiming(1, {
          duration: TRANSITION_DURATION,
          easing: Easing.out(Easing.cubic),
        });

        // 4. Slide new text in from the opposite side (staggered)
        const inX =
          dir === "forward"
            ? TEXT_SLIDE_OFFSET * 0.7
            : -TEXT_SLIDE_OFFSET * 0.7;

        titleX.value = inX;
        titleOpacity.value = 0;
        titleX.value = withSpring(0, SPRING_IN);
        titleOpacity.value = withTiming(1, { duration: 300 });

        bodyX.value = inX;
        bodyOpacity.value = 0;
        setTimeout(() => {
          bodyX.value = withSpring(0, SPRING_IN);
          bodyOpacity.value = withTiming(1, { duration: 300 });
        }, 50);

        // Nav springs back up after the dip
        navOpacity.value = withSpring(1, { damping: 14, stiffness: 180 });
        navScale.value = withSpring(1, { damping: 12, stiffness: 200 });

        setTimeout(() => setIsTransitioning(false), 430);
      }, 240);
    },
    [currentIndex, isTransitioning],
  );

  const goNext = useCallback(() => {
    if (isLast) {
      router.push({
        pathname: "/(auth)/register",
        params: {
          isSelectAccountType: true,
        },
      });

      return;
    }
    doTransition(currentIndex + 1, "forward");
  }, [currentIndex, isLast, doTransition]);

  const goBack = useCallback(() => {
    if (currentIndex === 0) return;
    doTransition(currentIndex - 1, "back");
  }, [currentIndex, doTransition]);

  return (
    <Animated.View style={[styles.root, bgAnimStyle]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      {/* Decorative blobs */}
      <Animated.View style={[styles.blobTL, blobAnimStyle]} />
      <Animated.View style={[styles.blobBR, blobAnimStyle]} />

      {/* Image area — key forces remount so SlideImages resets its own state */}
      <View style={[styles.imageArea, { paddingTop: insets.top + 12 }]}>
        <SlideImages
          key={currentIndex}
          slide={current}
          direction={direction}
          isExiting={imageExiting}
          exitDirection={direction}
        />
      </View>

      {/* Bottom card — plain View, text blocks handle their own animation */}
      <View style={styles.card}>
        {/* Title */}
        <Animated.View style={titleAnimStyle}>
          <AppText
            size={"xxlarge"}
            fontWeight="bold"
            style={{ ...styles.title, color: current.accentColor }}
          >
            {current.title}
          </AppText>
        </Animated.View>

        {/* Body */}
        <Animated.View style={bodyAnimStyle}>
          <AppText size={"large"} fontWeight="regular" style={styles.body}>
            {current.body}
          </AppText>
        </Animated.View>

        <Animated.View
          layout={LinearTransition.springify()}
          style={{ alignItems: "center" }}
        >
          <AppLogo transparent hideName size={W * 0.25} />
        </Animated.View>

        {/* Navigation row */}
        <Animated.View
          layout={LinearTransition.springify()}
          style={[styles.navRow, navAnimStyle]}
        >
          {currentIndex > 0 ? (
            <Pressable onPress={goBack} style={styles.backBtn} hitSlop={12}>
              <Ionicons name="return-up-back" size={20} color={Colors.medium} />
              <AppText size={14} fontWeight="medium" style={styles.backLabel}>
                Back
              </AppText>
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}

          <Dots
            total={SLIDES.length}
            activeIndex={currentIndex}
            accentColor={current.accentColor}
          />

          <Pressable
            onPress={goNext}
            style={({ pressed }) => [
              styles.nextBtn,
              { backgroundColor: current.accentColor },
              pressed && { opacity: 0.82, transform: [{ scale: 0.96 }] },
            ]}
          >
            <AppText size={15} fontWeight="semibold" style={styles.nextLabel}>
              {isLast ? "Get Started" : "Next"}
            </AppText>
            {!isLast && (
              <Ionicons
                name="return-up-forward"
                size={16}
                color={Colors.white}
                style={{ marginLeft: 4 }}
              />
            )}
          </Pressable>
        </Animated.View>

        {/* Last slide: sign in link */}
        {isLast && (
          <Animated.View
            entering={FadeIn.delay(300).duration(400)}
            style={styles.signInRow}
          >
            <AppText size={14} fontWeight="regular" style={styles.signInLabel}>
              Already have an account?{" "}
            </AppText>
            <Pressable onPress={() => router.push("/(auth)/login")}>
              <AppText
                size={14}
                fontWeight="semibold"
                style={{ color: current.accentColor }}
              >
                Sign In
              </AppText>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_HEIGHT = H * 0.42;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFF3E0",
  },
  blobTL: {
    position: "absolute",
    top: -W * 0.28,
    left: -W * 0.22,
    width: W * 0.72,
    height: W * 0.72,
    borderRadius: W * 0.36,
    opacity: 0.45,
  },
  blobBR: {
    position: "absolute",
    bottom: CARD_HEIGHT - W * 0.14,
    right: -W * 0.24,
    width: W * 0.6,
    height: W * 0.6,
    borderRadius: W * 0.3,
    opacity: 0.35,
  },
  imageArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden", // clip sliding images at the edges
  },
  imageContainer: {
    width: W * 0.82,
    height: H * 0.44,
    alignItems: "center",
    justifyContent: "center",
  },
  slideImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  lottie: {
    width: "100%",
    height: "100%",
  },
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
    minHeight: CARD_HEIGHT,
    overflow: "hidden", // clip sliding text at the card edges
    boxShadow: `2px 8px 18px rgba(0, 0, 0, 0.25)`,
  },
  title: {
    lineHeight: 36,
    letterSpacing: -0.4,
    marginBottom: 12,
    textAlign: "center",
  },
  body: {
    lineHeight: 24,
    color: Colors.medium,
    marginBottom: 10,
    textAlign: "center",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backLabel: {
    color: Colors.medium,
  },
  backPlaceholder: {
    width: 64,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 50,
    gap: 2,
    boxShadow: `2px 4px 10px rgba(0, 0, 0, 0.15)`,
  },
  nextLabel: {
    color: Colors.white,
    letterSpacing: 0.2,
  },
  signInRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  signInLabel: {
    color: Colors.medium,
  },
});
