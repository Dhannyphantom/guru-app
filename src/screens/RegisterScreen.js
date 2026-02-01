import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { Formik } from "formik";
import uuid from "react-native-uuid";

import AppText from "../components/AppText";
import LottieAnimator from "../components/LottieAnimator";
import colors from "../helpers/colors";
import AppButton, { FormikButton } from "../components/AppButton";
import FormInput, { FormikInput } from "../components/FormInput";
import yupSchemas, {
  registerInitialsPro,
  validationSchemaRegisterPro,
} from "../helpers/yupSchemas";
import { useCreateUserMutation } from "../context/usersSlice";
import AppHeader from "../components/AppHeader";
import { capFirstLetter } from "../helpers/helperFunctions";
import { RenderSocials } from "./LoginScreen";
import AnimatedPressable from "../components/AnimatedPressable";
import Animated, { LinearTransition } from "react-native-reanimated";
import AppModal from "../components/AppModal";
// import ReferralSvg from "../../assets/svgs/undraw_referral_re_0aji.svg";
import PopMessage from "../components/PopMessage";
import WebLayout from "../components/WebLayout";
import { useLocalSearchParams, useRouter } from "expo-router";
const { registerInitials, validationSchemaRegister } = yupSchemas;

const { width, height } = Dimensions.get("screen");

const accountTypes = [
  {
    id: uuid.v4(),
    text: "student",
    isSelected: false,
    icon: "person",
    bgColor: colors.heartLight,
  },
  {
    id: uuid.v4(),
    text: "teacher",
    isSelected: false,
    icon: "people",
    bgColor: colors.greenLight,
  },
  {
    id: uuid.v4(),
    text: "professional",
    isSelected: false,
    icon: "briefcase",
    bgColor: colors.warningLight,
  },
];
const isWeb = Platform.OS === "web";

const AccountType = ({ item, onPress }) => {
  return (
    <AnimatedPressable
      style={[
        styles.accountType,
        { borderColor: item.isSelected ? colors.primary : "#fff" },
      ]}
      onPress={() => onPress && onPress(item.text)}
    >
      <View style={[styles.accountTypeIcon, { backgroundColor: item.bgColor }]}>
        <Ionicons
          style={{
            backgroundColor: "rgba(0,0,0,0.1)",
            borderRadius: 100,
            padding: 20,
          }}
          name={item.icon}
          color={"#fff"}
          size={30}
        />
      </View>
      <AppText
        style={{
          ...styles.accountTypeName,
          color: item.isSelected ? colors.primary : colors.black,
        }}
        size="xxlarge"
        fontWeight={"bold"}
      >
        {item?.text}
      </AppText>
    </AnimatedPressable>
  );
};

const SelectAccountType = () => {
  const router = useRouter();

  const [accountType, setAccountType] = useState(accountTypes);

  const selectedAccount = accountType.find((obj) => obj.isSelected);

  const handleSelectType = (type) => {
    setAccountType(
      accountType.map((obj) => {
        if (obj?.text === type && !obj.isSelected) {
          return {
            ...obj,
            isSelected: true,
          };
        } else if (obj?.text !== type && obj.isSelected) {
          return {
            ...obj,
            isSelected: false,
          };
        } else {
          return obj;
        }
      }),
    );
  };

  const handleNavigation = () => {
    router.replace({
      pathname: "/register",
      params: {
        isSelectAccountType: false,
        accountType: selectedAccount?.text,
      },
    });
  };

  return (
    <ScrollView>
      <View style={{ ...styles.container, ...styles.webCont, paddingTop: 5 }}>
        <AppHeader />
        <AppText fontWeight="bold" style={styles.welcomeText} size={30}>
          What type of account would you like to create?
        </AppText>
        <AppText style={styles.welcomeText} size={"xsmall"}>
          Select an account profile that suits your use of the app
        </AppText>
        <View style={{ marginVertical: 20, alignItems: "center" }}>
          {accountType.map((obj) => (
            <AccountType key={obj.id} item={obj} onPress={handleSelectType} />
          ))}
        </View>
        <View style={styles.accountTypeBtnContainer}>
          <AppButton
            disabled={!selectedAccount}
            title={"Continue"}
            onPress={handleNavigation}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const Referral = ({ closeModal, updateReferral }) => {
  const [username, setUsername] = useState("");
  const [popper, setPopper] = useState({ vis: false });

  const saveReferral = () => {
    const formatted = username.trim();
    if (formatted.includes(" ") || !Boolean(username)) {
      return setPopper({
        vis: true,
        msg: "Invalid username!",
        timer: 1500,
        type: "failed",
      });
    }
    updateReferral(formatted);
  };
  // return null;
  return (
    <KeyboardAvoidingView style={styles.avoidingViewRefer} behavior="padding">
      <Animated.View layout={LinearTransition.springify()} style={styles.refer}>
        <AppText fontWeight="bold" size={"xlarge"} style={styles.referTitle}>
          Referral Prompt
        </AppText>
        {/* <ReferralSvg /> */}
        {/* <ReferralSvg /> */}
        <View style={{ marginTop: 15 }}>
          <FormInput
            placeholder="Enter referral token"
            headerText={"Who referred you"}
            value={username}
            onChangeText={(val) => setUsername(val)}
          />
        </View>
        <View style={styles.referBtns}>
          <AppButton title={"Close"} type="warn" onPress={closeModal} />
          <AppButton title={"Claim Reward"} onPress={saveReferral} />
        </View>
      </Animated.View>
      <PopMessage popData={popper} setPopData={setPopper} />
    </KeyboardAvoidingView>
  );
};

const RegisterScreen = () => {
  const route = useLocalSearchParams();
  const [registerUser, { isLoading, isError, error }] = useCreateUserMutation();
  const isSelectAccountType =
    route?.isSelectAccountType && route?.isSelectAccountType === "true";
  const accountType = route?.accountType;
  const [referModal, setReferModal] = useState({ vis: false, username: "" });
  const [errMsg, setErrMsg] = useState(null);

  const lottieRef = useRef();

  let formInitials = registerInitials,
    formSchema = validationSchemaRegister;

  const isPro = accountType === "professional";

  if (isPro) {
    formInitials = registerInitialsPro;
    formSchema = validationSchemaRegisterPro;
  }

  const handleFormSubmit = async (formValues) => {
    setErrMsg(null);
    Keyboard.dismiss();
    const sendData = { ...formValues, accountType };
    if (Boolean(referModal.username)) {
      sendData.referral = referModal.username;
    }
    try {
      await registerUser(sendData).unwrap();
    } catch (err) {
      setErrMsg(
        typeof err?.status == "string" && err?.status?.includes("FETCH_ERROR")
          ? "Network request failed, Poor internet connection"
          : (err?.error ?? "Something went wrong"),
      );
    }
  };

  const handleCloseModal = () => {
    lottieRef?.current?.resume();
    setReferModal({ vis: false, username: "" });
  };

  const updateReferral = (username) => {
    lottieRef?.current?.resume();
    setReferModal({ vis: false, username });
  };

  useEffect(() => {
    if (!isSelectAccountType && accountType === "student") {
      lottieRef?.current?.pause();
      setReferModal({ vis: true, username: "" });
    }
  }, [isSelectAccountType, accountType]);

  return (
    <>
      {isSelectAccountType ? (
        <SelectAccountType />
      ) : (
        <KeyboardAvoidingView
          behavior="padding"
          // keyboardVerticalOffset={30}
          style={styles.avoidingView}
        >
          <ScrollView
            style={styles.container}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom: Platform.OS === "web" ? null : height * 0.4,
            }}
          >
            {isWeb ? (
              <>
                <WebLayout style={{ flexDirection: "row" }}>
                  <WebLayout>
                    <AppText fontWeight="heavy" style={styles.title}>
                      Sign Up Now!
                    </AppText>
                    <LottieAnimator visible={isLoading} absolute />
                    <View style={{ alignSelf: "center", maxWidth: 400 }}>
                      <LottieAnimator
                        name="welcome"
                        animRef={lottieRef}
                        style={styles.lottie}
                      />
                    </View>
                  </WebLayout>
                  <WebLayout style={{ flex: 1 }}>
                    <View style={styles.formSection}>
                      <Formik
                        initialValues={formInitials}
                        validationSchema={formSchema}
                        onSubmit={handleFormSubmit}
                      >
                        <View
                          style={{
                            ...styles.form,
                            flex: 1,
                            marginHorizontal: 30,
                          }}
                        >
                          <FormikInput
                            name="username"
                            placeholder={`${capFirstLetter(
                              accountType,
                            )} Username`}
                          />
                          <FormikInput name="email" placeholder="Email" />
                          <FormikInput
                            secureTextEntry
                            name="password"
                            placeholder="Password"
                          />

                          {isPro && (
                            <FormikInput
                              secureTextEntry
                              name="token"
                              style={styles.tokenInput}
                              placeholder="Pro Token"
                            />
                          )}
                          {/* FOR ERRORS */}
                          {(isError || errMsg) && (
                            <AppText style={styles.errorText}>
                              {error.data ?? errMsg}
                            </AppText>
                          )}
                          <FormikButton
                            title="Register"
                            contStyle={{ marginTop: 10, width: "65%" }}
                          />
                          <RenderSocials isLogin={false} />
                        </View>
                      </Formik>
                    </View>
                  </WebLayout>
                </WebLayout>
              </>
            ) : (
              <>
                <LottieAnimator visible={isLoading} absolute />
                <View style={{ alignSelf: "center" }}>
                  <LottieAnimator
                    name="welcome"
                    animRef={lottieRef}
                    style={styles.lottie}
                  />
                </View>
                <View style={styles.formSection}>
                  <AppText fontWeight="heavy" style={styles.title}>
                    Sign Up Now!
                  </AppText>
                  <Formik
                    initialValues={formInitials}
                    validationSchema={formSchema}
                    onSubmit={handleFormSubmit}
                  >
                    <View style={styles.form}>
                      <FormikInput
                        name="username"
                        placeholder={`${capFirstLetter(accountType)} Username`}
                      />
                      {isPro ? (
                        <FormInput name="email" placeholder="Email" />
                      ) : (
                        <FormikInput
                          name="contact"
                          keyboardType="numeric"
                          LeftComponent={() => (
                            <View>
                              <AppText
                                fontWeight="bold"
                                style={{ color: colors.medium }}
                              >
                                +234
                              </AppText>
                            </View>
                          )}
                          placeholder="Phone Number"
                        />
                      )}
                      <FormikInput
                        secureTextEntry
                        name="password"
                        placeholder="Password"
                      />

                      {isPro && (
                        <FormikInput
                          secureTextEntry
                          name="token"
                          style={styles.tokenInput}
                          placeholder="Pro Token"
                        />
                      )}
                      {/* FOR ERRORS */}
                      {(isError || errMsg) && (
                        <AppText style={styles.errorText}>
                          {error.data ?? errMsg}
                        </AppText>
                      )}
                      <FormikButton
                        title="Register"
                        contStyle={{ marginTop: 10, width: width * 0.65 }}
                      />
                      <RenderSocials isLogin={false} />
                    </View>
                  </Formik>
                </View>
              </>
            )}

            {/* <View style={styles.btnSection}></View> */}
          </ScrollView>
          <StatusBar style="dark" />
        </KeyboardAvoidingView>
      )}
      <AppModal
        visible={referModal.vis}
        setVisible={(bool) => setReferModal({ vis: bool, username: "" })}
        noBlur={true}
        Component={() => (
          <Referral
            closeModal={handleCloseModal}
            updateReferral={updateReferral}
          />
        )}
      />
    </>
  );
};

const styles = StyleSheet.create({
  avoidingView: {
    flex: 1,
  },
  avoidingViewRefer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  accountType: {
    width: width * 0.9,
    height: 110,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    borderColor: colors.extraLight,
    borderWidth: 2,
    marginBottom: 20,
    overflow: "hidden",
    ...(isWeb
      ? {
          width: "90%",
        }
      : {}),
  },
  accountTypeIcon: {
    width: "30%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  accountTypeBtnContainer: {
    flex: 1,
    justifyContent: "flex-end",
    marginBottom: 25,
    alignItems: "center",
  },
  accountTypeName: {
    textTransform: "capitalize",
    marginLeft: 20,
  },
  // btnSection: {
  //   flex: 1,
  //   justifyContent: "center",
  //   alignItems: "center",
  // },
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
  refer: {
    width: width * 0.95,
    backgroundColor: colors.white,
    borderRadius: 30,
    alignItems: "center",
    boxShadow: "0 2px 18px rgba(0,0,0,0.1)",
    padding: 25,
    elevation: 2,
    ...(isWeb
      ? {
          width: "100%",
        }
      : {}),
  },
  referTitle: {
    textAlign: "center",
    marginTop: 20,
    marginBottom: 8,
    color: colors.primary,
  },
  referBtns: {
    width: "90%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // marginHorizontal: 15,
    marginBottom: 20,
    marginTop: 10,
  },
  referIcon: {
    width: 50,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
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
  tokenInput: {
    backgroundColor: colors.unchange,
    borderWidth: 3,
    borderColor: colors.primaryLighter,
    color: colors.primaryDeep,
  },
  welcomeText: {
    textAlign: "center",
    maxWidth: width * 0.8,
    alignSelf: "center",
    marginTop: 20,
    lineHeight: 46,
  },
  webCont: {
    ...(Platform.OS === "web"
      ? {
          width: 500,
          alignSelf: "center",
        }
      : {}),
  },
});

export default RegisterScreen;
