import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Keyboard,
  Platform,
} from "react-native";
import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
// import {
//   GoogleOneTapSignIn,
//   statusCodes,
// } from "@react-native-google-signin/google-signin";

import AppText from "../components/AppText";
import LottieAnimator from "../components/LottieAnimator";
import colors from "../helpers/colors";
import { FormikButton } from "../components/AppButton";
import { FormikInput } from "../components/FormInput";
import { Formik } from "formik";
import yupSchemas from "../helpers/yupSchemas";
import { useSignInUserMutation } from "../context/usersSlice";
// import { useDispatch } from "react-redux";
// import AsyncStorage from "@react-native-async-storage/async-storage";
import AnimatedPressable from "../components/AnimatedPressable";
import WebLayout from "../components/WebLayout";
import { useRouter } from "expo-router";
const { loginInitials, validationSchemaLogin } = yupSchemas;
const { width, height } = Dimensions.get("screen");

export const RenderSocials = ({ isLogin = true }) => {
  const router = useRouter();

  const msg = isLogin ? "in" : "up";
  const msgReversed = isLogin ? "up" : "in";
  const message = isLogin
    ? "Don't have an account?"
    : "Already have an account?";
  const nav = isLogin ? "Register" : "Login";

  const handleGoogleSignIn = async () => {
    // const stats = await GoogleOneTapSignIn.checkPlayServices();
    // if (stats != statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    //   const data = await GoogleOneTapSignIn.signIn();
    //   console.log({ data });
    // }
  };

  return (
    <View style={{ alignItems: "center" }}>
      <AppText>Or Sign {msg} with</AppText>
      <View style={styles.socials}>
        <AnimatedPressable onPress={handleGoogleSignIn}>
          <Ionicons name="logo-google" size={60} color={colors.google} />
        </AnimatedPressable>
        <Pressable>
          <Ionicons name="logo-facebook" size={60} color={colors.facebook} />
        </Pressable>
      </View>
      <View style={styles.navSection}>
        <AppText style={styles.navText}>{message}</AppText>
        <TouchableOpacity
          onPress={() =>
            router.replace({
              pathname: `/${nav.toLowerCase()}`,
              params: { isSelectAccountType: true },
            })
          }
          activeOpacity={0.8}
          style={styles.navBtn}
        >
          <AppText fontWeight="bold" style={{ color: colors.primary }}>
            {" "}
            Sign {msgReversed} now
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const LoginScreen = () => {
  const [loginUser, { isLoading, isError, error }] = useSignInUserMutation();
  const [errMsg, setErrMsg] = useState(null);

  // const dispatch = useDispatch();
  const handleFormSubmit = async (formValues) => {
    setErrMsg(null);
    Keyboard.dismiss();

    await loginUser(formValues)
      .unwrap()
      .catch((err) => {
        const networkErr =
          typeof err?.status == "string" && err?.status?.includes("FETCH_ERROR")
            ? "Network request failed, Poor internet connection"
            : null;
        console.log(err);
        setErrMsg(networkErr ?? err?.error ?? "Something went wrong");
      });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: Platform.OS === "web" ? null : height * 0.4,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {Platform.OS === "web" ? (
        <>
          <WebLayout style={{ flexDirection: "row" }}>
            <WebLayout>
              <AppText fontWeight="heavy" style={styles.title}>
                Sign Back In!
              </AppText>
              <View style={{ alignSelf: "center", maxWidth: 500 }}>
                <LottieAnimator name="student_jumping" style={styles.lottie} />
              </View>
            </WebLayout>
            <WebLayout style={{ flex: 1 }}>
              <View style={styles.formSection}>
                <Formik
                  initialValues={loginInitials}
                  validationSchema={validationSchemaLogin}
                  onSubmit={handleFormSubmit}
                >
                  <View style={{ ...styles.form, flex: 1 }}>
                    <View
                      style={{
                        // alignItems: "center",
                        // flex: 1,
                        // backgroundColor: "blue",
                        width: "80%",
                      }}
                    >
                      <FormikInput
                        name="username"
                        placeholder="Email or Username"
                      />
                      <FormikInput
                        name="password"
                        secureTextEntry
                        placeholder="Password"
                      />
                      <LottieAnimator visible={isLoading} absolute />
                    </View>
                    {/* FOR ERRORS */}
                    {(isError || errMsg) && (
                      <AppText style={styles.errorText}>
                        {error?.data ?? errMsg}
                      </AppText>
                    )}
                    <FormikButton
                      title="Login"
                      contStyle={{
                        marginTop: 10,
                        alignSelf: "center",
                        width: "40%",
                      }}
                    />
                    <RenderSocials />
                  </View>
                </Formik>
              </View>
            </WebLayout>
          </WebLayout>
        </>
      ) : (
        <>
          <View style={{ alignSelf: "center" }}>
            <LottieAnimator name="student_jumping" style={styles.lottie} />
          </View>
          <View style={styles.formSection}>
            <AppText fontWeight="heavy" style={styles.title}>
              Sign Back In!
            </AppText>

            <Formik
              initialValues={loginInitials}
              validationSchema={validationSchemaLogin}
              onSubmit={handleFormSubmit}
            >
              <View style={styles.form}>
                <View style={{ alignItems: "center" }}>
                  <FormikInput
                    name="username"
                    placeholder="Email or Username"
                  />
                  <FormikInput
                    name="password"
                    secureTextEntry
                    placeholder="Password"
                  />
                  <LottieAnimator visible={isLoading} absolute />
                </View>
                {/* FOR ERRORS */}
                {(isError || errMsg) && (
                  <AppText style={styles.errorText}>
                    {error?.data ?? errMsg}
                  </AppText>
                )}
                <FormikButton
                  title="Login"
                  contStyle={{
                    marginTop: 10,
                    alignSelf: "center",
                    width: width * 0.65,
                  }}
                />
                <RenderSocials />
              </View>
            </Formik>
          </View>
        </>
      )}
      <View style={styles.btnSection}></View>
      <StatusBar style="dark" />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  btnSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
  },
  errorText: {
    textAlign: "center",
    color: colors.heartDark,
    marginVertical: 6,
  },
  lottie: {
    width: width / 1.5,
    height: width / 1.5,
    marginTop: 40,
  },
  form: {
    marginTop: 25,
    alignItems: "center",
  },
  formSection: {
    marginTop: 15,
    ...(Platform.OS === "web"
      ? {
          backgroundColor: colors.white,
          borderRadius: 20,
        }
      : {}),
  },
  navBtn: {
    paddingVertical: 15,
    paddingRight: 5,
  },
  navSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  socials: {
    flexDirection: "row",
    width: width * 0.5,
    justifyContent: "space-around",
    marginTop: 10,
  },
  title: {
    alignSelf: "flex-start",
    fontSize: 30,
    marginTop: 20,
    marginLeft: 20,
    color: colors.primary,
    textAlign: "center",
  },
  titleInfo: {
    textAlign: "center",
    lineHeight: 20,
    marginTop: 10,
  },
});

export default LoginScreen;
