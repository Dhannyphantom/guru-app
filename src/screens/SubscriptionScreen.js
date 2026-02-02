/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-expressions */
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import AppButton, { FormikButton } from "../components/AppButton";
// import Screen from "../components/Screen";

import AppModal from "../components/AppModal";
import colors from "../helpers/colors";
import LottieAnimator from "../components/LottieAnimator";
import {
  selectUser,
  useBuyDataMutation,
  useFetchDataBundlesQuery,
  useFetchTransactionsQuery,
  useLazyFetchBanksQuery,
  useLazyFetchUserQuery,
  useRechargeAirtimeMutation,
  useRenewSubscriptionMutation,
  useVerifyAccountMutation,
  useWithdrawFromWalletMutation,
} from "../context/usersSlice";
import AppText from "../components/AppText";
import {
  enterAnimOther,
  exitingAnim,
  PAD_BOTTOM,
  renewSubList,
} from "../helpers/dataStore";
import {
  calculatePointsAmount,
  dateFormatter,
  formatPoints,
  getCurrencyAmount,
  hasCompletedProfile,
} from "../helpers/helperFunctions";
import FormInput, { FormikInput } from "../components/FormInput";
import Animated, { FadeIn } from "react-native-reanimated";
import PopMessage from "../components/PopMessage";
import { useSelector } from "react-redux";
import { Formik } from "formik";
import {
  buyDataInitials,
  buyDataSchema,
  renewInitials,
  renewSubsSchema,
  withdrawInitials,
  withdrawPointsSchema,
} from "../helpers/yupSchemas";
import AsyncStorage from "@react-native-async-storage/async-storage";
import getRefresher from "../components/Refresher";
import DisplayPayments from "../components/DisplayPayments";
import { selectSchool } from "../context/schoolSlice";
import { useLocalSearchParams, useRouter } from "expo-router";
import AppHeader from "../components/AppHeader";
import TabSelector from "../components/TabSelector";
import ListEmpty from "../components/ListEmpty";
import { StatusBar } from "expo-status-bar";

const { width, height } = Dimensions.get("screen");

const PROGRESS_SIZE = width * 0.45;
const maxProgress = 295;

export const WithdrawModal = ({
  closeModal,
  state,
  type,
  setState,
  setPopper,
}) => {
  const [withdrawFromWallet, { isLoading, isError, error }] =
    useWithdrawFromWalletMutation();
  const [fetchBanks, { isLoading: bankLoading }] = useLazyFetchBanksQuery();
  const [verifyAcct, { isLoading: isVerifying }] = useVerifyAccountMutation();
  const { data, isLoading: isBundling, refetch } = useFetchDataBundlesQuery();
  const [rechargeAirtime, { isLoading: isRecharging, data: recharger }] =
    useRechargeAirtimeMutation();
  const [renewSubscription, { isLoading: isRenewing }] =
    useRenewSubscriptionMutation();
  const [buyData, { isLoading: isBuying, data: bundler }] =
    useBuyDataMutation();

  const user = useSelector(selectUser);
  // const router = useRouter();

  const [amount, setAmount] = useState("");
  const [contact, setContact] = useState(user?.contact);
  const [tab, setTab] = useState("MTN");
  const [refreshing, setRefreshing] = useState(false);

  const balance = calculatePointsAmount(user.points);
  const shouldHideContinueBtn = ["subscription", "data"].includes(type);

  // console.log(JSON.stringify(state.banks, null, 2));

  const isPending = state.status === "pending";
  const isSuccess = state.status === "success";
  const isDetails = state.status === "details";
  const isVerified = Boolean(state.bankName);
  const bundles = data?.data ?? [];

  const editable = true;
  const profile = hasCompletedProfile(user);
  buyDataInitials.phoneNumber = user?.contact;

  let headerTxt, successTxt;
  switch (type) {
    case "subscription":
      headerTxt = "Subscription Renewed Successfully";
      successTxt = `Congratulations. You have successfully added ${amount} days to your active subscription`;
      break;

    case "airtime":
      headerTxt = "Airtime Initiated Successfully";
      successTxt = `Congratulations. ${recharger?.message}`;
      break;

    case "data":
      headerTxt = "Data Bundle Initiated Successfully";
      successTxt = `Congratulations. ${bundler?.message}`;
      break;

    case "transfer":
      headerTxt = "Transaction Initiated Successfully";
      successTxt =
        "Your withdraw transaction is pending. Please wait, you will be credited shortly.";

      break;
  }

  const onBankFetch = async (isFetcher = false) => {
    if (!profile.bool) {
      return setPopper(profile.pop);
    }
    const cachedBanks = await AsyncStorage.getItem("banks");

    if (Boolean(cachedBanks)) {
      setState({
        ...state,
        status: isFetcher ? "pending" : "details",
        banks: JSON.parse(cachedBanks),
      });
    } else {
      const res = await fetchBanks();
      await AsyncStorage.setItem("banks", JSON.stringify(res?.data?.banks));
      setState({
        ...state,
        status: isFetcher ? "pending" : "details",
        banks: res?.data?.banks,
      });
    }
  };

  const handleCashOut = async (formValues) => {
    try {
      const res = await withdrawFromWallet({
        pointsToConvert: calculatePointsAmount(amount).point,
        accountNumber: formValues.acct_number,
        accountBank: "044",
      }).unwrap();

      if (res.success === true) {
        setState({ ...state, status: "success" });
      } else {
        setPopper({
          vis: true,
          type: "failed",
          msg: "Transaction failed: " + res?.message ?? "",
        });
      }
    } catch (err) {
      console.log(err);
      setPopper({
        vis: true,
        type: "failed",
        msg: "Transaction failed " + err?.msg ?? err?.data,
      });
    }
  };

  const handleContinue = async () => {
    if (type === "transfer") {
      await onBankFetch(false);
    } else if (type === "airtime") {
      try {
        const reqData = {
          pointsToConvert: calculatePointsAmount(amount).point,
          phoneNumber: contact,
          network: tab,
        };

        const res = await rechargeAirtime(reqData).unwrap();

        if (res?.success) {
          setState({ ...state, status: "success" });
        }
      } catch (errr) {
        setPopper({
          vis: true,
          type: "failed",
          timer: 1400,
          msg: errr?.data?.message ?? "Transaction failed",
        });
        console.log(errr);
      }
    }
  };

  const onChangeAmount = (textVal) => {
    const num = parseInt(textVal, 10);
    if (!isNaN(num) && num <= balance.amount) {
      setAmount(textVal);
    } else if (textVal === "") {
      setAmount("");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (errr) {
    } finally {
      setRefreshing(false);
    }
  };

  const onRenewSub = async (fv) => {
    if (user.points < fv?.amount?.value) {
      return setPopper({
        vis: true,
        type: "failed",
        timer: 1000,
        msg: "You don't have enough Guru Tokens",
      });
    }
    try {
      const res = await renewSubscription(fv?.amount).unwrap();
      setAmount(fv?.amount?.days);
      if (res?.status === "success") {
        setState({ ...state, status: "success" });
      }
    } catch (errr) {
      setPopper({
        vis: true,
        type: "failed",
        msg: errr?.data?.message ?? errr?.error ?? "Transaction Failed",
      });
      console.log(errr);
    }
  };

  const onBuyData = async (fv) => {
    if (user.points < fv?.bundle?.value) {
      return setPopper({
        vis: true,
        type: "failed",
        timer: 1000,
        msg: "You don't have enough Guru Tokens",
      });
    }

    try {
      const res = await buyData({
        pointsToConvert: fv?.bundle?.value,
        phoneNumber: fv?.phoneNumber,
        network: fv?.network,
        bundleId: fv?.bundle?.id,
        billerCode: fv?.bundle?.billerCode,
        itemCode: fv?.bundle?.itemCode,
        bundleName: fv?.bundle?.name,
        bundleAmount: fv?.bundle?.amount,
      }).unwrap();

      setAmount(fv?.amount?.name);
      if (res?.success) {
        setState({ ...state, status: "success" });
      }
    } catch (errr) {
      console.log({ errr });
      setPopper({
        vis: true,
        timer: 1200,
        type: "failed",
        msg: errr?.data?.message ?? errr?.error ?? "Transaction Failed",
      });
    }
  };

  const verifyAccount = async (formValues) => {
    if (isVerified) {
      await handleCashOut(formValues);
    } else {
      try {
        const res = await verifyAcct(formValues).unwrap();
        if (res?.status === "success") {
          setState((prev) => ({ ...prev, bankName: res?.data?.account_name }));
        } else {
          setPopper({
            vis: true,
            type: "failed",
            msg: "Account verification failed",
          });
        }
      } catch (_error) {
        setPopper({
          vis: true,
          type: "failed",
          msg: "Something went wrong",
        });
      }
    }
  };

  useEffect(() => {
    onBankFetch(true);
  }, []);

  return (
    <Animated.View entering={FadeIn.delay(300)} style={styles.withdraw}>
      <ScrollView
        refreshControl={getRefresher({ refreshing, onRefresh })}
        contentContainerStyle={{ paddingBottom: PAD_BOTTOM }}
      >
        {isPending && (
          <Animated.View exiting={exitingAnim}>
            <View style={styles.withdrawRow}>
              <View style={styles.cardMini}>
                <AppText
                  size={"large"}
                  style={styles.withdrawHeaderTxt}
                  fontWeight="bold"
                >
                  Points
                </AppText>
                <AppText
                  size="xxxlarge"
                  fontWeight="heavy"
                  style={styles.withdrawTxt}
                >
                  {user?.points}
                  <AppText
                    style={styles.withdrawTxt}
                    fontWeight="black"
                    size="xsmall"
                  >
                    GT
                  </AppText>
                </AppText>
              </View>

              <View style={styles.cardMini}>
                <AppText
                  size={"large"}
                  style={styles.withdrawHeaderTxt}
                  fontWeight="bold"
                >
                  Balance
                </AppText>
                <AppText
                  size="xxxlarge"
                  fontWeight="heavy"
                  style={styles.withdrawTxt}
                >
                  {balance.format}
                </AppText>
              </View>
            </View>

            {type === "airtime" && (
              <View style={{}}>
                <TabSelector
                  options={[
                    { label: "MTN", color: colors.warning },
                    { label: "GLO", color: "#00B140" },
                    { label: "AIRTEL", color: "#E90000" },
                    { label: "9MOBILE", color: "#006400" },
                  ]}
                  onChange={(item, index) => {
                    setTab(item?.label);
                  }}
                />
                <FormInput
                  keyboardType="numeric"
                  placeholder="Enter phone number"
                  maxLength={20}
                  headerText={"Phone Number:"}
                  value={contact}
                  onChangeText={(val) => setContact(val)}
                />
                <FormInput
                  keyboardType="numeric"
                  placeholder="Enter amount to withdraw"
                  editable={editable}
                  headerText={"Enter amount(₦):"}
                  value={amount}
                  onChangeText={onChangeAmount}
                />
                <AppText
                  style={styles.preview}
                  fontWeight="black"
                  size="xxlarge"
                >
                  {calculatePointsAmount(amount).pointFormat}
                </AppText>
              </View>
            )}
            {type === "transfer" && (
              <View style={{ marginTop: 20 }}>
                <FormInput
                  keyboardType="numeric"
                  placeholder="Enter amount to withdraw"
                  editable={editable}
                  headerText={"Enter amount(₦):"}
                  value={amount}
                  onChangeText={onChangeAmount}
                />
                <AppText
                  style={styles.preview}
                  fontWeight="black"
                  size="xxlarge"
                >
                  {calculatePointsAmount(amount).pointFormat}
                </AppText>
              </View>
            )}
            {type === "data" && (
              <View>
                <Formik
                  initialValues={buyDataInitials}
                  validationSchema={buyDataSchema}
                  onSubmit={onBuyData}
                >
                  {({ values, setFieldValue }) => {
                    return (
                      <>
                        <TabSelector
                          options={[
                            { label: "MTN", color: colors.warning },
                            { label: "GLO", color: "#00B140" },
                            { label: "AIRTEL", color: "#E90000" },
                            { label: "9MOBILE", color: "#006400" },
                          ]}
                          onChange={(item, index) => {
                            setFieldValue("network", item?.label);
                            setFieldValue("bundle", {});
                          }}
                        />
                        <FormikInput
                          keyboardType="numeric"
                          placeholder="Enter phone number"
                          maxLength={20}
                          name={"phoneNumber"}
                          headerText={"Phone Number:"}
                        />
                        <FormikInput
                          name={"bundle"}
                          placeholder={"Select Subscription Plan"}
                          data={bundles[values["network"]]}
                          hideText
                          type="dropdown"
                          isLoading={isBundling}
                          items={[
                            { name: "points", fontWeight: "medium" },
                            {
                              name: "description",
                              fontWeight: "bold",
                              size: "medium",
                            },
                          ]}
                          numDisplayItems={2}
                          headerText={"Subscription Plan"}
                        />
                        {values["bundle"]?.points && (
                          <AppText
                            style={styles.preview}
                            fontWeight="black"
                            size="xxlarge"
                          >
                            -{values["bundle"]?.points}
                          </AppText>
                        )}

                        <FormikButton
                          contStyle={{
                            marginTop: 25,
                            marginHorizontal: width * 0.1,
                          }}
                          title={"Buy Data"}
                          type="accent"
                        />
                      </>
                    );
                  }}
                </Formik>
              </View>
            )}
            {type === "subscription" && (
              <View>
                <Formik
                  initialValues={renewInitials}
                  validationSchema={renewSubsSchema}
                  onSubmit={onRenewSub}
                >
                  <>
                    <FormikInput
                      name={"amount"}
                      placeholder={"Select Subscription Plan"}
                      data={renewSubList}
                      type="dropdown"
                      numDisplayItems={2}
                      headerText={"Subscription Plan"}
                    />

                    <FormikButton
                      contStyle={{ marginHorizontal: width * 0.1 }}
                      title={"Buy Subscription"}
                      type="accent"
                    />
                  </>
                </Formik>
              </View>
            )}
            {isError && <AppText>{error.message}</AppText>}
          </Animated.View>
        )}
        {isDetails && (
          <Animated.View exiting={exitingAnim} entering={enterAnimOther}>
            <AppText
              style={[styles.withdrawHeaderTxt, { color: colors.black }]}
              fontWeight="bold"
            >
              Enter Bank Account Details
            </AppText>
            <Formik
              initialValues={withdrawInitials}
              validationSchema={withdrawPointsSchema}
              onSubmit={verifyAccount}
            >
              <>
                <FormikInput
                  name={"bank"}
                  placeholder={"Select Bank"}
                  data={state.banks}
                  type="dropdown"
                  numDisplayItems={2}
                  headerText={"Bank"}
                />
                <FormikInput
                  name={"acct_number"}
                  placeholder={"Enter Account Number"}
                  isLoading={isVerifying}
                  keyboardType="numeric"
                  headerText={"Account Number"}
                />
                {isVerified && (
                  <View style={styles.acctName}>
                    <MaterialCommunityIcons
                      name="check-circle"
                      color={colors.primary}
                      size={16}
                    />
                    <AppText fontWeight="bold" style={styles.accountName}>
                      {state.bankName}
                    </AppText>
                  </View>
                )}

                <FormikButton
                  contStyle={{ marginHorizontal: width * 0.1 }}
                  title={isVerified ? "Withdraw" : "Verify Account"}
                  type="accent"
                />
              </>
            </Formik>
          </Animated.View>
        )}

        {isSuccess && (
          <Animated.View
            entering={enterAnimOther}
            style={{ alignItems: "center" }}
          >
            <LottieAnimator
              name="success"
              style={{ width: width * 0.7, height: height * 0.35 }}
            />
            <AppText
              fontWeight="black"
              size={"xxlarge"}
              style={{ color: colors.accentDeep }}
            >
              {headerTxt}
            </AppText>
            <AppText
              fontWeight="light"
              style={{
                textAlign: "center",
                marginHorizontal: 30,
                marginBottom: 25,
              }}
            >
              {successTxt}
            </AppText>
          </Animated.View>
        )}
        {!editable && (
          <AppText style={styles.info}>
            Your balance is low, come back and withdraw your funds when you have
            at least{" "}
            <AppText fontWeight="heavy">{getCurrencyAmount(500)}</AppText>
          </AppText>
        )}
        <View style={styles.withdrawBtns}>
          {editable && isPending && !shouldHideContinueBtn && (
            <AppButton
              contStyle={{ marginTop: 20 }}
              title={"Continue"}
              onPress={handleContinue}
            />
          )}
          <AppButton
            title={isSuccess ? "Close" : "Cancel Withdrawal"}
            type={isSuccess ? "accent" : "warn"}
            onPress={closeModal}
          />
        </View>
        <LottieAnimator
          visible={
            isLoading || bankLoading || isRenewing || isRecharging || isBuying
          }
          absolute
          wTransparent
        />
      </ScrollView>
    </Animated.View>
  );
};

const SubHistory = ({ item }) => {
  if (!item) return null;
  const isSub = ["credit", "points"].includes(item?.transactionType);
  return (
    <View
      style={[
        styles.subHistory,
        {
          borderWidth: 2,
          borderColor: isSub ? colors.accentLighter : colors.greenLighter,
        },
      ]}
    >
      <View style={styles.subHistoryIcon}>
        <MaterialCommunityIcons
          name={isSub ? "dots-circle" : "dots-hexagon"}
          color={isSub ? colors.accentLight : colors.greenLight}
          size={15}
          style={{
            backgroundColor: isSub ? colors.accentDeeper : colors.green,
            alignSelf: "center",
            borderRadius: 50,
            padding: 5,
            elevation: 1,
          }}
        />
      </View>
      <View style={styles.subHistoryContent}>
        <AppText
          fontWeight="black"
          size={"large"}
          style={{ color: colors.medium }}
        >
          {isSub ? "Subscription" : "Withdrawal"}
        </AppText>
        <AppText
          fontWeight="medium"
          size={"medium"}
          style={{ color: colors.medium }}
        >
          {item?.description}
        </AppText>
        <AppText
          style={{
            marginTop: 4,
            color: isSub ? colors.accentDeeper : colors.greenDark,
          }}
          fontWeight="heavy"
          size={"xlarge"}
        >
          {item?.transactionType === "points"
            ? formatPoints(item?.metadata?.pointsSpent)
            : getCurrencyAmount(item.amount)}
        </AppText>
      </View>
      <View style={styles.subHistoryDetail}>
        <AppText fontWeight="bold" size={"small"}>
          {" "}
          {isSub
            ? `+${item?.metadata?.days} days`
            : item?.metadata?.payoutType}{" "}
        </AppText>
        <AppText style={{ marginTop: 10 }} fontWeight="thin" size={"small"}>
          {dateFormatter(item.createdAt, "fullDate")}
        </AppText>
      </View>
    </View>
  );
};

const SubscriptionScreen = () => {
  const user = useSelector(selectUser);
  const school = useSelector(selectSchool);

  const searchParams = useLocalSearchParams();

  const params = Boolean(searchParams?.data)
    ? JSON.parse(searchParams?.data)
    : {};
  const fromSchool = params?.screen === "School";
  const router = useRouter();

  const { isActive, expiry, current } = fromSchool
    ? school?.subscription
    : user.subscription;
  const [fetchUser] = useLazyFetchUserQuery();
  const { data, isLoading, refetch } = useFetchTransactionsQuery();

  const [bools, setBools] = useState({
    modal: false,
    uri: null,
    type: "display",
  });
  const [popper, setPopper] = useState({ vis: false });
  const [refreshing, setRefreshing] = useState(false);

  const lottieRef = useRef(null);
  const history = data?.data;

  const { sub, total, terms } = dateFormatter(expiry, "sub", { current });
  const isTeacher = user?.accountType === "teacher";
  const isSchool = fromSchool || isTeacher;
  const profile = hasCompletedProfile(user);

  const openSubsciptionModal = async () => {
    if (!profile.bool) {
      return setPopper(profile.pop);
    }

    if (isSchool && !Boolean(school)) {
      return setPopper({
        vis: true,
        msg: "Please create a Profile for your School",
        timer: 2500,
        type: "failed",
      });
    }
    setBools({
      ...bools,
      modal: true,
      type: "display",
    });
  };

  const handleWithdrawal = () => {
    if (!profile.bool) {
      return setPopper(profile.pop);
    }

    router.push({
      pathname: "/(protected)/(tabs)/profile/payment",
      params: "withdrawal",
    });
    // setBools({ ...bools, modal: true, type: "withdraw" });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchUser();
      await refetch();
    } catch (error) {
      console.log(error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let animFrame = (sub / total) * maxProgress;
    if (Number.isNaN(animFrame)) {
      animFrame = 0;
    }

    lottieRef.current?.play(0, animFrame);
  }, [sub, total]);

  return (
    <View style={styles.container}>
      <AppHeader title="Subscriptions" />
      <FlatList
        data={["Sub"]}
        refreshControl={getRefresher({ refreshing, onRefresh })}
        contentContainerStyle={{ paddingBottom: PAD_BOTTOM }}
        renderItem={() => (
          <>
            <LinearGradient
              colors={[colors.primary, colors.primaryDeeper]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              {/* Decorative elements */}
              <View style={styles.cardDecoration}>
                <View style={styles.decorativeCircle1} />
                <View style={styles.decorativeCircle2} />
              </View>

              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardBrand}>
                  <MaterialCommunityIcons
                    name={isSchool ? "school" : "wallet"}
                    size={24}
                    color={colors.white}
                  />
                  <AppText
                    style={{ color: colors.white, marginLeft: 8 }}
                    size={16}
                    fontWeight="bold"
                  >
                    {isSchool ? "School Account" : "Guru Wallet"}
                  </AppText>
                </View>
                <MaterialCommunityIcons
                  name="contactless-payment"
                  size={28}
                  color={colors.primaryLighter}
                />
              </View>

              {/* Main Content Area */}
              <View style={styles.cardContent}>
                {/* Left side - Main balance/points */}
                <View style={styles.cardLeft}>
                  <AppText
                    style={{ color: colors.primaryLighter, marginBottom: 8 }}
                    size={13}
                    fontWeight="medium"
                  >
                    {isSchool ? "ACTIVE SUBSCRIPTION" : "AVAILABLE POINTS"}
                  </AppText>
                  <AppText
                    style={{ color: colors.white, marginBottom: 4 }}
                    size={isSchool ? 36 : 30}
                    fontWeight="black"
                  >
                    {isSchool
                      ? `${Math.max(0, terms)} TERM${terms > 1 ? "S" : ""}`
                      : formatPoints(user?.points)}
                  </AppText>
                  <AppText
                    style={{ color: colors.primaryLighter }}
                    size={12}
                    fontWeight="medium"
                  >
                    {isSchool
                      ? "subscription active"
                      : `Total Earned: ${formatPoints(user.totalPoints)}`}
                  </AppText>
                </View>

                {/* Right side - Progress indicator */}
                <View style={styles.cardRight}>
                  <View style={styles.progressContainer}>
                    <LottieAnimator
                      name="circle_progress"
                      speed={1.5}
                      animRef={lottieRef}
                      autoPlay={false}
                      size={PROGRESS_SIZE}
                      loop={false}
                      style={
                        {
                          // width: PROGRESS_SIZE,
                          // height: PROGRESS_SIZE,
                          // backgroundColor: "red",
                        }
                      }
                    />
                    <View style={styles.progressOverlay}>
                      <AppText
                        // size={28}
                        size="xxlarge"
                        style={{
                          color: colors.white,
                          textAlign: "center",
                        }}
                        fontWeight="black"
                      >
                        {isActive ? sub : 0}
                      </AppText>
                      <AppText
                        size={12}
                        style={{
                          color: colors.primaryLighter,
                          textAlign: "center",
                          marginTop: -4,
                        }}
                        fontWeight="bold"
                      >
                        days left
                      </AppText>
                    </View>
                  </View>
                </View>
              </View>

              {/* Card Footer */}
              <View style={styles.cardFooter}>
                <View style={styles.cardFooterItem}>
                  <AppText
                    style={{ color: colors.primaryLighter }}
                    size={11}
                    fontWeight="medium"
                  >
                    {isSchool ? "ACTIVE STUDENTS" : "CASH BALANCE"}
                  </AppText>
                  <AppText
                    style={{ color: colors.white, marginTop: 4 }}
                    size={20}
                    fontWeight="black"
                  >
                    {isSchool
                      ? (school?.students?.length ?? 0)
                      : calculatePointsAmount(user.points).format}
                  </AppText>
                </View>
                <View style={styles.cardFooterDivider} />
                <View style={styles.cardFooterItem}>
                  <AppText
                    style={{ color: colors.primaryLighter }}
                    size={11}
                    fontWeight="medium"
                  >
                    {isSchool ? "STATUS" : "ACCOUNT TYPE"}
                  </AppText>
                  <AppText
                    style={{ color: colors.white, marginTop: 4 }}
                    size={14}
                    fontWeight="bold"
                  >
                    {isSchool
                      ? isActive
                        ? "Active"
                        : "Inactive"
                      : isActive
                        ? "Premium"
                        : "Freemium"}
                  </AppText>
                </View>
              </View>

              {/* Card chip decoration */}
              <View style={styles.cardChip}>
                <View style={styles.chipLine1} />
                <View style={styles.chipLine2} />
              </View>
            </LinearGradient>

            <View style={styles.btns}>
              <AppButton
                type="accent"
                title={"Subscribe"}
                icon={{ name: "wallet", left: true }}
                style={{ paddingHorizontal: 40 }}
                onPress={openSubsciptionModal}
              />
              {!isSchool && (
                <AppButton
                  title={"Withdraw"}
                  icon={{ name: "cash-remove", left: true }}
                  style={{ paddingHorizontal: 40 }}
                  onPress={handleWithdrawal}
                />
              )}
            </View>

            <View style={styles.history}>
              <AppText fontWeight="bold" size={"xlarge"} style={{ margin: 15 }}>
                History
              </AppText>
              <FlatList
                data={history?.transactions}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ paddingBottom: height * 0.42 }}
                ListEmptyComponent={() => (
                  <ListEmpty vis={!isLoading} message="No history data" />
                )}
                renderItem={({ item }) => <SubHistory item={item} />}
              />
            </View>

            <AppModal
              visible={bools.modal}
              setVisible={() => setBools({ ...bools, modal: false })}
              fitContent={bools.type === "display"} // Add this line
              Component={() => {
                if (bools.type === "display") {
                  return (
                    <DisplayPayments
                      hideModal={() => setBools({ ...bools, modal: false })}
                      data={{
                        type: isSchool ? "school" : "student",
                        schoolId: school?._id,
                      }} // Add data prop
                    />
                  );
                } else if (bools.type === "withdraw") {
                  return (
                    <>
                      <WithdrawModal
                        closeModal={() => setBools({ ...bools, modal: false })}
                        setPopData={(data) => setPopper(data)}
                      />
                    </>
                  );
                }
              }}
            />
          </>
        )}
      />
      <PopMessage popData={popper} setPopData={setPopper} />
      <StatusBar style="dark" />
      {/* <LottieAnimator visible={isLoading} absolute wTransparent /> */}
    </View>
  );
};

export default SubscriptionScreen;

const styles = StyleSheet.create({
  acctName: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.unchange,
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  accountName: {
    marginHorizontal: 5,
  },
  avoidingView: {
    flex: 1,
  },
  btns: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  container: {
    flex: 1,
  },
  card: {
    width: width * 0.95,
    minHeight: height * 0.28,
    alignSelf: "center",
    marginBottom: 20,
    marginTop: 10,
    borderRadius: 24,
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    padding: 24,
    overflow: "hidden",
    position: "relative",
  },
  cardDecoration: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "100%",
    height: "100%",
  },
  decorativeCircle1: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryLight,
    opacity: 0.1,
  },
  decorativeCircle2: {
    position: "absolute",
    bottom: -40,
    left: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.white,
    opacity: 0.05,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1,
  },
  cardBrand: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1,
  },
  cardLeft: {
    // flex: 1,
    // backgroundColor: "red",
    width: width * 0.95 - PROGRESS_SIZE,

    // paddingRight: 12,
  },
  cardRight: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  progressOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.primaryLight,
    opacity: 0.8,
    zIndex: 1,
  },
  cardFooterItem: {
    flex: 1,
  },
  cardFooterDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.primaryLight,
    opacity: 0.3,
    marginHorizontal: 16,
  },
  cardChip: {
    position: "absolute",
    top: 20,
    right: 24,
    width: 40,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.white,
    opacity: 0.15,
    padding: 6,
    justifyContent: "space-between",
  },
  chipLine1: {
    width: "100%",
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  chipLine2: {
    width: "70%",
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  cardMini: {
    width: width * 0.4,
    backgroundColor: colors.primaryDeep,
    padding: 20,
    borderRadius: 20,
    boxShadow: `2px 8px 18px ${colors.primary}55`,
    marginBottom: 20,
    borderColor: colors.primary,
    borderWidth: 3,
    borderBottomWidth: 6,
  },
  cardDetails: {
    width: "48%",
    justifyContent: "space-around",
    marginVertical: 20,
    marginLeft: 15,
  },
  circleView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dateInput: {
    width: width * 0.3,
  },
  formBtn: {
    justifyContent: "flex-end",
  },
  info: {
    textAlign: "center",
    marginBottom: 20,
  },
  payTxt: {
    textAlign: "center",
  },
  preview: {
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subHistory: {
    flexDirection: "row",
    width: width * 0.92,
    padding: 12,
    borderRadius: 10,
    elevation: 1,
    alignSelf: "center",
    marginBottom: 10,
    backgroundColor: colors.lightly,
    paddingLeft: 1,
  },
  subHistoryIcon: {
    margin: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  subHistoryContent: {
    flex: 1,
    marginRight: 8,
  },
  subHistoryDetail: {},
  title: {
    marginTop: 5,
    marginBottom: 15,
  },
  withdraw: {
    flex: 1,
    padding: 10,
  },
  withdrawRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  withdrawHeaderTxt: {
    marginBottom: 20,
    color: colors.white,
  },
  withdrawTxt: {
    color: colors.white,
  },
  withdrawBtns: {
    marginHorizontal: width * 0.1,
  },
});
