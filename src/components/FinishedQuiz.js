/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/refs */
import {
  Dimensions,
  FlatList,
  StyleSheet,
  View,
  Animated,
  Easing,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppText from "../components/AppText";
import colors from "../helpers/colors";
import LottieAnimator from "./LottieAnimator";
import AppButton from "./AppButton";
import QuizCorrections from "./QuizCorrections";
import { useSubmitQuizMutation } from "../context/schoolSlice";
import {
  useSubmitFreemiumQuizMutation,
  useSubmitPremiumQuizMutation,
} from "../context/instanceSlice";
import { useSubmitCompetitionQuizMutation } from "../context/competitionSlice";
import {
  LeaderboardItem,
  LeaderboardWinners,
} from "../screens/LeaderboardScreen";
import { getUserProfile, socket } from "../helpers/helperFunctions";
import { selectUser } from "../context/usersSlice";

// ─── Constants ───────────────────────────────────────────────────────────────

const { width, height } = Dimensions.get("screen");

// View phases for the single-player flow
const PHASE = {
  RESULT: "result", // congrats / bad-luck screen
  STATS: "stats", // detailed stats + corrections
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getTotalQuestions = (questions = []) =>
  questions.reduce((acc, q) => acc + (q?.questions?.length ?? 0), 0);

const computeLocalStats = (session) => {
  let answeredCorrectly = 0,
    statPoints = 0,
    totalPoints = 0;

  session?.questions?.forEach((quest) => {
    quest?.questions?.forEach((question) => {
      totalPoints += question.point;
      if (question?.answered?.correct) {
        answeredCorrectly += 1;
        statPoints += question.point;
      } else {
        statPoints -= 2;
      }
    });
  });

  return { answeredCorrectly, point: statPoints, total: totalPoints };
};

// ─── Sub-components ──────────────────────────────────────────────────────────

/**
 * Resolves the "real" stats, preferring server results over local computation.
 * Returns a normalised { pointsEarned, correctAnswers, totalQuestions, accuracy } object.
 */
const useResolvedStats = ({
  results,
  freemiumResults,
  competitionResults,
  localStat,
  session,
}) => {
  const serverData =
    results?.data ?? freemiumResults?.data ?? competitionResults?.data ?? null;

  return {
    pointsEarned: Number(
      serverData?.pointsEarned ?? localStat?.point ?? 0,
    ).toFixed(1),
    correctAnswers:
      serverData?.correctAnswers ?? localStat?.answeredCorrectly ?? 0,
    totalQuestions:
      serverData?.totalQuestions ?? getTotalQuestions(session?.questions) ?? 0,
    accuracy:
      serverData?.accuracy ?? localStat?.accuracy ?? localStat?.total ?? 0,
  };
};

/** Animated fade-in wrapper */
const FadeIn = ({ delay = 0, children, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
};

/** Result phase — congrats / bad-luck with tokens earned */
const ResultPhase = ({
  resolvedStats,
  lowPercent,
  msg,
  onShowStats,
  onRetry,
  onClose,
  canRetry,
}) => (
  <View style={styles.phaseContainer}>
    <FadeIn style={{ alignItems: "center" }}>
      <LottieAnimator
        name={lowPercent ? "person_float" : "congrats"}
        loop={Boolean(lowPercent)}
        style={styles.lottie}
      />
    </FadeIn>

    <FadeIn delay={120} style={styles.resultTextBlock}>
      <AppText style={styles.resultHeading} fontWeight="black" size={28}>
        {lowPercent ? "Too Bad" : "Congratulations!"}
      </AppText>
      <AppText fontWeight="semibold" style={styles.resultMsg}>
        {msg}
      </AppText>
    </FadeIn>

    <FadeIn delay={240} style={styles.tokenCard}>
      <AppText fontWeight="semibold" size="small" style={styles.tokenLabel}>
        TOKENS EARNED
      </AppText>
      <AppText fontWeight="black" size={36} style={styles.tokenValue}>
        {resolvedStats.pointsEarned}
        <AppText fontWeight="bold" size={16} style={{ color: colors.medium }}>
          {" "}
          GT
        </AppText>
      </AppText>
    </FadeIn>

    <FadeIn delay={320} style={styles.resultBtns}>
      <AppButton title="Close" type="white" onPress={onClose} />
      <AppButton title="View Stats" type="accent" onPress={onShowStats} />
      {canRetry && <AppButton title="Retry" onPress={onRetry} />}
    </FadeIn>
  </View>
);

/**
 * Compact header rendered above QuizCorrections inside StatsPhase.
 * Replaces the previous stacked layout with a tight scorecard strip,
 * saving ~120px of vertical space.
 */
const StatsHeader = ({ resolvedStats }) => (
  <View style={styles.statsHeader}>
    {/* Top row: title + points pill side by side */}
    <View style={styles.statsHeaderTop}>
      <AppText fontWeight="black" size={20} style={styles.statsTitle}>
        Quiz Stats
      </AppText>
      <View style={styles.pointsPill}>
        <AppText fontWeight="black" size={18} style={styles.pointsPillValue}>
          {resolvedStats.pointsEarned}
          <AppText fontWeight="bold" size={12} style={styles.pointsPillUnit}>
            {" "}
            GT
          </AppText>
        </AppText>
        <AppText
          fontWeight="medium"
          size="xsmall"
          style={styles.pointsPillLabel}
        >
          points earned
        </AppText>
      </View>
    </View>

    {/* Scorecard strip: correct answers + accuracy side by side */}
    <View style={styles.scorecardStrip}>
      <View style={styles.scorecardItem}>
        <AppText fontWeight="black" size={22} style={styles.scorecardValue}>
          {resolvedStats.correctAnswers}
          <AppText fontWeight="semibold" size={13} style={styles.scorecardSub}>
            /{resolvedStats.totalQuestions}
          </AppText>
        </AppText>
        <AppText
          fontWeight="medium"
          size="xsmall"
          style={styles.scorecardLabel}
        >
          Correct
        </AppText>
      </View>

      <View style={styles.scorecardDivider} />

      <View style={styles.scorecardItem}>
        <AppText fontWeight="black" size={22} style={styles.scorecardValue}>
          {resolvedStats.accuracy}
          <AppText fontWeight="semibold" size={13} style={styles.scorecardSub}>
            %
          </AppText>
        </AppText>
        <AppText
          fontWeight="medium"
          size="xsmall"
          style={styles.scorecardLabel}
        >
          Score
        </AppText>
      </View>
    </View>

    {/* Section divider */}
    <View style={styles.reviewDivider}>
      <View style={styles.reviewDividerLine} />
      <AppText fontWeight="heavy" size="small" style={styles.reviewDividerText}>
        QUESTIONS REVIEW
      </AppText>
      <View style={styles.reviewDividerLine} />
    </View>
  </View>
);

/** Stats phase — delegates all correction rendering to QuizCorrections */
const StatsPhase = ({
  resolvedStats,
  session,
  onBack,
  onRetry,
  onClose,
  canRetry,
}) => (
  <View style={styles.statsPhaseContainer}>
    <QuizCorrections
      data={session?.questions}
      ListHeaderComponent={<StatsHeader resolvedStats={resolvedStats} />}
      contentContainerStyle={styles.correctionsList}
    />

    {/* Actions pinned at bottom */}
    <View style={styles.statsBtns}>
      <AppButton title="Close" type="white" onPress={onClose} />
      <AppButton title="Back" type="accent" onPress={onBack} />
      {canRetry && <AppButton title="Retry" onPress={onRetry} />}
    </View>
  </View>
);

/** Multiplayer waiting indicator */
const WaitingBanner = () => (
  <View style={styles.waitingBanner}>
    <LottieAnimator name="loading" loop style={{ width: 48, height: 48 }} />
    <AppText fontWeight="semibold" style={{ marginLeft: 10 }}>
      Waiting for the remaining players…
    </AppText>
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const FinishedQuiz = ({
  hideModal,
  data,
  retried,
  retry,
  sessionId,
  session,
  duration,
}) => {
  const [phase, setPhase] = useState(PHASE.RESULT);
  const [localStat, setLocalStat] = useState({
    answeredCorrectly: 0,
    point: 0,
    total: 0,
    isFinal: false,
  });
  const [leaderboard, setLeaderboard] = useState(session?.leaderboard ?? []);

  const [submitQuiz] = useSubmitQuizMutation();
  const [submitFreemiumQuiz, { data: freemiumResults }] =
    useSubmitFreemiumQuizMutation();
  const [submitPremiumQuiz, { data: results }] = useSubmitPremiumQuizMutation();
  const [submitCompetitionQuiz, { data: competitionResults }] =
    useSubmitCompetitionQuizMutation();

  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);

  const isMultiplayer = Boolean(sessionId);
  const resolvedStats = useResolvedStats({
    results,
    freemiumResults,
    competitionResults,
    localStat,
    session,
  });

  const percentage = Math.round(
    (localStat.point / (localStat.total || 1)) * 100,
  );
  const lowPercent = percentage < 50;
  const competitionRank = competitionResults?.data?.rank;
  const canRetry = !isMultiplayer && data?.type !== "competition";

  const msg =
    data?.type === "competition" && competitionRank
      ? `You finished #${competitionRank} in the Monthly Tournament!`
      : lowPercent
        ? "Hard luck! Study more and come back for more practice!"
        : "You've done well — retake the quiz or move to the next topic.";

  // ── Side effects ──────────────────────────────────────────────────────────

  useEffect(() => {
    socket.emit("quiz_end", { sessionId, user: getUserProfile(user) });

    const stats = computeLocalStats(session);
    setLocalStat((prev) => ({ ...prev, ...stats }));

    uploadQuizSession();
  }, [session]);

  useEffect(() => {
    socket.on("leaderboard_update", ({ leaderboard: lb, isFinal, stats }) => {
      setLeaderboard(lb);
      if (isFinal) {
        setLocalStat((prev) => ({ ...stats[user?._id], isFinal: true }));
      }
    });
    return () => socket.off("leaderboard_update");
  }, []);

  // ── Submission ────────────────────────────────────────────────────────────

  const uploadQuizSession = async () => {
    if (isMultiplayer) return;

    const payload = {
      ...data,
      ...session,
      retried,
      ...(duration != null ? { duration } : {}),
    };

    const handlers = {
      school: () => submitQuiz(payload).unwrap(),
      freemium: () => submitFreemiumQuiz(payload).unwrap(),
      competition: () =>
        submitCompetitionQuiz({
          competitionId: data.competitionId,
          questions: session?.questions,
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

  // ── Render ────────────────────────────────────────────────────────────────

  // MULTIPLAYER: show leaderboard until finals are in, then stats
  if (isMultiplayer) {
    return (
      <View style={styles.container}>
        {!localStat.isFinal ? (
          <View
            style={[styles.leaderboardContainer, { paddingTop: insets.top }]}
          >
            <AppText
              size="xlarge"
              fontWeight="heavy"
              style={styles.leaderboardTitle}
            >
              Quiz Leaderboard
            </AppText>
            <FlatList
              data={leaderboard}
              keyExtractor={(item, index) =>
                item?._id?.toString() ?? `lb-${index}`
              }
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={() => (
                <LeaderboardWinners
                  isPro={false}
                  data={leaderboard?.slice(0, 3)}
                />
              )}
              ListHeaderComponentStyle={{ backgroundColor: colors.accent }}
              ListFooterComponent={
                <View
                  style={
                    leaderboard?.length < 4
                      ? styles.leaderboardFooterSmall
                      : styles.leaderboardFooter
                  }
                >
                  <LottieAnimator
                    name="congrats"
                    loop={false}
                    style={{ width: width * 0.8, height: width * 0.8 }}
                  />
                </View>
              }
              renderItem={({ item, index }) => (
                <LeaderboardItem item={item} isPro={false} index={index} />
              )}
            />
            <WaitingBanner />
          </View>
        ) : (
          // Finals are in — show stats
          <View style={[styles.statsPhaseContainer, { marginTop: insets.top }]}>
            <StatsPhase
              resolvedStats={resolvedStats}
              session={session}
              onBack={() => {}}
              onClose={hideModal}
              canRetry={false}
            />
            <View style={styles.resultBtns}>
              <AppButton title="Close" type="white" onPress={hideModal} />
              <AppButton
                title={`${phase === PHASE.STATS ? "Hide" : "View"} Corrections`}
                type="accent"
                onPress={() =>
                  setPhase((p) =>
                    p === PHASE.STATS ? PHASE.RESULT : PHASE.STATS,
                  )
                }
              />
            </View>
          </View>
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
          msg={msg}
          onShowStats={() => setPhase(PHASE.STATS)}
          onRetry={retry}
          onClose={hideModal}
          canRetry={canRetry}
        />
      ) : (
        <StatsPhase
          resolvedStats={resolvedStats}
          session={session}
          onBack={() => setPhase(PHASE.RESULT)}
          onRetry={retry}
          onClose={hideModal}
          canRetry={canRetry}
        />
      )}
    </View>
  );
};

export default FinishedQuiz;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.unchange,
  },
  phaseContainer: {
    flex: 1,
    width,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  statsPhaseContainer: {
    flex: 1,
    width,
    backgroundColor: colors.unchange,
    borderRadius: 20,
    marginVertical: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 2, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 6,
    paddingTop: 16,
  },

  // Result phase
  lottie: {
    width: width * 0.72,
    height: width * 0.72,
  },
  resultTextBlock: {
    alignItems: "center",
    marginBottom: 18,
    paddingHorizontal: 24,
  },
  resultHeading: {
    textAlign: "center",
    color: colors.medium,
    marginBottom: 8,
  },
  resultMsg: {
    textAlign: "center",
    color: colors.medium,
    maxWidth: "80%",
  },
  tokenCard: {
    alignItems: "center",
    backgroundColor: colors.warningLight + "45",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 36,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  tokenLabel: {
    letterSpacing: 1.2,
    color: colors.medium,
    marginBottom: 4,
  },
  tokenValue: {
    color: colors.warning,
  },
  resultBtns: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    paddingTop: 8,
  },

  // Stats phase
  statsHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  statsHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statsTitle: {
    color: colors.medium,
  },
  pointsPill: {
    backgroundColor: colors.warningLight + "45",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning,
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  pointsPillValue: {
    color: colors.warning,
    lineHeight: 22,
  },
  pointsPillUnit: {
    color: colors.medium,
  },
  pointsPillLabel: {
    color: colors.medium,
  },
  scorecardStrip: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  scorecardItem: {
    flex: 1,
    alignItems: "center",
  },
  scorecardValue: {
    color: colors.medium,
  },
  scorecardSub: {
    color: colors.lightly,
  },
  scorecardLabel: {
    color: colors.medium,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  scorecardDivider: {
    width: 1,
    backgroundColor: colors.lightly,
    marginVertical: 4,
  },
  reviewDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  reviewDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.lightly,
  },
  reviewDividerText: {
    color: colors.medium,
    letterSpacing: 1,
  },
  correctionsList: {
    paddingBottom: 12,
  },
  statsBtns: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lightly,
  },

  // Multiplayer / leaderboard
  leaderboardContainer: {
    flex: 1,
    backgroundColor: colors.accent,
    width,
  },
  leaderboardTitle: {
    textAlign: "left",
    marginLeft: 15,
    marginTop: 8,
    marginBottom: 15,
    color: "#fff",
  },
  leaderboardFooter: {
    marginTop: 40,
    height: height * 0.5,
    backgroundColor: colors.unchange,
    alignItems: "center",
  },
  leaderboardFooterSmall: {
    height: height * 0.5,
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
    backgroundColor: colors.unchange,
    alignItems: "center",
  },
  waitingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: colors.unchange,
  },
});
