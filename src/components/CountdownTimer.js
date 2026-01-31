/* eslint-disable react/display-name */
/* eslint-disable react-hooks/exhaustive-deps */
import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { StyleSheet } from "react-native";
import AppText from "./AppText";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const formatTime = (totalSeconds) => {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return (
    `${hrs}`.padStart(2, "0") +
    ":" +
    `${mins}`.padStart(2, "0") +
    ":" +
    `${secs}`.padStart(2, "0")
  );
};

const CountdownTimer = forwardRef(
  (
    {
      time = 0, // seconds
      autoStart = false,
      onStart,
      onComplete,
      onPause,
      onSkip,
      onStop,
      textStyle,
      style,
    },
    ref,
  ) => {
    const [remaining, setRemaining] = useState(time);

    const intervalRef = useRef(null);
    const endTimeRef = useRef(null);
    const pausedRef = useRef(false);
    const scale = useSharedValue(1);

    const clear = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const tick = () => {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));

      setRemaining(left);

      if (left <= 0) {
        clear();
        endTimeRef.current = null;
        onComplete && onComplete();
      }
    };

    const startAnimation = () => {
      const duration = 500;
      scale.value = withSequence(
        withTiming(1.65, { duration: duration * 0.55 }),
        withTiming(1, { duration: duration * 0.15 }),
        withTiming(1.2, { duration: duration * 0.15 }),
        withTiming(1, { duration: duration * 0.15 }),
      );
    };

    const start = () => {
      startAnimation();
      if (intervalRef.current) return;

      endTimeRef.current = Date.now() + time * 1000;
      pausedRef.current = false;
      setRemaining(time);

      onStart && onStart();

      intervalRef.current = setInterval(tick, 250);
    };

    const pause = () => {
      if (!intervalRef.current) return;

      pausedRef.current = true;
      clear();
      onPause && onPause();
    };

    const resume = () => {
      if (!pausedRef.current || intervalRef.current) return;

      endTimeRef.current = Date.now() + remaining * 1000;
      pausedRef.current = false;

      intervalRef.current = setInterval(tick, 250);
    };

    const stop = () => {
      clear();
      pausedRef.current = false;
      endTimeRef.current = null;
      setRemaining(time);
      onStop && onStop();
    };

    const skip = () => {
      const elapsed = time - remaining;
      clear();
      pausedRef.current = false;
      endTimeRef.current = null;
      setRemaining(0);
      onSkip && onSkip(elapsed);
    };

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scaleY: scale.value }],
      };
    });

    useImperativeHandle(ref, () => ({
      start,
      pause,
      resume,
      stop,
      skip,
    }));

    useEffect(() => {
      if (autoStart) {
        start();
      }
      return clear;
    }, [autoStart]);

    return (
      <Animated.View style={[animatedStyle, style]} pointerEvents="none">
        <AppText
          weight="semibold"
          size="xlarge"
          style={[styles.text, textStyle]}
        >
          {formatTime(remaining)}
        </AppText>
      </Animated.View>
    );
  },
);

export default CountdownTimer;

const styles = StyleSheet.create({
  text: {
    color: "#fff",
  },
});
