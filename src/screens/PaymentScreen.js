import { StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import { WithdrawModal } from "./SubscriptionScreen";
import AnimatedPressable from "../components/AnimatedPressable";
import AppText from "../components/AppText";
import { Dimensions } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import colors from "../helpers/colors";
import AppHeader from "../components/AppHeader";
import { useRouter } from "expo-router";
import { exitingAnim } from "../helpers/dataStore";
import PopMessage from "../components/PopMessage";

const { width, height } = Dimensions.get("screen");

const ViewBox = ({ text, index, onPress, subText, color, bg }) => {
  return (
    <Animated.View
      entering={ZoomIn.springify()
        .mass(10)
        .delay(index * 120)}
    >
      <AnimatedPressable
        onPress={() => onPress?.(subText?.toLowerCase())}
        style={[styles.box, { backgroundColor: color, borderColor: bg }]}
      >
        <AppText style={styles.boxText} fontWeight="bold">
          {text}
        </AppText>
        <AppText style={styles.subText} fontWeight="black" size="xxlarge">
          {subText}
        </AppText>
      </AnimatedPressable>
    </Animated.View>
  );
};

export default function PaymentScreen() {
  const [type, setType] = useState(null);
  const [popper, setPopper] = useState({ vis: false });
  const [state, setState] = useState({
    status: "pending",
    banks: [],
    bankName: "",
  });

  const router = useRouter();
  let headerText;

  switch (type) {
    case null:
      headerText = "Withdraw";
      break;
    case "transfer":
      headerText = "Bank Transfer";
      break;
    case "subscription":
      headerText = "Renew Subscription";
      break;
    case "airtime":
      headerText = "Recharge Airtime";
      break;
    case "data":
      headerText = "Buy Data";
      break;

    default:
      headerText = "Back";
      break;
  }

  const handleNavigation = () => {
    if (type) {
      switch (state.status) {
        case "pending":
          setType(null);
          break;
        case "details":
          setState((prev) => ({ ...prev, status: "pending" }));
          break;

        default:
          headerText = "Back";
          break;
      }
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title={headerText} onPress={() => handleNavigation()} />

      {!type ? (
        <Animated.View entering={FadeIn} exiting={FadeOut}>
          <AppText fontWeight="semibold" style={styles.headerTxt}>
            Choose Withdrawal Type
          </AppText>
          <View style={styles.boxContainer}>
            <ViewBox
              text={"Bank"}
              subText={"TRANSFER"}
              index={1}
              bg={colors.primaryDeeper}
              onPress={(newType) => setType(newType)}
              color={colors.primary}
            />
            <ViewBox
              text={"Renew"}
              subText={"SUBSCRIPTION"}
              index={2}
              bg={colors.accentDeeper}
              onPress={(newType) => setType(newType)}
              color={colors.accent}
            />
            <ViewBox
              bg={colors.warningDark}
              text={"Recharge"}
              subText={"AIRTIME"}
              index={3}
              color={colors.warning}
              onPress={(newType) => setType(newType)}
            />
            <ViewBox
              bg={colors.heartDark}
              text={"Buy"}
              subText={"DATA"}
              index={4}
              color={colors.heart}
              onPress={(newType) => setType(newType)}
            />
          </View>
        </Animated.View>
      ) : (
        <WithdrawModal
          state={state}
          type={type}
          closeModal={() => setType(null)}
          setPopper={setPopper}
          setState={setState}
        />
      )}

      <PopMessage popData={popper} setPopData={setPopper} />
    </View>
  );
}

const styles = StyleSheet.create({
  boxContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    // alignItems: "center",
    gap: 20,
  },
  box: {
    width: width * 0.45,
    minHeight: height * 0.25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderBottomWidth: 8,
    borderRadius: 25,
  },
  boxText: {
    color: colors.white,
  },
  container: {
    flex: 1,
    // backgroundColor: colors.accent,
  },
  headerTxt: {
    textAlign: "center",
    marginBottom: 20,
    marginTop: 25,
    color: colors.medium,
  },
  subText: {
    color: colors.white,
  },
});
