import { Dimensions, StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import {
  selectUser,
  useVerifySubscriptionMutation,
} from "../context/usersSlice";
import { PayWithFlutterwave } from "flutterwave-react-native";
import { useSelector } from "react-redux";
import { useState } from "react";
import { getFullName, hasCompletedProfile } from "../helpers/helperFunctions";
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
import AppButton from "./AppButton";
import { Formik } from "formik";
import { subInitials, subUserSchema } from "../helpers/yupSchemas";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("screen");

const DisplayPayments = ({ hideModal, data }) => {
  const [verifySubscription, { isLoading, data: subbed }] =
    useVerifySubscriptionMutation();

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
  // In DisplayPayments.jsx - replace handleOnRedirect
  const handleOnRedirect = async (response) => {
    try {
      // Even on "cancelled", flutterwave sometimes fires this with a tx_ref
      // Always attempt verification if we have a tx_ref
      if (response?.tx_ref) {
        const result = await verifySubscription({
          transaction_id: response.transaction_id ?? null,
          tx_ref: response.tx_ref,
          status: response.status,
        }).unwrap();

        if (result.success) {
          setBools({ ...bools, status: "success" });
          return;
        }
      }

      if (response?.status === "cancelled" && !response?.transaction_id) {
        setPopper({ vis: true, type: "info", msg: "Payment cancelled." });
      }
    } catch (error) {
      // Payment may have succeeded server-side even if redirect failed
      // Show manual recovery UI instead of just "failed"
      setPopper({
        vis: true,
        type: "info",
        msg: "Payment status unclear. If you were debited, use 'Recover Payment' below.",
      });
      setBools({ ...bools, status: "pending", showRecovery: true });
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
    <View style={styles.webViewContainer}>
      <Formik
        initialValues={subInitials}
        validationSchema={subUserSchema}
        onSubmit={() => {}}
      >
        {({ values }) => {
          const amount = Number(values["sub_amount"]?.value ?? 0);

          return (
            <View style={styles.main}>
              {!isSuccess && (
                <AppText size={"large"} fontWeight="heavy" style={styles.title}>
                  Choose {isSchool ? "School" : "Student"} Payment Plan
                </AppText>
              )}

              {isPending && (
                <Animated.View
                  entering={profile.bool && enterAnimOther}
                  exiting={profile.bool && exitingAnim}
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
                  style={{ alignItems: "center" }}
                >
                  <LottieAnimator
                    name="payment"
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
                    style={{
                      textAlign: "center",
                      marginTop: 10,
                      marginBottom: 40,
                    }}
                  >
                    You have successfully added a {subbed?.data?.days || "N"}{" "}
                    days subscription to your account. Congratulations!
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
                          "FLWPUBK-2b39b5e1580ac31aa7301fd6a66e48e5-X",
                        customer: {
                          email: user.email,
                          name: getFullName(user),
                        },
                        amount,
                        currency: "NGN",
                        payment_options: "card,banktransfer,ussd",
                        meta: {
                          account_type: data?.type,
                          name: getFullName(user),
                          days: values["sub_amount"]?.days,
                          schoolId: isSchool
                            ? data?.schoolId ?? data?.data?._id
                            : "",
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
            </View>
          );
        }}
      </Formik>
      {/* Payment Info Tips — outside the white main view */}
      <View style={styles.infoSection}>
        {[
          {
            icon: "card-outline",
            title: "Card not working?",
            desc: "Switch to bank transfer or USSD from the payment options screen.",
          },
          {
            icon: "shield-checkmark-outline",
            title: "Secure & encrypted",
            desc: "Your payment details are never stored on our servers.",
          },
          {
            icon: "refresh-outline",
            title: "Debited but not activated?",
            desc: "Go to Profile → Settings & More → Contact Us and open a Payment & Billing ticket. We'll get back to you within minutes.",
          },
        ].map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <View style={styles.tipIconWrap}>
              <Ionicons name={tip.icon} size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText fontWeight="semibold" size="small">
                {tip.title}
              </AppText>
              <AppText
                size="xsmall"
                style={{ color: colors.medium, marginTop: 2 }}
              >
                {tip.desc}
              </AppText>
            </View>
          </View>
        ))}
      </View>
      <PopMessage popData={popper} setPopData={setPopper} />
    </View>
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
  infoSection: {
    marginBottom: 14,
    borderRadius: 12,
    marginHorizontal: 10,
    // borderWidth: 1,
    // borderColor: colors.primary + "25",
    // overflow: "hidden",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.extraLight,
  },
  tipIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  formBtn: {
    // flex: 1,
    // justifyContent: "flex-end",
  },
  main: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    boxShadow: `2px 8px 18px ${colors.primary}25`,
    marginBottom: 20,
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
    // backgroundColor: "red",
    // flex: 1,
    // padding: 8,
    // backgroundColor: colors.white,
    // justifyContent: "center",
    // alignItems: "center",
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
