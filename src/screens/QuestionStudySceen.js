/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
import {
  Dimensions,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import AppText from "../components/AppText";
import QuizCorrections from "../components/QuizCorrections";
import AppHeader from "../components/AppHeader";
import colors from "../helpers/colors";
import { useLocalSearchParams } from "expo-router";
import { useGetMyQuestionsQuery } from "../context/instanceSlice";
import { useEffect, useRef, useState } from "react";
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
import PopMessage from "../components/PopMessage";
import { PAD_BOTTOM } from "../helpers/dataStore";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import CountdownTimer from "../components/CountdownTimer";
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  InterstitialAd,
  TestIds,
} from "react-native-google-mobile-ads";

const { width, height } = Dimensions.get("screen");

const rewardedAdUnitId = __DEV__
  ? TestIds.REWARDED
  : Platform.OS === "android"
    ? "ca-app-pub-3603875446667492/6857042910"
    : "ca-app-pub-3603875446667492/1000907548";

const interstitialAdUnitId = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.OS === "android"
    ? "ca-app-pub-3603875446667492/8333776119" // Android interstitial
    : "ca-app-pub-3603875446667492/8194175311"; // iOS interstitial

// ca-app-pub-3603875446667492/6857042910  - Android Real Ad Unit ID
// ca-app-pub-3603875446667492/1000907548 - iOS Real Ad Unit ID

// ca-app-pub-3603875446667492/8194175311 - iOS IT Ad Unit ID
// ca-app-pub-3603875446667492/8333776119 - Android IT Ad Unit ID

const QUIT_PROMPT = {
  title: "Exit Quiz",
  msg: "Are you sure you want to cancel this practice quiz session?",
  btn: "Quit",
  type: "quit",
};

const MINIMUM_QUESTIONS = 5;
// const TIME_INTERVAL = 3 * 60 * 60 * 1000;

const TIME_INTERVAL = 3; // hours
const ONE_HOUR = 60 * 60 * 1000; // ms
const TOTAL_TIME = TIME_INTERVAL * ONE_HOUR;

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

const ViewBox = ({ index = 0, value, color, text = "" }) => {
  return (
    <Animated.View
      style={[
        styles.box,
        {
          backgroundColor: `${color}20`,
          boxShadow: `2px 8px 18px ${colors}60`,
          borderColor: color,
        },
      ]}
      entering={FadeInUp.delay(index * 800)}
    >
      <AppText fontWeight="black" style={{ color }} size="xxlarge">
        {value}
      </AppText>
      <AppText fontWeight="semibold" style={{ color: colors.medium }}>
        {text}
      </AppText>
    </Animated.View>
  );
};

const QuestionStudyScreen = () => {
  const route = useLocalSearchParams();
  const [screen, setScreen] = useState(0);
  const [count, setCount] = useState(`${MINIMUM_QUESTIONS}`);
  const [prompt, setPrompt] = useState({ vis: false, data: null });
  const [qBank, setQBank] = useState({});
  const [bools, setBools] = useState({ loading: true, showLoadAd: true });
  const [timer, setTimer] = useState(null); //14400
  const [popData, setPopData] = useState({ vis: false });
  const [questions, setQuestions] = useState([]);
  const [adError, setAdError] = useState(null);
  const [session, setSession] = useState({
    totalQuestions: 1,
    questions: [],
  });
  const [adLoaded, setAdLoaded] = useState(false);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);

  const { data, error, refetch } = useGetMyQuestionsQuery();

  const insets = useSafeAreaInsets();
  const stats = getStats(session);
  const user = useSelector(selectUser);
  const timerRef = useRef();
  const rewardedRef = useRef(null);
  const interstitialRef = useRef(null);
  const hasActiveSub = user?.subcription?.isActive;

  const maxCount = hasActiveSub
    ? questions?.totalAvailable
    : Math.min(questions?.totalAvailable, 10);

  const statsScore = Math.floor(
    (stats?.answeredCorrectly / parseInt(count)) * 100,
  );

  const handleStart = async () => {
    const limit = parseInt(count) || MINIMUM_QUESTIONS;
    if (limit < MINIMUM_QUESTIONS || limit > maxCount) {
      setPopData({
        vis: true,
        msg:
          limit > maxCount && !hasActiveSub
            ? "Subscribe to practice more questions"
            : "Exceeded question range",
        type: "failed",
      });
      return;
    }

    const quizTimer = await AsyncStorage.getItem("free_quiz");
    if (quizTimer && !hasActiveSub) {
      const now = Date.now(); // ms
      const quizTime = new Date(quizTimer).getTime(); // ms
      const elapsed = now - quizTime; // ms

      if (elapsed < TOTAL_TIME) {
        setPopData({
          vis: true,
          msg: "Subscribe now to skip waiting time",
          type: "failed",
        });
      }
      return;
    }

    setScreen(1);
    if (!hasActiveSub) {
      await AsyncStorage.setItem("free_quiz", new Date().toISOString());
    }
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

  const handleAdReward = async () => {
    await AsyncStorage.removeItem("free_quiz");
    setTimer(null);

    setPopData({
      vis: true,
      msg: "Waiting time skipped 🎉",
      timer: 2000,
      type: "success",
    });

    setBools({ ...bools, loading: false, showLoadAd: true });

    // Reload ad for next time
    rewardedRef.current?.load();
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

    // Check timer;
    if (!hasActiveSub) {
      const quizTimer = await AsyncStorage.getItem("free_quiz");
      if (quizTimer) {
        const now = Date.now(); // ms
        const quizTime = new Date(quizTimer).getTime(); // ms
        const elapsed = now - quizTime; // ms
        const remaining = TOTAL_TIME - elapsed; // ms

        if (remaining > 0) {
          // convert ms → seconds
          setTimer(Math.floor(remaining / 1000));
        } else {
          setTimer(null);
        }
      }
    }
  };

  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

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

  useEffect(() => {
    if (hasActiveSub) return;
    const rewarded = RewardedAd.createForAdRequest(rewardedAdUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    const retryLoadAd = () => {
      if (retryCount.current >= MAX_RETRIES) return;

      retryCount.current += 1;

      setTimeout(() => {
        rewarded.load();
      }, retryCount.current * 2000);
    };

    rewardedRef.current = rewarded;
    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        if (bools.showLoadAd === false) {
          rewarded.show();
        }
        setAdLoaded(true);
      },
    );

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        handleAdReward();
      },
    );

    const unsubscribeError = rewarded.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        setAdLoaded(false);
        setAdError(true);
        retryLoadAd();
      },
    );

    // Start loading the rewarded ad straight away
    rewarded.load();

    // Unsubscribe from events on unmount
    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeError();
    };
  }, []);

  useEffect(() => {
    if (hasActiveSub) return;

    const interstitial = InterstitialAd.createForAdRequest(
      interstitialAdUnitId,
      { requestNonPersonalizedAdsOnly: true },
    );

    interstitialRef.current = interstitial;

    const unsubscribeLoaded = interstitial.addAdEventListener(
      AdEventType.LOADED,
      () => {
        setInterstitialLoaded(true);
      },
    );

    const unsubscribeClosed = interstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        setInterstitialLoaded(false);
        screen === 1 && setScreen(2); // 🔑 show quiz results AFTER ad
      },
    );

    const unsubscribeError = interstitial.addAdEventListener(
      AdEventType.ERROR,
      () => {
        setInterstitialLoaded(false);
        screen === 1 && setScreen(2); // fallback to results if ad fails
      },
    );

    interstitial.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, []);
  //   const sendData = [];
  return (
    <View style={styles.container}>
      {screen === 0 && (
        <Animated.View exiting={SlideOutLeft}>
          <AppHeader title={`${route?.subjectName} Practice`} />
          <AppText fontWeight="medium" style={styles.topic}>
            Topic: {route?.topicName}
          </AppText>
          <View style={styles.separator} />
          {questions?.totalAvailable < 5 ? (
            <View style={styles.empty}>
              <LottieAnimator
                name="person_float"
                style={{ width: width * 0.65, height: width * 0.65 }}
                visible
              />
              <AppText fontWeight="medium">
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
              <AppText
                style={{ marginTop: 10 }}
                fontWeight="light"
                size="xsmall"
              >
                You can practice a minimum of{" "}
                <AppText fontWeight="heavy">{MINIMUM_QUESTIONS}</AppText> and
                maximum of <AppText fontWeight="heavy">{maxCount}</AppText>{" "}
                questions
              </AppText>
              <TextInput
                placeholder="Questions No."
                value={count}
                placeholderTextColor={colors.medium}
                keyboardType="numeric"
                onChangeText={(val) => setCount(val)}
                style={styles.input}
              />
              <View>
                {timer && (
                  <CountdownTimer
                    ref={timerRef}
                    time={timer}
                    autoStart={true}
                    style={{ alignItems: "center", marginBottom: 25 }}
                    onComplete={() => {}}
                    // onPause={() => ("Paused")}
                    onSkip={(elapsed) => {}}
                    // onStop={() => ("Stopped")}
                  />
                )}
              </View>
              {timer && (
                <AppButton
                  title={
                    adLoaded || bools.showLoadAd
                      ? "Watch Ad to skip time"
                      : "Loading Ad..."
                  }
                  type="accent"
                  disabled={!adLoaded && !bools.showLoadAd}
                  icon={{
                    left: true,
                    name: "play",
                    type: "I",
                    color:
                      adLoaded || bools.showLoadAd
                        ? colors.white
                        : colors.accent + 80,
                  }}
                  onPress={() => {
                    if (bools.showLoadAd) {
                      setBools({ ...bools, showLoadAd: false });
                      if (adLoaded) {
                        rewardedRef.current?.show();
                      } else {
                        rewardedRef.current?.load();
                      }
                    } else {
                      rewardedRef.current?.show();
                    }
                  }}
                />
              )}
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
            setQuizInfoView={() => {
              setScreen(2);
              setTimeout(() => {
                try {
                  interstitialRef.current?.show();
                } catch (_err) {
                  // setScreen(2);
                }
              }, 1000);
            }}
            handleQuit={() => setPrompt({ vis: true, data: QUIT_PROMPT })}
          />
        </Animated.View>
      )}
      {screen === 2 && (
        <Animated.View
          entering={SlideInRight.springify().damping(60)}
          exiting={SlideOutRight}
          style={{ marginBottom: insets.bottom + 10 }}
        >
          <AppHeader title={`${route?.subjectName} Practice`} />
          <AppText fontWeight="medium" style={styles.topic}>
            Topic: {route?.topicName}
          </AppText>
          <View style={styles.separator} />
          <FlatList
            data={["Practice"]}
            contentContainerStyle={{ paddingBottom: PAD_BOTTOM }}
            renderItem={() => (
              <>
                <View style={styles.review}>
                  <View style={styles.row}>
                    <Ionicons
                      name="information-circle-outline"
                      color={colors.medium}
                    />
                    <AppText
                      fontWeight="medium"
                      style={{ color: colors.medium }}
                    >
                      This is a free practice session and tokens (GT) are not
                      added to your account
                    </AppText>
                  </View>
                  <LottieAnimator
                    name="congrats"
                    loop={false}
                    style={{ width: width * 0.6, height: width * 0.6 }}
                  />
                  <View style={styles.boxes}>
                    <ViewBox
                      value={stats?.answeredCorrectly}
                      color={colors.accent}
                      text="Correct"
                    />
                    <ViewBox
                      value={parseInt(count)}
                      color={colors.warning}
                      text="Total"
                    />
                    <ViewBox
                      value={`${statsScore}%`}
                      color={statsScore < 50 ? colors.heartDark : colors.accent}
                      text="Score"
                    />
                  </View>
                </View>
                <View>
                  <AppText
                    fontWeight="bold"
                    size="large"
                    style={{ marginLeft: 20, marginBottom: 20 }}
                  >
                    Review Corrections
                  </AppText>
                  <QuizCorrections data={session?.questions} isSingle />
                </View>
              </>
            )}
          />
        </Animated.View>
      )}

      <LottieAnimator visible={bools.loading} absolute />
      <PromptModal
        prompt={prompt}
        setPrompt={(data) => setPrompt(data)}
        onPress={handlePrompt}
      />
      <PopMessage popData={popData} setPopData={setPopData} />
    </View>
  );
};

export default QuestionStudyScreen;

const styles = StyleSheet.create({
  boxes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 30,
  },
  box: {
    padding: 25,
    alignItems: "center",
    borderWidth: 3,
    borderBottomWidth: 8,
    borderRadius: 20,
  },
  container: {
    flex: 1,
    // backgroundColor: colors.white,
  },
  card: {
    width: width * 0.8,
    padding: 20,
    backgroundColor: colors.unchange,
    alignSelf: "center",
    borderRadius: 6,
  },
  empty: {
    alignItems: "center",
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
  review: {
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginHorizontal: 20,
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
