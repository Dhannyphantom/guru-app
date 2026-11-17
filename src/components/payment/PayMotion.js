import {
  Easing,
  LinearTransition,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/**
 * Motion tokens (same family as JambMotion).
 *   smooth  — barely-there overshoot, for cards / sheets
 *   bounce  — playful pop (badges, check marks, selection)
 *   press   — tactile release
 */
export const SPRING = {
  smooth: { damping: 26, stiffness: 210, mass: 1 },
  bounce: { damping: 14, stiffness: 240, mass: 1 },
  press: { damping: 20, stiffness: 380, mass: 0.8 },
};

/** Spring layout transition (content re-flowing). */
export const LAYOUT = LinearTransition.springify()
  .damping(56)
  .stiffness(210)
  .mass(1);

/** Staggered card entrance: translate + scale ride a spring, opacity a short ease-out. */
export const enter = (index = 0, base = 0) => {
  const delay = base + index * 70;
  return () => {
    "worklet";
    return {
      initialValues: {
        opacity: 0,
        transform: [{ translateY: 18 }, { scale: 0.97 }],
      },
      animations: {
        opacity: withDelay(
          delay,
          withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
        ),
        transform: [
          { translateY: withDelay(delay, withSpring(0, SPRING.smooth)) },
          { scale: withDelay(delay, withSpring(1, SPRING.smooth)) },
        ],
      },
    };
  };
};

/** Small badge / check pop with a gentle bounce. */
export const popIn = () => {
  "worklet";
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.3 }] },
    animations: {
      opacity: withTiming(1, { duration: 120 }),
      transform: [{ scale: withSpring(1, SPRING.bounce) }],
    },
  };
};

export const popOut = () => {
  "worklet";
  return {
    initialValues: { opacity: 1, transform: [{ scale: 1 }] },
    animations: {
      opacity: withTiming(0, { duration: 100 }),
      transform: [{ scale: withTiming(0.4, { duration: 120 }) }],
    },
  };
};
