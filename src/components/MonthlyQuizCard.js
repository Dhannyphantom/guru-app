/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
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
  useFetchCompetitionDetailsQuery,
  usePublishResultsMutation,
  useAwardPrizesMutation,
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
const SUCCESS = "#4ADE80";
const MEDAL_COLORS = { 1: "#ffe869", 2: "#C0C0C0", 3: "#CD7F32" };

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

/** Time a participant actually took (seconds → "3m 12s") */
const formatTimeTaken = (seconds) => {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const formatEndDate = (date) => {
  if (!date) return "";
  try {
    return new Date(date).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const currencySymbol = (code) => {
  const map = { NGN: "₦", USD: "$", GBP: "£", EUR: "€", GHS: "₵", KES: "KSh " };
  return map[code] || (code ? `${code} ` : "");
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
      <Ionicons name="checkmark-circle" size={14} color={SUCCESS} />
      <AppText
        fontWeight="bold"
        size="xxsmall"
        style={{ color: SUCCESS, marginLeft: 4 }}
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

// ─── Participant row (rankings list) ──────────────────────────────────────────
const ParticipantRow = ({ item, index, isMe }) => {
  const rank = item.rank ?? index + 1;
  const medal = MEDAL_COLORS[rank];
  const timeTaken = formatTimeTaken(item.duration);

  return (
    <View style={[styles.lbRow, isMe && styles.lbRowMe]}>
      <View
        style={[styles.rankPill, medal ? { backgroundColor: medal } : null]}
      >
        <AppText
          fontWeight="black"
          size="xsmall"
          style={{ color: medal ? "#1a1a2e" : ACCENT }}
        >
          {rank}
        </AppText>
      </View>
      <Avatar size={32} source={item.user?.avatar?.image} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <AppText
          style={{ color: "#fff" }}
          fontWeight="semibold"
          numberOfLines={1}
        >
          @{item.user?.username || "unknown"}
          {isMe ? " (you)" : ""}
        </AppText>
        {timeTaken ? (
          <AppText size="xxsmall" style={{ color: "rgba(255,255,255,0.5)" }}>
            {timeTaken}
          </AppText>
        ) : null}
      </View>
      <AppText fontWeight="bold" style={{ color: ACCENT }}>
        {formatPoints(item.score)}
      </AppText>
    </View>
  );
};

// ─── Manager: publish status banner (modal body) ──────────────────────────────
const ManagerStatusBanner = ({ comp }) => {
  if (!comp) return null;

  if (comp.resultsPublished) {
    return (
      <View
        style={[
          styles.managerBanner,
          {
            backgroundColor: "rgba(74,222,128,0.12)",
            borderColor: "rgba(74,222,128,0.3)",
          },
        ]}
      >
        <Ionicons name="checkmark-circle" size={20} color={SUCCESS} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <AppText fontWeight="bold" size="small" style={{ color: SUCCESS }}>
            Results published
          </AppText>
          <AppText size="xsmall" style={styles.bannerSub}>
            Participants can now see their scores and ranks. Points prizes are
            credited automatically and winners are notified; cash prizes need
            manual payout.
          </AppText>
        </View>
      </View>
    );
  }

  if (comp.canPublishResults) {
    return (
      <View style={styles.managerBanner}>
        <Ionicons name="megaphone" size={20} color={ACCENT} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <AppText fontWeight="bold" size="small" style={{ color: ACCENT }}>
            Ready to publish
          </AppText>
          <AppText size="xsmall" style={styles.bannerSub}>
            The tournament has ended. Publishing ranks everyone, credits points
            prizes to the top 3 and can't be undone.
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.managerBanner}>
      <Ionicons name="lock-closed" size={20} color={ACCENT_DIM} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <AppText fontWeight="bold" size="small" style={{ color: ACCENT }}>
          {comp.isUpcoming
            ? "Not started yet"
            : comp.isLive
              ? "Tournament is live"
              : "Not publishable yet"}
        </AppText>
        <AppText size="xsmall" style={styles.bannerSub}>
          {comp.isLive
            ? `Results can be published once it ends (${formatEndDate(comp.endTime)}).`
            : comp.isUpcoming
              ? "Results can be published after the tournament has run."
              : "This competition hasn't been published yet."}
        </AppText>
      </View>
    </View>
  );
};

// ─── Manager: prize settlement panel (after results are published) ────────────
// Shows what each winner got, whether it was credited / notified, and a retry
// button when something is outstanding. Cash prizes are always paid manually.
const PLACE_KEYS = ["first", "second", "third"];

const SettlementRow = ({ winner, prize }) => {
  const type = winner.prizeType;
  const isCash = type === "cash";
  const isPoints = type === "points";

  let statusText = "No prize configured";
  let statusColor = "rgba(255,255,255,0.5)";
  let icon = "remove-circle";

  if (isPoints && winner.prizeAwarded) {
    statusText = `+${formatPrizeReward(prize)} credited`;
    statusColor = SUCCESS;
    icon = "checkmark-circle";
  } else if (isPoints) {
    statusText = "Credit failed — tap retry";
    statusColor = "#FF8A80";
    icon = "alert-circle";
  } else if (isCash) {
    statusText = `${formatPrizeReward(prize)} · pay manually`;
    statusColor = ACCENT;
    icon = "cash";
  }

  return (
    <View style={styles.settleRow}>
      <View
        style={[
          styles.rankPill,
          MEDAL_COLORS[winner.rank]
            ? { backgroundColor: MEDAL_COLORS[winner.rank] }
            : null,
        ]}
      >
        <AppText fontWeight="black" size="xsmall" style={{ color: "#1a1a2e" }}>
          {winner.rank}
        </AppText>
      </View>
      <View style={{ flex: 1 }}>
        <AppText
          fontWeight="semibold"
          size="small"
          style={{ color: "#fff" }}
          numberOfLines={1}
        >
          @{winner.user?.username || "unknown"}
        </AppText>
        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}
        >
          <Ionicons name={icon} size={13} color={statusColor} />
          <AppText size="xxsmall" style={{ color: statusColor, marginLeft: 4 }}>
            {statusText}
          </AppText>
        </View>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Ionicons
          name={winner.notified ? "notifications" : "notifications-off"}
          size={16}
          color={winner.notified ? SUCCESS : "rgba(255,255,255,0.4)"}
        />
        <AppText
          size="xxsmall"
          style={{
            color: winner.notified ? SUCCESS : "rgba(255,255,255,0.4)",
            marginTop: 1,
          }}
        >
          {winner.notified ? "Push sent" : "Push not sent"}
        </AppText>
      </View>
    </View>
  );
};

const PrizeSettlementPanel = ({ comp, onRetry, retrying }) => {
  const winners = comp?.finalRankings || [];
  if (!comp?.resultsPublished || winners.length === 0) return null;
  const summary = comp.awardSummary || {};

  return (
    <View style={styles.settleBox}>
      <AppText
        fontWeight="bold"
        size="small"
        style={{ color: ACCENT, marginBottom: 6 }}
      >
        Prize settlement
      </AppText>
      <AppText
        size="xxsmall"
        style={{ color: "rgba(255,255,255,0.6)", marginBottom: 8 }}
      >
        Points prizes are credited automatically. Cash prizes are never
        auto-paid — settle those manually.
      </AppText>

      {winners.map((w) => (
        <SettlementRow
          key={w.rank}
          winner={w}
          prize={comp.prizes?.[PLACE_KEYS[w.rank - 1]]}
        />
      ))}

      {summary.needsRetry ? (
        <View style={{ marginTop: 12 }}>
          <AppButton
            title={retrying ? "Processing…" : "Retry awards & push"}
            type="accent"
            onPress={onRetry}
          />
        </View>
      ) : (
        <View style={styles.settleDone}>
          <Ionicons name="checkmark-done" size={16} color={SUCCESS} />
          <AppText
            size="xxsmall"
            fontWeight="bold"
            style={{ color: SUCCESS, marginLeft: 6 }}
          >
            All points prizes credited · all winners sent a push
          </AppText>
        </View>
      )}
    </View>
  );
};

// ─── My result card (rendered once results are published) ────────────────────
// Winners (rank 1-3) get a celebratory highlighted card that also surfaces
// whether their prize was auto-credited (points) or needs manual payout (cash).
// Everyone else gets a clean "your position" card.
const WINNER_STYLES = {
  1: {
    gradient: ["#FFE066", "#FFA500"],
    icon: "trophy",
    label: "🏆 You're the Champion!",
    textColor: "#3D2B00",
  },
  2: {
    gradient: ["#E8E8E8", "#B8B8B8"],
    icon: "medal",
    label: "🥈 Runner-up!",
    textColor: "#2B2B2B",
  },
  3: {
    gradient: ["#E3A15D", "#A05A2C"],
    icon: "ribbon",
    label: "🥉 Third Place!",
    textColor: "#fff",
  },
};

const MyResultCard = ({ myRank, myScore, totalParticipants, prizes }) => {
  if (!myRank) return null;

  const isWinner = myRank <= 3;

  if (isWinner) {
    const winnerStyle = WINNER_STYLES[myRank];
    const placeKey = myRank === 1 ? "first" : myRank === 2 ? "second" : "third";
    const prize = prizes?.[placeKey];

    return (
      <Animated.View
        entering={FadeInDown.springify()}
        style={styles.myResultWrapper}
      >
        <LinearGradient
          colors={winnerStyle.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.winnerCard}
        >
          <View style={styles.winnerIconCircle}>
            <Ionicons
              name={winnerStyle.icon}
              size={26}
              color={winnerStyle.textColor}
            />
          </View>
          <AppText
            fontWeight="black"
            size="medium"
            style={{ color: winnerStyle.textColor, textAlign: "center" }}
          >
            {winnerStyle.label}
          </AppText>
          <AppText
            size="small"
            style={{
              color: winnerStyle.textColor,
              opacity: 0.85,
              marginTop: 2,
              textAlign: "center",
            }}
          >
            Finished #{myRank} with {formatPoints(myScore)}
          </AppText>
          {prize && (
            <View style={styles.winnerPrizeBadge}>
              <AppText
                fontWeight="bold"
                size="xsmall"
                style={{ color: winnerStyle.textColor, textAlign: "center" }}
              >
                {prize.type === "cash"
                  ? `${formatPrizeReward(prize)} prize — payout arranged separately`
                  : `+${formatPrizeReward(prize)} credited to your account`}
              </AppText>
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      style={styles.myResultWrapper}
    >
      <View style={styles.rankCard}>
        <View style={styles.rankBadgeCircle}>
          <AppText fontWeight="black" size="medium" style={{ color: ACCENT }}>
            #{myRank}
          </AppText>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText fontWeight="bold" style={{ color: "#fff" }}>
            Your Position
          </AppText>
          <AppText size="xsmall" style={{ color: "rgba(255,255,255,0.6)" }}>
            {formatPoints(myScore)}
            {totalParticipants
              ? ` · out of ${totalParticipants} participants`
              : ""}
          </AppText>
        </View>
        <Ionicons name="stats-chart" size={20} color={ACCENT} />
      </View>
    </Animated.View>
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
  const myId = user?._id || user?.id;

  const [popper, setPopper] = useState({ vis: false });

  const {
    data,
    isLoading,
    refetch: refetchList,
  } = useFetchCompetitionDetailsQuery(competitionId, {
    skip: !visible || !competitionId,
    // Always pull fresh data when the modal opens so the publish state is
    // never stale (e.g. results published from another device).
    refetchOnMountOrArgChange: true,
  });
  const [publishResults, { isLoading: publishingResults }] =
    usePublishResultsMutation();
  const [awardPrizes, { isLoading: awardingPrizes }] = useAwardPrizesMutation();
  const comp = data?.data;
  const insets = useSafeAreaInsets();

  const statusLabel = comp?.isLive
    ? "LIVE NOW"
    : comp?.isUpcoming
      ? "UPCOMING"
      : comp?.resultsPublished
        ? "RESULTS PUBLISHED"
        : isManager
          ? "ENDED · AWAITING RESULTS"
          : "ENDED";

  // Participants see the "pending" panel until results are published.
  // Managers always see the rankings.
  const showResultsPending = !isManager && !comp?.resultsPublished;

  // Decided by the SERVER (server clock + status) so a wrong phone clock can
  // never block or wrongly allow publishing.
  const canPublishResults = Boolean(comp?.canPublishResults);

  const onRetryAwards = async () => {
    if (awardingPrizes) return;
    try {
      const res = await awardPrizes(competitionId).unwrap();
      setPopper({
        vis: true,
        type: res?.data?.needsRetry ? "failed" : "success",
        msg: res?.message || "Awards processed",
      });
      refetchList();
    } catch (err) {
      setPopper({
        vis: true,
        type: "failed",
        msg: err?.data?.message || "Failed to process awards",
      });
    }
  };

  const runPublish = async () => {
    try {
      const res = await publishResults(competitionId).unwrap();
      setPopper({
        vis: true,
        type: res?.data?.awardSummary?.needsRetry ? "failed" : "success",
        msg:
          res?.message ||
          "Results published — participants can now view their scores!",
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

  const onPublishResults = () => {
    if (publishingResults) return;

    if (comp?.resultsPublished) {
      return setPopper({
        vis: true,
        type: "failed",
        msg: "Results have already been published.",
      });
    }

    if (!canPublishResults) {
      const msg = comp?.isUpcoming
        ? "This tournament hasn't started yet."
        : comp?.isLive
          ? "Tournament is still live — you can publish once it ends."
          : "This competition hasn't been published yet.";
      return setPopper({ vis: true, type: "failed", msg });
    }

    Alert.alert(
      "Publish results?",
      "This ranks all participants, credits points prizes to the top 3 and notifies them (cash prizes are paid manually), and makes scores visible to everyone. It can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Publish", style: "default", onPress: runPublish },
      ],
    );
  };

  const renderFooter = () => {
    if (isManager) {
      if (comp?.resultsPublished) {
        return (
          <View style={styles.publishedPill}>
            <Ionicons name="checkmark-circle" size={20} color={SUCCESS} />
            <AppText
              fontWeight="bold"
              style={{ color: SUCCESS, marginLeft: 8 }}
            >
              Results Published
            </AppText>
          </View>
        );
      }
      if (!canPublishResults) {
        return (
          <View style={styles.lockedPill}>
            <Ionicons name="lock-closed" size={18} color={ACCENT_DIM} />
            <AppText
              fontWeight="bold"
              size="small"
              style={{ color: ACCENT_DIM, marginLeft: 8 }}
            >
              {comp?.isLive
                ? "Publish unlocks when the tournament ends"
                : "Publishing not available yet"}
            </AppText>
          </View>
        );
      }
      return (
        <AppButton
          title={publishingResults ? "Publishing…" : "Publish Results"}
          type="accent"
          onPress={onPublishResults}
        />
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

  const participantsTotal =
    comp?.participantsCount ?? comp?.totalParticipants ?? 0;
  const showRankings =
    comp?.leaderboard?.length > 0 &&
    (isManager || comp?.isLive || comp?.resultsPublished);

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
              <View
                style={[
                  styles.modalBadge,
                  comp?.resultsPublished && {
                    backgroundColor: "rgba(74,222,128,0.18)",
                  },
                ]}
              >
                <AppText
                  fontWeight="bold"
                  size="xxsmall"
                  style={{ color: comp?.resultsPublished ? SUCCESS : ACCENT }}
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
                  {/* Manager publish status */}
                  {isManager && <ManagerStatusBanner comp={comp} />}

                  {/* Manager: who won what, credited / notified, retry */}
                  {isManager && (
                    <PrizeSettlementPanel
                      comp={comp}
                      onRetry={onRetryAwards}
                      retrying={awardingPrizes}
                    />
                  )}

                  {/* Stats row */}
                  <View style={styles.modalStatsRow}>
                    <View style={styles.modalStat}>
                      <Ionicons name="people" size={20} color={ACCENT} />
                      <AppText fontWeight="bold" style={{ color: "#fff" }}>
                        {participantsTotal}
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
                      medal={MEDAL_COLORS[1]}
                    />
                    <PrizeRow
                      place="2nd"
                      prize={comp?.prizes?.second}
                      medal={MEDAL_COLORS[2]}
                    />
                    <PrizeRow
                      place="3rd"
                      prize={comp?.prizes?.third}
                      medal={MEDAL_COLORS[3]}
                    />
                  </View>

                  {/* Results pending panel — replaces all score/ranking UI */}
                  {showResultsPending ? (
                    <ResultsPendingPanel
                      participantsCount={participantsTotal}
                      hasParticipated={comp?.hasParticipated}
                    />
                  ) : (
                    <>
                      {/* Winners (only once results are published) */}
                      {comp?.resultsPublished &&
                        comp?.finalRankings?.length > 0 && (
                          <>
                            <AppText
                              fontWeight="bold"
                              size="medium"
                              style={{ ...styles.sectionTitle, marginTop: 16 }}
                            >
                              Winners
                            </AppText>
                            <LeaderboardWinners
                              isPro={false}
                              data={comp.finalRankings.slice(0, 3).map((w) => ({
                                _id: w.user?._id || w.user,
                                username: w.user?.username,
                                firstName: w.user?.firstName,
                                points: w.score,
                                avatar: w.user?.avatar,
                              }))}
                            />
                          </>
                        )}

                      {/* Participants & rankings
                          - Manager: every participant who submitted, ranked
                          - Everyone else: top 10 (live or after publish) */}
                      {showRankings && (
                        <>
                          <AppText
                            fontWeight="bold"
                            size="medium"
                            style={{ ...styles.sectionTitle, marginTop: 16 }}
                          >
                            {isManager
                              ? `Participants & Rankings (${comp.leaderboard.length})`
                              : comp.isLive
                                ? "Live Leaderboard"
                                : "Leaderboard"}
                          </AppText>
                          {comp.leaderboard.map((p, i) => (
                            <ParticipantRow
                              key={p.user?._id || i}
                              item={p}
                              index={i}
                              isMe={
                                !!myId &&
                                (p.user?._id || p.user)?.toString() ===
                                  myId.toString()
                              }
                            />
                          ))}
                        </>
                      )}

                      {isManager &&
                        !isLoading &&
                        !(comp?.leaderboard?.length > 0) && (
                          <View style={styles.emptyRankings}>
                            <Ionicons
                              name="people-outline"
                              size={22}
                              color={ACCENT_DIM}
                            />
                            <AppText
                              size="small"
                              style={{
                                color: "rgba(255,255,255,0.6)",
                                marginTop: 6,
                              }}
                            >
                              No participants have submitted yet
                            </AppText>
                          </View>
                        )}

                      {/* My result card (only shown after results published) */}
                      {comp?.hasParticipated && comp?.resultsPublished && (
                        <MyResultCard
                          myRank={comp.myRank}
                          myScore={comp.myScore}
                          totalParticipants={participantsTotal}
                          prizes={comp.prizes}
                        />
                      )}

                      {/* Participated but results not published yet — safety fallback */}
                      {!isManager &&
                        comp?.hasParticipated &&
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
  const isManager = user?.accountType === "manager";

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

  const awaitingResults =
    !comp.isLive && !comp.isUpcoming && !comp.resultsPublished;

  const statusColor = comp.isLive
    ? colors.green
    : comp.isUpcoming
      ? colors.warning
      : comp.resultsPublished
        ? SUCCESS
        : isManager
          ? ACCENT
          : colors.lighter;

  const statusText = comp.isLive
    ? "LIVE"
    : comp.isUpcoming
      ? "UPCOMING"
      : comp.resultsPublished
        ? "RESULTS OUT"
        : isManager
          ? "AWAITING RESULTS"
          : "ENDED";

  const renderMiddleLeft = () => {
    if (comp.isLive) {
      return <LiveStatusChip hasParticipated={comp.hasParticipated} />;
    }
    if (countdown && !countdown.done) {
      return <InlineCountdown countdown={countdown} />;
    }
    if (isManager && awaitingResults && comp.canPublishResults) {
      return (
        <View style={styles.liveChipPlay}>
          <Ionicons name="megaphone" size={13} color="#fff" />
          <AppText
            fontWeight="bold"
            size="xxsmall"
            style={{ color: "#fff", marginLeft: 4 }}
          >
            Publish results · {comp.totalParticipants || 0} joined
          </AppText>
        </View>
      );
    }
    if (isManager && comp.resultsPublished) {
      return (
        <View style={styles.liveChipDone}>
          <Ionicons name="checkmark-circle" size={14} color={SUCCESS} />
          <AppText
            fontWeight="bold"
            size="xxsmall"
            style={{ color: SUCCESS, marginLeft: 4 }}
          >
            Published · {comp.totalParticipants || 0} joined
          </AppText>
        </View>
      );
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
          refetch?.();
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

  // Rankings list
  lbRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  lbRowMe: {
    backgroundColor: "rgba(255,195,113,0.10)",
    borderRadius: 10,
  },
  rankPill: {
    width: 28,
    height: 28,
    borderRadius: 9,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,195,113,0.15)",
  },
  emptyRankings: {
    alignItems: "center",
    paddingVertical: 24,
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
  },

  // Prize settlement panel
  settleBox: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  settleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  settleDone: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  // Manager banner / footer states
  managerBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255,195,113,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,195,113,0.25)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  bannerSub: {
    color: "rgba(255,255,255,0.7)",
    lineHeight: 17,
    marginTop: 2,
  },
  publishedPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(74,222,128,0.12)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
  },
  lockedPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
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

  // My result card (winner / rank)
  myResultWrapper: { marginTop: 16 },
  winnerCard: {
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
  },
  winnerIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  winnerPrizeBadge: {
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rankCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 14,
  },
  rankBadgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,195,113,0.15)",
    alignItems: "center",
    justifyContent: "center",
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
