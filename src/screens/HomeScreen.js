import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import Screen from "../components/Screen";
import AppLogo from "../components/AppLogo";
import { DailyTask, Subjects, SubjectCategory } from "../components/AppDetails";
import colors from "../helpers/colors";
import { StatusBar } from "expo-status-bar";
import FindFriendsBoard from "../components/FindFriendsBoard";
import SubStatus from "../components/SubStatus";
import PopFriends from "../components/PopFriends";
import { useSelector } from "react-redux";
import { selectUser, useFetchUserQuery } from "../context/usersSlice";
// import { hasCompletedProfile } from "../helpers/helperFunctions";
import { useFetchSchoolQuery } from "../context/schoolSlice";
import WebLayout from "../components/WebLayout";
import getRefresher from "@/src/components/Refresher";

const { width, height } = Dimensions.get("screen");

const HomeBlurView = () => {
  return null;
  return (
    <BlurView
      intensity={250}
      experimentalBlurMethod="dimezisBlurView"
      style={{
        position: "absolute",
        zIndex: -1,
        width,
        height,
        backgroundColor: "transparent",
      }}
    >
      <View
        style={{
          width: width * 0.9,
          height: height * 0.55,
          backgroundColor: colors.primary,
          borderTopEndRadius: 70,
          borderBottomEndRadius: 200,
          borderBottomStartRadius: 300,
          position: "absolute",
          zIndex: -2,
        }}
      />
    </BlurView>
  );
};

const HomeScreen = () => {
  const [bools, setBools] = useState({ friendsModal: false });
  const [refreshing, setRefreshing] = useState(false);
  useFetchSchoolQuery();
  const screenWidth = useWindowDimensions().width;
  const { refetch, isError, error } = useFetchUserQuery();

  const user = useSelector(selectUser);

  const toggleFriendsModal = (bool) => {
    setBools({ ...bools, friendsModal: bool });
  };

  console.log({ isError, error });

  const onRefresh = async () => {
    await refetch();
  };

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <AppLogo />
        <View style={styles.headerIconContainer}>
          <SubStatus isSubscribed={user?.subscription?.isActive} />
          <Pressable
            onPress={() =>
              navigation.navigate("Notifications", { screen: "Home" })
            }
            style={styles.headerIcon}
          >
            <Ionicons name="notifications" size={20} color={colors.white} />
          </Pressable>
        </View>
      </View>
      <FlatList
        data={["HOME"]}
        contentContainerStyle={{ paddingBottom: height * 0.1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={getRefresher({ refreshing, onRefresh })}
        renderItem={() => (
          <WebLayout style={{ flex: 1 }}>
            <WebLayout
              style={{
                width: screenWidth,
                flexDirection: "row",
                justifyContent: "space-around",
              }}
            >
              <DailyTask />
              <FindFriendsBoard onPress={() => toggleFriendsModal(true)} />
            </WebLayout>

            <SubjectCategory />
            <Subjects title={"My Subjects"} />
          </WebLayout>
        )}
      />
      <HomeBlurView />
      <PopFriends
        visible={bools.friendsModal}
        setter={(bool) => setBools({ ...bools, friendsModal: bool })}
      />
      <StatusBar style="dark" />
    </Screen>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryLight,
  },
  friendsModal: {
    flex: 1,
    borderTopStartRadius: 25,
    borderTopEndRadius: 25,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginLeft: 10,
    marginRight: 20,
  },
  headerIconContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    padding: 20,
    paddingHorizontal: 10,
  },
  rowWide: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
