/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
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
  LEVELS,
  getLevelInfo,
  levelRangeLabel,
} from "../../helpers/jambConfig";
import { T, TINTS } from "./JambTheme";
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
  Loader,
  ProgressRing,
  SectionTitle,
  SubjectIcon,
  enter,
} from "./JambUI";

const fmt = (n) => Number(n ?? 0).toLocaleString();

// ─── Subject card (selectable, lockable) ─────────────────────────────────────
const SubjectPerfCard = ({
  item,
  index,
  width,
  selected,
  locked,
  cooling,
  shortLeft,
  roundScore,
  onPress,
}) => {
  const tint = TINTS[index % TINTS.length];
  const sel = useSharedValue(selected ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    sel.value = withTiming(selected ? 1 : 0, { duration: 240 });
  }, [selected]);

  const frame = useAnimatedStyle(() => ({
    borderColor: interpolateColor(sel.value, [0, 1], [T.line, T.green]),
    backgroundColor: interpolateColor(
      sel.value,
      [0, 1],
      ["#FFFFFF", T.greenSoft],
    ),
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

  const accent = locked ? "#A9B3A6" : tint.bar;

  return (
    <Animated.View
      entering={enter(index, 220)}
      layout={LAYOUT}
      style={{ width }}
    >
      <Animated.View
        style={[
          styles.perf,
          locked
            ? { backgroundColor: T.lockedBg, borderColor: T.lockedLine }
            : frame,
        ]}
      >
        <JambPressable
          onPress={press}
          disabled={locked}
          scaleTo={locked ? 1 : 0.98}
        >
          <View style={styles.perfTop}>
            <SubjectIcon
              subject={item}
              size={36}
              bg={locked ? "#E9E5D6" : tint.bg}
              radius={12}
            />
            <AppText
              fontWeight="bold"
              size={12.5}
              numberOfLines={2}
              style={styles.perfName}
            >
              {item.name}
            </AppText>
            {locked ? (
              <View style={[styles.pick, { backgroundColor: "#CFC9B3" }]}>
                <Ionicons name="lock-closed" size={11} color="#fff" />
              </View>
            ) : selected ? (
              <Animated.View
                key="on"
                entering={popIn}
                exiting={popOut}
                style={[styles.pick, { backgroundColor: T.green }]}
              >
                <Ionicons name="checkmark" size={12} color="#fff" />
              </Animated.View>
            ) : (
              <Animated.View
                key="off"
                entering={popIn}
                exiting={popOut}
                style={[styles.pick, { backgroundColor: T.track }]}
              >
                <Ionicons name="add" size={13} color={T.faint} />
              </Animated.View>
            )}
          </View>

          <View style={styles.perfMid}>
            <ProgressRing
              size={46}
              stroke={5}
              percent={item.percent}
              color={accent}
              track={locked ? "#E4DFCB" : T.track}
              delay={400 + index * 120}
            >
              <AppText fontWeight="black" size={10.5} style={{ color: T.ink }}>
                {item.percent}%
              </AppText>
            </ProgressRing>
            <View style={{ marginLeft: 8, flex: 1 }}>
              <AppText fontWeight="black" size={17} style={{ color: T.ink }}>
                {fmt(item.dbTotal)}
              </AppText>
              <AppText fontWeight="medium" size={10} style={{ color: T.sub }}>
                questions in bank
              </AppText>
            </View>
          </View>

          <AnimatedBar
            percent={item.percent}
            color={accent}
            height={9}
            delay={500 + index * 120}
          />

          <View style={styles.perfFoot}>
            {locked ? (
              <>
                <AppText
                  fontWeight="bold"
                  size={10}
                  style={{ color: T.greenDark }}
                >
                  {cooling ? "Resting" : `Done · ${roundScore}%`}
                </AppText>
                <AppText
                  fontWeight="semibold"
                  size={10}
                  style={{ color: T.sub }}
                >
                  {cooling ? shortLeft : "Next round"}
                </AppText>
              </>
            ) : (
              <>
                <AppText
                  fontWeight="bold"
                  size={10}
                  style={{ color: tint.ink }}
                >
                  {fmt(item.correct)} correct
                </AppText>
                <AppText
                  fontWeight="semibold"
                  size={10}
                  style={{ color: T.sub }}
                >
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
    backgroundColor: interpolateColor(v.value, [0, 1], [T.track, T.green]),
  }));
  return <Animated.View style={[styles.seg, style]} />;
};

const RoundProgress = ({ round, subjects }) => {
  const done = subjects.filter((s) => round?.completed?.[s._id]).length;
  return (
    <View style={styles.round}>
      <View style={styles.roundHead}>
        <AppText fontWeight="black" size={12} style={{ color: T.greenDark }}>
          Round {round?.number ?? 1}
        </AppText>
        <AppText fontWeight="bold" size={11.5} style={{ color: T.sub }}>
          {done}/{subjects.length} completed
        </AppText>
      </View>
      <View style={styles.segs}>
        {subjects.map((s) => (
          <Seg key={s._id} done={Boolean(round?.completed?.[s._id])} />
        ))}
      </View>
      <AppText
        fontWeight="medium"
        size={10.5}
        style={{ color: T.sub, marginTop: 7, lineHeight: 15 }}
      >
        Finish all {subjects.length} subjects to unlock your score prediction.
        Completed subjects stay locked until the next round.
      </AppText>
    </View>
  );
};

const LevelPill = ({ level, active, index }) => (
  <Animated.View
    entering={FadeIn.delay(500 + index * 90)}
    style={styles.levelWrap}
  >
    {index > 0 && (
      <Ionicons name="chevron-forward" size={16} color={T.lineDark} />
    )}
    <View style={[styles.level, active && styles.levelActive]}>
      <View style={[styles.levelIcon, { backgroundColor: level.bg }]}>
        <Ionicons name={level.icon} size={22} color={level.color} />
      </View>
      <AppText
        fontWeight="black"
        size={13}
        style={{ color: T.ink, marginTop: 6 }}
      >
        {level.name}
      </AppText>
      <AppText
        fontWeight="bold"
        size={10.5}
        style={{ color: T.ink, marginTop: 2 }}
      >
        {levelRangeLabel(level)}
      </AppText>
      <AppText fontWeight="medium" size={9.5} style={{ color: T.sub }}>
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
const JambOverviewStep = ({
  selected = [],
  user,
  summary,
  notice,
  onContinue,
  onExpire,
}) => {
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
    jambService
      .getSubjectPerformance(selected)
      .then((p) => alive && setPerf(p));
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
    setPicked((p) =>
      p.includes(item._id)
        ? p.filter((id) => id !== item._id)
        : [...p, item._id],
    );
  const toggleAll = () =>
    setPicked(allPicked ? [] : available.map((x) => x._id));

  const info = getLevelInfo(lifetime ?? 0);
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    capFirstLetter(user?.username ?? "Student");
  // Adjust these field names to match your user model
  const school = user?.school?.name ?? user?.schoolName ?? "Guru School";
  const classLine = [user?.class?.level ?? user?.classLevel, user?.department]
    .filter(Boolean)
    .join(" • ");

  const cardW = Math.floor((width - 32 - 28 - 4 - 10) / 2);

  useEffect(() => {
    if (lifetime === null) return;
    const t = setTimeout(
      () =>
        levelScroll.current?.scrollTo({
          x: Math.max(info.index * 118 - 30, 0),
          animated: true,
        }),
      900,
    );
    return () => clearTimeout(t);
  }, [lifetime]);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {noticeOn && Boolean(notice) && (
          <Animated.View
            entering={enter(0)}
            exiting={FadeOut.duration(200)}
            layout={LAYOUT}
            style={styles.notice}
          >
            <View style={styles.noticeIcon}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </View>
            <AppText fontWeight="bold" size={12.5} style={styles.noticeText}>
              {notice.text}
            </AppText>
          </Animated.View>
        )}

        {cooling && <JambCooldownCard cooldown={cooldown} index={0} />}

        {/* Student ID card */}
        <Card index={0} style={styles.profile}>
          <View style={styles.idStrip}>
            <AppText fontWeight="black" size={9.5} style={styles.idStripText}>
              STUDENT CARD
            </AppText>
            {lifetime !== null && (
              <Chip
                icon={info.level.icon}
                label={info.level.name}
                color={info.level.color}
                bg={info.level.bg}
              />
            )}
          </View>

          <View style={styles.topRow}>
            <View style={styles.userCol}>
              <View style={styles.userHead}>
                <Avatar
                  source={user?.avatar?.image}
                  data={{ user }}
                  size={48}
                  border={{ width: 2, color: T.ink }}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <AppText
                    fontWeight="black"
                    size={15}
                    numberOfLines={2}
                    style={styles.userName}
                  >
                    {name}
                  </AppText>
                  <View style={styles.metaRow}>
                    <Ionicons name="business" size={12} color={T.sub} />
                    <AppText
                      fontWeight="medium"
                      size={11.5}
                      numberOfLines={1}
                      style={styles.meta}
                    >
                      {school}
                    </AppText>
                  </View>
                  {Boolean(classLine) && (
                    <View style={styles.metaRow}>
                      <Ionicons name="school" size={12} color={T.sub} />
                      <AppText
                        fontWeight="medium"
                        size={11.5}
                        numberOfLines={1}
                        style={{
                          ...styles.meta,
                          textTransform: "uppercase",
                          flex: 1,
                        }}
                      >
                        {classLine}
                      </AppText>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.nextCol}>
            {lifetime === null ? (
              <Loader size={44} style={{ paddingVertical: 4 }} />
            ) : (
              <>
                <View style={styles.nextHead}>
                  <Ionicons name="trophy" size={14} color={T.yellowDark} />
                  <AppText
                    fontWeight="black"
                    size={12}
                    numberOfLines={1}
                    style={{ color: T.ink, flex: 1, marginLeft: 6 }}
                  >
                    {info.next ? `Next: ${info.next.name}` : "Top level"}
                  </AppText>
                  <AppText
                    fontWeight="bold"
                    size={10.5}
                    style={{ color: T.sub }}
                  >
                    {lifetime.toLocaleString()}
                    {info.next
                      ? ` / ${info.next.min.toLocaleString()}`
                      : ""}{" "}
                    correct
                  </AppText>
                </View>
                <AnimatedBar
                  percent={info.progress * 100}
                  color={T.yellow}
                  height={12}
                  track="#fff"
                />
                <AppText
                  fontWeight="semibold"
                  size={10.5}
                  style={{ color: T.yellowInk, marginTop: 6 }}
                >
                  Keep going!
                </AppText>
              </>
            )}
          </View>
        </Card>

        {/* Subject performance + round progress */}
        <Card index={1}>
          <SectionTitle
            icon="library"
            color={T.blueDark}
            bg={T.blueSoft}
            title="Your Subjects"
            sub="Tap the subjects you want to practise now."
            right={
              <View style={styles.headRight}>
                <Animated.View key={picked.length} entering={popIn}>
                  <Chip
                    icon="checkmark-circle"
                    label={`${picked.length}/${selected.length}`}
                    color={picked.length ? "#fff" : T.greenDark}
                    bg={picked.length ? T.green : T.greenSoft}
                  />
                </Animated.View>
                {available.length > 0 && (
                  <JambPressable onPress={toggleAll} style={{ marginTop: 6 }}>
                    <AppText
                      fontWeight="black"
                      size={10.5}
                      style={{ color: T.greenDark, letterSpacing: 0.5 }}
                    >
                      {allPicked ? "CLEAR" : "SELECT ALL"}
                    </AppText>
                  </JambPressable>
                )}
              </View>
            }
          />

          {Boolean(summary) && !cooling && (
            <RoundProgress round={round} subjects={selected} />
          )}

          <View style={styles.perfGrid}>
            {perf === null ? (
              <Loader
                size={72}
                label="Loading your subjects…"
                style={{ width: "100%", paddingVertical: 36 }}
              />
            ) : (
              perf.map((p, i) => (
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
              ))
            )}
          </View>
        </Card>

        {/* History + average */}
        <JambHistoryCard summary={summary} index={2} />

        {/* Achievement levels */}
        <Card index={3} style={styles.levels}>
          <View style={styles.levelsHead}>
            <View style={styles.medal}>
              <Ionicons name="medal" size={26} color={T.yellowInk} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText fontWeight="black" size={17} style={{ color: T.ink }}>
                Achievement Levels
              </AppText>
              <AppText
                fontWeight="medium"
                size={11.5}
                style={{ color: T.sub, marginTop: 2, lineHeight: 16 }}
              >
                Complete more questions to unlock higher levels and earn greater
                rewards!
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
              <LevelPill
                key={l.key}
                level={l}
                index={i}
                active={lifetime !== null && i === info.index}
              />
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
          onPress={() =>
            onContinue(selected.filter((x) => picked.includes(x._id)))
          }
        />
      </View>
    </View>
  );
};

export default JambOverviewStep;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.paper },
  scroll: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4 },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.greenSoft,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.greenLine,
    borderRadius: 18,
    padding: 12,
    marginBottom: 14,
  },
  noticeIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: T.green,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeText: { color: T.ink, marginLeft: 10, flex: 1, lineHeight: 17 },
  profile: { paddingTop: 0, overflow: "hidden" },
  idStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: T.blueSoft,
    marginHorizontal: -14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  idStripText: { color: T.blueDark, letterSpacing: 1.4 },
  topRow: { flexDirection: "row", alignItems: "stretch" },
  userCol: { flex: 1 },
  userHead: { flexDirection: "row", alignItems: "center" },
  userName: { color: T.ink, textTransform: "capitalize" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  meta: { color: T.sub, marginLeft: 5, flexShrink: 1 },
  nextCol: {
    backgroundColor: T.yellowSoft,
    borderWidth: 2,
    borderColor: T.yellowLine,
    borderRadius: 16,
    padding: 10,
    marginTop: 12,
    justifyContent: "center",
  },
  nextHead: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  headRight: { alignItems: "flex-end" },
  round: {
    backgroundColor: T.paper,
    borderWidth: 2,
    borderColor: T.line,
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
  },
  roundHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  segs: { flexDirection: "row", gap: 6 },
  seg: { flex: 1, height: 8, borderRadius: 4 },
  perfGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  perf: { borderRadius: 18, borderWidth: 2, borderBottomWidth: 4, padding: 10 },
  perfTop: { flexDirection: "row", alignItems: "center" },
  perfName: {
    color: T.ink,
    marginLeft: 8,
    flex: 1,
    textTransform: "capitalize",
  },
  perfMid: { flexDirection: "row", alignItems: "center", marginVertical: 10 },
  perfFoot: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  pick: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  levels: { backgroundColor: T.paper },
  levelsHead: { flexDirection: "row", alignItems: "center" },
  medal: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: T.yellowSoft,
    borderWidth: 2,
    borderColor: T.yellowLine,
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
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
    marginHorizontal: 2,
  },
  levelActive: {
    backgroundColor: "#fff",
    borderColor: T.green,
    borderBottomWidth: 4,
  },
  levelIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: T.paper,
    borderTopWidth: 2,
    borderTopColor: T.line,
  },
});
