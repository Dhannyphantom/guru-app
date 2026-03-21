/* eslint-disable react-hooks/exhaustive-deps */
/**
 * OnboardingScreen.jsx
 * Guru App — Fully animated onboarding with Reanimated 3
 *
 * Each slide has:
 *  - A "primary" image shown on mount
 *  - A "secondary" image that swaps in after IMAGE_SWAP_DELAY ms
 *  - Smooth background color interpolation between slides
 *  - Staggered text/button enter animations
 *  - Dot indicator with animated active pill
 *
 * Dependencies (already in your project):
 *   react-native-reanimated >= 3
 *   @expo/vector-icons (Ionicons)
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
  FadeInDown,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  FadeOutUp,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import AppText from "../components/AppText"; // ← adjust path to your project

// ─── Constants ───────────────────────────────────────────────────────────────

const { width: W, height: H } = Dimensions.get("window");
const IMAGE_SWAP_DELAY = 2400; // ms before secondary image swaps in
const TRANSITION_DURATION = 420;

// ─── Color palette ───────────────────────────────────────────────────────────

const Colors = {
  primary: "#689F38",
  accent: "#512DA8",
  heart: "#ea4f30",
  warning: "#f3b02d",
  white: "#fff",
  medium: "#707070",
};

// ─── Slide data ───────────────────────────────────────────────────────────────
// Replace require() paths with your actual image assets.
// Each slide has primaryImage + secondaryImage (the swap).

const SLIDES = [
  {
    id: 0,
    title: "Study Smarter,\nNot Harder",
    body: "Turn boring study time into fun, interactive quizzes that actually keep you coming back.",
    gradientStart: "#FFB347",
    bgColor: "#FFF3E0",
    primaryImage: require("../../assets/images/onboarding/student.png"),
    secondaryImage: require("../../assets/images/onboarding/student_joy.png"),
    accentColor: Colors.warning,
  },
  {
    id: 1,
    title: "Learn. Play. \nWin.",
    body: "Answer questions, earn points, and climb the leaderboard as you improve every day.",
    gradientStart: "#66BB6A",
    bgColor: "#F1F8E9",
    primaryImage: require("../../assets/images/onboarding/question.png"),
    secondaryImage: require("../../assets/images/onboarding/trophy_guy.png"),
    accentColor: Colors.primary,
  },
  {
    id: 2,
    title: "Turn Knowledge\nInto Rewards",
    body: "Boost your grades, compete with others, and earn rewards while learning.",
    gradientStart: "#7E57C2",
    bgColor: "#EDE7F6",
    primaryImage: require("../../assets/images/onboarding/money.png"),
    secondaryImage: require("../../assets/images/onboarding/expend.png"),
    accentColor: Colors.accent,
  },
  {
    id: 3,
    title: "Welcome to\nGuru",
    body: "Create your account or sign in to start learning, competing, and winning today.",
    gradientStart: "#EF5350",
    bgColor: "#FFEBEE",
    primaryImage: require("../../assets/images/onboarding/online-class.png"),
    secondaryImage: require("../../assets/images/onboarding/money.png"),
    accentColor: Colors.heart,
    isLast: true,
  },
];

// ─── Dot indicator ────────────────────────────────────────────────────────────

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

// ─── Slide image pair (primary → secondary swap) ──────────────────────────────

function SlideImages({ slide }) {
  const [showSecondary, setShowSecondary] = useState(false);
  const swapTimer = useRef(null);

  useEffect(() => {
    setShowSecondary(false);
    swapTimer.current = setTimeout(
      () => setShowSecondary(true),
      IMAGE_SWAP_DELAY,
    );
    return () => clearTimeout(swapTimer.current);
  }, [slide.id]);

  return (
    <View style={styles.imageContainer} pointerEvents="none">
      {!showSecondary && (
        <Animated.Image
          key="primary"
          source={slide.primaryImage}
          style={styles.slideImage}
          resizeMode="contain"
          entering={FadeIn.duration(500).easing(Easing.out(Easing.cubic))}
          exiting={FadeOut.duration(340)}
        />
      )}
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

// ─── Main Onboarding Screen ───────────────────────────────────────────────────

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const bgProgress = useSharedValue(0);
  const cardY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  const current = SLIDES[currentIndex];
  const prev = SLIDES[prevIndex];
  const isLast = currentIndex === SLIDES.length - 1;

  // ── Animated background ─────────────────────────────────────────────────
  const bgAnimStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      bgProgress.value,
      [0, 1],
      [prev.bgColor, current.bgColor],
    ),
  }));

  // Decorative blobs also shift color with the slide
  const blobAnimStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      bgProgress.value,
      [0, 1],
      [prev.gradientStart + "55", current.gradientStart + "55"],
    ),
  }));

  // ── Card animated style ─────────────────────────────────────────────────
  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));

  // ── Slide transition helper ─────────────────────────────────────────────
  const doTransition = useCallback(
    (nextIndex, direction) => {
      if (isTransitioning) return;
      setIsTransitioning(true);

      const outY = direction === "forward" ? -18 : 18;
      cardOpacity.value = withTiming(0, { duration: 220 });
      cardY.value = withTiming(outY, { duration: 220 });

      setTimeout(() => {
        setPrevIndex(currentIndex);
        setCurrentIndex(nextIndex);

        cardY.value = direction === "forward" ? 28 : -28;
        cardOpacity.value = 0;

        bgProgress.value = 0;
        bgProgress.value = withTiming(1, {
          duration: TRANSITION_DURATION,
          easing: Easing.out(Easing.cubic),
        });

        cardOpacity.value = withTiming(1, { duration: 360 });
        cardY.value = withSpring(0, { damping: 16, stiffness: 130 });

        setTimeout(() => setIsTransitioning(false), 400);
      }, 230);
    },
    [currentIndex, isTransitioning],
  );

  const goNext = useCallback(() => {
    if (isLast) {
      router.replace("/(auth)/sign-up");
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

      {/* Image area */}
      <View style={[styles.imageArea, { paddingTop: insets.top + 12 }]}>
        <SlideImages slide={current} key={currentIndex} />
      </View>

      {/* Bottom card */}
      <Animated.View style={[styles.card, cardAnimStyle]}>
        {/* Title — keyed Animated.View drives enter/exit; AppText handles font */}
        <Animated.View
          key={`title-${currentIndex}`}
          entering={FadeInUp.delay(60).duration(380).springify().damping(14)}
          exiting={FadeOutUp.duration(200)}
        >
          <AppText
            size={26}
            fontWeight="bold"
            style={[styles.title, { color: current.accentColor }]}
          >
            {current.title}
          </AppText>
        </Animated.View>

        {/* Body — same pattern */}
        <Animated.View
          key={`body-${currentIndex}`}
          entering={FadeInUp.delay(120).duration(400).springify().damping(14)}
          exiting={FadeOutUp.duration(200)}
        >
          <AppText size={15} fontWeight="regular" style={styles.body}>
            {current.body}
          </AppText>
        </Animated.View>

        {/* Dots + navigation */}
        <Animated.View
          key={`nav-${currentIndex}`}
          entering={FadeInDown.delay(180).duration(380)}
          style={styles.navRow}
        >
          {/* Back button */}
          {currentIndex > 0 ? (
            <Pressable onPress={goBack} style={styles.backBtn} hitSlop={12}>
              <Ionicons name="arrow-back" size={20} color={Colors.medium} />
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

          {/* Next / Get Started button */}
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
                name="arrow-forward"
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
            <Pressable onPress={() => router.replace("/(auth)/sign-in")}>
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
      </Animated.View>
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

  // Decorative blobs
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

  // Image area
  imageArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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

  // Bottom card
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
    minHeight: CARD_HEIGHT,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 14,
  },

  title: {
    lineHeight: 36,
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  body: {
    lineHeight: 24,
    color: Colors.medium,
    marginBottom: 28,
  },

  // Navigation
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

  // Dots
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },

  // Next button
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 50,
    gap: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  nextLabel: {
    color: Colors.white,
    letterSpacing: 0.2,
  },

  // Sign in row (last slide)
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
