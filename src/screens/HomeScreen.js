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
import Animated, {
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
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
import { CopilotStep, walkthroughable, useCopilot } from "react-native-copilot";
import { Dimensions } from "react-native";

const WalkthroughableView = walkthroughable(View);
const WalkthroughablePressable = walkthroughable(Pressable);

const { width } = Dimensions.get("screen");

const TOUR_KEY = "guru_home_tour_seen";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
  const { start, copilotEvents } = useCopilot();
  const notificationCount = stats?.data?.notificationsCount ?? 0;

  // Badge scale animation
  const badgeScale = useSharedValue(0);

  // Bell shake animation
  const shake = useSharedValue(0);

  useEffect(() => {
    if (notificationCount > 0) {
      // Badge pop-in
      badgeScale.value = withSpring(1, {
        damping: 8,
        stiffness: 150,
      });

      // Infinite smooth shake
      shake.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 80, easing: Easing.linear }),
          withTiming(8, { duration: 80, easing: Easing.linear }),
          withTiming(-6, { duration: 80 }),
          withTiming(6, { duration: 80 }),
          withTiming(0, { duration: 80 }),
        ),
        -1, // infinite
        true,
      );
    } else {
      badgeScale.value = withTiming(0, { duration: 200 });
      shake.value = withTiming(0);
    }
  }, [notificationCount]);

  const animatedBadgeStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: badgeScale.value }],
      opacity: badgeScale.value,
    };
  });

  const animatedBellStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${shake.value}deg` }],
    };
  });

  const toggleFriendsModal = (bool) => {
    setBools({ ...bools, friendsModal: bool });
  };

  const onRefresh = async () => {
    // return;
    setRefreshing(true);
    try {
      await refetch();
      await reftechStat().unwrap();
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

  useEffect(() => {
    const checkTour = async () => {
      if (fetchingCategories || !stats) return;
      await AsyncStorage.removeItem(TOUR_KEY);
      const seen = await AsyncStorage.getItem(TOUR_KEY);

      if (!seen) {
        setTimeout(() => {
          start();
        }, 800);
      }
    };

    checkTour();
  }, [fetchingCategories, stats]);
  useEffect(() => {
    const handleStop = async () => {
      await AsyncStorage.setItem(TOUR_KEY, "true");
    };

    copilotEvents.on("stop", handleStop);

    return () => {
      copilotEvents.off("stop", handleStop);
    };
  }, []);

  if (user?.accountType === "teacher") return <TeacherHomeScreen />;

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <CopilotStep
          text={`Welcome to Guru @${user?.username}.\nComplete these steps to get started\n\n1. Complete your profile \n\n2. Then join your school in the school tab\n\n3. Subscribe to fully access Guru.`}
          order={1}
          name="welcome"
        >
          <WalkthroughableView style={{ alignSelf: "flex-start" }}>
            <AppLogo />
          </WalkthroughableView>
        </CopilotStep>
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
              <CopilotStep
                text="Track your daily progress here."
                order={3}
                name="dailyTask"
              >
                <WalkthroughableView style={{ minWidth: 150 }}>
                  <DailyTask stats={stats?.data ?? cache?.stat} />
                </WalkthroughableView>
              </CopilotStep>
              <Invited data={invite} onPress={handleInvite} />
              <CopilotStep
                text={
                  "Connect with your friends and classmates here.\nInvite your mutual friends for a multiplayer quiz session!"
                }
                order={4}
                name="friends"
              >
                <WalkthroughableView>
                  <Animated.View layout={LinearTransition}>
                    <FindFriendsBoard
                      onPress={() => toggleFriendsModal(true)}
                    />
                  </Animated.View>
                </WalkthroughableView>
              </CopilotStep>
            </WebLayout>

            <CopilotStep
              text={
                "Pick a subject to start practicing.\n\nYou can practice offline after participating in a quiz session at least once."
              }
              order={5}
              name="categories"
            >
              <WalkthroughableView>
                <SubjectCategory
                  data={categories?.data ?? cache?.categories}
                  loading={fetchingCategories}
                />
              </WalkthroughableView>
            </CopilotStep>
            <Subjects
              title={"My Subjects"}
              data={subjects?.data ?? cache?.subjects}
              loading={fetchingSubjects}
            />
          </WebLayout>
        )}
      />

      {/* Tab anchors (pointer-events none, for layout only) */}

      <View style={[styles.tabAnchors, { bottom: 8 }]} pointerEvents="none">
        <View style={styles.tabAnchor} />
        <CopilotStep
          order={6}
          name="leaderboard"
          text="Check out the global leaderboard and see how you stack up against other Gurus!"
        >
          <WalkthroughableView style={styles.tabAnchor} />
        </CopilotStep>

        {/*
    FIX: The play anchor was clipping because it was rendered at the screen edge
    with a fixed bottom offset that pushed it partially off-screen.

    Solution:
    - Keep flex:1 so it stays centred in the middle fifth of the bar.
    - Use a wider anchor (matchs CIRCLE_SIZE + padding) so Copilot has
      enough space to render the tooltip above the button rather than
      clipping it at the edge.
    - Remove the hard-coded `bottom: 40` offset; let the parent row handle
      vertical alignment and just use a taller anchor to cover the floating button.
  */}
        <CopilotStep
          order={7}
          name="play & earn"
          text={
            "When you're fully setup.\nAnd have an active subscription\n\nStart a quiz session HERE"
          }
        >
          <WalkthroughableView style={styles.tabAnchorCenter} />
        </CopilotStep>

        <CopilotStep
          order={8}
          name="school"
          text="Join your school to compete with your classmates and climb the school leaderboard!"
        >
          <WalkthroughableView style={styles.tabAnchor} />
        </CopilotStep>
        <CopilotStep
          order={9}
          name="profile"
          text={
            "Complete your profile and subscription to unlock all features and become the ultimate Guru!\n\nFinish setting up your profile NOW!!!."
          }
        >
          <WalkthroughableView style={styles.tabAnchor} />
        </CopilotStep>
      </View>

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
  tabAnchors: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    pointerEvents: "none",
  },
  tabAnchor: {
    width: 50,
    height: 50,
  },
  // Taller, wider anchor for the floating centre button.
  // No hard-coded `bottom` — stays centred in the row via alignItems:"center".
  tabAnchorCenter: {
    width: 72, // wide enough that Copilot tooltip renders above, not clipped
    height: 72, // tall enough to cover the floating circle button
  },
});
