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

// ─────────────────────────────────────────────
// 🎨 Theme — edit these to restyle the whole card/modal
// ─────────────────────────────────────────────
const GRADIENTS = {
  /** Main card & modal background */
  // card: ["#42275a",  "#734b6d"],
  card: ["#232526",  "#414345"],
  /** Reversed for variety if needed */
  cardReversed: ["#414345", "#232526"],
  // cardReversed: ["#FF5F6D", "#C0392B", "#7B0000"],
  /** Warm sunset accent for highlights */
  accent: ["#232526",  "#414345"],
  // accent: ["#FF5F6D", "#FFC371"],
};

/** Single accent color used for badges, dots, text highlights */
const ACCENT = "#FFC371";
/** Dimmed accent for secondary text */
const ACCENT_DIM = "rgba(255,195,113,0.55)";
/** Card glow tint */
const GLOW_COLOR = "rgba(255,195,113,0.10)";

// ─────────────────────────────────────────────

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
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

// ─────────────────────────────────────────────
// Compact inline countdown: 00d 00h 00m 00s
// ─────────────────────────────────────────────
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
          {i < 3 && <AppText style={styles.inlineSep}>:</AppText>}
        </View>
      ))}
    </View>
  );
};

// ─────────────────────────────────────────────
// Live status chip — replaces countdown when LIVE
// ─────────────────────────────────────────────
const LiveStatusChip = ({ hasParticipated }) =>
  hasParticipated ? (
    <View style={styles.liveChipDone}>
      <Ionicons name="checkmark-circle" size={14} color="#4ADE80" />
      <AppText fontWeight="bold" size="xxsmall" style={{ color: "#4ADE80", marginLeft: 4 }}>
        Completed
      </AppText>
    </View>
  ) : (
    <View style={styles.liveChipPlay}>
      <Ionicons name="play-circle" size={14} color="#fff" />
      <AppText fontWeight="bold" size="xxsmall" style={{ color: "#fff", marginLeft: 4 }}>
        Tap to Play
      </AppText>
    </View>
  );

// ─────────────────────────────────────────────
// Compact prize pill
// ─────────────────────────────────────────────
const PrizePill = ({ emoji, reward }) => (
  <View style={styles.prizePill}>
    <AppText size="small" style={styles.pillEmoji}>{emoji}</AppText>
    <AppText fontWeight="bold" size="xxsmall" style={{ color: ACCENT }}>
      {formatPoints(reward)}
    </AppText>
  </View>
);

// ─────────────────────────────────────────────
// Full prize row for modal
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Competition Details Modal
// ─────────────────────────────────────────────
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

  const renderFooter = () => {
    if (!isSubscribed) {
      return (
        <>
          <AppText size="small" style={{ color: "rgba(255,255,255,0.8)", textAlign: "center", marginBottom: 10 }}>
            Subscribe to participate in the monthly quiz championship
          </AppText>
          <AppButton title="Subscribe Now" onPress={() => { onClose(); onParticipate?.("subscribe"); }} />
        </>
      );
    }
    if (comp?.isLive && !comp?.hasParticipated) {
      return <AppButton title="Start Competition" onPress={() => { onClose(); onParticipate?.("start"); }} />;
    }
    if (comp?.isUpcoming) {
      return <AppButton title="Opens Soon" type="white" onPress={onClose} />;
    }
    return <AppButton title="Close" type="white" onPress={onClose} />;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        {/* Sheet fills up to 92% of screen height using flex, not maxHeight alone */}
        <View style={styles.modalSheet}>
          <LinearGradient
            colors={GRADIENTS.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalGradient}
          >
            {/* Close button */}
            <Pressable style={styles.modalClose} onPress={onClose}>
              <Ionicons name="close" size={26} color="#fff" />
            </Pressable>

            {/* Scrollable content — flex: 1 ensures it never bleeds under footer */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalBadge}>
                <AppText fontWeight="bold" size="xxsmall" style={{ color: ACCENT }}>
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
                      <Ionicons name="people" size={20} color={ACCENT} />
                      <AppText fontWeight="bold" style={{ color: "#fff" }}>
                        {comp?.participantsCount ?? 0}
                      </AppText>
                      <AppText size="xxsmall" style={{ color: "rgba(255,255,255,0.5)" }}>Participants</AppText>
                    </View>
                    <View style={styles.modalStat}>
                      <Ionicons name="help-circle" size={20} color={ACCENT} />
                      <AppText fontWeight="bold" style={{ color: "#fff" }}>
                        {comp?.totalQuestions ?? 0}
                      </AppText>
                      <AppText size="xxsmall" style={{ color: "rgba(255,255,255,0.5)" }}>Questions</AppText>
                    </View>
                    <View style={styles.modalStat}>
                      <Ionicons name="time" size={20} color={ACCENT} />
                      <AppText fontWeight="bold" style={{ color: "#fff" }}>
                        {formatDuration(comp?.approxDuration)}
                      </AppText>
                      <AppText size="xxsmall" style={{ color: "rgba(255,255,255,0.5)" }}>Duration</AppText>
                    </View>
                  </View>

                  {comp?.rules ? (
                    <View style={styles.rulesBox}>
                      <AppText fontWeight="bold" size="small" style={{ color: ACCENT }}>Rules</AppText>
                      <AppText size="small" style={{ color: "rgba(255,255,255,0.85)" }}>{comp.rules}</AppText>
                    </View>
                  ) : null}

                  <AppText fontWeight="bold" size="medium" style={styles.sectionTitle}>Prize Pool</AppText>
                  <PrizeRow place="1st" title={comp?.prizes?.first?.title || "Champion"} reward={comp?.prizes?.first?.reward} medal="#FFD700" />
                  <PrizeRow place="2nd" title={comp?.prizes?.second?.title || "Runner-up"} reward={comp?.prizes?.second?.reward} medal="#C0C0C0" />
                  <PrizeRow place="3rd" title={comp?.prizes?.third?.title || "Third Place"} reward={comp?.prizes?.third?.reward} medal="#CD7F32" />

                  {(comp?.lastWinners?.length > 0 || comp?.finalRankings?.length > 0) && (
                    <>
                      <AppText fontWeight="bold" size="medium" style={{...styles.sectionTitle,  marginTop: 16 }}>
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
                      <AppText fontWeight="bold" size="medium" style={{...styles.sectionTitle,  marginTop: 16 }}>
                        Live Leaderboard
                      </AppText>
                      {comp.leaderboard.slice(0, 5).map((p, i) => (
                        <View key={p.user?._id || i} style={styles.lbRow}>
                          <AppText fontWeight="bold" style={{ color: ACCENT, width: 28 }}>#{p.rank}</AppText>
                          <Avatar size={32} source={p.user?.avatar?.image} />
                          <AppText style={{ flex: 1, color: "#fff", marginLeft: 10 }} fontWeight="semibold">
                            @{p.user?.username}
                          </AppText>
                          <AppText fontWeight="bold" style={{ color: ACCENT }}>
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
                </>
              )}
            </ScrollView>

            {/* Footer sits BELOW the ScrollView — no absolute positioning */}
            <View style={styles.modalFooter}>
              {renderFooter()}
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// Main Card
// ─────────────────────────────────────────────
const MonthlyQuizCard = ({ data, isLoading, refetch }) => {
  const user = useSelector(selectUser);
  const router = useRouter();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const comp = data?.data;
  const isSubscribed = user?.subscription?.isActive;

  const countdownTarget = useMemo(() => {
    if (!comp) return null;
    if (comp.isLive) return comp.endTime;
    if (comp.isUpcoming) return comp.startTime;
    return null;
  }, [comp]);

  // Only run countdown for upcoming; for live we show the status chip instead
  const countdown = useCountdown(
    comp?.isUpcoming ? countdownTarget : null,
    Boolean(comp?.isUpcoming && countdownTarget),
  );

  const subjectNames = useMemo(
    () =>
      comp?.subjects
        ?.map((s) => s.subject?.name)
        .filter(Boolean)
        .map((name) =>
          name
            .toLowerCase()
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
        ) || [],
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

  const statusColor = comp.isLive ? colors.green : comp.isUpcoming ? colors.warning : colors.lighter;
  const statusText = comp.isLive ? "LIVE" : comp.isUpcoming ? "UPCOMING" : "ENDED";

  // What to show in the middle-left slot
  const renderMiddleLeft = () => {
    if (comp.isLive) {
      return <LiveStatusChip hasParticipated={comp.hasParticipated} />;
    }
    if (countdown && !countdown.done) {
      return <InlineCountdown countdown={countdown} />;
    }
    return (
      <View style={styles.participantsChip}>
        <Ionicons name="people-outline" size={13} color="rgba(255,255,255,0.6)" />
        <AppText size="xxsmall" style={{ color: "rgba(255,255,255,0.6)", marginLeft: 4 }}>
          {comp.totalParticipants || 0} joined
        </AppText>
      </View>
    );
  };

  return (
    <>
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.wrapper}>
        <Pressable onPress={() => setDetailsOpen(true)}>
          <LinearGradient
            colors={GRADIENTS.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.card}
          >
            <View style={styles.cardGlow} />

            {/* Row 1: Title + status badge */}
            <View style={styles.cardHeader}>
              <View style={styles.trophyIcon}>
                <Ionicons name="trophy" size={18} color={ACCENT} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText fontWeight="black" size="medium" style={styles.cardTitle} numberOfLines={1}>
                  {comp.title}
                </AppText>
                <AppText size="xxsmall" style={styles.cardMonth}>
                  {MONTHS[comp.month - 1]} {comp.year}
                  {" · "}
                  <AppText size="xxsmall" style={{ color: "rgba(255,255,255,0.75)" }}>
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

            {/* Row 2: Middle-left slot + prize pills */}
            <View style={styles.middleRow}>
              {renderMiddleLeft()}
              <View style={styles.prizePillsRow}>
                <PrizePill emoji="🥇" reward={comp.prizes?.first?.reward} />
                <PrizePill emoji="🥈" reward={comp.prizes?.second?.reward} />
                <PrizePill emoji="🥉" reward={comp.prizes?.third?.reward} />
              </View>
            </View>

            {/* Row 3: Subject tags + chevron */}
            <View style={styles.cardFooter}>
              <View style={styles.tagsRow}>
                {subjectNames.slice(0, 2).map((name) => (
                  <View key={name} style={styles.tag}>
                    <AppText size="xxsmall" fontWeight="bold" style={{ color: "#FFE4CC" }}>
                      {name}
                    </AppText>
                  </View>
                ))}
                {subjectNames.length > 2 && (
                  <View style={styles.tag}>
                    <AppText size="xxsmall" style={{ color: "#FFE4CC" }}>
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
    shadowColor: "#7B0000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
  },
  cardGlow: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: GLOW_COLOR,
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
    backgroundColor: "rgba(255,195,113,0.18)",
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

  // Middle row
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  inlineCountdown: {
    flexDirection: "row",
    alignItems: "center",
  },
  inlineUnit: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 1,
  },
  inlineValue: {
    color: ACCENT,
    fontSize: 16,
    lineHeight: 20,
  },
  inlineLabel: {
    color: ACCENT_DIM,
    fontSize: 10,
  },
  inlineSep: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 14,
    marginHorizontal: 2,
    lineHeight: 20,
  },
  participantsChip: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Live status chips
  liveChipPlay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,95,109,0.35)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,95,109,0.5)",
  },
  liveChipDone: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(74,222,128,0.15)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
  },

  prizePillsRow: {
    flexDirection: "row",
    gap: 5,
  },
  prizePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,195,113,0.12)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,195,113,0.25)",
  },
  pillEmoji: {
    fontSize: 16,
  },

  // Footer
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    flex: 1,
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },

  // ── Modal styles ──────────────────────────────────────────────
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
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  // flex container so scroll + footer stack properly
  modalSheet: {
    maxHeight: "92%",
    flex: 1,                    // must be set so children can measure height
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  modalGradient: {
    flex: 1,                    // fills modalSheet; ScrollView + footer stack inside
    flexDirection: "column",
    paddingTop: 16,
  },
  modalClose: {
    alignSelf: "flex-end",
    padding: 4,
    paddingHorizontal: 20,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,         // breathing room above footer
  },
  modalBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,195,113,0.18)",
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
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  modalStat: {
    alignItems: "center",
    gap: 4,
  },
  rulesBox: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    color: ACCENT,
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
    backgroundColor: "rgba(74,222,128,0.12)",
    padding: 14,
    borderRadius: 14,
    marginTop: 16,
  },
  // Footer is now a normal flex child — no absolute positioning
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: GRADIENTS.card[1],
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
});