/* eslint-disable react/no-unescaped-entities */
import {
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import AppText from "../components/AppText";
import {
  selectUser,
  useSubscribeUserMutation,
  useVerifySubscriptionMutation,
} from "../context/usersSlice";
import { PayWithFlutterwave } from "flutterwave-react-native";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import {
  getCurrencyAmount,
  getFullName,
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
  const [verifySubscription, { isLoading }] = useVerifySubscriptionMutation();

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

  /* An example function called when transaction is completed successfully or canceled */
  const handleOnRedirect = async (response) => {
    // data = { status, transaction_id?, tx_ref }
    console.log("Payment Response:", response);

    try {
      if (response?.status === "successful") {
        // Verify with backend
        const result = await verifySubscription({
          transaction_id: response.transaction_id,
          tx_ref: response.tx_ref,
          status: response.status,
        }).unwrap();

        console.log(result);

        if (result.success) {
          setBools({ ...bools, status: "success" });

          setPopper({
            vis: true,
            type: "success",
            msg: `Payment successful!`,
          });
        }
      } else if (response?.status === "cancelled") {
        setPopper({
          vis: true,
          type: "info",
          msg: "Payment cancelled.",
        });
      }
    } catch (error) {
      console.error("Payment error:", error);
      setPopper({
        vis: true,
        type: "failed",
        msg: "Payment failed. Please try again.",
      });
    }
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
          onSubmit={() => {}}
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
                              account_type: data?.type,
                              name: getFullName(user),
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
