import { Dimensions, FlatList, Image, StyleSheet, View } from "react-native";
import React, { useState, useCallback, useMemo } from "react";
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

export const LeaderboardItem = ({ item, isPro, index }) => {
  if (index < 3) return null;

  let pointText = formatPoints(
    item.points ?? item.totalPoints ?? item?.questionsCount,
  );
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
          style={{ marginLeft: 25 }}
          size={50}
          userID={item?._id}
          source={item?.avatar?.image}
          name={getFullName(item)}
          horizontal
        />
        <View
          style={{
            flex: 1,
            alignItems: "flex-end",
          }}
        >
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
        points={item.points ?? item.totalPoints ?? item?.questionsCount}
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

  // Pagination state
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 50;

  // Determine which leaderboard to fetch
  const isPro =
    user?.accountType === "professional" || user?.accountType === "manager";
  const isStudent = user?.accountType === "student";
  const isTeacher = user?.accountType === "teacher";
  const isSchoolView = routeData?.screen === "School";

  // Conditionally call the right query hook
  const shouldFetchPro = isPro && !isSchoolView;
  const shouldFetchSchool = (isStudent || isTeacher) && isSchoolView;
  const shouldFetchGlobal = (isStudent || isTeacher) && !isSchoolView;

  // Professional leaderboard
  const {
    data: proData,
    isLoading: proLoading,
    isFetching: proFetching,
    error,
    refetch: proRefetch,
  } = useFetchProLeaderboardQuery(
    { limit: LIMIT, offset },
    { skip: !shouldFetchPro },
  );

  // School leaderboard
  const {
    data: schoolData,
    isLoading: schoolLoading,
    isFetching: schoolFetching,

    refetch: schoolRefetch,
  } = useFetchSchoolLeaderboardQuery(
    { limit: LIMIT, offset },
    { skip: !shouldFetchSchool },
  );

  // Global leaderboard
  const {
    data: globalData,
    isLoading: globalLoading,

    isFetching: globalFetching,
    refetch: globalRefetch,
  } = useFetchGlobalLeaderboardQuery(
    { limit: LIMIT, offset },
    { skip: !shouldFetchGlobal },
  );

  // Determine which data to use
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

  // Extract leaderboard data
  const boardData = activeData?.data;
  const leaderboardArr = boardData?.leaderboard ?? [];

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (isFetching || !hasMore) return;

    const pagination = boardData?.pagination;
    if (pagination?.hasMore) {
      setOffset((prevOffset) => prevOffset + LIMIT);
    } else {
      setHasMore(false);
    }
  }, [isFetching, hasMore, boardData]);

  // Refresh handler
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setOffset(0);
    setHasMore(true);
    try {
      await refetch();
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Footer component
  const renderFooter = useCallback(() => {
    if (!isFetching || refreshing || isLoading) return null;

    return (
      <View style={styles.footerLoader}>
        <LottieAnimator visible />
        <AppText style={styles.loadingText}>Loading more...</AppText>
      </View>
    );
  }, [isFetching, refreshing]);

  // List footer
  const ListFooter = useCallback(() => {
    if (isFetching && !refreshing) {
      return renderFooter();
    }
    return (
      <View
        style={leaderboardArr?.length < 4 ? styles.footerMain : styles.footer}
      />
    );
  }, [leaderboardArr?.length, isFetching, refreshing]);

  // Determine background color
  const backgroundColor = useMemo(() => {
    if (isPro) return colors.greenDark;
    if (isSchoolView) return colors.primary;
    return colors.accent;
  }, [isPro, isSchoolView]);

  // Get rank suffix
  const getRankSuffix = (rank) => {
    if (!rank) return "TH";
    if (rank === 1) return "ST";
    if (rank === 2) return "ND";
    if (rank === 3) return "RD";
    return "TH";
  };

  // Title
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
        // Infinite scroll
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={() => (
          <LeaderboardWinners
            isPro={isPro}
            data={leaderboardArr?.slice(0, 3)}
          />
        )}
        ListFooterComponent={ListFooter}
        renderItem={({ item, index }) => (
          <LeaderboardItem item={item} isPro={isPro} index={index} />
        )}
        // Performance optimizations
        removeClippedSubviews={true}
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
    height: height * 0.2,
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
  separator: {
    width: "95%",
    backgroundColor: colors.lightly,
    height: 2,
    alignSelf: "center",
  },
});
