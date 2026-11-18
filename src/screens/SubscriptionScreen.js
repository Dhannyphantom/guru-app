/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import AppButton, { FormikButton } from "../components/AppButton";
import colors from "../helpers/colors";
import LottieAnimator from "../components/LottieAnimator";
import {
  selectUser,
  useBuyDataMutation,
  useFetchDataBundlesQuery,
  useFetchPendingQuery,
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
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
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
import { selectSchool } from "../context/schoolSlice";
import { useLocalSearchParams, useRouter } from "expo-router";
import AppHeader from "../components/AppHeader";
import TabSelector from "../components/TabSelector";
import ListEmpty from "../components/ListEmpty";
import { StatusBar } from "expo-status-bar";
import PendingTransactions, {
  AttemptButtons,
  useAttemptActions,
} from "../components/PendingTransactions";
import PromptModal from "../components/PromptModal";

const { width, height } = Dimensions.get("screen");

const PROGRESS_SIZE = width * 0.3;

// One entrance spring for every card: settled, no wobble.
const enterSpring = (delay = 0) =>
  FadeInDown.delay(delay).springify().damping(26).stiffness(220).mass(1);
const PRESS_SPRING = { damping: 22, stiffness: 420, mass: 0.7 };
const maxProgress = 295;

// One key per payout ATTEMPT. If the network drops mid-request and the user
// taps again, the same key makes the server return the SAME payout instead of
// creating (and charging) a second one.
const makeIdemKey = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random()
    .toString(36)
    .slice(2, 10)}`;

// True when we can't know whether the server received / finished the request.
const isAmbiguousError = (err) =>
  ["FETCH_ERROR", "TIMEOUT_ERROR", "PARSING_ERROR"].includes(err?.status) ||
  (typeof err?.status === "number" && err.status >= 500) ||
  (!err?.status && !err?.data);

const PENDING_HINT =
  "We couldn't confirm that yet. Go back and check “Pending transactions” before trying again. You won't be charged twice.";

// Renewal payment source -> value sent to /renew-subscription as `payWith`
const PAY_OPTIONS = {
  "GT Points": "points",
  "Sub Points": "subscriptionPoints",
  Both: "both",
};
const PAY_HINTS = {
  points: "Pay with your GT points (the withdrawable balance).",
  subscriptionPoints:
    "Pay with subscription points earned from competitions. They can only be used for renewals.",
  both: "Subscription points are used first, then GT points cover the rest.",
};

const NETWORKS = [
  { label: "MTN", color: colors.warning },
  { label: "GLO", color: "#00B140" },
  { label: "AIRTEL", color: "#E90000" },
  { label: "9MOBILE", color: "#006400" },
];

const FLOW_STEPS = {
  transfer: ["Amount", "Account", "Done"],
  default: ["Details", "Done"],
};

/* ------------------------------------------------------------------ */
/* Withdraw flow building blocks                                       */
/* ------------------------------------------------------------------ */

const SectionLabel = ({ icon, text }) => (
  <View style={styles.sectionLabel}>
    <MaterialCommunityIcons name={icon} size={16} color={colors.primary} />
    <AppText fontWeight="bold" size={12} style={styles.sectionLabelText}>
      {text.toUpperCase()}
    </AppText>
  </View>
);

const Steps = ({ labels, active }) => (
  <View style={styles.steps}>
    {labels.map((label, i) => {
      const done = i < active;
      const now = i === active;
      return (
        <React.Fragment key={label}>
          {i > 0 && (
            <View style={[styles.stepLine, i <= active && styles.stepLineOn]} />
          )}
          <View style={styles.stepItem}>
            <Animated.View
              key={now ? "now" : done ? "done" : "next"}
              entering={ZoomIn.springify().damping(22).stiffness(260)}
              style={[
                styles.stepDot,
                (done || now) && styles.stepDotOn,
                now && styles.stepDotNow,
              ]}
            >
              {done ? (
                <MaterialCommunityIcons
                  name="check"
                  size={15}
                  color={colors.white}
                />
              ) : (
                <AppText
                  fontWeight="black"
                  size={12}
                  style={{ color: now ? colors.white : colors.medium }}
                >
                  {i + 1}
                </AppText>
              )}
            </Animated.View>
            <AppText
              fontWeight={now ? "bold" : "medium"}
              size={11}
              style={{ color: now ? colors.primaryDeep : colors.medium }}
            >
              {label}
            </AppText>
          </View>
        </React.Fragment>
      );
    })}
  </View>
);

const BalanceCard = ({ label = "Wallet balance", value, chips = [] }) => (
  <Animated.View entering={enterSpring()} style={styles.balanceWrap}>
    <LinearGradient
      colors={[colors.primary, colors.primaryDeep]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.balanceCard}
    >
      <View style={styles.blobA} />
      <View style={styles.blobB} />
      <View style={styles.balanceTop}>
        <View style={styles.balanceIcon}>
          <MaterialCommunityIcons
            name="wallet-outline"
            size={18}
            color={colors.white}
          />
        </View>
        <AppText fontWeight="bold" size={12} style={styles.balanceLabel}>
          {label.toUpperCase()}
        </AppText>
      </View>
      <AppText fontWeight="black" size={34} style={styles.balanceValue}>
        {value}
      </AppText>
      {chips.length > 0 && (
        <View style={styles.balanceChips}>
          {chips.map((chip) => (
            <View key={chip.label} style={styles.balanceChip}>
              <AppText
                fontWeight="medium"
                size={11}
                style={styles.balanceChipLabel}
              >
                {chip.label}
              </AppText>
              <AppText
                fontWeight="heavy"
                size={14}
                style={styles.balanceChipValue}
              >
                {chip.value}
              </AppText>
            </View>
          ))}
        </View>
      )}
    </LinearGradient>
  </Animated.View>
);

const QuickChip = ({ label, active, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.quickChip,
      active && styles.quickChipOn,
      pressed && { opacity: 0.7 },
    ]}
  >
    <AppText
      fontWeight="bold"
      size={13}
      style={{ color: active ? colors.white : colors.primaryDeep }}
    >
      {label}
    </AppText>
  </Pressable>
);

const CostPreview = ({ text }) => (
  <Animated.View key={text} entering={FadeIn.duration(180)} style={styles.cost}>
    <View style={styles.costIcon}>
      <MaterialCommunityIcons
        name="swap-horizontal"
        size={20}
        color={colors.primaryDeep}
      />
    </View>
    <View>
      <AppText fontWeight="medium" size={11} style={styles.costLabel}>
        {"YOU'LL SPEND"}
      </AppText>
      <AppText fontWeight="black" size="xlarge" style={styles.costValue}>
        {text}
      </AppText>
    </View>
  </Animated.View>
);

const AmountBlock = ({ amount, onChange, editable, quick, max, preview }) => (
  <>
    <FormInput
      keyboardType="numeric"
      placeholder="Enter amount to withdraw"
      headerText="Amount (₦)"
      editable={editable}
      disabled={!editable}
      value={amount}
      onChangeText={onChange}
    />
    {editable && (
      <View style={styles.quickRow}>
        {quick.map((v) => (
          <QuickChip
            key={v}
            label={getCurrencyAmount(v)}
            active={amount === String(v)}
            onPress={() => onChange(String(v))}
          />
        ))}
        {max > 0 && (
          <QuickChip
            label="Max"
            active={amount === String(max)}
            onPress={() => onChange(String(max))}
          />
        )}
      </View>
    )}
    {Boolean(amount) && <CostPreview text={preview} />}
  </>
);

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
  // Renewal only: "points" | "subscriptionPoints" | "both"
  const [payWith, setPayWith] = useState("points");

  // confirm prompt (PromptModal)
  const [prompt, setPrompt] = useState({ vis: false, data: null });
  const ask = ({ title, msg, btn, run }) =>
    setPrompt({ vis: true, data: { title, msg, btn }, cb: run });

  // idempotency: key is tied to the exact request so editing the form starts fresh
  const idem = useRef({ fp: null, key: null });
  const idemKey = (fingerprint) => {
    if (!idem.current.key || idem.current.fp !== fingerprint) {
      idem.current = { fp: fingerprint, key: makeIdemKey() };
    }
    return idem.current.key;
  };
  const clearIdemKey = () => {
    idem.current = { fp: null, key: null };
  };

  // Unclear result: the server may already have reserved points, so refresh
  // the balance and point the user at Pending transactions.
  const [refreshUser] = useLazyFetchUserQuery();
  const onAmbiguous = () => {
    refreshUser();
    return setPopper({
      vis: true,
      type: "info",
      timer: 4000,
      msg: PENDING_HINT,
    });
  };

  const subPoints = user?.subscriptionPoints || 0;
  const balance = calculatePointsAmount(user.points);
  // Renewals can also draw on subscription points, so the minimum-balance
  // check for that flow looks at the combined balance.
  const renewBalance = calculatePointsAmount((user.points || 0) + subPoints);
  const shownBalance = type === "subscription" ? renewBalance : balance;
  const shouldHideContinueBtn = ["subscription", "data"].includes(type);

  const isPending = state.status === "pending";
  const isSuccess = state.status === "success";
  const isDetails = state.status === "details";
  const isVerified = Boolean(state.bankName);
  const bundles = data?.data ?? [];

  // Minimum thresholds: ₦500 for bank transfer, ₦100 for airtime / data
  const MIN_TRANSFER = 500;
  const MIN_AIRTIME_DATA = 100;
  const MIN_RENEWAL = 250;
  const minRequired =
    type === "transfer"
      ? MIN_TRANSFER
      : type === "subscription"
        ? MIN_RENEWAL
        : MIN_AIRTIME_DATA;
  const editable = Number(shownBalance.amount) >= minRequired;
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
    if (Number(amount) < minRequired) {
      return setPopper({
        vis: true,
        type: "failed",
        msg: `Minimum withdrawal is ${getCurrencyAmount(minRequired)}`,
      });
    }
    try {
      const res = await withdrawFromWallet({
        pointsToConvert: calculatePointsAmount(amount).point,
        accountNumber: formValues.acct_number,
        accountBank: formValues?.bank?.code,
        idempotencyKey: idemKey(
          `wd|${amount}|${formValues.acct_number}|${formValues?.bank?.code}`,
        ),
      }).unwrap();

      if (res.success === true) {
        clearIdemKey();
        setState({ ...state, status: "success" });
      } else {
        clearIdemKey();
        setPopper({
          vis: true,
          type: "failed",
          msg: "Transaction failed: " + (res?.message ?? ""),
        });
      }
    } catch (err) {
      console.log(err);
      if (isAmbiguousError(err)) {
        // keep the key: tapping again replays the SAME payout
        return onAmbiguous();
      }
      clearIdemKey();
      setPopper({
        vis: true,
        type: "failed",
        msg: "Transaction failed " + (err?.msg ?? err?.data?.message ?? ""),
      });
    }
  };

  const handleContinue = async () => {
    if (Number(amount) < minRequired) {
      return setPopper({
        vis: true,
        type: "failed",
        timer: 2000,
        msg: `Minimum amount is ${getCurrencyAmount(minRequired)}`,
      });
    }
    if (type === "transfer") {
      await onBankFetch(false);
    } else if (type === "airtime") {
      ask({
        title: "Confirm airtime",
        msg: `Send ${getCurrencyAmount(amount)} airtime (${tab}) to ${contact}? ${
          calculatePointsAmount(amount).pointFormat
        } will be deducted from your points.`,
        btn: "Send airtime",
        run: doAirtime,
      });
    }
  };

  const doAirtime = async () => {
    {
      try {
        const reqData = {
          pointsToConvert: calculatePointsAmount(amount).point,
          phoneNumber: contact,
          network: tab,
          idempotencyKey: idemKey(`air|${amount}|${contact}|${tab}`),
        };

        const res = await rechargeAirtime(reqData).unwrap();

        if (res?.success) {
          clearIdemKey();
          setState({ ...state, status: "success" });
        }
      } catch (errr) {
        console.log(errr);
        if (isAmbiguousError(errr)) {
          return onAmbiguous();
        }
        clearIdemKey();
        const txt =
          ": Ensure good network connection and that the phone number and network you provided are correct";
        setPopper({
          vis: true,
          timer: 1200,
          type: "failed",
          msg:
            (errr?.data?.message ?? errr?.error ?? "Transaction Failed") + txt,
        });
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
      await refetch().unwrap();
    } catch (errr) {
      console.log(errr);
    } finally {
      setRefreshing(false);
    }
  };

  const onRenewSub = async (fv) => {
    const cost = Number(fv?.amount?.value || 0);
    const gt = user.points || 0;
    const sub = user.subscriptionPoints || 0;

    const notEnough =
      payWith === "points"
        ? gt < cost
        : payWith === "subscriptionPoints"
          ? sub < cost
          : gt + sub < cost;

    if (notEnough) {
      return setPopper({
        vis: true,
        type: "failed",
        timer: 1500,
        msg:
          payWith === "points"
            ? "You don't have enough Guru Tokens"
            : payWith === "subscriptionPoints"
              ? "You don't have enough subscription points"
              : "You don't have enough points (Guru Tokens + subscription points)",
      });
    }
    ask({
      title: "Confirm renewal",
      msg: `Renew ${fv?.amount?.days} days for ${formatPoints(cost)}? This will be deducted from your ${
        payWith === "points"
          ? "Guru Tokens"
          : payWith === "subscriptionPoints"
            ? "subscription points"
            : "points"
      }.`,
      btn: "Renew",
      run: () => doRenew(fv),
    });
  };

  const doRenew = async (fv) => {
    try {
      const res = await renewSubscription({
        ...fv?.amount,
        payWith,
      }).unwrap();
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

    ask({
      title: "Confirm data purchase",
      msg: `Buy ${fv?.bundle?.name} for ${fv?.phoneNumber} (${fv?.network})? ${formatPoints(
        fv?.bundle?.value,
      )} will be deducted from your points.`,
      btn: "Buy data",
      run: () => doBuy(fv),
    });
  };

  const doBuy = async (fv) => {
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
        idempotencyKey: idemKey(
          `data|${fv?.bundle?.id}|${fv?.phoneNumber}|${fv?.network}`,
        ),
      }).unwrap();

      setAmount(fv?.bundle?.name);
      if (res?.success) {
        clearIdemKey();
        setState({ ...state, status: "success" });
      }
    } catch (errr) {
      if (isAmbiguousError(errr)) {
        return onAmbiguous();
      }
      clearIdemKey();
      const txt =
        ": Ensure good network connection and that the phone number and network you provided are correct";
      setPopper({
        vis: true,
        timer: 1200,
        type: "failed",
        msg: (errr?.data?.message ?? errr?.error ?? "Transaction Failed") + txt,
      });
    }
  };

  const verifyAccount = async (formValues) => {
    // console.log({ formValues });
    // return;
    if (isVerified) {
      ask({
        title: "Confirm withdrawal",
        msg: `Withdraw ${getCurrencyAmount(amount)} to ${state?.bankName ?? "this account"} (${
          formValues?.acct_number
        })? ${calculatePointsAmount(amount).pointFormat} will be deducted from your points.`,
        btn: "Withdraw",
        run: () => handleCashOut(formValues),
      });
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

  const maxAmount = Math.floor(Number(balance.amount) || 0);
  const quickAmounts = [
    ...new Set([
      minRequired,
      minRequired * 2,
      minRequired * 5,
      minRequired * 10,
    ]),
  ].filter((v) => v <= maxAmount && v !== maxAmount);
  const showMax = maxAmount >= minRequired;
  const amountProps = {
    amount,
    onChange: onChangeAmount,
    editable,
    quick: quickAmounts,
    max: showMax ? maxAmount : 0,
    preview: calculatePointsAmount(amount).pointFormat,
  };

  const stepLabels = FLOW_STEPS[type] ?? FLOW_STEPS.default;
  const stepIndex =
    type === "transfer"
      ? isPending
        ? 0
        : isDetails
          ? 1
          : 2
      : isPending
        ? 0
        : 1;

  const balanceChips = [
    { label: "GT points", value: formatPoints(user?.points) },
  ];
  if (type === "subscription") {
    balanceChips.push({
      label: "Sub points",
      value: subPoints.toLocaleString(),
    });
  }

  return (
    <Animated.View entering={FadeIn.delay(150)} style={styles.withdraw}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={getRefresher({ refreshing, onRefresh })}
        contentContainerStyle={{ paddingBottom: PAD_BOTTOM }}
      >
        <Steps labels={stepLabels} active={stepIndex} />

        {isPending && (
          <Animated.View exiting={exitingAnim}>
            <BalanceCard value={balance.format} chips={balanceChips} />

            {type === "airtime" && (
              <View style={styles.block}>
                <SectionLabel icon="sim-outline" text="Network" />
                <TabSelector
                  options={NETWORKS}
                  onChange={(item) => setTab(item?.label)}
                />
                <SectionLabel icon="phone-outline" text="Who gets it" />
                <FormInput
                  keyboardType="numeric"
                  placeholder="Enter phone number"
                  maxLength={20}
                  headerText="Phone number"
                  LeftComponent={() => (
                    <AppText fontWeight="bold" style={{ color: colors.medium }}>
                      +234
                    </AppText>
                  )}
                  value={contact}
                  onChangeText={(val) => setContact(val)}
                />
                <SectionLabel icon="cash" text="How much" />
                <AmountBlock {...amountProps} />
              </View>
            )}

            {type === "transfer" && (
              <View style={styles.block}>
                <SectionLabel icon="cash" text="How much" />
                <AmountBlock {...amountProps} />
              </View>
            )}

            {type === "data" && (
              <View style={styles.block}>
                <Formik
                  initialValues={buyDataInitials}
                  validationSchema={buyDataSchema}
                  onSubmit={onBuyData}
                >
                  {({ values, setFieldValue }) => (
                    <>
                      <SectionLabel icon="sim-outline" text="Network" />
                      <TabSelector
                        options={NETWORKS}
                        onChange={(item) => {
                          setFieldValue("network", item?.label);
                          setFieldValue("bundle", {});
                        }}
                      />
                      <SectionLabel icon="phone-outline" text="Who gets it" />
                      <FormikInput
                        keyboardType="numeric"
                        placeholder="Enter phone number"
                        maxLength={20}
                        LeftComponent={() => (
                          <AppText
                            fontWeight="bold"
                            style={{ color: colors.medium }}
                          >
                            +234
                          </AppText>
                        )}
                        name={"phoneNumber"}
                        headerText={"Phone number"}
                      />
                      <SectionLabel
                        icon="package-variant"
                        text="Pick a bundle"
                      />
                      <FormikInput
                        name={"bundle"}
                        placeholder={"Select data plan"}
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
                        headerText={"Data plan"}
                      />
                      {Boolean(values["bundle"]?.points) && (
                        <CostPreview text={`-${values["bundle"]?.points}`} />
                      )}

                      <FormikButton
                        contStyle={styles.submitBtn}
                        title={"Buy Data"}
                        type="accent"
                      />
                    </>
                  )}
                </Formik>
              </View>
            )}

            {type === "subscription" && (
              <View style={styles.block}>
                <Formik
                  initialValues={renewInitials}
                  validationSchema={renewSubsSchema}
                  onSubmit={onRenewSub}
                >
                  <>
                    <SectionLabel icon="wallet-outline" text="Pay with" />
                    <TabSelector
                      options={[
                        { label: "GT Points", color: colors.accentDeeper },
                        { label: "Sub Points", color: colors.primary },
                        { label: "Both", color: colors.greenDark },
                      ]}
                      onChange={(item) =>
                        setPayWith(PAY_OPTIONS[item?.label] ?? "points")
                      }
                    />
                    <Animated.View
                      key={payWith}
                      entering={FadeIn.duration(180)}
                      style={styles.hintBox}
                    >
                      <MaterialCommunityIcons
                        name="information-outline"
                        size={16}
                        color={colors.primaryDeep}
                      />
                      <AppText
                        fontWeight="medium"
                        size={12}
                        style={styles.hintText}
                      >
                        {PAY_HINTS[payWith]}
                      </AppText>
                    </Animated.View>

                    <SectionLabel icon="calendar-star" text="Choose a plan" />
                    <FormikInput
                      name={"amount"}
                      placeholder={"Select subscription plan"}
                      data={renewSubList}
                      type="dropdown"
                      headerText={"Subscription plan"}
                    />

                    <FormikButton
                      contStyle={styles.submitBtn}
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
          <Animated.View
            exiting={exitingAnim}
            entering={enterAnimOther}
            style={styles.block}
          >
            <View style={styles.sendingCard}>
              <View style={styles.sendingIcon}>
                <MaterialCommunityIcons
                  name="bank-transfer-out"
                  size={24}
                  color={colors.white}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText fontWeight="medium" size={11} style={styles.costLabel}>
                  WITHDRAWING
                </AppText>
                <AppText
                  fontWeight="black"
                  size="xlarge"
                  style={styles.costValue}
                >
                  {getCurrencyAmount(Number(amount) || 0)}
                </AppText>
              </View>
            </View>

            <SectionLabel icon="bank-outline" text="Where should it go?" />
            <Formik
              initialValues={withdrawInitials}
              validationSchema={withdrawPointsSchema}
              onSubmit={verifyAccount}
            >
              <View>
                <FormikInput
                  name={"bank"}
                  placeholder={"Select bank"}
                  data={state.banks}
                  type="dropdown"
                  headerText={"Bank"}
                />
                <FormikInput
                  name={"acct_number"}
                  placeholder={"Enter account number"}
                  isLoading={isVerifying}
                  keyboardType="numeric"
                  headerText={"Account number"}
                />

                {isVerified && (
                  <Animated.View
                    entering={ZoomIn.springify().damping(22).stiffness(260)}
                    style={styles.verified}
                  >
                    <View style={styles.verifiedIcon}>
                      <MaterialCommunityIcons
                        name="check"
                        color={colors.white}
                        size={16}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText
                        fontWeight="medium"
                        size={11}
                        style={styles.costLabel}
                      >
                        ACCOUNT NAME
                      </AppText>
                      <AppText
                        fontWeight="heavy"
                        style={{ color: colors.primaryDeep }}
                      >
                        {state.bankName}
                      </AppText>
                    </View>
                  </Animated.View>
                )}

                <FormikButton
                  contStyle={styles.submitBtn}
                  title={isVerified ? "Withdraw" : "Verify Account"}
                  type="accent"
                />
              </View>
            </Formik>
          </Animated.View>
        )}

        {isSuccess && (
          <Animated.View entering={enterAnimOther} style={styles.success}>
            <LottieAnimator
              name="success"
              style={{ width: width * 0.62, height: height * 0.3 }}
            />
            <AppText
              fontWeight="black"
              size={"xxlarge"}
              style={styles.successTitle}
            >
              {headerTxt}
            </AppText>
            <AppText fontWeight="medium" style={styles.successText}>
              {successTxt}
            </AppText>
          </Animated.View>
        )}

        {!editable && isPending && (
          <Animated.View entering={FadeIn.delay(200)} style={styles.minNotice}>
            <View style={styles.minNoticeIconWrap}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={22}
                color={colors.warningDark}
              />
            </View>
            <View style={styles.minNoticeBody}>
              <AppText
                fontWeight="black"
                size="large"
                style={styles.minNoticeTitle}
              >
                Almost there
              </AppText>
              <AppText
                fontWeight="medium"
                size="medium"
                style={styles.minNoticeDesc}
              >
                {type === "transfer"
                  ? `Bank transfers need at least `
                  : type === "subscription"
                    ? `Subscription renewals need at least `
                    : `Airtime & data need at least `}
                <AppText fontWeight="black" style={styles.minNoticeAmount}>
                  {getCurrencyAmount(minRequired)}
                </AppText>
                {` in your wallet. You have `}
                <AppText fontWeight="black" style={styles.minNoticeAmount}>
                  {shownBalance.format}
                </AppText>
                {`.`}
              </AppText>
              <View style={styles.minNoticeProgress}>
                <View
                  style={[
                    styles.minNoticeBar,
                    {
                      width: `${Math.min(
                        100,
                        (Number(shownBalance.amount) / minRequired) * 100,
                      )}%`,
                    },
                  ]}
                />
              </View>
              <AppText
                fontWeight="medium"
                size="small"
                style={styles.minNoticeHint}
              >
                Earn more GT by completing quizzes and inviting friends.
              </AppText>
            </View>
          </Animated.View>
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
            title={isSuccess ? "Close" : "Cancel"}
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
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <PromptModal prompt={prompt} setPrompt={setPrompt} />
      </View>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// History
//
// Every WalletTransaction is normalised by `describeTransaction` BEFORE it is
// rendered, so a missing metadata field can never show up as "NaN GT" or
// "+undefined days" — anything that isn't a real number is simply not shown.
// ─────────────────────────────────────────────────────────────────────────────

/** First value that is a real, finite number — otherwise null. */
const toNum = (...vals) => {
  for (const v of vals) {
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

const toTitle = (s) =>
  String(s || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const safeDate = (value, format = "fullDate") => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return dateFormatter(value, format);
  } catch {
    return null;
  }
};

// tone → colours (border / icon badge / amount text)
const HISTORY_TONES = {
  accent: {
    border: colors.accentLighter,
    icon: colors.accentLight,
    badge: colors.accentDeeper,
    text: colors.accentDeeper,
  },
  gold: {
    border: colors.warning + "66",
    icon: "#fff",
    badge: colors.warning,
    text: colors.warningDark,
  },
  green: {
    border: colors.greenLighter,
    icon: colors.greenLight,
    badge: colors.green,
    text: colors.greenDark,
  },
  blue: {
    border: colors.primaryLighter,
    icon: colors.primaryLighter,
    badge: colors.primary,
    text: colors.primary,
  },
  neutral: {
    border: colors.lightly,
    icon: "#fff",
    badge: colors.medium,
    text: colors.medium,
  },
  red: {
    border: "#D32F2F55",
    icon: "#fff",
    badge: "#D32F2F",
    text: "#D32F2F",
  },
};

const HISTORY_KINDS = {
  renewal: { title: "Subscription Renewal", icon: "autorenew", tone: "accent" },
  prize: { title: "Competition Prize", icon: "trophy", tone: "gold" },
  withdrawal: {
    title: "Withdrawal",
    icon: "bank-transfer-out",
    tone: "green",
  },
  airtime: { title: "Airtime Purchase", icon: "cellphone", tone: "green" },
  data: { title: "Data Bundle", icon: "wifi", tone: "green" },
  refund: { title: "Refund", icon: "cash-refund", tone: "blue" },
  other: { title: "Transaction", icon: "swap-horizontal", tone: "neutral" },
};

const HISTORY_FILTERS = [
  { label: "All", color: colors.primary, kinds: null },
  { label: "Renewals", color: colors.accentDeeper, kinds: ["renewal"] },
  { label: "Prizes", color: colors.warning, kinds: ["prize"] },
  {
    label: "Withdrawals",
    color: colors.greenDark,
    kinds: ["withdrawal", "airtime", "data"],
  },
];

const STATUS_STYLES = {
  pending: { label: "Pending", color: colors.warningDark },
  processing: { label: "Processing", color: colors.warningDark },
  failed: { label: "Failed", color: "#D32F2F" },
  reversed: { label: "Reversed", color: "#D32F2F" },
};

/** Turn a raw WalletTransaction into everything the history card needs. */
const describeTransaction = (tx) => {
  const meta = tx?.metadata ?? {};
  const category = String(tx?.category || "").toLowerCase();
  const payout = String(meta?.payoutType || "").toLowerCase();

  const cash = toNum(tx?.amount);
  const days = toNum(meta.days);
  const spent = toNum(
    meta.pointsSpent,
    meta.pointsConverted,
    meta.pointsToConvert,
    meta.points,
  );
  const fromSub = toNum(meta.fromSubscriptionPoints) ?? 0;
  const fromGT = toNum(meta.fromPoints);

  // ── What kind of transaction is this? ───────────────────────────────────
  let kind = "other";
  if (category === "adjustment" && meta.pointsType === "subscription") {
    kind = "prize";
  } else if (category.includes("subscription") || (days !== null && days > 0)) {
    kind = "renewal";
  } else if (category.includes("airtime") || payout.includes("airtime")) {
    kind = "airtime";
  } else if (category.includes("data") || payout.includes("data")) {
    kind = "data";
  } else if (
    category.includes("payout") ||
    category.includes("withdraw") ||
    payout
  ) {
    kind = "withdrawal";
  } else if (category.includes("refund")) {
    kind = "refund";
  }

  const base = HISTORY_KINDS[kind];
  const title = kind === "other" && category ? toTitle(category) : base.title;

  // ── Amount line (only ever built from real numbers) ─────────────────────
  let amountText = null;
  if (kind === "prize" || kind === "other") {
    if (cash !== null && cash > 0) {
      amountText = `+${cash.toLocaleString()} sub pts`;
    }
  } else if (kind === "renewal") {
    const total = spent ?? (fromGT ?? 0) + fromSub;
    if (total > 0) {
      amountText =
        fromSub > 0 && !(fromGT > 0)
          ? `-${fromSub.toLocaleString()} sub pts`
          : `-${formatPoints(total)}`;
    } else if (cash !== null && cash > 0) {
      amountText = getCurrencyAmount(cash);
    }
  } else if (cash !== null && cash > 0) {
    amountText = `${kind === "refund" ? "+" : ""}${getCurrencyAmount(cash)}`;
  } else if (spent !== null && spent > 0) {
    amountText = `-${formatPoints(spent)}`;
  }

  // ── Right-hand headline ─────────────────────────────────────────────────
  let detail = null;
  if (kind === "renewal" && days !== null && days > 0) {
    detail = `+${days} day${days === 1 ? "" : "s"}`;
  } else if (kind === "prize") {
    detail = "Sub points";
  } else if (kind === "withdrawal" && payout) {
    detail = toTitle(payout);
  }

  // ── Extra lines under the description ───────────────────────────────────
  const lines = [];

  if (kind === "renewal") {
    if (fromSub > 0) {
      lines.push(
        fromGT > 0
          ? `Paid: ${formatPoints(fromGT)} + ${fromSub.toLocaleString()} sub pts`
          : `Paid with ${fromSub.toLocaleString()} sub pts`,
      );
    }
    const until = safeDate(meta.newExpiry);
    if (until) lines.push(`Valid until ${until}`);
  }

  if (kind === "prize") {
    const place = toNum(meta.place);
    if (place !== null) lines.push(`Finished #${place}`);
    if (meta.month && meta.year) {
      lines.push(`${meta.month}/${meta.year} tournament`);
    }
  }

  if (["withdrawal", "airtime", "data"].includes(kind)) {
    if (meta.network) lines.push(`Network: ${String(meta.network)}`);
    if (meta.phoneNumber) lines.push(`To: ${String(meta.phoneNumber)}`);
    if (meta.bundleName) lines.push(String(meta.bundleName));
    if (kind === "withdrawal" && spent !== null && spent > 0) {
      lines.push(`Converted ${formatPoints(spent)}`);
    }
  }

  const description =
    tx?.description && tx.description !== title ? tx.description : null;

  const status = String(tx?.status || "").toLowerCase();

  return {
    kind,
    title,
    icon: base.icon,
    tone: HISTORY_TONES[base.tone],
    amountText,
    detail,
    description,
    lines,
    status: STATUS_STYLES[status] ?? null,
    reference: meta.flutterwaveReference || tx?.reference || null,
    date: safeDate(tx?.createdAt),
    fullDate: safeDate(tx?.createdAt, "fullDate"),
    ts: tx?.createdAt ?? null,
    attempt: null,
  };
};

const ATTEMPT_KIND = {
  subscription: "renewal",
  withdrawal: "withdrawal",
  airtime: "airtime",
  data: "data",
};
const ATTEMPT_TONE = {
  ok: "green",
  warn: "gold",
  bad: "red",
  neutral: "neutral",
};
const ATTEMPT_COLOR = {
  ok: colors.greenDark,
  warn: colors.warningDark,
  bad: "#D32F2F",
  neutral: colors.medium,
};

/** A payment / payout attempt (from the pending endpoint) shaped like a history item. */
const describeAttempt = (a) => {
  const kind = ATTEMPT_KIND[a?.kind] ?? "other";
  const base = HISTORY_KINDS[kind];
  const amount = toNum(a?.amount);
  return {
    kind,
    title: a.title,
    icon: base.icon,
    tone: HISTORY_TONES[ATTEMPT_TONE[a.tone] ?? base.tone],
    amountText:
      amount !== null && amount > 0
        ? `₦${amount.toLocaleString("en-NG")}`
        : null,
    detail: null,
    description: a.description || null,
    lines: [],
    status: {
      label: a.statusLabel,
      color: ATTEMPT_COLOR[a.tone] ?? colors.medium,
    },
    reference: a.reference || null,
    date: safeDate(a.createdAt),
    fullDate: safeDate(a.createdAt, "fullDate"),
    ts: a.createdAt ?? null,
    attempt: a,
  };
};

/** Full details of ONE history item (transaction or attempt) + its actions. */
const HistoryDetailModal = ({ view, onClose, onResolved, refetchPending }) => {
  const { busy, notes, act, askDismiss, promptEl } = useAttemptActions({
    onResolved,
    refetch: refetchPending,
  });
  if (!view) return null;
  const { tone, attempt } = view;

  const Row = ({ label, children }) =>
    children ? (
      <View style={styles.dRow}>
        <AppText size={11} fontWeight="bold" style={{ color: colors.medium }}>
          {label}
        </AppText>
        <AppText size={13} fontWeight="black" selectable style={styles.dValue}>
          {children}
        </AppText>
      </View>
    ) : null;

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={styles.dBackdrop} onPress={onClose} />
      <View style={styles.dSheet}>
        <View style={styles.dGrab} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.dHead}>
            <MaterialCommunityIcons
              name={view.icon}
              color={tone.icon}
              size={22}
              style={{
                backgroundColor: tone.badge,
                borderRadius: 50,
                padding: 10,
              }}
            />
            <View style={{ flex: 1 }}>
              <AppText
                fontWeight="black"
                size={16}
                style={{ color: colors.primaryDeep }}
              >
                {view.title}
              </AppText>
              {view.status ? (
                <AppText
                  fontWeight="bold"
                  size={12}
                  style={{ color: view.status.color, marginTop: 2 }}
                >
                  {view.status.label}
                </AppText>
              ) : null}
            </View>
          </View>

          {view.amountText ? (
            <AppText
              fontWeight="heavy"
              size={"xlarge"}
              style={{ color: tone.text, marginTop: 14 }}
            >
              {view.amountText}
            </AppText>
          ) : null}
          {view.detail ? (
            <AppText
              fontWeight="bold"
              size={13}
              style={{ color: colors.medium }}
            >
              {view.detail}
            </AppText>
          ) : null}

          {view.description ? (
            <AppText
              fontWeight="medium"
              size={13}
              style={{ color: colors.medium, marginTop: 12, lineHeight: 19 }}
            >
              {view.description}
            </AppText>
          ) : null}

          {Boolean(attempt && notes[attempt.id]) && (
            <AppText
              fontWeight="bold"
              size={12}
              style={{ color: colors.primaryDeep, marginTop: 10 }}
            >
              {notes[attempt.id]}
            </AppText>
          )}

          <View style={styles.dBox}>
            {view.lines.map((l, i) => (
              <AppText
                key={i}
                size={12}
                style={{ color: colors.medium, marginBottom: 4 }}
              >
                {l}
              </AppText>
            ))}
            {Row({ label: "Date", children: view.fullDate })}
            {Row({ label: "Reference", children: view.reference })}
          </View>

          {attempt ? (
            <AttemptButtons
              item={attempt}
              busy={busy}
              act={act}
              askDismiss={askDismiss}
            />
          ) : null}

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.dClose,
              pressed && { opacity: 0.7 },
            ]}
          >
            <AppText
              fontWeight="black"
              size={13}
              style={{ color: colors.primaryDeep }}
            >
              Close
            </AppText>
          </Pressable>
        </ScrollView>
        {promptEl}
      </View>
    </Modal>
  );
};

const SubHistory = ({ view, onPress }) => {
  if (!view) return null;
  const { tone } = view;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.subHistory,
        { borderWidth: 2, borderColor: tone.border },
        pressed && { opacity: 0.75 },
      ]}
    >
      <View style={styles.subHistoryIcon}>
        <MaterialCommunityIcons
          name={view.icon}
          color={tone.icon}
          size={15}
          style={{
            backgroundColor: tone.badge,
            alignSelf: "center",
            borderRadius: 50,
            padding: 5,
            boxShadow: `2px 8px 12px ${colors.primary}25`,
          }}
        />
      </View>
      <View style={styles.subHistoryContent}>
        <AppText
          fontWeight="black"
          size={"large"}
          style={{ color: colors.medium }}
        >
          {view.title}
        </AppText>
        {view.description ? (
          <AppText
            fontWeight="medium"
            size={"medium"}
            style={{ color: colors.medium }}
          >
            {view.description}
          </AppText>
        ) : null}
        {view.lines.map((line, i) => (
          <AppText
            key={i}
            size={"small"}
            style={{ color: colors.medium, marginTop: 2 }}
          >
            {line}
          </AppText>
        ))}
        {view.amountText ? (
          <AppText
            style={{ marginTop: 4, color: tone.text }}
            fontWeight="heavy"
            size={"xlarge"}
          >
            {view.amountText}
          </AppText>
        ) : null}
      </View>
      <View style={styles.subHistoryDetail}>
        {view.detail ? (
          <AppText fontWeight="bold" size={"small"}>
            {" "}
            {view.detail}{" "}
          </AppText>
        ) : null}
        {view.status ? (
          <AppText
            fontWeight="bold"
            size={"small"}
            style={{ color: view.status.color, marginTop: 4 }}
          >
            {view.status.label}
          </AppText>
        ) : null}
        {view.reference ? (
          <AppText
            numberOfLines={1}
            style={{ marginTop: 6, maxWidth: width * 0.2 }}
            size={"small"}
          >
            <AppText fontWeight="bold">ID: </AppText>
            {view.reference}
          </AppText>
        ) : null}
        {view.date ? (
          <AppText style={{ marginTop: 10 }} fontWeight="thin" size={"small"}>
            {view.date}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
};

const ActionTile = ({ icon, title, face, lip, onPress, index = 0 }) => {
  const sink = useSharedValue(0);
  const motion = useAnimatedStyle(() => ({
    transform: [{ translateY: sink.value * 3 }],
  }));

  return (
    <Animated.View entering={enterSpring(180 + index * 80)}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          sink.value = withTiming(1, { duration: 60 });
        }}
        onPressOut={() => {
          sink.value = withSpring(0, PRESS_SPRING);
        }}
      >
        <Animated.View
          style={[
            styles.action,
            { backgroundColor: face, borderColor: lip },
            motion,
          ]}
        >
          <MaterialCommunityIcons name={icon} size={18} color={colors.white} />
          <AppText fontWeight="black" size={13} style={styles.actionText}>
            {title}
          </AppText>
        </Animated.View>
      </Pressable>
    </Animated.View>
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

  const [popper, setPopper] = useState({ vis: false });
  const [refreshing, setRefreshing] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("All");

  const lottieRef = useRef(null);
  const history = data?.data;
  const { data: pend, refetch: refetchPending } = useFetchPendingQuery(
    undefined,
    { refetchOnMountOrArgChange: true },
  );
  const [selectedKey, setSelectedKey] = useState(null);

  const historyItems = useMemo(() => {
    const txs = history?.transactions ?? [];
    const seen = new Set();
    txs.forEach((tx) =>
      [
        tx?.reference,
        tx?.metadata?.flutterwaveReference,
        tx?.metadata?.txRef,
        tx?.metadata?.tx_ref,
      ]
        .filter(Boolean)
        .forEach((r) => seen.add(String(r))),
    );
    const fromTx = txs.map((tx) => ({
      key: String(tx?._id ?? tx?.reference),
      view: describeTransaction(tx),
    }));
    // finished attempts that the ledger doesn't already show
    const fromAttempts = (pend?.data?.recent ?? [])
      .filter((a) => !seen.has(String(a.reference)))
      .map((a) => ({
        key: `att-${a.entity}-${a.id}`,
        view: describeAttempt(a),
      }));
    const all = [...fromTx, ...fromAttempts].sort(
      (x, y) => new Date(y.view.ts || 0) - new Date(x.view.ts || 0),
    );
    const active = HISTORY_FILTERS.find((f) => f.label === historyFilter);
    if (!active?.kinds) return all;
    return all.filter((item) => active.kinds.includes(item.view.kind));
  }, [history, pend, historyFilter]);

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

    router.push({
      pathname: "/(protected)/subscribe",
      params: { type: isSchool ? "school" : "student", schoolId: school?._id },
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

  const hasSchool = Boolean(school?.name);

  const planLabel = isSchool
    ? isActive
      ? "Active"
      : "Inactive"
    : isActive
      ? "Premium"
      : "Freemium";

  const stats = isSchool
    ? [
        { label: "Students", value: String(school?.students?.length ?? 0) },
        { label: "Expires", value: safeDate(expiry) ?? "-" },
      ]
    : [
        { label: "Cash", value: calculatePointsAmount(user.points).format },
        {
          label: "Sub points",
          value: (user?.subscriptionPoints || 0).toLocaleString(),
        },
        { label: "Total earned", value: formatPoints(user.totalPoints) },
      ];

  const walletCard = (
    <Animated.View entering={enterSpring()} style={styles.cardWrap}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDeeper]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.decorOne} />
        <View style={styles.decorTwo} />

        <View style={styles.cardHeader}>
          <View style={styles.cardBrand}>
            <View style={styles.brandIcon}>
              <MaterialCommunityIcons
                name={isSchool ? "school" : "wallet"}
                size={16}
                color={colors.white}
              />
            </View>
            <AppText style={styles.brandText} size={14} fontWeight="bold">
              {isSchool ? "School Account" : "Guru Wallet"}
            </AppText>
          </View>
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isActive ? "#5BE49B" : colors.warning },
              ]}
            />
            <AppText
              fontWeight="bold"
              size={11}
              style={{ color: colors.white }}
            >
              {planLabel}
            </AppText>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardLeft}>
            <AppText style={styles.cardKicker} size={11} fontWeight="medium">
              {isSchool ? "SUBSCRIPTION" : "AVAILABLE POINTS"}
            </AppText>
            <AppText
              style={styles.cardBig}
              size={32}
              fontWeight="black"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {isSchool
                ? `${Math.max(0, terms)} TERM${terms > 1 ? "S" : ""}`
                : formatPoints(user?.points)}
            </AppText>
          </View>

          <View style={styles.progressContainer}>
            <LottieAnimator
              name="circle_progress"
              speed={1.5}
              animRef={lottieRef}
              autoPlay={false}
              size={PROGRESS_SIZE}
              loop={false}
            />
            <View style={styles.progressOverlay}>
              <AppText
                size="xlarge"
                style={{ color: colors.white, textAlign: "center" }}
                fontWeight="black"
              >
                {isActive ? sub : 0}
              </AppText>
              <AppText size={10} style={styles.daysLeft} fontWeight="bold">
                days left
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.statStrip}>
          {stats.map((stat, i) => (
            <View
              key={stat.label}
              style={[styles.stat, i > 0 && styles.statDivider]}
            >
              <AppText style={styles.tileLabel} size={10} fontWeight="medium">
                {stat.label.toUpperCase()}
              </AppText>
              <AppText
                style={styles.tileValue}
                size={14}
                fontWeight="heavy"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {stat.value}
              </AppText>
            </View>
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const header = (
    <>
      {walletCard}

      <View style={styles.actions}>
        <ActionTile
          icon="crown"
          title="Subscribe"
          face={colors.accent}
          lip={colors.accentDeeper}
          onPress={openSubsciptionModal}
        />
        {!isSchool && (
          <ActionTile
            index={1}
            icon="cash-fast"
            title="Withdraw"
            face={colors.primary}
            lip={colors.primaryDeeper}
            onPress={handleWithdrawal}
          />
        )}
      </View>

      <PendingTransactions
        section="pending"
        onResolved={(items) => {
          fetchUser();
          refetch();
          const first = items[0];
          if (first?.message) {
            setPopper({
              vis: true,
              type: "info",
              timer: 3000,
              msg: first.message,
            });
          }
        }}
      />

      <View style={styles.historyHead}>
        <AppText fontWeight="black" size="xlarge">
          History
        </AppText>
        <AppText fontWeight="medium" size={12} style={{ color: colors.medium }}>
          {historyItems.length
            ? `${historyItems.length} record${historyItems.length === 1 ? "" : "s"}`
            : ""}
        </AppText>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {HISTORY_FILTERS.map((f) => {
          const on = f.label === historyFilter;
          return (
            <Pressable
              key={f.label}
              onPress={() => setHistoryFilter(f.label)}
              style={[
                styles.filterPill,
                {
                  backgroundColor: on ? f.color : f.color + "1A",
                  borderColor: on ? f.color : f.color + "55",
                },
              ]}
            >
              <AppText
                fontWeight="black"
                size={12}
                numberOfLines={1}
                style={{ color: on ? colors.white : f.color }}
              >
                {f.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Subscriptions" />

      {hasSchool ? (
        <FlatList
          data={historyItems}
          keyExtractor={(item) => item.key}
          refreshControl={getRefresher({ refreshing, onRefresh })}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: PAD_BOTTOM }}
          ListHeaderComponent={header}
          ListEmptyComponent={() => (
            <ListEmpty
              vis={!isLoading}
              message={
                historyFilter === "All"
                  ? "No history data"
                  : `No ${historyFilter.toLowerCase()} yet`
              }
            />
          )}
          renderItem={({ item }) => (
            <SubHistory
              view={item.view}
              onPress={() => setSelectedKey(item.key)}
            />
          )}
        />
      ) : (
        <ScrollView
          refreshControl={getRefresher({ refreshing, onRefresh })}
          contentContainerStyle={styles.noSchool}
        >
          <LottieAnimator
            name="person_float"
            style={{ width: width * 0.65, height: width * 0.65 }}
            visible
          />
          <AppText
            fontWeight="black"
            size="xlarge"
            style={styles.noSchoolTitle}
          >
            Your wallet is waiting
          </AppText>
          <AppText fontWeight="medium" style={styles.noSchoolText}>
            Create or join a school to activate your wallet, subscribe to
            premium, and gain full access to Guru’s features.
          </AppText>
          <View style={styles.noSchoolHint}>
            <MaterialCommunityIcons
              name="school"
              size={18}
              color={colors.primaryDeep}
            />
            <AppText fontWeight="bold" style={{ color: colors.primaryDeep }}>
              Head to the School tab to get started
            </AppText>
          </View>
        </ScrollView>
      )}

      <HistoryDetailModal
        key={selectedKey ?? "none"}
        view={
          selectedKey
            ? historyItems.find((i) => i.key === selectedKey)?.view
            : null
        }
        onClose={() => setSelectedKey(null)}
        refetchPending={refetchPending}
        onResolved={(items) => {
          fetchUser();
          refetch();
          const first = items[0];
          if (first?.message) {
            setPopper({
              vis: true,
              type: "info",
              timer: 3000,
              msg: first.message,
            });
          }
        }}
      />
      <PopMessage popData={popper} setPopData={setPopper} />
      <StatusBar style="dark" />
    </View>
  );
};

export default SubscriptionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* withdraw flow */
  withdraw: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  block: {
    marginTop: 4,
  },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
    marginTop: 14,
    marginBottom: 8,
    marginLeft: 10,
  },
  sectionLabelText: {
    color: colors.medium,
    letterSpacing: 1,
  },
  steps: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: 22,
    marginTop: 6,
    marginBottom: 16,
  },
  stepItem: {
    alignItems: "center",
    rowGap: 4,
  },
  stepLine: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginTop: 12,
    marginHorizontal: 6,
    backgroundColor: colors.lightly,
  },
  stepLineOn: {
    backgroundColor: colors.primary,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.lightly,
  },
  stepDotOn: {
    backgroundColor: colors.primary,
  },
  stepDotNow: {
    borderWidth: 3,
    borderColor: colors.primary + "40",
    backgroundColor: colors.primaryDeep,
  },

  balanceWrap: {
    marginHorizontal: 2,
    borderRadius: 26,
    paddingBottom: 6,
    backgroundColor: colors.primaryDeeper,
  },
  balanceCard: {
    borderRadius: 26,
    padding: 20,
    overflow: "hidden",
  },
  blobA: {
    position: "absolute",
    top: -50,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  blobB: {
    position: "absolute",
    bottom: -40,
    left: 60,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  balanceTop: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
  },
  balanceIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  balanceLabel: {
    color: colors.primaryLighter,
    letterSpacing: 1,
  },
  balanceValue: {
    color: colors.white,
    marginTop: 8,
  },
  balanceChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  balanceChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  balanceChipLabel: {
    color: colors.primaryLighter,
  },
  balanceChipValue: {
    color: colors.white,
  },

  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginHorizontal: 10,
    marginBottom: 12,
  },
  quickChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.primary + "55",
    backgroundColor: colors.primary + "14",
  },
  quickChipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDeep,
  },
  cost: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 12,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginBottom: 8,
    borderRadius: 18,
    backgroundColor: colors.primary + "14",
  },
  costIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "22",
  },
  costLabel: {
    color: colors.medium,
    letterSpacing: 0.8,
  },
  costValue: {
    color: colors.primaryDeep,
  },
  hintBox: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    marginHorizontal: 10,
    marginBottom: 6,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.primary + "14",
  },
  hintText: {
    flex: 1,
    color: colors.primaryDeep,
  },
  submitBtn: {
    marginTop: 18,
    marginHorizontal: width * 0.1,
  },

  sendingCard: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 14,
    marginHorizontal: 2,
    padding: 16,
    borderRadius: 22,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.primary + "55",
    backgroundColor: colors.primary + "14",
  },
  sendingIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  verified: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 12,
    marginHorizontal: 10,
    marginBottom: 6,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.primary + "14",
  },
  verifiedIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },

  success: {
    alignItems: "center",
    marginBottom: 15,
  },
  successTitle: {
    color: colors.accentDeep,
    textAlign: "center",
    marginHorizontal: 20,
  },
  successText: {
    textAlign: "center",
    marginHorizontal: 30,
    marginTop: 8,
    marginBottom: 25,
    color: colors.medium,
  },

  minNotice: {
    flexDirection: "row",
    marginHorizontal: 2,
    marginVertical: 16,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.warning + "14",
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.warning + "88",
    alignItems: "flex-start",
  },
  minNoticeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.warning + "33",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  minNoticeBody: {
    flex: 1,
  },
  minNoticeTitle: {
    color: colors.warningDark,
    marginBottom: 4,
  },
  minNoticeDesc: {
    color: colors.medium,
    lineHeight: 20,
    marginBottom: 12,
  },
  minNoticeAmount: {
    color: colors.warningDark,
  },
  minNoticeProgress: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.warning + "33",
    marginBottom: 8,
    overflow: "hidden",
  },
  minNoticeBar: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: colors.warning,
  },
  minNoticeHint: {
    color: colors.medium,
    opacity: 0.8,
  },
  withdrawBtns: {
    marginHorizontal: width * 0.1,
  },

  /* wallet screen */
  cardWrap: {
    width: width * 0.95,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 24,
    paddingBottom: 5,
    backgroundColor: colors.primaryDeeper,
  },
  card: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    overflow: "hidden",
  },
  decorOne: {
    position: "absolute",
    top: -50,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  decorTwo: {
    position: "absolute",
    bottom: -45,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardBrand: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  brandText: {
    color: colors.white,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    columnGap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  cardLeft: {
    flex: 1,
  },
  cardKicker: {
    color: colors.primaryLighter,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  cardBig: {
    color: colors.white,
  },
  progressContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  daysLeft: {
    color: colors.primaryLighter,
    textAlign: "center",
    marginTop: -4,
  },
  statStrip: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  stat: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 6,
  },
  statDivider: {
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.2)",
  },
  tileLabel: {
    color: colors.primaryLighter,
    letterSpacing: 0.6,
  },
  tileValue: {
    color: colors.white,
    marginTop: 2,
  },

  actions: {
    flexDirection: "row",
    justifyContent: "center",
    columnGap: 12,
    marginBottom: 6,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  actionText: {
    color: colors.white,
    letterSpacing: 0.3,
  },

  dBackdrop: { flex: 1, backgroundColor: "#00000066" },
  dSheet: {
    maxHeight: "80%",
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 28,
  },
  dGrab: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.lightly,
    marginBottom: 14,
  },
  dHead: { flexDirection: "row", alignItems: "center", columnGap: 12 },
  dBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.lightly + "88",
  },
  dRow: { marginTop: 6 },
  dValue: { color: colors.primaryDeep, marginTop: 2 },
  dClose: {
    alignSelf: "stretch",
    alignItems: "center",
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.primary + "44",
  },
  filterRow: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    columnGap: 8,
    alignItems: "center",
  },
  filterPill: {
    flexShrink: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  historyHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginHorizontal: 18,
    marginTop: 8,
    marginBottom: 2,
  },
  subHistory: {
    flexDirection: "row",
    width: width * 0.92,
    padding: 12,
    borderRadius: 10,
    boxShadow: `2px 8px 12px ${colors.primary}25`,
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

  noSchool: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: PAD_BOTTOM,
  },
  noSchoolTitle: {
    marginTop: 10,
    textAlign: "center",
  },
  noSchoolText: {
    width: "85%",
    marginTop: 8,
    textAlign: "center",
    color: colors.medium,
  },
  noSchoolHint: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: colors.primary + "14",
  },
});
