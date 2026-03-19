import { Dimensions, FlatList, StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import { useEffect, useState } from "react";
import colors from "../helpers/colors";
import QuizStat from "./QuizStat";
import LottieAnimator from "./LottieAnimator";
import AppButton from "./AppButton";
import QuizCorrections from "./QuizCorrections";
import { useSubmitQuizMutation } from "../context/schoolSlice";
import {
  useSubmitFreemiumQuizMutation,
  useSubmitPremiumQuizMutation,
} from "../context/instanceSlice";
import {
  LeaderboardItem,
  LeaderboardWinners,
} from "../screens/LeaderboardScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getUserProfile, socket } from "../helpers/helperFunctions";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";

const { width, height } = Dimensions.get("screen");

const calculateQuestionCount = (session) => {
  let count = 0;
  session.forEach((sess) => {
    count += sess?.questions?.length;
  });

  return count;
};

const FinishedQuiz = ({
  hideModal,
  data,
  retried,
  retry,
  sessionId,
  session,
  duration, // quiz duration in milliseconds
}) => {
  const [stat, setStat] = useState({
    vis: false,
    answeredCorrectly: 0,
    point: 0,
    isFinal: false,
    total: 0,
  });

  const [submitQuiz, { isLoading, isError, error }] = useSubmitQuizMutation();
  const [
    submitFreemiumQuiz,
    { isLoading: freemiumLoading, data: freemiumResults },
  ] = useSubmitFreemiumQuizMutation();
  const [leaderboard, setLeaderboard] = useState(session?.leaderboard ?? []);
  const [submitPremiumQuiz, { isLoading: premLoading, data: results }] =
    useSubmitPremiumQuizMutation();

  const percentage = Math.round((stat?.point / stat?.total) * 100);
  const lowPercent = percentage < 50;
  const isMultiplayer = Boolean(sessionId);
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);

  const retryQuiz = async () => {
    retry && retry();
  };

  const getStats = () => {
    let answeredCorrectly = 0,
      statPoints = 0,
      totalPoints = 0;

    session?.questions.forEach((quest) => {
      quest.questions.forEach((question) => {
        if (question?.answered?.correct) {
          answeredCorrectly += 1;
          statPoints += question.point;
          totalPoints += question.point;
        } else {
          totalPoints += question.point;
          statPoints -= 2;
        }
      });
    });
    setStat({
      ...stat,
      answeredCorrectly,
      total: totalPoints,
      point: statPoints,
    });
    return {
      answeredCorrectly,
      statPoints,
      totalPoints,
    };
  };

  const uploadQuizSession = async () => {
    if (isMultiplayer || retried) return;
    // Include duration (ms) in every submission payload
    const durationPayload = duration != null ? { duration } : {};
    if (data?.type === "school") {
      try {
        await submitQuiz({ ...data, ...session, ...durationPayload }).unwrap();
      } catch (_error) {}
    } else if (data?.type === "freemium") {
      try {
        await submitFreemiumQuiz({
          ...data,
          ...session,
          ...durationPayload,
        }).unwrap();
      } catch (error) {
        console.log("Freemium error", error);
      }
    } else {
      try {
        await submitPremiumQuiz({
          ...data,
          ...session,
          ...durationPayload,
        }).unwrap();
      } catch (error) {
        console.log("Premium error", error);
      }
    }
  };

  const msg = lowPercent
    ? `Hard luck!. Study more and come back for more practice!`
    : `You've done well, retake quiz or move to next topic or subject category`;

  useEffect(() => {
    socket.emit("quiz_end", {
      sessionId,
      user: getUserProfile(user),
    });
    getStats();
    uploadQuizSession();
  }, [session]);

  useEffect(() => {
    socket.on("leaderboard_update", ({ leaderboard, isFinal, stats }) => {
      setLeaderboard(leaderboard);
      if (isFinal === true) {
        console.log({ stats });
        setStat({ ...stats[user?._id], isFinal });
      }
    });

    return () => socket.off("leaderboard_update");
  }, []);

  return (
    <View style={styles.container}>
      {isMultiplayer && !stat?.vis ? (
        <View
          style={{
            backgroundColor: colors.accent,
            paddingTop: insets.top,
            flex: 1,
          }}
        >
          <AppText
            size="xlarge"
            fontWeight="heavy"
            style={[styles.title, { textAlign: "flex-start", marginLeft: 15 }]}
          >
            Quiz Leaderboard
          </AppText>
          <FlatList
            data={leaderboard}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            ListHeaderComponentStyle={{ backgroundColor: colors.accent }}
            ListHeaderComponent={() => (
              <LeaderboardWinners
                isPro={false}
                data={leaderboard?.slice(0, 3)}
              />
            )}
            ListFooterComponent={
              <View
                style={
                  leaderboard?.length < 4 ? styles.footerMain : styles.footer
                }
              >
                <LottieAnimator
                  name="congrats"
                  loop={false}
                  style={{ width: width * 0.8, height: width * 0.8 }}
                />
              </View>
            }
            renderItem={({ item, index }) => (
              <LeaderboardItem item={item} isPro={false} index={index} />
            )}
          />
        </View>
      ) : stat.vis ? (
        <View style={[styles.main, { marginTop: insets.top }]}>
          <AppText style={styles.headerText} fontWeight="black" size={30}>
            Quiz Stats
          </AppText>
          <AppText
            style={{ textAlign: "center" }}
            fontWeight="bold"
            size={"xlarge"}
          >
            You earned{" "}
            <AppText size={"xxlarge"} fontWeight="black">
              {Number(
                results?.data?.pointsEarned ??
                  freemiumResults?.data?.pointsEarned ??
                  stat?.pointsEarned ??
                  stat?.point,
              ).toFixed(1)}
            </AppText>{" "}
            quiz points
          </AppText>
          <View style={{ flex: 1 }}>
            <View style={styles.stats}>
              <QuizStat
                value={
                  results?.data?.correctAnswers ??
                  freemiumResults?.data?.correctAnswers ??
                  stat?.correctAnswers ??
                  stat?.answeredCorrectly
                }
                subValue={`of ${
                  results?.data?.totalQuestions ??
                  freemiumResults?.data?.totalQuestions ??
                  calculateQuestionCount(session?.questions) ??
                  "..."
                }`}
                msg={"Correct answers"}
              />
              <QuizStat
                value={
                  results?.data?.accuracy ??
                  freemiumResults?.data?.accuracy ??
                  stat?.accuracy ??
                  stat?.total
                }
                subValue={`%`}
                msg={"Quiz score"}
              />
            </View>
            <View style={styles.correctionView}>
              <View style={styles.sideBar} />
              <AppText
                style={{ marginLeft: 14, marginBottom: 5 }}
                fontWeight="heavy"
                size={"xxlarge"}
              >
                Questions Review:
              </AppText>
              <QuizCorrections data={session?.questions} />
            </View>
          </View>
        </View>
      ) : (
        <>
          <View>
            <LottieAnimator
              name="congrats"
              loop={false}
              style={{ width: width * 0.8, height: width * 0.8 }}
            />
          </View>
          <View>
            <AppText style={styles.percentage} fontWeight="black" size={30}>
              {lowPercent ? "Too Bad" : "Congratulations"}
            </AppText>
            <AppText
              fontWeight="semibold"
              style={{ textAlign: "center", maxWidth: "70%" }}
            >
              {msg}
            </AppText>
          </View>
          <View style={styles.statMain}>
            <QuizStat
              value={Number(
                results?.data?.pointsEarned ??
                  freemiumResults?.data?.pointsEarned ??
                  stat?.point,
              ).toFixed(1)}
              bgColor={colors.warning}
              border={colors.warningLight}
              subValue={"GT"}
              msg={"tokens earned"}
            />
            {isError && (
              <AppText
                fontWeight="semibold"
                style={{
                  textAlign: "center",
                  maxWidth: "70%",
                  color: colors.medium,
                }}
              >
                {error?.data?.message}
              </AppText>
            )}
          </View>
        </>
      )}
      {isMultiplayer && stat?.isFinal && (
        <View style={styles.btns}>
          <AppButton title={"Close"} type="white" onPress={hideModal} />
          <AppButton
            title={`${stat.vis ? "Hide" : ""} Corrections`}
            type="accent"
            style={{ alignSelf: "center" }}
            onPress={() => setStat({ ...stat, vis: !stat.vis })}
          />
          {!isMultiplayer && <AppButton title={"Retry"} onPress={retryQuiz} />}
        </View>
      )}

      {isMultiplayer && !stat?.isFinal && (
        <View>
          <AppText>Waiting for the remaining players</AppText>
        </View>
      )}

      {!isMultiplayer && (
        <View style={styles.btns}>
          <AppButton title={"Close"} type="white" onPress={hideModal} />
          <AppButton
            title={`${stat.vis ? "Hide" : ""} Corrections`}
            type="accent"
            style={{ alignSelf: "center" }}
            onPress={() => setStat({ ...stat, vis: !stat.vis })}
          />
          {!isMultiplayer && <AppButton title={"Retry"} onPress={retryQuiz} />}
        </View>
      )}
    </View>
  );
};

export default FinishedQuiz;

const styles = StyleSheet.create({
  btnContainer: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  btns: {
    paddingTop: 10,
    width,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  correctionView: {
    flex: 1,
    marginTop: 15,
    maxHeight: height * 0.5,
  },
  footer: {
    marginTop: 40,
    height: height * 0.5,
    backgroundColor: colors.unchange,
    alignItems: "center",
  },
  footerMain: {
    height: height * 0.5,
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
    backgroundColor: colors.unchange,
    alignItems: "center",
  },
  headerText: {
    textAlign: "center",
    marginBottom: 6,
    color: colors.medium,
  },
  main: {
    flex: 1,
    width,
    backgroundColor: colors.unchange,
    borderRadius: 20,
    marginBottom: 15,
    marginTop: 20,
    boxShadow: `2px 8px 18px ${colors.primary}25`,
    overflow: "scroll",
  },
  percentage: {
    textAlign: "center",
    maxWidth: "80%",
    marginBottom: 10,
    color: colors.medium,
  },
  sideBar: {
    width: 3,
    height: "95%",
    position: "absolute",
    backgroundColor: colors.lightly,
    marginVertical: 25,
    left: 12 / 2 + 6 + 26 / 2,
    borderRadius: 10,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
  },
  statMain: {
    flex: 1,
    marginTop: 20,
    paddingHorizontal: 8,
    justifyContent: "space-around",
    alignItems: "center",
  },
  title: {
    textAlign: "center",
    marginTop: 8,
    marginBottom: 15,
    color: "#fff",
  },
});
