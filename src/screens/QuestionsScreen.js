import { Dimensions, StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import { dummyQuestionsView } from "../helpers/dataStore";
import QuizCorrections from "../components/QuizCorrections";
import AppHeader from "../components/AppHeader";
import { nanoid } from "@reduxjs/toolkit";
import colors from "../helpers/colors";

const { width, height } = Dimensions.get("screen");

const QuestionsScreen = ({ route }) => {
  const data = route?.params;
  const questions = dummyQuestionsView.find(
    (item) => item.subject?.toLowerCase() == data?.subject?.toLowerCase()
  )?.questions;
  const sendData = [{ _id: nanoid(), questions, subject: data?.subject }];
  return (
    <View style={styles.container}>
      <AppHeader title={`${data?.subject} Review`} />
      <AppText fontWeight="medium" style={styles.topic}>
        Topic: {data?.name}
      </AppText>
      <View style={styles.separator} />
      <QuizCorrections data={sendData} isSingle />
    </View>
  );
};

export default QuestionsScreen;

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
