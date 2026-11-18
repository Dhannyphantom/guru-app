import { memo, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import AppText from "./jamb/JambText";
import { T, TINTS } from "./jamb/JambTheme";
import { popIn } from "./jamb/JambMotion";
import { AnimatedBar, Card, Chip, JambPressable } from "./jamb/JambUI";

// ─── Shared helpers (the screen uses these too) ──────────────────────────────

/** Normalises a topic's progress numbers into everything the UI needs. */
export const getTopicProgress = (topic) => {
  const done = Math.max(Number(topic?.qBankQuestions) || 0, 0);
  const total = Math.max(Number(topic?.totalQuestions) || 0, 0);

  let percent = total > 0 ? Math.min(Math.round((done / total) * 100), 100) : 0;
  if (done > 0 && percent === 0) percent = 1; // never show 0% once started

  const status =
    total > 0 && percent >= 100 ? "done" : done > 0 ? "doing" : "new";
  const stars =
    status === "done" ? 3 : percent >= 60 ? 2 : percent >= 20 ? 1 : 0;

  return { done, total, percent, status, stars };
};

/** Single source of truth for opening a topic. */
export const getTopicRoute = (topic, subject) => ({
  pathname: "/main/study",
  params: {
    topicId: topic?._id,
    topicName: topic?.name,
    subjectName: subject?.name,
    subjectId: subject?._id,
  },
});

// ─── Layout constants ────────────────────────────────────────────────────────

const RAIL = 46; // width of the path column
const NODE = 40; // numbered bubble
const NODE_TOP = 16; // bubble offset from the top of the row
const NODE_CENTER = NODE_TOP + NODE / 2;
const GAP = 14; // space between rows
const LINE_W = 6;

// ─── Path node (numbered bubble on the left) ─────────────────────────────────

/** Soft ring that pulses outward — marks the "up next" topic. */
const Pulse = ({ color }) => {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
    return () => cancelAnimation(p);
  }, [p]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - p.value),
    transform: [{ scale: 1 + p.value * 0.75 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.pulse, { backgroundColor: color }, style]}
    />
  );
};

const Node = ({ number, status, tint, isNext }) => {
  const done = status === "done";

  return (
    <View style={styles.nodeWrap}>
      {isNext && <Pulse color={tint.bar} />}
      <View
        style={[
          styles.node,
          done
            ? { backgroundColor: T.green, borderColor: T.greenDark }
            : { backgroundColor: tint.bg, borderColor: tint.bar },
        ]}
      >
        {done ? (
          <Animated.View entering={popIn}>
            <Ionicons name="checkmark" size={22} color="#fff" />
          </Animated.View>
        ) : (
          <AppText fontWeight="black" size={17} style={{ color: tint.ink }}>
            {number}
          </AppText>
        )}
      </View>
    </View>
  );
};

// ─── Small pieces ────────────────────────────────────────────────────────────

const Stars = ({ count }) => (
  <View style={styles.stars}>
    {[0, 1, 2].map((i) => (
      <Ionicons
        key={i}
        name="star"
        size={15}
        color={i < count ? T.yellow : T.lineDark + "88"}
      />
    ))}
  </View>
);

/** Visual-only "play" tile (the whole card is the touch target). */
const GoTile = ({ status, tint, viewOnly }) => {
  if (viewOnly) {
    return (
      <View
        style={[
          styles.go,
          { backgroundColor: T.lockedBg, borderColor: T.lockedLine },
        ]}
      >
        <Ionicons name="eye-outline" size={19} color={T.faint} />
      </View>
    );
  }

  const done = status === "done";
  const yellowTint = tint.bar === "#F5B700"; // yellow needs dark ink to stay readable

  return (
    <View
      style={[
        styles.go,
        done
          ? { backgroundColor: T.green, borderColor: T.greenDark }
          : { backgroundColor: tint.bar, borderColor: tint.ink },
      ]}
    >
      <Ionicons
        name={done ? "refresh" : "play"}
        size={19}
        color={!done && yellowTint ? T.ink : "#fff"}
        style={!done && { marginLeft: 2 }}
      />
    </View>
  );
};

// ─── Topic row ───────────────────────────────────────────────────────────────

/**
 * One stop on the study path.
 *
 * props
 *  - data      topic ({ _id, name, qBankQuestions, totalQuestions })
 *  - number    1-based position in the FULL topic list (stays stable under filters)
 *  - index     position in the visible list (stagger / tint)
 *  - isFirst / isLast   trims the path line at the ends
 *  - isNext    highlights the topic the student should do next
 *  - disabled  view-only (non-students)
 *  - onPress   optional override; default opens the study screen
 */
const TopicItem = ({
  data,
  number,
  index = 0,
  subject,
  isFirst = false,
  isLast = false,
  isNext = false,
  disabled = false,
  onPress,
}) => {
  const router = useRouter();

  const tint = TINTS[((number ?? index + 1) - 1) % TINTS.length];
  const { done, total, percent, status, stars } = getTopicProgress(data);
  const isDone = status === "done";

  const handlePress = () => {
    if (onPress) onPress();
    else router.push(getTopicRoute(data, subject));
  };

  const lineStyle =
    isFirst && isLast
      ? null
      : isFirst
        ? { top: NODE_CENTER, bottom: 0 }
        : isLast
          ? { top: 0, height: NODE_CENTER }
          : { top: 0, bottom: 0 };

  return (
    <View style={styles.row}>
      {/* path rail */}
      <View style={styles.rail}>
        {lineStyle && (
          <View
            style={[
              styles.line,
              lineStyle,
              { backgroundColor: isDone ? T.greenLine : T.line },
            ]}
          />
        )}
        <Node number={number} status={status} tint={tint} isNext={isNext} />
      </View>

      {/* card */}
      <View style={styles.cardCol}>
        <Card
          index={Math.min(index, 6)}
          style={[
            styles.card,
            isDone && {
              backgroundColor: T.greenSoft,
              borderColor: T.greenLine,
            },
            isNext && !isDone && { borderColor: tint.bar },
          ]}
        >
          <JambPressable
            onPress={handlePress}
            disabled={disabled}
            scaleTo={0.985}
            contentStyle={styles.cardInner}
          >
            <View style={styles.topRow}>
              <View style={styles.titleCol}>
                {(isNext || isDone) && (
                  <View style={styles.chipRow}>
                    {isDone ? (
                      <Chip
                        label="Mastered"
                        icon="trophy"
                        color={T.greenDark}
                        bg="#fff"
                      />
                    ) : (
                      <Chip
                        label="Up next"
                        icon="flash"
                        color={T.yellowInk}
                        bg={T.yellowSoft}
                      />
                    )}
                  </View>
                )}
                <AppText
                  fontWeight="black"
                  size={15.5}
                  numberOfLines={2}
                  style={styles.title}
                >
                  {data?.name}
                </AppText>
              </View>
              <GoTile status={status} tint={tint} viewOnly={disabled} />
            </View>

            <View style={styles.barRow}>
              <View style={{ flex: 1 }}>
                <AnimatedBar
                  percent={percent}
                  height={12}
                  color={isDone ? T.green : tint.bar}
                  track={isDone ? "#fff" : T.track}
                  delay={250 + Math.min(index, 6) * 60}
                />
              </View>
              <AppText
                fontWeight="black"
                size={12.5}
                style={[
                  styles.percent,
                  { color: isDone ? T.greenDark : tint.ink },
                ]}
              >
                {percent}%
              </AppText>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaLeft}>
                <Ionicons name="help-circle" size={15} color={T.faint} />
                <AppText
                  fontWeight="semibold"
                  size={11.5}
                  style={styles.metaText}
                >
                  {done}/{total} questions
                </AppText>
              </View>
              <Stars count={stars} />
            </View>
          </JambPressable>
        </Card>
      </View>
    </View>
  );
};

export default memo(TopicItem);

const styles = StyleSheet.create({
  row: { flexDirection: "row" },

  // path
  rail: { width: RAIL, alignItems: "center" },
  line: {
    position: "absolute",
    left: (RAIL - LINE_W) / 2,
    width: LINE_W,
    borderRadius: LINE_W / 2,
  },
  nodeWrap: {
    marginTop: NODE_TOP,
    width: NODE,
    height: NODE,
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
  },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 3,
    borderBottomWidth: 5,
    alignItems: "center",
    justifyContent: "center",
  },

  // card
  cardCol: { flex: 1, paddingBottom: GAP },
  card: { marginBottom: 0, padding: 0 },
  cardInner: { padding: 14 },
  topRow: { flexDirection: "row", alignItems: "center" },
  titleCol: { flex: 1, paddingRight: 10 },
  chipRow: { flexDirection: "row", marginBottom: 6 },
  title: { color: T.ink, textTransform: "capitalize", lineHeight: 20 },
  go: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  barRow: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  percent: { width: 42, textAlign: "right" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  metaLeft: { flexDirection: "row", alignItems: "center" },
  metaText: { color: T.sub, marginLeft: 5 },
  stars: { flexDirection: "row", gap: 2 },
});
