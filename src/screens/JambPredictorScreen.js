/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Modal, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import Animated, { FadeIn } from "react-native-reanimated";

import Screen from "../components/Screen";
import AppLogo from "../components/AppLogo";
import AppText from "../components/jamb/JambText";
import SubStatus from "../components/SubStatus";
import JambIntroStep from "../components/jamb/JambIntroStep";
import JambSubjectStep from "../components/jamb/JambSubjectStep";
import JambOverviewStep from "../components/jamb/JambOverviewStep";
import JambQuizStep from "../components/jamb/JambQuizStep";
import JambResultStep from "../components/jamb/JambResultStep";
import LottieAnimator from "../components/LottieAnimator";
import { T } from "../components/jamb/JambTheme";
import { JambButton, JambPressable } from "../components/jamb/JambUI";
import { slideIn, slideOut } from "../components/jamb/JambMotion";
import { useJambSummary } from "../components/jamb/useJambSummary";
import jambService from "../services/jambService";
import { JambError, isRetryable } from "../services/jambApi";
import { selectUser } from "../context/usersSlice";
import { useFetchSubjectsQuery } from "../context/instanceSlice";

const STEPS = ["intro", "subjects", "overview", "quiz", "result"];

/**
 * Flow:
 *   intro -> subjects (pick 4) -> overview (pick what to practise now) -> quiz
 *        -> back to overview  (round not finished: finished subjects are locked)
 *        -> result            (ONLY when all four subjects of the round are done)
 * Premium only.
 */
const JambPredictorScreen = () => {
  const router = useRouter();
  const user = useSelector(selectUser);
  const [premiumDenied, setPremiumDenied] = useState(false); // server said 403
  const isPremium = Boolean(user?.subscription?.isActive) && !premiumDenied;

  const { data: subjectsData, isLoading: loadingSubjects } =
    useFetchSubjectsQuery();
  const subjects = subjectsData?.data ?? [];
  const { summary, refresh, error: summaryError } = useJambSummary();

  const [nav, setNav] = useState({ step: "intro", dir: 1 });
  const [selected, setSelected] = useState([]); // the 4 JAMB subjects
  const [practice, setPractice] = useState([]); // subset being practised now
  const [initialIds, setInitialIds] = useState([]);
  const [result, setResult] = useState(null); // completed ROUND result
  const [notice, setNotice] = useState(null);
  const [banner, setBanner] = useState(null); // transient error/info text
  const [busy, setBusy] = useState(null); // string label while a request runs
  const [retry, setRetry] = useState(null); // pending submit payload awaiting retry

  const stepRef = useRef("intro");
  stepRef.current = nav.step;

  useEffect(() => {
    jambService.clearLegacyStorage();
    jambService
      .getSavedSelection()
      .then(setInitialIds)
      .catch(() => {});
    // an unsent result from a previous run (offline / app killed at finish)
    jambService.loadPendingSubmit().then((p) => p && setRetry(p));
  }, []);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(t);
  }, [banner]);

  // Restore the saved 4-subject combination so users can jump straight in
  useEffect(() => {
    if (!subjects.length || selected.length || !initialIds.length) return;
    const restored = initialIds
      .map((id) => subjects.find((s) => s._id === id))
      .filter(Boolean);
    if (restored.length === initialIds.length) setSelected(restored);
  }, [subjects, initialIds]);

  /**
   * Two-phase navigation: update the direction first so the OUTGOING view's
   * exiting animation matches the direction, then swap the step next tick.
   */
  const go = useCallback((next) => {
    const dir = STEPS.indexOf(next) >= STEPS.indexOf(stepRef.current) ? 1 : -1;
    setNav((n) => ({ ...n, dir }));
    setTimeout(() => setNav({ step: next, dir }), 0);
  }, []);

  const exit = useCallback(() => router.back(), [router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      switch (stepRef.current) {
        case "subjects":
          go("intro");
          return true;
        case "overview":
          go("subjects");
          return true;
        case "quiz":
          return true; // use the Quit button inside the quiz
        default:
          return false;
      }
    });
    return () => sub.remove();
  }, [go]);

  const roundProgress = Object.keys(summary?.round?.completed ?? {}).length;

  const say = (text) => setNotice({ key: Date.now(), text });

  /** Maps a server error to the right UI reaction (never logs the user out). */
  const handleApiError = useCallback(
    async (e) => {
      const code = e instanceof JambError ? e.code : "UNKNOWN";
      switch (code) {
        case "PREMIUM_REQUIRED":
          setPremiumDenied(true);
          return;
        case "SELECTION_REQUIRED":
          setBanner("Please choose your 4 JAMB subjects first.");
          go("subjects");
          return;
        case "COOLDOWN_ACTIVE":
        case "SUBJECT_ALREADY_COMPLETED":
        case "ATTEMPT_EXPIRED":
        case "ATTEMPT_ABANDONED":
        case "NOT_FOUND":
          await jambService.clearPendingSubmit();
          setRetry(null);
          say(e.message || "That attempt is no longer available.");
          await refresh();
          go("overview");
          return;
        case "INSUFFICIENT_QUESTIONS":
        case "INVALID_SELECTION":
          setBanner(e.message || "We couldn't prepare that assessment.");
          go(stepRef.current === "quiz" ? "overview" : stepRef.current);
          return;
        case "RATE_LIMITED":
          setBanner("Too many requests. Please wait a moment and try again.");
          return;
        default:
          setBanner(e?.message || "Something went wrong. Please try again.");
          if (stepRef.current === "quiz") go("overview");
      }
    },
    [go, refresh],
  );

  useEffect(() => {
    if (
      summaryError instanceof JambError &&
      summaryError.code === "PREMIUM_REQUIRED"
    ) {
      setPremiumDenied(true);
    }
  }, [summaryError]);

  const handleSubjects = async (picked) => {
    // Same 4 subjects as already saved (order doesn't matter) -> nothing to
    // save, so skip the request + loader and go straight on.
    const saved = selected.length ? selected.map((s) => s._id) : initialIds;
    const pickedIds = picked.map((s) => s._id);
    const same =
      saved.length === pickedIds.length &&
      pickedIds.every((id) => saved.includes(id));
    if (same) {
      if (!selected.length) setSelected(picked);
      refresh(); // quiet background refresh, no blocking loader
      go("overview");
      return;
    }

    setBusy("Saving your subjects…");
    try {
      await jambService.saveSelection(picked.map((s) => s._id)); // new combo => new round
      setSelected(picked);
      await refresh();
      setBusy(null);
      go("overview");
    } catch (e) {
      setBusy(null);
      await handleApiError(e);
    }
  };

  /** Sends the persisted payload. Retryable failures keep it for Retry. */
  const submitPending = async (payload) => {
    setRetry(null);
    setBusy("Submitting your answers…");
    try {
      const out = await jambService.submitQuizResult(payload);
      await jambService.clearPendingSubmit();
      await refresh();
      setBusy(null);

      if (out.blocked) {
        say("Your next round isn't unlocked yet. This attempt wasn't counted.");
        go("overview");
        return;
      }

      if (out.complete && out.roundResult) {
        // Round finished -> NOW the prediction screen is allowed to show
        setResult(out.roundResult);
        go("result");
        return;
      }

      const names = out.subjectResults.map((r) => r.name).join(", ");
      const done = names ? `${names} completed. ` : "Subjects completed. ";
      say(
        `${done}${out.remaining} subject${out.remaining === 1 ? "" : "s"} left to unlock your score prediction.`,
      );
      go("overview");
    } catch (e) {
      setBusy(null);
      if (
        isRetryable(e) ||
        (e instanceof JambError && e.code === "SUBMIT_IN_PROGRESS")
      ) {
        setRetry(payload); // same Idempotency-Key on retry
      } else {
        await handleApiError(e);
      }
    }
  };

  const handleFinish = async (session, meta) => {
    const payload = {
      attemptId: meta.attemptId,
      idempotencyKey: meta.idempotencyKey,
      durationMs: meta.durationMs,
      answers: jambService.buildAnswers(session),
    };
    await jambService.savePendingSubmit(payload);
    await submitPending(payload);
  };

  const discardPending = async () => {
    await jambService.clearPendingSubmit();
    jambService.quitAttempt(retry?.attemptId);
    setRetry(null);
    go("overview");
  };

  const { step, dir } = nav;
  const entering = slideIn(dir);
  const exiting = slideOut(dir);

  const showHeader = step !== "quiz";
  const showBack = step === "intro" || step === "overview";

  const renderStep = () => {
    switch (step) {
      case "intro":
        return (
          <JambIntroStep summary={summary} onContinue={() => go("subjects")} />
        );
      case "subjects":
        return (
          <JambSubjectStep
            subjects={subjects}
            loading={loadingSubjects}
            initialIds={
              selected.length ? selected.map((s) => s._id) : initialIds
            }
            roundProgress={roundProgress}
            onBack={() => go("intro")}
            onContinue={handleSubjects}
          />
        );
      case "overview":
        return (
          <JambOverviewStep
            selected={selected}
            user={user}
            summary={summary}
            notice={notice}
            onExpire={refresh}
            onContinue={(subset) => {
              setBanner(null);
              setPractice(subset);
              go("quiz");
            }}
          />
        );
      case "quiz":
        return (
          <JambQuizStep
            selected={practice}
            onFinish={handleFinish}
            onQuit={() => go("overview")}
            onError={handleApiError}
          />
        );
      case "result":
        return result ? (
          <JambResultStep
            result={result}
            lifetimeCorrect={summary?.lifetimeCorrect ?? 0}
            summary={summary}
            onExpire={refresh}
            onRetake={() => go("overview")} // opens history while resting, otherwise a new round
            onDone={exit}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <View style={styles.root}>
      <Screen style={{ backgroundColor: "transparent" }}>
        {showHeader && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
            <View style={styles.headerLeft}>
              {showBack && (
                <JambPressable
                  onPress={() =>
                    step === "overview" ? go("subjects") : exit()
                  }
                  contentStyle={styles.backBtn}
                >
                  <Ionicons name="arrow-back" size={20} color={T.ink} />
                </JambPressable>
              )}
              <AppLogo />
            </View>
            <SubStatus isSubscribed={isPremium} />
          </Animated.View>
        )}

        <View style={styles.body}>
          {!isPremium ? (
            <Animated.View entering={FadeIn} style={styles.locked}>
              <View style={styles.lockIcon}>
                <Ionicons name="lock-closed" size={34} color={T.yellowInk} />
              </View>
              <AppText
                fontWeight="black"
                size={22}
                style={{ color: T.ink, marginTop: 18 }}
              >
                Premium feature
              </AppText>
              <AppText
                fontWeight="medium"
                size={14}
                style={{
                  color: T.sub,
                  textAlign: "center",
                  marginTop: 8,
                  lineHeight: 20,
                }}
              >
                The Guru JAMB Score Predictor is available to premium users
                only. Subscribe to unlock it.
              </AppText>
              <JambButton
                title="Go Back"
                icon="arrow-back"
                onPress={exit}
                style={{ marginTop: 24, alignSelf: "stretch" }}
              />
            </Animated.View>
          ) : (
            <Animated.View
              key={step}
              entering={entering}
              exiting={exiting}
              style={{ flex: 1 }}
            >
              {renderStep()}
            </Animated.View>
          )}
        </View>

        {Boolean(banner) && (
          <Animated.View entering={FadeIn} style={styles.banner}>
            <Ionicons name="alert-circle" size={18} color="#fff" />
            <AppText fontWeight="semibold" size={13} style={styles.bannerText}>
              {banner}
            </AppText>
          </Animated.View>
        )}
      </Screen>

      {/* Native Modal = always the full display, centred on the real screen
          (independent of Screen / safe-area / parent layout). */}
      <Modal
        visible={Boolean(busy)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.busyWrap}>
          <LottieAnimator size={110} />
          <AppText fontWeight="black" size={18} style={styles.busyText}>
            {busy}
          </AppText>
        </View>
      </Modal>

      <Modal
        visible={!busy && Boolean(retry)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.scrim}>
          <View style={styles.card}>
            <View style={styles.errIcon}>
              <Ionicons name="cloud-offline" size={36} color={T.coralDark} />
            </View>
            <AppText
              fontWeight="black"
              size={18}
              style={{ color: T.ink, marginTop: 14 }}
            >
              Couldn't send your answers
            </AppText>
            <AppText
              fontWeight="medium"
              size={13}
              style={{
                color: T.sub,
                textAlign: "center",
                marginTop: 6,
                lineHeight: 19,
              }}
            >
              Your answers are saved on this device. Check your connection and
              retry.
            </AppText>
            <JambButton
              title="Retry"
              icon="refresh"
              onPress={() => submitPending(retry)}
              style={{ marginTop: 20, alignSelf: "stretch" }}
            />
            <JambPressable
              onPress={discardPending}
              contentStyle={styles.discard}
            >
              <AppText fontWeight="bold" size={12.5} style={{ color: T.sub }}>
                Discard this attempt
              </AppText>
            </JambPressable>
          </View>
        </View>
      </Modal>

      <StatusBar style="dark" />
    </View>
  );
};

export default JambPredictorScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.paper },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 15,
    marginRight: 20,
    paddingVertical: 4,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.line,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  body: { flex: 1, overflow: "hidden" },
  banner: {
    position: "absolute",
    top: 70,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.coral,
    borderBottomWidth: 4,
    borderBottomColor: T.coralDark,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    zIndex: 50,
  },
  bannerText: { color: "#fff", marginLeft: 8, flex: 1 },
  busyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(255,248,231,0.97)",
  },
  busyText: { color: T.ink, marginTop: 14, textAlign: "center" },
  scrim: {
    flex: 1,
    backgroundColor: "rgba(30,42,74,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: T.line,
    padding: 22,
    alignItems: "center",
  },
  errIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: T.coralSoft,
    borderWidth: 2,
    borderColor: T.coralLine,
    alignItems: "center",
    justifyContent: "center",
  },
  discard: { marginTop: 14, paddingVertical: 8, paddingHorizontal: 14 },
  locked: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  lockIcon: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: T.yellowSoft,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: T.yellowLine,
    alignItems: "center",
    justifyContent: "center",
  },
});
