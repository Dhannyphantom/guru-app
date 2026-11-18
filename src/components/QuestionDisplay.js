/* eslint-disable react-hooks/exhaustive-deps */
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  AppState,
  TextInput,
  View,
} from "react-native";

import { nanoid } from "@reduxjs/toolkit";
import Katex from "react-native-katex";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";

import AppText from "../components/AppText";
import React, {
  useEffect,
  useCallback,
  useRef,
  useState,
  useMemo,
} from "react";
import colors from "../helpers/colors";
import LottieAnimator from "./LottieAnimator";
import {
  capFirstLetter,
  formatPoints,
  getUserProfile,
  socket,
} from "../helpers/helperFunctions";
import Options from "./Options";
import PopMessage from "./PopMessage";
import PopAlerts from "./PopAlerts";
import { FormikCover } from "./CoverImage";
import AnimatedPressable from "./AnimatedPressable";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import { Q, TONES, TONE_CYCLE } from "./quiz/QuizTheme";
import { AnimatedBar, Chip, FooterBar, QuizButton } from "./quiz/QuizUI";

const { width, height } = Dimensions.get("screen");

const inlineStyle = `
html, body {
  display: flex;
  background-color: transparent;
  justify-content: center;
  align-items: center;
  height: 100%;
  margin: 0;
  padding: 0;
}
.katex {
  font-size: 4em;
  font-weight: 800;
  margin: 0;
  display: flex;
}
`;

const LatexText = ({ value, isLatex, style }) => {
  if (!value) return null;

  if (!isLatex) {
    return <AppText style={style}>{value}</AppText>;
  }

  return (
    <Katex
      expression={value?.replace(/\$/g, "")}
      style={{ width: width * 0.8, height: height * 0.3 }}
      inlineStyle={inlineStyle}
      displayMode={false}
      throwOnError={false}
      errorColor="#f00"
      macros={{}}
      colorIsTextColor={false}
      onError={() => console.error("Error")}
    />
  );
};

const QuestionDisplay = ({
  handleQuit,
  setQuizSession,
  setQuizInfoView,
  hardReset,
  questionBank = [],
  qColor, // optional override for the counter colour
  subjColor, // optional override for the subject colour
  sessionId,
  penaltyRate = null, // JAMB: fraction of the question point lost on a wrong/skipped answer
}) => {
  const timerRef = useRef(null);
  const isMultiplayer = Boolean(sessionId);
  const user = useSelector(selectUser);
  const appState = useRef(AppState.currentState);
  const handleNextQuestionRef = useRef();

  /* ---------- normalize question bank ---------- */
  const normalizedBank = useMemo(() => {
    if (!Array.isArray(questionBank) || questionBank.length === 0) return [];
    return questionBank.map((subject) => ({
      ...subject,
      questions: Array.isArray(subject.questions)
        ? subject.questions.map((q) => ({
            ...q,
            answers: Array.isArray(q.answers) ? q.answers : [],
          }))
        : [],
    }));
  }, [questionBank]);

  const [questionStore, setQuestionStore] = useState(normalizedBank);

  useEffect(() => {
    setQuestionStore(normalizedBank);
  }, [normalizedBank]);

  const [active, setActive] = useState({
    subject: 0,
    question: 0,
    current: 1,
    canProceed: false,
  });

  const [popData, setPopData] = useState({ vis: false });
  const [alerts, setAlerts] = useState({ vis: false });

  const [session, setSession] = useState({
    totalQuestions: 0,
    questions: [],
    leaderboard: [],
    row: 0,
  });

  /* ---------- derived state ---------- */
  const currentQuestion =
    questionStore?.[active.subject]?.questions?.[active.question] ?? null;

  const totalQuestions = useMemo(() => {
    return questionStore.reduce(
      (sum, s) => sum + (s.questions?.length || 0),
      0,
    );
  }, [questionStore]);

  const hasAnswered = Boolean(currentQuestion?.answered);

  const correctAnswer = useMemo(() => {
    return currentQuestion?.answers?.find((a) => a.correct);
  }, [currentQuestion]);

  const noNextQuestion = useMemo(() => {
    const sameSubjectNext =
      questionStore?.[active.subject]?.questions?.[active.question + 1];
    const nextSubject = questionStore?.[active.subject + 1];
    return !sameSubjectNext && !nextSubject;
  }, [questionStore, active]);

  /* ---------- answer select ---------- */
  const handleSelectAnswer = (value) => {
    if (!currentQuestion) return;

    setQuestionStore((prev) =>
      prev.map((subj, sIdx) =>
        sIdx !== active.subject
          ? subj
          : {
              ...subj,
              questions: subj.questions.map((q, qIdx) =>
                qIdx !== active.question ? q : { ...q, answered: value },
              ),
            },
      ),
    );
  };

  /* ---------- navigation ---------- */
  const handleNavQuestion = () => {
    const nextQ = active.question + 1;

    if (questionStore?.[active.subject]?.questions?.[nextQ]) {
      setActive((p) => ({
        ...p,
        question: nextQ,
        current: p.current + 1,
        canProceed: false,
      }));
      return;
    }

    if (questionStore?.[active.subject + 1]) {
      setActive((p) => ({
        subject: p.subject + 1,
        question: 0,
        current: p.current + 1,
        canProceed: false,
      }));
      return;
    }

    setTimeout(() => {
      setQuizSession({
        ...session,
        totalQuestions,
        questions: questionStore,
      });
      setQuizInfoView("finished");
    }, 3000);
  };

  /* ---------- next ---------- */
  const handleNextQuestion = () => {
    if (!currentQuestion) return;

    if (hasAnswered && currentQuestion.answered?._id === correctAnswer?._id) {
      // side effects live outside the state updater so they can't fire twice
      const row = session.row + 1;
      setSession((p) => ({ ...p, row, totalQuestions }));
      setPopData({
        vis: true,
        msg: `Correct!${row > 1 ? `\n${row} in a row` : ""}`,
        type: "success",
        timer: 1000,
        point: formatPoints("+" + currentQuestion.point),
        popId: nanoid(),
      });
      if (isMultiplayer) {
        socket.emit("answer_question", {
          question: currentQuestion,
          row,
          sessionId,
          user: getUserProfile(user),
        });
      }
    } else {
      setSession((p) => ({ ...p, row: 0 }));
      setPopData({
        vis: true,
        msg: "Incorrect!\nBetter luck next time",
        type: "failed",
        point: formatPoints(
          penaltyRate != null
            ? -Number(((currentQuestion.point || 0) * penaltyRate).toFixed(2))
            : -2,
        ),
        popId: nanoid(),
      });
      if (isMultiplayer) {
        socket.emit("answer_question", {
          question: currentQuestion,
          row: 0,
          sessionId,
          user: getUserProfile(user),
        });
      }
    }

    handleNavQuestion();
  };

  useEffect(() => {
    socket.on("session_answers", ({ message, userId }) => {
      setAlerts({
        vis: user?._id !== userId,
        msg: message,
        type: message?.includes("got") ? "success" : "failed",
        timer: 2000,
        popId: nanoid(),
      });
    });

    return () => socket.off("session_answers");
  }, []);

  useEffect(() => {
    socket.on("leaderboard_update", ({ leaderboard }) => {
      setSession((prev) => ({ ...prev, leaderboard }));
    });

    return () => socket.off("leaderboard_update");
  }, []);

  useEffect(() => {
    handleNextQuestionRef.current = handleNextQuestion;
  }, [handleNextQuestion]);

  /* ---------- proceed delay ---------- */
  useEffect(() => {
    const t = setTimeout(() => {
      setActive((p) => ({ ...p, canProceed: true }));
    }, 3000);
    return () => clearTimeout(t);
  }, [active.subject, active.question]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/active|foreground/) &&
        nextAppState === "background"
      ) {
        handleNextQuestionRef.current?.();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  /* ---------- HARD GUARD ---------- */
  if (!currentQuestion) {
    return (
      <View style={styles.avoidingView}>
        <LottieAnimator visible />
        <AppText fontWeight="black" size={18} style={{ color: Q.ink }}>
          Loading question…
        </AppText>
        <QuizButton
          title="Cancel"
          icon="close"
          variant="coral"
          small
          onPress={hardReset}
          style={{ marginTop: 40, minWidth: 160 }}
        />
      </View>
    );
  }

  const tone = TONES[TONE_CYCLE[(active.subject + 1) % TONE_CYCLE.length]];
  const progress = totalQuestions
    ? ((active.current - 1) / totalQuestions) * 100
    : 0;

  return (
    <>
      <View style={styles.questions}>
        {/* Header: counter • subject • timer */}
        <View style={styles.header}>
          <View style={styles.counter}>
            <AppText
              fontWeight="black"
              size={15}
              style={{ color: qColor ?? Q.ink }}
            >
              {active.current}
              <AppText fontWeight="bold" size={12} style={{ color: Q.faint }}>
                /{totalQuestions}
              </AppText>
            </AppText>
          </View>

          <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 8 }}>
            <AppText
              fontWeight="black"
              size={19}
              numberOfLines={1}
              style={{
                color: subjColor ?? tone.ink,
                textTransform: "capitalize",
              }}
            >
              {questionStore?.[active.subject]?.subject?.name}
            </AppText>
          </View>

          <View style={styles.timer}>
            <LottieAnimator
              key={`${active.subject}-${active.question}`}
              name="timer"
              animRef={timerRef}
              speed={10 / (currentQuestion.timer || 10)}
              style={{ width: 44, height: 44 }}
              loop={false}
              onAnimationFinish={handleNextQuestion}
            />
          </View>
        </View>

        {/* Progress + streak */}
        <View style={styles.progressRow}>
          <View style={{ flex: 1 }}>
            <AnimatedBar
              percent={progress}
              color={tone.face}
              height={10}
              delay={0}
            />
          </View>
          {session.row > 1 && (
            <Animated.View
              key={session.row}
              entering={ZoomIn.springify().damping(12)}
              style={{ marginLeft: 10 }}
            >
              <Chip
                icon="flame"
                label={`${session.row} in a row`}
                color={TONES.coral.ink}
                bg={TONES.coral.soft}
              />
            </Animated.View>
          )}
        </View>

        {/* Question card */}
        <Animated.View
          key={`${active.subject}-${active.question}`}
          entering={FadeIn.duration(260)}
          style={[styles.question, { borderColor: tone.line }]}
        >
          <View style={[styles.qTag, { backgroundColor: tone.soft }]}>
            <AppText
              fontWeight="black"
              size={10.5}
              style={{ color: tone.ink, letterSpacing: 1 }}
            >
              QUESTION {active.current}
            </AppText>
          </View>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <LatexText
              value={
                currentQuestion.isLatex
                  ? currentQuestion.questionLatex
                  : capFirstLetter(currentQuestion.question)
              }
              isLatex={currentQuestion.isLatex}
              style={{
                textAlign: "center",
                lineHeight: 30,
                fontSize: 19,
                fontFamily: "sf-bold",
                color: Q.ink,
              }}
            />
          </ScrollView>
        </Animated.View>

        {/* Options */}
        <ScrollView
          style={{ flex: 1, marginTop: 14 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {currentQuestion.answers.map((obj, idx) => (
              <Options
                key={obj._id}
                idx={idx}
                data={obj}
                handleSelectAnswer={handleSelectAnswer}
                isSelected={currentQuestion.answered?._id === obj._id}
              />
            ))}
          </View>
        </ScrollView>

        <FooterBar style={styles.footer}>
          <QuizButton
            title="Quit"
            icon="exit-outline"
            variant="coral"
            small
            onPress={handleQuit}
            style={{ flex: 1 }}
          />
          <QuizButton
            title={noNextQuestion ? "Finish" : "Next"}
            icon={noNextQuestion ? "flag" : "arrow-forward"}
            variant={noNextQuestion ? "yellow" : "primary"}
            disabled={!hasAnswered || !active.canProceed}
            onPress={handleNextQuestion}
            style={{ flex: 1.6 }}
          />
        </FooterBar>
      </View>

      <PopMessage popData={popData} setPopData={setPopData} />
      <PopAlerts popData={alerts} setPopData={setAlerts} />
    </>
  );
};

// Create default answers with unique IDs
const createDefaultAnswers = () =>
  Array(4)
    .fill(null)
    .map(() => ({ _id: nanoid(), name: "", correct: false }));

let defaultAns = createDefaultAnswers();

export const QuizQuestion = ({
  questionVal = "",
  answersVal = defaultAns,
  onUpdateQuestion,
  onLayout,
  image,
  onTouch,
}) => {
  const [showImagePicker, setShowImagePicker] = useState(false);

  // Ensure we have valid answers array
  const answers = useMemo(() => {
    if (Array.isArray(answersVal) && answersVal.length === 4) {
      return answersVal;
    }
    return createDefaultAnswers();
  }, [answersVal]);

  const handleQuestionChange = useCallback(
    (text) => {
      onUpdateQuestion?.({ question: text });
      onTouch?.("question");
    },
    [onUpdateQuestion, onTouch],
  );

  const handleUpdateAnswer = useCallback(
    (updatedAnswer) => {
      const newAnswers = answers?.map((answer) => {
        if (answer._id === updatedAnswer._id) {
          return updatedAnswer;
        }
        // If setting this answer as correct, unset others
        if (updatedAnswer.correct && answer.correct) {
          return { ...answer, correct: false };
        }
        return answer;
      });

      onUpdateQuestion?.({ answers: newAnswers });
      onTouch?.("answers");
    },
    [answers, onUpdateQuestion, onTouch],
  );

  const handleImagePress = useCallback(() => {
    if (showImagePicker) {
      onUpdateQuestion?.({ image: {} });
      setShowImagePicker(false);
    } else {
      setShowImagePicker(true);
    }
  }, [showImagePicker, onUpdateQuestion]);

  const handleImageUpdate = useCallback(
    (imageData) => {
      onUpdateQuestion?.({ image: imageData });
    },
    [onUpdateQuestion],
  );

  return (
    <View onLayout={onLayout}>
      <View style={styles.question}>
        <View style={styles.main}>
          <TextInput
            style={styles.questionInput}
            onChangeText={handleQuestionChange}
            placeholder="Write your question"
            multiline
            placeholderTextColor={colors.medium}
            value={questionVal}
          />
        </View>
      </View>

      <AnimatedPressable onPress={handleImagePress} style={styles.coverImgBtn}>
        <View style={styles.imgChip}>
          <Ionicons
            name={showImagePicker ? "close-circle" : "image"}
            size={15}
            color={TONES.blue.ink}
          />
          <AppText
            style={{ color: TONES.blue.ink, marginLeft: 6 }}
            fontWeight="bold"
            size={12.5}
          >
            {showImagePicker ? "Remove" : "Add"} Image
          </AppText>
        </View>
      </AnimatedPressable>

      {showImagePicker && (
        <View style={styles.cover}>
          <FormikCover
            name="image"
            style={styles.coverImage}
            value={image}
            onImageUpdate={handleImageUpdate}
          />
        </View>
      )}

      <View style={styles.container}>
        {answers?.map((answer, idx) => (
          <Options
            key={answer._id}
            idx={idx}
            handleSelectAnswer={() => {}}
            data={answer}
            handleUpdateAnswer={handleUpdateAnswer}
            editable={true}
            isSelected={answer.correct}
          />
        ))}
      </View>
    </View>
  );
};

export default QuestionDisplay;

const styles = StyleSheet.create({
  avoidingView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Q.paper,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cover: {},
  coverImage: {
    height: height * 0.25,
    flexDirection: "row",
    width: Platform.OS === "web" ? 350 : width * 0.7,
  },
  coverImgBtn: {
    alignSelf: "flex-end",
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  imgChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TONES.blue.soft,
    borderWidth: 2,
    borderBottomWidth: 3,
    borderColor: TONES.blue.line,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  counter: {
    minWidth: 62,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: Q.card,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: Q.line,
    alignItems: "center",
    justifyContent: "center",
  },
  timer: {
    width: 56,
    height: 48,
    borderRadius: 16,
    backgroundColor: Q.card,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: Q.line,
    alignItems: "center",
    justifyContent: "center",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  main: {
    flex: 1,
    width: Platform.OS === "web" ? "90%" : width,
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 14,
  },
  question: {
    width: "100%",
    minHeight: height * 0.26,
    maxHeight: height * 0.38,
    backgroundColor: Q.card,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    padding: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: Q.line,
    overflow: Platform.OS === "web" ? null : "scroll",
  },
  qTag: {
    position: "absolute",
    top: 10,
    left: 12,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 2,
  },
  questions: {
    flex: 1,
    width: "100%",
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  footer: {
    marginHorizontal: -12,
    marginTop: 6,
  },
  questionInput: {
    fontFamily: "sf-bold",
    width: "96%",
    height: "96%",
    textAlign: "center",
    fontSize: 20,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    maxWidth: Platform.OS === "web" ? "100%" : null,
    outlineStyle: "none",
    marginHorizontal: 15,
  },
});
