/* eslint-disable react-hooks/exhaustive-deps */
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import { useEffect, useState } from "react";
import { enterAnim, enterAnimOther, exitingAnim } from "../helpers/dataStore";
import Animated, {
  BounceIn,
  CurvedTransition,
  FadeInUp,
  LinearTransition,
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
import PromptModal from "./PromptModal";
import AppButton from "./AppButton";
import RenderCategories from "./RenderCategories";

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
  const [mode, setMode] = useState({});
  const [prompt, setPrompt] = useState({ vis: false });

  const friends = res?.data?.mutuals || [];
  const user = useSelector(selectUser);
  let player = getUserProfile(user);
  player = { ...player, status: "host" };

  const waitingAnim = useSharedValue(1);

  const acceptedInvites = invites.filter((item) => item.status === "accepted");
  const pendingInvite = invites.find((item) => item?.status === "pending");
  const isWaiting = !acceptedInvites[0] && Boolean(pendingInvite);
  const sortedInvites = sortInvites(invites);

  const onInviteFriend = (friend) => {
    const checker = invites.find((item) => item?._id === friend._id);
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
    } else {
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
    }
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
      socket.emit("create_session", {
        host: player,
      });
    }
  };

  const onReadyPlayer = () => {
    socket.emit("ready_player", {
      sessionId,
      user: getUserProfile(user),
    });
    // setState({ view: "quiz", mode: "friends" });
  };

  const handleContinue = () => {
    setState({ invites, view: "category" });
  };

  // new_invite
  useEffect(() => {
    socket.on("new_invite", ({ user }) => {
      // update invites list
      setInvites((prev) => {
        const idx = prev.findIndex((u) => u._id === user._id);

        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = {
            ...copy[idx],
            status:
              copy[idx]?.status === "rejected" ? "pending" : copy[idx]?.status,
          };
          return copy;
        }

        return [...prev, { ...user, status: "pending" }];
      });
    });

    return () => socket.off("new_invite");
  }, []);

  // invite_status_update (for when user responds)
  useEffect(() => {
    socket.on("invite_status_update", ({ user, status, sessionId }) => {
      setInvites((prev) => {
        const idx = prev.findIndex((u) => u._id === user._id);

        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], status };
          return copy;
        }

        return [...prev, { ...user, status }];
      });
      setState({ sessionId });
    });

    return () => socket.off("invite_status_update");
  }, []);

  // remove_invited
  useEffect(() => {
    socket.on("remove_invited", ({ user }) => {
      // update invites list
      setInvites((prev) => prev.filter((item) => item?._id !== user?._id));
    });

    return () => socket.off("remove_invited");
  }, []);

  // session_snapshot
  useEffect(() => {
    socket.on("session_snapshot", (session) => {
      setInvites(session.users || []);

      setMode({
        category: session.category || null,
        subjects: session.subjects || [],
        quizData: session.quizData || null,
      });

      // keep parent in sync
      // setState({
      //   sessionId: session.sessionId,
      //   invites: session.users,
      // });
    });

    return () => socket.off("session_snapshot");
  }, []);

  useEffect(() => {
    socket.on("set_topics", ({ subjects, quizData }) => {
      // update invites list
      setMode((prev) => ({
        ...prev,
        subjects,
        quizData,
      }));
    });

    return () => socket.off("set_subjects");
  }, []);

  // user_joined
  useEffect(() => {
    socket.on("user_joined", (user) => {
      // update invites list
      setInvites((prev) => {
        const idx = prev.findIndex((u) => u._id === user._id);

        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = user;
          return copy;
        }

        return [...prev, user];
      });
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
          {acceptedInvites[0] && (
            <AppButton
              title="Continue"
              onPress={handleContinue}
              contStyle={styles.btn}
            />
          )}

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
          <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
            {Boolean(mode?.quizData) && (
              <Animated.View
                entering={enterAnimOther}
                exiting={exitingAnim}
                layout={LinearTransition}
              >
                <AppButton
                  contStyle={styles.btnStart}
                  onPress={onReadyPlayer}
                  title={"Start Quiz Now"}
                />
              </Animated.View>
            )}
            <View style={styles.list}>
              {mode?.category && (
                <Animated.View
                  entering={enterAnim}
                  exiting={exitingAnim}
                  layout={LinearTransition}
                >
                  <AppText style={styles.title} fontWeight="bold" size="large">
                    Category
                  </AppText>

                  <RenderCategories item={mode?.category} disabled />
                </Animated.View>
              )}
              {mode?.subjects && mode?.subjects[0] && (
                <Animated.View
                  entering={enterAnim}
                  exiting={exitingAnim}
                  layout={LinearTransition}
                >
                  <AppText style={styles.title} fontWeight="bold" size="large">
                    Subjects
                  </AppText>
                  <View style={styles.row}>
                    {mode?.subjects?.map((subj, idxer) => {
                      return (
                        <View key={subj?._id}>
                          <RenderCategories item={subj} disabled />
                          {subj?.topics && (
                            <Animated.View
                              style={{
                                alignSelf: "center",
                                alignItems: "center",
                                gap: 6,
                                width: "95%",
                              }}
                              entering={enterAnim}
                              exiting={exitingAnim}
                              layout={LinearTransition}
                            >
                              <AppText fontWeight="bold">Topic:</AppText>
                              {subj?.topics?.map((topic, idx) => (
                                <AppText
                                  style={{ textAlign: "center" }}
                                  key={String(idx)}
                                >
                                  {topic?.name}
                                </AppText>
                              ))}
                            </Animated.View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </Animated.View>
              )}
            </View>
          </ScrollView>
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
  btn: {
    alignSelf: "center",
  },
  btnStart: {
    alignSelf: "center",
    marginTop: 20,
  },
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    marginLeft: 15,
    marginBottom: 15,
    marginTop: 10,
  },
  waitTxt: {
    textAlign: "center",
    marginBottom: 8,
    color: colors.medium,
  },
});
