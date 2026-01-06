import { Dimensions, FlatList, StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import { useEffect, useState } from "react";
import colors from "../helpers/colors";
import QuizStat from "./QuizStat";
import LottieAnimator from "./LottieAnimator";
import AppButton from "./AppButton";
import QuizCorrections from "./QuizCorrections";
import { useSubmitQuizMutation } from "../context/schoolSlice";
import { useSubmitPremiumQuizMutation } from "../context/instanceSlice";
import {
  LeaderboardItem,
  LeaderboardWinners,
} from "../screens/LeaderboardScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { socket } from "../helpers/helperFunctions";

const { width, height } = Dimensions.get("screen");

const FinishedQuiz = ({ hideModal, data, retry, sessionId, session }) => {
  const [stat, setStat] = useState({
    vis: false,
    answeredCorrectly: 0,
    point: 0,
    total: 0,
  });

  const [submitQuiz, { isLoading, isError, error }] = useSubmitQuizMutation();
  const [leaderboard, setLeaderboard] = useState([]);
  const [submitPremiumQuiz, { isLoading: premLoading }] =
    useSubmitPremiumQuizMutation();

  const percentage = Math.round((stat?.point / stat?.total) * 100);
  const lowPercent = percentage < 50;
  const isMultiplayer = Boolean(sessionId);
  const insets = useSafeAreaInsets();

  const retryQuiz = async () => {
    await uploadQuizSession();
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
          statPoints -= 15;
          // setStat({ ...stat, point: statPoints });
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
    if (data?.type === "school") {
      try {
        await submitQuiz({ ...data, ...session }).unwrap();
      } catch (error) {
        console.log(error);
      }
    } else {
      // upload premium
      const sendData = {
        ...data,
        ...session,
      };
      console.log({ sendData });
      try {
        await submitPremiumQuiz(sendData).unwrap();
      } catch (error) {
        console.log("Premium error", error);
      }
    }
  };

  const msg = lowPercent
    ? `Hard luck!. Study more and come back for more practice!`
    : `You've done well, retake quiz or move to next topic or subject category`;

  useEffect(() => {
    getStats();
    uploadQuizSession();
  }, [session]);

  useEffect(() => {
    socket.on("leaderboard_update", ({ leaderboard }) => {
      setLeaderboard(leaderboard);
    });

    return () => socket.off("session_answers");
  }, []);

  return (
    <View style={styles.container}>
      {isMultiplayer ? (
        <View
          style={{
            backgroundColor: colors.accent,
            paddingTop: insets.top,
            flex: 1,
          }}
        >
          <AppText size="xlarge" fontWeight="heavy" style={styles.title}>
            Quiz Results
          </AppText>
          <FlatList
            data={leaderboard}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            // contentContainerStyle={{ paddingBottom: height * 0.11 }}
            ListHeaderComponentStyle={{ backgroundColor: colors.accent }}
            ListHeaderComponent={() => (
              <LeaderboardWinners
                isPro={false}
                data={leaderboard?.slice(0, 2)}
              />
            )}
            ListFooterComponent={
              <View
                style={
                  leaderboard?.length < 4 ? styles.footerMain : styles.footer
                }
              />
            }
            renderItem={({ item, index }) => (
              <LeaderboardItem item={item} isPro={false} index={index} />
            )}
          />
        </View>
      ) : stat.vis ? (
        <View style={styles.main}>
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
              {stat?.point}
            </AppText>
            <AppText
              size={"small"}
              style={{ color: colors.medium }}
              fontWeight="black"
            >
              /{stat?.total}
            </AppText>{" "}
            quiz points
          </AppText>
          <View style={{ flex: 1 }}>
            <View style={styles.stats}>
              <QuizStat
                value={stat?.answeredCorrectly}
                subValue={`of ${session?.totalQuestions ?? 0}`}
                msg={"Correct answers"}
              />
              <QuizStat value={percentage} subValue={`%`} msg={"Quiz score"} />
            </View>
            <View style={styles.correctionView}>
              <View style={styles.sideBar} />
              <AppText
                style={{ marginLeft: 2, marginBottom: 10 }}
                fontWeight="heavy"
                size={"xxlarge"}
              >
                Corrections:
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
              value={stat?.point}
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
      {/* <View style={styles.btnContainer}> */}
      <View style={styles.btns}>
        <AppButton title={"Close"} type="white" onPress={hideModal} />
        <AppButton
          title={`${stat.vis ? "Hide" : ""} My Stats`}
          type="accent"
          style={{ alignSelf: "center" }}
          onPress={() => setStat({ ...stat, vis: !stat.vis })}
        />
        {!isMultiplayer && <AppButton title={"Retry"} onPress={retryQuiz} />}
      </View>
      {/* </View> */}
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
    marginTop: 25,
    maxHeight: height * 0.5,
    paddingLeft: 12,
    // backgroundColor: "red",
  },
  footer: {
    // flex: 1,
    marginTop: 40,
    height: height * 0.5,
    backgroundColor: colors.unchange,
    // marginHorizontal: width * 0.02,
  },
  footerMain: {
    height: height * 0.5,
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
    backgroundColor: colors.unchange,
    // top: 40,
  },
  headerText: {
    textAlign: "center",
    marginBottom: 6,
    color: colors.medium,
  },
  main: {
    flex: 1,
    width: width * 0.95,
    backgroundColor: colors.unchange,
    borderRadius: 20,
    marginBottom: 15,
    marginTop: 20,
    elevation: 1,
    overflow: "scroll",
  },
  percentage: {
    textAlign: "center",
    maxWidth: "80%",
    marginBottom: 10,
    color: colors.medium,
  },
  sideBar: {
    width: 6,
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
    // flexDirection: "row",
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
