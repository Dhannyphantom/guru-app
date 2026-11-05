import {
  Easing,
  LinearTransition,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/**
 * iOS-style motion tokens.
 * damping ratio (zeta) = damping / (2 * sqrt(stiffness * mass))
 *   smooth ≈ 0.90  -> settles with a barely-there overshoot (system sheets)
 *   push   ≈ 0.97  -> navigation slide, no visible bounce
 *   bounce ≈ 0.54  -> playful pop (selection, badges)
 *   press  ≈ 0.87  -> tactile press release
 */
export const SPRING = {
  smooth: { damping: 26, stiffness: 210, mass: 1 },
  push: { damping: 30, stiffness: 240, mass: 1 },
  bounce: { damping: 17, stiffness: 250, mass: 1 },
  press: { damping: 20, stiffness: 380, mass: 0.8 },
};

/** Spring-driven layout transition (cards re-flowing when content changes). */
export const LAYOUT = LinearTransition.springify()
  .damping(26)
  .stiffness(210)
  .mass(1);

/**
 * Card entrance: translate + scale ride a spring, opacity rides a short
 * ease-out timing curve — so opacity never overshoots (that was the "jitter").
 */
export const enter = (index = 0, base = 0) => {
  const delay = base + index * 60;
  return () => {
    "worklet";
    return {
      initialValues: {
        opacity: 0,
        transform: [{ translateY: 16 }, { scale: 0.98 }],
      },
      animations: {
        opacity: withDelay(
          delay,
          withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
        ),
        transform: [
          { translateY: withDelay(delay, withSpring(0, SPRING.smooth)) },
          { scale: withDelay(delay, withSpring(1, SPRING.smooth)) },
        ],
      },
    };
  };
};

/** Push navigation: new screen glides in on a critically-damped spring. */
export const slideIn = (dir = 1) => (values) => {
  "worklet";
  return {
    initialValues: {
      opacity: 0,
      transform: [{ translateX: dir * values.windowWidth * 0.22 }],
    },
    animations: {
      opacity: withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
      transform: [{ translateX: withSpring(0, SPRING.push) }],
    },
  };
};

/** Outgoing screen drifts back a little (parallax) while fading. */
export const slideOut = (dir = 1) => (values) => {
  "worklet";
  return {
    initialValues: { opacity: 1, transform: [{ translateX: 0 }] },
    animations: {
      opacity: withTiming(0, { duration: 180 }),
      transform: [
        {
          translateX: withTiming(-dir * values.windowWidth * 0.14, {
            duration: 240,
            easing: Easing.out(Easing.cubic),
          }),
        },
      ],
    },
  };
};

/** Small badge / chip pop with a gentle bounce. */
export const popIn = () => {
  "worklet";
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.4 }] },
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
      opacity: withTiming(0, { duration: 120 }),
      transform: [{ scale: withTiming(0.5, { duration: 140 }) }],
    },
  };
};
