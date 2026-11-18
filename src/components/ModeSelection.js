/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { Dimensions, FlatList, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  BounceIn,
  CurvedTransition,
  FadeInUp,
  LinearTransition,
  ZoomOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSelector } from "react-redux";

import AppText from "../components/AppText";
import SearchBar from "./SearchBar";
import FriendCard, { ProfileCard } from "./FriendCard";
import RenderCategories from "./RenderCategories";
import { selectUser, useFetchFriendsQuery } from "../context/usersSlice";
import { capCapitalize, getFullName, getUserProfile, socket } from "../helpers/helperFunctions";
import { Q, TONES } from "./quiz/QuizTheme";
import { Chip, Chunky, QuizButton, QuizCard, QuizPrompt, useFloat } from "./quiz/QuizUI";

const { width } = Dimensions.get("screen");

const sortInvites = (arr = []) => {
  const order = { accepted: 1, pending: 2, rejected: 3 };
  return arr.sort((a, b) => order[a.status] - order[b.status]);
};

const findUser = (user, invites = []) => invites.find((item) => item?._id === user?._id);

// ─── Pieces ──────────────────────────────────────────────────────────────────

const ModeCard = ({ tone, icon, title, sub, tag, onPress, delay = 0 }) => {
  const t = TONES[tone];
  const float = useFloat(delay, 2800, 6);
  return (
    <Animated.View entering={FadeInUp.delay(delay).springify().damping(18)}>
      <Chunky onPress={onPress} face={t.face} lip={t.lip} radius={28} depth={7} contentStyle={styles.modeCard}>
        <View pointerEvents="none" style={[styles.modeDecor, { top: -30, left: -20, width: 100, height: 100, borderRadius: 50 }]} />
        <View pointerEvents="none" style={[styles.modeDecor, { bottom: -24, right: 90, width: 56, height: 56, borderRadius: 16 }]} />
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Chip label={tag} color={t.ink} bg="rgba(255,255,255,0.92)" />
          <AppText fontWeight="black" size={26} style={styles.modeTitle}>
            {title}
          </AppText>
          <AppText fontWeight="medium" size={13} style={styles.modeSub}>
            {sub}
          </AppText>
        </View>
        <Animated.View style={[styles.modeIcon, float]}>
          <Ionicons name={icon} size={46} color={t.face} />
        </Animated.View>
      </Chunky>
    </Animated.View>
  );
};

const EmptyFriends = ({ friendsLength }) => (
  <View style={styles.empty}>
    {friendsLength > 0 ? (
      <AppText fontWeight="semibold" size={13} style={styles.emptyTxt}>
        Invite a friend below to fill your squad
      </AppText>
    ) : (
      <View>
        <AppText fontWeight="bold" size={13.5} style={styles.emptyTxt}>
          No mutual friends yet
        </AppText>
        <AppText fontWeight="medium" size={12} style={[styles.emptyTxt, { marginTop: 4 }]}>
          Find and follow your friends or classmates and have them follow you back
        </AppText>
      </View>
    )}
  </View>
);

const SquadPanel = ({ title, host, invites, friendsLength, isWaiting, waitingStyle, onStartWaiting, onPressMember, onBack }) => {
  const accepted = invites.filter((i) => i.status === "accepted").length;
  return (
    <QuizCard tone="purple" style={{ padding: 0, marginBottom: 10 }} animateIn={false}>
      <View style={styles.squadHead}>
        <View style={{ flex: 1 }}>
          <AppText fontWeight="black" size={17} style={{ color: Q.ink }}>
            {title}
          </AppText>
          <AppText fontWeight="medium" size={12} style={{ color: Q.sub }}>
            Up to the whole squad can join
          </AppText>
        </View>
        <Chip icon="people" label={`${accepted} joined`} color={TONES.purple.ink} bg="#fff" />
        {Boolean(onBack) && (
          <QuizButton title="Modes" icon="chevron-back" variant="ghost" small onPress={onBack} style={{ marginLeft: 8 }} />
        )}
      </View>
      <FlatList
        data={invites}
        horizontal
        showsHorizontalScrollIndicator={false}
        ListHeaderComponent={
          <Animated.View layout={CurvedTransition} entering={BounceIn} exiting={ZoomOut}>
            <ProfileCard data={host} />
          </Animated.View>
        }
        ListEmptyComponent={() => <EmptyFriends friendsLength={friendsLength} />}
        keyExtractor={(item) => item?._id}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12 }}
        renderItem={({ item }) => (
          <Animated.View layout={CurvedTransition} entering={BounceIn} exiting={ZoomOut}>
            <ProfileCard data={item} onPress={onPressMember} />
          </Animated.View>
        )}
      />
      {isWaiting && (
        <Animated.View onLayout={onStartWaiting} style={waitingStyle}>
          <AppText fontWeight="bold" size={12.5} style={styles.waitTxt}>
            Waiting for student response…
          </AppText>
        </Animated.View>
      )}
    </QuizCard>
  );
};

// ─── Main ────────────────────────────────────────────────────────────────────

const ModeSelection = ({ setState, setPop, sessionId, lobby, isLobby }) => {
  const [showFriendList, setShowFriendList] = useState(false);
  const { data: res } = useFetchFriendsQuery();
  const [invites, setInvites] = useState([]);
  const [mode, setMode] = useState({});
  const [prompt, setPrompt] = useState({ vis: false });

  const friends = res?.data?.mutuals || [];
  const user = useSelector(selectUser);
  const player = { ...getUserProfile(user), status: "host" };

  const waitingAnim = useSharedValue(1);

  const acceptedInvites = invites.filter((item) => item.status === "accepted");
  const pendingInvite = invites.find((item) => item?.status === "pending");
  const isWaiting = !acceptedInvites[0] && Boolean(pendingInvite);
  const sortedInvites = sortInvites([...invites]);

  const waitingStyle = useAnimatedStyle(() => ({ transform: [{ scale: waitingAnim.value }] }));
  const startAnimation = () => {
    waitingAnim.value = withRepeat(withTiming(0.9), 0, true);
  };

  const onInviteFriend = (friend) => {
    const checker = invites.find((item) => item?._id === friend._id);
    if (checker) {
      setPrompt({
        vis: true,
        data: {
          title: "Remove player?",
          msg: `Are you sure you want to remove ${friend?.username} from this session?`,
          btn: "Remove",
        },
        cb: () => {
          socket.emit("remove_invite", {
            toUserId: friend?._id,
            session: { sessionId, user: getUserProfile(friend) },
          });
        },
      });
    } else {
      socket.emit("send_invite", {
        toUserId: friend?._id,
        session: { sessionId, host: player, mode: "friends", user: getUserProfile(friend) },
      });
      setPop({
        vis: true,
        msg: `Invite sent to ${capCapitalize(getFullName(friend, true))}`,
        timer: 600,
        type: "success",
      });
    }
  };

  const onItemPress = (isSolo) => {
    if (isSolo) {
      setState({ view: "category", mode: "solo", sessionId: null });
    } else {
      setState({ mode: "friends" });
      setShowFriendList(true);
      socket.emit("create_session", { host: player });
    }
  };

  const onReadyPlayer = () => {
    socket.emit("ready_player", { sessionId, user: getUserProfile(user) });
  };

  const handleContinue = () => setState({ invites, view: "category" });

  useEffect(() => {
    if (!showFriendList && lobby?.host?._id === user?._id) {
      setPop({
        vis: true,
        msg: `Hey, ${user?.username}, You're now the quiz host`,
        timer: 3000,
        type: "success",
      });
      setShowFriendList(true);
    }
  }, [lobby]);

  useEffect(() => {
    socket.on("new_invite", ({ user }) => {
      setInvites((prev) => {
        const idx = prev.findIndex((u) => u._id === user._id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], status: copy[idx]?.status === "rejected" ? "pending" : copy[idx]?.status };
          return copy;
        }
        return [...prev, { ...user, status: "pending" }];
      });
    });
    return () => socket.off("new_invite");
  }, []);

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

  useEffect(() => {
    socket.on("remove_invited", ({ user }) => {
      setInvites((prev) => prev.filter((item) => item?._id !== user?._id));
    });
    return () => socket.off("remove_invited");
  }, []);

  useEffect(() => {
    socket.on("session_snapshot", (session) => {
      setInvites(session.users || []);
      setMode({
        category: session.category || null,
        subjects: session.subjects || [],
        quizData: session.quizData || null,
      });
      setState({ sessionId: session.sessionId, invites: session.users });
    });
    return () => socket.off("session_snapshot");
  }, []);

  useEffect(() => {
    socket.on("session_snapshots", (sessionDta) => {
      setInvites(sessionDta.users ?? []);
    });
    return () => socket.off("session_snapshots");
  }, []);

  useEffect(() => {
    socket.on("player_ready", () => {
      setState({ view: "quiz", mode: "friends" });
    });
    return () => socket.off("player_ready");
  }, []);

  useEffect(() => {
    socket.on("set_topics", ({ subjects, quizData }) => {
      setMode((prev) => ({ ...prev, subjects, quizData }));
    });
    // was socket.off("set_subjects") — the listener above was never removed
    return () => socket.off("set_topics");
  }, []);

  useEffect(() => {
    socket.on("user_joined", (user) => {
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

  // ── Render ─────────────────────────────────────────────────────────────────

  let content;

  if (showFriendList) {
    // HOST: build the squad
    content = (
      <View style={{ flex: 1 }}>
        <View style={styles.pad}>
          <SquadPanel
            title="Your Squad"
            host={player}
            invites={sortedInvites}
            friendsLength={friends.length}
            isWaiting={isWaiting}
            waitingStyle={waitingStyle}
            onStartWaiting={startAnimation}
            onPressMember={onInviteFriend}
            onBack={() => setShowFriendList(false)}
          />
          <SearchBar />
        </View>
        <FlatList
          data={friends}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 12 }}
          renderItem={({ item }) => {
            const invitedUser = findUser(item, invites);
            return (
              <FriendCard
                data={item}
                type="invite"
                btnStyle={{ text: invitedUser ? "Remove" : "Invite", type: invitedUser ? "warn" : "accent" }}
                onPress={onInviteFriend}
              />
            );
          }}
        />
        {Boolean(acceptedInvites[0]) && (
          <Animated.View layout={LinearTransition} entering={FadeInUp} style={styles.pad}>
            <QuizButton title="Continue" icon="arrow-forward" variant="purple" onPress={handleContinue} />
          </Animated.View>
        )}
      </View>
    );
  } else if (isLobby) {
    // GUEST: waiting for the host to pick the quiz
    content = (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: 20 }]} showsVerticalScrollIndicator={false}>
          <SquadPanel
            title="Quiz Lobby"
            host={lobby?.host}
            invites={sortedInvites}
            friendsLength={friends.length}
            isWaiting={isWaiting}
            waitingStyle={waitingStyle}
            onStartWaiting={startAnimation}
            onPressMember={onInviteFriend}
          />

          {!mode?.category && (
            <Animated.View entering={FadeInUp} style={styles.hostWait}>
              <Ionicons name="hourglass" size={18} color={TONES.yellow.ink} />
              <AppText fontWeight="bold" size={13} style={{ color: TONES.yellow.ink, marginLeft: 8, flex: 1 }}>
                The host is choosing the quiz…
              </AppText>
            </Animated.View>
          )}

          {Boolean(mode?.category) && (
            <QuizCard tone="blue" animateIn={false} style={{ alignItems: "center" }}>
              <AppText fontWeight="black" size={16} style={{ color: Q.ink, alignSelf: "flex-start" }}>
                Category
              </AppText>
              <RenderCategories item={mode.category} disabled size={width * 0.38} style={{ marginTop: 10, marginBottom: 0 }} />
            </QuizCard>
          )}

          {Boolean(mode?.subjects?.[0]) && (
            <QuizCard tone="coral" animateIn={false}>
              <AppText fontWeight="black" size={16} style={{ color: Q.ink }}>
                Subjects
              </AppText>
              <View style={styles.subjRow}>
                {mode.subjects.map((subj, i) => (
                  <View key={subj?._id} style={{ alignItems: "center", marginTop: 10 }}>
                    <RenderCategories item={subj} index={i + 2} disabled size={width * 0.38} style={{ marginBottom: 6 }} />
                    {Boolean(subj?.topics?.[0]) && (
                      <View style={{ alignItems: "center", gap: 4, maxWidth: width * 0.4 }}>
                        <AppText fontWeight="bold" size={11} style={{ color: Q.sub, letterSpacing: 0.8 }}>
                          TOPIC
                        </AppText>
                        {subj.topics.map((topic, idx) => (
                          <AppText key={String(idx)} fontWeight="semibold" size={12.5} style={{ textAlign: "center", color: Q.ink }}>
                            {topic?.name}
                          </AppText>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </QuizCard>
          )}
        </ScrollView>
        {Boolean(mode?.quizData) && (
          <Animated.View entering={FadeInUp} style={styles.pad}>
            <QuizButton title="Start Quiz Now" icon="flash" variant="yellow" onPress={onReadyPlayer} />
          </Animated.View>
        )}
      </View>
    );
  } else {
    // CHOOSE MODE
    content = (
      <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: 24, gap: 18 }]} showsVerticalScrollIndicator={false}>
        <ModeCard
          tone="green"
          icon="person"
          title="Play Solo"
          sub="Practise at your own pace and earn tokens."
          tag="Chill & learn"
          onPress={() => onItemPress(true)}
        />
        <ModeCard
          tone="purple"
          icon="people"
          title="Play with friends"
          sub="Invite your mutuals and climb the leaderboard together."
          tag="Squad battle"
          delay={120}
          onPress={() => onItemPress(false)}
        />
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {content}
      <QuizPrompt prompt={prompt} setPrompt={setPrompt} />
    </View>
  );
};

export default ModeSelection;

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16 },
  modeCard: { flexDirection: "row", alignItems: "center", padding: 20, minHeight: 170, overflow: "hidden" },
  modeDecor: { position: "absolute", backgroundColor: "rgba(255,255,255,0.14)" },
  modeTitle: { color: "#fff", marginTop: 12, textTransform: "uppercase", letterSpacing: 0.4 },
  modeSub: { color: "rgba(255,255,255,0.92)", marginTop: 4, lineHeight: 18 },
  modeIcon: {
    width: 92, height: 92, borderRadius: 46, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  squadHead: { flexDirection: "row", alignItems: "center", padding: 12, paddingBottom: 6 },
  empty: { width: width * 0.62, justifyContent: "center", paddingHorizontal: 8 },
  emptyTxt: { color: Q.sub },
  waitTxt: { textAlign: "center", marginBottom: 10, color: TONES.purple.ink },
  hostWait: {
    flexDirection: "row", alignItems: "center", backgroundColor: TONES.yellow.soft,
    borderWidth: 2, borderColor: TONES.yellow.line, borderRadius: 16, padding: 12, marginBottom: 14,
  },
  subjRow: { flexDirection: "row", justifyContent: "space-around", flexWrap: "wrap" },
});
