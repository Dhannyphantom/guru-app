/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react/display-name */
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { capFirstLetter } from "../helpers/helperFunctions";
import AppText from "../components/AppText";
import colors from "../helpers/colors";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import AppModal from "./AppModal";
import AppButton from "./AppButton";

const { width, height } = Dimensions.get("screen");

const ShowExplanation = ({ data, closeModal }) => {
  return (
    <View style={styles.box}>
      <AppText fontWeight="black" size="large" style={styles.boxQuestion}>
        Question:{" "}
        <AppText fontWeight="bold" size="large">
          {data?.question}
        </AppText>
      </AppText>
      <View style={styles.boxSeperator} />
      <ScrollView
        indicatorStyle="black"
        contentContainerStyle={{ paddingBottom: 10 }}
      >
        <View style={styles.boxMain}>
          <AppText
            style={styles.boxText}
            fontWeight="medium"
          >{`${data?.explanation}`}</AppText>
        </View>
      </ScrollView>
      <AppButton
        style={styles.boxBtn}
        type="white"
        title={"Got It!"}
        onPress={closeModal}
      />
    </View>
  );
};

// Memoized empty list component
const EmptyList = memo(() => (
  <View style={styles.emptyList}>
    <AppText fontWeight="bold" style={styles.emptyListTxt}>
      You haven't answered any quiz questions under this topic
    </AppText>
  </View>
));

// Memoized answer display
const AnswerDisplay = memo(({ correct, name }) => (
  <View style={styles.row}>
    <Ionicons
      name={correct ? "checkmark-circle" : "close-circle"}
      color={correct ? colors.greenDark : colors.heartDark}
      size={14}
    />
    <AppText style={styles.answerText} size="small" fontWeight="black">
      {capFirstLetter(name)}
    </AppText>
  </View>
));

// Simplified question component with better animation
const RenderQuestion = memo(({ question, isSingle, itemNum }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [modal, setModal] = useState({ vis: false, data: null });
  const heightAnim = useSharedValue(0);
  const rotation = useSharedValue(0);

  const correctAnswer = useMemo(
    () => question?.answers?.find((item) => item.correct),
    [question?.answers],
  );

  const isCorrect = useMemo(
    () => correctAnswer?._id === question?.answered?._id,
    [correctAnswer?._id, question?.answered?._id],
  );

  // Move animation updates to useEffect
  useEffect(() => {
    heightAnim.value = withTiming(isExpanded ? 1 : 0, { duration: 300 });
    rotation.value = withTiming(isExpanded ? 180 : 0, { duration: 300 });
  }, [isExpanded]);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const answerContainerStyle = useAnimatedStyle(() => ({
    maxHeight: heightAnim.value === 0 ? 0 : 1000,
    opacity: heightAnim.value,
    overflow: "hidden",
  }));

  // Render answers based on expansion state
  const renderAnswers = useMemo(() => {
    return (
      <>
        <AnswerDisplay name={correctAnswer?.name ?? ""} correct={true} />
        {!isCorrect && (
          <AnswerDisplay
            name={question?.answered?.name ?? ""}
            correct={false}
          />
        )}
      </>
    );
  }, [correctAnswer?.name, isCorrect, question?.answered?.name]);

  return (
    <View style={[styles.questionMain, { marginLeft: isSingle ? 10 : 35 }]}>
      <View
        style={[
          styles.index,
          { backgroundColor: isCorrect ? colors.primary : colors.heartDark },
        ]}
      >
        <AppText fontWeight="heavy" style={styles.indexText}>
          {itemNum}
        </AppText>
      </View>

      <View style={styles.correctionQuestionStyle}>
        <View style={styles.questionTile}>
          <AppText style={styles.questionTitle} fontWeight="semibold">
            {capFirstLetter(question?.question)}
          </AppText>
          {question?.explanation && (
            <Pressable
              style={styles.explain}
              onPress={() =>
                setModal({
                  vis: true,
                  data: {
                    question: question?.question,
                    explanation: question?.explanation,
                  },
                })
              }
            >
              <AppText
                size="xsmall"
                fontWeight="semibold"
                style={{ color: colors.primaryDeep }}
              >
                See Explanation
              </AppText>
            </Pressable>
          )}
          <Animated.View style={[styles.questionAnswer, answerContainerStyle]}>
            {renderAnswers}
          </Animated.View>
        </View>
        <Pressable onPress={toggleExpand} style={styles.btnArrow} hitSlop={8}>
          <Animated.View style={arrowStyle}>
            <Feather
              name="arrow-down-circle"
              size={25}
              color={colors.primaryDeeper}
            />
          </Animated.View>
        </Pressable>
      </View>
      <AppModal
        visible={modal.vis}
        Component={() => (
          <ShowExplanation
            data={modal?.data}
            closeModal={() => setModal({ vis: false, data: null })}
          />
        )}
      />
    </View>
  );
});

// Memoized question list
const QuestionViewToggle = memo(({ item, isSingle }) => {
  const questions = item?.questions || [];

  return (
    <>
      {questions.map((question, idx) => (
        <RenderQuestion
          key={question._id || `q-${idx}`}
          question={question}
          isSingle={isSingle}
          itemNum={idx + 1}
        />
      ))}
    </>
  );
});

const QuizCorrections = ({ data, contentContainerStyle, isSingle = false }) => {
  const renderCorrections = useCallback(
    ({ item }) => {
      if (isSingle) {
        return (
          <>
            <QuestionViewToggle item={item} isSingle={isSingle} />
            {!item?.questions?.length && <EmptyList />}
          </>
        );
      }

      return (
        <>
          <View style={styles.correction}>
            <MaterialCommunityIcons
              name="dots-circle"
              color={colors.lightly}
              size={20}
              style={styles.correctionIcon}
            />
            <AppText size="xlarge" style={styles.subjectText} fontWeight="bold">
              {item.subject?.name}
            </AppText>
          </View>
          <QuestionViewToggle isSingle={isSingle} item={item} />
        </>
      );
    },
    [isSingle],
  );

  const keyExtractor = useCallback((item) => item._id ?? item.subject, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        ListEmptyComponent={EmptyList}
        contentContainerStyle={[styles.listContent, contentContainerStyle]}
        renderItem={renderCorrections}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />
    </View>
  );
};

export default memo(QuizCorrections);

const styles = StyleSheet.create({
  answerText: {
    color: colors.greenDark,
    marginLeft: 3,
  },
  btnArrow: {
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    width: "15%",
  },
  box: {
    width: width * 0.95,
    backgroundColor: colors.extraLight,
    padding: 20,
    minHeight: height * 0.2,
    maxHeight: height * 0.8,
    borderRadius: 20,
    boxShadow: `2px 8px 18px ${colors.primary}25`,
  },
  boxSeperator: {
    width: "95%",
    height: 3,
    backgroundColor: colors.white,
    marginTop: 10,
    marginBottom: 20,
  },
  boxMain: {
    marginBottom: 15,
  },
  boxText: {
    lineHeight: 30,
  },
  explain: {
    backgroundColor: colors.primary + 18,
    borderColor: colors.primary,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderRadius: 100,
    padding: 6,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    marginLeft: 10,
  },
  container: {
    flex: 1,
  },
  correction: {
    flexDirection: "row",
    alignItems: "center",
    left: 0,
  },
  correctionIcon: {
    backgroundColor: colors.unchange,
    padding: 6,
  },
  correctionQuestionStyle: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: colors.white,
    width: width * 0.78,
    elevation: 2,
    overflow: "hidden",
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
  indexText: {
    color: colors.white,
  },
  listContent: {
    paddingBottom: 20,
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
  subjectText: {
    textTransform: "capitalize",
    marginLeft: 6,
  },
});
