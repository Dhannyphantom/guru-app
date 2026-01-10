/* eslint-disable react/no-unescaped-entities */
import {
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import AppText from "../components/AppText";
import { selectUser, useSubscribeUserMutation } from "../context/usersSlice";
import { PayWithFlutterwave } from "flutterwave-react-native";
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

  const isSchool = data?.type === "school";
  const user = useSelector(selectUser);

  const [bools, setBools] = useState({
    loading: true,
    status: "pending",
    payload: null,
    saveInfo: false,
    useSavedInfo: false,
  });
  const [popper, setPopper] = useState({ vis: false });

  // const webViewRef = useRef();
  const isSuccess = bools.status === "success";
  const isPending = bools.status === "pending";
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

  /* An example function called when transaction is completed successfully or canceled */
  const handleOnRedirect = (data) => {
    // data = { status, transaction_id?, tx_ref }
    console.log(data);
  };

  /* An example function to generate a random transaction reference */
  const generateTransactionRef = (length) => {
    let result = "";
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return `flw_tx_ref_${result}`;
  };

  return (
    <>
      <View style={styles.webViewContainer}>
        <Formik
          initialValues={subInitials}
          validationSchema={subUserSchema}
          onSubmit={handleSubscription}
        >
          {({ values }) => {
            const amount = Number(values["sub_amount"]?.value ?? 0);

            return (
              <>
                <>
                  {!isSuccess && (
                    <AppText
                      size={"large"}
                      fontWeight="heavy"
                      style={styles.title}
                    >
                      Choose {isSchool ? "School" : "Student"} Payment Plan
                    </AppText>
                  )}

                  {isPending && (
                    <Animated.View
                      entering={profile.bool && enterAnimOther}
                      exiting={profile.bool && exitingAnim}
                      style={{ flex: 3 }}
                    >
                      <FormikInput
                        headerText={"Subscription amount"}
                        name={"sub_amount"}
                        data={isSchool ? subSchoolDrop : subDropdown}
                        type="dropdown"
                        placeholder="Select subscription plan"
                      />
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
                      <AppText
                        fontWeight="light"
                        style={{ textAlign: "center" }}
                      >
                        You have successfully added a 30 days subscription to
                        your account. Congratulations!
                      </AppText>
                    </Animated.View>
                  )}

                  <Animated.View
                    layout={LinearTransition.springify()}
                    style={styles.formBtn}
                  >
                    {!isSuccess && Boolean(values["sub_amount"]) && (
                      <>
                        <PayWithFlutterwave
                          onRedirect={handleOnRedirect}
                          options={{
                            tx_ref: generateTransactionRef(10),
                            authorization:
                              "FLWPUBK_TEST-16067fba46bd1ab985e439656b68ce98-X",
                            customer: {
                              email: user.email,
                            },
                            amount,
                            currency: "NGN",
                            payment_options: "card,banktransfer,ussd",
                            meta: {
                              accountType: data?.type,
                            },
                          }}
                          customButton={(props) => (
                            <AppButton
                              title={"Subscribe"}
                              icon={{ name: "wallet", left: true }}
                              style={styles.paymentButton}
                              onPress={props.onPress}
                              isBusy={props.isInitializing}
                              disabled={props.disabled}
                            />
                          )}
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
    height: height * 0.45,
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
