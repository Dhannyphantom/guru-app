/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Screen from "../components/Screen";
import AppLogo from "../components/AppLogo";
import AppModal from "../components/AppModal";
import NewAnnouncement from "../components/NewAnnouncement";
import AppText from "../components/jamb/JambText";
import { T, TINTS } from "../components/jamb/JambTheme";
import { LAYOUT, enter } from "../components/jamb/JambMotion";
import {
  AnimatedBar,
  Card,
  Chip,
  Chunky,
  JambButton,
  JambPressable,
  Loader,
  Note,
  ProgressRing,
  SectionTitle,
  Skeleton,
  SubjectIcon,
  useCountUp,
} from "../components/jamb/JambUI";
import { selectUser } from "../context/usersSlice";
import {
  selectSchool,
  useFetchSchoolQuery,
  useFetchSchoolDashboardQuery,
} from "../context/schoolSlice";
import { PAD_BOTTOM } from "../helpers/dataStore";
import { capFirstLetter } from "../helpers/helperFunctions";

// ═════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═════════════════════════════════════════════════════════════════════════════
const CLASS_ORDER = ["jss 1", "jss 2", "jss 3", "sss 1", "sss 2", "sss 3"];
const classRank = (level) => {
  const i = CLASS_ORDER.indexOf(String(level || "").toLowerCase());
  return i === -1 ? 99 : i;
};
const classLabel = (level) =>
  String(level || "")
    .toUpperCase()
    .replace("SSS", "SS");

const TONES = {
  green: {
    bg: T.greenSoft,
    border: T.greenLine,
    bar: T.green,
    ink: T.greenDark,
  },
  blue: TINTS[0],
  yellow: TINTS[1],
  coral: TINTS[2],
  purple: TINTS[3],
};

/** accuracy % -> colour + wording used everywhere in the screen */
const toneFor = (p = 0) =>
  p >= 70
    ? { ...TONES.green, label: "Strong" }
    : p >= 50
      ? { ...TONES.yellow, label: "Average" }
      : { ...TONES.coral, label: "Needs help" };

const READINESS = {
  "Exam Ready": { tone: TONES.green, icon: "ribbon" },
  "On Track": { tone: TONES.blue, icon: "thumbs-up" },
  "Needs Attention": { tone: TONES.yellow, icon: "alert-circle" },
  "At Risk": { tone: TONES.coral, icon: "warning" },
};

const BIG_ACTIONS = [
  {
    id: "quiz",
    name: "Quiz",
    icon: "rocket",
    face: T.green,
    lip: T.greenDark,
    text: "#FFFFFF",
    nav: { screen: "/(protected)/school/quiz", data: {} },
  },
  {
    id: "assignment",
    name: "Assignments",
    icon: "book",
    face: T.blue,
    lip: T.blueDark,
    text: "#FFFFFF",
    nav: {
      screen: "/(protected)/school/assignments",
      data: { screen: "Home" },
    },
  },
  {
    id: "announcement",
    name: "Announce",
    icon: "megaphone",
    face: T.yellow,
    lip: T.yellowDark,
    text: T.ink,
    modal: "announcement",
  },
];

const MINI_ACTIONS = [
  {
    id: "classes",
    name: "Classes",
    icon: "school",
    tone: TONES.coral,
    nav: { screen: "/(protected)/school/classes", data: { screen: "Home" } },
  },
  {
    id: "verify-students",
    name: "Verify Students",
    icon: "person-add",
    tone: TONES.purple,
    nav: {
      screen: "/(protected)/school/instance_verify",
      data: { type: "student" },
    },
  },
  {
    id: "verify-teachers",
    name: "Verify Teachers",
    icon: "shield-checkmark",
    tone: TONES.blue,
    nav: {
      screen: "/(protected)/school/instance_verify",
      data: { type: "teacher" },
    },
  },
  {
    id: "subscription",
    name: "Subscription",
    icon: "card",
    tone: TONES.green,
    nav: { screen: "/(protected)/school/subs", data: { screen: "School" } },
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════════════════
const fmt = (n, d = 1) => (n == null ? "—" : Number(n).toFixed(d));
const capName = (s) => (s ? s.split(" ").map(capFirstLetter).join(" ") : "");
const msToMins = (ms) => (ms ? `${Math.round(ms / 60000)}m` : "—");
const initialsOf = (s) =>
  `${s?.firstName?.[0] ?? ""}${s?.lastName?.[0] ?? ""}`.toUpperCase() || "?";

const ago = (ts) => {
  if (!ts) return "";
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

// ═════════════════════════════════════════════════════════════════════════════
// CACHE  (stale-while-revalidate, per teacher)
//
// This screen only ever renders for teacher accounts, and the cache is keyed
// by the teacher's user id, so nobody else touches it. On open we read the
// saved snapshot and paint it instantly; the network queries keep running in
// the background and replace it (and re-save it) when they return.
// ═════════════════════════════════════════════════════════════════════════════
const CACHE_VERSION = 1;
const cacheKey = (uid) => `teacher_home_cache_v${CACHE_VERSION}_${uid}`;

const useTeacherHomeCache = (userId) => {
  const [cache, setCache] = useState(null);
  const [ready, setReady] = useState(false);
  const latest = useRef(null);

  useEffect(() => {
    let alive = true;
    latest.current = null;
    setCache(null);

    if (!userId) {
      setReady(true);
      return undefined;
    }

    setReady(false);
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(cacheKey(userId));
        if (raw && alive && !latest.current) {
          const parsed = JSON.parse(raw);
          latest.current = parsed;
          setCache(parsed);
        }
      } catch (_) {
        // corrupt / unreadable cache -> just behave as if there is none
      }
      if (alive) setReady(true);
    })();

    return () => {
      alive = false;
    };
  }, [userId]);

  /** merge a patch into the saved snapshot */
  const save = useCallback(
    (patch) => {
      if (!userId) return;
      const next = { ...(latest.current || {}), ...patch };
      latest.current = next;
      AsyncStorage.setItem(cacheKey(userId), JSON.stringify(next)).catch(
        () => {},
      );
    },
    [userId],
  );

  return { cache, ready, save };
};

// ═════════════════════════════════════════════════════════════════════════════
// SMALL PIECES
// ═════════════════════════════════════════════════════════════════════════════

/** Class badge: stage on top, number below (same as Classroom screen). */
const LevelBadge = ({ level, tone, size = 52 }) => {
  const [stage, num] = classLabel(level).split(" ");
  return (
    <View
      style={[
        styles.levelBadge,
        {
          width: size,
          height: size + 6,
          backgroundColor: tone.bg,
          borderColor: tone.border,
        },
      ]}
    >
      <AppText
        fontWeight="black"
        size={9.5}
        style={{ color: tone.ink, letterSpacing: 1 }}
      >
        {stage}
      </AppText>
      <AppText
        fontWeight="black"
        size={size / 2.4}
        style={{ color: tone.ink, marginTop: -3 }}
      >
        {num}
      </AppText>
    </View>
  );
};

/** Tiny "what is the data doing" pill in the header. */
const SyncPill = ({ syncing, failed, stamp }) => {
  let icon = "checkmark-circle";
  let text = stamp ? `Updated ${ago(stamp)}` : "Up to date";
  let tone = TONES.green;

  if (syncing) {
    text = "Updating…";
    tone = TONES.blue;
  } else if (failed) {
    icon = "cloud-offline";
    text = stamp ? `Offline · saved ${ago(stamp)}` : "Offline";
    tone = TONES.coral;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      layout={LAYOUT}
      style={[
        styles.pill,
        { backgroundColor: tone.bg, borderColor: tone.border },
      ]}
    >
      {syncing ? (
        <ActivityIndicator
          size="small"
          color={tone.ink}
          style={{ transform: [{ scale: 0.7 }] }}
        />
      ) : (
        <Ionicons name={icon} size={13} color={tone.ink} />
      )}
      <AppText
        fontWeight="bold"
        size={11}
        style={{ color: tone.ink, marginLeft: 4 }}
        numberOfLines={1}
      >
        {text}
      </AppText>
    </Animated.View>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// HERO  (chalkboard)
// ═════════════════════════════════════════════════════════════════════════════
const HeroStat = ({ icon, label, value, suffix = "", delay }) => {
  const shown = useCountUp(value ?? 0, 900, delay);
  return (
    <View style={styles.heroStat}>
      <View style={styles.heroStatIcon}>
        <Ionicons name={icon} size={16} color={T.chalk} />
      </View>
      <AppText fontWeight="black" size={24} style={styles.heroStatValue}>
        {shown.toLocaleString()}
        {suffix}
      </AppText>
      <AppText fontWeight="semibold" size={11} style={styles.heroStatLabel}>
        {label}
      </AppText>
    </View>
  );
};

const Hero = ({ user, schoolName, overview }) => {
  const accuracy = Math.round(overview?.overallAccuracy ?? 0);
  const shownAcc = useCountUp(accuracy, 1000, 200);
  const ringColor =
    accuracy >= 70 ? "#5BE08C" : accuracy >= 50 ? T.yellow : "#FF8A78";
  const verdict =
    accuracy >= 70
      ? { icon: "sparkles", text: "Your school is doing great" }
      : accuracy >= 50
        ? { icon: "trending-up", text: "Good progress, keep pushing" }
        : { icon: "flame", text: "Time to boost practice" };

  return (
    <Animated.View entering={enter(0)} layout={LAYOUT} style={styles.heroWrap}>
      <View style={styles.heroClip}>
        <View pointerEvents="none" style={styles.heroFrame} />
        <AppText
          fontWeight="black"
          size={38}
          style={[styles.doodle, { top: 6, right: 120 }]}
        >
          π
        </AppText>
        <AppText
          fontWeight="black"
          size={30}
          style={[styles.doodle, { bottom: 52, left: "42%" }]}
        >
          √
        </AppText>

        <View style={styles.heroTop}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <AppText
              fontWeight="semibold"
              size={12.5}
              style={{ color: T.chalkSoft }}
            >
              {greeting()},
            </AppText>
            <AppText
              fontWeight="black"
              size={22}
              numberOfLines={1}
              style={{ color: T.chalk }}
            >
              {capName(user?.preffix)} {capName(user?.firstName)}
            </AppText>
            <AppText
              fontWeight="medium"
              size={12.5}
              numberOfLines={2}
              style={{
                color: T.chalkSoft,
                marginTop: 3,
                textTransform: "capitalize",
              }}
            >
              {schoolName}
            </AppText>
            <Chip
              icon={verdict.icon}
              label={verdict.text}
              color={T.ink}
              bg={T.chalk}
              style={{ marginTop: 10 }}
            />
          </View>

          <ProgressRing
            percent={accuracy}
            size={96}
            stroke={11}
            color={ringColor}
            track="rgba(255,248,231,0.15)"
            delay={250}
          >
            <AppText fontWeight="black" size={22} style={{ color: T.chalk }}>
              {shownAcc}%
            </AppText>
            <AppText
              fontWeight="semibold"
              size={9.5}
              style={{ color: T.chalkSoft, marginTop: -2 }}
            >
              ACCURACY
            </AppText>
          </ProgressRing>
        </View>

        <View style={styles.heroStatRow}>
          <HeroStat
            icon="people"
            label="Students"
            value={overview?.totalStudents}
            delay={250}
          />
          <HeroStat
            icon="person"
            label="Teachers"
            value={overview?.totalTeachers}
            delay={330}
          />
          <HeroStat
            icon="flash"
            label="Active"
            value={Math.round(overview?.participationRate ?? 0)}
            suffix="%"
            delay={410}
          />
        </View>
      </View>
    </Animated.View>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// QUICK ACTIONS
// ═════════════════════════════════════════════════════════════════════════════
const BigAction = ({ action, index, onPress }) => (
  <Animated.View
    entering={enter(index, 120)}
    layout={LAYOUT}
    style={{ flex: 1 }}
  >
    <Chunky
      face={action.face}
      lip={action.lip}
      radius={18}
      depth={5}
      onPress={() => onPress(action)}
      contentStyle={styles.bigAction}
    >
      <View
        style={[styles.bigIcon, { backgroundColor: "rgba(255,255,255,0.25)" }]}
      >
        <Ionicons name={action.icon} size={22} color={action.text} />
      </View>
      <AppText
        fontWeight="black"
        size={12.5}
        numberOfLines={1}
        style={{ color: action.text, marginTop: 8 }}
      >
        {action.name}
      </AppText>
    </Chunky>
  </Animated.View>
);

const MiniAction = ({ action, index, onPress }) => (
  <Animated.View
    entering={enter(index, 260)}
    layout={LAYOUT}
    style={{ width: "48.5%" }}
  >
    <JambPressable
      onPress={() => onPress(action)}
      scaleTo={0.97}
      contentStyle={styles.miniAction}
    >
      <View
        style={[
          styles.miniIcon,
          { backgroundColor: action.tone.bg, borderColor: action.tone.border },
        ]}
      >
        <Ionicons name={action.icon} size={17} color={action.tone.ink} />
      </View>
      <AppText
        fontWeight="bold"
        size={12.5}
        numberOfLines={1}
        style={{ color: T.ink, flex: 1, marginLeft: 10 }}
      >
        {action.name}
      </AppText>
      <Ionicons name="chevron-forward" size={15} color={T.faint} />
    </JambPressable>
  </Animated.View>
);

const QuickActions = ({ onPress }) => (
  <View style={{ marginBottom: 6 }}>
    <SectionTitle
      icon="apps"
      title="Quick actions"
      sub="Everything you do most, one tap away"
      color={T.blueDark}
      bg={T.blueSoft}
    />
    <View style={styles.bigRow}>
      {BIG_ACTIONS.map((a, i) => (
        <BigAction key={a.id} action={a} index={i} onPress={onPress} />
      ))}
    </View>
    <View style={styles.miniWrap}>
      {MINI_ACTIONS.map((a, i) => (
        <MiniAction key={a.id} action={a} index={i} onPress={onPress} />
      ))}
    </View>
  </View>
);

// ═════════════════════════════════════════════════════════════════════════════
// STATS GRID
// ═════════════════════════════════════════════════════════════════════════════
const StatCard = ({ icon, label, value, text, sub, tone, index }) => {
  const shown = useCountUp(
    typeof value === "number" ? value : 0,
    900,
    150 + index * 60,
  );
  const display =
    text ?? (value == null ? "—" : Number(shown).toLocaleString());

  return (
    <Card index={index} base={120} style={styles.statCard}>
      <View
        style={[
          styles.statIcon,
          { backgroundColor: tone.bg, borderColor: tone.border },
        ]}
      >
        <Ionicons name={icon} size={18} color={tone.ink} />
      </View>
      <AppText
        fontWeight="black"
        size={24}
        style={{ color: T.ink, marginTop: 8 }}
      >
        {display}
      </AppText>
      <AppText fontWeight="bold" size={12} style={{ color: T.sub }}>
        {label}
      </AppText>
      {Boolean(sub) && (
        <AppText
          fontWeight="medium"
          size={10.5}
          style={{ color: T.faint, marginTop: 1 }}
        >
          {sub}
        </AppText>
      )}
    </Card>
  );
};

const StatsGrid = ({ overview, engagement }) => {
  const students = overview?.totalStudents ?? 0;
  const quizzes = overview?.totalQuizzesTaken;
  const perStudent = students && quizzes != null ? quizzes / students : null;

  const stats = [
    {
      icon: "library",
      label: "Quizzes taken",
      value: quizzes,
      tone: TONES.blue,
    },
    {
      icon: "checkmark-done",
      label: "Questions answered",
      value: overview?.totalQuestionsAnswered,
      tone: TONES.green,
    },
    {
      icon: "flash",
      label: "Active this month",
      value: engagement?.activeStudentsLast30d,
      sub: students ? `of ${students.toLocaleString()} students` : undefined,
      tone: TONES.yellow,
    },
    {
      icon: "timer",
      label: "Avg session",
      text: msToMins(engagement?.avgSessionDurationMs),
      sub: "per quiz sitting",
      tone: TONES.coral,
    },
    {
      icon: "today",
      label: "Quizzes per day",
      text:
        engagement?.avgQuizzesPerDay == null
          ? "—"
          : fmt(engagement.avgQuizzesPerDay, 1),
      sub: "school-wide",
      tone: TONES.purple,
    },
    {
      icon: "person",
      label: "Per student",
      text: perStudent == null ? "—" : fmt(perStudent, 1),
      sub: "quizzes on average",
      tone: TONES.green,
    },
  ];

  return (
    <View>
      <SectionTitle
        icon="stats-chart"
        title="At a glance"
        sub="How your school is using Guru"
        color={T.purpleDark}
        bg={T.purpleSoft}
      />
      <View style={styles.statGrid}>
        {stats.map((s, i) => (
          <StatCard key={s.label} index={i} {...s} />
        ))}
      </View>
    </View>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// EXAM READINESS
// ═════════════════════════════════════════════════════════════════════════════
const ReadinessSection = ({ items }) => {
  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => classRank(a.classLevel) - classRank(b.classLevel),
      ),
    [items],
  );

  return (
    <View>
      <SectionTitle
        icon="ribbon"
        title="Exam readiness"
        sub="WAEC / NECO / JAMB readiness by class"
        color={T.greenDark}
        bg={T.greenSoft}
      />
      {sorted.map((item, i) => {
        const meta = READINESS[item.readinessLabel] ?? {
          tone: TONES.blue,
          icon: "school",
        };
        return (
          <Card
            key={item.classLevel}
            index={i}
            base={80}
            style={styles.rowCard}
          >
            <View style={styles.rowTop}>
              <LevelBadge level={item.classLevel} tone={meta.tone} size={46} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Chip
                  icon={meta.icon}
                  label={item.readinessLabel}
                  color={meta.tone.ink}
                  bg={meta.tone.bg}
                />
                <AppText
                  fontWeight="medium"
                  size={11.5}
                  style={{ color: T.sub, marginTop: 5 }}
                >
                  {item.studentCount} student
                  {item.studentCount === 1 ? "" : "s"}
                </AppText>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <AppText
                  fontWeight="black"
                  size={22}
                  style={{ color: meta.tone.ink }}
                >
                  {fmt(item.avgReadiness, 0)}
                </AppText>
                <AppText
                  fontWeight="semibold"
                  size={10.5}
                  style={{ color: T.faint, marginTop: -2 }}
                >
                  out of 100
                </AppText>
              </View>
            </View>
            <View style={{ marginTop: 12 }}>
              <AnimatedBar
                percent={item.avgReadiness}
                color={meta.tone.bar}
                height={10}
                delay={250 + i * 80}
              />
            </View>
          </Card>
        );
      })}
    </View>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SUBJECTS
// ═════════════════════════════════════════════════════════════════════════════
const SUBJECT_PREVIEW = 5;

const SubjectsSection = ({ items }) => {
  const [showAll, setShowAll] = useState(false);
  const sorted = useMemo(
    () => [...items].sort((a, b) => b.accuracyRate - a.accuracyRate),
    [items],
  );
  const best = sorted[0];
  const worst = sorted.length > 1 ? sorted[sorted.length - 1] : null;
  const visible = showAll ? sorted : sorted.slice(0, SUBJECT_PREVIEW);

  return (
    <View>
      <SectionTitle
        icon="bar-chart"
        title="Subject performance"
        sub="School-wide accuracy per subject"
        color={T.blueDark}
        bg={T.blueSoft}
      />

      <Note
        tone="green"
        icon="trophy"
        title={`Strongest: ${capName(best.subjectName)}`}
        index={0}
        base={60}
      >
        <AppText
          fontWeight="medium"
          size={12}
          style={{ color: T.sub, marginTop: 2 }}
        >
          Students are getting {fmt(best.accuracyRate, 0)}% of questions right.
        </AppText>
      </Note>

      {worst && worst.accuracyRate < 70 && (
        <Note
          icon="flag"
          title={`Needs attention: ${capName(worst.subjectName)}`}
          index={1}
          base={60}
        >
          <AppText
            fontWeight="medium"
            size={12}
            style={{ color: "#4A4020", marginTop: 2 }}
          >
            Only {fmt(worst.accuracyRate, 0)}% accuracy. A good one to assign a
            quiz on.
          </AppText>
        </Note>
      )}

      <Card index={2} base={60} style={[styles.rowCard, { marginTop: 10 }]}>
        {visible.map((item, i) => {
          const tone = toneFor(item.accuracyRate);
          return (
            <View
              key={item.subjectId ?? item.subjectName}
              style={[
                styles.subjectRow,
                i === visible.length - 1 && { marginBottom: 0 },
              ]}
            >
              <SubjectIcon
                subject={{
                  name: item.subjectName,
                  image: item.image ?? item.subjectImage,
                }}
                size={36}
                bg={tone.bg}
                radius={12}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={styles.subjectHead}>
                  <AppText
                    fontWeight="bold"
                    size={12.5}
                    numberOfLines={1}
                    style={{
                      color: T.ink,
                      flex: 1,
                      textTransform: "capitalize",
                    }}
                  >
                    {capName(item.subjectName)}
                  </AppText>
                  <AppText
                    fontWeight="black"
                    size={13}
                    style={{ color: tone.ink }}
                  >
                    {fmt(item.accuracyRate, 0)}%
                  </AppText>
                </View>
                <AnimatedBar
                  percent={item.accuracyRate}
                  color={tone.bar}
                  height={8}
                  delay={200 + i * 60}
                />
              </View>
            </View>
          );
        })}

        {sorted.length > SUBJECT_PREVIEW && (
          <JambPressable
            onPress={() => setShowAll((v) => !v)}
            scaleTo={0.97}
            contentStyle={styles.moreBtn}
          >
            <AppText
              fontWeight="bold"
              size={12.5}
              style={{ color: T.greenDark }}
            >
              {showAll ? "Show less" : `Show all ${sorted.length} subjects`}
            </AppText>
            <Ionicons
              name={showAll ? "chevron-up" : "chevron-down"}
              size={15}
              color={T.greenDark}
              style={{ marginLeft: 4 }}
            />
          </JambPressable>
        )}
      </Card>
    </View>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// CLASS COMPARISON
// ═════════════════════════════════════════════════════════════════════════════
const ClassCard = ({ item, index, open, onToggle }) => {
  const tone = toneFor(item.avgAccuracy);
  return (
    <Card index={index} base={80} style={styles.rowCard}>
      <JambPressable onPress={onToggle} scaleTo={0.985}>
        <View style={styles.rowTop}>
          <LevelBadge level={item.classLevel} tone={tone} size={46} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.subjectHead}>
              <AppText fontWeight="black" size={20} style={{ color: tone.ink }}>
                {fmt(item.avgAccuracy, 0)}%
              </AppText>
              <Chip
                label={tone.label}
                color={tone.ink}
                bg={tone.bg}
                style={{ marginLeft: 8 }}
              />
            </View>
            <View style={styles.chipRow}>
              <Chip
                icon="people"
                label={`${item.studentCount}`}
                color={T.blueDark}
                bg={T.blueSoft}
              />
              <Chip
                icon="library"
                label={`${item.totalQuizzes}`}
                color={T.purpleDark}
                bg={T.purpleSoft}
                style={{ marginLeft: 6 }}
              />
              <Chip
                icon="timer"
                label={msToMins(item.avgDuration)}
                color={T.yellowInk}
                bg={T.yellowSoft}
                style={{ marginLeft: 6 }}
              />
            </View>
          </View>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={18}
            color={T.faint}
          />
        </View>
        <View style={{ marginTop: 12 }}>
          <AnimatedBar
            percent={item.avgAccuracy}
            color={tone.bar}
            height={10}
            delay={250 + index * 80}
          />
        </View>
      </JambPressable>

      {open && item.subjectBreakdown?.length > 0 && (
        <Animated.View entering={FadeIn.duration(250)} style={styles.expanded}>
          <AppText
            fontWeight="bold"
            size={11}
            style={{ color: T.faint, letterSpacing: 0.6, marginBottom: 8 }}
          >
            SUBJECTS IN THIS CLASS
          </AppText>
          {item.subjectBreakdown.map((s, i) => {
            const t = toneFor(s.accuracyRate);
            return (
              <View key={`${s.subjectName}-${i}`} style={styles.miniSubject}>
                <AppText
                  fontWeight="semibold"
                  size={11.5}
                  numberOfLines={1}
                  style={{
                    color: T.sub,
                    width: 92,
                    textTransform: "capitalize",
                  }}
                >
                  {capName(s.subjectName)}
                </AppText>
                <View style={{ flex: 1 }}>
                  <AnimatedBar
                    percent={s.accuracyRate}
                    color={t.bar}
                    height={7}
                    delay={i * 40}
                  />
                </View>
                <AppText
                  fontWeight="black"
                  size={11.5}
                  style={{ color: t.ink, width: 38, textAlign: "right" }}
                >
                  {fmt(s.accuracyRate, 0)}%
                </AppText>
              </View>
            );
          })}
        </Animated.View>
      )}
    </Card>
  );
};

const ClassesSection = ({ items }) => {
  const [openLevel, setOpenLevel] = useState(null);
  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => classRank(a.classLevel) - classRank(b.classLevel),
      ),
    [items],
  );

  return (
    <View>
      <SectionTitle
        icon="git-compare"
        title="Class comparison"
        sub="Tap a class to see its subjects"
        color={T.yellowInk}
        bg={T.yellowSoft}
      />
      {sorted.map((item, i) => (
        <ClassCard
          key={item.classLevel}
          item={item}
          index={i}
          open={openLevel === item.classLevel}
          onToggle={() =>
            setOpenLevel((p) =>
              p === item.classLevel ? null : item.classLevel,
            )
          }
        />
      ))}
    </View>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// LEADERBOARD  (podium + list, toggle between top scorers / most improved)
// ═════════════════════════════════════════════════════════════════════════════
const MEDALS = [
  { emoji: "🥇", ring: "#FFC736", bg: T.yellowSoft, line: T.yellowLine, h: 86 },
  { emoji: "🥈", ring: "#B8C0CE", bg: "#EEF0F4", line: "#CDD3DE", h: 62 },
  { emoji: "🥉", ring: "#CD7F32", bg: "#F7E3D0", line: "#E0B895", h: 46 },
];

const Avatar = ({ student, size = 40, ring }) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: T.greenSoft,
      borderWidth: ring ? 3 : 2,
      borderColor: ring ?? T.greenLine,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <AppText
      fontWeight="black"
      size={size * 0.34}
      style={{ color: T.greenDark }}
    >
      {initialsOf(student)}
    </AppText>
  </View>
);

const Podium = ({ students }) => {
  // visual order: 2nd, 1st, 3rd
  const slots = [1, 0, 2];
  return (
    <View style={styles.podium}>
      {slots.map((idx) => {
        const s = students[idx];
        const m = MEDALS[idx];
        if (!s) return <View key={idx} style={{ flex: 1 }} />;
        return (
          <View key={s.userId ?? idx} style={styles.podiumCol}>
            <Avatar student={s} size={idx === 0 ? 54 : 46} ring={m.ring} />
            <AppText
              fontWeight="bold"
              size={12}
              numberOfLines={1}
              style={{
                color: T.ink,
                marginTop: 6,
                textTransform: "capitalize",
              }}
            >
              {capName(s.firstName)}
            </AppText>
            <AppText
              fontWeight="black"
              size={14}
              style={{ color: T.greenDark }}
            >
              {fmt(s.overallAccuracy, 0)}%
            </AppText>
            <View
              style={[
                styles.podiumBlock,
                { height: m.h, backgroundColor: m.bg, borderColor: m.line },
              ]}
            >
              <AppText size={22}>{m.emoji}</AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const StudentRow = ({ item, rank, improved, index }) => {
  const up = (item.improvement ?? 0) > 0;
  return (
    <Animated.View
      entering={enter(index, 0)}
      layout={LAYOUT}
      style={styles.studentRow}
    >
      <View style={styles.rankBadge}>
        <AppText fontWeight="black" size={12} style={{ color: T.sub }}>
          {rank}
        </AppText>
      </View>
      <Avatar student={item} size={38} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <AppText
          fontWeight="bold"
          size={13}
          numberOfLines={1}
          style={{ color: T.ink, textTransform: "capitalize" }}
        >
          {capName(item.firstName)} {capName(item.lastName)}
        </AppText>
        <AppText fontWeight="medium" size={11} style={{ color: T.faint }}>
          {classLabel(item.classLevel) || "—"}
        </AppText>
      </View>
      {improved ? (
        <View style={{ alignItems: "flex-end" }}>
          <Chip
            icon={up ? "arrow-up" : "arrow-down"}
            label={`${up ? "+" : ""}${fmt(item.improvement, 1)}%`}
            color={up ? T.greenDark : T.coralDark}
            bg={up ? T.greenSoft : T.coralSoft}
          />
          <AppText
            fontWeight="medium"
            size={10.5}
            style={{ color: T.faint, marginTop: 2 }}
          >
            {fmt(item.recentAccuracy, 0)}% now
          </AppText>
        </View>
      ) : (
        <View style={{ alignItems: "flex-end" }}>
          <AppText fontWeight="black" size={15} style={{ color: T.greenDark }}>
            {fmt(item.overallAccuracy, 0)}%
          </AppText>
          <AppText fontWeight="medium" size={10.5} style={{ color: T.faint }}>
            {item.totalQuizzes} quizzes
          </AppText>
        </View>
      )}
    </Animated.View>
  );
};

const LeaderboardSection = ({ top, improved }) => {
  const [tab, setTab] = useState(top.length ? "top" : "improved");
  const tabs = [
    { id: "top", label: "Top scorers", icon: "trophy", show: top.length > 0 },
    {
      id: "improved",
      label: "Most improved",
      icon: "trending-up",
      show: improved.length > 0,
    },
  ].filter((t) => t.show);

  const list = tab === "top" ? top.slice(0, 10) : improved.slice(0, 10);
  const usePodium = tab === "top" && list.length >= 3;
  const rest = usePodium ? list.slice(3) : list;
  const startRank = usePodium ? 4 : 1;

  return (
    <View>
      <SectionTitle
        icon="podium"
        title="Leaderboard"
        sub={
          tab === "top"
            ? "Ranked by overall accuracy"
            : "Last 30 days vs the 30 before"
        }
        color={T.coralDark}
        bg={T.coralSoft}
      />
      <Card index={0} base={60} style={styles.rowCard}>
        {tabs.length > 1 && (
          <View style={styles.segment}>
            {tabs.map((t) => {
              const active = t.id === tab;
              return (
                <JambPressable
                  key={t.id}
                  onPress={() => setTab(t.id)}
                  scaleTo={0.97}
                  style={{ flex: 1 }}
                  contentStyle={[styles.segBtn, active && styles.segBtnOn]}
                >
                  <Ionicons
                    name={t.icon}
                    size={14}
                    color={active ? "#FFF" : T.sub}
                  />
                  <AppText
                    fontWeight="bold"
                    size={12}
                    style={{ color: active ? "#FFF" : T.sub, marginLeft: 5 }}
                  >
                    {t.label}
                  </AppText>
                </JambPressable>
              );
            })}
          </View>
        )}

        <View key={tab}>
          {usePodium && <Podium students={list} />}
          {rest.map((s, i) => (
            <StudentRow
              key={s.userId ?? `${tab}-${i}`}
              item={s}
              rank={startRank + i}
              improved={tab === "improved"}
              index={i}
            />
          ))}
        </View>
      </Card>
    </View>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// STATES
// ═════════════════════════════════════════════════════════════════════════════
const HomeSkeleton = () => (
  <View>
    <Skeleton style={{ height: 210, borderRadius: 26, marginBottom: 14 }} />
    <Skeleton style={{ height: 96, borderRadius: 22, marginBottom: 14 }} />
    <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
      <Skeleton style={{ flex: 1, height: 110, borderRadius: 22 }} />
      <Skeleton style={{ flex: 1, height: 110, borderRadius: 22 }} />
    </View>
    <Loader size={70} label="Loading your dashboard…" />
  </View>
);

const UnverifiedState = ({ hasSchool, onFind }) => {
  const steps = [
    { label: "Request submitted", state: "done" },
    { label: "Awaiting principal approval", state: "active" },
    { label: "Dashboard unlocked", state: "todo" },
  ];
  return (
    <Animated.View entering={enter(0)} style={{ paddingTop: 20 }}>
      <Card style={{ alignItems: "center", paddingVertical: 26 }}>
        <View style={styles.bigStateIcon}>
          <Ionicons
            name={hasSchool ? "hourglass" : "school"}
            size={40}
            color={T.yellowInk}
          />
        </View>
        <AppText fontWeight="black" size={21} style={styles.stateTitle}>
          {hasSchool ? "Verification pending" : "No school linked"}
        </AppText>
        <AppText fontWeight="medium" size={13.5} style={styles.stateBody}>
          {hasSchool
            ? "Your account is waiting for the principal's approval. Once approved, your full dashboard appears here."
            : "You haven't joined a school yet. Search for your school and send a join request to unlock the dashboard."}
        </AppText>

        {hasSchool ? (
          <View style={{ alignSelf: "stretch", marginTop: 18 }}>
            {steps.map((s, i) => (
              <Animated.View
                key={s.label}
                entering={enter(i, 200)}
                style={styles.stepRow}
              >
                <View
                  style={[
                    styles.stepDot,
                    s.state === "done" && {
                      backgroundColor: T.green,
                      borderColor: T.greenDark,
                    },
                    s.state === "active" && {
                      backgroundColor: T.yellow,
                      borderColor: T.yellowDark,
                    },
                  ]}
                >
                  {s.state === "done" && (
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  )}
                </View>
                <AppText
                  fontWeight={s.state === "todo" ? "medium" : "bold"}
                  size={13.5}
                  style={{
                    color: s.state === "todo" ? T.faint : T.ink,
                    marginLeft: 12,
                  }}
                >
                  {s.label}
                </AppText>
              </Animated.View>
            ))}
          </View>
        ) : (
          <JambButton
            title="Find my school"
            icon="search"
            onPress={onFind}
            style={{ marginTop: 20 }}
          />
        )}
      </Card>
    </Animated.View>
  );
};

const ErrorState = ({ onRetry }) => (
  <Card style={styles.errorCard}>
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View style={styles.errorIcon}>
        <Ionicons name="cloud-offline" size={22} color={T.coralDark} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText fontWeight="black" size={15} style={{ color: T.ink }}>
          Couldn't load your dashboard
        </AppText>
        <AppText
          fontWeight="medium"
          size={12}
          style={{ color: T.sub, marginTop: 2 }}
        >
          Check your connection and try again.
        </AppText>
      </View>
    </View>
    <JambButton
      title="Try again"
      icon="refresh"
      small
      onPress={onRetry}
      style={{ marginTop: 12, alignSelf: "flex-start" }}
    />
  </Card>
);

const NoQuizData = ({ onStart }) => (
  <Card
    index={1}
    base={120}
    style={{ alignItems: "center", paddingVertical: 30 }}
  >
    <View style={styles.bigStateIcon}>
      <Ionicons name="analytics" size={38} color={T.yellowInk} />
    </View>
    <AppText fontWeight="black" size={18} style={styles.stateTitle}>
      No quiz data yet
    </AppText>
    <AppText fontWeight="medium" size={13} style={styles.stateBody}>
      Charts, rankings and readiness scores will show up here as soon as your
      students take their first Guru quiz.
    </AppText>
    <JambButton
      title="Set a quiz"
      icon="rocket"
      variant="yellow"
      small
      onPress={onStart}
      style={{ marginTop: 16 }}
    />
  </Card>
);

// ═════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═════════════════════════════════════════════════════════════════════════════
const TeacherHomeScreen = () => {
  const user = useSelector(selectUser);
  const reduxSchool = useSelector(selectSchool);
  const router = useRouter();
  const { width } = useWindowDimensions();

  const userId = user?._id ?? user?.id;
  const { cache, ready: cacheReady, save } = useTeacherHomeCache(userId);

  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState({ vis: false, type: null });
  const [liveStamp, setLiveStamp] = useState(null);

  // ── Network (always runs in the background) ────────────────────────────────
  const {
    data: schoolData,
    isLoading: schoolLoading,
    isFetching: schoolFetching,
    refetch: refetchSchool,
  } = useFetchSchoolQuery(undefined, { refetchOnMountOrArgChange: true });

  // Live data wins as soon as it exists; the saved snapshot fills the gap.
  const schoolInfo = schoolData ? schoolData.data : cache?.school?.info;
  const isVerified = schoolData
    ? schoolData.isVerified
    : cache?.school?.isVerified;
  const schoolId = schoolInfo?._id ?? reduxSchool?._id;

  const {
    data: dashboardRes,
    isLoading: dashLoading,
    isFetching: dashFetching,
    refetch: refetchDashboard,
    error: dashError,
  } = useFetchSchoolDashboardQuery(schoolId, {
    skip: !schoolId || !isVerified,
  });

  const cachedDashboard =
    cache?.dashboard && cache?.schoolId === schoolId ? cache.dashboard : null;
  const dashboard = dashboardRes?.data ?? cachedDashboard;
  const usingCacheOnly = !dashboardRes?.data && !!cachedDashboard;

  // ── Save fresh results to the cache ────────────────────────────────────────
  useEffect(() => {
    if (!schoolData) return;
    if (schoolData.data?._id && schoolData.isVerified) {
      save({
        school: { info: schoolData.data, isVerified: true },
      });
    } else {
      // no longer linked / verified -> drop anything we saved
      save({ school: null, schoolId: null, dashboard: null, savedAt: null });
    }
  }, [schoolData]);

  useEffect(() => {
    if (!dashboardRes?.data || !schoolId || dashboardRes._fromCache) return;
    const now = Date.now();
    setLiveStamp(now);
    save({ schoolId, dashboard: dashboardRes.data, savedAt: now });
  }, [dashboardRes]);

  // ── Refresh ────────────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // clear the data-layer cache so the next fetch really hits the network
      if (schoolId)
        await AsyncStorage.removeItem(`school_dashboard_${schoolId}`);
    } catch (_) {}
    try {
      await Promise.all([
        refetchSchool(),
        schoolId && isVerified ? refetchDashboard() : null,
      ]);
    } catch (_) {}
    setRefreshing(false);
  }, [schoolId, isVerified]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleActionPress = (item) => {
    if (item?.modal) {
      setModal({ vis: true, type: item.modal });
    } else if (item?.nav) {
      router.push({
        pathname: item.nav.screen,
        params: { data: JSON.stringify(item.nav.data) },
      });
    }
  };
  const goQuiz = () => handleActionPress(BIG_ACTIONS[0]);

  let ModalComponent = null;
  if (modal.type === "announcement") ModalComponent = NewAnnouncement;

  const frame = (children, { scroll = false } = {}) => (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <AppLogo />
        {scroll && (
          <SyncPill
            syncing={(dashFetching || schoolFetching) && !refreshing}
            failed={!!dashError && !dashFetching}
            stamp={liveStamp ?? cache?.savedAt}
          />
        )}
      </View>
      {children}
      <StatusBar style="dark" />
    </Screen>
  );

  // ── First ever load (nothing cached, nothing fetched yet) ──────────────────
  if (!schoolInfo?._id && (!cacheReady || schoolLoading)) {
    return frame(
      <View style={[styles.body, { width: Math.min(width, 700) }]}>
        <HomeSkeleton />
      </View>,
    );
  }

  // ── No school / unverified ─────────────────────────────────────────────────
  if (!schoolInfo?._id || !isVerified) {
    return frame(
      <View style={[styles.body, { width: Math.min(width, 700) }]}>
        <UnverifiedState
          hasSchool={!!schoolInfo?._id}
          onFind={() => router.push("/(protected)/(tabs)/school")}
        />
      </View>,
    );
  }

  const overview = dashboard?.overview;
  const noQuizzes = overview && overview.totalQuizzesTaken === 0;
  const stillLoading =
    !dashboard && (dashLoading || dashFetching) && !dashError;

  return frame(
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: PAD_BOTTOM + 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.green}
            colors={[T.green]}
          />
        }
      >
        <View style={[styles.body, { width: Math.min(width, 700) }]}>
          {stillLoading ? (
            <HomeSkeleton />
          ) : !dashboard ? (
            <ErrorState onRetry={onRefresh} />
          ) : (
            <>
              <Hero
                user={user}
                schoolName={schoolInfo?.name}
                overview={overview}
              />

              <QuickActions onPress={handleActionPress} />

              {noQuizzes ? (
                <NoQuizData onStart={goQuiz} />
              ) : (
                <>
                  <StatsGrid
                    overview={overview}
                    engagement={dashboard.engagement}
                  />

                  {dashboard.readinessIndex?.length > 0 && (
                    <ReadinessSection items={dashboard.readinessIndex} />
                  )}

                  {dashboard.subjectBreakdown?.length > 0 && (
                    <SubjectsSection items={dashboard.subjectBreakdown} />
                  )}

                  {dashboard.classComparison?.length > 0 && (
                    <ClassesSection items={dashboard.classComparison} />
                  )}

                  {(dashboard.topStudents?.length > 0 ||
                    dashboard.mostImproved?.length > 0) && (
                    <LeaderboardSection
                      top={dashboard.topStudents ?? []}
                      improved={dashboard.mostImproved ?? []}
                    />
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {ModalComponent && (
        <AppModal
          visible={modal.vis}
          setVisible={(bool) => setModal({ ...modal, vis: bool })}
          Component={() => (
            <ModalComponent
              data={{ schoolId }}
              closeModal={() => setModal({ vis: false, type: null })}
            />
          )}
        />
      )}
    </>,
    { scroll: true },
  );
};

export default TeacherHomeScreen;

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  body: { alignSelf: "center", paddingHorizontal: 16 },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    maxWidth: "62%",
  },

  // hero
  heroWrap: {
    marginTop: 4,
    marginBottom: 16,
    borderRadius: 26,
    backgroundColor: T.boardDark,
    paddingBottom: 5,
  },
  heroClip: {
    borderRadius: 26,
    backgroundColor: T.board,
    paddingVertical: 18,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  heroFrame: {
    position: "absolute",
    top: 7,
    left: 7,
    right: 7,
    bottom: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(255,248,231,0.22)",
  },
  doodle: { position: "absolute", color: "rgba(255,248,231,0.07)" },
  heroTop: { flexDirection: "row", alignItems: "center" },
  heroStatRow: {
    flexDirection: "row",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1.5,
    borderTopColor: "rgba(255,248,231,0.14)",
    borderStyle: "dashed",
  },
  heroStat: { flex: 1, alignItems: "flex-start" },
  heroStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,248,231,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroStatValue: { color: T.chalk, marginTop: 6 },
  heroStatLabel: { color: T.chalkSoft, marginTop: -2 },

  // actions
  bigRow: { flexDirection: "row", gap: 10 },
  bigAction: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  bigIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  miniWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 8,
    rowGap: 10,
    marginBottom: 12,
  },
  miniAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.card,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.line,
    borderRadius: 16,
    padding: 10,
  },
  miniIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  // stats
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: { width: "48.5%", padding: 12, marginBottom: 10 },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  // shared rows
  rowCard: { padding: 14 },
  rowTop: { flexDirection: "row", alignItems: "center" },
  levelBadge: {
    borderRadius: 15,
    borderWidth: 2,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: { flexDirection: "row", marginTop: 6 },

  // subjects
  subjectRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  subjectHead: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: T.greenSoft,
  },

  // class expand
  expanded: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1.5,
    borderTopColor: T.line,
    borderStyle: "dashed",
  },
  miniSubject: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },

  // leaderboard
  segment: {
    flexDirection: "row",
    backgroundColor: T.paper,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: T.line,
    padding: 3,
    marginBottom: 14,
    gap: 3,
  },
  segBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  segBtnOn: { backgroundColor: T.green },
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
    gap: 8,
  },
  podiumCol: { flex: 1, alignItems: "center" },
  podiumBlock: {
    alignSelf: "stretch",
    marginTop: 8,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1.5,
    borderBottomColor: T.line,
    borderStyle: "dashed",
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: T.paper,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  // states
  bigStateIcon: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: T.yellowSoft,
    borderWidth: 2,
    borderColor: T.yellowLine,
    alignItems: "center",
    justifyContent: "center",
  },
  stateTitle: { color: T.ink, textAlign: "center", marginTop: 14 },
  stateBody: {
    color: T.sub,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: T.lockedLine,
    backgroundColor: T.lockedBg,
    alignItems: "center",
    justifyContent: "center",
  },
  errorCard: {
    backgroundColor: T.coralSoft,
    borderColor: T.coralLine,
    marginTop: 6,
  },
  errorIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: T.coralLine,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
});
