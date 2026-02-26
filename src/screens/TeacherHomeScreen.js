/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Screen from "../components/Screen";
import AppLogo from "../components/AppLogo";
import AppModal from "../components/AppModal";
import AppText from "../components/AppText";
import NewAnnouncement from "../components/NewAnnouncement";
import colors from "../helpers/colors";
import { selectUser } from "../context/usersSlice";
import {
  selectSchool,
  useFetchSchoolQuery,
  useFetchSchoolDashboardQuery,
} from "../context/schoolSlice";
import { PAD_BOTTOM } from "../helpers/dataStore";
import { capFirstLetter } from "../helpers/helperFunctions";
import { useRouter } from "expo-router";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const CLASS_ORDER = ["jss 1", "jss 2", "jss 3", "sss 1", "sss 2", "sss 3"];
const CLASS_LABELS = {
  "jss 1": "JSS 1",
  "jss 2": "JSS 2",
  "jss 3": "JSS 3",
  "sss 1": "SS 1",
  "sss 2": "SS 2",
  "sss 3": "SS 3",
};
const READINESS_COLORS = {
  "Exam Ready": "#10B981",
  "On Track": "#3B82F6",
  "Needs Attention": "#F59E0B",
  "At Risk": "#EF4444",
};
const TAG_COLORS = {
  strongest: "#10B981",
  strong: "#3B82F6",
  average: "#F59E0B",
  weak: "#F97316",
  weakest: "#EF4444",
};

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD ACTIONS  (mirrors SchoolDashboardScreen)
// ─────────────────────────────────────────────────────────────────────────────
const DASHBOARD_ACTIONS = [
  {
    id: "quiz",
    name: "Quiz",
    icon: "rocket-outline",
    color: "#6366F1",
    nav: { screen: "/(protected)/school/quiz", data: {} },
  },
  {
    id: "assignment",
    name: "Assignments",
    icon: "book-outline",
    color: "#10B981",
    nav: {
      screen: "/(protected)/school/assignments",
      data: { screen: "Home" },
    },
  },
  {
    id: "announcement",
    name: "Announce",
    icon: "megaphone-outline",
    color: "#F59E0B",
    modal: "announcement",
  },
  {
    id: "classes",
    name: "Classes",
    icon: "school-outline",
    color: "#EC4899",
    nav: { screen: "/(protected)/school/classes", data: { screen: "Home" } },
  },
  {
    id: "verify-students",
    name: "Verify Students",
    icon: "people-outline",
    color: "#8B5CF6",
    nav: {
      screen: "/(protected)/school/instance_verify",
      data: { type: "student" },
    },
  },
  {
    id: "verify-teachers",
    name: "Verify Teachers",
    icon: "person-add-outline",
    color: "#3B82F6",
    nav: {
      screen: "/(protected)/school/instance_verify",
      data: { type: "teacher" },
    },
  },
  {
    id: "subscription",
    name: "Subscription",
    icon: "card-outline",
    color: "#14B8A6",
    nav: { screen: "/(protected)/school/subs", data: { screen: "School" } },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER UTILS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n, decimals = 1) =>
  n == null ? "—" : Number(n).toFixed(decimals);

const capName = (s) => (s ? s.split(" ").map(capFirstLetter).join(" ") : "");

const msToMins = (ms) => (ms ? `${Math.round(ms / 60000)}m` : "—");

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Animated circular accuracy ring */
const AccuracyRing = ({ value = 0, size = 110, delay = 0 }) => {
  const progress = useSharedValue(0);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    progress.value = withTiming(value / 100, { duration: 1200 + delay });
  }, [value]);

  const strokeStyle = useAnimatedStyle(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const scaleAnim = useSharedValue(0.7);
  useEffect(() => {
    scaleAnim.value = withSpring(1, { damping: 14, stiffness: 120, delay });
  }, []);
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const color = value >= 70 ? "#10B981" : value >= 50 ? "#F59E0B" : "#EF4444";

  return (
    <Animated.View
      style={[styles.ringContainer, { width: size, height: size }, scaleStyle]}
    >
      <View
        style={[
          styles.ringOuter,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color + "30",
          },
        ]}
      >
        <View
          style={[
            styles.ringInner,
            {
              width: size - 16,
              height: size - 16,
              borderRadius: (size - 16) / 2,
              borderColor: color,
              borderTopColor: color + "20",
              transform: [{ rotate: `${(value / 100) * 360 - 90}deg` }],
            },
          ]}
        />
      </View>
      <View style={styles.ringTextContainer}>
        <AppText size={22} fontWeight="black" style={{ color }}>
          {fmt(value, 0)}%
        </AppText>
        <AppText size={10} style={{ color: "rgba(255,255,255,0.7)" }}>
          accuracy
        </AppText>
      </View>
    </Animated.View>
  );
};

/** Single stat card (overview section) */
const StatCard = ({
  icon,
  label,
  value,
  color = colors.primary,
  delay = 0,
}) => (
  <Animated.View
    entering={FadeInDown.delay(delay).springify()}
    style={styles.statCard}
  >
    <View style={[styles.statIconWrap, { backgroundColor: color + "18" }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <AppText size={16} fontWeight="bold" style={styles.statValue}>
      {value}
    </AppText>
    <AppText size={10} style={styles.statLabel}>
      {label}
    </AppText>
  </Animated.View>
);

/** Horizontal bar for subject breakdown */
const SubjectBar = ({ item, maxAccuracy, delay = 0 }) => {
  const barWidth = useSharedValue(0);
  const targetWidth = item.accuracyRate / Math.max(maxAccuracy, 1);
  const color = TAG_COLORS[item.tag] || colors.primary;

  useEffect(() => {
    barWidth.value = withTiming(targetWidth, { duration: 900 + delay * 0.3 });
  }, [targetWidth]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${interpolate(barWidth.value, [0, 1], [0, 100], Extrapolation.CLAMP)}%`,
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400)}
      style={styles.subjectRow}
    >
      <View style={styles.subjectLeft}>
        <AppText size={10} style={styles.subjectRank}>
          #{item.rank}
        </AppText>
        <AppText
          size={12}
          fontWeight="medium"
          style={styles.subjectName}
          numberOfLines={1}
        >
          {capName(item.subjectName)}
        </AppText>
      </View>
      <View style={styles.subjectBarTrack}>
        <Animated.View
          style={[styles.subjectBarFill, { backgroundColor: color }, barStyle]}
        />
      </View>
      <View style={[styles.subjectTag, { backgroundColor: color + "20" }]}>
        <AppText size={11} fontWeight="bold" style={{ color }}>
          {fmt(item.accuracyRate, 0)}%
        </AppText>
      </View>
    </Animated.View>
  );
};

/** Class comparison row */
const ClassRow = ({ item, isSelected, onPress, delay = 0 }) => {
  const color =
    item.avgAccuracy >= 70
      ? "#10B981"
      : item.avgAccuracy >= 50
        ? "#3B82F6"
        : "#EF4444";

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <Pressable
        onPress={onPress}
        style={[styles.classRow, isSelected && styles.classRowSelected]}
      >
        <View
          style={[styles.classLevelBadge, { backgroundColor: color + "20" }]}
        >
          <AppText size={12} fontWeight="bold" style={{ color }}>
            {CLASS_LABELS[item.classLevel] || item.classLevel?.toUpperCase()}
          </AppText>
        </View>
        <View style={styles.classStats}>
          <AppText size={15} fontWeight="bold" style={styles.classStatMain}>
            {fmt(item.avgAccuracy, 0)}%
          </AppText>
          <AppText size={10} style={styles.classStatSub}>
            {item.totalQuizzes} quizzes
          </AppText>
        </View>
        <View style={styles.classStats}>
          <AppText size={15} fontWeight="bold" style={styles.classStatMain}>
            {item.studentCount}
          </AppText>
          <AppText size={10} style={styles.classStatSub}>
            students
          </AppText>
        </View>
        <View style={styles.classStats}>
          <AppText size={15} fontWeight="bold" style={styles.classStatMain}>
            {msToMins(item.avgDuration)}
          </AppText>
          <AppText size={10} style={styles.classStatSub}>
            avg time
          </AppText>
        </View>
        <Ionicons
          name={isSelected ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.grey}
        />
      </Pressable>

      {/* Expanded subject breakdown per class */}
      {isSelected && item.subjectBreakdown?.length > 0 && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.classExpandedWrap}
        >
          {item.subjectBreakdown.map((subj, idx) => (
            <View key={idx} style={styles.classSubjectRow}>
              <AppText
                size={11}
                style={styles.classSubjectName}
                numberOfLines={1}
              >
                {capName(subj.subjectName)}
              </AppText>
              <View style={styles.classSubjectBarTrack}>
                <View
                  style={[
                    styles.classSubjectBarFill,
                    {
                      width: `${subj.accuracyRate}%`,
                      backgroundColor:
                        subj.accuracyRate >= 70
                          ? "#10B981"
                          : subj.accuracyRate >= 50
                            ? "#F59E0B"
                            : "#EF4444",
                    },
                  ]}
                />
              </View>
              <AppText
                size={11}
                fontWeight="semibold"
                style={styles.classSubjectPct}
              >
                {fmt(subj.accuracyRate, 0)}%
              </AppText>
            </View>
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
};

/** Student row (top 10 / most improved) */
const StudentRow = ({ item, rank, showImprovement = false, delay = 0 }) => {
  const initials =
    `${item.firstName?.[0] ?? ""}${item.lastName?.[0] ?? ""}`.toUpperCase();
  const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      style={styles.studentRow}
    >
      <View
        style={[
          styles.rankBadge,
          rank <= 3 && { backgroundColor: medalColors[rank - 1] + "25" },
        ]}
      >
        <AppText
          size={13}
          fontWeight="bold"
          style={[
            styles.rankText,
            rank <= 3 && { color: medalColors[rank - 1] },
          ]}
        >
          {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}
        </AppText>
      </View>
      <View style={styles.avatarCircle}>
        <AppText size={13} fontWeight="bold" style={styles.avatarInitials}>
          {initials}
        </AppText>
      </View>
      <View style={styles.studentInfo}>
        <AppText
          size={13}
          fontWeight="semibold"
          style={styles.studentName}
          numberOfLines={1}
        >
          {capName(item.firstName)} {capName(item.lastName)}
        </AppText>
        <AppText size={11} style={styles.studentClass}>
          {CLASS_LABELS[item.classLevel] ||
            item.classLevel?.toUpperCase() ||
            "—"}
        </AppText>
      </View>
      <View style={styles.studentStat}>
        {showImprovement ? (
          <>
            <AppText
              size={15}
              fontWeight="bold"
              style={[
                styles.studentStatMain,
                { color: item.improvement > 0 ? "#10B981" : "#EF4444" },
              ]}
            >
              {item.improvement > 0 ? "+" : ""}
              {fmt(item.improvement, 1)}%
            </AppText>
            <AppText size={10} style={styles.studentStatSub}>
              {fmt(item.recentAccuracy, 0)}% now
            </AppText>
          </>
        ) : (
          <>
            <AppText size={15} fontWeight="bold" style={styles.studentStatMain}>
              {fmt(item.overallAccuracy, 0)}%
            </AppText>
            <AppText size={10} style={styles.studentStatSub}>
              {item.totalQuizzes} quizzes
            </AppText>
          </>
        )}
      </View>
    </Animated.View>
  );
};

/** Readiness index card per class */
const ReadinessCard = ({ item, delay = 0 }) => {
  const color = READINESS_COLORS[item.readinessLabel] || colors.primary;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(item.avgReadiness / 100, {
      duration: 1000 + delay,
    });
  }, [item.avgReadiness]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      style={styles.readinessCard}
    >
      <View style={styles.readinessTop}>
        <AppText size={14} fontWeight="bold" style={styles.readinessClass}>
          {CLASS_LABELS[item.classLevel] || item.classLevel?.toUpperCase()}
        </AppText>
        <View
          style={[styles.readinessBadge, { backgroundColor: color + "20" }]}
        >
          <AppText size={11} fontWeight="bold" style={{ color }}>
            {item.readinessLabel}
          </AppText>
        </View>
      </View>
      <View style={styles.readinessBarTrack}>
        <Animated.View
          style={[
            styles.readinessBarFill,
            { backgroundColor: color },
            barStyle,
          ]}
        />
      </View>
      <View style={styles.readinessBottom}>
        <AppText size={13} fontWeight="bold" style={{ color }}>
          {fmt(item.avgReadiness, 0)}/100
        </AppText>
        <AppText size={11} style={styles.readinessMeta}>
          {item.studentCount} students
        </AppText>
      </View>
    </Animated.View>
  );
};

/** Section header with optional "see all" */
const SectionHeader = ({ title, subtitle, icon, onSeeAll }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View>
        <AppText size={15} fontWeight="bold" style={styles.sectionTitle}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText size={11} style={styles.sectionSubtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </View>
    {onSeeAll && (
      <Pressable onPress={onSeeAll} style={styles.seeAllBtn}>
        <AppText size={12} fontWeight="semibold" style={styles.seeAllText}>
          See all
        </AppText>
      </Pressable>
    )}
  </View>
);

/** Skeleton loading placeholder */
const SkeletonBlock = ({ width = "100%", height = 16, radius = 8, style }) => {
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withTiming(0.8, { duration: 700 }, () => {
      opacity.value = withTiming(0.4, { duration: 700 }, () => {
        opacity.value = withTiming(0.8, { duration: 700 });
      });
    });
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: "#E5E7EB" },
        animStyle,
        style,
      ]}
    />
  );
};

const DashboardSkeleton = () => (
  <View style={{ padding: 20, gap: 16 }}>
    <SkeletonBlock height={120} radius={16} />
    <View style={{ flexDirection: "row", gap: 10 }}>
      {[1, 2, 3, 4].map((i) => (
        <SkeletonBlock key={i} width="22%" height={80} radius={12} />
      ))}
    </View>
    <SkeletonBlock height={200} radius={16} />
    <SkeletonBlock height={160} radius={16} />
    <SkeletonBlock height={240} radius={16} />
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// NOT VERIFIED / NO SCHOOL STATE
// ─────────────────────────────────────────────────────────────────────────────
const UnverifiedState = ({ hasSchool }) => {
  const bounce = useSharedValue(0);
  useEffect(() => {
    bounce.value = withSpring(1, { damping: 10, stiffness: 100 });
  }, []);
  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounce.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(600)}
      style={styles.unverifiedContainer}
    >
      <Animated.View style={[styles.unverifiedIconWrap, bounceStyle]}>
        <Ionicons
          name={hasSchool ? "time-outline" : "school-outline"}
          size={52}
          color={colors.primary}
        />
      </Animated.View>
      <AppText size={22} fontWeight="black" style={styles.unverifiedTitle}>
        {hasSchool ? "Verification Pending" : "No School Linked"}
      </AppText>
      <AppText size={14} style={styles.unverifiedBody}>
        {hasSchool
          ? "Your account is awaiting verification by the school principal. Once approved, your full dashboard will appear here."
          : "You haven't joined a school yet. Search for your school and submit a join request to access the academic dashboard."}
      </AppText>
      {!hasSchool && (
        <Pressable style={styles.unverifiedCta}>
          <AppText size={15} fontWeight="bold" style={styles.unverifiedCtaText}>
            Find My School
          </AppText>
        </Pressable>
      )}
      {hasSchool && (
        <View style={styles.unverifiedSteps}>
          {[
            "Request submitted",
            "Awaiting principal approval",
            "Dashboard unlocked",
          ].map((step, i) => (
            <Animated.View
              key={i}
              entering={FadeInDown.delay(i * 150).springify()}
              style={styles.stepRow}
            >
              <View
                style={[
                  styles.stepDot,
                  i === 0 && styles.stepDotDone,
                  i === 1 && styles.stepDotActive,
                ]}
              />
              <AppText
                size={14}
                fontWeight={i === 0 ? "semibold" : "regular"}
                style={[styles.stepText, i === 0 && styles.stepTextDone]}
              >
                {step}
              </AppText>
            </Animated.View>
          ))}
        </View>
      )}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CACHE BADGE (shows when rendering from cache)
// ─────────────────────────────────────────────────────────────────────────────
const CacheBadge = ({ ageMs }) => {
  const mins = Math.round(ageMs / 60000);
  return (
    <Animated.View entering={FadeIn} style={styles.cacheBadge}>
      <Ionicons name="time-outline" size={11} color={colors.grey} />
      <AppText size={10} style={styles.cacheBadgeText}>
        {mins < 1 ? "just now" : `${mins}m ago`}
      </AppText>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD ACTION GRID
// ─────────────────────────────────────────────────────────────────────────────
const DashboardActionGrid = ({ onPress }) => (
  <Animated.View
    entering={FadeInDown.delay(120).springify()}
    style={styles.actionGrid}
  >
    {DASHBOARD_ACTIONS.map((action, idx) => (
      <Animated.View
        key={action.id}
        entering={FadeInDown.delay(80 + idx * 55).springify()}
        style={styles.actionItemWrap}
      >
        <Pressable
          onPress={() => onPress(action)}
          style={({ pressed }) => [
            styles.actionItem,
            pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
          ]}
        >
          <View
            style={[
              styles.actionIconWrap,
              { backgroundColor: action.color + "18" },
            ]}
          >
            <Ionicons name={action.icon} size={22} color={action.color} />
          </View>
          <AppText
            size={11}
            fontWeight="semibold"
            style={styles.actionLabel}
            numberOfLines={1}
          >
            {action.name}
          </AppText>
        </Pressable>
      </Animated.View>
    ))}
  </Animated.View>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const TeacherHomeScreen = () => {
  const user = useSelector(selectUser);
  const school = useSelector(selectSchool);
  const { data: schoolData, isLoading: schoolLoading } = useFetchSchoolQuery();
  const [expandedClass, setExpandedClass] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState({ vis: false, type: null });
  const router = useRouter();

  const schoolInfo = schoolData?.data;
  const isVerified = schoolData?.isVerified;
  const schoolId = schoolInfo?._id ?? school?._id;

  // Only fetch dashboard if teacher is verified and has a school
  const {
    data: dashboardRes,
    isLoading: dashLoading,
    isFetching: dashFetching,
    refetch: refetchDashboard,
    error: dashError,
  } = useFetchSchoolDashboardQuery(schoolId, {
    skip: !schoolId || !isVerified,
  });

  const dashboard = dashboardRes?.data;
  const fromCache = dashboardRes?._fromCache;
  const cacheAge = dashboardRes?._cacheAge;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Clear AsyncStorage cache so next fetch goes to network
    try {
      await AsyncStorage.removeItem(`school_dashboard_${schoolId}`);
    } catch (_) {}
    await refetchDashboard();
    setRefreshing(false);
  }, [schoolId]);

  const toggleClass = (classLevel) => {
    setExpandedClass((prev) => (prev === classLevel ? null : classLevel));
  };

  const handleActionPress = (item) => {
    if (item?.modal) {
      setModal({ vis: true, type: item.modal });
    } else if (item?.nav) {
      console.log({ nav: item?.nav?.data });
      router.push({
        pathname: item.nav.screen,
        // params: { ...item?.nav?.data },
        params: { data: JSON.stringify(item.nav.data) },
      });
    }
  };

  // Resolve modal component
  let ModalComponent = null;
  if (modal.type === "announcement") ModalComponent = NewAnnouncement;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (schoolLoading) {
    return (
      <Screen style={styles.container}>
        <View style={styles.header}>
          <AppLogo />
        </View>
        <DashboardSkeleton />
      </Screen>
    );
  }

  // ── No school / Unverified ─────────────────────────────────────────────────
  if (!schoolInfo?._id || !isVerified) {
    return (
      <Screen style={styles.container}>
        <View style={styles.header}>
          <AppLogo />
        </View>
        <UnverifiedState hasSchool={!!schoolInfo?._id} />
        <StatusBar style="dark" />
      </Screen>
    );
  }

  // ── Dashboard loading ──────────────────────────────────────────────────────
  const isDashLoading = dashLoading && !dashboard;

  return (
    <Screen style={styles.container}>
      {/* ── Header ── */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <AppLogo />
        <View style={styles.headerCenter}>
          <AppText size={11} style={styles.greetingText}>
            {greeting()},
          </AppText>
          <AppText
            size={15}
            fontWeight="bold"
            style={styles.teacherName}
            numberOfLines={1}
          >
            {capName(user?.preffix)} {capName(user?.firstName)}
          </AppText>
          {dashFetching && !refreshing && (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ marginRight: 8 }}
            />
          )}
          {fromCache && !dashFetching && <CacheBadge ageMs={cacheAge} />}
        </View>
        {/* <View style={styles.headerRight}></View> */}
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: PAD_BOTTOM + 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {isDashLoading ? (
          <DashboardSkeleton />
        ) : dashError ? (
          <Animated.View entering={FadeIn} style={styles.errorWrap}>
            <Ionicons
              name="cloud-offline-outline"
              size={40}
              color={colors.grey}
            />
            <AppText size={15} style={styles.errorText}>
              Failed to load dashboard
            </AppText>
            <Pressable onPress={onRefresh} style={styles.retryBtn}>
              <AppText size={14} fontWeight="bold" style={styles.retryText}>
                Retry
              </AppText>
            </Pressable>
          </Animated.View>
        ) : (
          <>
            {/* ── School Hero Card ── */}
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              style={styles.heroCard}
            >
              <View style={styles.heroLeft}>
                <AppText
                  size={18}
                  fontWeight="bold"
                  style={styles.heroSchoolName}
                  numberOfLines={1}
                >
                  {capName(schoolInfo?.name)}
                </AppText>
                <AppText size={12} style={styles.heroMeta}>
                  {dashboard?.overview?.totalStudents ??
                    schoolInfo?.students?.filter((s) => s.verified)?.length ??
                    0}{" "}
                  students
                  {"  ·  "}
                  {dashboard?.overview?.totalTeachers ?? 0} teachers
                </AppText>
                <View style={styles.heroParticipation}>
                  <View
                    style={[
                      styles.heroParticipationBar,
                      {
                        width: `${dashboard?.overview?.participationRate ?? 0}%`,
                      },
                    ]}
                  />
                </View>
                <AppText size={11} style={styles.heroParticipationLabel}>
                  {fmt(dashboard?.overview?.participationRate, 0)}% active last
                  30 days
                </AppText>
              </View>
              <AccuracyRing
                value={dashboard?.overview?.overallAccuracy ?? 0}
                delay={200}
              />
            </Animated.View>

            {/* ── Quick Actions Grid ── */}
            <View style={styles.section}>
              <SectionHeader icon="grid-outline" title="Quick Actions" />
              <DashboardActionGrid onPress={handleActionPress} />
            </View>

            {/* ── Stat Cards Row ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}
            >
              <StatCard
                icon="library-outline"
                label="Total Quizzes"
                value={
                  dashboard?.overview?.totalQuizzesTaken?.toLocaleString() ??
                  "—"
                }
                color="#6366F1"
                delay={150}
              />
              <StatCard
                icon="checkmark-circle-outline"
                label="Questions Done"
                value={
                  dashboard?.overview?.totalQuestionsAnswered?.toLocaleString() ??
                  "—"
                }
                color="#10B981"
                delay={200}
              />
              <StatCard
                icon="flash-outline"
                label="Active / 30d"
                value={dashboard?.engagement?.activeStudentsLast30d ?? "—"}
                color="#F59E0B"
                delay={250}
              />
              <StatCard
                icon="timer-outline"
                label="Avg Session"
                value={msToMins(dashboard?.engagement?.avgSessionDurationMs)}
                color="#EC4899"
                delay={300}
              />
              <StatCard
                icon="trending-up-outline"
                label="Daily Quizzes"
                value={`${dashboard?.engagement?.avgQuizzesPerDay ?? "—"}/day`}
                color="#8B5CF6"
                delay={350}
              />
            </ScrollView>

            {/* ── WAEC / JAMB Readiness ── */}
            {dashboard?.readinessIndex?.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  icon="ribbon-outline"
                  title="Exam Readiness"
                  subtitle="WAEC / NECO / JAMB readiness by class"
                />
                {[...dashboard.readinessIndex]
                  .sort(
                    (a, b) =>
                      CLASS_ORDER.indexOf(a.classLevel) -
                      CLASS_ORDER.indexOf(b.classLevel),
                  )
                  .map((item, idx) => (
                    <ReadinessCard
                      key={item.classLevel}
                      item={item}
                      delay={idx * 80}
                    />
                  ))}
              </View>
            )}

            {/* ── Subject Strength & Weakness ── */}
            {dashboard?.subjectBreakdown?.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  icon="bar-chart-outline"
                  title="Subject Performance"
                  subtitle="School-wide accuracy per subject"
                />
                {dashboard.subjectBreakdown.map((item, idx) => (
                  <SubjectBar
                    key={item.subjectId}
                    item={item}
                    maxAccuracy={
                      dashboard.subjectBreakdown[0]?.accuracyRate ?? 100
                    }
                    delay={idx * 60}
                  />
                ))}
              </View>
            )}

            {/* ── Class Comparison ── */}
            {dashboard?.classComparison?.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  icon="people-outline"
                  title="Class Comparison"
                  subtitle="Tap a class to see subject breakdown"
                />
                <Animated.View layout={LinearTransition}>
                  {[...dashboard.classComparison]
                    .sort(
                      (a, b) =>
                        CLASS_ORDER.indexOf(a.classLevel) -
                        CLASS_ORDER.indexOf(b.classLevel),
                    )
                    .map((item, idx) => (
                      <ClassRow
                        key={item.classLevel}
                        item={item}
                        isSelected={expandedClass === item.classLevel}
                        onPress={() => toggleClass(item.classLevel)}
                        delay={idx * 80}
                      />
                    ))}
                </Animated.View>
              </View>
            )}

            {/* ── Top 10 Students ── */}
            {dashboard?.topStudents?.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  icon="trophy-outline"
                  title="Top Students"
                  subtitle="Ranked by overall accuracy"
                />
                {dashboard.topStudents.slice(0, 10).map((item, idx) => (
                  <StudentRow
                    key={item.userId}
                    item={item}
                    rank={idx + 1}
                    delay={idx * 60}
                  />
                ))}
              </View>
            )}

            {/* ── Most Improved ── */}
            {dashboard?.mostImproved?.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  icon="trending-up-outline"
                  title="Most Improved"
                  subtitle="Last 30 days vs prior 30 days"
                />
                {dashboard.mostImproved.slice(0, 10).map((item, idx) => (
                  <StudentRow
                    key={item.userId}
                    item={item}
                    rank={idx + 1}
                    showImprovement
                    delay={idx * 60}
                  />
                ))}
              </View>
            )}

            {/* ── Empty state if no quiz data yet ── */}
            {dashboard?.overview?.totalQuizzesTaken === 0 && (
              <Animated.View
                entering={FadeIn.delay(400)}
                style={styles.emptyWrap}
              >
                <Ionicons
                  name="analytics-outline"
                  size={48}
                  color={colors.primary + "80"}
                />
                <AppText size={18} fontWeight="bold" style={styles.emptyTitle}>
                  No quiz data yet
                </AppText>
                <AppText size={13} style={styles.emptyBody}>
                  Performance data will appear here once students start taking
                  Guru quizzes.
                </AppText>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>

      <StatusBar style="dark" />

      {/* ── Modals ── */}
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
    </Screen>
  );
};

export default TeacherHomeScreen;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.unchange,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    // backgroundColor: "#F8F9FB",
    gap: 10,
    justifyContent: "space-between",
  },
  headerCenter: {
    // flex: 1,
  },
  greetingText: {
    color: "#9CA3AF",
  },
  teacherName: {
    color: "#111827",
    textTransform: "capitalize",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },

  // ── Cache badge ──
  cacheBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cacheBadgeText: {
    color: "#9CA3AF",
  },

  // ── Hero card ──
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0px 8px 24px rgba(0,0,0,0.18)",
  },
  heroLeft: {
    flex: 1,
    paddingRight: 12,
  },
  heroSchoolName: {
    color: "#FFF",
    textTransform: "capitalize",
    marginBottom: 4,
  },
  heroMeta: {
    color: "rgba(255,255,255,0.7)",
    marginBottom: 12,
  },
  heroParticipation: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 2,
    marginBottom: 6,
    overflow: "hidden",
  },
  heroParticipationBar: {
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: 2,
  },
  heroParticipationLabel: {
    color: "rgba(255,255,255,0.8)",
  },

  // ── Accuracy ring ──
  ringContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  ringOuter: {
    borderWidth: 8,
    position: "absolute",
  },
  ringInner: {
    position: "absolute",
    borderWidth: 8,
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
  },
  ringTextContainer: {
    alignItems: "center",
  },

  // ── Stat cards ──
  statsRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    minWidth: 90,
    boxShadow: "0px 2px 8px rgba(0,0,0,0.06)",
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    color: "#111827",
  },
  statLabel: {
    color: "#9CA3AF",
    marginTop: 2,
    textAlign: "center",
  },

  // ── Sections ──
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0px 2px 10px rgba(0,0,0,0.05)",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    color: "#111827",
  },
  sectionSubtitle: {
    color: "#9CA3AF",
    marginTop: 1,
  },
  seeAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: colors.primary + "15",
    borderRadius: 20,
  },
  seeAllText: {
    color: colors.primary,
  },

  // ── Action grid ──
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionItemWrap: {
    width: "30%",
    flexGrow: 1,
    alignItems: "baseline",
  },
  actionItem: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    gap: 8,
  },
  actionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    color: "#374151",
    textAlign: "center",
    marginTop: 6,
  },

  // ── Subject bar ──
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  subjectLeft: {
    flexDirection: "row",
    alignItems: "center",
    width: 110,
    gap: 4,
  },
  subjectRank: {
    color: "#9CA3AF",
    width: 20,
  },
  subjectName: {
    color: "#374151",
    flex: 1,
    textTransform: "capitalize",
  },
  subjectBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
  },
  subjectBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  subjectTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    minWidth: 44,
    alignItems: "center",
  },

  // ── Class rows ──
  classRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 8,
  },
  classRowSelected: {
    backgroundColor: colors.primary + "08",
    borderRadius: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 0,
  },
  classLevelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 52,
    alignItems: "center",
  },
  classStats: {
    flex: 1,
    alignItems: "center",
  },
  classStatMain: {
    color: "#111827",
  },
  classStatSub: {
    color: "#9CA3AF",
  },
  classExpandedWrap: {
    paddingHorizontal: 8,
    paddingBottom: 12,
    gap: 6,
  },
  classSubjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  classSubjectName: {
    color: "#6B7280",
    width: 90,
    textTransform: "capitalize",
  },
  classSubjectBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  classSubjectBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  classSubjectPct: {
    color: "#374151",
    width: 36,
    textAlign: "right",
  },

  // ── Student rows ──
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
    gap: 10,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  rankText: {
    color: "#6B7280",
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + "25",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: colors.primary,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    color: "#111827",
    textTransform: "capitalize",
  },
  studentClass: {
    color: "#9CA3AF",
    marginTop: 1,
  },
  studentStat: {
    alignItems: "flex-end",
  },
  studentStatMain: {
    color: "#111827",
  },
  studentStatSub: {
    color: "#9CA3AF",
  },

  // ── Readiness cards ──
  readinessCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  readinessTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  readinessClass: {
    color: "#111827",
    textTransform: "uppercase",
  },
  readinessBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  readinessBarTrack: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  readinessBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  readinessBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  readinessMeta: {
    color: "#9CA3AF",
  },

  // ── Unverified / no school ──
  unverifiedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    paddingTop: 40,
  },
  unverifiedIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  unverifiedTitle: {
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
  },
  unverifiedBody: {
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  unverifiedCta: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 14,
  },
  unverifiedCtaText: {
    color: "#FFF",
  },
  unverifiedSteps: {
    alignSelf: "stretch",
    gap: 14,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E5E7EB",
  },
  stepDotDone: {
    backgroundColor: "#10B981",
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepText: {
    color: "#9CA3AF",
  },
  stepTextDone: {
    color: "#10B981",
  },

  // ── Error / empty ──
  errorWrap: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  errorText: {
    color: "#6B7280",
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: {
    color: "#FFF",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    color: "#374151",
  },
  emptyBody: {
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
});
