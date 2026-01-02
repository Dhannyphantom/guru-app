import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import { useEffect, useState } from "react";
import { enterAnimOther, exitingAnim } from "../helpers/dataStore";
import Animated, {
  BounceIn,
  CurvedTransition,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomOut,
} from "react-native-reanimated";
import SearchBar from "./SearchBar";
import FriendCard, { ProfileCard } from "./FriendCard";
import AnimatedPressable from "./AnimatedPressable";
import colors from "../helpers/colors";
import { selectUser, useFetchFriendsQuery } from "../context/usersSlice";
import PopMessage from "./PopMessage";
import {
  capCapitalize,
  getFullName,
  getUserProfile,
  socket,
} from "../helpers/helperFunctions";
import { useSelector } from "react-redux";
import { nanoid } from "@reduxjs/toolkit";
import PromptModal from "./PromptModal";

const { width } = Dimensions.get("screen");

const ICON_SIZE = width * 0.35;

const EmptyFriends = ({ friendsLength }) => {
  return (
    <View style={styles.modeEmpty}>
      {friendsLength > 0 ? (
        <AppText>You haven&apos;t sent any invite yet</AppText>
      ) : (
        <AppText>You don&apos;t have any mutual friends yet</AppText>
      )}
    </View>
  );
};

const sortInvites = (arr) => {
  const order = { accepted: 1, pending: 2, rejected: 3 };

  return arr.sort((a, b) => order[a.status] - order[b.status]);
};

const findUser = (user, invites = []) => {
  return invites.find((item) => item?._id === user?._id);
};

const ModeSelection = ({ setState, sessionId, lobby, isLobby }) => {
  const [showFriendList, setShowFriendList] = useState(false);
  const { data: res } = useFetchFriendsQuery();
  const [popper, setPopper] = useState({ vis: false });
  const [invites, setInvites] = useState([]);
  const [prompt, setPrompt] = useState({ vis: false });

  const friends = res?.data?.mutuals || [];
  const user = useSelector(selectUser);
  let player = getUserProfile(user);
  player = { ...player, status: "host" };

  const waitingAnim = useSharedValue(1);

  const acceptedInvites = friends.filter(
    (item) => item.selected && item.status === "accepted"
  );
  const pendingInvite = friends.find((item) => item?.status === "pending");
  const isWaiting = !acceptedInvites[0] && Boolean(pendingInvite);
  const sortedInvites = sortInvites(invites);

  const onInviteFriend = (friend) => {
    const copier = [...invites];
    const checker = copier.find((item) => item?._id === friend._id);
    if (checker) {
      // Probably wants to remove user
      setPrompt({
        vis: true,
        data: {
          title: "Remove User",
          msg: `Are you sure you want to remove ${friend?.username} from this session?`,
          btn: "Remove",
        },
        cb: () => {
          socket.emit("remove_invite", {
            toUserId: friend?._id,
            session: {
              sessionId,
              user: getUserProfile(friend),
            },
          });
        },
      });
      return;
    } else {
      copier.push({ ...friend, status: "pending" });
      setInvites(copier);
    }
    socket.emit("send_invite", {
      toUserId: friend?._id,
      session: {
        sessionId,
        host: player,
        mode: "friends",
        user: getUserProfile(friend),
      },
    });

    setPopper({
      vis: true,
      msg: `Invite sent to ${capCapitalize(getFullName(friend, true))}`,
      timer: 600,
      type: "success",
    });
  };

  const waitingStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: waitingAnim.value }],
    };
  });

  const startAnimation = () => {
    waitingAnim.value = withRepeat(withTiming(0.8), 0, true);
  };

  const onItemPress = (isSolo) => {
    if (isSolo) {
      setState({ view: "category", bar: 2, mode: "solo" });
    } else {
      setState({ mode: "friends" });
      setShowFriendList(true);
      socket.emit("join_session", {
        sessionId,
        user: player,
      });
    }
  };

  useEffect(() => {
    socket.on("new_invite", ({ user }) => {
      // update invites list

      const copier = [...invites];

      const checkerIdx = copier.findIndex((item) => item?._id === user?._id);
      if (checkerIdx >= 0) {
        copier[checkerIdx] = {
          ...copier[checkerIdx],
          status:
            copier[checkerIdx]?.status === "rejected"
              ? "pending"
              : copier[checkerIdx]?.status,
        };
      } else {
        copier.push({ ...user, status: "pending" });
      }

      setInvites(copier);
    });

    return () => socket.off("new_invite");
  }, []);

  useEffect(() => {
    socket.on("invite_status_update", ({ user, status }) => {
      // update invites list
      console.log({ status });
      const copier = [...invites];

      const checkerIdx = copier.findIndex((item) => item?._id === user?._id);
      if (checkerIdx >= 0) {
        copier[checkerIdx] = {
          ...copier[checkerIdx],
          status,
        };
      } else {
        copier.push({ ...user, status });
      }

      setInvites(copier);
    });

    return () => socket.off("invite_status_update");
  }, []);

  // remove_invited
  useEffect(() => {
    socket.on("remove_invited", ({ user }) => {
      // update invites list
      const filteredInvites = invites.filter((item) => item?._id !== user?._id);

      setInvites(filteredInvites);
    });

    return () => socket.off("remove_invited");
  }, []);

  // user_joined
  useEffect(() => {
    socket.on("user_joined", (user) => {
      // update invites list

      const copier = [...invites];
      const checkerIdx = copier.findIndex((item) => item?._id === user?._id);
      if (checkerIdx >= 0) {
        copier[checkerIdx] = user;
      } else {
        copier.push(user);
      }

      setInvites(copier);
    });

    return () => socket.off("user_joined");
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {showFriendList ? (
        <Animated.View
          style={styles.modeFriends}
          entering={enterAnimOther}
          exiting={exitingAnim}
        >
          <SearchBar />
          <View style={styles.modeSelected}>
            <View style={styles.modeSelectedHeader}>
              <AppText style={styles.modeAcceptTxt} fontWeight="bold">
                Accepted Invites: {acceptedInvites?.length}
              </AppText>
              <Pressable
                onPress={() => setShowFriendList(false)}
                style={styles.modeNav}
              >
                <Ionicons
                  name="chevron-back"
                  size={15}
                  color={colors.primaryDeeper}
                />
                <AppText
                  style={{ color: colors.primaryDeeper }}
                  fontWeight="bold"
                >
                  Go Back
                </AppText>
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <FlatList
                data={sortedInvites}
                horizontal
                ListHeaderComponent={
                  <Animated.View
                    layout={CurvedTransition}
                    entering={BounceIn}
                    exiting={ZoomOut}
                  >
                    <ProfileCard data={player} />
                  </Animated.View>
                }
                ListEmptyComponent={() => (
                  <EmptyFriends friendsLength={friends?.length} />
                )}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ padding: 15 }}
                renderItem={({ item }) => (
                  <Animated.View
                    layout={CurvedTransition}
                    entering={BounceIn}
                    exiting={ZoomOut}
                  >
                    <ProfileCard data={item} onPress={onInviteFriend} />
                  </Animated.View>
                )}
              />
            </View>
            {isWaiting && (
              <Animated.View onLayout={startAnimation} style={waitingStyle}>
                <AppText style={styles.waitTxt}>
                  Waiting for student response...
                </AppText>
              </Animated.View>
            )}
          </View>
          <View style={styles.list}>
            <FlatList
              data={friends}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingBottom: 15 }}
              renderItem={({ item }) => {
                const invitedUser = findUser(item, invites);

                return (
                  <FriendCard
                    data={item}
                    type="invite"
                    btnStyle={{
                      text: invitedUser ? "Remove" : "Invite",
                      type: invitedUser ? "warn" : "accent",
                    }}
                    onPress={onInviteFriend}
                  />
                );
              }}
            />
          </View>
          <PopMessage popData={popper} setPopData={setPopper} />
        </Animated.View>
      ) : isLobby ? (
        <Animated.View
          style={styles.modeFriends}
          entering={enterAnimOther}
          exiting={exitingAnim}
        >
          <View style={styles.modeSelected}>
            <View style={styles.modeSelectedHeader}>
              <AppText style={styles.modeAcceptTxt} fontWeight="bold">
                Accepted Invites: {acceptedInvites?.length}
              </AppText>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <FlatList
                data={sortedInvites}
                horizontal
                ListHeaderComponent={
                  <Animated.View
                    layout={CurvedTransition}
                    entering={BounceIn}
                    exiting={ZoomOut}
                  >
                    <ProfileCard data={lobby?.host} />
                  </Animated.View>
                }
                ListEmptyComponent={() => (
                  <EmptyFriends friendsLength={friends?.length} />
                )}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ padding: 15 }}
                renderItem={({ item }) => (
                  <Animated.View
                    layout={CurvedTransition}
                    entering={BounceIn}
                    exiting={ZoomOut}
                  >
                    <ProfileCard data={item} onPress={onInviteFriend} />
                  </Animated.View>
                )}
              />
            </View>
            {isWaiting && (
              <Animated.View onLayout={startAnimation} style={waitingStyle}>
                <AppText style={styles.waitTxt}>
                  Waiting for student response...
                </AppText>
              </Animated.View>
            )}
          </View>
          <View style={styles.list}></View>
          <PopMessage popData={popper} setPopData={setPopper} />
        </Animated.View>
      ) : (
        <Animated.View
          entering={FadeInUp}
          exiting={exitingAnim}
          style={styles.mode}
        >
          <AnimatedPressable
            onPress={() => onItemPress(true)}
            style={styles.modeItem}
          >
            <View style={styles.modeIconOverlay}>
              <View style={styles.modeIcon}>
                <Ionicons
                  name="person"
                  size={ICON_SIZE * 0.5}
                  color={colors.primaryLight}
                />
              </View>
            </View>
            <AppText fontWeight="black" size={"xxlarge"} style={styles.modeTxt}>
              Play Solo
            </AppText>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => onItemPress(false)}
            style={styles.modeItem}
          >
            <View
              style={[
                styles.modeIconOverlay,
                { backgroundColor: colors.accentDeep },
              ]}
            >
              <View
                style={[styles.modeIcon, { backgroundColor: colors.accent }]}
              >
                <Ionicons
                  name="people"
                  size={ICON_SIZE * 0.5}
                  color={colors.accentLight}
                />
              </View>
            </View>
            <AppText
              fontWeight="black"
              size={"xxlarge"}
              style={[styles.modeTxt, { color: colors.accentDeeper }]}
            >
              Play with friends
            </AppText>
          </AnimatedPressable>
        </Animated.View>
      )}
      <PromptModal prompt={prompt} setPrompt={setPrompt} />
    </View>
  );
};

export default ModeSelection;

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  mode: {
    flex: 1,
    justifyContent: "space-evenly",
    marginBottom: 30,
    width,
  },
  modeFriends: {
    flex: 1,
    // backgroundColor: "red",
    // width,
    // height: 200,
  },
  modeItem: {
    alignItems: "center",
  },
  modeAcceptTxt: {},
  modeNav: {
    flexDirection: "row",
    alignItems: "center",
  },
  modeSelectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  modeTxt: {
    textTransform: "uppercase",
    marginTop: 16,
    color: colors.primaryDeeper,
  },
  modeSelected: {
    width: width * 0.97,
    backgroundColor: colors.unchange,
    marginBottom: 10,
    alignSelf: "center",
    borderRadius: 20,
  },
  modeIconOverlay: {
    borderRadius: 200,
    paddingBottom: 6,
    paddingLeft: 3,
    backgroundColor: colors.primaryDeep,
    elevation: 6,
  },
  modeEmpty: {
    width: width * 0.8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  modeIcon: {
    backgroundColor: colors.primary,
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  waitTxt: {
    textAlign: "center",
    marginBottom: 8,
    color: colors.medium,
  },
});
