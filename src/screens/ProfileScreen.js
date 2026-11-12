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
import StickyHeader from "../components/StickyHeader";

import Screen from "../components/Screen";
import Avatar from "../components/Avatar";
import AppText from "../components/AppText";
import { T } from "../components/jamb/JambTheme";
import { Loader } from "../components/jamb/JambUI";
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
import { apiSlice } from "../context/apiSlice";
import { invalidateAnalyticsCache } from "../context/usersSlice";
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

/** Animated chunky progress bar */
const ProgressBar = ({ value = 0, color = T.green, barHeight = 8 }) => {
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
        backgroundColor: T.track,
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
      >
        <View
          style={{
            position: "absolute",
            top: Math.max(barHeight * 0.22, 1.5),
            left: 5,
            right: 5,
            height: Math.max(barHeight * 0.2, 1.5),
            borderRadius: 3,
            backgroundColor: "rgba(255,255,255,0.35)",
          }}
        />
      </RNAnimated.View>
    </View>
  );
};

/** Compact stat tile (tinted, with a thick bottom edge) */
const StatTile = ({ icon, label, value, color = T.green }) => (
  <View
    style={[
      s.statTile,
      { flex: 1, backgroundColor: color + "18", borderColor: color + "55" },
    ]}
  >
    <View style={s.statTileIcon}>
      <Ionicons name={icon} size={14} color={color} />
    </View>
    <AppText fontWeight="black" style={[s.statTileVal, { color: T.ink }]}>
      {value}
    </AppText>
    <AppText style={[s.statTileLabel, { color }]} size="tiny" fontWeight="bold">
      {label}
    </AppText>
  </View>
);

/** White card with a thicker bottom edge */
const Card = ({ children, style }) => (
  <View style={[s.card, style]}>{children}</View>
);

/** Section title row */
const SectionHead = ({ icon, title, accent = T.green }) => (
  <View style={s.sectionHead}>
    <View style={[s.sectionHeadIcon, { backgroundColor: accent + "22" }]}>
      <Ionicons name={icon} size={16} color={accent} />
    </View>
    <AppText fontWeight="black" style={s.sectionHeadText}>
      {title}
    </AppText>
  </View>
);

/** Readiness score card */
const ReadinessCard = ({ score = 0, label, examTarget }) => {
  const accent =
    score >= 75
      ? T.green
      : score >= 55
        ? T.blue
        : score >= 35
          ? T.yellowDark
          : T.coral;
  return (
    <Card>
      <SectionHead icon="school" title="Exam Readiness" accent={accent} />
      <View style={s.readinessRow}>
        <View
          style={[
            s.readinessBadge,
            { backgroundColor: accent + "18", borderColor: accent + "55" },
          ]}
        >
          <AppText
            fontWeight="black"
            style={[s.readinessScore, { color: T.ink }]}
          >
            {score}
            <AppText style={s.readinessDenom} fontWeight="bold">
              /100
            </AppText>
          </AppText>
          <AppText
            fontWeight="black"
            style={[s.readinessLabel, { color: accent }]}
          >
            {label}
          </AppText>
        </View>
        <View style={{ flex: 1, paddingLeft: 14 }}>
          <AppText style={s.readinessExam} size="tiny" fontWeight="bold">
            {examTarget}
          </AppText>
          <ProgressBar value={score} color={accent} barHeight={14} />
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
      ? T.greenDark
      : trend === "declining"
        ? T.coralDark
        : T.yellowDark;
  const barColor =
    accuracy >= 70 ? T.green : accuracy >= 50 ? T.blue : T.yellowDark;
  return (
    <View style={s.subjectRow}>
      <View style={s.subjectLeft}>
        <AppText fontWeight="bold" style={s.subjectName} numberOfLines={1}>
          {name}
        </AppText>
        <ProgressBar value={accuracy} color={barColor} barHeight={9} />
      </View>
      <View style={s.subjectRight}>
        <Ionicons name={trendIcon} size={14} color={trendColor} />
        <AppText fontWeight="black" style={[s.subjectPct, { color: T.ink }]}>
          {accuracy}%
        </AppText>
      </View>
    </View>
  );
};

/** 6-week activity grid: 3 rows x 14, oldest -> newest, fills the card width */
const ActivityGrid = ({ activeDays = [] }) => {
  const today = new Date();
  const dots = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (41 - i));
    return activeDays.includes(d.toISOString().split("T")[0]);
  });
  const rows = [0, 1, 2].map((r) => dots.slice(r * 14, r * 14 + 14));
  return (
    <View style={s.dotsGrid}>
      {rows.map((row, r) => (
        <View key={r} style={s.dotsRow}>
          {row.map((on, i) => (
            <View
              key={i}
              style={[
                s.dot,
                on
                  ? {
                      backgroundColor: T.green,
                      borderBottomWidth: 2,
                      borderBottomColor: T.greenDark,
                    }
                  : { backgroundColor: T.track },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

/** Single recommendation row */
const RecRow = ({ item }) => {
  const map = {
    critical_topic: { icon: "alert-circle", color: T.coral, bg: T.coralSoft },
    weak_subject: {
      icon: "trending-down",
      color: T.yellowDark,
      bg: T.yellowSoft,
    },
    consistency: { icon: "time", color: T.blue, bg: T.blueSoft },
    readiness: { icon: "school", color: T.purple, bg: T.purpleSoft },
    reinforce: { icon: "star", color: T.green, bg: T.greenSoft },
    breadth: { icon: "grid", color: T.blue, bg: T.blueSoft },
  };
  const { icon, color, bg } = map[item.type] ?? {
    icon: "bulb",
    color: T.blue,
    bg: T.blueSoft,
  };
  return (
    <View style={[s.recRow, { backgroundColor: bg }]}>
      <View style={s.recIcon}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
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
  iconColor = T.green,
  yoyo,
  yoyoColor = T.coral,
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
  const tint = yoyo ? yoyoColor : iconColor;
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={s.link}>
      <View
        style={[
          s.linkIcon,
          { backgroundColor: tint + "20", borderColor: tint + "55" },
        ]}
      >
        <Ionicons name={icon} size={17} color={tint} />
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
          style={{ ...s.linkText, color: yoyo ? yoyoColor : T.ink }}
          fontWeight="bold"
        >
          {title}
        </AppText>
      </Animated.View>
      <View style={s.linkNav}>
        <View style={s.linkChevron}>
          <Ionicons name="chevron-forward" size={15} color={T.sub} />
        </View>
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
      <Loader
        size={72}
        label="Loading your stats…"
        style={{ paddingVertical: 36 }}
      />
    );
  }

  if (!overview) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(450).delay(60)}
      style={{ gap: 14 }}
    >
      {/* Overview tiles */}
      <Card>
        <SectionHead icon="bar-chart" title="Overview" accent={T.blue} />
        <View style={s.tileRow}>
          <StatTile
            icon="checkmark-circle"
            label="Accuracy"
            value={`${overview.overallAccuracy}%`}
            color={T.green}
          />
          <StatTile
            icon="help-circle"
            label="Quizzes"
            value={overview.totalQuizzes}
            color={T.blue}
          />
          <StatTile
            icon="flash"
            label="Overall Points"
            value={(overview.totalPointsEarned ?? 0).toLocaleString()}
            color={T.yellowDark}
          />
          {classComp?.rank ? (
            <StatTile
              icon="trophy"
              label="Class Rank"
              value={`#${classComp.rank}`}
              color={T.purple}
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
          <SectionHead icon="flame" title="Study Streak" accent={T.coral} />
          <View style={s.streakRow}>
            {[
              { val: streak.currentStreak, lbl: "Current", color: T.coral },
              { val: streak.longestStreak, lbl: "Best", color: T.purple },
              {
                val: streak.activeDayCount,
                lbl: "Active Days",
                color: T.green,
              },
            ].map((item, i, arr) => (
              <React.Fragment key={item.lbl}>
                <View
                  style={[
                    s.streakCell,
                    {
                      backgroundColor: item.color + "18",
                      borderColor: item.color + "55",
                    },
                  ]}
                >
                  <AppText
                    fontWeight="black"
                    style={[s.streakNum, { color: T.ink }]}
                  >
                    {item.val}
                  </AppText>
                  <AppText
                    style={[s.streakLbl, { color: item.color }]}
                    size="tiny"
                    fontWeight="bold"
                  >
                    {item.lbl}
                  </AppText>
                </View>
              </React.Fragment>
            ))}
          </View>
          <ActivityGrid activeDays={streak.activeDaysLast60 ?? []} />
        </Card>
      ) : null}

      {/* Subjects */}
      {subjects?.length > 0 ? (
        <Card>
          <SectionHead icon="book" title="Subjects" accent={T.blue} />
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
            accent={T.coral}
          />
          {weakSpots.slice(0, 4).map((t, i) => (
            <View
              key={t.topicId?.toString() ?? i}
              style={[
                s.weakRow,
                i < 3 && {
                  borderBottomWidth: 1.5,
                  borderBottomColor: T.line,
                  borderStyle: "dashed",
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
                  { color: t.accuracyRate < 40 ? T.coralDark : T.yellowInk },
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
          <SectionHead icon="bulb" title="Recommendations" accent={T.purple} />
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
      // 1. Wipe persisted AsyncStorage keys (token, user, user_stat)
      await AsyncStorage.multiRemove(signOutKeys);
      // 2. Wipe the custom analytics AsyncStorage cache so the next
      //    user doesn't see the previous user's analytics data
      await invalidateAnalyticsCache();
      // 3. Reset the entire RTK Query in-memory cache so no stale
      //    data (stats, school, profile, leaderboard, etc.) bleeds
      //    into the next account's session
      dispatch(apiSlice.util.resetApiState());
      // 4. Clear the auth token last — this triggers the redirect to (auth)
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
        <View style={[s.hero, { paddingTop: insets.top + 10 }]}>
          {/* playful background doodles */}
          <View pointerEvents="none" style={s.heroDeco}>
            <View
              style={[
                s.blob,
                { width: 260, height: 260, top: -90, right: -80 },
              ]}
            />
            <View
              style={[
                s.blob,
                { width: 180, height: 180, bottom: -70, left: -60 },
              ]}
            />
            <Ionicons
              name="star"
              size={22}
              color="rgba(255,255,255,0.40)"
              style={{ position: "absolute", top: insets.top + 24, left: 24 }}
            />
            <Ionicons
              name="school"
              size={30}
              color="rgba(255,255,255,0.22)"
              style={{ position: "absolute", top: insets.top + 20, right: 70 }}
            />
            <Ionicons
              name="book"
              size={26}
              color="rgba(255,255,255,0.24)"
              style={{
                position: "absolute",
                top: insets.top + 110,
                right: 22,
                transform: [{ rotate: "14deg" }],
              }}
            />
            <Ionicons
              name="pencil"
              size={24}
              color="rgba(255,255,255,0.26)"
              style={{
                position: "absolute",
                top: insets.top + 120,
                left: 22,
                transform: [{ rotate: "-20deg" }],
              }}
            />
            <View
              style={[
                s.confetti,
                { top: insets.top + 60, left: 76, backgroundColor: T.yellow },
              ]}
            />
            <View
              style={[
                s.confetti,
                {
                  top: insets.top + 56,
                  right: 120,
                  backgroundColor: "#fff",
                  width: 6,
                  height: 6,
                },
              ]}
            />
            <View
              style={[
                s.confetti,
                { top: insets.top + 170, right: 56, backgroundColor: T.coral },
              ]}
            />
          </View>

          <View style={s.profileWrap}>
            {/* Avatar draws the name under the picture - white so it reads on blue */}
            <Avatar
              size={width * 0.36}
              name={`${user?.firstName ?? "Your"} ${user?.lastName ?? "Name"}`}
              imageStyle={{ backgroundColor: "#fff" }}
              data={{ user }}
              source={user?.avatar?.image}
              border={{ width: 4, color: T.ink }}
              onPress={() => router.push("/profile/edit")}
              textFontsize={20}
              textStyle={{
                color: "#fff",
                width: width * 0.5,
                textAlign: "center",
              }}
            />

            <View style={s.handlePill}>
              <AppText style={s.handle} fontWeight="black" size="small">
                @{user?.username}
              </AppText>
            </View>

            <View style={s.metaRow}>
              {Boolean(school?.name) && (
                <View style={s.metaChip}>
                  <Ionicons name="business" size={12} color="#fff" />
                  <AppText
                    style={s.metaText}
                    fontWeight="semibold"
                    size="tiny"
                    numberOfLines={1}
                  >
                    {school.name}
                  </AppText>
                </View>
              )}

              {user?.gender && (
                <View style={s.metaChip}>
                  <AppText fontWeight="black" style={s.badgeText} size="tiny">
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
            </View>

            {isWaiting && (
              <View style={s.waitRow}>
                <LottieAnimator visible name="waiting" size={28} />
                <AppText fontWeight="black" style={{ color: T.ink }}>
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
        </View>

        {/* ── Analytics (students only) ── */}
        {isStudent && user?.subscription?.isActive && (
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
            yoyoColor={T.yellowDark}
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
            iconColor={T.purple}
          />
          <ProfileLink
            title="Settings & More"
            icon="settings"
            onPress={() => router.push("/profile/settings")}
            iconColor={T.blue}
          />
          <ProfileLink
            title="Delete account"
            icon="trash-outline"
            iconColor={T.coral}
            onPress={() => router.push("/profile/delete-account")}
          />
          <View style={s.sep} />
          <ProfileLink
            title="Sign out"
            icon="log-out"
            iconColor={T.coral}
            onPress={() => setPrompt({ vis: true, data: SIGN_OUT_MODAL })}
          />
        </View>

        <AppText
          style={{
            textAlign: "center",
            color: T.faint,
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
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },

  // header
  hero: {
    backgroundColor: T.blue,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    borderBottomWidth: 7,
    borderBottomColor: T.blueDark,
    paddingBottom: 20,
    overflow: "hidden",
  },
  heroDeco: { ...StyleSheet.absoluteFillObject },
  blob: {
    position: "absolute",
    borderRadius: 200,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  confetti: { position: "absolute", width: 8, height: 8, borderRadius: 4 },
  profileWrap: {
    alignItems: "center",
    paddingTop: 18,
    paddingHorizontal: 20,
  },
  handlePill: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.ink,
    paddingHorizontal: 14,
    paddingVertical: 3,
    marginTop: 8,
  },
  handle: { color: T.ink },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 5,
    maxWidth: width * 0.7,
  },
  metaText: { color: "#fff", textTransform: "capitalize", flexShrink: 1 },
  badgeText: { color: "#fff", letterSpacing: 0.8 },
  waitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: T.ink,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },

  // analytics
  analyticsWrap: { paddingHorizontal: 14, marginTop: 16 },

  // card
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: T.line,
    padding: 14,
  },

  // section head
  sectionHead: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  sectionHeadIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sectionHeadText: { fontSize: 15, color: T.ink },

  // stat tiles
  tileRow: { flexDirection: "row", gap: 8 },
  statTile: {
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    padding: 10,
    alignItems: "flex-start",
    gap: 3,
  },
  statTileIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statTileVal: { fontSize: 16, lineHeight: 20 },
  statTileLabel: { lineHeight: 14 },

  // readiness
  readinessRow: { flexDirection: "row", alignItems: "center" },
  readinessBadge: {
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  readinessScore: { fontSize: 34, lineHeight: 40 },
  readinessDenom: { fontSize: 13, color: T.sub },
  readinessLabel: { fontSize: 12, marginTop: 1 },
  readinessExam: { color: T.sub, marginBottom: 8 },

  // streak
  streakRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  streakCell: {
    alignItems: "center",
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    paddingVertical: 8,
  },
  streakNum: { fontSize: 24, lineHeight: 28 },
  streakLbl: { lineHeight: 14 },

  // dot grid (14 per row)
  dotsGrid: { gap: 4 },
  dotsRow: { flexDirection: "row", gap: 4 },
  dot: { flex: 1, aspectRatio: 1, borderRadius: 4 },

  // subjects
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  subjectLeft: { flex: 1, gap: 6 },
  subjectName: { fontSize: 13, color: T.ink },
  subjectRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    minWidth: 52,
  },
  subjectPct: { fontSize: 13 },

  // weak spots
  weakRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9 },
  weakName: { fontSize: 13, color: T.ink },
  weakSub: { color: T.sub, textTransform: "capitalize", marginTop: 1 },
  weakPct: { fontSize: 14 },

  // recs
  recRow: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    alignItems: "center",
  },
  recIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  recText: { flex: 1, color: T.ink, lineHeight: 18 },

  // menu
  menu: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: T.line,
    marginHorizontal: 14,
    marginTop: 16,
    paddingVertical: 6,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 2,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  linkText: { fontSize: 14 },
  linkNav: { flex: 1, alignItems: "flex-end", marginRight: 2 },
  linkChevron: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: T.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  sep: {
    height: 0,
    borderTopWidth: 1.5,
    borderTopColor: T.line,
    borderStyle: "dashed",
    width: "90%",
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
