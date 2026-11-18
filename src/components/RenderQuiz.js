/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/refs */
import { Dimensions, FlatList, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useLocalSearchParams } from "expo-router";
import Animated, {
  FadeIn,
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppText from "../components/AppText";
import AppLogo from "./AppLogo";
import FinishedQuiz from "./FinishedQuiz";
import QuestionDisplay from "./QuestionDisplay";
import LottieAnimator from "./LottieAnimator";
import RenderStudySubjectTopic from "./RenderStudySubjectTopic";
import RenderCategories, { MAX_QUIZ_SUBJECTS } from "./RenderCategories";
import ModeSelection from "./ModeSelection";
import PopMessage from "./PopMessage";
import Screen from "./Screen";
import progressAnim from "../../assets/animations/progress.json";
import { useGetQuizQuestionsMutation } from "../context/schoolSlice";
import {
  useFetchCategoriesQuery,
  useFetchPremiumQuizMutation,
  useFetchSubjectCategoriesQuery,
} from "../context/instanceSlice";
import { selectUser } from "../context/usersSlice";
import { getUserProfile, socket } from "../helpers/helperFunctions";
import { Q, STEP_BY_VIEW, TONES } from "./quiz/QuizTheme";
import { slideIn } from "./quiz/QuizMotion";
import {
  Chip,
  FooterBar,
  QuizButton,
  QuizCard,
  QuizIconButton,
  QuizPrompt,
  StepHeader,
} from "./quiz/QuizUI";

const AnimatedLottie = Animated.createAnimatedComponent(LottieView);

const { width } = Dimensions.get("screen");

const QUIT_PROMPT = {
  title: "Exit Quiz",
  msg: "Are you sure you want to cancel this quiz session and miss out in earning points?",
  btn: "Quit",
  type: "quit",
};

const TIPS = [
  "Read every option before you pick one.",
  "Stay calm and trust your preparation.",
  "Check the corrections after the quiz to learn from every miss.",
  "Revisit topics you struggled with — repetition builds recall.",
];

const initials = {
  category: null,
  subjects: [],
  sessionId: null,
  view: "mode",
  qBank: [],
  mode: null,
  retried: false,
  invites: [],
};

/** "Get ready" / "Waiting for players" screen. */
const GetReady = ({ isMultiplayer, readyInvites, acceptedInvites, animatedProps, animProgress, onBack, onCancel }) => {
  const [tip, setTip] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTip((i) => (i + 1) % TIPS.length), 3600);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.ready}>
      <AppLogo hideName size={width * 0.26} />
      <AppText fontWeight="black" size={28} style={styles.readyTitle}>
        {isMultiplayer ? "Waiting for players…" : "Get ready!"}
      </AppText>

      {isMultiplayer && (
        <>
          <Chip
            icon="people"
            label={`${readyInvites?.length ?? 0} of ${acceptedInvites?.length ?? 0} ready`}
            color={TONES.purple.ink}
            bg={TONES.purple.soft}
            style={{ marginTop: 10 }}
          />
          <View style={styles.players}>
            {acceptedInvites?.map((inv) => (
              <Chip
                key={inv?._id}
                icon={inv?.isReady ? "checkmark-circle" : "time"}
                label={inv?.username ?? "Player"}
                color={inv?.isReady ? TONES.green.ink : Q.sub}
                bg={inv?.isReady ? TONES.green.soft : Q.track}
                style={{ margin: 3 }}
              />
            ))}
          </View>
        </>
      )}

      <AnimatedLottie
        animatedProps={animatedProps}
        source={progressAnim}
        progress={animProgress}
        autoPlay={false}
        loop={false}
        style={{ width: width * 0.99, height: 100, marginTop: 6 }}
      />

      <QuizCard tone="yellow" animateIn={false} style={styles.tip}>
        <Animated.View key={tip} entering={FadeIn.duration(300)} style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="bulb" size={20} color={TONES.yellow.ink} />
          <AppText fontWeight="semibold" size={13} style={{ color: "#4A4020", marginLeft: 10, flex: 1, lineHeight: 18 }}>
            {TIPS[tip]}
          </AppText>
        </Animated.View>
      </QuizCard>

      <View style={styles.readyBtns}>
        <QuizButton title="Go Back" icon="arrow-back" variant="ghost" small onPress={onBack} style={{ flex: 1 }} />
        <QuizButton title="Cancel" icon="close" variant="coral" small onPress={onCancel} style={{ flex: 1 }} />
      </View>
    </View>
  );
};

const RenderQuiz = ({ setVisible }) => {
  const { data: categories, isLoading: catLoad } = useFetchCategoriesQuery();
  const { isLobby, host, lobbyId, view, type, schoolId, quizId } = useLocalSearchParams();

  const [prompt, setPrompt] = useState({ vis: false, data: null });
  const [quizInfo, setQuizInfo] = useState(initials);
  const [popper, setPopper] = useState({ vis: false });
  const [hoster, setHoster] = useState(host ? JSON.parse(host) : null);
  const [session, setSession] = useState({ totalQuestions: 1, questions: [] });

  const quizStartTimeRef = useRef(null);
  const [quizDuration, setQuizDuration] = useState(null);

  const { data: subjects, isLoading: subjLoad } = useFetchSubjectCategoriesQuery(quizInfo?.category?._id, {
    skip: !Boolean(quizInfo?.category?._id),
  });

  const [getQuizQuestions, { data: quizzes }] = useGetQuizQuestionsMutation(); // schools
  const [fetchPremiumQuiz, { data: quizData }] = useFetchPremiumQuizMutation();

  const animProgress = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);

  const animatedProps = useAnimatedProps(() => ({ progress: animProgress.value }));

  /**
   * Functional merge. Children get this instead of `{...quizInfo, ...data}`,
   * so socket handlers registered once can no longer overwrite state with a
   * stale copy of quizInfo.
   */
  const patch = useCallback(
    (data) =>
      setQuizInfo((prev) => ({
        ...prev,
        ...(typeof data === "function" ? data(prev) : data),
      })),
    [],
  );

  const isCategory = quizInfo.view === "category";
  const isSelection = quizInfo.view === "mode";
  const isStudy = quizInfo.view === "study";
  const isQuiz = quizInfo.view === "quiz";
  const isSubjects = quizInfo.view === "subjects";
  const isStart = quizInfo.view === "start";
  const isFinished = quizInfo.view === "finished";
  const isMultiplayer = Boolean(quizInfo.mode === "friends" || quizInfo.sessionId);
  const stepIndex = STEP_BY_VIEW[quizInfo.view] ?? 0;

  const hasStudiedAllTopics =
    quizInfo.subjects?.length > 0 &&
    quizInfo.subjects.every(
      (obj) => obj?.topics?.filter((t) => t.visible)?.every((t) => t.hasStudied === true) ?? false,
    );

  const remainingTopics = (quizInfo.subjects ?? []).reduce(
    (n, s) => n + (s.topics?.filter((t) => t.visible && !t.hasStudied).length ?? 0),
    0,
  );

  const acceptedInvites = quizInfo.invites?.filter((inv) => inv?.status === "accepted") ?? [];
  const readyInvites = quizInfo.invites?.filter((inv) => inv?.isReady === true) ?? [];

  // Next is enabled per step (previously a multiplayer invite enabled it everywhere).
  const canNext =
    (isCategory && Boolean(quizInfo.category)) ||
    (isSubjects && quizInfo.subjects?.length > 0) ||
    (isStudy && hasStudiedAllTopics);

  const showFooter = isCategory || isSubjects || isStudy;

  // direction of travel for the step transition
  const prevStep = useRef(stepIndex);
  const dir = useRef(1);
  if (prevStep.current !== stepIndex) {
    dir.current = stepIndex > prevStep.current ? 1 : -1;
    prevStep.current = stepIndex;
  }

  const askQuit = () => setPrompt({ vis: true, data: QUIT_PROMPT });

  const handlePrompt = (promptType) => {
    switch (promptType) {
      case "quit":
        if (isMultiplayer) {
          socket.emit("invite_response", {
            sessionId: lobbyId ?? quizInfo.sessionId,
            user: getUserProfile(user),
            status: "rejected",
          });
        }
        setVisible(false);
        break;
      default:
        break;
    }
  };

  const handleNext = async () => {
    if (isCategory && quizInfo.category) {
      if (isMultiplayer) {
        socket.emit("mode_category", { sessionId: quizInfo.sessionId, category: quizInfo.category });
      }
      patch({ view: "subjects" });
    } else if (isSubjects && quizInfo.subjects?.length) {
      if (isMultiplayer) {
        socket.emit("mode_subjects", { sessionId: quizInfo.sessionId, subjects: quizInfo.subjects });
      }
      patch({ view: "study" });
    } else if (isStudy && hasStudiedAllTopics) {
      patch({ view: "quiz" });
      await fetchQuiz();
    } else if (isSelection) {
      patch({ view: "category" });
    }
  };

  const handleGoBack = () => {
    switch (quizInfo.view) {
      case "subjects":
        patch({ view: "category" });
        break;
      case "study":
        patch({ view: "subjects" });
        break;
      case "category":
        patch({ view: "mode" });
        break;
      default:
        break;
    }
  };

  // Only the topic that is visible AND ticked is sent to the server.
  const studiedTopics = (item) => item?.topics?.filter((t) => t?.visible && t?.hasStudied) ?? [];

  const fetchQuiz = async () => {
    if (type === "school") {
      animProgress.value = 0;
      try {
        const res = await getQuizQuestions({ quizId, type, schoolId }).unwrap();
        animProgress.value = withTiming(1, { duration: 1000 }, (finished) => {
          if (finished && Boolean(res?.data)) runOnJS(patch)({ view: "start" });
        });
      } catch (err) {}
    } else {
      animProgress.value = withTiming(0, { duration: 1 });

      if (!isMultiplayer) {
        animProgress.value = withTiming(0.6, { duration: 20000 }, (finished) => {
          if (finished) animProgress.value = withTiming(0.85, { duration: 35000 });
        });
      }

      const sendData = {
        categoryId: quizInfo?.category?._id,
        subjects: quizInfo?.subjects?.map((item) => ({
          _id: item._id,
          topics: studiedTopics(item).map((t) => t?._id),
        })),
        invites: quizInfo.invites,
        mode: quizInfo.mode,
      };

      try {
        const res = await fetchPremiumQuiz(sendData).unwrap();

        if (isMultiplayer) {
          socket.emit("mode_topics", {
            sessionId: quizInfo.sessionId,
            quizData: res?.data,
            subjects: quizInfo.subjects?.map((item) => ({ ...item, topics: studiedTopics(item) })),
          });
          return;
        }

        animProgress.value = withTiming(1, { duration: 1000 }, (finished) => {
          if (finished && Boolean(res?.data)) runOnJS(patch)({ view: "start" });
        });
      } catch (errr) {
        animProgress.value = withTiming(1, { duration: 800 });
        setPopper({
          vis: true,
          msg: errr?.data?.message ?? "Something went wrong",
          type: "failed",
          timer: 10000,
          cb: () => {
            if (!isMultiplayer) {
              animProgress.value = 0;
              patch({ view: "study" });
            }
          },
        });
      }
    }
  };

  useEffect(() => {
    if (isStart) quizStartTimeRef.current = Date.now();
  }, [isStart]);

  useEffect(() => {
    if (isFinished && quizStartTimeRef.current !== null) {
      setQuizDuration(Date.now() - quizStartTimeRef.current);
      quizStartTimeRef.current = null;
    }
  }, [isFinished]);

  useEffect(() => {
    if (view) {
      patch({ view });
      fetchQuiz();
    }
  }, [view]);

  useEffect(() => {
    if (isMultiplayer) {
      const newValue = Math.min((readyInvites.length || 0) / (acceptedInvites.length || 1), 1);
      animProgress.value = withTiming(newValue, { duration: 2000 });
    }
  }, [readyInvites.length, acceptedInvites.length]);

  useEffect(() => {
    socket.on("session_snapshots", (sessionDta) => {
      setHoster(sessionDta.host);
      setQuizInfo((prev) => ({
        ...prev,
        invites: sessionDta.users ? sessionDta.users.map((u) => ({ ...u })) : [],
      }));
    });
    return () => socket.off("session_snapshots");
  }, []);

  useEffect(() => {
    socket.on("quiz_start", ({ qBank }) => {
      setQuizInfo((prev) => ({ ...prev, view: "start", qBank }));
    });
    return () => socket.off("quiz_start");
  }, []);

  useEffect(() => {
    socket.on("session_created", (sessionDta) => {
      setQuizInfo((prev) => ({ ...prev, sessionId: sessionDta.sessionId, invites: sessionDta.users }));
    });
    return () => socket.off("session_created");
  }, []);

  useEffect(() => {
    if (!quizInfo.sessionId) setQuizInfo((prev) => ({ ...prev, sessionId: lobbyId }));
  }, [lobbyId]);

  // ── Step bodies ────────────────────────────────────────────────────────────

  const renderStep = () => {
    if (isStudy) return <RenderStudySubjectTopic quizInfo={quizInfo} setQuizInfo={patch} />;

    if (isCategory || isSubjects) {
      const list = isCategory ? categories?.data : subjects?.data;
      return (
        <View style={{ flex: 1 }}>
          <FlatList
            data={list}
            numColumns={2}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={{ justifyContent: "center" }}
            contentContainerStyle={styles.grid}
            ListHeaderComponent={
              isSubjects ? (
                <View style={styles.counter}>
                  <Chip
                    icon="checkmark-done"
                    label={`${quizInfo.subjects?.length ?? 0}/${MAX_QUIZ_SUBJECTS} picked`}
                    color={quizInfo.subjects?.length === MAX_QUIZ_SUBJECTS ? "#fff" : TONES.coral.ink}
                    bg={quizInfo.subjects?.length === MAX_QUIZ_SUBJECTS ? TONES.coral.face : TONES.coral.soft}
                  />
                </View>
              ) : null
            }
            renderItem={({ item, index }) => (
              <RenderCategories
                item={item}
                index={index}
                quizInfo={quizInfo}
                checkLevel={isCategory}
                levelErr={() =>
                  setPopper({ vis: true, type: "failed", msg: "You're not eligible for this category" })
                }
                onLimit={() =>
                  setPopper({
                    vis: true,
                    type: "failed",
                    msg: `You can pick up to ${MAX_QUIZ_SUBJECTS} subjects`,
                    timer: 1500,
                  })
                }
                setQuizInfo={patch}
              />
            )}
          />
          <LottieAnimator visible={isCategory ? catLoad : subjLoad} absolute wTransparent />
        </View>
      );
    }

    return (
      <ModeSelection
        isLobby={Boolean(isLobby)}
        lobby={{ host: hoster }}
        sessionId={quizInfo.sessionId}
        setPop={setPopper}
        setState={patch}
      />
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]}>
      {isFinished ? (
        <FinishedQuiz
          session={session}
          sessionId={quizInfo.sessionId ?? lobbyId}
          retried={quizInfo.retried}
          duration={quizDuration}
          data={
            type === "school"
              ? { type: "school", schoolId, quizId, mode: quizInfo?.mode }
              : { type: "premium", mode: quizInfo?.mode }
          }
          retry={() => patch({ view: "start", retried: true })}
          hideModal={() => setVisible(false)}
        />
      ) : isStart ? (
        <Screen>
          <QuestionDisplay
            handleQuit={() => setPrompt({ vis: true, penalize: true, data: QUIT_PROMPT })}
            setQuizInfoView={(val) => patch({ view: val })}
            hardReset={() => setQuizInfo(initials)}
            setQuizSession={setSession}
            sessionId={quizInfo.sessionId ?? lobbyId}
            questionBank={quizzes?.data ?? quizData?.data ?? quizInfo?.qBank ?? []}
          />
        </Screen>
      ) : isQuiz ? (
        <Screen>
          <GetReady
            isMultiplayer={isMultiplayer}
            readyInvites={readyInvites}
            acceptedInvites={acceptedInvites}
            animatedProps={animatedProps}
            animProgress={animProgress}
            onBack={() => patch({ view: "study" })}
            onCancel={askQuit}
          />
        </Screen>
      ) : (
        <Screen>
          <View style={styles.wizard}>
            <StepHeader step={stepIndex} onClose={askQuit} />

            <Animated.View key={quizInfo.view} entering={slideIn(dir.current)} style={{ flex: 1 }}>
              {renderStep()}
            </Animated.View>

            {showFooter && (
              <FooterBar>
                <QuizIconButton icon="arrow-back" onPress={handleGoBack} />
                <QuizButton
                  style={{ flex: 1 }}
                  title={
                    isStudy
                      ? hasStudiedAllTopics
                        ? "Start Quiz"
                        : remainingTopics > 0
                          ? `Revise ${remainingTopics} more`
                          : "Loading topics…"
                      : "Next"
                  }
                  icon={isStudy ? "rocket" : "arrow-forward"}
                  variant={isStudy ? "yellow" : "primary"}
                  disabled={!canNext}
                  onPress={handleNext}
                />
              </FooterBar>
            )}
          </View>
        </Screen>
      )}

      <QuizPrompt prompt={prompt} setPrompt={setPrompt} onPress={handlePrompt} />
      <PopMessage popData={popper} setPopData={setPopper} />
      <StatusBar style="dark" />
    </View>
  );
};

export default RenderQuiz;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Q.paper },
  wizard: { flex: 1, backgroundColor: Q.paper },
  grid: { paddingHorizontal: 11, paddingBottom: 16, paddingTop: 2 },
  counter: { alignItems: "center", marginBottom: 12 },
  ready: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, backgroundColor: Q.paper },
  readyTitle: { color: Q.ink, marginTop: 24 },
  players: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 10 },
  tip: { width: "100%", marginTop: 6, marginBottom: 20 },
  readyBtns: { flexDirection: "row", gap: 10, width: "100%" },
});
