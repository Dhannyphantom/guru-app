import { Pressable, StyleSheet, Text, View } from "react-native";
import React from "react";
import Screen from "../components/Screen";
import AppButton from "../components/AppButton";

const QuizScreen = ({ navigation }) => {
  return (
    <Screen>
      <AppButton
        title={"GO Home"}
        onPress={() => navigation.navigate("Home")}
      />
      <Text>QuizScreen</Text>
    </Screen>
  );
};

export default QuizScreen;

const styles = StyleSheet.create({});
