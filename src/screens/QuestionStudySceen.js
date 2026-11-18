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
import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from "react-native-reanimated";
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  InterstitialAd,
  TestIds,
} from "react-native-google-mobile-ads";

import QuizCorrections from "../components/QuizCorrections";
import AppHeader from "../components/AppHeader";
import LottieAnimator from "../components/LottieAnimator";
import QuestionDisplay from "../components/QuestionDisplay";
import PromptModal from "../components/PromptModal";
import PopMessage from "../components/PopMessage";
import CountdownTimer from "../components/CountdownTimer";
import AppText from "../components/jamb/JambText";
import { BANNER_ART, BannerShell } from "../components/jamb/JambHero";
import { T } from "../components/jamb/JambTheme";
import {
  Card,
  Chip,
  Chunky,
  JambButton,
  JambPressable,
  Note,
  ProgressRing,
  SectionTitle,
  enter,
  useCountUp,
  useFloat,
} from "../components/jamb/JambUI";
import { PAD_BOTTOM } from "../helpers/dataStore";
import { useGetMyQuestionsQuery } from "../context/instanceSlice";
import {
  selectUser,
  useUpdateUserActivityMutation,
} from "../context/usersSlice";
import { nonPersonalizedAdRequestOptions } from "../helpers/adsRequestOptions";

const { width } = Dimensions.get("screen");

// ─── Ads ─────────────────────────────────────────────────────────────────────

const rewardedAdUnitId = __DEV__
  ? TestIds.REWARDED
  : Platform.OS === "android"
    ? "ca-app-pub-3603875446667492/6857042910"
    : "ca-app-pub-3603875446667492/1000907548";

const interstitialAdUnitId = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.OS === "android"
    ? "ca-app-pub-3603875446667492/8333776119"
    : "ca-app-pub-3603875446667492/8194175311";

// ─── Config ──────────────────────────────────────────────────────────────────

const QUIT_PROMPT = {
  title: "Exit Quiz",
  msg: "Are you sure you want to cancel this practice quiz session?",
  btn: "Quit",
  type: "quit",
};

const MINIMUM_QUESTIONS = 5;
const FREE_MAX_QUESTIONS = 10;
const TIME_INTERVAL = 3; // hours
const ONE_HOUR = 60 * 60 * 1000; // ms
const TOTAL_TIME = TIME_INTERVAL * ONE_HOUR;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Get randomized questions from specific subjects and topics
 * @param {Array} data - The subjects array from the API response
 * @param {Object} options - { subjectId, topicId, limit }
 * @returns {Object} - { questions, count, totalAvailable }
 */
function getRandomizedQuestions(data, options = {}) {
  const { subjectId, topicId, limit } = options;
  const allQuestions = [];

  const subjects = subjectId
    ? data?.filter((subject) => subject._id === subjectId)
    : data;

  subjects.forEach((subject) => {
    const topics = topicId
      ? subject?.topics?.filter((topic) => topic._id === topicId)
      : subject?.topics;

    topics?.forEach((topic) => {
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

  // Fisher-Yates shuffle
  for (let i = allQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
  }

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
    totalPoints = 0,
    totalQuestions = 0;

  session?.questions.forEach((quest) => {
    quest.questions.forEach((question) => {
      totalQuestions += 1;
      totalPoints += question.point;
      if (question?.answered?.correct) {
        answeredCorrectly += 1;
        statPoints += question.point;
      } else {
        statPoints -= 2;
      }
    });
  });

  return { answeredCorrectly, statPoints, totalPoints, totalQuestions };
};

const getVerdict = (score) => {
  if (score >= 90)
    return { title: "Outstanding!", sub: "You really know this topic." };
  if (score >= 70)
    return { title: "Great job!", sub: "Just a few more to master it." };
  if (score >= 50)
    return {
      title: "Good effort!",
      sub: "Review the corrections to level up.",
    };
  return {
    title: "Keep practising!",
    sub: "Every attempt makes you stronger.",
  };
};

// ─── Small UI pieces ─────────────────────────────────────────────────────────

/** Floating "sticker" used as hero art on the setup screen. */
const Sticker = ({ icon = "rocket" }) => {
  const float = useFloat(0, 2800, 5);
  const floatStar = useFloat(500, 2200, 4);

  return (
    <View style={styles.stickerWrap}>
      <Animated.View style={[styles.sticker, float]}>
        <Ionicons name={icon} size={42} color={T.green} />
        <View style={styles.stickerRule} />
      </Animated.View>
      <Animated.View style={[styles.stickerStar, floatStar]}>
        <Ionicons name="star" size={16} color={T.ink} />
      </Animated.View>
    </View>
  );
};

const StepBtn = ({ icon, onPress, disabled }) => (
  <Chunky
    onPress={onPress}
    disabled={disabled}
    face="#FFFFFF"
    lip={T.lineDark}
    faceBorder={T.lineDark}
    radius={16}
    depth={4}
    contentStyle={styles.stepFace}
  >
    <Ionicons name={icon} size={26} color={disabled ? T.faint : T.greenDark} />
  </Chunky>
);

const Preset = ({ label, active, onPress }) => (
  <JambPressable
    onPress={onPress}
    scaleTo={0.93}
    contentStyle={[styles.preset, active && styles.presetOn]}
  >
    <AppText
      fontWeight="black"
      size={13}
      style={{ color: active ? "#fff" : T.ink }}
    >
      {label}
    </AppText>
  </JambPressable>
);

const StatTile = ({ index, value, label, icon, tone }) => {
  const shown = useCountUp(value, 900, 300 + index * 120);

  return (
    <Animated.View
      entering={enter(index, 250)}
      style={[
        styles.tile,
        { backgroundColor: tone.bg, borderColor: tone.line },
      ]}
    >
      <Ionicons name={icon} size={18} color={tone.ink} />
      <AppText
        fontWeight="black"
        size={26}
        style={{ color: tone.ink, marginTop: 4 }}
      >
        {shown}
      </AppText>
      <AppText fontWeight="bold" size={11.5} style={{ color: T.sub }}>
        {label}
      </AppText>
    </Animated.View>
  );
};

const TONES = {
  green: { bg: T.greenSoft, line: T.greenLine, ink: T.greenDark },
  coral: { bg: T.coralSoft, line: T.coralLine, ink: T.coralDark },
  yellow: { bg: T.yellowSoft, line: T.yellowLine, ink: T.yellowInk },
};

// ─── Result hero ─────────────────────────────────────────────────────────────

const ResultHero = ({ stats, score }) => {
  const shown = useCountUp(score, 1100, 200);
  const verdict = getVerdict(score);

  return (
    <BannerShell
      art={
        <View style={styles.heroArt}>
          <ProgressRing
            percent={score}
            size={100}
            stroke={11}
            color={score >= 50 ? T.yellow : T.coral}
            track="rgba(255,248,231,0.16)"
          >
            <AppText fontWeight="black" size={24} style={{ color: T.chalk }}>
              {shown}%
            </AppText>
            <AppText
              fontWeight="bold"
              size={9.5}
              style={{ color: T.chalkSoft, letterSpacing: 0.8, marginTop: -1 }}
            >
              SCORE
            </AppText>
          </ProgressRing>
        </View>
      }
    >
      <View style={styles.heroTag}>
        <AppText fontWeight="black" size={9.5} style={styles.heroTagText}>
          QUIZ COMPLETE
        </AppText>
      </View>
      <AppText fontWeight="black" size={23} style={styles.heroTitle}>
        {verdict.title}
      </AppText>
      <AppText fontWeight="semibold" size={13.5} style={styles.heroDesc}>
        {`You got ${stats.answeredCorrectly} of ${stats.totalQuestions} right.`}
      </AppText>
      <AppText fontWeight="medium" size={12} style={styles.heroSmall}>
        {verdict.sub}
      </AppText>
    </BannerShell>
  );
};

// ─── Screen ──────────────────────────────────────────────────────────────────

const QuestionStudyScreen = () => {
  const route = useLocalSearchParams();
  const router = useRouter();
  const [screen, setScreen] = useState(0);
  const [count, setCount] = useState(`${MINIMUM_QUESTIONS}`);
  const [prompt, setPrompt] = useState({ vis: false, data: null });
  const [qBank, setQBank] = useState({});
  const [bools, setBools] = useState({ loading: true, showLoadAd: true });
  const [timer, setTimer] = useState(null);
  const [popData, setPopData] = useState({ vis: false });
  const [questions, setQuestions] = useState({
    questions: [],
    totalAvailable: 0,
  });
  const [adError, setAdError] = useState(null);
  const [session, setSession] = useState({
    totalQuestions: 1,
    questions: [],
  });
  const [adLoaded, setAdLoaded] = useState(false);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);

  const { data, isLoading: isFetchingBank } = useGetMyQuestionsQuery();
  const [updateUserActivity] = useUpdateUserActivityMutation();

  const insets = useSafeAreaInsets();
  const stats = getStats(session);
  const user = useSelector(selectUser);
  const timerRef = useRef();
  const rewardedRef = useRef(null);
  const interstitialRef = useRef(null);
  const hasActiveSub = user?.subscription?.isActive;

  const hasBank = Boolean(qBank?.data);
  const maxCount = hasActiveSub
    ? questions?.totalAvailable
    : Math.min(questions?.totalAvailable, FREE_MAX_QUESTIONS);

  const score = stats.totalQuestions
    ? Math.round((stats.answeredCorrectly / stats.totalQuestions) * 100)
    : 0;

  const countNum = parseInt(count);
  const countInvalid =
    !countNum || countNum < MINIMUM_QUESTIONS || countNum > maxCount;

  const setClamped = (n) =>
    setCount(`${Math.min(Math.max(n, MINIMUM_QUESTIONS), maxCount)}`);

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
      const elapsed = Date.now() - new Date(quizTimer).getTime(); // ms

      // Only block while the waiting period is still running.
      if (elapsed < TOTAL_TIME) {
        setPopData({
          vis: true,
          msg: "Subscribe now to skip waiting time",
          type: "failed",
        });
        return;
      }
    }

    setScreen(1);
    if (!hasActiveSub) {
      await AsyncStorage.setItem("free_quiz", new Date().toISOString());
    }
  };

  const handlePrompt = (type) => {
    if (type === "quit") setScreen(0);
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

  const handleQuizFinish = async () => {
    setScreen(2);
    setTimeout(() => {
      try {
        !hasActiveSub && interstitialLoaded && interstitialRef.current?.show();
      } catch (_err) {}
    }, 1000);

    try {
      await updateUserActivity().unwrap();
    } catch (_errr) {
      setPopData({
        vis: true,
        msg: "Unable to sync quiz activity. Ensure good internet access",
        type: "failed",
      });
    }
  };

  const loadQuestions = async () => {
    const qCache = await AsyncStorage.getItem("qBank");
    if (qCache) {
      setQBank(JSON.parse(qCache));
    } else {
      setQBank(data);
    }
    setBools({ ...bools, loading: false });

    // Check timer
    if (!hasActiveSub) {
      const quizTimer = await AsyncStorage.getItem("free_quiz");
      if (quizTimer) {
        const elapsed = Date.now() - new Date(quizTimer).getTime(); // ms
        const remaining = TOTAL_TIME - elapsed; // ms

        // ms → seconds
        setTimer(remaining > 0 ? Math.floor(remaining / 1000) : null);
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

  // Rewarded ad (skip the waiting time)
  useEffect(() => {
    if (hasActiveSub) return;
    const rewarded = RewardedAd.createForAdRequest(
      rewardedAdUnitId,
      nonPersonalizedAdRequestOptions,
    );

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
      () => {
        handleAdReward();
      },
    );

    const unsubscribeError = rewarded.addAdEventListener(
      AdEventType.ERROR,
      () => {
        setAdLoaded(false);
        setAdError(true);
        retryLoadAd();
      },
    );

    rewarded.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeError();
    };
  }, []);

  // Interstitial (shown after a free quiz)
  useEffect(() => {
    if (hasActiveSub) return;

    const interstitial = InterstitialAd.createForAdRequest(
      interstitialAdUnitId,
      nonPersonalizedAdRequestOptions,
    );

    interstitialRef.current = interstitial;

    const unsubscribeLoaded = interstitial.addAdEventListener(
      AdEventType.LOADED,
      () => setInterstitialLoaded(true),
    );

    // Results are already on screen (handleQuizFinish), so just reset state.
    const unsubscribeClosed = interstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => setInterstitialLoaded(false),
    );

    const unsubscribeError = interstitial.addAdEventListener(
      AdEventType.ERROR,
      () => setInterstitialLoaded(false),
    );

    interstitial.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, []);

  const onWatchAd = () => {
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
  };

  const adReady = adLoaded || bools.showLoadAd;
  const locked = hasBank && questions?.totalAvailable < MINIMUM_QUESTIONS;
  const presets = [5, 10, 20, 30].filter((n) => n <= maxCount);

  return (
    <View style={styles.container}>
      {/* ───────── 0 · Setup ───────── */}
      {screen === 0 && (
        <Animated.View exiting={SlideOutLeft} style={{ flex: 1 }}>
          <AppHeader title={`${route?.subjectName} Practice`} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.scroll,
              { paddingBottom: PAD_BOTTOM },
            ]}
          >
            <BannerShell
              art={
                <View style={styles.heroArt}>
                  <Sticker icon={locked ? "lock-closed" : "rocket"} />
                </View>
              }
            >
              <View style={styles.heroTag}>
                <AppText
                  fontWeight="black"
                  size={9.5}
                  style={styles.heroTagText}
                >
                  PRACTICE MODE
                </AppText>
              </View>
              <AppText
                fontWeight="black"
                size={20}
                numberOfLines={3}
                style={[styles.heroTitle, { textTransform: "capitalize" }]}
              >
                {route?.topicName}
              </AppText>
              <AppText fontWeight="medium" size={12.5} style={styles.heroDesc}>
                Sharpen your skills with questions from this topic.
              </AppText>
              {hasBank && (
                <Chip
                  icon="layers"
                  label={`${questions?.totalAvailable ?? 0} questions`}
                  color={T.ink}
                  bg={T.chalk}
                  style={{ marginTop: 10 }}
                />
              )}
            </BannerShell>

            {locked ? (
              <>
                <Card index={1} base={80} style={{ alignItems: "center" }}>
                  <LottieAnimator
                    name="person_float"
                    style={{ width: width * 0.5, height: width * 0.5 }}
                    visible
                  />
                  <AppText
                    fontWeight="black"
                    size={17}
                    style={{ color: T.ink, textAlign: "center" }}
                  >
                    Practice unlocks soon
                  </AppText>
                  <AppText
                    fontWeight="medium"
                    size={13}
                    style={styles.lockedText}
                  >
                    This is Practice Mode, where you can hone your skills with
                    questions from this topic. You need to complete a few more
                    questions to unlock this section.
                  </AppText>
                </Card>
                <Note index={2} base={80} icon="rocket" title="How to unlock">
                  <AppText
                    fontWeight="medium"
                    size={12.5}
                    style={styles.noteText}
                  >
                    Start a new quiz by tapping the Rocket icon and begin
                    earning your progress.
                  </AppText>
                </Note>
              </>
            ) : (
              hasBank && (
                <>
                  <Card index={1} base={80}>
                    <SectionTitle
                      icon="options"
                      title="How many questions?"
                      sub={`Pick between ${MINIMUM_QUESTIONS} and ${maxCount}`}
                    />

                    <View style={styles.stepper}>
                      <StepBtn
                        icon="remove"
                        disabled={(countNum || 0) <= MINIMUM_QUESTIONS}
                        onPress={() =>
                          setClamped((countNum || MINIMUM_QUESTIONS) - 1)
                        }
                      />
                      <TextInput
                        placeholder="0"
                        value={count}
                        placeholderTextColor={T.faint}
                        keyboardType="numeric"
                        maxLength={4}
                        onChangeText={(val) =>
                          setCount(val.replace(/[^0-9]/g, ""))
                        }
                        style={[
                          styles.input,
                          countInvalid && {
                            borderColor: T.coralLine,
                            color: T.coralDark,
                          },
                        ]}
                      />
                      <StepBtn
                        icon="add"
                        disabled={(countNum || 0) >= maxCount}
                        onPress={() =>
                          setClamped((countNum || MINIMUM_QUESTIONS) + 1)
                        }
                      />
                    </View>

                    <View style={styles.presets}>
                      {presets.map((n) => (
                        <Preset
                          key={n}
                          label={`${n}`}
                          active={countNum === n}
                          onPress={() => setClamped(n)}
                        />
                      ))}
                      {maxCount > MINIMUM_QUESTIONS &&
                        !presets.includes(maxCount) && (
                          <Preset
                            label="Max"
                            active={countNum === maxCount}
                            onPress={() => setClamped(maxCount)}
                          />
                        )}
                    </View>

                    {countInvalid && (
                      <AppText
                        fontWeight="semibold"
                        size={12}
                        style={styles.invalid}
                      >
                        {`Choose a number between ${MINIMUM_QUESTIONS} and ${maxCount}.`}
                      </AppText>
                    )}
                  </Card>

                  {!hasActiveSub &&
                    questions?.totalAvailable > FREE_MAX_QUESTIONS && (
                      <Note
                        index={2}
                        base={80}
                        icon="sparkles"
                        title="Free plan"
                      >
                        <AppText
                          fontWeight="medium"
                          size={12.5}
                          style={styles.noteText}
                        >
                          {`You can practise up to ${FREE_MAX_QUESTIONS} questions per session. Subscribe to unlock all ${questions.totalAvailable}.`}
                        </AppText>
                      </Note>
                    )}

                  {Boolean(timer) && (
                    <Card
                      index={3}
                      base={80}
                      style={{
                        backgroundColor: T.yellowSoft,
                        borderColor: T.yellowLine,
                      }}
                    >
                      <SectionTitle
                        icon="hourglass"
                        color={T.yellowInk}
                        bg="#fff"
                        title="Next free quiz in"
                        sub={`Free users get one quiz every ${TIME_INTERVAL} hours`}
                      />
                      <CountdownTimer
                        ref={timerRef}
                        time={timer}
                        autoStart={true}
                        style={{ alignItems: "center", marginBottom: 14 }}
                        onComplete={() => {}}
                        onSkip={() => {}}
                      />
                      <JambButton
                        title={adReady ? "Watch ad to skip" : "Loading ad…"}
                        variant="yellow"
                        icon="play"
                        disabled={!adReady}
                        onPress={onWatchAd}
                      />
                    </Card>
                  )}

                  <JambButton
                    title="Start Quiz"
                    icon={timer ? "lock-closed" : "rocket"}
                    variant={timer ? "ghost" : "primary"}
                    onPress={handleStart}
                    style={{ marginTop: 4 }}
                  />
                </>
              )
            )}
          </ScrollView>
        </Animated.View>
      )}

      {/* ───────── 1 · Quiz ───────── */}
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
            hardReset={() => setScreen(0)}
            setQuizInfoView={handleQuizFinish}
            handleQuit={() => setPrompt({ vis: true, data: QUIT_PROMPT })}
          />
        </Animated.View>
      )}

      {/* ───────── 2 · Results ───────── */}
      {screen === 2 && (
        <Animated.View
          entering={SlideInRight.springify().damping(60)}
          exiting={SlideOutRight}
          style={{ flex: 1, marginBottom: insets.bottom + 10 }}
        >
          <AppHeader title={`${route?.subjectName} Practice`} />

          <FlatList
            data={["results"]}
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: PAD_BOTTOM }}
            renderItem={() => (
              <>
                <View style={styles.scroll}>
                  <ResultHero stats={stats} score={score} />

                  <View style={styles.tiles}>
                    <StatTile
                      index={0}
                      value={stats.answeredCorrectly}
                      label="Correct"
                      icon="checkmark-circle"
                      tone={TONES.green}
                    />
                    <StatTile
                      index={1}
                      value={stats.totalQuestions - stats.answeredCorrectly}
                      label="Wrong"
                      icon="close-circle"
                      tone={TONES.coral}
                    />
                    <StatTile
                      index={2}
                      value={stats.totalQuestions}
                      label="Total"
                      icon="layers"
                      tone={TONES.yellow}
                    />
                  </View>

                  <Note
                    index={3}
                    base={250}
                    icon="information-circle"
                    title="Free practice"
                  >
                    <AppText
                      fontWeight="medium"
                      size={12.5}
                      style={styles.noteText}
                    >
                      Tokens (GT) are not added to your account for practice
                      sessions.
                    </AppText>
                  </Note>

                  <View style={styles.actions}>
                    <JambButton
                      title="Practice again"
                      icon="refresh"
                      onPress={() => setScreen(0)}
                    />
                    <JambButton
                      title="Back to topics"
                      icon="arrow-back"
                      variant="ghost"
                      onPress={() => router.back()}
                    />
                  </View>

                  <SectionTitle
                    icon="checkmark-done"
                    title="Review corrections"
                    sub="Learn from every answer"
                  />
                </View>

                <QuizCorrections data={session?.questions} isSingle />
              </>
            )}
          />
        </Animated.View>
      )}

      <LottieAnimator
        visible={bools.loading || (isFetchingBank && !hasBank)}
        absolute
      />
      <PromptModal
        prompt={prompt}
        setPrompt={(d) => setPrompt(d)}
        onPress={handlePrompt}
      />
      <PopMessage popData={popData} setPopData={setPopData} />
    </View>
  );
};

export default QuestionStudyScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },

  // hero (shared by setup + results)
  heroArt: {
    width: BANNER_ART * 1.15,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,199,54,0.18)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 9,
  },
  heroTagText: { color: T.yellow, letterSpacing: 1 },
  heroTitle: { color: T.chalk, lineHeight: 26 },
  heroDesc: { color: T.chalkSoft, marginTop: 7, lineHeight: 18 },
  heroSmall: { color: T.chalkSoft, marginTop: 5, lineHeight: 17 },

  // sticker
  stickerWrap: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  sticker: {
    width: 78,
    height: 88,
    borderRadius: 18,
    backgroundColor: T.card,
    borderWidth: 2.5,
    borderBottomWidth: 6,
    borderColor: T.ink,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-6deg" }],
  },
  stickerRule: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.coral,
    marginTop: 8,
  },
  stickerStar: {
    position: "absolute",
    top: 2,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: T.yellow,
    borderWidth: 2,
    borderColor: T.ink,
    alignItems: "center",
    justifyContent: "center",
  },

  // setup
  stepper: { flexDirection: "row", alignItems: "center" },
  stepFace: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    height: 60,
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.line,
    backgroundColor: T.paper,
    textAlign: "center",
    fontFamily: "sf-black",
    fontSize: 30,
    color: T.ink,
  },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  preset: {
    minWidth: 52,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.line,
    alignItems: "center",
  },
  presetOn: { backgroundColor: T.green, borderColor: T.greenDark },
  invalid: { color: T.coralDark, marginTop: 12 },
  lockedText: {
    color: T.sub,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
  },
  noteText: { color: "#4A4020", marginTop: 4, lineHeight: 18 },

  // result
  tiles: { flexDirection: "row", gap: 10, marginBottom: 14 },
  tile: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
  },
  actions: { gap: 8, marginTop: 6, marginBottom: 20 },
});
