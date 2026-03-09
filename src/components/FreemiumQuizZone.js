/* eslint-disable react-hooks/exhaustive-deps */
/**
 * FreemiumQuizZone.js
 *
 * A gamified, fully-animated Quiz Zone for freemium users.
 * Flow: Category (random picks) → Subject → Topic → 15 Questions/day
 */

import {
  Dimensions,
  FlatList,
  StyleSheet,
  View,
  Pressable,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import Animated, {
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  withSpring,
  withSequence,
  useAnimatedStyle,
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  SlideInRight,
  SlideOutLeft,
  BounceIn,
} from "react-native-reanimated";
import LottieView from "lottie-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";

import AppText from "./AppText";
import AppButton from "./AppButton";
import AppLogo from "./AppLogo";
import LottieAnimator from "./LottieAnimator";
import PromptModal from "./PromptModal";
import PopMessage from "./PopMessage";
import QuestionDisplay from "./QuestionDisplay";
import FinishedQuiz from "./FinishedQuiz";
import Screen from "./Screen";
import ProgressBar from "./ProgressBar";

import colors from "../helpers/colors";
import { enterAnimOther, exitingAnim } from "../helpers/dataStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import {
  useFetchCategoriesQuery,
  useFetchSubjectCategoriesQuery,
  useFetchSubjectsTopicsMutation,
} from "../context/instanceSlice";
import { apiSlice } from "../context/apiSlice";
import progressAnim from "../../assets/animations/progress.json";

// ─── Constants ───────────────────────────────────────────────────────────────

const AnimatedLottie = Animated.createAnimatedComponent(LottieView);
const { width } = Dimensions.get("screen");

const TOTAL_QUESTIONS = 15;
const MAX_RANDOM_CATEGORIES = 2;

const QUIT_PROMPT = {
  title: "Exit Quiz Zone",
  msg: "Are you sure you want to quit the Daily Quiz Zone?",
  btn: "Quit",
  type: "quit",
};

const FREEMIUM_COLORS = {
  gradientStart: "#1a1a2e",
  gradientMid: "#16213e",
  gradientEnd: "#0f3460",
  accent: colors.primary,
  accentLight: colors.primaryLight,
  gold: "#FFD700",
  goldLight: "#FFF3B0",
  card: "rgba(255,255,255,0.08)",
  cardBorder: "rgba(255,255,255,0.12)",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.65)",
};

const initials = {
  view: "intro",
  category: null,
  subject: null,
  topic: null,
  bar: 1,
};

// ─── Freemium RTK Query endpoint ─────────────────────────────────────────────
const freemiumApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    fetchFreemiumQuiz: builder.mutation({
      query: ({ categoryId, subjectId, topicId }) => ({
        url: "/instance/freemium_quiz",
        method: "POST",
        body: { categoryId, subjectId, topicId },
      }),
    }),
  }),
});

const { useFetchFreemiumQuizMutation } = freemiumApi;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Category eligibility based on user's class level.
 * JSS users → Junior School categories only
 * SSS (or unknown) → Senior School categories only
 */
const isCategoryEligible = (category, userLevel = "") => {
  const level = (userLevel ?? "").toUpperCase();
  const name = (category?.name ?? "").toLowerCase();
  const isJunior =
    name.includes("junior") || name.includes("jss") || name.includes("basic");

  if (level.startsWith("JSS")) return isJunior;
  return !isJunior;
};

// ─── Main Component ───────────────────────────────────────────────────────────

const FreemiumQuizZone = ({ setVisible }) => {
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);

  const [quizInfo, setQuizInfo] = useState(initials);
  const [prompt, setPrompt] = useState({ vis: false, data: null });
  const [popper, setPopper] = useState({ vis: false });
  const [session, setSession] = useState({ totalQuestions: 1, questions: [] });
  const [randomCategories, setRandomCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);

  /**
   * Cache shuffled subjects keyed by category._id.
   * Once a category has been visited its subject order is locked for the
   * entire session — the student cannot keep going back to re-roll.
   */
  const subjectShuffleCache = useRef({});

  const animProgress = useSharedValue(0);

  const { data: allCategories, isLoading: catLoading } =
    useFetchCategoriesQuery();

  const { data: subjectsData, isLoading: subjLoading } =
    useFetchSubjectCategoriesQuery(quizInfo?.category?._id, {
      skip: !Boolean(quizInfo?.category?._id),
    });

  const [fetchFreemiumQuiz, { isLoading: quizLoading }] =
    useFetchFreemiumQuizMutation();

  const [fetchTopics, { isLoading: topicsLoading }] =
    useFetchSubjectsTopicsMutation();

  const animatedProps = useAnimatedProps(() => ({
    progress: animProgress.value,
  }));

  // Derived flags
  const isIntro = quizInfo.view === "intro";
  const isCategory = quizInfo.view === "category";
  const isSubject = quizInfo.view === "subject";
  const isTopic = quizInfo.view === "topic";
  const isQuiz = quizInfo.view === "quiz";
  const isStart = quizInfo.view === "start";
  const isFinished = quizInfo.view === "finished";

  // Randomise categories once — filtered by user's class level
  useEffect(() => {
    if (allCategories?.data?.length) {
      const userLevel = user?.class?.level ?? "";
      const eligible = allCategories.data.filter((cat) =>
        isCategoryEligible(cat, userLevel),
      );
      const shuffled = [...eligible].sort(() => Math.random() - 0.5);
      setRandomCategories(shuffled.slice(0, MAX_RANDOM_CATEGORIES));
    }
  }, [allCategories, user?.class?.level]);

  // Set subjects when category data arrives — locked shuffle via cache
  useEffect(() => {
    if (!subjectsData?.data || !quizInfo.category?._id) return;

    const catId = quizInfo.category._id;

    // Reuse the existing shuffle if this category was visited before
    if (subjectShuffleCache.current[catId]) {
      setSubjects(subjectShuffleCache.current[catId]);
      return;
    }

    // First visit — shuffle once and lock it in the cache
    const shuffled = [...subjectsData.data].sort(() => Math.random() - 0.5);
    const sliced = shuffled.slice(0, 2);
    subjectShuffleCache.current[catId] = sliced;
    setSubjects(sliced);
  }, [subjectsData, quizInfo.category?._id]);

  // Fetch topics when a subject is selected
  useEffect(() => {
    if (!quizInfo.subject || !quizInfo.category?._id) return;

    const loadTopics = async () => {
      try {
        const subjectList = [quizInfo.subject._id];

        const res = await fetchTopics({
          subjects: subjectList,
          category: quizInfo.category?._id,
        }).unwrap();

        const raw = res?.data?.[0]?.topics ?? [];
        const shuffled = [...raw].sort(() => Math.random() - 0.5);
        setTopics(shuffled.slice(0, 4));
      } catch (err) {
        setPopper({
          vis: true,
          msg: err?.data?.message ?? "Could not load topics. Try again.",
          type: "failed",
          timer: 5000,
        });
        setTopics([]);
      }
    };

    loadTopics();
  }, [quizInfo.subject]);

  const handlePrompt = (type) => {
    if (type === "quit") setVisible(false);
  };

  const handleGoBack = () => {
    const map = {
      category: { view: "intro", bar: 1 },
      subject: { view: "category", bar: 2 },
      topic: { view: "subject", bar: 3 },
    };
    const next = map[quizInfo.view];
    if (next) setQuizInfo((p) => ({ ...p, ...next }));
  };

  const handleNext = async () => {
    if (isIntro) {
      setQuizInfo((p) => ({ ...p, view: "category", bar: 2 }));
    } else if (isCategory && quizInfo.category) {
      setQuizInfo((p) => ({ ...p, view: "subject", bar: 3 }));
    } else if (isSubject && quizInfo.subject) {
      setQuizInfo((p) => ({ ...p, view: "topic", bar: 4 }));
    } else if (isTopic && quizInfo.topic) {
      await startQuiz();
    }
  };

  const startQuiz = async () => {
    setQuizInfo((p) => ({ ...p, view: "quiz" }));
    animProgress.value = withTiming(0, { duration: 1 });
    animProgress.value = withTiming(0.65, { duration: 18000 }, (done) => {
      if (done) animProgress.value = withTiming(0.88, { duration: 30000 });
    });

    try {
      const res = await fetchFreemiumQuiz({
        categoryId: quizInfo.category._id,
        subjectId: quizInfo.subject._id,
        topicId: quizInfo.topic._id,
      }).unwrap();

      console.log({ res });

      animProgress.value = withTiming(1, { duration: 800 }, (done) => {
        if (done && Boolean(res?.data)) {
          runOnJS(setQuizInfo)((p) => ({
            ...p,
            view: "start",
            qBank: res.data,
          }));
        }
      });
    } catch (err) {
      console.log({ err });
      animProgress.value = withTiming(1, { duration: 400 });
      setPopper({
        vis: true,
        msg: err?.data?.message ?? "Could not load quiz. Try again.",
        type: "failed",
        timer: 6000,
        cb: () => {
          animProgress.value = 0;
          setQuizInfo((p) => ({ ...p, view: "topic" }));
        },
      });
    }
  };

  const showNextBtn =
    isIntro ||
    (isCategory && Boolean(quizInfo.category)) ||
    (isSubject && Boolean(quizInfo.subject)) ||
    (isTopic && Boolean(quizInfo.topic));

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + 10 }]}>
      <LinearGradient
        colors={[
          FREEMIUM_COLORS.gradientStart,
          FREEMIUM_COLORS.gradientMid,
          FREEMIUM_COLORS.gradientEnd,
        ]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.blob1} />
      <View style={styles.blob2} />

      {isFinished ? (
        <FinishedQuiz
          session={session}
          data={{ type: "freemium" }}
          retry={() => setQuizInfo({ ...initials, view: "intro" })}
          hideModal={() => setVisible(false)}
        />
      ) : isStart ? (
        <Screen>
          <QuestionDisplay
            handleQuit={() => setPrompt({ vis: true, data: QUIT_PROMPT })}
            setQuizInfoView={(val) => setQuizInfo((p) => ({ ...p, view: val }))}
            hardReset={() => setQuizInfo(initials)}
            setQuizSession={setSession}
            questionBank={quizInfo.qBank ?? []}
          />
        </Screen>
      ) : isQuiz ? (
        <Screen>
          <Animated.View entering={FadeIn} style={styles.loadingWrap}>
            <AppLogo hideName size={width * 0.28} />
            <Animated.Text
              entering={FadeInDown.delay(300)}
              style={styles.loadingTitle}
            >
              Shuffling Questions…
            </Animated.Text>
            <Animated.Text
              entering={FadeInDown.delay(500)}
              style={styles.loadingSubtitle}
            >
              {TOTAL_QUESTIONS} random questions just for you
            </Animated.Text>
            <AnimatedLottie
              animatedProps={animatedProps}
              source={progressAnim}
              autoPlay={false}
              loop={false}
              style={{ width: width * 0.95, height: 90, marginTop: 30 }}
            />
            <AppButton
              title="Cancel"
              type="warn"
              onPress={() => setPrompt({ vis: true, data: QUIT_PROMPT })}
              contStyle={{ marginTop: 20 }}
            />
          </Animated.View>
        </Screen>
      ) : (
        <Screen>
          {isIntro ? (
            <IntroHeader />
          ) : (
            <Animated.View
              entering={FadeInDown.duration(400)}
              style={styles.header}
            >
              <AppText
                fontWeight="black"
                style={styles.headerTitle}
                size="xlarge"
              >
                {isCategory
                  ? "Pick a Category"
                  : isSubject
                  ? "Choose a Subject"
                  : "Choose a Topic"}
              </AppText>
              <AppText style={styles.headerSub} size="medium">
                {isCategory
                  ? `${MAX_RANDOM_CATEGORIES} random picks today`
                  : isSubject
                  ? quizInfo.category?.name
                  : quizInfo.subject?.name}
              </AppText>
              <ProgressBar numberOfBars={4} currentBar={quizInfo.bar} />
            </Animated.View>
          )}

          <View style={styles.content}>
            {isIntro && (
              <IntroContent
                onStart={() =>
                  setQuizInfo((p) => ({ ...p, view: "category", bar: 2 }))
                }
                totalQ={TOTAL_QUESTIONS}
              />
            )}

            {isCategory && (
              <Animated.View
                entering={enterAnimOther}
                exiting={exitingAnim}
                style={styles.gridWrap}
              >
                <FlatList
                  data={randomCategories}
                  numColumns={2}
                  keyExtractor={(item) => item._id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.grid}
                  renderItem={({ item, index }) => (
                    <FreemiumCard
                      item={item}
                      index={index}
                      isSelected={quizInfo.category?._id === item._id}
                      onPress={() =>
                        setQuizInfo((p) => ({ ...p, category: item }))
                      }
                    />
                  )}
                />
                <LottieAnimator visible={catLoading} absolute wTransparent />
              </Animated.View>
            )}

            {isSubject && (
              <Animated.View
                entering={enterAnimOther}
                exiting={exitingAnim}
                style={styles.gridWrap}
              >
                <FlatList
                  data={subjects}
                  numColumns={2}
                  keyExtractor={(item) => item._id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.grid}
                  renderItem={({ item, index }) => (
                    <FreemiumCard
                      item={item}
                      index={index}
                      isSelected={quizInfo.subject?._id === item._id}
                      onPress={() =>
                        setQuizInfo((p) => ({ ...p, subject: item }))
                      }
                    />
                  )}
                />
                <LottieAnimator visible={subjLoading} absolute wTransparent />
              </Animated.View>
            )}

            {isTopic && (
              <Animated.View
                entering={enterAnimOther}
                exiting={exitingAnim}
                style={{ width: "100%", flex: 1 }}
              >
                {topicsLoading ? (
                  <LottieAnimator visible absolute wTransparent />
                ) : topics.length === 0 ? (
                  <Animated.View entering={FadeIn} style={styles.emptyTopics}>
                    <LottieAnimator name="student_hi" size={120} />
                    <AppText style={styles.emptyTxt}>
                      No topics available for this subject yet.
                    </AppText>
                    <AppButton
                      title="Go Back"
                      type="white"
                      onPress={handleGoBack}
                    />
                  </Animated.View>
                ) : (
                  <FlatList
                    data={topics}
                    keyExtractor={(item) => item._id?.toString()}
                    contentContainerStyle={styles.topicList}
                    renderItem={({ item, index }) => (
                      <TopicRow
                        item={item}
                        index={index}
                        isSelected={quizInfo.topic?._id === item._id}
                        onPress={() =>
                          setQuizInfo((p) => ({ ...p, topic: item }))
                        }
                      />
                    )}
                  />
                )}
              </Animated.View>
            )}
          </View>

          {!isIntro && (
            <View style={styles.btns}>
              <AppButton
                title="Quit"
                type="warn"
                onPress={() => setPrompt({ vis: true, data: QUIT_PROMPT })}
              />
              {(isCategory || isSubject || isTopic) && (
                <AppButton title="Back" type="white" onPress={handleGoBack} />
              )}
              {showNextBtn && !isIntro && (
                <AppButton
                  title={
                    isTopic ? `Start ${TOTAL_QUESTIONS} Questions` : "Next"
                  }
                  onPress={handleNext}
                  disabled={
                    (isCategory && !quizInfo.category) ||
                    (isSubject && !quizInfo.subject) ||
                    (isTopic && !quizInfo.topic)
                  }
                />
              )}
            </View>
          )}
        </Screen>
      )}

      <PromptModal
        prompt={prompt}
        setPrompt={(d) => setPrompt(d)}
        onPress={handlePrompt}
      />
      <PopMessage popData={popper} setPopData={setPopper} />
      <StatusBar style="light" />
    </View>
  );
};

export default FreemiumQuizZone;

// ─── Sub-components ───────────────────────────────────────────────────────────

const IntroHeader = () => (
  <Animated.View entering={FadeInDown.duration(600)} style={styles.introHeader}>
    <View style={styles.rocketWrap}>
      <View style={styles.rocketGlow} />
      <AppLogo hideName size={85} transparent />
    </View>
    <AppText fontWeight="black" style={styles.introTitle} size="xxlarge">
      Daily Freemium Quiz
    </AppText>
    <AppText style={styles.introSub}>
      Free · Refreshes every 24 hours · 15 questions
    </AppText>
  </Animated.View>
);

const IntroContent = ({ onStart, totalQ }) => {
  const stats = [
    { icon: "🎯", label: "Questions", value: `${totalQ} Today` },
    { icon: "⏰", label: "Resets", value: "Midnight" },
    { icon: "🏆", label: "Earn Points", value: "Answer right" },
  ];

  return (
    <Animated.View entering={FadeInUp.delay(200)} style={styles.introBody}>
      <View style={styles.statsRow}>
        {stats.map((s, i) => (
          <Animated.View
            key={i}
            entering={ZoomIn.delay(200 + i * 120)}
            style={styles.statPill}
          >
            <AppText style={styles.statIcon}>{s.icon}</AppText>
            <AppText style={styles.statValue} fontWeight="heavy">
              {s.value}
            </AppText>
            <AppText style={styles.statLabel}>{s.label}</AppText>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={FadeInUp.delay(600)} style={styles.ctaWrap}>
        <LottieAnimator name="student_jumping" size={160} />
        <AppButton
          title="Let's Go! 🎉"
          onPress={onStart}
          contStyle={styles.ctaBtn}
        />
        <AppText style={styles.freeBadge}>
          ✨ 100% Free — No subscription needed
        </AppText>
      </Animated.View>
    </Animated.View>
  );
};

const FreemiumCard = ({ item, index, isSelected, onPress }) => {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.93, { duration: 100 }),
      withSpring(1, { damping: 8 }),
    );
    onPress();
  };

  const SIZE = width * 0.38;

  return (
    <Animated.View
      entering={ZoomIn.delay(index * 100).springify()}
      style={animStyle}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          { width: SIZE, height: SIZE },
          isSelected && styles.cardSelected,
          pressed && { opacity: 0.85 },
        ]}
      >
        {isSelected && (
          <Animated.View entering={ZoomIn} style={styles.cardCheck}>
            <AppText style={styles.cardCheckText}>✓</AppText>
          </Animated.View>
        )}
        <Image
          source={item.image}
          style={{ width: SIZE * 0.5, height: SIZE * 0.5 }}
          contentFit="contain"
        />
        {/* Single style object — no array — so AppText renders correctly */}
        <AppText
          fontWeight="bold"
          size="medium"
          style={isSelected ? styles.cardLabelSelected : styles.cardLabel}
          numberOfLines={2}
        >
          {item.name}
        </AppText>
      </Pressable>
    </Animated.View>
  );
};

const TopicRow = ({ item, index, isSelected, onPress }) => {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.96, { duration: 80 }),
      withSpring(1),
    );
    onPress();
  };

  const qCount = item.questionCount ?? item.questions?.length ?? 0;

  return (
    <Animated.View
      entering={SlideInRight.delay(index * 70).springify()}
      exiting={SlideOutLeft}
      style={animStyle}
    >
      <Pressable
        onPress={handlePress}
        style={isSelected ? styles.topicRowSelected : styles.topicRow}
      >
        <View style={styles.topicLeft}>
          {/* Single style object per state — no array */}
          <View
            style={isSelected ? styles.topicDotSelected : styles.topicDot}
          />
          <AppText
            fontWeight={isSelected ? "heavy" : "medium"}
            style={isSelected ? styles.topicNameSelected : styles.topicName}
            numberOfLines={2}
          >
            {item.name}
          </AppText>
        </View>
        <View style={styles.topicRight}>
          {qCount > 0 && (
            <View style={styles.qBadge}>
              <AppText style={styles.qBadgeTxt} fontWeight="bold">
                {qCount}q
              </AppText>
            </View>
          )}
          {isSelected && (
            <Animated.Text entering={BounceIn} style={styles.topicCheck}>
              ✓
            </Animated.Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
  },
  blob1: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.primary + "18",
    top: -60,
    right: -60,
  },
  blob2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.accent + "14",
    bottom: 100,
    left: -70,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    color: FREEMIUM_COLORS.textPrimary,
    marginBottom: 4,
  },
  headerSub: {
    color: FREEMIUM_COLORS.textSecondary,
    textTransform: "capitalize",
    marginBottom: 14,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingTop: 10,
  },
  gridWrap: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  grid: {
    alignItems: "center",
    paddingVertical: 10,
    gap: 14,
  },
  card: {
    borderRadius: 18,
    backgroundColor: FREEMIUM_COLORS.card,
    borderWidth: 1.5,
    borderColor: FREEMIUM_COLORS.cardBorder,
    margin: 8,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    gap: 8,
  },
  cardSelected: {
    backgroundColor: colors.primaryLighter,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  cardCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  // Dedicated style objects so AppText never receives an array
  cardCheckText: {
    fontSize: 14,
  },
  cardLabel: {
    textAlign: "center",
    color: FREEMIUM_COLORS.textPrimary,
    lineHeight: 18,
    textTransform: "capitalize",
  },
  cardLabelSelected: {
    textAlign: "center",
    color: colors.primaryDeeper,
    lineHeight: 18,
    textTransform: "capitalize",
  },
  topicList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: FREEMIUM_COLORS.card,
    borderWidth: 1,
    borderColor: FREEMIUM_COLORS.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: width - 32,
  },
  topicRowSelected: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primaryLighter,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: width - 32,
  },
  topicLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  topicDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: FREEMIUM_COLORS.cardBorder,
  },
  topicDotSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  topicName: {
    flex: 1,
    color: FREEMIUM_COLORS.textPrimary,
    textTransform: "capitalize",
  },
  topicNameSelected: {
    flex: 1,
    color: colors.primaryDeep,
    textTransform: "capitalize",
  },
  topicRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qBadge: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  qBadgeTxt: {
    color: FREEMIUM_COLORS.textSecondary,
    fontSize: 11,
  },
  topicCheck: {
    color: colors.primaryDeep,
    fontSize: 18,
    fontFamily: "sf-heavy",
  },
  emptyTopics: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyTxt: {
    color: FREEMIUM_COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: 30,
  },
  btns: {
    width,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingTitle: {
    color: FREEMIUM_COLORS.textPrimary,
    fontFamily: "sf-heavy",
    fontSize: 22,
    marginTop: 24,
    textAlign: "center",
  },
  loadingSubtitle: {
    color: FREEMIUM_COLORS.textSecondary,
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  introHeader: {
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 10,
  },
  rocketWrap: {
    position: "relative",
    width: 90,
    height: 90,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  rocketGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + "30",
  },
  rocketEmoji: {
    fontSize: 52,
  },
  introTitle: {
    color: FREEMIUM_COLORS.textPrimary,
    textAlign: "center",
  },
  introSub: {
    color: FREEMIUM_COLORS.textSecondary,
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
  },
  introBody: {
    flex: 1,
    alignItems: "center",
    width: "100%",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  statPill: {
    flex: 1,
    maxWidth: 110,
    alignItems: "center",
    backgroundColor: FREEMIUM_COLORS.card,
    borderWidth: 1,
    borderColor: FREEMIUM_COLORS.cardBorder,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 4,
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    color: colors.primary,
    fontSize: 13,
    textAlign: "center",
  },
  statLabel: {
    color: FREEMIUM_COLORS.textSecondary,
    fontSize: 11,
    textAlign: "center",
  },
  ctaWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingBottom: 20,
  },
  ctaBtn: {
    marginTop: 6,
    width: width * 0.65,
  },
  freeBadge: {
    color: FREEMIUM_COLORS.textSecondary,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
});
