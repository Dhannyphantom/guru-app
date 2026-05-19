/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSelector } from "react-redux";

import AppText from "./AppText";
import AppButton from "./AppButton";
import Avatar from "./Avatar";
import colors from "../helpers/colors";
import { selectUser } from "../context/usersSlice";
import {
  useFetchActiveCompetitionQuery,
  useFetchCompetitionDetailsQuery,
} from "../context/competitionSlice";
import { LeaderboardWinners } from "../screens/LeaderboardScreen";
import { formatPoints } from "../helpers/helperFunctions";

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

const formatDuration = (seconds) => {
  if (!seconds) return "~0 min";
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `~${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
};

const useCountdown = (targetDate, active) => {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!targetDate || !active) return;
    const tick = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
        return;
      }
      setRemaining({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        done: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate, active]);

  return remaining;
};

// Compact inline countdown: 00d 00h 00m 00s
const InlineCountdown = ({ countdown }) => {
  if (!countdown || countdown.done) return null;
  const parts = [
    { v: countdown.days, l: "d" },
    { v: countdown.hours, l: "h" },
    { v: countdown.minutes, l: "m" },
    { v: countdown.seconds, l: "s" },
  ];
  return (
    <View style={styles.inlineCountdown}>
      {parts.map(({ v, l }, i) => (
        <View key={l} style={styles.inlineUnit}>
          <AppText fontWeight="black" size="medium" style={styles.inlineValue}>
            {String(v).padStart(2, "0")}
          </AppText>
          <AppText size="xxsmall" style={styles.inlineLabel}>{l}</AppText>
          {i < 3 && (
            <AppText style={styles.inlineSep}>:</AppText>
          )}
        </View>
      ))}
    </View>
  );
};

// Compact prize pill
const PrizePill = ({ emoji, reward }) => (
  <View style={styles.prizePill}>
    <AppText size="small">{emoji}</AppText>
    <AppText fontWeight="bold" size="xxsmall" style={{ color: "#FFD700" }}>
      {formatPoints(reward)}
    </AppText>
  </View>
);

// Full prize row for modal
const PrizeRow = ({ place, title, reward, medal }) => (
  <View style={styles.prizeRow}>
    <View style={[styles.medalBadge, { backgroundColor: medal }]}>
      <AppText fontWeight="black" size="xsmall" style={{ color: "#1a1a2e" }}>
        {place}
      </AppText>
    </View>
    <View>
      <AppText fontWeight="bold" size="small" style={{ color: "#fff" }}>
        {title}
      </AppText>
      <AppText size="xsmall" style={{ color: "rgba(255,255,255,0.7)" }}>
        {formatPoints(reward)}
      </AppText>
    </View>
  </View>
);

const CompetitionDetailsModal = ({
  visible,
  onClose,
  competitionId,
  isSubscribed,
  onParticipate,
}) => {
  const { data, isLoading } = useFetchCompetitionDetailsQuery(competitionId, {
    skip: !visible || !competitionId,
  });
  const comp = data?.data;
  const statusLabel = comp?.isLive ? "LIVE NOW" : comp?.isUpcoming ? "UPCOMING" : "ENDED";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <LinearGradient colors={["#1a1a2e", "#16213e", "#0f3460"]} style={styles.modalGradient}>
            <Pressable style={styles.modalClose} onPress={onClose}>
              <Ionicons name="close" size={26} color="#fff" />
            </Pressable>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalBadge}>
                <AppText fontWeight="bold" size="xxsmall" style={{ color: "#FFD700" }}>
                  {statusLabel}
                </AppText>
              </View>

              <AppText fontWeight="black" size="xxlarge" style={styles.modalTitle}>
                {comp?.title || "Monthly Quiz"}
              </AppText>

              <AppText size="small" style={styles.modalSub}>
                {MONTHS[(comp?.month || 1) - 1]} {comp?.year} · First Saturday · 24 hours
              </AppText>

              {isLoading ? (
                <AppText style={{ color: "#fff", marginTop: 20 }}>Loading...</AppText>
              ) : (
                <>
                  <View style={styles.modalStatsRow}>
                    <View style={styles.modalStat}>
                      <Ionicons name="people" size={20} color="#FFD700" />
                      <AppText fontWeight="bold" style={{ color: "#fff" }}>
                        {comp?.participantsCount ?? 0}
                      </AppText>
                      <AppText size="xxsmall" style={{ color: "rgba(255,255,255,0.6)" }}>Participants</AppText>
                    </View>
                    <View style={styles.modalStat}>
                      <Ionicons name="help-circle" size={20} color="#FFD700" />
                      <AppText fontWeight="bold" style={{ color: "#fff" }}>
                        {comp?.totalQuestions ?? 0}
                      </AppText>
                      <AppText size="xxsmall" style={{ color: "rgba(255,255,255,0.6)" }}>Questions</AppText>
                    </View>
                    <View style={styles.modalStat}>
                      <Ionicons name="time" size={20} color="#FFD700" />
                      <AppText fontWeight="bold" style={{ color: "#fff" }}>
                        {formatDuration(comp?.approxDuration)}
                      </AppText>
                      <AppText size="xxsmall" style={{ color: "rgba(255,255,255,0.6)" }}>Duration</AppText>
                    </View>
                  </View>

                  {comp?.rules ? (
                    <View style={styles.rulesBox}>
                      <AppText fontWeight="bold" size="small" style={{ color: "#FFD700" }}>Rules</AppText>
                      <AppText size="small" style={{ color: "rgba(255,255,255,0.85)" }}>{comp.rules}</AppText>
                    </View>
                  ) : null}

                  <AppText fontWeight="bold" size="medium" style={styles.sectionTitle}>Prize Pool</AppText>
                  <PrizeRow place="1st" title={comp?.prizes?.first?.title || "Champion"} reward={comp?.prizes?.first?.reward} medal="#FFD700" />
                  <PrizeRow place="2nd" title={comp?.prizes?.second?.title || "Runner-up"} reward={comp?.prizes?.second?.reward} medal="#C0C0C0" />
                  <PrizeRow place="3rd" title={comp?.prizes?.third?.title || "Third Place"} reward={comp?.prizes?.third?.reward} medal="#CD7F32" />

                  {(comp?.lastWinners?.length > 0 || comp?.finalRankings?.length > 0) && (
                    <>
                      <AppText fontWeight="bold" size="medium" style={[styles.sectionTitle, { marginTop: 16 }]}>
                        Last Winners
                      </AppText>
                      <LeaderboardWinners
                        isPro={false}
                        data={(comp.lastWinners || comp.finalRankings || []).slice(0, 3).map((w) => ({
                          _id: w.user?._id || w.user,
                          username: w.user?.username,
                          firstName: w.user?.firstName,
                          points: w.score,
                          avatar: w.user?.avatar,
                        }))}
                      />
                    </>
                  )}

                  {comp?.leaderboard?.length > 0 && comp?.isLive && (
                    <>
                      <AppText fontWeight="bold" size="medium" style={[styles.sectionTitle, { marginTop: 16 }]}>
                        Live Leaderboard
                      </AppText>
                      {comp.leaderboard.slice(0, 5).map((p, i) => (
                        <View key={p.user?._id || i} style={styles.lbRow}>
                          <AppText fontWeight="bold" style={{ color: "#FFD700", width: 28 }}>#{p.rank}</AppText>
                          <Avatar size={32} source={p.user?.avatar?.image} />
                          <AppText style={{ flex: 1, color: "#fff", marginLeft: 10 }} fontWeight="semibold">
                            @{p.user?.username}
                          </AppText>
                          <AppText fontWeight="bold" style={{ color: "#FFD700" }}>
                            {formatPoints(p.score)}
                          </AppText>
                        </View>
                      ))}
                    </>
                  )}

                  {comp?.hasParticipated && (
                    <View style={styles.participatedBanner}>
                      <Ionicons name="checkmark-circle" size={22} color="#4ADE80" />
                      <AppText style={{ color: "#4ADE80", marginLeft: 8 }} fontWeight="bold">
                        You completed this{comp.myRank ? ` · Rank #${comp.myRank}` : ""}
                      </AppText>
                    </View>
                  )}

                  <View style={{ height: 100 }} />
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              {!isSubscribed ? (
                <>
                  <AppText size="small" style={{ color: "rgba(255,255,255,0.8)", textAlign: "center", marginBottom: 10 }}>
                    Subscribe to participate in the monthly quiz championship
                  </AppText>
                  <AppButton title="Subscribe Now" onPress={() => { onClose(); onParticipate?.("subscribe"); }} />
                </>
              ) : comp?.isLive && !comp?.hasParticipated ? (
                <AppButton title="Start Competition" onPress={() => { onClose(); onParticipate?.("start"); }} />
              ) : comp?.isUpcoming ? (
                <AppButton title="Opens Soon" type="white" onPress={onClose} />
              ) : (
                <AppButton title="Close" type="white" onPress={onClose} />
              )}
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const MonthlyQuizCard = () => {
  const user = useSelector(selectUser);
  const router = useRouter();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data, isLoading, refetch } = useFetchActiveCompetitionQuery(null, {
    refetchOnFocus: true,
    pollingInterval: 60000,
  });

  const comp = data?.data;
  const isSubscribed = user?.subscription?.isActive;

  const countdownTarget = useMemo(() => {
    if (!comp) return null;
    if (comp.isLive) return comp.endTime;
    if (comp.isUpcoming) return comp.startTime;
    return null;
  }, [comp]);

  const countdown = useCountdown(countdownTarget, Boolean(comp && countdownTarget));

  const subjectNames = useMemo(
    () => comp?.subjects?.map((s) => s.subject?.name).filter(Boolean) || [],
    [comp],
  );

  const handleParticipate = (action) => {
    if (action === "subscribe") {
      router.push("/profile/subscription");
      return;
    }
    if (action === "start" && comp?._id) {
      router.push({ pathname: "/main/competition", params: { competitionId: comp._id } });
    }
  };

  if (isLoading || !comp) return null;

  const statusColor = comp.isLive ? "#4ADE80" : comp.isUpcoming ? "#FFD700" : "#94A3B8";
  const statusText = comp.isLive ? "LIVE" : comp.isUpcoming ? "UPCOMING" : "ENDED";

  return (
    <>
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.wrapper}>
        <Pressable onPress={() => setDetailsOpen(true)}>
          <LinearGradient
            colors={["#6B21A8", "#4C1D95", "#1e1b4b"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Glow accent */}
            <View style={styles.cardGlow} />

            {/* Row 1: Title + status badge */}
            <View style={styles.cardHeader}>
              <View style={styles.trophyIcon}>
                <Ionicons name="trophy" size={18} color="#FFD700" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText fontWeight="black" size="medium" style={styles.cardTitle} numberOfLines={1}>
                  {comp.title}
                </AppText>
                <AppText size="xxsmall" style={styles.cardMonth}>
                  {MONTHS[comp.month - 1]} {comp.year}
                  {" · "}
                  <AppText size="xxsmall" style={{ color: "#C4B5FD" }}>
                    {comp.totalQuestions}Q · {formatDuration(comp.approxDuration)}
                  </AppText>
                </AppText>
              </View>
              <View style={[styles.liveBadge, { backgroundColor: statusColor + "33" }]}>
                <View style={[styles.liveDot, { backgroundColor: statusColor }]} />
                <AppText fontWeight="bold" size="xxsmall" style={{ color: statusColor }}>
                  {statusText}
                </AppText>
              </View>
            </View>

            {/* Row 2: Countdown + prizes side by side */}
            <View style={styles.middleRow}>
              {/* Countdown */}
              {countdown && !countdown.done && countdownTarget ? (
                <InlineCountdown countdown={countdown} />
              ) : (
                <View style={styles.participantsChip}>
                  <Ionicons name="people-outline" size={13} color="#C4B5FD" />
                  <AppText size="xxsmall" style={{ color: "#C4B5FD", marginLeft: 4 }}>
                    {comp.totalParticipants || 0} joined
                  </AppText>
                </View>
              )}

              {/* Prize pills */}
              <View style={styles.prizePillsRow}>
                <PrizePill emoji="🥇" reward={comp.prizes?.first?.reward} />
                <PrizePill emoji="🥈" reward={comp.prizes?.second?.reward} />
                <PrizePill emoji="🥉" reward={comp.prizes?.third?.reward} />
              </View>
            </View>

            {/* Row 3: Subject tags + tap hint */}
            <View style={styles.cardFooter}>
              <View style={styles.tagsRow}>
                {subjectNames.slice(0, 2).map((name) => (
                  <View key={name} style={styles.tag}>
                    <AppText size="xxsmall" fontWeight="bold" style={{ color: "#E9D5FF" }}>
                      {name}
                    </AppText>
                  </View>
                ))}
                {subjectNames.length > 2 && (
                  <View style={styles.tag}>
                    <AppText size="xxsmall" style={{ color: "#E9D5FF" }}>
                      +{subjectNames.length - 2}
                    </AppText>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      <CompetitionDetailsModal
        visible={detailsOpen}
        onClose={() => { setDetailsOpen(false); refetch(); }}
        competitionId={comp._id}
        isSubscribed={isSubscribed}
        onParticipate={handleParticipate}
      />
    </>
  );
};

export default MonthlyQuizCard;

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 15,
  },
  card: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#6B21A8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  cardGlow: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,215,0,0.10)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trophyIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,215,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: "#fff",
  },
  cardMonth: {
    color: "rgba(255,255,255,0.5)",
    marginTop: 1,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Middle row: countdown left, prizes right
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  inlineCountdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  inlineUnit: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 1,
    position: "relative",
  },
  inlineValue: {
    color: "#FFD700",
    fontSize: 16,
    lineHeight: 20,
  },
  inlineLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
  },
  inlineSep: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 14,
    marginHorizontal: 2,
    lineHeight: 20,
  },
  participantsChip: {
    flexDirection: "row",
    alignItems: "center",
  },

  prizePillsRow: {
    flexDirection: "row",
    gap: 5,
  },
  prizePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,215,0,0.1)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.2)",
  },

  // Footer
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    flex: 1,
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  // Modal styles (unchanged)
  prizeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  medalBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  modalGradient: {
    padding: 20,
    paddingTop: 16,
    minHeight: 400,
  },
  modalClose: {
    alignSelf: "flex-end",
    padding: 4,
  },
  modalBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,215,0,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  modalTitle: { color: "#fff" },
  modalSub: {
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
    marginBottom: 16,
  },
  modalStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  modalStat: {
    alignItems: "center",
    gap: 4,
  },
  rulesBox: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#FFD700",
    marginBottom: 10,
  },
  lbRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  participatedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(74,222,128,0.1)",
    padding: 14,
    borderRadius: 14,
    marginTop: 16,
  },
  modalFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 32,
    backgroundColor: "rgba(26,26,46,0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
});