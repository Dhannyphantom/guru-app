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
import { useFetchFriendsQuery } from "../context/usersSlice";
import PopMessage from "./PopMessage";
import { capCapitalize, getFullName } from "../helpers/helperFunctions";

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

const ModeSelection = ({ setState }) => {
  const [showFriendList, setShowFriendList] = useState(false);
  const { data: res, isLoading: friending } = useFetchFriendsQuery();
  const [popper, setPopper] = useState({ vis: false });
  const [invites, setInvites] = useState([]);

  const friends = res?.data?.mutuals || [];

  const waitingAnim = useSharedValue(1);

  const acceptedInvites = friends.filter(
    (item) => item.selected && item.status === "accepted"
  );
  const pendingInvite = friends.find((item) => item?.status === "pending");
  const isWaiting = !acceptedInvites[0] && Boolean(pendingInvite);
  const sortedInvites = sortInvites(invites);
  let simulationInterval;

  const onInviteFriend = (friend) => {
    const copier = [...invites];
    const checker = copier.some((item) => item?._id === friend._id);
    if (!checker) {
      copier.push({ ...friend, status: "pending" });
      setInvites(copier);
    }
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
    }
  };
  // TODO: DELETE THIS FUNCTION BEFORE PROD BUILD
  const simulateInvitesReaction = () => {
    simulationInterval = setInterval(() => {
      console.log("Interval Fired!!");
      // setFriends((prevFriends) =>
      //   prevFriends.map((item) => {
      //     const randInt = Math.floor(Math.random() * 3);
      //     if (item.selected && item?.status != "rejected") {
      //       return {
      //         ...item,
      //         status:
      //           randInt === 0
      //             ? "pending"
      //             : randInt === 1
      //             ? "accepted"
      //             : "rejected",
      //       };
      //     } else {
      //       return item;
      //     }
      //   })
      // );
    }, 15000);

    if (invites?.length <= 0 || !Boolean(pendingInvite)) {
      clearInterval(simulationInterval);
    }
  };

  useEffect(() => {
    simulateInvitesReaction();
    if (acceptedInvites[0]) {
      setState({ invites: acceptedInvites });
    }

    return () => clearInterval(simulationInterval);
  }, [friends]);
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
            <FlatList
              data={sortedInvites}
              horizontal
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
              renderItem={({ item }) => (
                <FriendCard
                  data={item}
                  type="invite"
                  btnStyle={{ text: "Invite" }}
                  onPress={onInviteFriend}
                />
              )}
            />
          </View>
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
