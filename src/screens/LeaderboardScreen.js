import { Dimensions, FlatList, Image, StyleSheet, View } from "react-native";
import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";

import colors from "../helpers/colors";
import Avatar from "../components/Avatar";
import AppHeader from "../components/AppHeader";
import { dummyLeaderboards } from "../helpers/dataStore";
import AppText from "../components/AppText";

import leaderboardStage from "../../assets/images/leaderboard.png";
import Points from "../components/Points";
import { formatPoints, getFullName } from "../helpers/helperFunctions";
import { useSelector } from "react-redux";
import { selectUser, useFetchProLeaderboardQuery } from "../context/usersSlice";
import LottieAnimator from "../components/LottieAnimator";
import { nanoid } from "@reduxjs/toolkit";

const { width, height } = Dimensions.get("screen");

export const LeaderboardItem = ({ item, isPro, index }) => {
  if (index < 3) return;
  let pointText = formatPoints(item.points ?? item?.questionsCount);
  if (isPro) pointText = pointText?.slice(0, -3);
  return (
    <View
      style={{
        // marginHorizontal: width * 0.02,
        backgroundColor: colors.light,
        paddingLeft: 10,
        borderTopStartRadius: index == 3 ? 10 : 0,
        borderTopEndRadius: index == 3 ? 10 : 0,
      }}
    >
      <View
        style={{
          // flex: 1,
          flexDirection: "row",
          alignItems: "center",
          padding: 12,
          paddingVertical: 18,
        }}
      >
        <AppText fontWeight="black" size={"xxlarge"}>
          {index + 1}
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
  isPro,
  points,
}) => {
  return (
    <View
      style={{
        // position: "absolute"
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
    </View>
  );
};

const LeaderboardWinners = ({ data, isPro }) => {
  const formattedData = [
    { ...data[2], award: 3 },
    { ...data[0], award: 1 },
    { ...data[1], award: 2 },
  ];

  const renderChamps = ({ item }) => {
    return (
      <LeaderboardChampion
        name={getFullName(item)}
        award={item.award}
        userID={item?._id}
        isPro={isPro}
        avatar={item?.avatar?.image}
        points={item.points ?? item?.questionsCount}
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
      {/* <View style={{ height: height * 0.15 }} /> */}
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
  const { data, isLoading, isError, error, refetch } =
    useFetchProLeaderboardQuery();
  const isPro = user?.accountType !== "user";
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (err) {
    } finally {
      setRefreshing(false);
    }
  };

  const boardData = isPro ? data?.data : null;
  const leaderboardArr =
    boardData?.leaderboard ??
    dummyLeaderboards.sort((a, b) => b.points - a.points);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isPro ? colors.greenDark : colors.accent },
      ]}
    >
      <AppHeader
        title="Leaderboard"
        Component={() => (
          <View style={styles.mine}>
            <AppText
              fontWeight="black"
              size={"xxlarge"}
              style={styles.mineText}
            >
              {boardData?.currentUser?.rank ?? 0}
              <AppText style={styles.mineText} fontWeight="black">
                {boardData?.currentUser?.rank === 1
                  ? "ST"
                  : boardData?.currentUser?.rank == 2
                  ? "ND"
                  : boardData?.currentUser?.rank === 3
                  ? "RD"
                  : "TH"}
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
        // contentContainerStyle={{ paddingBottom: height * 0.11 }}
        ListHeaderComponent={() => (
          <LeaderboardWinners
            isPro={isPro}
            data={leaderboardArr?.slice(0, 3)}
          />
        )}
        ListFooterComponent={
          <View
            style={
              leaderboardArr?.length < 4 ? styles.footerMain : styles.footer
            }
          />
        }
        renderItem={({ item, index }) => (
          <LeaderboardItem item={item} isPro={isPro} index={index} />
        )}
      />
      <StatusBar style="light" />
      <LottieAnimator visible={isLoading} absolute wTransparent />
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
    // marginHorizontal: width * 0.02,
  },
  footerMain: {
    height: height * 0.5,
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
    backgroundColor: colors.unchange,
    // top: 40,
  },
  mine: {
    flex: 1,
    // backgroundColor: colors.accentLightest,
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
