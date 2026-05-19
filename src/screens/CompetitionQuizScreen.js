/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import Screen from "../components/Screen";
import QuestionDisplay from "../components/QuestionDisplay";
import FinishedQuiz from "../components/FinishedQuiz";
import PromptModal from "../components/PromptModal";
import PopMessage from "../components/PopMessage";
import AppText from "../components/AppText";
import LottieAnimator from "../components/LottieAnimator";
import colors from "../helpers/colors";
import { useFetchCompetitionQuestionsMutation } from "../context/competitionSlice";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const QUIT_PROMPT = {
  title: "Exit Competition",
  msg: "Are you sure you want to quit? Your progress will be lost.",
  btn: "Quit",
  type: "quit",
};

const CompetitionQuizScreen = () => {
  const { competitionId } = useLocalSearchParams();
  const router = useRouter();
  const startTimeRef = useRef(Date.now());

  const [view, setView] = useState("loading");
  const [questionBank, setQuestionBank] = useState([]);
  const [quizSession, setQuizSession] = useState(null);
  const [popper, setPopper] = useState({ vis: false });
  const [quitPrompt, setQuitPrompt] = useState(false);
  const insets = useSafeAreaInsets();

  const [fetchQuestions, { isLoading }] =
    useFetchCompetitionQuestionsMutation();

  const loadQuestions = async () => {
    try {
      const res = await fetchQuestions(competitionId).unwrap();
      setQuestionBank(res.data || []);
      setView("quiz");
    } catch (err) {
      const msg =
        err?.data?.message ||
        err?.data ||
        "Could not load competition questions";
      const code = err?.data?.code;

      setPopper({
        vis: true,
        type: "failed",
        msg,
        cb: () => {
          if (code === "SUBSCRIPTION_REQUIRED") {
            router.replace("/profile/subscription");
          } else {
            router.back();
          }
        },
      });
      setView("error");
    }
  };

  useEffect(() => {
    if (competitionId) loadQuestions();
  }, [competitionId]);

  const handleQuit = () => setQuitPrompt(true);

  const hardReset = () => {
    setQuizSession(null);
    setView("loading");
    loadQuestions();
  };

  const hideFinished = () => {
    router.replace("/(protected)/(tabs)/(home)");
  };

  if (view === "finished" && quizSession) {
    return (
      <View style={{ paddingBottom: insets.bottom }}>
        <FinishedQuiz
          hideModal={hideFinished}
          data={{ type: "competition", competitionId }}
          session={quizSession}
          duration={Date.now() - startTimeRef.current}
          retried={false}
        />
      </View>
    );
  }

  return (
    <Screen style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />

      {view === "loading" || isLoading ? (
        <View style={styles.center}>
          <LottieAnimator name="loading" visible loop />
          <AppText
            fontWeight="bold"
            style={{ color: colors.white, marginTop: 16 }}
          >
            Preparing your competition questions...
          </AppText>
        </View>
      ) : view === "quiz" ? (
        <QuestionDisplay
          handleQuit={handleQuit}
          setQuizSession={(sess) => {
            setQuizSession(sess);
            setView("finished");
          }}
          setQuizInfoView={() => {}}
          hardReset={hardReset}
          qColor={colors.white}
          subjColor={colors.primaryLight}
          questionBank={questionBank}
        />
      ) : null}

      <PromptModal
        visible={quitPrompt}
        data={QUIT_PROMPT}
        onCancel={() => setQuitPrompt(false)}
        onConfirm={() => router.back()}
      />
      <PopMessage popData={popper} setPopData={setPopper} />
    </Screen>
  );
};

export default CompetitionQuizScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#232526",
    // backgroundColor: "#1a1a2e",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
