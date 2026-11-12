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
import Avatar from "./Avatar";
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
import { T } from "./jamb/JambTheme";
import { Chunky, JambButton, Note, SectionTitle } from "./jamb/JambUI";

// ─────────────────────────────────────────────
// 🎨 Theme — "tournament night": navy ticket on the feed, paper trophy hall in the modal
// ─────────────────────────────────────────────
const NAVY = T.ink;
const NAVY_LIP = "#0B1226";
const ON_NAVY = "#AEB8D6"; // secondary text on navy
const SUCCESS = "#4ADE80"; // mint, used on navy surfaces
const MEDALS = {
  1: { main: "#FFC736", soft: "#FFF3C4", line: "#F2D675" },
  2: { main: "#C9D2E0", soft: "#EEF1F6", line: "#D3DAE6" },
  3: { main: "#E6A260", soft: "#FCE9D6", line: "#F0C79D" },
};

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

// ─── Decorative bits (confetti + watermark) ───────────────────────────────────
const CONFETTI = [
  { top: 12, right: 96, c: T.yellow, s: 7 },
  { top: 30, right: 44, c: T.coral, s: 5 },
  { top: 10, right: 150, c: T.blue, s: 5 },
  { top: 48, right: 118, c: T.green, s: 4 },
  { top: 20, right: 20, c: "#fff", s: 4 },
];

const Confetti = () => (
  <>
    {CONFETTI.map((d, i) => (
      <View
        key={i}
        pointerEvents="none"
        style={{
          position: "absolute",
          top: d.top,
          right: d.right,
          width: d.s,
          height: d.s,
          borderRadius: d.s / 2,
          backgroundColor: d.c,
          opacity: 0.85,
        }}
      />
    ))}
  </>
);

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
      {parts.map(({ v, l }) => (
        <View key={l} style={styles.cdTile}>
          <AppText fontWeight="black" size="small" style={styles.cdValue}>
            {String(v).padStart(2, "0")}
          </AppText>
          <AppText size="xxsmall" style={styles.cdLabel}>
            {l}
          </AppText>
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
    <AppText fontWeight="bold" size="xxsmall" style={{ color: T.yellow }}>
      {formatPrizeReward(prize)}
    </AppText>
  </View>
);

// ─── Prize tile (modal) ───────────────────────────────────────────────────────
const PrizeRow = ({ place, prize, medal }) => {
  const isCash = prize?.type === "cash";
  return (
    <View
      style={[
        styles.prizeTile,
        { backgroundColor: medal.soft, borderColor: medal.line },
      ]}
    >
      <View style={[styles.medalBadge, { backgroundColor: medal.main }]}>
        <AppText fontWeight="black" size="xsmall" style={{ color: T.ink }}>
          {place}
        </AppText>
      </View>
      <AppText
        fontWeight="bold"
        size="xsmall"
        numberOfLines={1}
        style={{ color: T.sub, marginTop: 8 }}
      >
        {prize?.title || "—"}
      </AppText>
      <AppText
        fontWeight="black"
        size="small"
        numberOfLines={1}
        style={{ color: T.ink, marginTop: 1 }}
      >
        {formatPrizeReward(prize)}
      </AppText>
      {isCash && prize?.description ? (
        <AppText
          size="xxsmall"
          numberOfLines={2}
          style={{ color: T.sub, textAlign: "center", marginTop: 2 }}
        >
          {prize.description}
        </AppText>
      ) : null}
    </View>
  );
};

// ─── Participant row (rankings list) ──────────────────────────────────────────
const ParticipantRow = ({ item, index, isMe }) => {
  const rank = item.rank ?? index + 1;
  const medal = MEDALS[rank];
  const timeTaken = formatTimeTaken(item.duration);

  return (
    <View style={[styles.lbRow, isMe && styles.lbRowMe]}>
      <View
        style={[
          styles.rankPill,
          medal ? { backgroundColor: medal.main } : null,
        ]}
      >
        <AppText
          fontWeight="black"
          size="xsmall"
          style={{ color: medal ? T.ink : T.sub }}
        >
          {rank}
        </AppText>
      </View>
      <Avatar size={34} source={item.user?.avatar?.image} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <AppText
          style={{ color: T.ink }}
          fontWeight="semibold"
          numberOfLines={1}
        >
          @{item.user?.username || "unknown"}
          {isMe ? " (you)" : ""}
        </AppText>
        {timeTaken ? (
          <AppText size="xxsmall" style={{ color: T.sub }}>
            {timeTaken}
          </AppText>
        ) : null}
      </View>
      <AppText fontWeight="black" style={{ color: T.ink }}>
        {formatPoints(item.score)}
      </AppText>
    </View>
  );
};

// ─── Status card (icon tile + title + text) ───────────────────────────────────
const TONES = {
  green: { bg: T.greenSoft, line: T.greenLine, ico: T.greenDark },
  yellow: { bg: T.yellowSoft, line: T.yellowLine, ico: T.yellowInk },
  neutral: { bg: "#fff", line: T.line, ico: T.sub },
};

const StatusCard = ({ icon, tone = "neutral", title, children }) => {
  const c = TONES[tone];
  return (
    <View
      style={[
        styles.statusCard,
        { backgroundColor: c.bg, borderColor: c.line },
      ]}
    >
      <View style={[styles.statusIcon, { borderColor: c.line }]}>
        <Ionicons name={icon} size={20} color={c.ico} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <AppText fontWeight="black" size="small" style={{ color: T.ink }}>
          {title}
        </AppText>
        <AppText size="xsmall" style={styles.bannerSub}>
          {children}
        </AppText>
      </View>
    </View>
  );
};

// ─── Manager: publish status banner (modal body) ──────────────────────────────
const ManagerStatusBanner = ({ comp }) => {
  if (!comp) return null;

  if (comp.resultsPublished) {
    return (
      <StatusCard
        icon="checkmark-circle"
        tone="green"
        title="Results published"
      >
        Participants can now see their scores and ranks. Points prizes are
        credited automatically and winners are notified; cash prizes need manual
        payout.
      </StatusCard>
    );
  }

  if (comp.canPublishResults) {
    return (
      <StatusCard icon="megaphone" tone="yellow" title="Ready to publish">
        The tournament has ended. Publishing ranks everyone, credits points
        prizes to the top 3 and can't be undone.
      </StatusCard>
    );
  }

  return (
    <StatusCard
      icon="lock-closed"
      tone="neutral"
      title={
        comp.isUpcoming
          ? "Not started yet"
          : comp.isLive
            ? "Tournament is live"
            : "Not publishable yet"
      }
    >
      {comp.isLive
        ? `Results can be published once it ends (${formatEndDate(comp.endTime)}).`
        : comp.isUpcoming
          ? "Results can be published after the tournament has run."
          : "This competition hasn't been published yet."}
    </StatusCard>
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
  let statusColor = T.sub;
  let icon = "remove-circle";

  if (isPoints && winner.prizeAwarded) {
    statusText = `+${formatPrizeReward(prize)} credited`;
    statusColor = T.greenDark;
    icon = "checkmark-circle";
  } else if (isPoints) {
    statusText = "Credit failed — tap retry";
    statusColor = T.coralDark;
    icon = "alert-circle";
  } else if (isCash) {
    statusText = `${formatPrizeReward(prize)} · pay manually`;
    statusColor = T.yellowInk;
    icon = "cash";
  }

  const notifyColor = winner.notified ? T.greenDark : T.faint;

  return (
    <View style={styles.settleRow}>
      <View
        style={[
          styles.rankPill,
          MEDALS[winner.rank]
            ? { backgroundColor: MEDALS[winner.rank].main }
            : null,
        ]}
      >
        <AppText fontWeight="black" size="xsmall" style={{ color: T.ink }}>
          {winner.rank}
        </AppText>
      </View>
      <View style={{ flex: 1 }}>
        <AppText
          fontWeight="semibold"
          size="small"
          style={{ color: T.ink }}
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
          color={notifyColor}
        />
        <AppText size="xxsmall" style={{ color: notifyColor, marginTop: 1 }}>
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
        fontWeight="black"
        size="small"
        style={{ color: T.ink, marginBottom: 4 }}
      >
        Prize settlement
      </AppText>
      <AppText size="xxsmall" style={{ color: T.sub, marginBottom: 6 }}>
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
        <View style={{ marginTop: 14 }}>
          <JambButton
            title={retrying ? "Processing…" : "Retry awards & push"}
            variant="yellow"
            icon="refresh"
            onPress={onRetry}
          />
        </View>
      ) : (
        <View style={styles.settleDone}>
          <Ionicons name="checkmark-done" size={16} color={T.greenDark} />
          <AppText
            size="xxsmall"
            fontWeight="bold"
            style={{ color: T.greenDark, marginLeft: 6 }}
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
    face: "#FFC736",
    lip: "#D99F00",
    icon: "trophy",
    label: "🏆 You're the Champion!",
    textColor: "#3D2B00",
  },
  2: {
    face: "#DDE3EE",
    lip: "#AEB8CA",
    icon: "medal",
    label: "🥈 Runner-up!",
    textColor: "#1E2A4A",
  },
  3: {
    face: "#E9A15C",
    lip: "#B7692A",
    icon: "ribbon",
    label: "🥉 Third Place!",
    textColor: "#3B1F08",
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
        <View style={[styles.winnerLip, { backgroundColor: winnerStyle.lip }]}>
          <View
            style={[styles.winnerCard, { backgroundColor: winnerStyle.face }]}
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
          </View>
        </View>
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
          <AppText
            fontWeight="black"
            size="medium"
            style={{ color: T.yellowInk }}
          >
            #{myRank}
          </AppText>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText fontWeight="bold" style={{ color: T.ink }}>
            Your Position
          </AppText>
          <AppText size="xsmall" style={{ color: T.sub }}>
            {formatPoints(myScore)}
            {totalParticipants
              ? ` · out of ${totalParticipants} participants`
              : ""}
          </AppText>
        </View>
        <Ionicons name="stats-chart" size={20} color={T.blueDark} />
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
      <Ionicons name="people" size={22} color={T.yellowInk} />
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

const PendingChip = ({ icon, label }) => (
  <View style={styles.pendingChip}>
    <Ionicons name={icon} size={14} color={T.yellowInk} />
    <AppText
      size="xxsmall"
      fontWeight="bold"
      style={{ color: T.yellowInk, marginLeft: 5 }}
    >
      {label}
    </AppText>
  </View>
);

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

    <AppText
      fontWeight="bold"
      size="xsmall"
      style={styles.pendingParticipantsLabel}
    >
      TOTAL PARTICIPANTS
    </AppText>
    <AnimatedParticipantCount count={participantsCount} />

    <View style={styles.pendingChipsRow}>
      {hasParticipated ? (
        <>
          <PendingChip icon="hourglass" label="Scores being verified" />
          <PendingChip icon="trophy" label="Winners announced soon" />
        </>
      ) : (
        <>
          <PendingChip icon="flash" label="Window still open" />
          <PendingChip icon="medal" label="Prizes up for grabs" />
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
            <Ionicons name="checkmark-circle" size={20} color={T.greenDark} />
            <AppText
              fontWeight="black"
              style={{ color: T.greenDark, marginLeft: 8 }}
            >
              Results Published
            </AppText>
          </View>
        );
      }
      if (!canPublishResults) {
        return (
          <View style={styles.lockedPill}>
            <Ionicons name="lock-closed" size={18} color={T.faint} />
            <AppText
              fontWeight="bold"
              size="small"
              style={{ color: T.sub, marginLeft: 8 }}
            >
              {comp?.isLive
                ? "Publish unlocks when the tournament ends"
                : "Publishing not available yet"}
            </AppText>
          </View>
        );
      }
      return (
        <JambButton
          title={publishingResults ? "Publishing…" : "Publish Results"}
          variant="yellow"
          icon="megaphone"
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
              color: T.sub,
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            Unlock access to the Monthly Quiz Tournament and stand a chance to
            earn prizes
          </AppText>
          <JambButton
            title="Subscribe Now"
            variant="yellow"
            icon="star"
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
        <JambButton
          title="Start Competition"
          icon="play"
          onPress={() => {
            onClose();
            onParticipate?.("start");
          }}
        />
      );
    }
    if (comp?.isUpcoming) {
      return (
        <JambButton
          title="Opens Soon"
          variant="ghost"
          icon="time"
          onPress={onClose}
        />
      );
    }
    return (
      <JambButton
        title="Close"
        variant="ghost"
        icon="close"
        onPress={onClose}
      />
    );
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
          {/* Trophy-hall header */}
          <View style={styles.modalHeader}>
            <Confetti />
            <Ionicons
              name="trophy"
              size={150}
              color="rgba(255,255,255,0.05)"
              style={styles.headerWatermark}
            />
            <Pressable style={styles.modalClose} onPress={onClose}>
              <Ionicons name="close" size={22} color={T.ink} />
            </Pressable>

            <View
              style={[
                styles.modalBadge,
                comp?.resultsPublished && {
                  backgroundColor: "rgba(74,222,128,0.18)",
                },
              ]}
            >
              <AppText
                fontWeight="black"
                size="xxsmall"
                style={{
                  color: comp?.resultsPublished ? SUCCESS : T.yellow,
                  letterSpacing: 0.8,
                }}
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
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
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
                  <View
                    style={[
                      styles.modalStat,
                      { backgroundColor: T.blueSoft, borderColor: T.blueLine },
                    ]}
                  >
                    <Ionicons name="people" size={20} color={T.blueDark} />
                    <AppText fontWeight="black" style={{ color: T.ink }}>
                      {participantsTotal}
                    </AppText>
                    <AppText size="xxsmall" style={{ color: T.blueDark }}>
                      Participants
                    </AppText>
                  </View>
                  <View
                    style={[
                      styles.modalStat,
                      {
                        backgroundColor: T.purpleSoft,
                        borderColor: T.purpleLine,
                      },
                    ]}
                  >
                    <Ionicons
                      name="help-circle"
                      size={20}
                      color={T.purpleDark}
                    />
                    <AppText fontWeight="black" style={{ color: T.ink }}>
                      {comp?.totalQuestions ?? 0}
                    </AppText>
                    <AppText size="xxsmall" style={{ color: T.purpleDark }}>
                      Questions
                    </AppText>
                  </View>
                  <View
                    style={[
                      styles.modalStat,
                      {
                        backgroundColor: T.yellowSoft,
                        borderColor: T.yellowLine,
                      },
                    ]}
                  >
                    <Ionicons name="time" size={20} color={T.yellowInk} />
                    <AppText fontWeight="black" style={{ color: T.ink }}>
                      {formatDuration(comp?.approxDuration)}
                    </AppText>
                    <AppText size="xxsmall" style={{ color: T.yellowInk }}>
                      Duration
                    </AppText>
                  </View>
                </View>

                {/* Rules */}
                {comp?.rules ? (
                  <Note
                    icon="document-text"
                    title="Rules"
                    style={{ marginBottom: 14 }}
                  >
                    <AppText
                      size="small"
                      style={{ lineHeight: 20, color: "#4A4020", marginTop: 4 }}
                    >
                      {comp.rules}
                    </AppText>
                  </Note>
                ) : null}

                {/* Prize Pool */}
                <SectionTitle
                  icon="trophy"
                  color={T.yellowInk}
                  bg={T.yellowSoft}
                  title="Prize Pool"
                />
                <View style={styles.prizeRowWrap}>
                  <PrizeRow
                    place="1st"
                    prize={comp?.prizes?.first}
                    medal={MEDALS[1]}
                  />
                  <PrizeRow
                    place="2nd"
                    prize={comp?.prizes?.second}
                    medal={MEDALS[2]}
                  />
                  <PrizeRow
                    place="3rd"
                    prize={comp?.prizes?.third}
                    medal={MEDALS[3]}
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
                          <View style={{ marginTop: 18 }}>
                            <SectionTitle
                              icon="ribbon"
                              color={T.purpleDark}
                              bg={T.purpleSoft}
                              title="Winners"
                            />
                          </View>
                          <View style={{ marginHorizontal: -20 }}>
                            <LeaderboardWinners
                              isPro={false}
                              textColor={T.ink}
                              data={comp.finalRankings.slice(0, 3).map((w) => ({
                                _id: w.user?._id || w.user,
                                username: w.user?.username,
                                firstName: w.user?.firstName,
                                points: w.score,
                                avatar: w.user?.avatar,
                              }))}
                            />
                          </View>
                        </>
                      )}

                    {/* Participants & rankings
                        - Manager: every participant who submitted, ranked
                        - Everyone else: top 10 (live or after publish) */}
                    {showRankings && (
                      <>
                        <View style={{ marginTop: 18 }}>
                          <SectionTitle
                            icon="list"
                            color={T.blueDark}
                            bg={T.blueSoft}
                            title={
                              isManager
                                ? `Participants & Rankings (${comp.leaderboard.length})`
                                : comp.isLive
                                  ? "Live Leaderboard"
                                  : "Leaderboard"
                            }
                          />
                        </View>
                        <View style={styles.lbCard}>
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
                        </View>
                      </>
                    )}

                    {isManager &&
                      !isLoading &&
                      !(comp?.leaderboard?.length > 0) && (
                        <View style={styles.emptyRankings}>
                          <Ionicons
                            name="people-outline"
                            size={22}
                            color={T.faint}
                          />
                          <AppText
                            size="small"
                            style={{ color: T.sub, marginTop: 6 }}
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
                        <View style={styles.participatedBanner}>
                          <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color={T.yellowInk}
                          />
                          <AppText
                            style={{
                              color: T.yellowInk,
                              marginLeft: 8,
                              flex: 1,
                            }}
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
            style={[styles.modalFooter, { paddingBottom: insets.bottom + 14 }]}
          >
            {renderFooter()}
          </View>
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
    ? T.green
    : comp.isUpcoming
      ? T.yellow
      : comp.resultsPublished
        ? SUCCESS
        : isManager
          ? T.yellow
          : ON_NAVY;

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
        <Ionicons name="people-outline" size={13} color={ON_NAVY} />
        <AppText size="xxsmall" style={{ color: ON_NAVY, marginLeft: 4 }}>
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
        <Chunky
          onPress={() => setDetailsOpen(true)}
          face={NAVY}
          lip={NAVY_LIP}
          radius={22}
          depth={6}
          contentStyle={styles.card}
        >
          <Confetti />
          <Ionicons
            name="trophy"
            size={120}
            color="rgba(255,255,255,0.05)"
            style={styles.cardWatermark}
          />

          {/* Row 1: Title + status badge */}
          <View style={styles.cardHeader}>
            <View style={styles.trophyIcon}>
              <Ionicons name="trophy" size={19} color={T.ink} />
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
                <AppText size="xxsmall" style={{ color: "#D7DDF0" }}>
                  {comp.totalQuestions}Q · {formatDuration(comp.approxDuration)}
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
                fontWeight="black"
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

          {/* Row 3: Tags + chevron (ticket stub) */}
          <View style={styles.cardFooter}>
            <View style={styles.tagsRow}>
              {subjectNames.slice(0, 2).map((name) => (
                <View key={name} style={styles.tag}>
                  <AppText
                    size="xxsmall"
                    fontWeight="bold"
                    style={{ color: "#E4E9F7" }}
                  >
                    {name}
                  </AppText>
                </View>
              ))}
              {subjectNames.length > 2 && (
                <View style={styles.tag}>
                  <AppText size="xxsmall" style={{ color: "#E4E9F7" }}>
                    +{subjectNames.length - 2}
                  </AppText>
                </View>
              )}
            </View>
            <View style={styles.chevronCircle}>
              <Ionicons name="arrow-forward" size={14} color={T.ink} />
            </View>
          </View>
        </Chunky>
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
  wrapper: { marginHorizontal: 10, marginBottom: 15 },
  card: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    overflow: "hidden",
  },
  cardWatermark: {
    position: "absolute",
    right: -16,
    bottom: -26,
    transform: [{ rotate: "-12deg" }],
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  trophyIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: T.yellow,
    borderBottomWidth: 4,
    borderBottomColor: T.yellowDark,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: "#fff" },
  cardMonth: { color: ON_NAVY, marginTop: 1 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },

  // Middle row
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  inlineCountdown: { flexDirection: "row", alignItems: "center", gap: 4 },
  cdTile: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  cdValue: { color: T.yellow, lineHeight: 18 },
  cdLabel: { color: ON_NAVY, fontSize: 10 },
  participantsChip: { flexDirection: "row", alignItems: "center" },

  liveChipPlay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.coral,
    borderBottomWidth: 3,
    borderBottomColor: T.coralDark,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveChipDone: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(74,222,128,0.15)",
    borderRadius: 11,
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
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  pillEmoji: { fontSize: 16 },

  // Footer (ticket stub, dashed tear line)
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.18)",
    borderStyle: "dashed",
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, flex: 1 },
  tag: {
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,24,48,0.65)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "92%",
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    backgroundColor: T.paper,
  },
  modalHeader: {
    backgroundColor: NAVY,
    paddingTop: 18,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    borderBottomWidth: 5,
    borderBottomColor: NAVY_LIP,
    overflow: "hidden",
  },
  headerWatermark: {
    position: "absolute",
    right: -20,
    bottom: -30,
    transform: [{ rotate: "-12deg" }],
  },
  modalClose: {
    position: "absolute",
    top: 14,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: T.chalk,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },
  modalBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,199,54,0.18)",
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  modalTitle: { color: "#fff", paddingRight: 46 },
  modalSub: { color: ON_NAVY, marginTop: 4 },
  modalStatsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  modalStat: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    paddingVertical: 12,
  },
  prizeRowWrap: { flexDirection: "row", gap: 8 },
  prizeTile: {
    flex: 1,
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  medalBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: T.ink,
    alignItems: "center",
    justifyContent: "center",
  },

  // Status card
  statusCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  statusIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerSub: { color: T.sub, lineHeight: 17, marginTop: 2 },

  // Rankings list
  lbCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: T.line,
    padding: 6,
  },
  lbRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  lbRowMe: {
    backgroundColor: T.greenSoft,
    borderWidth: 2,
    borderColor: T.greenLine,
  },
  rankPill: {
    width: 28,
    height: 28,
    borderRadius: 9,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.paper,
  },
  emptyRankings: {
    alignItems: "center",
    paddingVertical: 24,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: T.line,
    borderStyle: "dashed",
  },

  // Prize settlement panel
  settleBox: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: T.line,
    padding: 14,
    marginBottom: 14,
  },
  settleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1.5,
    borderBottomColor: T.line,
    borderStyle: "dashed",
  },
  settleDone: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  publishedPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 18,
    backgroundColor: T.greenSoft,
    borderWidth: 2,
    borderColor: T.greenLine,
  },
  lockedPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: T.line,
  },

  participatedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.yellowSoft,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.yellowLine,
    padding: 14,
    borderRadius: 18,
    marginTop: 16,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: T.paper,
    borderTopWidth: 2,
    borderTopColor: T.line,
  },

  // My result card (winner / rank)
  myResultWrapper: { marginTop: 16 },
  winnerLip: { borderRadius: 22, paddingBottom: 6 },
  winnerCard: {
    borderRadius: 22,
    padding: 18,
    alignItems: "center",
  },
  winnerIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  winnerPrizeBadge: {
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.45)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rankCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: T.line,
    padding: 14,
  },
  rankBadgeCircle: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: T.yellowSoft,
    borderWidth: 2,
    borderColor: T.yellowLine,
    alignItems: "center",
    justifyContent: "center",
  },

  // Results pending panel
  pendingPanel: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 14,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: T.line,
  },
  pendingLottie: { width: 160, height: 160 },
  pendingTitle: { color: T.ink, textAlign: "center", marginTop: 8 },
  pendingSubtitle: {
    color: T.sub,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  pendingDivider: {
    width: "60%",
    borderTopWidth: 1.5,
    borderTopColor: T.line,
    borderStyle: "dashed",
    marginVertical: 20,
  },
  pendingParticipantsLabel: {
    color: T.yellowInk,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  participantCountBox: {
    alignItems: "center",
    backgroundColor: T.yellowSoft,
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.yellowLine,
    gap: 2,
  },
  participantCountNum: { color: T.ink, fontSize: 42, lineHeight: 48 },
  participantCountLabel: { color: T.yellowInk, marginTop: 2 },
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
    backgroundColor: T.yellowSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
});
