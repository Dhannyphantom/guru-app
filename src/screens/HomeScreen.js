import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  View,
  useWindowDimensions,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Device from "expo-device";
// import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

import Screen from "../components/Screen";
import AppLogo from "../components/AppLogo";
import { DailyTask, Subjects, SubjectCategory } from "../components/AppDetails";
import colors from "../helpers/colors";
import { StatusBar } from "expo-status-bar";
import FindFriendsBoard from "../components/FindFriendsBoard";
import SubStatus from "../components/SubStatus";
import PopFriends from "../components/PopFriends";
import { useSelector } from "react-redux";
import {
  selectUser,
  useFetchFriendsQuery,
  useFetchUserQuery,
  // useUpdateUserProfileMutation,
} from "../context/usersSlice";
// import { hasCompletedProfile } from "../helpers/helperFunctions";
import { useFetchSchoolQuery } from "../context/schoolSlice";
import WebLayout from "../components/WebLayout";
import Invited from "../components/Invited";
import getRefresher from "@/src/components/Refresher";
import { useRouter } from "expo-router";
import { getUserProfile, socket } from "../helpers/helperFunctions";
import { PAD_BOTTOM } from "../helpers/dataStore";
import Animated, { LinearTransition } from "react-native-reanimated";

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
  const [invite, setInvite] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  useFetchSchoolQuery();
  const screenWidth = useWindowDimensions().width;
  const { refetch } = useFetchUserQuery();
  useFetchFriendsQuery();
  // const [updateUserProfile] = useUpdateUserProfileMutation();

  const user = useSelector(selectUser);
  const router = useRouter();

  const toggleFriendsModal = (bool) => {
    setBools({ ...bools, friendsModal: bool });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (_errr) {
    } finally {
      setRefreshing(false);
    }
  };

  const initializeSocket = () => {
    socket.connect();
    socket.emit("register_user", user?._id);
  };

  const handleInvite = (type) => {
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
      router.push({
        pathname: "/main/session",
        params: {
          isLobby: true,
          status: "accepted",
          host: JSON.stringify(invite?.host),
          lobbyId: invite?.sessionId,
        },
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

  useEffect(() => {
    initializeSocket();
  }, [user]);

  useEffect(() => {
    socket.on("receive_invite", (session) => {
      // update invites list

      setInvite(session);
    });

    return () => socket.off("receive_invite");
  }, []);

  useEffect(() => {
    socket.on("un_invite", (session) => {
      // update invites list
      console.log("Un_invited!!!");
      setInvite(null);
    });

    return () => socket.off("un_invite");
  }, []);

  // useEffect(() => {
  //   try {
  //     registerForPushNotificationsAsync().then((token) => {
  //       updateUserProfile({ expoPushToken: token }).unwrap();
  //     });
  //   } catch (_errr) {}
  // }, []);
  useEffect(() => {
    refetch();
  }, []);

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
              <DailyTask />
              <Invited data={invite} onPress={handleInvite} />
              <Animated.View layout={LinearTransition}>
                <FindFriendsBoard onPress={() => toggleFriendsModal(true)} />
              </Animated.View>
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

// async function registerForPushNotificationsAsync() {
//   let token;

//   if (Platform.OS === "android") {
//     await Notifications.setNotificationChannelAsync("General", {
//       name: "General",
//       importance: Notifications.AndroidImportance.MAX,
//       vibrationPattern: [0, 250, 250, 250],
//       lightColor: colors.primary,
//       sound: "default", // must match filename in `assets` folder
//     });
//   }

//   if (Device.isDevice) {
//     const { status: existingStatus } =
//       await Notifications.getPermissionsAsync();
//     let finalStatus = existingStatus;
//     if (existingStatus !== "granted") {
//       const { status } = await Notifications.requestPermissionsAsync();
//       finalStatus = status;
//     }

//     if (finalStatus !== "granted") {
//       alert("Failed to get push token for push notification!");
//       return;
//     }
//     // Learn more about projectId:
//     // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
//     // EAS projectId is used here.
//     try {
//       const projectId =
//         Constants?.expoConfig?.extra?.eas?.projectId ??
//         Constants?.easConfig?.projectId;
//       if (!projectId) {
//         throw new Error("Project ID not found");
//       }

//       try {
//         token = (
//           await Notifications.getExpoPushTokenAsync({
//             projectId,
//           })
//         ).data;
//       } catch (errorT) {}
//     } catch (e) {
//       token = `${e}`;
//     }
//   } else {
//     alert("Must use physical device for Push Notifications");
//   }

//   return token;
// }

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
