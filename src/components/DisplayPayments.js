import {
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import AppText from "../components/AppText";
import { selectUser, useSubscribeUserMutation } from "../context/usersSlice";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import {
  getCurrencyAmount,
  hasCompletedProfile,
} from "../helpers/helperFunctions";
import colors from "../helpers/colors";
import Animated, { LinearTransition } from "react-native-reanimated";
import {
  enterAnimOther,
  exitingAnim,
  subDropdown,
  subSchoolDrop,
} from "../helpers/dataStore";
import { FormikInput } from "./FormInput";
import PopMessage from "./PopMessage";
import LottieAnimator from "./LottieAnimator";
import AppButton, { FormikButton } from "./AppButton";
import { Formik } from "formik";
import { subInitials, subUserSchema } from "../helpers/yupSchemas";
import AnimatedCheckBox from "./AnimatedCheckbox";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("screen");

const DisplayPayments = ({ hideModal, data }) => {
  const [subscribeUser, { isLoading }] = useSubscribeUserMutation();

  const isSchool = data?.type == "school";
  const user = useSelector(selectUser);

  const [bools, setBools] = useState({
    loading: true,
    status: "pending",
    payload: null,
    saveInfo: false,
    useSavedInfo: false,
  });
  const [popper, setPopper] = useState({ vis: false });
  const [acctDetail, setAcctDetail] = useState(null);

  // const webViewRef = useRef();
  const isSuccess = bools.status == "success";
  const isVerify = bools.status == "verify";
  const isPin = bools.status == "pin";
  const isPending = bools.status == "pending";
  const profile = hasCompletedProfile(user);

  const handleSubscription = async (formValues) => {
    if (!profile.bool) {
      return setPopper(profile.pop);
    }

    const payloadData = {
      ...formValues,
    };

    if (isSchool) {
      payloadData.school = data?.school?._id;
    }

    if (bools?.payload?.tx_ref) {
      payloadData.flw_ref = bools?.payload?.flw_ref;
      payloadData.tx_ref = bools?.payload?.tx_ref;
    }
    try {
      const payload = await subscribeUser(payloadData).unwrap();

      if (payload.error) {
        let errMsg = payload?.error?.code?.startsWith("ENOTFOUND")
          ? "Poor internet connection"
          : payload.error?.name?.includes("validationError")
          ? "Invalid info provided"
          : payload?.error?.name ?? "";
        setPopper({
          vis: true,
          type: "failed",
          msg: `${payload.msg}: ${errMsg}`,
          timer: 2500,
        });
      } else {
        setBools({
          ...bools,
          payload,
          timer: 2500,
          status: payload?.status ?? "pending",
        });

        if (bools?.saveInfo) {
          await AsyncStorage.setItem(
            "acct",
            JSON.stringify({
              card_cvv: payloadData.card_cvv,
              card_number: payloadData.card_number,
              card_exp_month: payloadData.card_exp_month,
              card_exp_year: payloadData.card_exp_year,
            })
          );
        }
      }
    } catch (err) {
      console.log({ err });
      setPopper({
        vis: true,
        type: "failed",
        timer: 4500,
        msg: err?.message?.includes("Aborted")
          ? "Network timeout. Please ensure you have a stable internet access"
          : err?.message ?? "Something went wrong",
      });
    }
  };

  const handleCheckBox = (bool, formSetter) => {
    setBools({
      ...bools,
      useSavedInfo: bool,
      saveInfo: acctDetail ? false : bool,
    });

    if (acctDetail && bool) {
      formSetter && formSetter({ ...acctDetail });
    } else if (acctDetail && !bool) {
      formSetter && formSetter({ ...subInitials });
    }
  };

  const getAcctDetails = async () => {
    const getAcctInfo = await AsyncStorage.getItem("acct");
    if (getAcctInfo) {
      setAcctDetail(JSON.parse(getAcctInfo));
    }
  };

  useEffect(() => {
    getAcctDetails();
  }, []);

  return (
    <>
      <View style={styles.webViewContainer}>
        <Formik
          initialValues={subInitials}
          validationSchema={subUserSchema}
          onSubmit={handleSubscription}
        >
          {({ setValues }) => {
            return (
              <>
                {!isSuccess && (
                  <AppText
                    size={"large"}
                    fontWeight="heavy"
                    style={styles.title}
                  >
                    Enter {isSchool ? "School" : "Student"} Payment Details
                  </AppText>
                )}

                {isVerify && (
                  <>
                    <Animated.View
                      entering={enterAnimOther}
                      exiting={exitingAnim}
                    >
                      <AppText>{bools?.payload?.msg}</AppText>
                      <FormikInput
                        name={"otp"}
                        keyboardType={"numeric"}
                        placeholder="Enter OTP"
                      />
                    </Animated.View>
                  </>
                )}
                {isPin && (
                  <>
                    <Animated.View
                      entering={enterAnimOther}
                      exiting={exitingAnim}
                    >
                      <FormikInput
                        headerText={"Charge Authorization"}
                        secureTextEntry
                        name={"pin"}
                        keyboardType={"numeric"}
                        placeholder={bools?.payload?.msg}
                      />
                      <View style={{ marginBottom: 30 }}>
                        <AppText>
                          You're paying{" "}
                          <AppText fontWeight="heavy">
                            {getCurrencyAmount(bools?.payload?.amount)}
                          </AppText>{" "}
                          subscription
                        </AppText>
                      </View>
                    </Animated.View>
                  </>
                )}

                {isPending && (
                  <Animated.View
                    entering={profile.bool && enterAnimOther}
                    exiting={profile.bool && exitingAnim}
                    style={{ flex: 3 }}
                  >
                    <ScrollView
                      style={{ flex: 1 }}
                      contentContainerStyle={{ paddingBottom: height * 0.05 }}
                      showsVerticalScrollIndicator={false}
                    >
                      <KeyboardAvoidingView
                        style={styles.avoidingView}
                        behavior="padding"
                      >
                        <View>
                          <FormikInput
                            name={"card_number"}
                            keyboardType="numeric"
                            headerText={"Card Number"}
                            placeholder="Card Number"
                          />
                        </View>
                        <View>
                          <FormikInput
                            keyboardType="numeric"
                            headerText={"CVV"}
                            name={"card_cvv"}
                            placeholder="CVV"
                          />
                        </View>
                        <View style={styles.row}>
                          <View style={{ flex: 1 }}>
                            <FormikInput
                              name={"card_exp_month"}
                              placeholder="Expiry Month"
                              headerText={"Exp Month"}
                              keyboardType="numeric"
                              style={styles.dateInput}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <FormikInput
                              headerText={"Exp Year"}
                              name={"card_exp_year"}
                              keyboardType="numeric"
                              placeholder="Expiry Year"
                              style={styles.dateInput}
                            />
                          </View>
                        </View>

                        <FormikInput
                          headerText={"Subscription amount"}
                          name={"sub_amount"}
                          data={isSchool ? subSchoolDrop : subDropdown}
                          type="dropdown"
                          placeholder="Select subscription plan"
                        />
                        <View style={styles.checkbox}>
                          <AppText fontWeight="bold">
                            {Boolean(acctDetail) ? "Use" : "Save"} Card Info
                          </AppText>
                          <AnimatedCheckBox
                            isChecked={bools.saveInfo || bools?.useSavedInfo}
                            setIsChecked={(bool) =>
                              handleCheckBox(bool, setValues)
                            }
                          />
                        </View>
                        {bools.saveInfo ||
                          (bools.useSavedInfo && (
                            <AppText
                              style={styles.cardInfo}
                              fontWeight="bold"
                              size={"xsmall"}
                            >
                              Please note that your card info are ONLY stored
                              securely on your phone
                            </AppText>
                          ))}
                      </KeyboardAvoidingView>
                    </ScrollView>
                  </Animated.View>
                )}

                {isSuccess && (
                  <Animated.View
                    entering={enterAnimOther}
                    style={{ flex: 1, alignItems: "center" }}
                  >
                    <LottieAnimator
                      name="success"
                      style={{ width: width * 0.7, height: height * 0.4 }}
                    />
                    <AppText
                      fontWeight="black"
                      size={"xxlarge"}
                      style={{ color: colors.greenDark }}
                    >
                      Subcription Successful
                    </AppText>
                    <AppText fontWeight="light" style={{ textAlign: "center" }}>
                      You have successfully added a 30 days subscription to your
                      account. Congratulations!
                    </AppText>
                  </Animated.View>
                )}
                <Animated.View
                  layout={LinearTransition.springify().damping(20)}
                  style={styles.formBtn}
                >
                  {!isSuccess && (
                    <>
                      <AppText
                        style={styles.payTxt}
                        fontWeight="light"
                        size={"xsmall"}
                      >
                        Payments secured by Flutterwave
                      </AppText>

                      <FormikButton
                        title={
                          isVerify
                            ? "Verify Payment"
                            : isPin
                            ? "Enter Pin"
                            : "Subscribe"
                        }
                        // onPress={handleSubscription}
                        contStyle={{ marginTop: 10, marginHorizontal: 20 }}
                      />
                    </>
                  )}

                  <AppButton
                    title={isSuccess ? "Finish Session" : "Cancel Session"}
                    type={isSuccess ? "accent" : "warn"}
                    onPress={() => hideModal(isSuccess)}
                    contStyle={{ marginHorizontal: 20 }}
                  />
                </Animated.View>
                <LottieAnimator visible={isLoading} absolute />
              </>
            );
          }}
        </Formik>
      </View>
      <PopMessage popData={popper} setPopData={setPopper} />
    </>
  );
};

export default DisplayPayments;

const styles = StyleSheet.create({
  avoidingView: {
    flex: 1,
  },
  cardInfo: {
    color: colors.medium,
    textAlign: "center",
    width: "85%",
    alignSelf: "center",
    marginTop: 6,
  },
  checkbox: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
  },
  dateInput: {
    width: width * 0.4,
  },
  formBtn: {
    flex: 1,
    justifyContent: "flex-end",
  },
  payTxt: {
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  webViewContainer: {
    height: height * 0.75,
    width: width * 0.95,
    padding: 15,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: colors.white,
    elevation: 5,
  },

  webView: {
    // borderRadius: 30,
    overflow: "hidden",
  },
  title: {
    marginTop: 5,
    marginBottom: 15,
  },
});
