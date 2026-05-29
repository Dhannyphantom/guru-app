/* eslint-disable react-hooks/exhaustive-deps */
import {
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  View,
  Dimensions,
  useWindowDimensions,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
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
} from "../context/usersSlice";
import { useFetchSchoolQuery } from "../context/schoolSlice";
import WebLayout from "../components/WebLayout";
import Invited from "../components/Invited";
import TeacherHomeScreen from "./TeacherHomeScreen";
import getRefresher from "@/src/components/Refresher";
import { useRouter } from "expo-router";
import {
  capFirstLetter,
  getUserProfile,
  socket,
} from "../helpers/helperFunctions";
import { PAD_BOTTOM, signOutKeys } from "../helpers/dataStore";
import Animated, {
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import {
  useFetchCategoriesQuery,
  useFetchSubjectsQuery,
  useGetMyQuestionsQuery,
} from "../context/instanceSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PopMessage from "../components/PopMessage";
import AppText from "../components/AppText";
import MonthlyQuizCard from "../components/MonthlyQuizCard";
import { apiSlice } from "../context/apiSlice";
import { useFetchActiveCompetitionQuery } from "../context/competitionSlice";
import AppTutorial from "../components/AppTutorial"; // ← new

const { width } = Dimensions.get("screen");

const TOUR_KEY = "guru_home_tour_seen";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Tutorial steps for HomeScreen ───────────────────────────────────────────
const HOME_TUTORIAL_STEPS = [
  {
    title: `Welcome to Guru, %name%!`,
    text: "Your all-in-one exam prep and learning companion. Let's give you a quick tour to get started.",
  },
  {
    title: "Complete Your Profile",
    text: "Go to the Profile tab to complete your details.\nYou’ll be added to Guru School by default, but you can leave and join your own registered school anytime.",
  },
  {
    title: "Earn While You Learn",
    text: "Subscribe to unlock premium practice sessions where you earn Guru Tokens (GT) and redeem rewards like airtime, data, cash withdrawals, or subscription renewals.\nFree users can only access limited freemium sessions without GT rewards!",
  },
  {
    title: "Practice Offline",
    text: "Each premium practice session questions can be practiced offline anytime by selecting subjects on the home screen. Your answers are automatically saved as you progress.",
  },
  {
    title: "Pick a Subject & Win",
    text: "Click the Rocket Icon 🚀 below, start a session, invite friends, and earn Guru Tokens. Subscribe NOW to unlock the full Guru experience!",
  },
];

const HomeScreen = () => {
  const [bools, setBools] = useState({ friendsModal: false });
  const [invite, setInvite] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [popper, setPopper] = useState({ vis: false });
  const [cache, setCache] = useState({});
  const [showTutorial, setShowTutorial] = useState(false);

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
  const {
    data: competitionData,
    isLoading: competitionLoading,
    refetch: competitionRefetch,
  } = useFetchActiveCompetitionQuery(null, {
    refetchOnFocus: true,
    pollingInterval: 60000,
  });

  const user = useSelector(selectUser);
  const router = useRouter();
  const dispatch = useDispatch();
  const notificationCount = stats?.data?.notificationsCount ?? 0;

  // Badge scale animation
  const badgeScale = useSharedValue(0);

  // Bell shake animation
  const shake = useSharedValue(0);

  useEffect(() => {
    if (notificationCount > 0) {
      badgeScale.value = withSpring(1, { damping: 8, stiffness: 150 });
      shake.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 80, easing: Easing.linear }),
          withTiming(8, { duration: 80, easing: Easing.linear }),
          withTiming(-6, { duration: 80 }),
          withTiming(6, { duration: 80 }),
          withTiming(0, { duration: 80 }),
        ),
        -1,
        true,
      );
    } else {
      badgeScale.value = withTiming(0, { duration: 200 });
      shake.value = withTiming(0);
    }
  }, [notificationCount]);

  const animatedBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeScale.value,
  }));

  const animatedBellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${shake.value}deg` }],
  }));

  const toggleFriendsModal = (bool) => {
    setBools({ ...bools, friendsModal: bool });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      await reftechStat().unwrap();
      await competitionRefetch();
    } catch (_errr) {
      console.log({ _errr });
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
    if (subjectList) subjectList = JSON.parse(subjectList);

    let catList = await AsyncStorage.getItem("categories");
    if (catList) catList = JSON.parse(catList);

    let stat = await AsyncStorage.getItem("user_stat");
    if (stat) stat = JSON.parse(stat);

    setCache({ ...cache, categories: catList, subjects: subjectList, stat });
  };

  useEffect(() => {
    if (user) initializeSocket();
  }, [user]);

  useEffect(() => {
    socket.on("receive_invite", (session) => setInvite(session));
    return () => socket.off("receive_invite");
  }, []);

  useEffect(() => {
    socket.on("active_session", ({ active, host, sessionId }) => {
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
    socket.on("un_invite", () => setInvite(null));
    return () => socket.off("un_invite");
  }, []);

  useEffect(() => {
    if (stats?.invite) setInvite(stats?.invite);
  }, [stats]);

  useEffect(() => {
    try {
      fetchCache();
      registerForPushNotificationsAsync().then((token) => {
        updateUserProfile({ expoPushToken: token }).unwrap();
      });
    } catch (_errr) {}
  }, []);

  useEffect(() => {
    if (isError) {
      if (error?.data?.includes("User data not found")) {
        setPopper({
          vis: true,
          msg: error?.data,
          type: "failed",
          cb: async () => {
            await AsyncStorage.multiRemove(signOutKeys);
            dispatch(updateToken(null));
            dispatch(apiSlice.util.resetApiState());
            router.replace("/(auth)/login");
          },
        });
      }
    }
  }, [error]);

  useEffect(() => {
    const checkTour = async () => {
      if (fetchingCategories || !stats) return;
      // await AsyncStorage.removeItem(TOUR_KEY); // ← for testing purposes, remove in production
      const seen = await AsyncStorage.getItem(TOUR_KEY);
      if (!seen) {
        setTimeout(() => setShowTutorial(true), 800);
      }
    };
    checkTour();
  }, [fetchingCategories, stats]);

  const handleTutorialDone = async () => {
    setShowTutorial(false);
    await AsyncStorage.setItem(TOUR_KEY, "true");
  };

  // Personalise the first step's title with the user's name
  const tutorialSteps = HOME_TUTORIAL_STEPS.map((s) => ({
    ...s,
    title: s.title.replace("%name%", capFirstLetter(user?.username ?? "")),
  }));

  if (user?.accountType === "teacher") return <TeacherHomeScreen />;

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <AppLogo />
        <View style={styles.headerIconContainer}>
          <SubStatus isSubscribed={user?.subscription?.isActive} />
          <Pressable
            style={styles.headerIcon}
            onPress={() =>
              router.push({
                pathname: "/notifications",
                params: { screen: "Home" },
              })
            }
          >
            <View style={styles.notificationWrapper}>
              <Animated.View style={animatedBellStyle}>
                <Ionicons name="notifications" size={20} color={colors.white} />
              </Animated.View>

              {notificationCount > 0 && (
                <Animated.View style={[styles.badge, animatedBadgeStyle]}>
                  <AppText
                    fontWeight="bold"
                    size="xxsmall"
                    style={styles.badgeText}
                  >
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </AppText>
                </Animated.View>
              )}
            </View>
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

              <MonthlyQuizCard
                data={competitionData}
                refetch={competitionRefetch}
                isLoading={competitionLoading}
              />

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

      <AppTutorial
        visible={showTutorial}
        steps={tutorialSteps}
        onDone={handleTutorialDone}
      />

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
      sound: "alert_notification.wav",
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

    if (finalStatus !== "granted") return;

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      if (!projectId) throw new Error("Project ID not found");

      try {
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } catch (_errorT) {}
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
  notificationWrapper: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: colors.primaryLight,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 15,
    marginRight: 20,
  },
  headerIconContainer: {
    flexDirection: "row",
  },
  headerIcon: {
    padding: 20,
    paddingHorizontal: 10,
  },
});
