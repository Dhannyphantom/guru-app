/* eslint-disable react/no-unescaped-entities */
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  Platform,
} from "react-native";
import React from "react";
import { StatusBar } from "expo-status-bar";

import AppText from "../components/AppText";
import LottieAnimator from "../components/LottieAnimator";
import colors from "../helpers/colors";
import AppButton from "../components/AppButton";
import WebLayout from "../components/WebLayout";
import { useRouter } from "expo-router";
const { width, height } = Dimensions.get("screen");

const isWeb = Platform.OS === "web";

const WelcomeScreen = () => {
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={{ minHeight: height * 0.9 }}>
      <View style={styles.container}>
        <StatusBar style="dark" />
        {isWeb ? (
          <>
            <WebLayout style={{ flexDirection: "row" }}>
              <WebLayout>
                <View style={{ maxWidth: 500 }}>
                  <LottieAnimator name="student_hi" style={styles.lottie} />
                </View>
              </WebLayout>
              <WebLayout style={{ flex: 1 }}>
                <View style={styles.textSection}>
                  <AppText fontWeight="black" style={styles.title}>
                    Welcome
                  </AppText>
                  <AppText style={styles.titleInfo}>
                    Welcome to Guru. {"\n"}A platform for Nigerian secondary
                    school students, Learn and solve quiz questions, Boosting
                    your chance at passing National Exams and earn real money
                    while you're at it!
                  </AppText>
                </View>
                <View style={styles.btnSection}>
                  <AppButton
                    title="Sign In"
                    onPress={() => router.push("/login")}
                    contStyle={styles.btns}
                  />
                  <AppButton
                    title="Sign Up"
                    onPress={() =>
                      router.push({
                        pathname: "/register",
                        params: {
                          isSelectAccountType: true,
                        },
                      })
                    }
                    type="accent"
                    contStyle={styles.btns}
                  />
                </View>
              </WebLayout>
            </WebLayout>
          </>
        ) : (
          <View style={{ flex: 1 }}>
            <View>
              <LottieAnimator name="student_hi" style={styles.lottie} />
            </View>
            <View style={styles.textSection}>
              <AppText fontWeight="black" style={styles.title}>
                Welcome
              </AppText>
              <AppText style={styles.titleInfo}>
                Welcome to{" "}
                <AppText
                  size="large"
                  style={{ color: colors.primary }}
                  fontWeight="black"
                >
                  Guru
                </AppText>
                . {"\n"}An app for Nigerian secondary school students, Learn and
                solve quiz questions, Boosting your chance at passing National
                Exams and earn real money while you're at it!
              </AppText>
            </View>
            <View style={styles.btnSection}>
              <AppButton
                title="Sign In"
                onPress={() => router.push("/login")}
                contStyle={styles.btns}
              />
              <AppButton
                title="Sign Up"
                onPress={() =>
                  router.push({
                    pathname: "/register",
                    params: {
                      isSelectAccountType: true,
                    },
                  })
                }
                type="accent"
                contStyle={styles.btns}
              />
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  btns: {
    width: isWeb ? "70%" : width * 0.65,
  },
  btnSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    alignItems: "center",
  },
  lottie: {
    // width: 100,
    // height: 100,
    width: width / 1.5,
    height: width / 1.5,
    marginTop: 40,
  },
  textSection: {
    alignSelf: "center",
    maxWidth: width * 0.8,
  },
  title: {
    fontSize: 60,
    marginTop: 20,
    color: colors.primary,
    textAlign: "center",
  },
  titleInfo: {
    textAlign: "center",
    lineHeight: 25,
    marginTop: 10,
    ...(Platform.OS === "web"
      ? {
          maxWidth: "60%",
          alignSelf: "center",
          marginVertical: 50,
        }
      : {
          marginVertical: 50,
        }),
  },
});

export default WelcomeScreen;
