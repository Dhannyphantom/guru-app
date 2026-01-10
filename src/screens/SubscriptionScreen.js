import React, { useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import AppButton, { FormikButton } from "../components/AppButton";
import Screen from "../components/Screen";

import AppModal from "../components/AppModal";
import colors from "../helpers/colors";
import LottieAnimator from "../components/LottieAnimator";
import {
  selectUser,
  useLazyFetchBanksQuery,
  useLazyFetchUserQuery,
  useVerifyAccountMutation,
  useWithdrawFromWalletMutation,
} from "../context/usersSlice";
import AppText from "../components/AppText";
import {
  enterAnimOther,
  exitingAnim,
  subHistories,
} from "../helpers/dataStore";
import {
  calculatePointsAmount,
  dateFormatter,
  formatPoints,
  getCurrencyAmount,
  hasCompletedProfile,
} from "../helpers/helperFunctions";
import FormInput, { FormikInput } from "../components/FormInput";
import Animated from "react-native-reanimated";
import PopMessage from "../components/PopMessage";
import { useSelector } from "react-redux";
import { Formik } from "formik";
import { withdrawInitials, withdrawPointsSchema } from "../helpers/yupSchemas";
import AsyncStorage from "@react-native-async-storage/async-storage";
import getRefresher from "../components/Refresher";
import DisplayPayments from "../components/DisplayPayments";
import { selectSchool } from "../context/schoolSlice";
import { useLocalSearchParams, useRouter } from "expo-router";
import AppHeader from "../components/AppHeader";
// import TabSelector from "../components/TabSelector";

const { width, height } = Dimensions.get("screen");

const PROGRESS_SIZE = width * 0.6;
const maxProgress = 295;

export const WithdrawModal = ({ closeModal, state, setState, setPopper }) => {
  const [withdrawFromWallet, { isLoading, isError, error }] =
    useWithdrawFromWalletMutation();
  const [fetchBanks, { isLoading: bankLoading }] = useLazyFetchBanksQuery();
  const [verifyAcct, { isLoading: isVerifying }] = useVerifyAccountMutation();

  const user = useSelector(selectUser);
  const router = useRouter();

  const [amount, setAmount] = useState("");

  const balance = calculatePointsAmount(user.points);

  // console.log(JSON.stringify(state.banks, null, 2));

  const isPending = state.status === "pending";
  const isSuccess = state.status === "success";
  const isDetails = state.status === "details";
  const isVerified = Boolean(state.bankName);

  const editable = true;
  const profile = hasCompletedProfile(user);
  // const editable = balance.amount >= 500;

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
      console.log(res);
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

  const onChangeAmount = (textVal) => {
    const num = parseInt(textVal, 10);
    if (!isNaN(num) && num <= balance.amount) {
      setAmount(textVal);
    } else if (textVal === "") {
      setAmount("");
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
      } catch (error) {
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
    <View style={styles.withdraw}>
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

          <View style={{ marginTop: 20 }}>
            <FormInput
              keyboardType="numeric"
              placeholder="Enter amount to withdraw"
              editable={editable}
              headerText={"Enter amount(₦):"}
              value={amount}
              onChangeText={onChangeAmount}
            />
            <AppText style={styles.preview} fontWeight="black" size="xxlarge">
              {calculatePointsAmount(amount).pointFormat}
            </AppText>
          </View>
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
            Transaction Initiated Successfully
          </AppText>
          <AppText
            fontWeight="light"
            style={{ textAlign: "center", marginBottom: 25 }}
          >
            Your withdraw transaction is pending. Please wait, you will be
            credited shortly.
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
        {editable && isPending && (
          <AppButton title={"Continue"} onPress={() => onBankFetch(false)} />
        )}
        <AppButton
          title={isSuccess ? "Close" : "Cancel Withdrawal"}
          type={isSuccess ? "accent" : "warn"}
          onPress={closeModal}
        />
      </View>
      <LottieAnimator
        visible={isLoading || bankLoading}
        absolute
        wTransparent
      />
    </View>
  );
};

const SubHistory = ({ item }) => {
  if (!item) return null;
  const isSub = item.title.toLowerCase() === "subscription";
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
          {item.title}
        </AppText>
        <AppText
          style={{
            marginTop: 4,
            color: isSub ? colors.accentDeeper : colors.greenDark,
          }}
          fontWeight="heavy"
          size={"xlarge"}
        >
          {getCurrencyAmount(item.amount)}
        </AppText>
      </View>
      <View style={styles.subHistoryDetail}>
        <AppText fontWeight="bold" size={"small"}>
          {" "}
          {isSub ? item.msg : formatPoints(item.msg)}{" "}
        </AppText>
        <AppText
          style={{ marginTop: 10, color: colors.medium }}
          fontWeight="thin"
          size={"small"}
        >
          {dateFormatter(item.date, "fullDate")}
        </AppText>
      </View>
    </View>
  );
};

const SubscriptionScreen = () => {
  const user = useSelector(selectUser);
  const school = useSelector(selectSchool);

  const searchParams = useLocalSearchParams();

  const params = Boolean(params?.data) ? JSON.parse(searchParams?.data) : {};
  const fromSchool = params?.screen === "School";
  const router = useRouter();

  const { isActive, expiry, current } = user.subscription;
  const [fetchUser] = useLazyFetchUserQuery();

  const [bools, setBools] = useState({
    modal: false,
    uri: null,
    type: "display",
  });
  const [popper, setPopper] = useState({ vis: false });
  const [refreshing, setRefreshing] = useState(false);

  const lottieRef = useRef(null);

  const { sub, total, terms } = dateFormatter(expiry, "sub", { current });
  const isTeacher = user?.accountType === "teacher";
  const isSchool = fromSchool || isTeacher;
  const profile = hasCompletedProfile(user);

  const openSubsciptionModal = async () => {
    if (!profile.bool) {
      return setPopper(profile.pop);
    }

    if (isSchool && Boolean(school)) {
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
    <Screen style={styles.container}>
      <FlatList
        data={["Sub"]}
        refreshControl={getRefresher({ refreshing, onRefresh })}
        renderItem={() => (
          <>
            <LinearGradient
              colors={[colors.primary, colors.primaryDeeper]}
              start={{ x: 0.2, y: 0 }}
              style={styles.card}
            >
              <View style={styles.cardDetails}>
                <View>
                  <AppText
                    style={{ color: colors.light }}
                    size={30}
                    fontWeight="black"
                  >
                    {isSchool
                      ? `${terms} TERM${terms > 1 ? "S" : ""}`
                      : formatPoints(user.points)}
                  </AppText>

                  <AppText
                    style={{ color: colors.primaryLighter }}
                    size={15}
                    fontWeight="black"
                  >
                    {isSchool
                      ? "subscription"
                      : "Total: " + formatPoints(user.totalPoints)}
                  </AppText>
                </View>
                <View>
                  <AppText
                    style={{ color: colors.primaryLighter }}
                    size={15}
                    fontWeight="heavy"
                  >
                    {isSchool ? "Acitve Sudents:" : "Account Balance:"}
                  </AppText>
                  <AppText
                    style={{ color: colors.white }}
                    size={28}
                    fontWeight="black"
                  >
                    {isSchool
                      ? school?.students?.length ?? 0
                      : calculatePointsAmount(user.points).format}
                  </AppText>
                </View>
              </View>
              <View style={styles.circleView}>
                <LottieAnimator
                  name="circle_progress"
                  speed={1.5}
                  animRef={lottieRef}
                  autoPlay={false}
                  loop={false}
                  style={{
                    width: PROGRESS_SIZE,
                    height: PROGRESS_SIZE,
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                  }}
                >
                  <AppText
                    size={"xxlarge"}
                    style={{
                      color: colors.primaryLighter,
                      textAlign: "center",
                    }}
                    fontWeight="black"
                  >
                    {isActive ? sub : 0}
                    {"\n"} days
                  </AppText>
                </View>
              </View>
            </LinearGradient>
            <View style={styles.btns}>
              <AppButton
                type="accent"
                title={"Subscribe"}
                icon={{ name: "wallet", left: true }}
                onPress={openSubsciptionModal}
              />
              {!isSchool && (
                <AppButton
                  title={"Withdraw"}
                  icon={{ name: "cash-remove", left: true }}
                  onPress={handleWithdrawal}
                />
              )}
            </View>

            <View style={styles.history}>
              <AppText fontWeight="bold" size={"xlarge"} style={{ margin: 15 }}>
                History
              </AppText>
              <FlatList
                data={subHistories}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ paddingBottom: height * 0.42 }}
                renderItem={({ item }) => <SubHistory item={item} />}
              />
            </View>

            <AppModal
              visible={bools.modal}
              setVisible={() => setBools({ ...bools, modal: false })}
              Component={() => {
                if (bools.type === "display") {
                  return (
                    <DisplayPayments
                      hideModal={() => setBools({ ...bools, modal: false })}
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
      {/* <LottieAnimator visible={isLoading} absolute wTransparent /> */}
    </Screen>
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
    minHeight: height * 0.2,
    maxHeight: height * 0.22,
    backgroundColor: colors.lightly,
    alignSelf: "center",
    marginVertical: 20,
    borderRadius: 20,
    elevation: 3,
    flexDirection: "row",
    // paddingLeft: 20,
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
    // flex: 0.5,
    justifyContent: "space-around",
    marginVertical: 20,
    // // left: 10,
    // backgroundColor: "red",
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
    // flex: 1,
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
    flex: 0.15,
    justifyContent: "center",
    alignItems: "center",
  },
  subHistoryContent: {
    flex: 0.45,
  },
  subHistoryDetail: {
    flex: 0.4,
    alignItems: "flex-end",
  },
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
    marginTop: 40,
    marginHorizontal: width * 0.1,
  },
});
