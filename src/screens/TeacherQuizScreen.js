import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import AppText from "../components/AppText";
import AppHeader from "../components/AppHeader";
import Avatar from "../components/Avatar";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import { capFirstLetter, dateFormatter } from "../helpers/helperFunctions";
import Counter from "../components/Counter";
import colors from "../helpers/colors";
import AppButton from "../components/AppButton";
import { A_DAY } from "../helpers/dataStore";
import {
  selectSchool,
  useChangeSchoolQuizMutation,
  useFetchSchoolQuizQuery,
} from "../context/schoolSlice";
import LottieAnimator from "../components/LottieAnimator";
import ListEmpty from "../components/ListEmpty";
import getRefresher from "../components/Refresher";
import { useEffect, useState } from "react";
import PopMessage from "../components/PopMessage";
import PromptModal from "../components/PromptModal";
import { useLocalSearchParams, useRouter } from "expo-router";

const { width, height } = Dimensions.get("screen");

export const TQuizItem = ({ item, assId, isAssignment }) => {
  const router = useRouter();

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/school/quiz_review",
          params: {
            isAssignment,
            historyId: item?._id,
            assignmentId: assId,
            submissions: item?.participants,
          },
        })
      }
      style={styles.item}
    >
      <View style={styles.itemMain}>
        <View style={styles.itemCount}>
          <Counter
            count={item.percentageScore ?? item?.percentage}
            fontSize={width * 0.18 * 0.28}
            size={width * 0.18}
            percentage
          />
          <AppText
            fontWeight="heavy"
            style={{ color: colors.medium, marginTop: 6 }}
          >
            Score
          </AppText>
        </View>
      </View>
      <View style={styles.itemContent}>
        <AppText
          fontWeight="bold"
          style={{ marginTop: 4, color: colors.medium }}
        >
          {isAssignment ? "Date" : "Quiz Date"}:{" \t"}
          <AppText size={"large"} fontWeight="heavy">
            {dateFormatter(item?.createdAt ?? item?.date, "fullDate")}
          </AppText>
        </AppText>
        <AppText
          fontWeight="bold"
          style={{ marginTop: 6, color: colors.medium }}
        >
          {isAssignment ? "Submissions" : "Students participated"}:{" \t"}
          <AppText size={"large"} fontWeight="heavy">
            {item.participants}
          </AppText>
        </AppText>
      </View>
    </Pressable>
  );
};

const TeacherQuizScreen = () => {
  const user = useSelector(selectUser);
  const school = useSelector(selectSchool);
  const router = useRouter();
  const params = useLocalSearchParams();
  const route = JSON.parse(params?.item ?? "{}");
  const routeData = route;
  const refresh = route?.refresh;

  const [refreshing, setRefreshing] = useState(false);
  const [popper, setPopper] = useState({ vis: false });
  const [prompt, setPrompt] = useState({ vis: false });
  const [changeSchoolQuiz, { isLoading: quizLoading }] =
    useChangeSchoolQuizMutation();

  const {
    data: history,
    isLoading,
    refetch,
  } = useFetchSchoolQuizQuery({
    schoolId: school?._id,
    type: "full",
    quizId: routeData?._id,
  });

  const screenData = { ...routeData, ...history?.extra };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch().unwrap();
    setRefreshing(false);
  };

  const isActive = screenData?.status === "active";
  const isReview = screenData?.status === "review";

  const handleQuiz = async (status, prompted) => {
    if (prompted) {
      return setPrompt({
        vis: true,
        data: {
          type: status,
          msg: "Are you sure you want to end this quiz session?\nStudents can no longer join this session",
          title: "End Quiz",
          btn: "Finish",
        },
      });
    }

    if (isActive) {
      // END QUIZ
      try {
        await changeSchoolQuiz({
          status,
          quizId: routeData?._id,
          schoolId: school?._id,
        }).unwrap();
        setPopper({
          vis: true,
          msg:
            status === "inactive"
              ? "Quiz cancelled successfully"
              : "Quiz ended, waiting for the quiz scores to be released",
          type: "success",
          cb: async () => await onRefresh(),
          timer: 3000,
        });
      } catch (err) {
        console.log(err);
        setPopper({
          vis: true,
          msg: "Something went wrong",
          timer: 4000,
          type: "failed",
          // cb: () => router.back(),
        });
      }
    } else if (isReview) {
      console.log("Test scores released!");
    } else {
      router.push({
        pathname: "/main/new_quiz",
        params: { data: JSON.stringify(screenData), type: "start" },
      });
      // "NewQuiz",
      //   type: "start",
      //   data: screenData,
      //
    }
  };

  const handleQuizSecondary = (status, prompted) => {
    if (prompted) {
      return setPrompt({
        vis: true,
        data: {
          type: status,
          msg: "Are you sure you want to cancel this quiz session?\nYou will lose all student's submissions",
          title: "Cancel Quiz",
          btn: "Quit",
        },
      });
    }

    if (isActive) {
      handleQuiz(status);
    } else {
      router.push({
        pathname: "/main/new_quiz",
        params: { data: JSON.stringify(screenData), type: "edit" },
      });
      // "NewQuiz", {
      //   type: "edit",
      //   data: screenData,
      // });
    }
  };

  const handlePrompt = (type) => {
    switch (type) {
      case "inactive":
        handleQuizSecondary(type, false);
        break;
      case "review":
        handleQuiz(type, false);
        break;

      default:
        break;
    }
  };

  useEffect(() => {
    if (refresh === true) {
      onRefresh();
    }
  }, [route]);

  return (
    <View style={styles.container}>
      <AppHeader
        title={`${screenData?.subject?.name} Quiz`}
        onPress={() => router.replace("/school")}
      />
      <View style={styles.main}>
        <ScrollView
          refreshControl={getRefresher({ refreshing, onRefresh })}
          contentContainerStyle={{ flexDirection: "row" }}
        >
          <View style={{ flex: 1 }}>
            <AppText fontWeight="bold">
              TITLE:{" "}
              <AppText fontWeight="heavy" style={{ color: colors.medium }}>
                {screenData?.title}
              </AppText>
            </AppText>
            <AppText
              style={{ marginTop: 10, marginBottom: 15 }}
              fontWeight="bold"
            >
              STATUS:{" "}
              <AppText
                size={"large"}
                fontWeight="heavy"
                style={{ color: colors.medium }}
              >
                {capFirstLetter(screenData?.status)}
              </AppText>
            </AppText>
            <View style={styles.btns}>
              <AppButton
                icon={{
                  left: true,
                  name: isActive ? "stop" : "rocket",
                  color: isActive ? colors.medium : colors.white,
                }}
                type={isActive ? "white" : "primary"}
                onPress={() => handleQuiz("review", isActive)}
                title={
                  isActive
                    ? "Finish Quiz"
                    : isReview
                      ? "Release Quiz Scores"
                      : "Start Quiz"
                }
              />

              {!isReview && (
                <AppButton
                  title={isActive ? "Cancel Quiz" : "Edit Quiz"}
                  type={isActive ? "warn" : "white"}
                  onPress={() => handleQuizSecondary("inactive", isActive)}
                  icon={{
                    left: true,
                    name: isActive ? "cancel" : "pencil",
                    color: isActive ? colors.white : colors.medium,
                  }}
                />
              )}
            </View>
          </View>
          <Avatar
            name={user?.username}
            source={user?.avatar?.image}
            border={{ width: 2, color: colors.extraLight }}
          />
        </ScrollView>
      </View>
      <View style={styles.history}>
        <AppText size={"xlarge"} style={styles.historyTitle} fontWeight="heavy">
          History
        </AppText>
        <FlatList
          data={history?.data}
          keyExtractor={(item) => item._id}
          refreshControl={getRefresher({ refreshing, onRefresh })}
          ListEmptyComponent={() => (
            <ListEmpty message="No quiz history yet" style={styles.empty} />
          )}
          contentContainerStyle={{ paddingBottom: height * 0.125 }}
          renderItem={({ item, index }) => (
            <TQuizItem item={item} assId={routeData?._id} />
          )}
        />
        <LottieAnimator visible={isLoading} absolute />
      </View>
      <PopMessage popData={popper} setPopData={setPopper} />
      <PromptModal
        prompt={prompt}
        setPrompt={setPrompt}
        onPress={handlePrompt}
      />
    </View>
  );
};

export default TeacherQuizScreen;

const styles = StyleSheet.create({
  btns: {
    width: "65%",
  },
  container: {
    flex: 1,
  },
  empty: {
    height: height * 0.4,
  },
  history: {
    flex: 1,
    marginTop: 20,
  },
  historyTitle: {
    marginLeft: 20,
    marginBottom: 15,
  },
  item: {
    backgroundColor: colors.white,
    marginBottom: 10,
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    alignSelf: "center",
    width: width * 0.9,
  },
  itemContent: {
    marginLeft: 20,
  },
  itemCount: {
    alignItems: "center",
  },
  main: {
    flexDirection: "row",
    backgroundColor: colors.white,
    justifyContent: "space-between",
    marginHorizontal: 15,
    borderRadius: 15,
    padding: 15,
    paddingBottom: 0,
  },
});
