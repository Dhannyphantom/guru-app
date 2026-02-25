/* eslint-disable react-hooks/exhaustive-deps */
import {
  // Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  View,
  useWindowDimensions,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

import Screen from "../components/Screen";
import AppLogo from "../components/AppLogo";
import { DailyTask, Subjects, SubjectCategory } from "../components/AppDetails";
import colors from "../helpers/colors";
import { StatusBar } from "expo-status-bar";
import FindFriendsBoard from "../components/FindFriendsBoard";
import SubStatus from "../components/SubStatus";
import PopFriends from "../components/PopFriends";
import { useDispatch, useSelector } from "react-redux";
import {
  selectUser,
  updateToken,
  useFetchFriendsQuery,
  useFetchUserQuery,
  useFetchUserStatsQuery,
  useUpdateUserProfileMutation,
  // useUpdateUserProfileMutation,
} from "../context/usersSlice";
// import { hasCompletedProfile } from "../helpers/helperFunctions";
import { useFetchSchoolQuery } from "../context/schoolSlice";
import WebLayout from "../components/WebLayout";
import Invited from "../components/Invited";
import TeacherHomeScreen from "./TeacherHomeScreen";
import getRefresher from "@/src/components/Refresher";
import { useRouter } from "expo-router";
import { getUserProfile, socket } from "../helpers/helperFunctions";
import { PAD_BOTTOM } from "../helpers/dataStore";
import Animated, { LinearTransition } from "react-native-reanimated";
import {
  useFetchCategoriesQuery,
  useFetchSubjectsQuery,
  useGetMyQuestionsQuery,
} from "../context/instanceSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PopMessage from "../components/PopMessage";

// const { width, height } = Dimensions.get("screen");

const HomeScreen = () => {
  const [bools, setBools] = useState({ friendsModal: false });
  const [invite, setInvite] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [popper, setPopper] = useState({ vis: false });
  const [cache, setCache] = useState({});

  useFetchSchoolQuery();
  const screenWidth = useWindowDimensions().width;
  const { refetch, error, isError } = useFetchUserQuery();
  const { data: stats, refetch: reftechStat } = useFetchUserStatsQuery(null, {
    refetchOnFocus: true,
  });
  useFetchFriendsQuery();
  const [updateUserProfile] = useUpdateUserProfileMutation();
  useGetMyQuestionsQuery();
  const { data: categories, isLoading: fetchingCategories } =
    useFetchCategoriesQuery();
  const { data: subjects, isLoading: fetchingSubjects } =
    useFetchSubjectsQuery();

  const user = useSelector(selectUser);
  const router = useRouter();
  const dispatch = useDispatch();

  const toggleFriendsModal = (bool) => {
    setBools({ ...bools, friendsModal: bool });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      await reftechStat().unwrap();
    } catch (_errr) {
      console.log(_errr);
    } finally {
      setRefreshing(false);
    }
  };

  const initializeSocket = () => {
    socket.connect();
    socket.emit("register_user", user?._id);
  };

  const handleInvite = (type) => {
    const inviteObj = { ...invite };
    setCache((prev) => ({ ...prev, invite: inviteObj }));

    if (type === "accept") {
      socket.emit("join_session", {
        sessionId: invite?.sessionId,
        user: getUserProfile(user),
      });
      socket.emit("invite_response", {
        sessionId: invite?.sessionId,
        user: getUserProfile(user),
        status: "accepted",
      });
    } else if (type === "reject") {
      socket.emit("invite_response", {
        sessionId: invite?.sessionId,
        user: getUserProfile(user),
        status: "rejected",
      });
    }
    setInvite(null);
  };

  const fetchCache = async () => {
    let subjectList = await AsyncStorage.getItem("subjects");
    if (subjectList) {
      subjectList = JSON.parse(subjectList);
    }

    let catList = await AsyncStorage.getItem("categories");
    if (catList) {
      catList = JSON.parse(catList);
    }

    let stat = await AsyncStorage.getItem("user_stat");
    if (stat) {
      stat = JSON.parse(stat);
    }

    setCache({ ...cache, categories: catList, subjects: subjectList, stat });
  };

  useEffect(() => {
    if (user) {
      initializeSocket();
    }
  }, [user]);

  useEffect(() => {
    socket.on("receive_invite", (session) => {
      // update invites list

      setInvite(session);
    });

    return () => socket.off("receive_invite");
  }, []);

  useEffect(() => {
    socket.on("active_session", ({ active, host, sessionId }) => {
      // update invites list

      if (active === true) {
        router.push({
          pathname: "/main/session",
          params: {
            isLobby: true,
            status: "accepted",
            host: JSON.stringify(host),
            lobbyId: sessionId,
          },
        });
      } else {
        setPopper({
          vis: true,
          type: "failed",
          timer: 2500,
          msg: "Quiz session has expired. Start or Join an active one",
        });
      }
    });

    return () => socket.off("active_session");
  }, []);

  useEffect(() => {
    socket.on("un_invite", (session) => {
      // update invites list

      setInvite(null);
    });

    return () => socket.off("un_invite");
  }, []);

  useEffect(() => {
    if (stats?.invite) {
      console.log("Invite set!!1");
      setInvite(stats?.invite);
    }
  }, [stats]);

  useEffect(() => {
    try {
      // refetch();
      fetchCache();
      registerForPushNotificationsAsync().then((token) => {
        updateUserProfile({ expoPushToken: token }).unwrap();
      });
    } catch (_errr) {}
  }, []);

  useEffect(() => {
    if (isError) {
      console.log({ isError, error });
      if (error?.data?.includes("User data not found")) {
        setPopper({
          vis: true,
          msg: error?.data,
          type: "failed",
          cb: async () => {
            await AsyncStorage.removeItem("token");
            dispatch(updateToken(null));
            router.replace("/(auth)/login");
          },
        });
      }
    }
  }, [error]);

  if (user?.accountType === "teacher") return <TeacherHomeScreen />;

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <AppLogo />
        <View style={styles.headerIconContainer}>
          <SubStatus isSubscribed={user?.subscription?.isActive} />
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/notifications",
                params: { screen: "Home" },
              })
            }
            style={styles.headerIcon}
          >
            <Ionicons name="notifications" size={20} color={colors.white} />
          </Pressable>
        </View>
      </View>
      <FlatList
        data={["HOME"]}
        contentContainerStyle={{ paddingBottom: PAD_BOTTOM }}
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
              <DailyTask stats={stats?.data ?? cache?.stat} />
              <Invited data={invite} onPress={handleInvite} />
              <Animated.View layout={LinearTransition}>
                <FindFriendsBoard onPress={() => toggleFriendsModal(true)} />
              </Animated.View>
            </WebLayout>

            <SubjectCategory
              data={categories?.data ?? cache?.categories}
              loading={fetchingCategories}
            />
            <Subjects
              title={"My Subjects"}
              data={subjects?.data ?? cache?.subjects}
              loading={fetchingSubjects}
            />
          </WebLayout>
        )}
      />

      <PopFriends
        visible={bools.friendsModal}
        setter={(bool) => setBools({ ...bools, friendsModal: bool })}
      />
      <PopMessage popData={popper} setPopData={setPopper} />
      <StatusBar style="dark" />
    </Screen>
  );
};

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("General", {
      name: "General",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: colors.primary,
      sound: "default", // must match filename in `assets` folder
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!");
      return;
    }
    // Learn more about projectId:
    // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
    // EAS projectId is used here.
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      if (!projectId) {
        throw new Error("Project ID not found");
      }

      try {
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;
      } catch (errorT) {}
    } catch (e) {
      token = `${e}`;
    }
  } else {
    alert("Must use physical device for Push Notifications");
  }

  return token;
}

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
