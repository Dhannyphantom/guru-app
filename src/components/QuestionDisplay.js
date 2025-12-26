import {
  Dimensions,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { nanoid } from "@reduxjs/toolkit";

import AppText from "../components/AppText";
import React, {
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useState,
} from "react";
// import { dummyQuestions } from "../helpers/dataStore";
import colors from "../helpers/colors";
import LottieAnimator from "./LottieAnimator";
import { capFirstLetter, formatPoints } from "../helpers/helperFunctions";
import Options from "./Options";
import AppButton from "./AppButton";
import PopMessage from "./PopMessage";
import { useFormikContext } from "formik";
import { FormikCover } from "./CoverImage";
import AnimatedPressable from "./AnimatedPressable";

const { width, height } = Dimensions.get("screen");

const defaultAnswers = Array(4)
  .fill("")
  .map((_n) => ({ _id: nanoid(), name: "", correct: false }));

const QuestionDisplay = ({
  handleQuit,
  // session,
  setQuizSession,
  setQuizInfoView,
  questionBank = [],
}) => {
  const [questionStore, setQuestionStore] = useState(questionBank);
  // const [questionStore, setQuestionStore] = useState(dummyQuestions);
  const [active, setActive] = useState({
    subject: 0,
    question: 0,
    current: 1,
    canProceed: false,
  });
  const [popData, setPopData] = useState({ vis: false });
  const [session, setSession] = useState({
    totalQuestions: 1,
    questions: [],
    row: 0,
  });

  const timerRef = useRef();
  const timeoutRef = useRef();

  const currentQuestion =
    questionStore[active.subject]?.questions[active.question];
  let totalQuestions =
    questionStore[0] &&
    questionStore
      .map((obj) => obj?.questions?.length || 0)
      .reduce((prev, curr) => prev + curr);

  const hasAnswered = Boolean(currentQuestion?.answered);
  const noNextQuestion =
    !Boolean(questionStore[active.subject]?.questions[active.question + 1]) &&
    !Boolean(questionStore[active.subject + 1]);
  const correctAnswer = currentQuestion?.answers?.find((item) => item.correct);

  const handleSelectAnswer = (value) => {
    const copier = [...questionStore].map((obj, idx) => {
      if (idx == active.subject) {
        return {
          ...obj,
          questions: obj.questions?.map((item, idxer) => {
            if (idxer == active.question) {
              return {
                ...item,
                answered: value,
              };
            } else {
              return item;
            }
          }),
        };
      } else {
        return obj;
      }
    });

    setQuestionStore(copier);
  };

  // const clearTimer = () => {
  //   if (timeoutRef?.current) {
  //     clearTimeout(timeoutRef?.current);
  //     timeoutRef.current = null;
  //   }
  // };

  // const startTimer = (timer) => {
  //   timeoutRef.current = setTimeout(() => {
  //     // handleNextQuestion();
  //     // timerRef?.current?.stop();
  //     timerRef?.current?.play(150);
  //   }, (timer ?? 30) * 1000);
  // };

  const handleNavQuestion = () => {
    // clearTimer();
    const nextIndex = active.question + 1;
    if (questionStore[active.subject].questions[nextIndex]) {
      setActive({
        ...active,
        question: nextIndex,
        current: active.current + 1,
        canProceed: false,
      });
      timerRef?.current?.play();

      // const timer = questionStore[active?.subject]?.questions[nextIndex]?.timer;
      // startTimer(timer);
    } else {
      if (questionStore[active.subject + 1]) {
        setActive({
          ...active,
          subject: active.subject + 1,
          question: 0,
          current: active.current + 1,
          canProceed: false,
        });
        timerRef?.current?.play();
        // const timer = questionStore[active.subject + 1]?.questions[0]?.timer;

        // startTimer(timer);
      }
    }
    !Boolean(session?.totalQuestions) &&
      setSession({
        ...session,
        totalQuestions,
      });
    if (noNextQuestion) {
      setTimeout(() => {
        setQuizSession({ ...session, questions: questionStore });
        return setQuizInfoView("finished");
      }, 2000);
    }
  };

  const handleNextQuestion = () => {
    // check if answered picked is correct
    // clearTimer();

    if (hasAnswered && currentQuestion?.answered?._id === correctAnswer?._id) {
      const addRow = session.row + 1;
      setSession((prev) => ({
        ...prev,
        totalQuestions: totalQuestions,
        row: addRow,
      }));
      setPopData({
        vis: true,
        msg: `Correct!${addRow > 1 ? "\n" + addRow + " in a row" : ""}`,
        timer: 2000,
        type: "success",
        point: formatPoints("+" + currentQuestion.point),
        popId: nanoid(),
      });
    } else {
      setSession((prev) => ({
        ...prev,
        row: 0,
      }));
      setPopData({
        vis: true,
        msg: `Incorrect!\nBetter luck next time`,
        type: "failed",
        point: formatPoints(-15),
        popId: nanoid(),
      });
    }
    handleNavQuestion();
  };

  const handleAnimationFinish = () => {
    handleNextQuestion();
  };

  const handleProceed = () => {
    setTimeout(() => {
      !active.canProceed && setActive({ ...active, canProceed: true });
    }, 3000);
  };

  useEffect(() => {
    handleProceed();
  }, [active.canProceed]);

  useEffect(() => {
    // startTimer(currentQuestion?.timer);
    // setQuestionStore((prev) =>
    //   prev.map((item) => {
    //     return {
    //       ...item,
    //       questions: item.questions.map((quest) => {
    //         return {
    //           ...quest,
    //           answered: "",
    //         };
    //       }),
    //     };
    //   })
    // );
  }, []);

  return (
    <>
      <View style={styles.questions}>
        <View style={styles.header}>
          <AppText size={"large"} fontWeight="heavy">
            {active.current}/{totalQuestions}
          </AppText>
          <AppText
            style={styles.subjectTxt}
            size={"xxlarge"}
            fontWeight="black"
          >
            {questionStore[active.subject].subject?.name}
          </AppText>
          <LottieAnimator
            name="timer"
            animRef={timerRef}
            speed={10 / currentQuestion.timer}
            style={{ width: 50, height: 50 }}
            loop={false}
            onAnimationFinish={handleAnimationFinish}
          />
        </View>
        <View style={styles.question}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <AppText
              size={"xlarge"}
              style={{ textAlign: "center", lineHeight: 35 }}
              fontWeight="bold"
            >
              {capFirstLetter(
                questionStore[active.subject].questions[active.question]
                  .question
              )}
            </AppText>
          </ScrollView>
        </View>
        <ScrollView style={{ flex: 1, marginTop: 25 }}>
          <View style={styles.container}>
            {questionStore[active.subject].questions[
              active.question
            ].answers.map((obj, idx) => (
              <Options
                key={nanoid()}
                value={obj}
                idx={idx}
                handleSelectAnswer={handleSelectAnswer}
                isSelected={currentQuestion?.answered?._id === obj._id}
              />
            ))}
          </View>
        </ScrollView>
        <View style={[styles.btnContainer, { flex: 0 }]}>
          <View style={styles.btns}>
            <AppButton title={"Quit"} onPress={handleQuit} type="warn" />
            <AppButton
              title={noNextQuestion ? "Finish Quiz" : "Next Question"}
              onPress={handleNextQuestion}
              type={noNextQuestion ? "accent" : "primary"}
              disabled={!hasAnswered || !active.canProceed}
            />
          </View>
        </View>
      </View>
      <PopMessage popData={popData} setPopData={setPopData} />
    </>
  );
};

// Create default answers with unique IDs
const createDefaultAnswers = () =>
  Array(4)
    .fill(null)
    .map(() => ({ _id: nanoid(), name: "", correct: false }));

export const QuizQuestion = ({
  questionVal = "",
  answersVal = createDefaultAnswers(),
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
      const newAnswers = answers.map((answer) => {
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
        {answers.map((answer, idx) => (
          <Options
            key={answer._id}
            value={answer.name}
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
