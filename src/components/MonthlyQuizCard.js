/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSelector } from "react-redux";

import AppText from "./AppText";
import AppButton from "./AppButton";
import Avatar from "./Avatar";
import colors from "../helpers/colors";
import { selectUser } from "../context/usersSlice";
import {
  useFetchActiveCompetitionQuery,
  useFetchCompetitionDetailsQuery,
  usePublishResultsMutation,
} from "../context/competitionSlice";
import { LeaderboardWinners } from "../screens/LeaderboardScreen";
import { formatPoints } from "../helpers/helperFunctions";
import LottieAnimator from "./LottieAnimator";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PopMessage from "./PopMessage";

// ─────────────────────────────────────────────
// 🎨 Theme
// ─────────────────────────────────────────────
const GRADIENTS = {
  card: ["#232526", "#414345"],
  cardReversed: ["#414345", "#232526"],
  accent: ["#232526", "#414345"],
};

const ACCENT = "#FFC371";
const ACCENT_DIM = "rgba(255,195,113,0.55)";
const GLOW_COLOR = "rgba(255,195,113,0.10)";

// ─────────────────────────────────────────────

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatDuration = (seconds) => {
  if (!seconds) return "~0 min";
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `~${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
};

/**
 * Format a prize's reward for display.
 * points → "500 GT"  |  cash → "₦5,000" (or "5,000 NGN" fallback)
 */
const formatPrizeReward = (prize) => {
  if (!prize) return "—";
  if (prize.type === "cash") {
    const symbol = currencySymbol(prize.currency);
    return `${symbol}${Number(prize.reward || 0).toLocaleString()}`;
  }
  return formatPoints(prize.reward);
};

const currencySymbol = (code) => {
  const map = { NGN: "₦", USD: "$", GBP: "£", EUR: "€", GHS: "₵", KES: "KSh " };
  return map[code] || (code ? `${code} ` : "");
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

// ─── Inline countdown ─────────────────────────────────────────────────────────
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
          <AppText size="xxsmall" style={styles.inlineLabel}>
            {l}
          </AppText>
          {i < 3 && <AppText style={styles.inlineSep}>:</AppText>}
        </View>
      ))}
    </View>
  );
};

// ─── Live status chip ─────────────────────────────────────────────────────────
const LiveStatusChip = ({ hasParticipated }) =>
  hasParticipated ? (
    <View style={styles.liveChipDone}>
      <Ionicons name="checkmark-circle" size={14} color="#4ADE80" />
      <AppText
        fontWeight="bold"
        size="xxsmall"
        style={{ color: "#4ADE80", marginLeft: 4 }}
      >
        Completed
      </AppText>
    </View>
  ) : (
    <View style={styles.liveChipPlay}>
      <Ionicons name="play-circle" size={14} color="#fff" />
      <AppText
        fontWeight="bold"
        size="xxsmall"
        style={{ color: "#fff", marginLeft: 4 }}
      >
        Tap to Play
      </AppText>
    </View>
  );

// ─── Prize pill (card) ────────────────────────────────────────────────────────
const PrizePill = ({ emoji, prize }) => (
  <View style={styles.prizePill}>
    <AppText size="small" style={styles.pillEmoji}>
      {emoji}
    </AppText>
    <AppText fontWeight="bold" size="xxsmall" style={{ color: ACCENT }}>
      {formatPrizeReward(prize)}
    </AppText>
    {prize?.type === "cash" && (
      <View style={styles.cashDot}>
        <AppText size="xxsmall" style={{ color: "#4ADE80", fontSize: 7 }}>
          CASH
        </AppText>
      </View>
    )}
  </View>
);

// ─── Prize row (modal) ────────────────────────────────────────────────────────
const PrizeRow = ({ place, prize, medal }) => {
  const isCash = prize?.type === "cash";
  return (
    <View style={styles.prizeRow}>
      <View style={[styles.medalBadge, { backgroundColor: medal }]}>
        <AppText fontWeight="black" size="xsmall" style={{ color: "#1a1a2e" }}>
          {place}
        </AppText>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <AppText fontWeight="bold" size="small" style={{ color: "#fff" }}>
            {prize?.title || "—"}
          </AppText>
        </View>
        <AppText size="xsmall" style={{ color: "rgba(255,255,255,0.7)" }}>
          {formatPrizeReward(prize)}
          {isCash && prize?.description ? ` · ${prize.description}` : ""}
        </AppText>
      </View>
    </View>
  );
};

// ─── Animated participant count ───────────────────────────────────────────────
const AnimatedParticipantCount = ({ count }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900 }),
        withTiming(1, { duration: 900 }),
      ),
      -1, // infinite
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.participantCountBox, animatedStyle]}>
      <Ionicons name="people" size={22} color={ACCENT} />
      <AppText
        fontWeight="black"
        size="xxlarge"
        style={styles.participantCountNum}
      >
        {(count || 0).toLocaleString()}
      </AppText>
      <AppText size="xsmall" style={styles.participantCountLabel}>
        {count === 1 ? "participant" : "participants"}
      </AppText>
    </Animated.View>
  );
};

// ─── Results pending state (shown in modal when ended but not published) ──────
const ResultsPendingPanel = ({ participantsCount, hasParticipated }) => (
  <View style={styles.pendingPanel}>
    <LottieAnimator
      name={hasParticipated ? "student_jumping" : "waiting"}
      visible
      absolute={false}
      style={styles.pendingLottie}
    />

    {hasParticipated ? (
      <>
        <AppText fontWeight="black" size="large" style={styles.pendingTitle}>
          Results Coming Soon!
        </AppText>
        <AppText size="small" style={styles.pendingSubtitle}>
          You crushed it! Sit back, relax, and wait while our admins crunch the
          numbers. We'll release the final scores shortly.
        </AppText>
      </>
    ) : (
      <>
        <AppText fontWeight="black" size="large" style={styles.pendingTitle}>
          Still Time to Compete!
        </AppText>
        <AppText size="small" style={styles.pendingSubtitle}>
          Results haven't dropped yet — which means you can still jump in and
          secure your spot on the leaderboard. Don't let your competition get
          ahead while you wait.
        </AppText>
      </>
    )}

    <View style={styles.pendingDivider} />

    <AppText size="xsmall" style={styles.pendingParticipantsLabel}>
      TOTAL PARTICIPANTS
    </AppText>
    <AnimatedParticipantCount count={participantsCount} />

    <View style={styles.pendingChipsRow}>
      {hasParticipated ? (
        <>
          <View style={styles.pendingChip}>
            <Ionicons name="hourglass" size={14} color={ACCENT} />
            <AppText
              size="xxsmall"
              fontWeight="bold"
              style={{ color: ACCENT, marginLeft: 5 }}
            >
              Scores being verified
            </AppText>
          </View>
          <View style={styles.pendingChip}>
            <Ionicons name="trophy" size={14} color={ACCENT} />
            <AppText
              size="xxsmall"
              fontWeight="bold"
              style={{ color: ACCENT, marginLeft: 5 }}
            >
              Winners announced soon
            </AppText>
          </View>
        </>
      ) : (
        <>
          <View style={styles.pendingChip}>
            <Ionicons name="flash" size={14} color={ACCENT} />
            <AppText
              size="xxsmall"
              fontWeight="bold"
              style={{ color: ACCENT, marginLeft: 5 }}
            >
              Window still open
            </AppText>
          </View>
          <View style={styles.pendingChip}>
            <Ionicons name="medal" size={14} color={ACCENT} />
            <AppText
              size="xxsmall"
              fontWeight="bold"
              style={{ color: ACCENT, marginLeft: 5 }}
            >
              Prizes up for grabs
            </AppText>
          </View>
        </>
      )}
    </View>
  </View>
);

// ─── Competition Details Modal ────────────────────────────────────────────────
const CompetitionDetailsModal = ({
  visible,
  onClose,
  competitionId,
  isSubscribed,
  onParticipate,
}) => {
  const user = useSelector(selectUser);
  const isManager = user?.accountType === "manager";

  const [popper, setPopper] = useState({ vis: false });

  const {
    data,
    isLoading,
    refetch: refetchList,
  } = useFetchCompetitionDetailsQuery(competitionId, {
    skip: !visible || !competitionId,
  });
  const [publishResults, { isLoading: publishingResults }] =
    usePublishResultsMutation();
  const comp = data?.data;
  const insets = useSafeAreaInsets();

  const statusLabel = comp?.isLive
    ? "LIVE NOW"
    : comp?.isUpcoming
      ? "UPCOMING"
      : comp?.resultsPublished
        ? "RESULTS OUT"
        : "ENDED";

  // Ended but results not yet published — show pending panel (for participants)
  const showResultsPending = !isManager && !comp?.resultsPublished;

  const canPublishResults =
    (comp?.status === "finished" ||
      (comp?.status === "active" && new Date() >= new Date(comp?.endTime))) &&
    !comp?.resultsPublished;

  const onPublishResults = async () => {
    if (!canPublishResults) {
      return setPopper({
        vis: true,
        type: "failed",
        msg: "Cannot publish results yet, Tournament is still Live!",
      });
    }

    try {
      await publishResults(competitionId).unwrap();
      setPopper({
        vis: true,
        type: "success",
        msg: "Results published — participants can now view their scores!",
      });
      refetchList();
    } catch (err) {
      setPopper({
        vis: true,
        type: "failed",
        msg: err?.data?.message || "Failed to publish results",
      });
    }
  };

  const renderFooter = () => {
    if (isManager) {
      return (
        <>
          <AppButton
            title="Publish Results"
            type="accent"
            onPress={() => {
              onPublishResults?.();
            }}
          />
        </>
      );
    }
    if (!isSubscribed) {
      return (
        <>
          <AppText
            size="small"
            style={{
              color: "rgba(255,255,255,0.8)",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            Unlock access to the Monthly Quiz Tournament and stand a chance to
            earn prizes
          </AppText>
          <AppButton
            title="Subscribe Now"
            type="accent"
            onPress={() => {
              onClose();
              onParticipate?.("subscribe");
            }}
          />
        </>
      );
    }
    if (comp?.isLive && !comp?.hasParticipated) {
      return (
        <AppButton
          title="Start Competition"
          onPress={() => {
            onClose();
            onParticipate?.("start");
          }}
        />
      );
    }
    if (comp?.isUpcoming) {
      return <AppButton title="Opens Soon" type="white" onPress={onClose} />;
    }
    return <AppButton title="Close" type="white" onPress={onClose} />;
  };

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
            colors={GRADIENTS.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalGradient}
          >
            <Pressable style={styles.modalClose} onPress={onClose}>
              <Ionicons name="close" size={26} color="#fff" />
            </Pressable>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalBadge}>
                <AppText
                  fontWeight="bold"
                  size="xxsmall"
                  style={{ color: ACCENT }}
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
                <View
                  style={{
                    flex: 1,
                    minHeight: 300,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <LottieAnimator visible absolute={false} />
                </View>
              ) : (
                <>
                  {/* Stats row */}
                  <View style={styles.modalStatsRow}>
                    <View style={styles.modalStat}>
                      <Ionicons name="people" size={20} color={ACCENT} />
                      <AppText fontWeight="bold" style={{ color: "#fff" }}>
                        {comp?.participantsCount ??
                          comp?.totalParticipants ??
                          0}
                      </AppText>
                      <AppText
                        size="xxsmall"
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      >
                        Participants
                      </AppText>
                    </View>
                    <View style={styles.modalStat}>
                      <Ionicons name="help-circle" size={20} color={ACCENT} />
                      <AppText fontWeight="bold" style={{ color: "#fff" }}>
                        {comp?.totalQuestions ?? 0}
                      </AppText>
                      <AppText
                        size="xxsmall"
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      >
                        Questions
                      </AppText>
                    </View>
                    <View style={styles.modalStat}>
                      <Ionicons name="time" size={20} color={ACCENT} />
                      <AppText fontWeight="bold" style={{ color: "#fff" }}>
                        {formatDuration(comp?.approxDuration)}
                      </AppText>
                      <AppText
                        size="xxsmall"
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      >
                        Duration
                      </AppText>
                    </View>
                  </View>

                  {/* Rules */}
                  {comp?.rules ? (
                    <View style={styles.rulesBox}>
                      <AppText
                        fontWeight="bold"
                        size="small"
                        style={{ color: ACCENT }}
                      >
                        Rules
                      </AppText>
                      <AppText
                        size="small"
                        style={{
                          lineHeight: 20,
                          color: "rgba(255,255,255,0.85)",
                        }}
                      >
                        {comp.rules}
                      </AppText>
                    </View>
                  ) : null}

                  {/* Prize Pool */}
                  <AppText
                    fontWeight="bold"
                    size="medium"
                    style={styles.sectionTitle}
                  >
                    Prize Pool
                  </AppText>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <PrizeRow
                      place="1st"
                      prize={comp?.prizes?.first}
                      medal="#ffe869"
                    />
                    <PrizeRow
                      place="2nd"
                      prize={comp?.prizes?.second}
                      medal="#C0C0C0"
                    />
                    <PrizeRow
                      place="3rd"
                      prize={comp?.prizes?.third}
                      medal="#CD7F32"
                    />
                  </View>

                  {/* Results pending panel — replaces all score/ranking UI */}
                  {showResultsPending ? (
                    <ResultsPendingPanel
                      participantsCount={
                        comp?.participantsCount ?? comp?.totalParticipants ?? 0
                      }
                      hasParticipated={comp?.hasParticipated}
                    />
                  ) : (
                    <>
                      {/* Last winners */}
                      {(comp?.lastWinners?.length > 0 ||
                        comp?.finalRankings?.length > 0) && (
                        <>
                          <AppText
                            fontWeight="bold"
                            size="medium"
                            style={{ ...styles.sectionTitle, marginTop: 16 }}
                          >
                            {comp?.isEnded && comp?.resultsPublished
                              ? "Winners"
                              : "Last Winners"}
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

                      {/* Live leaderboard */}
                      {comp?.leaderboard?.length > 0 && comp?.isLive && (
                        <>
                          <AppText
                            fontWeight="bold"
                            size="medium"
                            style={{ ...styles.sectionTitle, marginTop: 16 }}
                          >
                            Live Leaderboard
                          </AppText>
                          {comp.leaderboard.slice(0, 5).map((p, i) => (
                            <View key={p.user?._id || i} style={styles.lbRow}>
                              <AppText
                                fontWeight="bold"
                                style={{ color: ACCENT, width: 28 }}
                                size="xlarge"
                              >
                                {p.rank}
                              </AppText>
                              <Avatar
                                size={32}
                                source={p.user?.avatar?.image}
                              />
                              <AppText
                                style={{
                                  flex: 1,
                                  color: "#fff",
                                  marginLeft: 10,
                                }}
                                fontWeight="semibold"
                              >
                                @{p.user?.username}
                              </AppText>
                              <AppText
                                fontWeight="bold"
                                style={{ color: ACCENT }}
                              >
                                {formatPoints(p.score)}
                              </AppText>
                            </View>
                          ))}
                        </>
                      )}

                      {/* My result banner (only shown after results published) */}
                      {comp?.hasParticipated && comp?.resultsPublished && (
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
                            You completed this
                            {comp.myRank ? ` · Position #${comp.myRank}` : ""}
                          </AppText>
                        </View>
                      )}

                      {/* Participated but results not published yet — safety fallback */}
                      {comp?.hasParticipated &&
                        !comp?.resultsPublished &&
                        !comp?.isLive && (
                          <View
                            style={[
                              styles.participatedBanner,
                              { backgroundColor: "rgba(255,195,113,0.12)" },
                            ]}
                          >
                            <Ionicons
                              name="checkmark-circle"
                              size={22}
                              color={ACCENT}
                            />
                            <AppText
                              style={{ color: ACCENT, marginLeft: 8 }}
                              fontWeight="bold"
                            >
                              You completed this — results coming soon
                            </AppText>
                          </View>
                        )}
                    </>
                  )}
                </>
              )}
            </ScrollView>

            <View
              style={[styles.modalFooter, { paddingBottom: insets.bottom }]}
            >
              {renderFooter()}
            </View>
          </LinearGradient>
          <PopMessage popData={popper} setPopData={setPopper} />
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Card ────────────────────────────────────────────────────────────────
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
            .join(" "),
        ) || [],
    [comp],
  );

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

  if (isLoading || !comp) return null;

  const statusColor = comp.isLive
    ? colors.green
    : comp.isUpcoming
      ? colors.warning
      : colors.lighter;

  const statusText = comp.isLive
    ? "LIVE"
    : comp.isUpcoming
      ? "UPCOMING"
      : comp.resultsPublished
        ? "RESULTS OUT"
        : "ENDED";

  const renderMiddleLeft = () => {
    if (comp.isLive) {
      return <LiveStatusChip hasParticipated={comp.hasParticipated} />;
    }
    if (countdown && !countdown.done) {
      return <InlineCountdown countdown={countdown} />;
    }
    return (
      <View style={styles.participantsChip}>
        <Ionicons
          name="people-outline"
          size={13}
          color="rgba(255,255,255,0.6)"
        />
        <AppText
          size="xxsmall"
          style={{ color: "rgba(255,255,255,0.6)", marginLeft: 4 }}
        >
          {comp.totalParticipants || 0} joined
        </AppText>
      </View>
    );
  };

  return (
    <>
      <Animated.View
        entering={FadeInDown.delay(200).springify()}
        style={styles.wrapper}
      >
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
                <AppText
                  fontWeight="black"
                  size="medium"
                  style={styles.cardTitle}
                  numberOfLines={1}
                >
                  {comp.title}
                </AppText>
                <AppText size="xxsmall" style={styles.cardMonth}>
                  {MONTHS[comp.month - 1]} {comp.year}
                  {" · "}
                  <AppText
                    size="xxsmall"
                    style={{ color: "rgba(255,255,255,0.75)" }}
                  >
                    {comp.totalQuestions}Q ·{" "}
                    {formatDuration(comp.approxDuration)}
                  </AppText>
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

            {/* Row 2: Middle-left + prize pills */}
            <View style={styles.middleRow}>
              {renderMiddleLeft()}
              <View style={styles.prizePillsRow}>
                <PrizePill emoji="🥇" prize={comp.prizes?.first} />
                <PrizePill emoji="🥈" prize={comp.prizes?.second} />
                <PrizePill emoji="🥉" prize={comp.prizes?.third} />
              </View>
            </View>

            {/* Row 3: Tags + chevron */}
            <View style={styles.cardFooter}>
              <View style={styles.tagsRow}>
                {subjectNames.slice(0, 2).map((name) => (
                  <View key={name} style={styles.tag}>
                    <AppText
                      size="xxsmall"
                      fontWeight="bold"
                      style={{ color: "#FFE4CC" }}
                    >
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
              <Ionicons
                name="chevron-forward"
                size={16}
                color="rgba(255,255,255,0.4)"
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
  wrapper: { marginHorizontal: 16, marginBottom: 15 },
  card: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: "hidden",
    boxShadow: `2px 8px 18px ${ACCENT}60`,
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
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  trophyIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,195,113,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: "#fff" },
  cardMonth: { color: "rgba(255,255,255,0.5)", marginTop: 1 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },

  // Middle row
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  inlineCountdown: { flexDirection: "row", alignItems: "center" },
  inlineUnit: { flexDirection: "row", alignItems: "baseline", gap: 1 },
  inlineValue: { color: ACCENT, fontSize: 16, lineHeight: 20 },
  inlineLabel: { color: ACCENT_DIM, fontSize: 10 },
  inlineSep: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 14,
    marginHorizontal: 2,
    lineHeight: 20,
  },
  participantsChip: { flexDirection: "row", alignItems: "center" },

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

  prizePillsRow: { flexDirection: "row", gap: 5 },
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
  pillEmoji: { fontSize: 16 },
  cashDot: {
    backgroundColor: "rgba(74,222,128,0.2)",
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
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
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, flex: 1 },
  tag: {
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "92%",
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  modalGradient: {
    flex: 1,
    flexDirection: "column",
    paddingTop: 16,
  },
  modalClose: { alignSelf: "flex-end", padding: 4, paddingHorizontal: 20 },
  modalScrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
  modalBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,195,113,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  modalTitle: { color: "#fff" },
  modalSub: { color: "rgba(255,255,255,0.6)", marginTop: 4, marginBottom: 16 },
  modalStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  modalStat: { alignItems: "center", gap: 4 },
  rulesBox: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: { color: ACCENT, marginBottom: 10 },
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
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: GRADIENTS.card[1],
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },

  // Prize rows (modal)
  prizeRow: {
    flex: 1,
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
  cashBadge: {
    backgroundColor: "rgba(74,222,128,0.15)",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
  },

  // Results pending panel
  pendingPanel: {
    alignItems: "center",
    paddingVertical: 20,
    marginTop: 16,
  },
  pendingLottie: {
    width: 160,
    height: 160,
  },
  pendingTitle: {
    color: "#fff",
    textAlign: "center",
    marginTop: 8,
  },
  pendingSubtitle: {
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  pendingDivider: {
    width: "60%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginVertical: 20,
  },
  pendingParticipantsLabel: {
    color: ACCENT_DIM,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  participantCountBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,195,113,0.10)",
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,195,113,0.22)",
    gap: 2,
  },
  participantCountNum: {
    color: ACCENT,
    fontSize: 42,
    lineHeight: 48,
  },
  participantCountLabel: {
    color: ACCENT_DIM,
    marginTop: 2,
  },
  pendingChipsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  pendingChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,195,113,0.10)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,195,113,0.22)",
  },
});
