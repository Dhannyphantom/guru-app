/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
import { Dimensions, StyleSheet, TextInput, View } from "react-native";

import AppText from "../components/AppText";
import QuizCorrections from "../components/QuizCorrections";
import AppHeader from "../components/AppHeader";
import colors from "../helpers/colors";
import { useLocalSearchParams } from "expo-router";
import { useGetMyQuestionsQuery } from "../context/instanceSlice";
import { useEffect, useState } from "react";
import LottieAnimator from "../components/LottieAnimator";
// import { PAD_BOTTOM } from "../helpers/dataStore";
import QuestionDisplay from "../components/QuestionDisplay";
import Animated, {
  FadeInUp,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from "react-native-reanimated";
import AppButton from "../components/AppButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PromptModal from "../components/PromptModal";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("screen");

const QUIT_PROMPT = {
  title: "Exit Quiz",
  msg: "Are you sure you want to cancel this practice quiz session?",
  btn: "Quit",
  type: "quit",
};

/**
 * Get randomized questions from specific subjects and topics
 * @param {Array} data - The subjects array from the API response
 * @param {Object} options - Filter options
 * @param {string} options.subjectId - Subject ID to filter by (optional)
 * @param {string} options.topicId - Topic ID to filter by (optional)
 * @param {number} options.limit - Maximum number of questions to return (optional)
 * @returns {Object} - { questions: Array, count: number }
 */
function getRandomizedQuestions(data, options = {}) {
  const { subjectId, topicId, limit } = options;
  let allQuestions = [];

  // Filter by subject if specified
  const subjects = subjectId
    ? data?.filter((subject) => subject._id === subjectId)
    : data;

  // Collect questions based on filters
  subjects.forEach((subject) => {
    const topics = topicId
      ? subject?.topics?.filter((topic) => topic._id === topicId)
      : subject?.topics;

    topics?.forEach((topic) => {
      // Add metadata to each question for reference
      const questionsWithMeta = topic.questions.map((q) => ({
        ...q,
        subjectId: subject._id,
        subjectName: subject.name,
        topicId: topic._id,
        topicName: topic.name,
      }));
      allQuestions.push(...questionsWithMeta);
    });
  });

  // Fisher-Yates shuffle for complete randomization
  for (let i = allQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
  }

  // Apply limit if specified
  const questions = limit ? allQuestions.slice(0, limit) : allQuestions;

  return {
    questions,
    count: questions.length,
    totalAvailable: allQuestions.length,
  };
}

const getStats = (session) => {
  let answeredCorrectly = 0,
    statPoints = 0,
    totalPoints = 0;

  session?.questions.forEach((quest) => {
    quest.questions.forEach((question) => {
      totalPoints += question.point;
      if (question?.answered?.correct) {
        answeredCorrectly += 1;
        statPoints += question.point;
      } else {
        statPoints -= 2;
        // setStat({ ...stat, point: statPoints });
      }
    });
  });

  return {
    answeredCorrectly,
    statPoints,
    totalPoints,
  };
};

const ViewBox = ({ index = 0, value }) => {
  return (
    <Animated.View entering={FadeInUp.delay(index * 800)}>
      <AppText>{value}</AppText>
    </Animated.View>
  );
};

const QuestionStudyScreen = () => {
  const route = useLocalSearchParams();
  const [screen, setScreen] = useState(0);
  const [count, setCount] = useState("1");
  const [prompt, setPrompt] = useState({ vis: false, data: null });
  const [qBank, setQBank] = useState({});
  const [bools, setBools] = useState({ loading: true });
  const [questions, setQuestions] = useState([]);
  const [session, setSession] = useState({
    totalQuestions: 1,
    questions: [],
  });

  const insets = useSafeAreaInsets();
  const stats = getStats(session);

  const { data, error, refetch } = useGetMyQuestionsQuery();

  const handleStart = () => {
    setScreen(1);
  };

  const handlePrompt = (type) => {
    switch (type) {
      case "quit":
        setScreen(0);

        break;

      default:
        break;
    }
  };

  const loadQuestions = async () => {
    const qCache = await AsyncStorage.getItem("qBank");
    if (qCache) {
      const qData = JSON.parse(qCache);
      setQBank(qData);
    } else {
      setQBank(data);
    }
    setBools({ ...bools, loading: false });
  };

  const handleCountChange = (val) => {
    const min = 5; // Set your minimum value
    const max = questions?.totalAvailable; // Set your maximum value

    // Allow empty string for user to clear and type
    if (val === "") {
      setCount("");
      return;
    }

    // Parse the input value
    const numValue = parseInt(val, 10);

    // Check if it's a valid number
    if (isNaN(numValue)) {
      return; // Don't update if not a number
    }

    // Clamp the value between min and max
    if (numValue < min) {
      setCount(min.toString());
    } else if (numValue > max) {
      setCount(max.toString());
    } else {
      setCount(numValue.toString());
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [data]);

  useEffect(() => {
    const limit = Number(count) || 5;

    if (qBank?.data?.[0]) {
      const qData = getRandomizedQuestions(qBank?.data, {
        subjectId: route?.subjectId,
        topicId: route?.topicId,
        limit,
      });
      setQuestions(qData);
    }
  }, [count, screen, qBank]);

  //   const sendData = [];
  return (
    <View style={styles.container}>
      {screen === 0 && (
        <Animated.View entering={SlideInLeft} exiting={SlideOutLeft}>
          <AppHeader title={`${route?.subjectName} Review`} />
          <AppText fontWeight="medium" style={styles.topic}>
            Topic: {route?.topicName}
          </AppText>
          <View style={styles.separator} />
          {questions?.totalAvailable < 5 ? (
            <View>
              <AppText>
                Sorry, You haven't answered enough questions yet{" "}
              </AppText>
            </View>
          ) : (
            <View style={styles.card}>
              <AppText fontWeight="semibold" size="large">
                Practice Quiz Session
              </AppText>
              <AppText
                style={{ marginTop: 10 }}
                fontWeight="light"
                size="xsmall"
              >
                Enter the number of questions you wish to practice
              </AppText>
              <TextInput
                placeholder="Number of "
                value={count}
                placeholderTextColor={colors.medium}
                keyboardType="numeric"
                onChangeText={handleCountChange}
                style={styles.input}
              />
              <AppButton title={"Start Quiz"} onPress={handleStart} />
            </View>
          )}
        </Animated.View>
      )}
      {screen === 1 && (
        <Animated.View
          entering={SlideInRight.springify().damping(60)}
          exiting={SlideOutRight}
          style={{
            flex: 1,
            paddingTop: insets.top,
            marginBottom: insets.bottom + 10,
          }}
        >
          <QuestionDisplay
            questionBank={[
              {
                _id: "67",
                questions: questions?.questions || [],
                subject: { name: route?.subjectName },
              },
            ]}
            setQuizSession={setSession}
            setQuizInfoView={() => setScreen(2)}
            handleQuit={() => setPrompt({ vis: true, data: QUIT_PROMPT })}
          />
        </Animated.View>
      )}
      {screen === 2 && (
        <Animated.View
          entering={SlideInRight.springify().damping(60)}
          exiting={SlideOutRight}
          style={{
            flex: 1,
            paddingTop: insets.top,
            marginBottom: insets.bottom + 10,
          }}
        >
          <AppHeader title={`${route?.subjectName} Review`} />
          <AppText fontWeight="medium" style={styles.topic}>
            Topic: {route?.topicName}
          </AppText>
          <View style={styles.separator} />
          <LottieAnimator
            name="congrats"
            loop={false}
            style={{ width: width * 0.6, height: width * 0.6 }}
          />
          <View>
            <ViewBox value={stats?.answeredCorrectly} />
            <ViewBox value={stats?.statPoints} />
          </View>
        </Animated.View>
      )}

      <LottieAnimator visible={bools.loading} absolute />
      <PromptModal
        prompt={prompt}
        setPrompt={(data) => setPrompt(data)}
        onPress={handlePrompt}
      />
    </View>
  );
};

export default QuestionStudyScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    width: width * 0.8,
    padding: 20,
    backgroundColor: colors.unchange,
    alignSelf: "center",
    borderRadius: 6,
  },
  input: {
    backgroundColor: "white",
    margin: 20,
    height: 60,
    borderRadius: 20,
    paddingLeft: 20,
    fontFamily: "sf-black",
    fontSize: 30,
  },
  topic: {
    marginLeft: 15,
    marginTop: 4,
    // marginBottom: 15,
  },

  separator: {
    width: width * 0.9,
    height: 2,
    backgroundColor: colors.white,
    // alignSelf: "center",
    marginLeft: 15,
    marginBottom: 20,
    marginTop: 10,
  },
});
