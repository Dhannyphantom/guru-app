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

import AppText from "../components/AppText";
import React, {
  useEffect,
  useCallback,
  useRef,
  useState,
  useMemo,
} from "react";
// import { dummyQuestions } from "../helpers/dataStore";
import colors from "../helpers/colors";
import LottieAnimator from "./LottieAnimator";
import {
  capFirstLetter,
  formatPoints,
  getUserProfile,
  socket,
} from "../helpers/helperFunctions";
import Options from "./Options";
import AppButton from "./AppButton";
import PopMessage from "./PopMessage";
import PopAlerts from "./PopAlerts";
// import { useFormikContext } from "formik";
import { FormikCover } from "./CoverImage";
import AnimatedPressable from "./AnimatedPressable";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";

const { width, height } = Dimensions.get("screen");

// const defaultAnswers = Array(4)
//   .fill("")
//   .map((_n) => ({ _id: nanoid(), name: "", correct: false }));

const QuestionDisplay = ({
  handleQuit,
  setQuizSession,
  setQuizInfoView,
  hardReset,
  questionBank = [],
  sessionId,
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
      0
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
                qIdx !== active.question ? q : { ...q, answered: value }
              ),
            }
      )
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
      // timerRef.current?.play();
      return;
    }

    if (questionStore?.[active.subject + 1]) {
      setActive((p) => ({
        subject: p.subject + 1,
        question: 0,
        current: p.current + 1,
        canProceed: false,
      }));
      // timerRef.current?.play();
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
      setSession((p) => {
        const row = p.row + 1;
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
            answer: currentQuestion?.answered,
            row,
            point: currentQuestion.point,
            sessionId,
            user: getUserProfile(user),
          });
        }
        return { ...p, row, totalQuestions };
      });
    } else {
      setSession((p) => ({ ...p, row: 0 }));
      setPopData({
        vis: true,
        msg: "Incorrect!\nBetter luck next time",
        type: "failed",
        point: formatPoints(-2),
        popId: nanoid(),
      });
      if (isMultiplayer) {
        socket.emit("answer_question", {
          answer: currentQuestion?.answered,
          row: 0,
          point: -2,
          sessionId,
          user: getUserProfile(user),
        });
      }
    }

    handleNavQuestion();
  };

  useEffect(() => {
    socket.on("session_answers", ({ message, userId }) => {
      // keep parent in sync
      setAlerts({
        vis: user?._id !== userId,
        msg: message,
        type: message?.includes("got") ? "success" : "failed",
        timer: 2000,
        // point: formatPoints("+" + currentQuestion.point),
        popId: nanoid(),
      });
    });

    return () => socket.off("session_answers");
  }, []);

  // leaderboard_update
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
        // App has gone to the background - trigger your function here
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
        <AppText fontWeight="medium">Loading question…</AppText>
        <AppButton
          type="warn"
          title={"Cancel"}
          onPress={hardReset}
          contStyle={{ marginTop: 50 }}
        />
      </View>
    );
  }

  return (
    <>
      <View style={styles.questions}>
        <View style={styles.header}>
          <AppText size="large" fontWeight="heavy">
            {active.current}/{totalQuestions}
          </AppText>

          <AppText style={styles.subjectTxt} size="xxlarge" fontWeight="black">
            {questionStore?.[active.subject]?.subject?.name}
          </AppText>

          <LottieAnimator
            key={`${active.subject}-${active.question}`}
            name="timer"
            animRef={timerRef}
            speed={10 / (currentQuestion.timer || 10)}
            style={{ width: 50, height: 50 }}
            loop={false}
            onAnimationFinish={handleNextQuestion}
          />
        </View>

        <View style={styles.question}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <AppText
              size="xlarge"
              fontWeight="bold"
              style={{ textAlign: "center", lineHeight: 35 }}
            >
              {capFirstLetter(currentQuestion.question)}
            </AppText>
          </ScrollView>
        </View>

        <ScrollView style={{ flex: 1, marginTop: 25 }}>
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

        <View style={styles.btns}>
          <AppButton title="Quit" onPress={handleQuit} type="warn" />
          <AppButton
            title={noNextQuestion ? "Finish Quiz" : "Next Question"}
            onPress={handleNextQuestion}
            disabled={!hasAnswered || !active.canProceed}
            type={noNextQuestion ? "accent" : "primary"}
          />
        </View>
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

  // Handle question text change
  const handleQuestionChange = useCallback(
    (text) => {
      onUpdateQuestion?.({ question: text });
      onTouch?.("question");
    },
    [onUpdateQuestion, onTouch]
  );

  // Handle answer updates
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
    [answers, onUpdateQuestion, onTouch]
  );

  // Handle image toggle
  const handleImagePress = useCallback(() => {
    if (showImagePicker) {
      // Remove image
      onUpdateQuestion?.({ image: {} });
      setShowImagePicker(false);
    } else {
      // Show image picker
      setShowImagePicker(true);
    }
  }, [showImagePicker, onUpdateQuestion]);

  // Handle image update
  const handleImageUpdate = useCallback(
    (imageData) => {
      onUpdateQuestion?.({ image: imageData });
    },
    [onUpdateQuestion]
  );

  return (
    <View onLayout={onLayout}>
      {/* Question Input */}
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

      {/* Image Toggle Button */}
      <AnimatedPressable onPress={handleImagePress} style={styles.coverImgBtn}>
        <AppText style={{ color: colors.primaryDeep }} fontWeight="bold">
          {showImagePicker ? "Remove" : "Add"} Image
        </AppText>
      </AnimatedPressable>

      {/* Image Picker */}
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

      {/* Answer Options */}
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
// QuizQuestion.displayName = "QuizQuestion";

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   cover: {
//     marginBottom: 15,
//   },
//   coverImage: {
//     height: height * 0.25,
//     flexDirection: "row",
//     width: Platform.OS === "web" ? 350 : width * 0.7,
//   },
//   coverImgBtn: {
//     alignSelf: "flex-end",
//     paddingBottom: 15,
//     paddingHorizontal: 20,
//   },
//   main: {
//     flex: 1,
//     width: Platform.OS === "web" ? "90%" : width,
//     paddingTop: 10,
//     paddingHorizontal
//   }

// export default QuestionDisplay;

const styles = StyleSheet.create({
  avoidingView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  btnContainer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    // flexDirection: "row",
  },
  btns: {
    width: width,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cover: {
    // width: Platform.OS == "web" ? 300 : null,
    // alignItems: "center",
    // justifyContent: "space-between",
    // marginHorizontal: 10,
  },
  coverImage: {
    height: height * 0.25,
    flexDirection: "row",
    width: Platform.OS == "web" ? 350 : width * 0.7,
  },
  coverImgBtn: {
    alignSelf: "flex-end",
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  coverBtn: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 10,
  },
  main: {
    flex: 1,
    width: Platform.OS == "web" ? "90%" : width,
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  subjectTxt: {
    width: "60%",
    color: colors.primaryDeep,
    textAlign: "center",
    textTransform: "capitalize",
  },
  scroll: {
    justifyContent: "center",
    flex: 1,
    alignItems: "center",
  },
  question: {
    width: "98%",
    minHeight: height * 0.3,
    maxHeight: height * 0.4,
    backgroundColor: colors.white,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    padding: 10,
    borderRadius: 20,
    overflow: Platform.OS == "web" ? null : "scroll",
    marginBottom: 15,
  },
  questions: {
    flex: 1,
    width: "100%",
    padding: 12,
  },
  questionInput: {
    fontFamily: "sf-bold",
    width: "96%",
    height: "96%",
    // backgroundColor: "red",
    textAlign: "center",
    fontSize: 20,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    maxWidth: Platform.OS == "web" ? "100%" : null,
    outlineStyle: "none",
    marginHorizontal: 15,
  },
});
