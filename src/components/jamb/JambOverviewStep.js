/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import AppText from "./JambText";
import Avatar from "../Avatar";
import { capFirstLetter } from "../../helpers/helperFunctions";
import {
  J,
  LEVELS,
  SUBJECT_TINTS,
  getLevelInfo,
  levelRangeLabel,
} from "../../helpers/jambConfig";
import jambService from "../../services/jambService";
import { LAYOUT, SPRING, popIn, popOut } from "./JambMotion";
import JambHistoryCard from "./JambHistoryCard";
import JambCooldownCard from "./JambCooldownCard";
import { useCooldown } from "./useCooldown";
import {
  AnimatedBar,
  Card,
  Chip,
  JambButton,
  JambPressable,
  ProgressRing,
  Skeleton,
  SubjectIcon,
  enter,
} from "./JambUI";

const fmt = (n) => Number(n ?? 0).toLocaleString();

// ─── Subject card (selectable, lockable) ─────────────────────────────────────
const SubjectPerfCard = ({ item, index, width, selected, locked, cooling, shortLeft, roundScore, onPress }) => {
  const tint = SUBJECT_TINTS[index % SUBJECT_TINTS.length];
  const sel = useSharedValue(selected ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    sel.value = withTiming(selected ? 1 : 0, { duration: 240 });
  }, [selected]);

  const frame = useAnimatedStyle(() => ({
    borderColor: interpolateColor(sel.value, [0, 1], [tint.border, J.deep]),
    transform: [{ scale: scale.value }],
  }));

  const press = () => {
    if (locked) return;
    scale.value = withSequence(
      withTiming(0.96, { duration: 90 }),
      withSpring(1, SPRING.bounce),
    );
    onPress(item);
  };

  return (
    <Animated.View entering={enter(index, 220)} layout={LAYOUT} style={{ width }}>
      <Animated.View
        style={[
          styles.perf,
          { backgroundColor: locked ? "#EEF1EC" : tint.bg },
          locked && { borderColor: "#DCE3D8", opacity: 0.85 },
          !locked && frame,
        ]}
      >
        <JambPressable onPress={press} disabled={locked} scaleTo={locked ? 1 : 0.98}>
          <View style={styles.perfTop}>
            <SubjectIcon subject={item} size={36} bg="#fff" />
            <AppText fontWeight="bold" size={12.5} numberOfLines={2} style={styles.perfName}>
              {item.name}
            </AppText>
            {locked ? (
              <View style={[styles.pick, { backgroundColor: "#CBD5C7" }]}>
                <Ionicons name="lock-closed" size={11} color="#fff" />
              </View>
            ) : selected ? (
              <Animated.View key="on" entering={popIn} exiting={popOut} style={[styles.pick, { backgroundColor: J.deep }]}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </Animated.View>
            ) : (
              <Animated.View key="off" entering={popIn} exiting={popOut} style={[styles.pick, { backgroundColor: "#fff" }]}>
                <Ionicons name="add" size={13} color="#9AA89E" />
              </Animated.View>
            )}
          </View>

          <View style={styles.perfMid}>
            <ProgressRing
              size={46}
              stroke={5}
              percent={item.percent}
              color={locked ? "#9DB59B" : tint.bar}
              track="#fff"
              delay={400 + index * 120}
            >
              <AppText fontWeight="black" size={10.5} style={{ color: J.ink }}>
                {item.percent}%
              </AppText>
            </ProgressRing>
            <View style={{ marginLeft: 8, flex: 1 }}>
              <AppText fontWeight="black" size={17} style={{ color: J.ink }}>
                {fmt(item.dbTotal)}
              </AppText>
              <AppText fontWeight="medium" size={10} style={{ color: J.muted }}>
                questions in bank
              </AppText>
            </View>
          </View>

          <AnimatedBar
            percent={item.percent}
            color={locked ? "#9DB59B" : tint.bar}
            delay={500 + index * 120}
            track="#fff"
          />

          <View style={styles.perfFoot}>
            {locked ? (
              <>
                <AppText fontWeight="bold" size={10} style={{ color: J.deep }}>
                  {cooling ? "Resting" : `Done · ${roundScore}%`}
                </AppText>
                <AppText fontWeight="semibold" size={10} style={{ color: J.muted }}>
                  {cooling ? shortLeft : "Next round"}
                </AppText>
              </>
            ) : (
              <>
                <AppText fontWeight="semibold" size={10} style={{ color: J.deep }}>
                  {fmt(item.correct)} correct
                </AppText>
                <AppText fontWeight="semibold" size={10} style={{ color: J.muted }}>
                  Exam: {fmt(item.examMax)}
                </AppText>
              </>
            )}
          </View>
        </JambPressable>
      </Animated.View>
    </Animated.View>
  );
};

// ─── Round progress (4 segments) ─────────────────────────────────────────────
const Seg = ({ done }) => {
  const v = useSharedValue(done ? 1 : 0);
  useEffect(() => {
    v.value = withTiming(done ? 1 : 0, { duration: 400 });
  }, [done]);
  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(v.value, [0, 1], ["#DCE8D4", J.green]),
  }));
  return <Animated.View style={[styles.seg, style]} />;
};

const RoundProgress = ({ round, subjects }) => {
  const done = subjects.filter((s) => round?.completed?.[s._id]).length;
  return (
    <View style={styles.round}>
      <View style={styles.segs}>
        {subjects.map((s) => (
          <Seg key={s._id} done={Boolean(round?.completed?.[s._id])} />
        ))}
      </View>
      <AppText fontWeight="bold" size={11.5} style={{ color: J.deep, marginTop: 6 }}>
        Round {round?.number ?? 1} · {done}/{subjects.length} completed
      </AppText>
      <AppText fontWeight="medium" size={10.5} style={{ color: J.muted, marginTop: 2 }}>
        Finish all {subjects.length} subjects to unlock your score prediction.
        Completed subjects stay locked until the next round.
      </AppText>
    </View>
  );
};

const LevelPill = ({ level, active, index }) => (
  <Animated.View entering={FadeIn.delay(500 + index * 90)} style={styles.levelWrap}>
    {index > 0 && <Ionicons name="chevron-forward" size={16} color={J.green} />}
    <View style={[styles.level, active && styles.levelActive]}>
      <View style={[styles.levelIcon, { backgroundColor: level.bg }]}>
        <Ionicons name={level.icon} size={22} color={level.color} />
      </View>
      <AppText fontWeight="bold" size={13} style={{ color: J.ink, marginTop: 6 }}>
        {level.name}
      </AppText>
      <AppText fontWeight="semibold" size={10.5} style={{ color: J.ink, marginTop: 2 }}>
        {levelRangeLabel(level)}
      </AppText>
      <AppText fontWeight="medium" size={9.5} style={{ color: J.muted }}>
        correct questions
      </AppText>
    </View>
  </Animated.View>
);

/**
 * Step 3 — subject performance, round progress, history, levels.
 * `summary` comes from useJambSummary (round state + history + lifetime).
 * `notice` = { key, text } shown briefly after finishing part of a round.
 */
const JambOverviewStep = ({ selected = [], user, summary, notice, onContinue, onExpire }) => {
  const { width } = useWindowDimensions();
  const [perf, setPerf] = useState(null);
  const [picked, setPicked] = useState([]);
  const [noticeOn, setNoticeOn] = useState(false);
  const levelScroll = useRef(null);

  const round = summary?.round;
  const completed = round?.completed ?? {};
  const cooldown = useCooldown(summary?.cooldownUntil, onExpire);
  const cooling = cooldown.active; // 24h rest between rounds
  const isLocked = (id) => cooling || Boolean(completed[id]);
  const available = selected.filter((s) => !isLocked(s._id));
  const lifetime = summary?.lifetimeCorrect ?? null;

  useEffect(() => {
    let alive = true;
    jambService.getSubjectPerformance(selected).then((p) => alive && setPerf(p));
    return () => {
      alive = false;
    };
  }, [selected]);

  // Drop picks that became locked
  useEffect(() => {
    setPicked((p) => p.filter((id) => !cooling && !completed[id]));
  }, [round, cooling]);

  useEffect(() => {
    if (!notice) return;
    setNoticeOn(true);
    const t = setTimeout(() => setNoticeOn(false), 5500);
    return () => clearTimeout(t);
  }, [notice?.key]);

  const allPicked = available.length > 0 && picked.length === available.length;
  const togglePick = (item) =>
    setPicked((p) => (p.includes(item._id) ? p.filter((id) => id !== item._id) : [...p, item._id]));
  const toggleAll = () => setPicked(allPicked ? [] : available.map((x) => x._id));

  const info = getLevelInfo(lifetime ?? 0);
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    capFirstLetter(user?.username ?? "Student");
  // Adjust these field names to match your user model
  const school = user?.school?.name ?? user?.schoolName ?? "Guru School";
  const classLine = [user?.class ?? user?.classLevel, user?.department]
    .filter(Boolean)
    .join(" • ");

  const cardW = Math.floor((width - 32 - 24 - 10) / 2);

  useEffect(() => {
    if (lifetime === null) return;
    const t = setTimeout(
      () => levelScroll.current?.scrollTo({ x: Math.max(info.index * 118 - 30, 0), animated: true }),
      900,
    );
    return () => clearTimeout(t);
  }, [lifetime]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {noticeOn && Boolean(notice) && (
          <Animated.View
            entering={enter(0)}
            exiting={FadeOut.duration(200)}
            layout={LAYOUT}
            style={styles.notice}
          >
            <Ionicons name="checkmark-circle" size={22} color={J.deep} />
            <AppText fontWeight="semibold" size={12.5} style={styles.noticeText}>
              {notice.text}
            </AppText>
          </Animated.View>
        )}

        {cooling && <JambCooldownCard cooldown={cooldown} index={0} />}

        {/* Profile + next level — one row */}
        <Card index={0} style={styles.profile}>
          <View style={styles.topRow}>
            <View style={styles.userCol}>
              <View style={styles.userHead}>
                <Avatar
                  source={user?.avatar?.image}
                  data={{ user }}
                  size={46}
                  border={{ width: 2, color: "#fff" }}
                />
                <AppText fontWeight="black" size={15} numberOfLines={2} style={styles.userName}>
                  {name}
                </AppText>
              </View>

              <View style={styles.metaRow}>
                <Ionicons name="business" size={12} color={J.muted} />
                <AppText fontWeight="medium" size={11.5} numberOfLines={1} style={styles.meta}>
                  {school}
                </AppText>
              </View>
              {Boolean(classLine) && (
                <View style={styles.metaRow}>
                  <Ionicons name="school" size={12} color={J.muted} />
                  <AppText fontWeight="medium" size={11.5} numberOfLines={1} style={styles.meta}>
                    {classLine}
                  </AppText>
                </View>
              )}
              {lifetime !== null && (
                <Chip
                  icon={info.level.icon}
                  label={info.level.name}
                  color={info.level.color}
                  bg={info.level.bg}
                  style={{ marginTop: 8 }}
                />
              )}
            </View>

            <View style={styles.nextCol}>
              {lifetime === null ? (
                <Skeleton style={{ height: 92 }} />
              ) : (
                <>
                  <View style={styles.nextHead}>
                    <AppText fontWeight="bold" size={12} numberOfLines={1} style={{ color: J.deep, flex: 1 }}>
                      {info.next ? `Next: ${info.next.name}` : "Top level"}
                    </AppText>
                    <Ionicons name="chevron-forward" size={14} color={J.muted} />
                  </View>
                  <AnimatedBar percent={info.progress * 100} color={J.green} height={8} track="#fff" />
                  <AppText fontWeight="medium" size={10.5} style={{ color: J.muted, marginTop: 6 }}>
                    {lifetime.toLocaleString()}
                    {info.next ? ` / ${info.next.min.toLocaleString()}` : ""} correct
                  </AppText>
                  <View style={styles.keepGoing}>
                    <Ionicons name="trophy" size={13} color={J.amber} />
                    <AppText fontWeight="semibold" size={10.5} style={{ color: J.ink, marginLeft: 5, flex: 1 }}>
                      Keep going!
                    </AppText>
                  </View>
                </>
              )}
            </View>
          </View>
        </Card>

        {/* Subject performance + round progress */}
        <Card index={1}>
          <View style={styles.sectionHead}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <AppText fontWeight="black" size={19} style={{ color: J.ink }}>
                Your Subject Performance
              </AppText>
              <AppText fontWeight="medium" size={12} style={{ color: J.muted, marginTop: 2 }}>
                Tap the subjects you want to practise now.
              </AppText>
            </View>
            <View style={styles.headRight}>
              <Animated.View key={picked.length} entering={popIn}>
                <Chip
                  icon="checkmark-circle"
                  label={`${picked.length}/${selected.length} selected`}
                  color={picked.length ? "#fff" : J.deep}
                  bg={picked.length ? J.green : J.mintStrong}
                />
              </Animated.View>
              {available.length > 0 && (
                <JambPressable onPress={toggleAll} style={{ marginTop: 6 }}>
                  <AppText fontWeight="bold" size={11} style={{ color: J.deep }}>
                    {allPicked ? "Clear" : "Select all"}
                  </AppText>
                </JambPressable>
              )}
            </View>
          </View>

          {Boolean(summary) && !cooling && <RoundProgress round={round} subjects={selected} />}

          <View style={styles.perfGrid}>
            {perf === null
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} style={{ width: cardW, height: 150 }} />
                ))
              : perf.map((p, i) => (
                  <SubjectPerfCard
                    key={p._id}
                    item={p}
                    index={i}
                    width={cardW}
                    locked={isLocked(p._id)}
                    cooling={cooling}
                    shortLeft={cooldown.short}
                    roundScore={completed[p._id]?.percent}
                    selected={picked.includes(p._id)}
                    onPress={togglePick}
                  />
                ))}
          </View>
        </Card>

        {/* History + average */}
        <JambHistoryCard summary={summary} index={2} />

        {/* Achievement levels */}
        <Card index={3} style={styles.levels}>
          <View style={styles.levelsHead}>
            <View style={styles.medal}>
              <Ionicons name="medal" size={28} color={J.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText fontWeight="black" size={17} style={{ color: J.ink }}>
                Achievement Levels
              </AppText>
              <AppText fontWeight="medium" size={12} style={{ color: J.muted, marginTop: 2 }}>
                Complete more questions to unlock higher levels and earn greater rewards!
              </AppText>
            </View>
          </View>

          <ScrollView
            ref={levelScroll}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 12, paddingRight: 8 }}
          >
            {LEVELS.map((l, i) => (
              <LevelPill key={l.key} level={l} index={i} active={lifetime !== null && i === info.index} />
            ))}
          </ScrollView>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <JambButton
          icon={cooling ? "time" : "arrow-forward"}
          title={
            cooling
              ? `Next round in ${cooldown.hms}`
              : picked.length
                ? "Continue"
                : available.length
                  ? "Select a subject to practise"
                  : "Round complete"
          }
          disabled={!picked.length}
          onPress={() => onContinue(selected.filter((x) => picked.includes(x._id)))}
        />
      </View>
    </View>
  );
};

export default JambOverviewStep;

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4 },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DDF3E4",
    borderWidth: 1,
    borderColor: "#BFE5CB",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  noticeText: { color: J.ink, marginLeft: 10, flex: 1, lineHeight: 17 },
  profile: { backgroundColor: "#EAF7DD" },
  topRow: { flexDirection: "row", alignItems: "stretch" },
  userCol: { flex: 1.15, paddingRight: 8 },
  userHead: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  userName: { color: J.ink, marginLeft: 8, flex: 1, textTransform: "capitalize" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  meta: { color: J.ink, marginLeft: 5, flexShrink: 1 },
  nextCol: {
    flex: 1,
    backgroundColor: "#F6FBF1",
    borderRadius: 16,
    padding: 10,
    justifyContent: "center",
  },
  nextHead: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  keepGoing: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  sectionHead: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  headRight: { alignItems: "flex-end" },
  round: {
    backgroundColor: "#F4FAEE",
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
  },
  segs: { flexDirection: "row", gap: 6 },
  seg: { flex: 1, height: 6, borderRadius: 3 },
  perfGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  perf: { borderRadius: 18, borderWidth: 1.5, padding: 10 },
  perfTop: { flexDirection: "row", alignItems: "center" },
  perfName: { color: J.ink, marginLeft: 8, flex: 1, textTransform: "capitalize" },
  perfMid: { flexDirection: "row", alignItems: "center", marginVertical: 10 },
  perfFoot: { flexDirection: "row", justifyContent: "space-between", marginTop: 7 },
  pick: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  levels: { backgroundColor: "#EEF8E6", borderWidth: 1, borderColor: J.mintStrong },
  levelsHead: { flexDirection: "row", alignItems: "center" },
  medal: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFF1BF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  levelWrap: { flexDirection: "row", alignItems: "center" },
  level: {
    width: 108,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    marginHorizontal: 2,
  },
  levelActive: { backgroundColor: "#DCEFCB" },
  levelIcon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  footer: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 6 },
});
