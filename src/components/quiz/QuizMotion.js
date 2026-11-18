import {
  Easing,
  LinearTransition,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export const SPRING = {
  smooth: { damping: 26, stiffness: 210, mass: 1 },
  push: { damping: 30, stiffness: 240, mass: 1 },
  bounce: { damping: 14, stiffness: 260, mass: 1 },
  press: { damping: 20, stiffness: 380, mass: 0.8 },
};

export const LAYOUT = LinearTransition.springify()
  .damping(26)
  .stiffness(210)
  .mass(1);

/** Card entrance: spring for position/scale, short timing for opacity. */
export const enter = (index = 0, base = 0) => {
  const delay = base + index * 60;
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

/** Step content glides in from the direction you are travelling. */
export const slideIn = (dir = 1) => (values) => {
  "worklet";
  return {
    initialValues: {
      opacity: 0,
      transform: [{ translateX: dir * values.windowWidth * 0.18 }],
    },
    animations: {
      opacity: withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }),
      transform: [{ translateX: withSpring(0, SPRING.push) }],
    },
  };
};

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
      opacity: withTiming(0, { duration: 110 }),
      transform: [{ scale: withTiming(0.5, { duration: 130 }) }],
    },
  };
};
