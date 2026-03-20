import { Dimensions, FlatList, Image, StyleSheet, View } from "react-native";
import React, { useState, useCallback, useMemo, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams } from "expo-router";

import colors from "../helpers/colors";
import Avatar from "../components/Avatar";
import AppHeader from "../components/AppHeader";
import AppText from "../components/AppText";
import leaderboardStage from "../../assets/images/leaderboard.png";
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
import { useFetchSchoolLeaderboardQuery } from "../context/schoolSlice";

const { width, height } = Dimensions.get("screen");
const LIMIT = 25;

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

const LeaderboardChampion = ({
  name,
  userID,
  avatar,
  award,
  loading,
  isPro,
  points,
}) => {
  return (
    <View
      style={{
        alignSelf: "center",
        alignItems: "center",
        marginHorizontal: 10,
      }}
    >
      <Avatar
        name={name ?? `User ${award}`}
        award={award}
        userID={userID}
        source={avatar}
        size={width * 0.2}
        textStyle={{ marginTop: 18, marginBottom: 6, color: colors.white }}
        textFontsize="medium"
      />
      <Points
        value={points ?? 0}
        hideSuffix={isPro}
        fontSize="xsmall"
        style={{ backgroundColor: colors.unchange }}
      />
      <LottieAnimator visible={loading} wTransparent absolute size={80} />
    </View>
  );
};

export const LeaderboardWinners = ({ data, isPro }) => {
  const formattedData = [
    { ...data[2], isEmpty: Boolean(data[2]), award: 3 },
    { ...data[0], isEmpty: Boolean(data[0]), award: 1 },
    { ...data[1], isEmpty: Boolean(data[1]), award: 2 },
  ];

  const renderChamps = ({ item }) => {
    if (!item?.isEmpty) return <View style={{ width: width * 0.2 }} />;
    return (
      <LeaderboardChampion
        name={getFullName(item)}
        award={item.award}
        userID={item?._id}
        loading={item?.hasFinished === false}
        isPro={isPro}
        avatar={item?.avatar?.image}
        points={item.totalPoints ?? item?.questionsCount}
      />
    );
  };

  return (
    <View style={{ height: height * 0.4 }}>
      <View
        style={{
          position: "absolute",
          zIndex: 50,
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "center",
        }}
      >
        {formattedData.map((item) => (
          <View
            key={item._id ?? nanoid()}
            style={{
              top: item.award === 1 ? 0 : item.award === 2 ? 50 : 70,
              marginHorizontal: 5,
            }}
          >
            {renderChamps({ item })}
          </View>
        ))}
      </View>
      <View style={{ width, justifyContent: "flex-end", alignItems: "center" }}>
        <Image
          resizeMode="cover"
          source={leaderboardStage}
          style={{
            width: "125%",
            height: height * 0.4,
            top: height * 0.15,
          }}
        />
      </View>
    </View>
  );
};

const LeaderboardScreen = () => {
  const user = useSelector(selectUser);
  const route = useLocalSearchParams();
  const routeData = Boolean(route?.data) ? JSON.parse(route?.data) : {};

  // ─── Pagination: use a ref so RTK's forceRefetch fires without
  //     re-rendering the whole component on each page load ────────────
  const offsetRef = useRef(0);
  const [offset, setOffset] = useState(0); // drives the actual query arg
  const [hasMore, setHasMore] = useState(true);
  // Guard against onEndReached firing multiple times before the next
  // batch arrives (common with fast scrollers).
  const isLoadingMore = useRef(false);

  // ─── Account-type routing ────────────────────────────────────────
  const isPro =
    user?.accountType === "professional" || user?.accountType === "manager";
  const isStudent = user?.accountType === "student";
  const isTeacher = user?.accountType === "teacher";
  const isSchoolView = routeData?.screen === "School";

  const shouldFetchPro = isPro && !isSchoolView;
  const shouldFetchSchool = (isStudent || isTeacher) && isSchoolView;
  const shouldFetchGlobal = (isStudent || isTeacher) && !isSchoolView;

  // ─── Queries ─────────────────────────────────────────────────────
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
    error: globalError,
    isFetching: globalFetching,
    refetch: globalRefetch,
  } = useFetchGlobalLeaderboardQuery(
    { limit: LIMIT, offset },
    { skip: !shouldFetchGlobal },
  );

  // ─── Active data / helpers ────────────────────────────────────────
  const activeData = useMemo(() => {
    if (shouldFetchPro) return proData;
    if (shouldFetchSchool) return schoolData;
    if (shouldFetchGlobal) return globalData;
    return null;
  }, [
    shouldFetchPro,
    shouldFetchSchool,
    shouldFetchGlobal,
    proData,
    schoolData,
    globalData,
  ]);

  const isLoading = proLoading || schoolLoading || globalLoading;
  const isFetching = proFetching || schoolFetching || globalFetching;

  const refetch = useMemo(() => {
    if (shouldFetchPro) return proRefetch;
    if (shouldFetchSchool) return schoolRefetch;
    if (shouldFetchGlobal) return globalRefetch;
    return () => {};
  }, [
    shouldFetchPro,
    shouldFetchSchool,
    shouldFetchGlobal,
    proRefetch,
    schoolRefetch,
    globalRefetch,
  ]);

  const boardData = activeData?.data;
  const leaderboardArr = boardData?.leaderboard ?? [];
  // Show a banner when the list is being served from AsyncStorage cache
  // const isFromCache = Boolean(activeData?._fromCache);

  // ─── Load more ───────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    // Bail if: already fetching, no more pages, or a load-more is in flight
    if (isFetching || !hasMore || isLoadingMore.current) return;

    const pagination = boardData?.pagination;
    if (!pagination?.hasMore) {
      setHasMore(false);
      return;
    }

    isLoadingMore.current = true;
    const nextOffset = offsetRef.current + LIMIT;
    offsetRef.current = nextOffset;
    setOffset(nextOffset); // triggers the query with the new offset
  }, [isFetching, hasMore, boardData]);

  // Reset the in-flight guard once RTK stops fetching
  // (runs after every render where isFetching changes)
  if (!isFetching && isLoadingMore.current) {
    isLoadingMore.current = false;
  }

  // ─── Pull-to-refresh ─────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Reset pagination back to page 1
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

  // ─── Footer ───────────────────────────────────────────────────────
  const ListFooter = useCallback(() => {
    // Show spinner while fetching additional pages (not on initial load / refresh)
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

  // ─── Misc ─────────────────────────────────────────────────────────
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
    return "Leaderboard";
  }, [isSchoolView, isPro, boardData?.school?.name]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <AppHeader
        title={title}
        Component={() => (
          <View style={styles.mine}>
            {/* Subtle "cached" badge so users know they're offline */}
            {/* {isFromCache && (
              <AppText size="xsmall" style={styles.cacheBadge}>
                📶 Cached
              </AppText>
            )} */}
            <AppText
              fontWeight="black"
              size={"xxlarge"}
              style={styles.mineText}
            >
              {boardData?.currentUser?.rank ?? 0}
              <AppText style={styles.mineText} fontWeight="black">
                {getRankSuffix(boardData?.currentUser?.rank)}
              </AppText>
            </AppText>
          </View>
        )}
        hideNavigator
        titleColor="#fff"
      />

      <FlatList
        data={leaderboardArr}
        keyExtractor={(item) => item._id ?? nanoid()}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        // ── Infinite scroll ──────────────────────────────────────
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        // ── Sections ─────────────────────────────────────────────
        ListHeaderComponent={() => (
          <LeaderboardWinners isPro={isPro} data={leaderboardArr.slice(0, 3)} />
        )}
        ListFooterComponent={ListFooter}
        renderItem={({ item, index }) => (
          <LeaderboardItem item={item} isPro={isPro} index={index} />
        )}
        // ── Performance ───────────────────────────────────────────
        removeClippedSubviews
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={15}
        windowSize={10}
      />

      <StatusBar style="light" />

      {/* Full-screen loader only on first page load */}
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
  cacheBadge: {
    color: colors.white,
    opacity: 0.7,
    marginBottom: 2,
  },
  separator: {
    width: "95%",
    backgroundColor: colors.lightly,
    height: 2,
    alignSelf: "center",
  },
});
