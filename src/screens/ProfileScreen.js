/* eslint-disable react-hooks/exhaustive-deps */
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Animated as RNAnimated,
} from "react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import StickyHeader from "../components/StickyHeader";

import Screen from "../components/Screen";
import Avatar from "../components/Avatar";
import colors from "../helpers/colors";
import AppText from "../components/AppText";
import PromptModal from "../components/PromptModal";
import { useDispatch, useSelector } from "react-redux";
import {
  selectAnalyticsOverview,
  selectClassComparison,
  selectExamReadiness,
  selectRecommendations,
  selectStreakHistory,
  selectSubjectPerformance,
  selectUser,
  selectWeakSpots,
  updateToken,
  useAnalyticsRefresh,
  useFetchUserAnalyticsQuery,
  useLazyFetchUserQuery,
} from "../context/usersSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Points from "../components/Points";
import Constant from "expo-constants";
import {
  capFirstLetter,
  hasCompletedProfile,
} from "../helpers/helperFunctions";
import { StatusBar } from "expo-status-bar";
import getRefresher from "../components/Refresher";
import PopMessage from "../components/PopMessage";
import { selectSchool } from "../context/schoolSlice";
import LottieAnimator from "../components/LottieAnimator";
import { useRouter } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  FadeInDown,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import { PAD_BOTTOM, signOutKeys } from "../helpers/dataStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── Analytics ─────────────────────────────────────────────────────────────

const { width } = Dimensions.get("screen");

const SIGN_OUT_MODAL = {
  title: "Sign Out",
  msg: "Are you sure you want to log out this account?",
  btn: "Leave",
  type: "sign_out",
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Animated horizontal progress bar */
const ProgressBar = ({ value = 0, color = colors.primary, barHeight = 6 }) => {
  const anim = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    RNAnimated.timing(anim, {
      toValue: Math.min(Math.max(value / 100, 0), 1),
      duration: 800,
      useNativeDriver: false,
      easing: (t) => t * (2 - t),
    }).start();
  }, [value]);

  return (
    <View
      style={{
        height: barHeight,
        backgroundColor: colors.extraLight,
        borderRadius: barHeight,
        overflow: "hidden",
      }}
    >
      <RNAnimated.View
        style={{
          height: barHeight,
          borderRadius: barHeight,
          backgroundColor: color,
          width: anim.interpolate({
            inputRange: [0, 1],
            outputRange: ["0%", "100%"],
          }),
        }}
      />
    </View>
  );
};

/** Compact stat tile */
const StatTile = ({ icon, label, value, color = colors.primary }) => (
  <View style={[s.statTile, { flex: 1 }]}>
    <View style={[s.statTileIcon, { backgroundColor: color + "18" }]}>
      <Ionicons name={icon} size={14} color={color} />
    </View>
    <AppText fontWeight="bold" style={[s.statTileVal, { color }]}>
      {value}
    </AppText>
    <AppText style={s.statTileLabel} size="tiny" fontWeight="medium">
      {label}
    </AppText>
  </View>
);

/** White rounded card */
const Card = ({ children, style }) => (
  <View style={[s.card, style]}>{children}</View>
);

/** Section title row */
const SectionHead = ({ icon, title, accent = colors.primary }) => (
  <View style={s.sectionHead}>
    <View style={[s.sectionHeadIcon, { backgroundColor: accent + "15" }]}>
      <Ionicons name={icon} size={13} color={accent} />
    </View>
    <AppText fontWeight="bold" style={s.sectionHeadText}>
      {title}
    </AppText>
  </View>
);

/** Readiness score card */
const ReadinessCard = ({ score = 0, label, examTarget }) => {
  const accent =
    score >= 75
      ? "#22c55e"
      : score >= 55
      ? colors.primary
      : score >= 35
      ? "#f59e0b"
      : "#ef4444";
  return (
    <Card>
      <SectionHead icon="school" title="Exam Readiness" accent={accent} />
      <View style={s.readinessRow}>
        <View>
          <AppText
            fontWeight="black"
            style={[s.readinessScore, { color: accent }]}
          >
            {score}
            <AppText style={s.readinessDenom} fontWeight="medium">
              /100
            </AppText>
          </AppText>
          <AppText
            fontWeight="bold"
            style={[s.readinessLabel, { color: accent }]}
          >
            {label}
          </AppText>
        </View>
        <View style={{ flex: 1, paddingLeft: 16 }}>
          <AppText style={s.readinessExam} size="tiny" fontWeight="medium">
            {examTarget}
          </AppText>
          <ProgressBar value={score} color={accent} barHeight={10} />
        </View>
      </View>
    </Card>
  );
};

/** Subject accuracy row */
const SubjectRow = ({ name, accuracy, trend }) => {
  const trendIcon =
    trend === "improving"
      ? "trending-up"
      : trend === "declining"
      ? "trending-down"
      : "remove";
  const trendColor =
    trend === "improving"
      ? "#22c55e"
      : trend === "declining"
      ? "#ef4444"
      : colors.medium;
  const barColor =
    accuracy >= 70 ? "#22c55e" : accuracy >= 50 ? colors.primary : "#f59e0b";
  return (
    <View style={s.subjectRow}>
      <View style={s.subjectLeft}>
        <AppText fontWeight="semibold" style={s.subjectName} numberOfLines={1}>
          {name}
        </AppText>
        <ProgressBar value={accuracy} color={barColor} barHeight={5} />
      </View>
      <View style={s.subjectRight}>
        <Ionicons name={trendIcon} size={13} color={trendColor} />
        <AppText fontWeight="bold" style={[s.subjectPct, { color: barColor }]}>
          {accuracy}%
        </AppText>
      </View>
    </View>
  );
};

/** 6-week activity dot grid */
const ActivityGrid = ({ activeDays = [] }) => {
  const today = new Date();
  const dots = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (41 - i));
    return activeDays.includes(d.toISOString().split("T")[0]);
  });
  return (
    <View style={s.dotsGrid}>
      {dots.map((on, i) => (
        <View
          key={i}
          style={[
            s.dot,
            { backgroundColor: on ? colors.primary : colors.extraLight },
          ]}
        />
      ))}
    </View>
  );
};

/** Single recommendation row */
const RecRow = ({ item }) => {
  const map = {
    critical_topic: { icon: "alert-circle", color: "#ef4444" },
    weak_subject: { icon: "trending-down", color: "#f59e0b" },
    consistency: { icon: "time", color: colors.primary },
    readiness: { icon: "school", color: "#8b5cf6" },
    reinforce: { icon: "star", color: "#22c55e" },
    breadth: { icon: "grid", color: colors.primary },
  };
  const { icon, color } = map[item.type] ?? {
    icon: "bulb",
    color: colors.primary,
  };
  return (
    <View style={[s.recRow, { borderLeftColor: color }]}>
      <Ionicons
        name={icon}
        size={14}
        color={color}
        style={{ marginRight: 8 }}
      />
      <AppText
        style={s.recText}
        size="small"
        fontWeight="medium"
        numberOfLines={3}
      >
        {item.message}
      </AppText>
    </View>
  );
};

/** Profile menu link */
export const ProfileLink = ({
  title,
  icon = "person",
  iconColor = colors.primary,
  yoyo,
  yoyoColor = colors.heart,
  onPress,
}) => {
  const scaler = useSharedValue(1);
  const aniStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaler.value }],
  }));
  useEffect(() => {
    if (yoyo)
      scaler.value = withRepeat(
        withTiming(0.85, { duration: 700 }),
        Infinity,
        true,
      );
  }, []);
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={s.link}>
      <View style={s.linkIcon}>
        <Ionicons name={icon} size={15} color={yoyo ? yoyoColor : iconColor} />
      </View>
      <Animated.View
        style={
          yoyo
            ? [
                s.yoyo,
                { backgroundColor: yoyoColor + "20", borderColor: yoyoColor },
                aniStyle,
              ]
            : {}
        }
      >
        <AppText
          style={{ ...s.linkText, color: yoyo ? yoyoColor : colors.black }}
          fontWeight="semibold"
        >
          {title}
        </AppText>
      </Animated.View>
      <View style={s.linkNav}>
        <Ionicons name="chevron-forward" size={18} color={colors.medium} />
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS BLOCK — isolated component for cleanliness & memoization
// ─────────────────────────────────────────────────────────────────────────────
const AnalyticsBlock = ({ analyticsResult }) => {
  const overview = selectAnalyticsOverview(analyticsResult);
  const readiness = selectExamReadiness(analyticsResult);
  const subjects = selectSubjectPerformance(analyticsResult);
  const weakSpots = selectWeakSpots(analyticsResult);
  const streak = selectStreakHistory(analyticsResult);
  const recs = selectRecommendations(analyticsResult);
  const classComp = selectClassComparison(analyticsResult);

  if (analyticsResult.isLoading) {
    return (
      <View style={{ gap: 10, marginBottom: 12 }}>
        {[90, 110, 80].map((h, i) => (
          <View key={i} style={[s.skeleton, { height: h }]} />
        ))}
      </View>
    );
  }

  if (!overview) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(450).delay(60)}
      style={{ gap: 12 }}
    >
      {/* Overview tiles */}
      <Card>
        <SectionHead icon="bar-chart" title="Overview" />
        <View style={s.tileRow}>
          <StatTile
            icon="checkmark-circle"
            label="Accuracy"
            value={`${overview.overallAccuracy}%`}
            color="#22c55e"
          />
          <StatTile
            icon="help-circle"
            label="Quizzes"
            value={overview.totalQuizzes}
            color={colors.primary}
          />
          <StatTile
            icon="flash"
            label="Overall Points"
            value={(overview.totalPointsEarned ?? 0).toLocaleString()}
            color="#f59e0b"
          />
          {classComp?.rank ? (
            <StatTile
              icon="trophy"
              label="Class Rank"
              value={`#${classComp.rank}`}
              color="#8b5cf6"
            />
          ) : null}
        </View>
      </Card>

      {/* Exam readiness */}
      {readiness ? (
        <ReadinessCard
          score={readiness.score}
          label={readiness.label}
          examTarget={readiness.examTarget}
        />
      ) : null}

      {/* Streak + activity grid */}
      {streak ? (
        <Card>
          <SectionHead icon="flame" title="Study Streak" accent="#f97316" />
          <View style={s.streakRow}>
            {[
              { val: streak.currentStreak, lbl: "Current", color: "#f97316" },
              { val: streak.longestStreak, lbl: "Best", color: colors.primary },
              {
                val: streak.activeDayCount,
                lbl: "Active Days",
                color: "#22c55e",
              },
            ].map((item, i, arr) => (
              <React.Fragment key={item.lbl}>
                <View style={s.streakCell}>
                  <AppText
                    fontWeight="black"
                    style={[s.streakNum, { color: item.color }]}
                  >
                    {item.val}
                  </AppText>
                  <AppText style={s.streakLbl} size="tiny" fontWeight="medium">
                    {item.lbl}
                  </AppText>
                </View>
                {i < arr.length - 1 && <View style={s.streakDiv} />}
              </React.Fragment>
            ))}
          </View>
          <ActivityGrid activeDays={streak.activeDaysLast60 ?? []} />
        </Card>
      ) : null}

      {/* Subjects */}
      {subjects?.length > 0 ? (
        <Card>
          <SectionHead icon="book" title="Subjects" />
          {subjects.slice(0, 5).map((subj) => (
            <SubjectRow
              key={subj.subjectId?.toString()}
              name={capFirstLetter(subj.name)}
              accuracy={subj.accuracyRate}
              trend={subj.trend}
            />
          ))}
        </Card>
      ) : null}

      {/* Weak spots */}
      {weakSpots?.length > 0 ? (
        <Card>
          <SectionHead
            icon="alert-circle"
            title="Needs Practice"
            accent="#ef4444"
          />
          {weakSpots.slice(0, 4).map((t, i) => (
            <View
              key={t.topicId?.toString() ?? i}
              style={[
                s.weakRow,
                i < 3 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.extraLight,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <AppText
                  fontWeight="semibold"
                  style={s.weakName}
                  numberOfLines={1}
                >
                  {t.topicName}
                </AppText>
                <AppText style={s.weakSub} size="tiny" fontWeight="medium">
                  {t.subjectName}
                </AppText>
              </View>
              <AppText
                fontWeight="bold"
                style={[
                  s.weakPct,
                  { color: t.accuracyRate < 40 ? "#ef4444" : "#f59e0b" },
                ]}
              >
                {t.accuracyRate}%
              </AppText>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Recommendations */}
      {recs?.length > 0 ? (
        <Card>
          <SectionHead icon="bulb" title="Recommendations" accent="#8b5cf6" />
          {recs.slice(0, 3).map((rec, i) => (
            <RecRow key={i} item={rec} />
          ))}
        </Card>
      ) : null}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const currentVersion = Constant.expoConfig?.version ?? "1.0";

const ProfileScreen = () => {
  const [prompt, setPrompt] = useState({ vis: false, data: null });
  const [popper, setPopper] = useState({ vis: false });
  const [refreshing, setRefreshing] = useState(false);

  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector(selectUser) ?? {};
  const school = useSelector(selectSchool);
  const [fetchUser] = useLazyFetchUserQuery();
  const insets = useSafeAreaInsets();
  // after existing useState hooks:
  const scrollY = useSharedValue(0);
  const profile = hasCompletedProfile(user);
  const isPro = ["professional", "manager"].includes(user.accountType);
  const isProVerified = isPro && user?.verified;
  const isWaiting = isPro && !user?.verified && profile.bool;
  const isStudent = user.accountType === "student";

  const analyticsResult = useFetchUserAnalyticsQuery(undefined, {
    skip: !isStudent,
  });
  const { onRefresh: refreshAnalytics, refreshing: analyticsRefreshing } =
    useAnalyticsRefresh(analyticsResult?.refetch ?? (() => Promise.resolve()));

  const handlePrompt = async (type) => {
    if (type === "sign_out") {
      await AsyncStorage.multiRemove(signOutKeys);
      dispatch(updateToken(null));
    }
  };

  const handleNav = (screen) => {
    if (isPro)
      return setPopper({
        vis: true,
        msg: "You're not authorized",
        type: "failed",
      });
    router.push(screen);
  };

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchUser();
      if (isStudent) await refreshAnalytics();
    } catch (_) {
    } finally {
      setRefreshing(false);
    }
  }, [fetchUser, refreshAnalytics, isStudent]);

  return (
    <View style={s.container}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: PAD_BOTTOM * 0.8,
        }}
        refreshControl={getRefresher({
          refreshing: refreshing || analyticsRefreshing,
          onRefresh,
        })}
      >
        {/* ── Profile header ── */}
        <LinearGradient
          colors={[colors.primaryDeep + "14", "#ffffff00"]}
          style={[s.headerGrad, { paddingTop: insets.top + 10 }]}
        >
          <View style={s.profileWrap}>
            <Avatar
              size={Platform.OS === "web" ? 110 : width * 0.26}
              name={`${user?.firstName ?? "Your"} ${user?.lastName ?? "Name"}`}
              imageStyle={{ backgroundColor: "#fff" }}
              data={{ user }}
              source={user?.avatar?.image}
              border={{ width: 4, color: "#fff" }}
              textFontsize={20}
            />

            <AppText style={s.handle} fontWeight="medium" size="small">
              @{user?.username}
            </AppText>

            {Boolean(school?.name) && (
              <View style={s.schoolRow}>
                <Ionicons
                  name="business-outline"
                  size={11}
                  color={colors.medium}
                />
                <AppText
                  style={s.schoolText}
                  fontWeight="medium"
                  size="small"
                  numberOfLines={1}
                >
                  {" "}
                  {school.name}
                </AppText>
              </View>
            )}

            {user?.gender && (
              <View style={s.badge}>
                <AppText fontWeight="bold" style={s.badgeText} size="tiny">
                  {[
                    user.gender,
                    user.accountType === "student"
                      ? user.class?.level?.toUpperCase()
                      : null,
                    user.accountType?.toUpperCase(),
                  ]
                    .filter(Boolean)
                    .join("  ·  ")}
                </AppText>
              </View>
            )}

            {isWaiting && (
              <View style={s.waitRow}>
                <LottieAnimator visible name="waiting" size={28} />
                <AppText fontWeight="black" style={{ color: colors.medium }}>
                  Awaiting Verification
                </AppText>
              </View>
            )}

            {!isPro && (
              <View style={s.statsRow}>
                <Points
                  value={user?.rank}
                  type="award"
                  style={{ marginRight: 24 }}
                />
                <Points value={user?.points} />
              </View>
            )}
          </View>
        </LinearGradient>

        {/* ── Analytics (students only) ── */}
        {isStudent && (
          <View style={s.analyticsWrap}>
            <AnalyticsBlock analyticsResult={analyticsResult} />
          </View>
        )}

        {/* ── Menu ── */}
        <View style={s.menu}>
          {isProVerified && (
            <ProfileLink
              title="Pro Mode+"
              icon="cog"
              onPress={() =>
                profile.bool ? router.push("/pros/pro") : setPopper(profile.pop)
              }
            />
          )}
          <ProfileLink
            title={`${profile.bool ? "Edit" : "Complete"} Profile`}
            onPress={() => router.push("/profile/edit")}
            yoyo={!profile.bool}
            yoyoColor={colors.warning}
            icon="options"
          />
          <ProfileLink
            title="Subscriptions & Withdrawals"
            icon="wallet"
            yoyo={!user?.subscription?.isActive}
            onPress={() => handleNav("/profile/subscription")}
          />
          {!isPro && (
            <ProfileLink
              title="My Friends"
              icon="people"
              onPress={() => handleNav("/profile/friends")}
            />
          )}
          <View style={s.sep} />
          <ProfileLink
            title="Rewards & Invites"
            icon="person-add"
            onPress={() => handleNav("/profile/invite")}
            iconColor={colors.medium}
          />
          <ProfileLink
            title="Settings & More"
            icon="chatbubble-ellipses"
            onPress={() => router.push("/profile/settings")}
            iconColor={colors.medium}
          />
          <View style={s.sep} />
          <ProfileLink
            title="Sign out"
            icon="log-out"
            iconColor={colors.heartDark}
            onPress={() => setPrompt({ vis: true, data: SIGN_OUT_MODAL })}
          />
        </View>

        <AppText
          style={{
            textAlign: "center",
            color: colors.medium,
            marginVertical: 18,
          }}
          size="tiny"
        >
          v{currentVersion}
        </AppText>
      </Animated.ScrollView>

      <PromptModal
        prompt={prompt}
        setPrompt={setPrompt}
        onPress={handlePrompt}
      />
      <PopMessage popData={popper} setPopData={setPopper} />
      <StatusBar style="dark" />
      <StickyHeader scrollY={scrollY} user={user} insets={insets} />
    </View>
  );
};

export default ProfileScreen;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const CARD_SHADOW = {
  boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f5f7" },

  // header
  headerGrad: { paddingBottom: 4 },
  profileWrap: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  fullName: { marginTop: 10, color: colors.black, textAlign: "center" },
  handle: { color: colors.medium, marginTop: 2 },
  schoolRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  schoolText: { color: colors.medium, textTransform: "capitalize" },
  badge: {
    backgroundColor: colors.primaryDeep + "12",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 8,
  },
  badgeText: { color: colors.primaryDeep, letterSpacing: 0.3 },
  waitRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 2,
  },

  // analytics
  analyticsWrap: { paddingHorizontal: 14 },

  // card
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    ...CARD_SHADOW,
  },

  // section head
  sectionHead: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  sectionHeadIcon: { padding: 5, borderRadius: 8, marginRight: 8 },
  sectionHeadText: { fontSize: 13, color: colors.black },

  // stat tiles
  tileRow: { flexDirection: "row", gap: 8 },
  statTile: {
    backgroundColor: colors.extraLight,
    borderRadius: 12,
    padding: 10,
    alignItems: "flex-start",
    gap: 4,
  },
  statTileIcon: { padding: 5, borderRadius: 7, marginBottom: 2 },
  statTileVal: { fontSize: 15, lineHeight: 18 },
  statTileLabel: { color: colors.medium, lineHeight: 14 },

  // readiness
  readinessRow: { flexDirection: "row", alignItems: "center" },
  readinessScore: { fontSize: 38, lineHeight: 42 },
  readinessDenom: { fontSize: 14, color: colors.medium },
  readinessLabel: { fontSize: 13, marginTop: 2 },
  readinessExam: { color: colors.medium, marginBottom: 6 },

  // streak
  streakRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 14,
  },
  streakCell: { alignItems: "center", flex: 1 },
  streakNum: { fontSize: 28, lineHeight: 32 },
  streakLbl: { color: colors.medium, marginTop: 2 },
  streakDiv: {
    width: 1,
    backgroundColor: colors.extraLight,
    marginVertical: 4,
  },

  // dot grid
  dotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 3 },
  dot: {
    width: Math.floor((width - 56 - 3 * 41) / 42),
    aspectRatio: 1,
    borderRadius: 2,
  },

  // subjects
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  subjectLeft: { flex: 1, gap: 5 },
  subjectName: { fontSize: 12, color: colors.black },
  subjectRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    minWidth: 46,
  },
  subjectPct: { fontSize: 12 },

  // weak spots
  weakRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  weakName: { fontSize: 12, color: colors.black },
  weakSub: { color: colors.medium, textTransform: "capitalize", marginTop: 1 },
  weakPct: { fontSize: 13 },

  // recs
  recRow: {
    flexDirection: "row",
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  recText: { flex: 1, color: colors.black, lineHeight: 18 },

  // skeleton
  skeleton: {
    backgroundColor: colors.extraLight,
    borderRadius: 16,
    marginBottom: 10,
  },

  // menu
  menu: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginHorizontal: 14,
    marginTop: 14,
    paddingVertical: 6,
    ...CARD_SHADOW,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  linkIcon: {
    backgroundColor: colors.extraLight,
    padding: 10,
    borderRadius: 10,
    marginRight: 14,
  },
  linkText: { fontSize: 14 },
  linkNav: { flex: 1, alignItems: "flex-end", marginRight: 4 },
  sep: {
    height: 1,
    backgroundColor: colors.extraLight,
    width: "88%",
    alignSelf: "center",
    marginVertical: 4,
  },
  yoyo: {
    padding: 7,
    borderRadius: 100,
    borderWidth: 1,
    borderBottomWidth: 4,
    paddingHorizontal: 15,
  },
});
