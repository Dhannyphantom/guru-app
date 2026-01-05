/* eslint-disable react-hooks/exhaustive-deps */
import { Dimensions, FlatList, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import LottieView from "lottie-react-native";

import AppText from "../components/AppText";
import PromptModal from "./PromptModal";
import { useEffect, useState } from "react";
import FinishedQuiz from "./FinishedQuiz";
import AppButton from "./AppButton";
import QuestionDisplay from "./QuestionDisplay";
import AppLogo from "./AppLogo";
import LottieAnimator from "./LottieAnimator";
import ProgressBar from "./ProgressBar";
import RenderStudySubjectTopic from "./RenderStudySubjectTopic";
import RenderCategories from "./RenderCategories";
import { enterAnimOther, exitingAnim } from "../helpers/dataStore";
import colors from "../helpers/colors";
import Screen from "./Screen";
import Animated, {
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import ModeSelection from "./ModeSelection";
import { useGetQuizQuestionsMutation } from "../context/schoolSlice";
import progressAnim from "../../assets/animations/progress.json";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFetchCategoriesQuery,
  useFetchPremiumQuizMutation,
  useFetchSubjectCategoriesQuery,
} from "../context/instanceSlice";
import { useLocalSearchParams } from "expo-router";
import { getUserProfile, socket } from "../helpers/helperFunctions";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";

const AnimatedLottie = Animated.createAnimatedComponent(LottieView);

const { width } = Dimensions.get("screen");

const QUIT_PROMPT = {
  title: "Exit Quiz",
  msg: "Are you sure you want to cancel this quiz session and miss out in earning points?",
  btn: "Quit",
  type: "quit",
};

const RenderQuiz = ({ setVisible, data }) => {
  // data = {view, type}
  const { data: categories, isLoading: catLoad } = useFetchCategoriesQuery();

  const [prompt, setPrompt] = useState({ vis: false, data: null });
  const [quizInfo, setQuizInfo] = useState({
    category: null,
    subjects: [],
    // view: "quiz",
    sessionId: null,
    view: "mode",
    qBank: [],
    mode: null,
    invites: [],
    bar: 1,
  });
  const [session, setSession] = useState({
    totalQuestions: 1,
    questions: [],
  });

  const { data: subjects, isLoading: subjLoad } =
    useFetchSubjectCategoriesQuery(quizInfo?.category?._id);

  const { isLobby, host, lobbyId } = useLocalSearchParams();

  const [getQuizQuestions, { data: quizzes }] = useGetQuizQuestionsMutation();
  const [fetchPremiumQuiz, { data: quizData }] = useFetchPremiumQuizMutation();

  // const lottieRef = useRef();
  // const animProgress = useRef(new RNAnimated.Value(0)).current;
  const animProgress = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);

  const animatedProps = useAnimatedProps(() => {
    return {
      progress: animProgress.value,
    };
  });

  const isCategory = quizInfo.view === "category";
  const isSelection = quizInfo.view === "mode";
  const isStudy = quizInfo.view === "study";
  const isQuiz = quizInfo.view === "quiz";
  const isSubjects = quizInfo.view === "subjects";
  const isStart = quizInfo.view === "start";
  const isFinished = quizInfo.view === "finished";
  const isMultiplayer = quizInfo.mode === "friends" || quizInfo.sessionId;
  const hasStudiedAllTopics = quizInfo?.subjects
    ?.map((obj) => {
      if (
        obj?.topics
          ?.filter((topic) => topic.visible)
          ?.every((topic) => topic.hasStudied === true)
      ) {
        return true;
      } else {
        return false;
      }
    })
    .every((item) => item === true);

  const acceptedInvites = quizInfo.invites?.filter(
    (inv) => inv?.status === "accepted"
  );

  const readyInvites =
    quizInfo.invites?.filter((inv) => inv?.isReady === true) || [];

  const hasAcceptedInvites = Boolean(acceptedInvites);

  const shouldShowNextBtn =
    !isStudy &&
    ((isCategory && Boolean(quizInfo.category)) ||
      (!isSelection && Boolean(quizInfo.invites[0]) && hasAcceptedInvites) ||
      (isSubjects && Boolean(quizInfo.subjects[0])));

  const handlePrompt = (type) => {
    switch (type) {
      case "quit":
        if (isLobby) {
          socket.emit("invite_response", {
            sessionId: lobbyId,
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
    if (quizInfo.category && isCategory) {
      if (isMultiplayer) {
        socket.emit("mode_category", {
          sessionId: quizInfo.sessionId,
          category: quizInfo.category,
        });
      }
      setQuizInfo({ ...quizInfo, view: "subjects", bar: 3 });
    } else if (quizInfo.category && quizInfo.subjects && isSubjects) {
      // show quiz
      if (isMultiplayer) {
        socket.emit("mode_subjects", {
          sessionId: quizInfo.sessionId,
          subjects: quizInfo.subjects,
        });
      }

      setQuizInfo({ ...quizInfo, view: "study", bar: 4 });
    } else if (
      quizInfo.category &&
      quizInfo.subjects &&
      hasStudiedAllTopics &&
      isStudy
    ) {
      setQuizInfo({ ...quizInfo, view: "quiz" });
      // fetch Quiz Question;
      await fetchQuiz();
    } else if (isSelection) {
      setQuizInfo({ ...quizInfo, view: "category", bar: 2 });
    }
  };

  const handleGoBack = () => {
    switch (quizInfo.view) {
      case "subjects":
        setQuizInfo({ ...quizInfo, view: "category", bar: 2 });
        break;
      case "study":
        setQuizInfo({ ...quizInfo, view: "subjects", bar: 3 });
        break;
      case "category":
        setQuizInfo({ ...quizInfo, view: "mode", bar: 1 });
        break;

      default:
        break;
    }
  };

  const fetchQuiz = async () => {
    if (data?.type === "school") {
      try {
        await getQuizQuestions({
          quizId: data?.quizId,
          type: data?.type,
          schoolId: data?.schoolId,
        }).unwrap();
      } catch (_err) {}
    } else {
      animProgress.value = withTiming(0, { duration: 1 });
      // Student Premium Quiz

      if (!isMultiplayer) {
        animProgress.value = withTiming(
          0.6,
          { duration: 20000 },
          (finished) => {
            if (finished) {
              animProgress.value = withTiming(0.85, { duration: 35000 });
            }
          }
        );
      }

      // fetch Quiz

      const sendData = {
        categoryId: quizInfo?.category?._id,
        subjects: quizInfo?.subjects?.map((item) => ({
          _id: item._id,
          topics: item?.topics
            ?.filter((topic) => topic?.hasStudied)
            ?.map((topic) => topic?._id),
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
            subjects: quizInfo.subjects?.map((item) => ({
              ...item,
              topics: item?.topics?.filter((topic) => topic?.hasStudied),
            })),
          });
          return;
        }

        animProgress.value = withTiming(1, { duration: 1000 }, (finished) => {
          if (finished && Boolean(res?.data)) {
            //
            runOnJS(setQuizInfo)({ ...quizInfo, view: "start" });
          }
        });
      } catch (_error) {}
    }
  };

  useEffect(() => {
    if (data?.view) {
      setQuizInfo({ ...quizInfo, view: data?.view });
      fetchQuiz();
    }
  }, [data]);

  useEffect(() => {
    if (isMultiplayer) {
      const newValue = Math.min(
        (readyInvites?.length || 0) / (acceptedInvites?.length || 1),
        1
      );
      animProgress.value = withTiming(newValue, { duration: 1500 });
    }
  }, [readyInvites, quizInfo.invites]);

  // player_ready
  // session_snapshots
  useEffect(() => {
    socket.on("session_snapshots", (sessionDta) => {
      // keep parent in sync

      setQuizInfo((prev) => ({
        ...prev,
        invites: sessionDta.users
          ? sessionDta.users.map((u) => ({ ...u }))
          : [],
      }));
    });

    return () => socket.off("session_snapshots");
  }, []);

  useEffect(() => {
    socket.on("quiz_start", ({ qBank }) => {
      setQuizInfo((prev) => ({ ...prev, view: "start", qBank }));
      // setIsQuiz(true);     // or navigate to quiz screen
      // startQuiz();        // your existing function
    });

    return () => socket.off("quiz_start");
  }, []);

  useEffect(() => {
    socket.on("session_created", (sessionDta) => {
      setQuizInfo((prev) => ({
        ...prev,
        sessionId: sessionDta.sessionId,
        invites: sessionDta.users,
      }));
    });

    return () => socket.off("session_created");
  }, []);

  useEffect(() => {
    if (!quizInfo.sessionId) {
      setQuizInfo((prev) => ({ ...prev, sessionId: lobbyId }));
    }
  }, [lobbyId]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]}>
      {isFinished ? (
        <Screen>
          <FinishedQuiz
            session={session}
            data={
              data?.type === "school"
                ? { type: "school", mode: quizInfo?.mode }
                : { type: "premium", mode: quizInfo?.mode }
            }
            retry={() => setQuizInfo({ ...quizInfo, view: "start" })}
            hideModal={() => setVisible(false)}
          />
        </Screen>
      ) : isStart ? (
        <Screen>
          <QuestionDisplay
            handleQuit={() => setPrompt({ vis: true, data: QUIT_PROMPT })}
            setQuizInfoView={(val) => setQuizInfo({ ...quizInfo, view: val })}
            setQuizSession={setSession}
            sessionId={quizInfo.sessionId ?? lobbyId}
            questionBank={
              quizzes?.data ?? quizData?.data ?? quizInfo?.qBank ?? []
            }
          />
        </Screen>
      ) : isQuiz ? (
        <Screen>
          <Animated.View entering={enterAnimOther} style={styles.quiz}>
            <AppLogo hideName size={width * 0.3} />
            <AppText
              fontWeight="heavy"
              style={{ color: colors.primary, marginTop: 50 }}
              size={"xxlarge"}
            >
              {isMultiplayer ? "Waiting for players..." : "Get Ready..."}
            </AppText>
            {isMultiplayer && (
              <AppText
                fontWeight="heavy"
                style={{ color: colors.primary, marginTop: 50 }}
                size={"xxlarge"}
              >
                {readyInvites?.length} of {acceptedInvites?.length}
              </AppText>
            )}

            <AnimatedLottie
              animatedProps={animatedProps}
              source={progressAnim}
              progress={animProgress}
              autoPlay={false}
              loop={false}
              style={{ width: width * 0.99, height: 100 }}
            />
            <AppButton
              title={"Cancel Session"}
              type="warn"
              // onPress={async () => await fetchQuiz()}
              onPress={() => setPrompt({ vis: true, data: QUIT_PROMPT })}
            />
          </Animated.View>
        </Screen>
      ) : (
        <Screen>
          <AppText fontWeight="heavy" style={styles.title} size={"xlarge"}>
            {isStudy ? "Subject Topics" : `Select ${quizInfo.view}`}
          </AppText>
          <ProgressBar numberOfBars={4} currentBar={quizInfo.bar} />
          <View style={styles.main}>
            {isStudy ? (
              <RenderStudySubjectTopic
                quizInfo={quizInfo}
                setQuizInfo={(valObj) =>
                  setQuizInfo({ ...quizInfo, ...valObj })
                }
              />
            ) : (
              <View style={{ flex: 1 }}>
                {isSelection && (
                  <ModeSelection
                    isLobby={Boolean(isLobby)}
                    lobby={{ host: host ? JSON.parse(host) : null }}
                    sessionId={quizInfo.sessionId}
                    setState={(data) => setQuizInfo({ ...quizInfo, ...data })}
                  />
                )}
                {isCategory && (
                  <Animated.View
                    style={{ flex: 1 }}
                    entering={enterAnimOther}
                    exiting={exitingAnim}
                  >
                    <FlatList
                      data={categories?.data}
                      numColumns={2}
                      keyExtractor={(item) => item._id}
                      renderItem={({ item }) => (
                        <RenderCategories
                          item={item}
                          quizInfo={quizInfo}
                          setQuizInfo={(valObj) =>
                            setQuizInfo({ ...quizInfo, ...valObj })
                          }
                        />
                      )}
                    />
                    <LottieAnimator visible={catLoad} absolute wTransparent />
                  </Animated.View>
                )}

                {isSubjects && (
                  <Animated.View
                    style={{ width }}
                    entering={enterAnimOther}
                    exiting={exitingAnim}
                  >
                    <FlatList
                      data={subjects?.data}
                      numColumns={2}
                      keyExtractor={(item) => item._id}
                      contentContainerStyle={{ alignItems: "center" }}
                      renderItem={({ item }) => (
                        <RenderCategories
                          item={item}
                          quizInfo={quizInfo}
                          setQuizInfo={(valObj) => setQuizInfo(valObj)}
                        />
                      )}
                    />

                    <LottieAnimator visible={subjLoad} absolute wTransparent />
                  </Animated.View>
                )}
              </View>
            )}
          </View>

          <View style={styles.btns}>
            {!isStudy && (
              <AppButton
                title={isSelection ? "Quit Quiz Session" : "Quit"}
                type="warn"
                onPress={() => setPrompt({ vis: true, data: QUIT_PROMPT })}
              />
            )}
            {(isSubjects || isStudy || isCategory) && (
              <AppButton
                title={"Go Back"}
                type="white"
                onPress={handleGoBack}
              />
            )}
            {shouldShowNextBtn && (
              <AppButton title={"Next"} onPress={handleNext} />
            )}
            {isStudy && (
              <AppButton
                title={"I've studied, Start Quiz"}
                disabled={!hasStudiedAllTopics}
                onPress={handleNext}
              />
            )}
          </View>
        </Screen>
      )}
      <PromptModal
        prompt={prompt}
        setPrompt={(data) => setPrompt(data)}
        onPress={handlePrompt}
      />
      <StatusBar style="dark" />
    </View>
  );
};

export default RenderQuiz;

const styles = StyleSheet.create({
  btns: {
    width,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  container: {
    flex: 1,
    // backgroundColor: colors.lightly,
    // overflow: "hidden",
  },
  main: {
    flex: 1,
    // height: 500,
    justifyContent: "center",
    paddingTop: 20,
    alignItems: "center",
    // backgroundColor: "red",
  },
  selectSubjects: {
    alignSelf: "center",
    textTransform: "capitalize",
    marginBottom: 15,
  },
  title: {
    textTransform: "capitalize",
    marginTop: 15,
    marginLeft: 15,
  },
  quiz: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
