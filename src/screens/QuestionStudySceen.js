import { Dimensions, StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import QuizCorrections from "../components/QuizCorrections";
import AppHeader from "../components/AppHeader";
import colors from "../helpers/colors";
import { useLocalSearchParams } from "expo-router";
import { useGetMyQuestionsQuery } from "../context/instanceSlice";
import { useState } from "react";
import LottieAnimator from "../components/LottieAnimator";

const { width, height } = Dimensions.get("screen");

const QuestionStudyScreen = () => {
  const route = useLocalSearchParams();
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useGetMyQuestionsQuery({
    subjectId: route?.subjectId,
    topicId: route?.topicId,
    page,
    limit: 50,
  });

  //   const questions = dummyQuestionsView.find(
  //     (item) => item.subject?.toLowerCase() == data?.subject?.toLowerCase(),
  //   )?.questions;
  //   const sendData = [{ _id: nanoid(), questions, subject: data?.subject }];
  const sendData = [];
  return (
    <View style={styles.container}>
      <AppHeader title={`${route?.subjectName} Review`} />
      <AppText fontWeight="medium" style={styles.topic}>
        Topic: {route?.topicName}
      </AppText>
      <View style={styles.separator} />
      <QuizCorrections data={sendData} isSingle />
      <LottieAnimator visible={isLoading} absolute />
    </View>
  );
};

export default QuestionStudyScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
