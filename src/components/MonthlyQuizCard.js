/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
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

// const { width } = Dimensions.get("screen");

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const formatDuration = (seconds) => {
  if (!seconds) return "~0 min";
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `~${mins} min`;
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

const CountdownUnit = ({ value, label }) => (
  <View style={styles.countdownUnit}>
    <AppText fontWeight="black" size="large" style={styles.countdownValue}>
      {String(value).padStart(2, "0")}
    </AppText>
    <AppText size="xxsmall" style={styles.countdownLabel}>
      {label}
    </AppText>
  </View>
);

const PrizeRow = ({ place, title, reward, medal }) => (
  <View style={styles.prizeRow}>
    <View style={[styles.medalBadge, { backgroundColor: medal }]}>
      <AppText fontWeight="black" size="xsmall" style={{ color: "#1a1a2e" }}>
        {place}
      </AppText>
    </View>
    <View style={{}}>
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

  const statusLabel = comp?.isLive
    ? "LIVE NOW"
    : comp?.isUpcoming
    ? "UPCOMING"
    : "ENDED";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <LinearGradient
            colors={["#1a1a2e", "#16213e", "#0f3460"]}
            style={styles.modalGradient}
          >
            <Pressable style={styles.modalClose} onPress={onClose}>
              <Ionicons name="close" size={26} color="#fff" />
            </Pressable>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalBadge}>
                <AppText
                  fontWeight="bold"
                  size="xxsmall"
                  style={{ color: "#FFD700" }}
                >
                  {statusLabel}
                </AppText>
              </View>

              <AppText
                fontWeight="black"
                size="xxlarge"
                style={styles.modalTitle}
              >
                {comp?.title || "Monthly Quiz"}
              </AppText>

              <AppText size="small" style={styles.modalSub}>
                {MONTHS[(comp?.month || 1) - 1]} {comp?.year} · First Saturday ·
                24 hours
              </AppText>

              {isLoading ? (
                <AppText style={{ color: "#fff", marginTop: 20 }}>
                  Loading...
                </AppText>
              ) : (
                <>
                  <View style={styles.modalStatsRow}>
                    <View style={styles.modalStat}>
                      <Ionicons name="people" size={20} color="#FFD700" />
                      <AppText fontWeight="bold" style={{ color: "#fff" }}>
                        {comp?.participantsCount ?? 0}
                      </AppText>
                      <AppText
                        size="xxsmall"
                        style={{ color: "rgba(255,255,255,0.6)" }}
                      >
                        Participants
                      </AppText>
                    </View>
                    <View style={styles.modalStat}>
                      <Ionicons name="help-circle" size={20} color="#FFD700" />
                      <AppText fontWeight="bold" style={{ color: "#fff" }}>
                        {comp?.totalQuestions ?? 0}
                      </AppText>
                      <AppText
                        size="xxsmall"
                        style={{ color: "rgba(255,255,255,0.6)" }}
                      >
                        Questions
                      </AppText>
                    </View>
                    <View style={styles.modalStat}>
                      <Ionicons name="time" size={20} color="#FFD700" />
                      <AppText fontWeight="bold" style={{ color: "#fff" }}>
                        {formatDuration(comp?.approxDuration)}
                      </AppText>
                      <AppText
                        size="xxsmall"
                        style={{ color: "rgba(255,255,255,0.6)" }}
                      >
                        Duration
                      </AppText>
                    </View>
                  </View>

                  {comp?.rules ? (
                    <View style={styles.rulesBox}>
                      <AppText
                        fontWeight="bold"
                        size="small"
                        style={{ color: "#FFD700" }}
                      >
                        Rules
                      </AppText>
                      <AppText
                        size="small"
                        style={{ color: "rgba(255,255,255,0.85)" }}
                      >
                        {comp.rules}
                      </AppText>
                    </View>
                  ) : null}

                  <AppText
                    fontWeight="bold"
                    size="medium"
                    style={styles.sectionTitle}
                  >
                    Prize Pool
                  </AppText>
                  <PrizeRow
                    place="1st"
                    title={comp?.prizes?.first?.title || "Champion"}
                    reward={comp?.prizes?.first?.reward}
                    medal="#FFD700"
                  />
                  <PrizeRow
                    place="2nd"
                    title={comp?.prizes?.second?.title || "Runner-up"}
                    reward={comp?.prizes?.second?.reward}
                    medal="#C0C0C0"
                  />
                  <PrizeRow
                    place="3rd"
                    title={comp?.prizes?.third?.title || "Third Place"}
                    reward={comp?.prizes?.third?.reward}
                    medal="#CD7F32"
                  />

                  {(comp?.lastWinners?.length > 0 ||
                    comp?.finalRankings?.length > 0) && (
                    <>
                      <AppText
                        fontWeight="bold"
                        size="medium"
                        style={[styles.sectionTitle, { marginTop: 16 }]}
                      >
                        Last Winners
                      </AppText>
                      <LeaderboardWinners
                        isPro={false}
                        data={(comp.lastWinners || comp.finalRankings || [])
                          .slice(0, 3)
                          .map((w) => ({
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
                      <AppText
                        fontWeight="bold"
                        size="medium"
                        style={[styles.sectionTitle, { marginTop: 16 }]}
                      >
                        Live Leaderboard
                      </AppText>
                      {comp.leaderboard.slice(0, 5).map((p, i) => (
                        <View key={p.user?._id || i} style={styles.lbRow}>
                          <AppText
                            fontWeight="bold"
                            style={{ color: "#FFD700", width: 28 }}
                          >
                            #{p.rank}
                          </AppText>
                          <Avatar size={32} source={p.user?.avatar?.image} />
                          <AppText
                            style={{ flex: 1, color: "#fff", marginLeft: 10 }}
                            fontWeight="semibold"
                          >
                            @{p.user?.username}
                          </AppText>
                          <AppText
                            fontWeight="bold"
                            style={{ color: "#FFD700" }}
                          >
                            {formatPoints(p.score)}
                          </AppText>
                        </View>
                      ))}
                    </>
                  )}

                  {comp?.hasParticipated && (
                    <View style={styles.participatedBanner}>
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color="#4ADE80"
                      />
                      <AppText
                        style={{ color: "#4ADE80", marginLeft: 8 }}
                        fontWeight="bold"
                      >
                        You completed this competition
                        {comp.myRank ? ` · Rank #${comp.myRank}` : ""}
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
                  <AppText
                    size="small"
                    style={{
                      color: "rgba(255,255,255,0.8)",
                      textAlign: "center",
                      marginBottom: 10,
                    }}
                  >
                    Subscribe to participate in the monthly quiz championship
                  </AppText>
                  <AppButton
                    title="Subscribe Now"
                    onPress={() => {
                      onClose();
                      onParticipate?.("subscribe");
                    }}
                  />
                </>
              ) : comp?.isLive && !comp?.hasParticipated ? (
                <AppButton
                  title="Start Competition"
                  onPress={() => {
                    onClose();
                    onParticipate?.("start");
                  }}
                />
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

  const countdown = useCountdown(
    countdownTarget,
    Boolean(comp && countdownTarget),
  );

  const subjectNames = useMemo(
    () => comp?.subjects?.map((s) => s.subject?.name).filter(Boolean) || [],
    [comp],
  );

  const topicNames = useMemo(() => {
    const names = [];
    comp?.subjects?.forEach((s) => {
      s.topics?.forEach((t) => {
        if (t?.name) names.push(t.name);
      });
    });
    return names;
  }, [comp]);

  const handleParticipate = (action) => {
    if (action === "subscribe") {
      router.push("/profile/subscription");
      return;
    }
    if (action === "start" && comp?._id) {
      router.push({
        pathname: "/main/competition",
        params: { competitionId: comp._id },
      });
    }
  };

  const handleCardPress = () => {
    if (!comp) return;
    setDetailsOpen(true);
  };

  if (isLoading || !comp) return null;

  const statusColor = comp.isLive
    ? "#4ADE80"
    : comp.isUpcoming
    ? "#FFD700"
    : "#94A3B8";
  const statusText = comp.isLive
    ? "LIVE"
    : comp.isUpcoming
    ? "STARTS IN"
    : "ENDED";

  return (
    <>
      <Animated.View
        entering={FadeInDown.delay(200).springify()}
        style={styles.wrapper}
      >
        <Pressable onPress={handleCardPress}>
          <LinearGradient
            colors={["#6B21A8", "#4C1D95", "#1e1b4b"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.cardGlow} />

            <View style={styles.cardHeader}>
              <View style={styles.trophyIcon}>
                <Ionicons name="trophy" size={22} color="#FFD700" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText
                  fontWeight="black"
                  size="large"
                  style={styles.cardTitle}
                >
                  {comp.title}
                </AppText>
                <AppText size="xsmall" style={styles.cardMonth}>
                  {MONTHS[comp.month - 1]} {comp.year} Championship
                </AppText>
              </View>
              <View
                style={[
                  styles.liveBadge,
                  { backgroundColor: statusColor + "33" },
                ]}
              >
                <View
                  style={[styles.liveDot, { backgroundColor: statusColor }]}
                />
                <AppText
                  fontWeight="bold"
                  size="xxsmall"
                  style={{ color: statusColor }}
                >
                  {statusText}
                </AppText>
              </View>
            </View>

            {countdown && !countdown.done && countdownTarget && (
              <View style={styles.countdownRow}>
                <CountdownUnit value={countdown.days} label="Days" />
                <AppText style={styles.countdownSep}>:</AppText>
                <CountdownUnit value={countdown.hours} label="Hrs" />
                <AppText style={styles.countdownSep}>:</AppText>
                <CountdownUnit value={countdown.minutes} label="Min" />
                <AppText style={styles.countdownSep}>:</AppText>
                <CountdownUnit value={countdown.seconds} label="Sec" />
              </View>
            )}

            <View style={styles.tagsRow}>
              {subjectNames.slice(0, 3).map((name) => (
                <View key={name} style={styles.tag}>
                  <AppText
                    size="xxsmall"
                    fontWeight="bold"
                    style={{ color: "#E9D5FF" }}
                  >
                    {name}
                  </AppText>
                </View>
              ))}
              {subjectNames.length > 3 && (
                <View style={styles.tag}>
                  <AppText size="xxsmall" style={{ color: "#E9D5FF" }}>
                    +{subjectNames.length - 3}
                  </AppText>
                </View>
              )}
            </View>

            {topicNames.length > 0 && (
              <AppText
                size="xxsmall"
                style={styles.topicsText}
                numberOfLines={1}
              >
                Topics: {topicNames.slice(0, 4).join(" · ")}
                {topicNames.length > 4 ? "…" : ""}
              </AppText>
            )}

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color="#C4B5FD" />
                <AppText size="xxsmall" style={styles.metaText}>
                  {formatDuration(comp.approxDuration)}
                </AppText>
              </View>
              <View style={styles.metaItem}>
                <Ionicons
                  name="help-circle-outline"
                  size={14}
                  color="#C4B5FD"
                />
                <AppText size="xxsmall" style={styles.metaText}>
                  {comp.totalQuestions} Qs
                </AppText>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={14} color="#C4B5FD" />
                <AppText size="xxsmall" style={styles.metaText}>
                  {comp.totalParticipants || 0}
                </AppText>
              </View>
            </View>

            <View style={styles.prizesPreview}>
              <PrizeRow
                place="🥇"
                title={comp.prizes?.first?.title || "1st"}
                reward={comp.prizes?.first?.reward}
                medal="#FFD700"
              />
              <PrizeRow
                place="🥈"
                title={comp.prizes?.second?.title || "2nd"}
                reward={comp.prizes?.second?.reward}
                medal="#C0C0C0"
              />
              <PrizeRow
                place="🥉"
                title={comp.prizes?.third?.title || "3rd"}
                reward={comp.prizes?.third?.reward}
                medal="#CD7F32"
              />
            </View>

            <View style={styles.cardFooter}>
              <AppText size="xsmall" style={{ color: "rgba(255,255,255,0.6)" }}>
                Tap for details & rules
              </AppText>
              <Ionicons
                name="chevron-forward"
                size={18}
                color="rgba(255,255,255,0.5)"
              />
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      <CompetitionDetailsModal
        visible={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          refetch();
        }}
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
    borderRadius: 22,
    padding: 18,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#6B21A8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  cardGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,215,0,0.12)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trophyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,215,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: "#fff",
  },
  cardMonth: {
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  countdownRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 4,
  },
  countdownUnit: {
    alignItems: "center",
    minWidth: 44,
  },
  countdownValue: {
    color: "#FFD700",
    fontSize: 22,
  },
  countdownLabel: {
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  countdownSep: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 20,
    marginBottom: 14,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  topicsText: {
    color: "rgba(255,255,255,0.55)",
    marginTop: 8,
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    color: "#C4B5FD",
  },
  prizesPreview: {
    // flex: 1,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 6,
  },
  prizeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  medalBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
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
  modalTitle: {
    color: "#fff",
  },
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
