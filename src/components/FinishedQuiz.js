/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { Dimensions, FlatList, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppText from "../components/AppText";
import colors from "../helpers/colors";
import LottieAnimator from "./LottieAnimator";
import QuizCorrections from "./QuizCorrections";
import { useSubmitQuizMutation } from "../context/schoolSlice";
import { useSubmitFreemiumQuizMutation, useSubmitPremiumQuizMutation } from "../context/instanceSlice";
import { useSubmitCompetitionQuizMutation } from "../context/competitionSlice";
import { LeaderboardItem, LeaderboardWinners } from "../screens/LeaderboardScreen";
import { getUserProfile, socket } from "../helpers/helperFunctions";
import { selectUser } from "../context/usersSlice";
import { Q, TONES } from "./quiz/QuizTheme";
import { stripRichGroups } from "./quiz/RichText";
import {
  Chip,
  Confetti,
  FooterBar,
  QuizButton,
  QuizCard,
  QuizPressable,
  StarRow,
  useCountUp,
} from "./quiz/QuizUI";

const { width, height } = Dimensions.get("screen");

const PHASE = { RESULT: "result", STATS: "stats" };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getTotalQuestions = (questions = []) =>
  questions.reduce((acc, q) => acc + (q?.questions?.length ?? 0), 0);

const computeLocalStats = (session) => {
  let answeredCorrectly = 0,
    statPoints = 0,
    totalPoints = 0;

  session?.questions?.forEach((quest) => {
    quest?.questions?.forEach((question) => {
      const pts = question?.point ?? 0;
      totalPoints += pts;
      if (question?.answered?.correct) {
        answeredCorrectly += 1;
        statPoints += pts;
      } else {
        statPoints -= 2;
      }
    });
  });

  return { answeredCorrectly, point: statPoints, total: totalPoints };
};

const formatDuration = (ms) => {
  if (ms == null) return "—";
  const s = Math.max(Math.round(ms / 1000), 0);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Server numbers win; otherwise derive everything from the local session. */
const useResolvedStats = ({ results, freemiumResults, competitionResults, localStat, session }) => {
  const serverData = results?.data ?? freemiumResults?.data ?? competitionResults?.data ?? null;
  const totalQuestions = serverData?.totalQuestions ?? getTotalQuestions(session?.questions) ?? 0;
  const correctAnswers = serverData?.correctAnswers ?? localStat?.answeredCorrectly ?? 0;

  return {
    pointsEarned: Number(serverData?.pointsEarned ?? localStat?.point ?? 0),
    correctAnswers,
    totalQuestions,
    accuracy: serverData?.accuracy ?? (totalQuestions ? Math.round((correctAnswers / totalQuestions) * 100) : 0),
  };
};

// ─── Result phase ────────────────────────────────────────────────────────────

const MiniStat = ({ icon, tone, value, label, delay }) => {
  const t = TONES[tone];
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(16)} style={[styles.mini, { backgroundColor: t.soft, borderColor: t.line }]}>
      <Ionicons name={icon} size={18} color={t.ink} />
      <AppText fontWeight="black" size={18} style={{ color: Q.ink, marginTop: 4 }}>
        {value}
      </AppText>
      <AppText fontWeight="bold" size={10.5} style={{ color: t.ink, letterSpacing: 0.6, textTransform: "uppercase" }}>
        {label}
      </AppText>
    </Animated.View>
  );
};

const ResultPhase = ({ resolvedStats, lowPercent, stars, msg, duration, onShowStats, onRetry, onClose, canRetry, topInset }) => {
  const tokens = useCountUp(resolvedStats.pointsEarned, 1200, 600, 1);

  return (
    <View style={[styles.phase, { paddingTop: topInset + 8 }]}>
      {!lowPercent && <Confetti />}

      <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
        <LottieAnimator
          name={lowPercent ? "person_float" : "congrats"}
          loop={Boolean(lowPercent)}
          style={{ width: width * 0.5, height: width * 0.5 }}
        />

        <Animated.View entering={FadeInDown.delay(100).springify().damping(16)} style={{ alignItems: "center" }}>
          <AppText fontWeight="black" size={28} style={styles.heading}>
            {lowPercent ? "Almost there! 💪" : "Congratulations! 🎉"}
          </AppText>
          <AppText fontWeight="semibold" size={14} style={styles.msg}>
            {msg}
          </AppText>
        </Animated.View>

        <View style={{ marginVertical: 14 }}>
          <StarRow count={stars} />
        </View>

        <Animated.View entering={FadeInDown.delay(260).springify().damping(16)} style={styles.tokenCard}>
          <AppText fontWeight="black" size={11} style={styles.tokenLabel}>
            TOKENS EARNED
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            <AppText fontWeight="black" size={44} style={{ color: TONES.yellow.ink, lineHeight: 52 }}>
              {tokens.toFixed(1)}
            </AppText>
            <AppText fontWeight="black" size={16} style={{ color: TONES.yellow.ink, marginBottom: 8, marginLeft: 4 }}>
              GT
            </AppText>
          </View>
        </Animated.View>

        <View style={styles.miniRow}>
          <MiniStat delay={380} tone="green" icon="checkmark-done" value={`${resolvedStats.correctAnswers}/${resolvedStats.totalQuestions}`} label="Correct" />
          <MiniStat delay={460} tone="blue" icon="analytics" value={`${resolvedStats.accuracy}%`} label="Accuracy" />
          <MiniStat delay={540} tone="purple" icon="stopwatch" value={formatDuration(duration)} label="Time" />
        </View>
      </ScrollView>

      <FooterBar style={{ flexDirection: "column", alignItems: "stretch" }}>
        <QuizButton title="View Stats" icon="stats-chart" variant="purple" onPress={onShowStats} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <QuizButton title="Close" icon="close" variant="ghost" small onPress={onClose} style={{ flex: 1 }} />
          {canRetry && <QuizButton title="Retry" icon="refresh" variant="yellow" small onPress={onRetry} style={{ flex: 1 }} />}
        </View>
      </FooterBar>
    </View>
  );
};

// ─── Stats phase ─────────────────────────────────────────────────────────────

const FILTERS = [
  { key: "all", label: "All" },
  { key: "wrong", label: "Missed" },
  { key: "right", label: "Correct" },
];

const ScoreCell = ({ value, sub, label, tone }) => (
  <View style={styles.cell}>
    <AppText fontWeight="black" size={22} style={{ color: TONES[tone].ink }}>
      {value}
      {Boolean(sub) && (
        <AppText fontWeight="bold" size={13} style={{ color: Q.faint }}>
          {sub}
        </AppText>
      )}
    </AppText>
    <AppText fontWeight="bold" size={10.5} style={styles.cellLabel}>
      {label}
    </AppText>
  </View>
);

const StatsHeader = ({ resolvedStats, filter, setFilter }) => (
  <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
    <QuizCard animateIn={false} style={{ padding: 12 }}>
      <View style={styles.cells}>
        <ScoreCell value={resolvedStats.correctAnswers} sub={`/${resolvedStats.totalQuestions}`} label="CORRECT" tone="green" />
        <View style={styles.cellDivider} />
        <ScoreCell value={resolvedStats.accuracy} sub="%" label="ACCURACY" tone="blue" />
        <View style={styles.cellDivider} />
        <ScoreCell value={resolvedStats.pointsEarned.toFixed(1)} sub=" GT" label="POINTS" tone="yellow" />
      </View>
    </QuizCard>

    <View style={styles.filters}>
      {FILTERS.map((f) => {
        const on = filter === f.key;
        return (
          <QuizPressable key={f.key} scaleTo={0.94} onPress={() => setFilter(f.key)}>
            <Chip
              label={f.label}
              color={on ? "#fff" : Q.sub}
              bg={on ? TONES.purple.face : Q.track}
              style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: 14 }}
            />
          </QuizPressable>
        );
      })}
    </View>
  </View>
);

const StatsPhase = ({ resolvedStats, session, onBack, onRetry, onClose, canRetry, topInset }) => {
  const [filter, setFilter] = useState("all");

  return (
    <View style={[styles.phase, { paddingTop: topInset + 8 }]}>
      <AppText fontWeight="black" size={22} style={styles.statsTitle}>
        Quiz Stats
      </AppText>
      <QuizCorrections
        data={session?.questions}
        filter={filter}
        ListHeaderComponent={<StatsHeader resolvedStats={resolvedStats} filter={filter} setFilter={setFilter} />}
        contentContainerStyle={{ paddingBottom: 12 }}
      />
      <FooterBar>
        <QuizButton title="Close" icon="close" variant="ghost" small onPress={onClose} style={{ flex: 1 }} />
        {Boolean(onBack) && <QuizButton title="Back" icon="arrow-back" variant="blue" small onPress={onBack} style={{ flex: 1 }} />}
        {canRetry && <QuizButton title="Retry" icon="refresh" variant="yellow" small onPress={onRetry} style={{ flex: 1 }} />}
      </FooterBar>
    </View>
  );
};

const WaitingBanner = () => (
  <View style={styles.waitingBanner}>
    <LottieAnimator name="loading" loop style={{ width: 44, height: 44 }} />
    <AppText fontWeight="bold" size={13.5} style={{ marginLeft: 10, color: Q.ink }}>
      Waiting for the remaining players…
    </AppText>
  </View>
);

// ─── Main ────────────────────────────────────────────────────────────────────

const FinishedQuiz = ({ hideModal, data, retried, retry, sessionId, session, duration }) => {
  const [phase, setPhase] = useState(PHASE.RESULT);
  const [localStat, setLocalStat] = useState({ answeredCorrectly: 0, point: 0, total: 0, isFinal: false });
  const [leaderboard, setLeaderboard] = useState(session?.leaderboard ?? []);

  const [submitQuiz] = useSubmitQuizMutation();
  const [submitFreemiumQuiz, { data: freemiumResults }] = useSubmitFreemiumQuizMutation();
  const [submitPremiumQuiz, { data: results }] = useSubmitPremiumQuizMutation();
  const [submitCompetitionQuiz, { data: competitionResults }] = useSubmitCompetitionQuizMutation();

  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);

  const isMultiplayer = Boolean(sessionId);
  const resolvedStats = useResolvedStats({ results, freemiumResults, competitionResults, localStat, session });

  const percentage = Math.max(Math.round((localStat.point / (localStat.total || 1)) * 100), 0);
  const lowPercent = percentage < 50;
  const stars = percentage >= 80 ? 3 : percentage >= 50 ? 2 : percentage >= 20 ? 1 : 0;
  const competitionRank = competitionResults?.data?.rank;
  const canRetry = !isMultiplayer && data?.type !== "competition";

  const msg =
    data?.type === "competition" && competitionRank
      ? `You finished #${competitionRank} in the Monthly Tournament!`
      : lowPercent
        ? "Hard luck! Study more and come back for more practice!"
        : "You've done well — retake the quiz or move to the next topic.";

  useEffect(() => {
    socket.emit("quiz_end", { sessionId, user: getUserProfile(user) });
    const stats = computeLocalStats(session);
    setLocalStat((prev) => ({ ...prev, ...stats }));
    uploadQuizSession();
  }, [session]);

  useEffect(() => {
    socket.on("leaderboard_update", ({ leaderboard: lb, isFinal, stats }) => {
      setLeaderboard(lb);
      if (isFinal) setLocalStat(() => ({ ...stats[user?._id], isFinal: true }));
    });
    return () => socket.off("leaderboard_update");
  }, []);

  const uploadQuizSession = async () => {
    if (isMultiplayer) return;

    // rich bodies are display-only; keep them out of what we upload
    const cleanQuestions = stripRichGroups(session?.questions);
    const payload = { ...data, ...session, questions: cleanQuestions, retried, ...(duration != null ? { duration } : {}) };
    const handlers = {
      school: () => submitQuiz(payload).unwrap(),
      freemium: () => submitFreemiumQuiz(payload).unwrap(),
      competition: () =>
        submitCompetitionQuiz({
          competitionId: data.competitionId,
          questions: cleanQuestions,
          ...(duration != null ? { duration } : {}),
        }).unwrap(),
      premium: () => submitPremiumQuiz(payload).unwrap(),
    };

    try {
      await (handlers[data?.type] ?? handlers.premium)();
    } catch (error) {
      console.log(`[FinishedQuiz] Submit error (${data?.type}):`, error);
    }
  };

  // MULTIPLAYER: leaderboard until finals arrive, then stats
  if (isMultiplayer) {
    return (
      <View style={styles.container}>
        {!localStat.isFinal ? (
          <View style={[styles.leaderboard, { paddingTop: insets.top }]}>
            <AppText size="xlarge" fontWeight="heavy" style={styles.leaderboardTitle}>
              Quiz Leaderboard
            </AppText>
            <FlatList
              data={leaderboard}
              keyExtractor={(item, index) => item?._id?.toString() ?? `lb-${index}`}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={() => <LeaderboardWinners isPro={false} data={leaderboard?.slice(0, 3)} />}
              ListHeaderComponentStyle={{ backgroundColor: colors.accent }}
              ListFooterComponent={
                <View style={leaderboard?.length < 4 ? styles.lbFooterSmall : styles.lbFooter}>
                  <LottieAnimator name="congrats" loop={false} style={{ width: width * 0.8, height: width * 0.8 }} />
                </View>
              }
              renderItem={({ item, index }) => <LeaderboardItem item={item} isPro={false} index={index} />}
            />
            <WaitingBanner />
          </View>
        ) : (
          <StatsPhase
            resolvedStats={resolvedStats}
            session={session}
            onClose={hideModal}
            canRetry={false}
            topInset={insets.top}
          />
        )}
      </View>
    );
  }

  // SINGLE PLAYER
  return (
    <View style={styles.container}>
      {phase === PHASE.RESULT ? (
        <ResultPhase
          resolvedStats={resolvedStats}
          lowPercent={lowPercent}
          stars={stars}
          msg={msg}
          duration={duration}
          onShowStats={() => setPhase(PHASE.STATS)}
          onRetry={retry}
          onClose={hideModal}
          canRetry={canRetry}
          topInset={insets.top}
        />
      ) : (
        <StatsPhase
          resolvedStats={resolvedStats}
          session={session}
          onBack={() => setPhase(PHASE.RESULT)}
          onRetry={retry}
          onClose={hideModal}
          canRetry={canRetry}
          topInset={insets.top}
        />
      )}
    </View>
  );
};

export default FinishedQuiz;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Q.paper },
  phase: { flex: 1, width, backgroundColor: Q.paper },
  resultScroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingBottom: 12 },
  heading: { color: Q.ink, textAlign: "center" },
  msg: { color: Q.sub, textAlign: "center", marginTop: 6, maxWidth: "85%", lineHeight: 20 },
  tokenCard: {
    alignItems: "center", backgroundColor: TONES.yellow.soft, borderRadius: 22,
    borderWidth: 2, borderBottomWidth: 6, borderColor: TONES.yellow.line,
    paddingVertical: 12, paddingHorizontal: 40, marginBottom: 14,
  },
  tokenLabel: { letterSpacing: 1.4, color: TONES.yellow.ink },
  miniRow: { flexDirection: "row", gap: 10, width: "100%" },
  mini: { flex: 1, alignItems: "center", borderRadius: 18, borderWidth: 2, borderBottomWidth: 4, paddingVertical: 12 },
  statsTitle: { color: Q.ink, marginLeft: 16, marginBottom: 10 },
  cells: { flexDirection: "row", alignItems: "center" },
  cell: { flex: 1, alignItems: "center" },
  cellLabel: { color: Q.sub, letterSpacing: 0.8, marginTop: 2 },
  cellDivider: { width: 2, height: 34, borderRadius: 1, backgroundColor: Q.line },
  filters: { flexDirection: "row", gap: 8, marginBottom: 12 },
  leaderboard: { flex: 1, backgroundColor: colors.accent, width },
  leaderboardTitle: { textAlign: "left", marginLeft: 15, marginTop: 8, marginBottom: 15, color: "#fff" },
  lbFooter: { marginTop: 40, height: height * 0.5, backgroundColor: Q.paper, alignItems: "center" },
  lbFooterSmall: {
    height: height * 0.5, borderTopRightRadius: 24, borderTopLeftRadius: 24,
    backgroundColor: Q.paper, alignItems: "center",
  },
  waitingBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 12, backgroundColor: Q.paper, borderTopWidth: 2, borderTopColor: Q.line,
  },
});
