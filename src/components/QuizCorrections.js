import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";

import { capFirstLetter, formatPoints } from "../helpers/helperFunctions";

import AppText from "../components/AppText";
import colors from "../helpers/colors";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useEffect, useState } from "react";
import { nanoid } from "@reduxjs/toolkit";

const { width, height } = Dimensions.get("screen");
const ITEM_HEIGHT = 30;

const EmptyList = () => {
  return (
    <View style={styles.emptyList}>
      <AppText fontWeight="bold" style={styles.emptyListTxt}>
        You haven't answered any quiz questions under this topic
      </AppText>
    </View>
  );
};

const AnswerDisplay = ({ correct, name = "" }) => {
  return (
    <View style={styles.row}>
      <Ionicons
        name={correct ? "checkmark-circle" : "close-circle"}
        color={correct ? colors.greenDark : colors.heartDark}
        size={14}
      />
      <AppText
        style={{
          color: colors.greenDark,
          marginLeft: 3,
        }}
        size={"small"}
        fontWeight="black"
      >
        {capFirstLetter(name)}
        {/* {capFirstLetter(correctAnswer?.name ?? "")} */}
      </AppText>
    </View>
  );
};

export const RenderQuestion = ({
  question,
  showAnswers,
  isSingle,
  onPress,
  itemNum,
}) => {
  // const viewLength = ITEM_HEIGHT * question?.answers?.length;
  // const viewLengthPrimary = ITEM_HEIGHT * 2;
  const [initialHeight, setInitialHeight] = useState(0);
  const [changed, setChanged] = useState(false);

  // const [initialHeight, setInitialHeight] = useState(
  //   isSingle ? 0 : showAnswers ? viewLength : viewLengthPrimary
  // );

  const [toggle, setToggle] = useState(!isSingle);

  const correctAnswer = question?.answers.find((item) => item.correct);
  const isCorrect = correctAnswer?._id === question?.answered?._id;

  const rHeight = useSharedValue(null);
  // const maxHeight = useSharedValue(0);
  // const rHeight = useSharedValue(isSingle ? 0 : initialHeight);

  const rStyle = useAnimatedStyle(() => {
    return {
      height: rHeight.value,
      opacity: interpolate(rHeight.value, [0, initialHeight], [0.5, 1]),
      transform: [
        { scale: interpolate(rHeight.value, [0, initialHeight], [0.5, 1]) },
      ],
    };
  });

  const arrowRStyle = useAnimatedStyle(() => {
    let rotate = interpolate(
      rHeight.value,
      [0, initialHeight],
      [0, 180],
      Extrapolation.CLAMP
    );

    rotate = Number.isNaN(rotate) && !isSingle ? 270 : rotate;
    return {
      transform: [
        {
          rotate: `${rotate}deg`,
        },
      ],
    };
  });

  const handleContentLayout = (e) => {
    if (changed) return;
    setInitialHeight(e?.nativeEvent?.layout?.height);
    setChanged(true);
    // setTimeout(() => {
    rHeight.value = withTiming(0, { duration: 2000 });
    // }, 1000);
    // setCurrHeight(0)
    // maxHeight.value = e?.nativeEvent?.layout?.height;

    // setInitialHeight(showAnswers ? viewLength : viewLengthPrimary);
  };

  const toggleShowAnswer = () => {
    // return console.log("Hello");
    if (toggle) {
      rHeight.value = withTiming(0, { duration: 450 }, (finished) => {
        if (finished) runOnJS(setToggle)(false);
      });
    } else {
      rHeight.value = withTiming(initialHeight, { damping: 20 }, (finished) => {
        if (finished) runOnJS(setToggle)(true);
      });
    }
  };

  return (
    <View style={[styles.questionMain, { marginLeft: isSingle ? 10 : 35 }]}>
      {isSingle && (
        <View style={styles.index}>
          <AppText fontWeight="bold" style={{ color: colors.white }}>
            {itemNum}
          </AppText>
        </View>
      )}
      <View style={styles.correctionQuestionStyle}>
        <Pressable onPress={onPress} style={styles.questionTile}>
          <AppText style={styles.questionTitle} fontWeight="semibold">
            {capFirstLetter(question?.question)}
          </AppText>
          {/* ANIMATE */}
          <Animated.View
            onLayout={handleContentLayout}
            style={[styles.questionAnswer, rStyle]}
          >
            {showAnswers ? (
              <>
                {question?.answers?.map((quest) => {
                  return (
                    <AnswerDisplay
                      name={quest?.name}
                      correct={quest?.correct}
                      key={quest._id}
                    />
                  );
                })}
              </>
            ) : (
              <>
                <AnswerDisplay
                  name={correctAnswer?.name ?? ""}
                  correct={true}
                />

                {!isCorrect && (
                  <AnswerDisplay
                    name={question?.answered?.name ?? ""}
                    correct={false}
                  />
                )}
              </>
            )}
          </Animated.View>
        </Pressable>
        <Pressable onPress={toggleShowAnswer} style={styles.btnArrow}>
          <Animated.View style={arrowRStyle}>
            <Feather
              name="arrow-down-circle"
              size={25}
              color={colors.primaryDeeper}
            />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
};

const QuestionViewToggle = ({ item, isSingle }) => {
  return (
    <>
      {item?.questions?.map((question, idx) => {
        return (
          <RenderQuestion
            key={`${idx}+${nanoid()}`}
            question={question}
            isSingle={isSingle}
            itemNum={idx + 1}
          />
        );
      })}
    </>
  );
};

const QuizCorrections = ({ data, isSingle = false }) => {
  const renderCorrections = ({ item }) => {
    return (
      <>
        {isSingle ? (
          <>
            <QuestionViewToggle item={item} />
            {!Boolean(item?.questions) && <EmptyList />}
          </>
        ) : (
          <>
            <View style={styles.correction}>
              <MaterialCommunityIcons
                name="dots-circle"
                color={colors.lightly}
                size={20}
                style={{ backgroundColor: colors.unchange, padding: 6 }}
              />
              <AppText
                size={"xlarge"}
                style={{ textTransform: "capitalize", marginLeft: 6 }}
                fontWeight="bold"
              >
                {item.subject?.name}
              </AppText>
            </View>
            <QuestionViewToggle isSingle={isSingle} item={item} />
          </>
        )}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        // data={[{ subject: "Biology", questions: [] }]}
        data={data}
        keyExtractor={(item) => item._id ?? item.subject}
        ListEmptyComponent={EmptyList}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={renderCorrections}
      />
    </View>
  );
};

export default QuizCorrections;

const styles = StyleSheet.create({
  btnArrow: {
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    width: "15%",
  },
  container: {
    flex: 1,
  },
  correction: {
    // marginRight: 10,
    flexDirection: "row",
    alignItems: "center",
    left: 0,
  },
  correctionItem: {
    // flex: 1,
  },
  correctionQuestion: { marginLeft: 26, width: "80%" },
  correctionQuestionStyle: {
    // width: "90%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: colors.white,
    width: width * 0.78,
    elevation: 2,
    overflow: "hidden",
    // maxWidth: width * 0.7,
  },
  emptyList: {
    flex: 1,
    width,
    height: height * 0.8,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyListTxt: {
    color: colors.medium,
    textAlign: "center",
    width: "65%",
  },

  index: {
    width: 35,
    height: 35,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary,
    margin: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  questionTitle: {
    marginLeft: 10,
    marginTop: 5,
    marginRight: 15,
    paddingBottom: 8,
  },
  questionTile: {
    width: "85%",
  },
  questionMain: {
    flexDirection: "row",
    marginLeft: 10,
  },
  questionAnswer: {
    backgroundColor: colors.unchange,
    padding: 12,
  },
});
