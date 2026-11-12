import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import React, { useState, useCallback, useMemo, useRef, useId } from "react";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams } from "expo-router";

import colors from "../helpers/colors";
import Avatar from "../components/Avatar";
import AppHeader from "../components/AppHeader";
import AppText from "../components/AppText";
import Points from "../components/Points";
import { formatPoints, getFullName } from "../helpers/helperFunctions";
import { useSelector } from "react-redux";
import {
  selectUser,
  useFetchGlobalLeaderboardQuery,
  useFetchProLeaderboardQuery,
} from "../context/usersSlice";
import LottieAnimator from "../components/LottieAnimator";
import { nanoid } from "@reduxjs/toolkit";
import {
  useFetchSchoolLeaderboardQuery,
  useFetchSchoolsLeaderboardQuery,
} from "../context/schoolSlice";

const { width, height } = Dimensions.get("screen");
const LIMIT = 25;

// ─── Filter modes (only relevant when shouldFetchGlobal is true) ─────────────
const FILTER_STUDENTS = "students";
const FILTER_SCHOOLS = "schools";

// ─── School leaderboard item ─────────────────────────────────────────────────
export const SchoolLeaderboardItem = ({ item, index }) => {
  if (index < 3) return null;

  const pointText = formatPoints(item.totalPoints ?? 0);

  return (
    <View
      style={{
        backgroundColor: colors.light,
        paddingLeft: 10,
        borderTopStartRadius: index === 3 ? 10 : 0,
        borderTopEndRadius: index === 3 ? 10 : 0,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 12,
          paddingVertical: 18,
        }}
      >
        <AppText fontWeight="black" size="xxlarge">
          {item.rank ?? index + 1}
        </AppText>
        {/* School avatar — fall back to the rep's avatar, then initials */}
        <Avatar
          style={{ marginLeft: 15 }}
          size={50}
          source={item?.repAvatar?.image ?? item?.avatar?.image}
          contStyle={{ flex: 1 }}
          textStyle={{
            flex: 1,
            marginLeft: 15,
            maxWidth: null,
            textAlign: "flex-start",
          }}
          name={item.name ?? "School"}
          horizontal
        />
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <AppText fontWeight="heavy" size="large">
            {pointText}
          </AppText>
          <AppText size="xsmall" style={{ color: colors.grey, marginTop: 2 }}>
            {item.studentCount ?? 0} students
          </AppText>
        </View>
      </View>
      <View style={styles.separator} />
    </View>
  );
};

// ─── Top-3 champions (reused for both students and schools) ──────────────────
const LeaderboardChampion = ({
  name,
  userID,
  avatar,
  award,
  loading,
  numberOfLines,
  isPro,
  isSchools,
  points,
  hideSuffix,
  textColor,
}) => {
  return (
    <View
      style={{
        alignSelf: "center",
        alignItems: "center",
        marginHorizontal: isSchools ? -5 : 10,
      }}
    >
      <Avatar
        name={name ?? `#${award}`}
        award={award}
        userID={userID}
        source={avatar}
        numberOfLines={numberOfLines}
        size={width * 0.2}
        textStyle={{
          marginTop: 18,
          marginBottom: 6,
          width: "100%",
          color: textColor ?? colors.white,
        }}
        textFontsize="medium"
      />
      <Points
        value={points ?? 0}
        hideSuffix={hideSuffix ?? isPro}
        fontSize="xsmall"
        style={{ backgroundColor: colors.unchange }}
      />
      <LottieAnimator visible={loading} wTransparent absolute size={80} />
    </View>
  );
};

export const LeaderboardItem = ({ item, isPro, index }) => {
  if (index < 3) return null;

  let pointText = formatPoints(item.totalPoints ?? item?.questionsCount);
  if (isPro) pointText = pointText?.slice(0, -3);

  const loading = item?.hasFinished === false;

  return (
    <View
      style={{
        backgroundColor: colors.light,
        paddingLeft: 10,
        borderTopStartRadius: index === 3 ? 10 : 0,
        borderTopEndRadius: index === 3 ? 10 : 0,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 12,
          paddingVertical: 18,
        }}
      >
        <AppText fontWeight="black" size={"xxlarge"}>
          {item.rank ?? index + 1}
        </AppText>
        <Avatar
          style={{ marginLeft: 15 }}
          size={50}
          userID={item?._id}
          source={item?.avatar?.image}
          contStyle={{ flex: 1 }}
          textStyle={{
            flex: 1,
            marginLeft: 15,
            maxWidth: null,
            textAlign: "flex-start",
          }}
          name={getFullName(item)}
          horizontal
        />
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <AppText fontWeight="heavy" size={"large"}>
            {pointText}{" "}
          </AppText>
        </View>
        <LottieAnimator visible={loading} wTransparent absolute size={80} />
      </View>
      <View style={styles.separator} />
    </View>
  );
};

// ─── 3D champions podium (SVG) ───────────────────────────────────────────────
// Three solid blocks (front + top + right side) in gold / silver / bronze.
// Slot order matches the original layout: [3rd, 1st, 2nd].
const COL_W = width / 3;
const CHAMP_H = width * 0.2 + 92; // avatar + name + points pill
const PODIUM_H = Math.max(height * 0.4, CHAMP_H + 70 + 100);
const PODIUM_SLOTS = [
  { award: 3, top: 70 },
  { award: 1, top: 0 },
  { award: 2, top: 50 },
];
const PODIUM_TONES = {
  1: {
    front: ["#FFD873", "#F3B02D"],
    top: "#FFEBB0",
    side: ["#E39808", "#B97700"],
    num: "#8A5A00",
  },
  2: {
    front: ["#F7F8FB", "#CDD3DE"],
    top: "#FFFFFF",
    side: ["#B3BCCB", "#939DB0"],
    num: "#6B7587",
  },
  3: {
    front: ["#F2B887", "#CD7F32"],
    top: "#F9D9B8",
    side: ["#B5692A", "#8E4F1C"],
    num: "#6B3A12",
  },
};

const sparkle = (cx, cy, r) =>
  `${cx},${cy - r} ${cx + r * 0.28},${cy - r * 0.28} ${cx + r},${cy} ${cx + r * 0.28},${cy + r * 0.28} ${cx},${cy + r} ${cx - r * 0.28},${cy + r * 0.28} ${cx - r},${cy} ${cx - r * 0.28},${cy - r * 0.28}`;

const PodiumSvg = () => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const fw = COL_W * 0.7; // front face width
  const d = fw * 0.16; // 3D depth (x)
  const dy = d * 0.6; // 3D depth (y)
  // Blocks run straight down to the bottom edge (a pixel past it, to avoid a
  // hairline) so they sit flush under the list's rounded top - no gap, no strip.
  const base = PODIUM_H + 1;
  const midX = COL_W * 1.5;

  return (
    <Svg width={width} height={PODIUM_H}>
      <Defs>
        <RadialGradient id={`${uid}glow`} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
          <Stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </RadialGradient>
        {[1, 2, 3].flatMap((a) => [
          <SvgLinearGradient
            key={`f${a}`}
            id={`${uid}f${a}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <Stop offset="0" stopColor={PODIUM_TONES[a].front[0]} />
            <Stop offset="1" stopColor={PODIUM_TONES[a].front[1]} />
          </SvgLinearGradient>,
          <SvgLinearGradient
            key={`s${a}`}
            id={`${uid}s${a}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <Stop offset="0" stopColor={PODIUM_TONES[a].side[0]} />
            <Stop offset="1" stopColor={PODIUM_TONES[a].side[1]} />
          </SvgLinearGradient>,
        ])}
      </Defs>

      {/* glow behind the champion + sparkles */}
      <Circle
        cx={midX}
        cy={CHAMP_H * 0.55}
        r={COL_W * 0.85}
        fill={`url(#${uid}glow)`}
      />
      <Polygon
        points={sparkle(midX - COL_W * 0.55, 34, 8)}
        fill="#fff"
        opacity={0.85}
      />
      <Polygon
        points={sparkle(midX + COL_W * 0.6, 20, 6)}
        fill="#fff"
        opacity={0.7}
      />
      <Polygon
        points={sparkle(midX + COL_W * 0.3, CHAMP_H * 0.9, 5)}
        fill="#fff"
        opacity={0.6}
      />

      {PODIUM_SLOTS.map((s, i) => {
        const t = PODIUM_TONES[s.award];
        const cx = COL_W * i + COL_W / 2;
        const x = cx - (fw + d) / 2;
        const y = s.top + CHAMP_H + dy; // front top edge
        const h = base - y;
        const fs = fw * 0.5;

        return (
          <G key={s.award}>
            {/* right side */}
            <Polygon
              points={`${x + fw},${y} ${x + fw + d},${y - dy} ${x + fw + d},${y - dy + h} ${x + fw},${y + h}`}
              fill={`url(#${uid}s${s.award})`}
            />
            {/* top */}
            <Polygon
              points={`${x},${y} ${x + fw},${y} ${x + fw + d},${y - dy} ${x + d},${y - dy}`}
              fill={t.top}
            />
            {/* front */}
            <Rect
              x={x}
              y={y}
              width={fw}
              height={h}
              fill={`url(#${uid}f${s.award})`}
            />
            <Rect
              x={x}
              y={y}
              width={fw}
              height={5}
              fill="#fff"
              opacity={0.35}
            />
            {/* embossed place number */}
            <SvgText
              x={x + fw / 2}
              y={y + fs + 12 + 2}
              fontSize={fs}
              fontWeight="900"
              textAnchor="middle"
              fill="#000"
              opacity={0.18}
            >
              {s.award}
            </SvgText>
            <SvgText
              x={x + fw / 2}
              y={y + fs + 12}
              fontSize={fs}
              fontWeight="900"
              textAnchor="middle"
              fill="#fff"
            >
              {s.award}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
};

export const LeaderboardWinners = ({ data, isPro, isSchools, textColor }) => {
  const formattedData = [
    { ...data[2], isEmpty: Boolean(data[2]), award: 3 },
    { ...data[0], isEmpty: Boolean(data[0]), award: 1 },
    { ...data[1], isEmpty: Boolean(data[1]), award: 2 },
  ];

  const renderChamps = ({ item }) => {
    if (!item?.isEmpty) return <View style={{ width: width * 0.2 }} />;

    if (isSchools) {
      return (
        <LeaderboardChampion
          name={`${item.name}, ${item?.lga}`}
          award={item.award}
          avatar={item?.repAvatar?.image ?? item?.avatar?.image}
          hideSuffix={false}
          isSchools={isSchools}
          numberOfLines={2}
          points={item.totalPoints ?? 0}
          loading={false}
          textColor={textColor}
        />
      );
    }

    return (
      <LeaderboardChampion
        name={getFullName(item)}
        award={item.award}
        userID={item?._id}
        loading={item?.hasFinished === false}
        isPro={isPro}
        avatar={item?.avatar?.image}
        points={item.totalPoints ?? item?.questionsCount}
        textColor={textColor}
      />
    );
  };

  return (
    <View style={{ height: PODIUM_H }}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <PodiumSvg />
      </View>
      <View style={styles.championsRow}>
        {formattedData.map((item) => (
          <View
            key={item._id ?? nanoid()}
            style={{
              width: COL_W,
              alignItems: "center",
              top: item.award === 1 ? 0 : item.award === 2 ? 50 : 70,
            }}
          >
            {renderChamps({ item })}
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── Filter toggle pill (Students | Schools) ─────────────────────────────────
const FilterToggle = ({ active, onChange, backgroundColor }) => {
  const activeBg = colors.white;
  const activeText = backgroundColor; // contrast with header

  return (
    <View
      style={[styles.filterWrap, { borderColor: "rgba(255,255,255,0.35)" }]}
    >
      {[FILTER_STUDENTS, FILTER_SCHOOLS].map((mode) => {
        const isActive = active === mode;
        return (
          <Pressable
            key={mode}
            onPress={() => onChange(mode)}
            style={[
              styles.filterPill,
              isActive && { backgroundColor: activeBg },
            ]}
          >
            <AppText
              fontWeight={isActive ? "heavy" : "medium"}
              size="small"
              style={{ color: isActive ? activeText : colors.white }}
            >
              {mode === FILTER_STUDENTS ? "Students" : "Schools"}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
};

const LeaderboardScreen = () => {
  const user = useSelector(selectUser);
  const route = useLocalSearchParams();
  const routeData = Boolean(route?.data) ? JSON.parse(route?.data) : {};

  // ─── Filter state (Students vs Schools) — only when shouldFetchGlobal ──
  const [filterMode, setFilterMode] = useState(FILTER_STUDENTS);
  const isSchoolsMode = filterMode === FILTER_SCHOOLS;

  // ─── Pagination ──────────────────────────────────────────────────────────
  const offsetRef = useRef(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingMore = useRef(false);

  // ─── Account-type routing ────────────────────────────────────────────────
  const isPro =
    user?.accountType === "professional" || user?.accountType === "manager";
  const isStudent = user?.accountType === "student";
  const isTeacher = user?.accountType === "teacher";
  const isSchoolView = routeData?.screen === "School";

  const shouldFetchPro = isPro && !isSchoolView;
  const shouldFetchSchool = (isStudent || isTeacher) && isSchoolView;
  const shouldFetchGlobal = (isStudent || isTeacher) && !isSchoolView;

  // Only fetch schools leaderboard when the toggle is active
  const shouldFetchSchoolsLB = shouldFetchGlobal && isSchoolsMode;
  const shouldFetchStudentsLB = shouldFetchGlobal && !isSchoolsMode;

  // ─── Queries ─────────────────────────────────────────────────────────────
  const {
    data: proData,
    isLoading: proLoading,
    isFetching: proFetching,
    refetch: proRefetch,
  } = useFetchProLeaderboardQuery(
    { limit: LIMIT, offset },
    { skip: !shouldFetchPro },
  );

  const {
    data: schoolData,
    isLoading: schoolLoading,
    isFetching: schoolFetching,
    refetch: schoolRefetch,
  } = useFetchSchoolLeaderboardQuery(
    { limit: LIMIT, offset },
    { skip: !shouldFetchSchool },
  );

  const {
    data: globalData,
    isLoading: globalLoading,
    isFetching: globalFetching,
    refetch: globalRefetch,
  } = useFetchGlobalLeaderboardQuery(
    { limit: LIMIT, offset },
    { skip: !shouldFetchStudentsLB },
  );

  const {
    data: schoolsLBData,
    isLoading: schoolsLBLoading,
    isFetching: schoolsLBFetching,
    refetch: schoolsLBRefetch,
  } = useFetchSchoolsLeaderboardQuery(
    { limit: LIMIT, offset },
    { skip: !shouldFetchSchoolsLB },
  );

  // ─── Active data / helpers ───────────────────────────────────────────────
  const activeData = useMemo(() => {
    if (shouldFetchPro) return proData;
    if (shouldFetchSchool) return schoolData;
    if (shouldFetchSchoolsLB) return schoolsLBData;
    if (shouldFetchStudentsLB) return globalData;
    return null;
  }, [
    shouldFetchPro,
    shouldFetchSchool,
    shouldFetchSchoolsLB,
    shouldFetchStudentsLB,
    proData,
    schoolData,
    globalData,
    schoolsLBData,
  ]);

  const isLoading =
    proLoading || schoolLoading || globalLoading || schoolsLBLoading;
  const isFetching =
    proFetching || schoolFetching || globalFetching || schoolsLBFetching;

  const refetch = useMemo(() => {
    if (shouldFetchPro) return proRefetch;
    if (shouldFetchSchool) return schoolRefetch;
    if (shouldFetchSchoolsLB) return schoolsLBRefetch;
    if (shouldFetchStudentsLB) return globalRefetch;
    return () => {};
  }, [
    shouldFetchPro,
    shouldFetchSchool,
    shouldFetchSchoolsLB,
    shouldFetchStudentsLB,
    proRefetch,
    schoolRefetch,
    globalRefetch,
    schoolsLBRefetch,
  ]);

  const boardData = activeData?.data;
  const leaderboardArr = boardData?.leaderboard ?? [];

  // ─── Handle filter switch — reset pagination ─────────────────────────────
  const handleFilterChange = useCallback(
    (mode) => {
      if (mode === filterMode) return;
      // Reset pagination so the new list starts at page 0
      offsetRef.current = 0;
      setOffset(0);
      setHasMore(true);
      isLoadingMore.current = false;
      setFilterMode(mode);
    },
    [filterMode],
  );

  // ─── Load more ───────────────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    if (isFetching || !hasMore || isLoadingMore.current) return;

    const pagination = boardData?.pagination;
    if (!pagination?.hasMore) {
      setHasMore(false);
      return;
    }

    isLoadingMore.current = true;
    const nextOffset = offsetRef.current + LIMIT;
    offsetRef.current = nextOffset;
    setOffset(nextOffset);
  }, [isFetching, hasMore, boardData]);

  if (!isFetching && isLoadingMore.current) {
    isLoadingMore.current = false;
  }

  // ─── Pull-to-refresh ─────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    offsetRef.current = 0;
    setOffset(0);
    setHasMore(true);
    isLoadingMore.current = false;
    try {
      await refetch();
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // ─── Footer ──────────────────────────────────────────────────────────────
  const ListFooter = useCallback(() => {
    if (isFetching && !refreshing && offset > 0) {
      return (
        <View style={styles.footerLoader}>
          <LottieAnimator visible />
          <AppText style={styles.loadingText}>Loading more…</AppText>
        </View>
      );
    }
    return (
      <View
        style={leaderboardArr.length < 4 ? styles.footerMain : styles.footer}
      />
    );
  }, [isFetching, refreshing, offset, leaderboardArr.length]);

  // ─── Misc ─────────────────────────────────────────────────────────────────
  const backgroundColor = useMemo(() => {
    if (isPro) return colors.greenDark;
    if (isSchoolView) return colors.primary;
    return colors.accent;
  }, [isPro, isSchoolView]);

  const getRankSuffix = (rank) => {
    if (!rank) return "TH";
    const lastTwo = rank % 100;
    if (lastTwo >= 11 && lastTwo <= 13) return "TH";
    const last = rank % 10;
    if (last === 1) return "ST";
    if (last === 2) return "ND";
    if (last === 3) return "RD";
    return "TH";
  };

  const title = useMemo(() => {
    if (isSchoolView) return boardData?.school?.name || "My School Leaderboard";
    if (isPro) return "Pro Leaderboard";
    if (isSchoolsMode) return "Schools Leaderboard";
    return "Leaderboard";
  }, [isSchoolView, isPro, isSchoolsMode, boardData?.school?.name]);

  // Rank shown in header: for schools mode show the user's school rank
  const headerRank = useMemo(() => {
    if (isSchoolsMode) return boardData?.currentUser?.rank ?? 0;
    return boardData?.currentUser?.rank ?? 0;
  }, [isSchoolsMode, boardData]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <AppHeader
        title={title}
        Component={() => (
          <View style={styles.mine}>
            <AppText
              fontWeight="black"
              size={"xxlarge"}
              style={styles.mineText}
            >
              {headerRank}
              <AppText style={styles.mineText} fontWeight="black">
                {getRankSuffix(headerRank)}
              </AppText>
            </AppText>
          </View>
        )}
        hideNavigator
        titleColor="#fff"
      />

      {/* Filter toggle — only shown for global (student/teacher non-school) view */}
      {shouldFetchGlobal && (
        <View style={styles.filterContainer}>
          <FilterToggle
            active={filterMode}
            onChange={handleFilterChange}
            backgroundColor={backgroundColor}
          />
        </View>
      )}

      <FlatList
        data={leaderboardArr}
        keyExtractor={(item) => item._id?.toString() ?? nanoid()}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={() => (
          <LeaderboardWinners
            isPro={isPro}
            isSchools={isSchoolsMode}
            data={leaderboardArr.slice(0, 3)}
          />
        )}
        ListFooterComponent={ListFooter}
        renderItem={({ item, index }) =>
          isSchoolsMode ? (
            <SchoolLeaderboardItem item={item} index={index} />
          ) : (
            <LeaderboardItem item={item} isPro={isPro} index={index} />
          )
        }
        removeClippedSubviews
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={15}
        windowSize={10}
      />

      <StatusBar style="light" />

      <LottieAnimator
        visible={isLoading && offset === 0}
        absolute
        wTransparent
      />
    </View>
  );
};

export default LeaderboardScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  footer: {
    minHeight: height * 0.5,
    backgroundColor: colors.unchange,
  },
  footerMain: {
    height: height * 0.5,
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
    backgroundColor: colors.unchange,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: height * 0.5,
    backgroundColor: colors.unchange,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },
  mine: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  mineText: {
    color: colors.white,
  },
  championsRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  separator: {
    width: "95%",
    backgroundColor: colors.lightly,
    height: 2,
    alignSelf: "center",
  },
  filterContainer: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  filterWrap: {
    flexDirection: "row",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    padding: 3,
    bottom: 10,
  },
  filterPill: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 16,
  },
});
