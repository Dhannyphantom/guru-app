import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { WithdrawModal } from "./SubscriptionScreen";
import AppText from "../components/AppText";
import AppHeader from "../components/AppHeader";
import PopMessage from "../components/PopMessage";
import colors from "../helpers/colors";

const GAP = 16;
const SIDE = 20;

const OPTIONS = {
  transfer: {
    title: "Bank Transfer",
    kicker: "Cash out",
    hint: "Send your earnings to any bank account",
    icon: "business",
    face: colors.primary,
    lip: colors.primaryDeeper,
  },
  airtime: {
    title: "Airtime",
    kicker: "Recharge",
    hint: "Top up any line",
    icon: "call",
    face: colors.warning,
    lip: colors.warningDark,
  },
  data: {
    title: "Data",
    kicker: "Buy",
    hint: "Stay online for less",
    icon: "wifi",
    face: colors.heart,
    lip: colors.heartDark,
  },
  subscription: {
    title: "Subscription",
    kicker: "Renew",
    hint: "Keep your plan running without paying extra",
    icon: "ribbon",
    face: colors.accent,
    lip: colors.accentDeeper,
  },
};

const HEADERS = {
  transfer: "Bank Transfer",
  subscription: "Renew Subscription",
  airtime: "Recharge Airtime",
  data: "Buy Data",
};

const ActionCard = ({ id, index, wide = false, width, onPress }) => {
  const option = OPTIONS[id];
  const sink = useSharedValue(0);

  const faceMotion = useAnimatedStyle(() => ({
    transform: [
      { translateY: sink.value * 5 },
      { scale: 1 - sink.value * 0.015 },
    ],
  }));

  return (
    <Animated.View
      entering={FadeInDown.springify()
        .damping(14)
        .stiffness(140)
        .delay(index * 110)}
      style={{ width }}
    >
      <Pressable
        onPress={() => onPress(id)}
        onPressIn={() => {
          sink.value = withTiming(1, { duration: 80 });
        }}
        onPressOut={() => {
          sink.value = withSpring(0, {
            damping: 14,
            stiffness: 320,
            mass: 0.8,
          });
        }}
        accessibilityRole="button"
        accessibilityLabel={`${option.kicker} ${option.title}`}
      >
        <Animated.View
          style={[
            styles.card,
            wide ? styles.cardWide : styles.cardTile,
            { backgroundColor: option.face, borderColor: option.lip },
            faceMotion,
          ]}
        >
          <View style={styles.blobBig} />
          <View style={styles.blobSmall} />

          <View style={styles.iconBubble}>
            <Ionicons
              name={option.icon}
              size={wide ? 28 : 24}
              color={colors.white}
            />
          </View>

          <View style={wide ? styles.wideText : styles.tileText}>
            <AppText fontWeight="bold" size={12} style={styles.kicker}>
              {option.kicker.toUpperCase()}
            </AppText>
            <AppText
              fontWeight="black"
              size={wide ? "xlarge" : "large"}
              style={styles.cardTitle}
            >
              {option.title}
            </AppText>
            <AppText fontWeight="medium" size={12} style={styles.cardHint}>
              {option.hint}
            </AppText>
          </View>

          {wide && (
            <View style={styles.goBubble}>
              <Ionicons name="arrow-forward" size={18} color={option.lip} />
            </View>
          )}
        </Animated.View>
      </Pressable>
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

  const { width } = useWindowDimensions();
  const router = useRouter();

  const headerText = type ? (HEADERS[type] ?? "Back") : "Withdraw";
  const fullWidth = Math.min(width, 700) - SIDE * 2;
  const tileWidth = (fullWidth - GAP) / 2;

  const handleNavigation = () => {
    if (!type) {
      router.back();
      return;
    }
    if (state.status === "details") {
      setState((prev) => ({ ...prev, status: "pending" }));
    } else {
      setType(null);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title={headerText} onPress={handleNavigation} />

      {!type ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.flex}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scroll,
              { width: fullWidth + SIDE * 2 },
            ]}
          >
            <View style={styles.intro}>
              <AppText fontWeight="black" size="xxlarge">
                Where to next?
              </AppText>
              <AppText fontWeight="medium" style={styles.introSub}>
                Pick how you want to use your earnings.
              </AppText>
            </View>

            <View style={styles.grid}>
              <ActionCard
                id="transfer"
                index={0}
                wide
                width={fullWidth}
                onPress={setType}
              />

              <View style={styles.row}>
                <ActionCard
                  id="airtime"
                  index={1}
                  width={tileWidth}
                  onPress={setType}
                />
                <ActionCard
                  id="data"
                  index={2}
                  width={tileWidth}
                  onPress={setType}
                />
              </View>

              <ActionCard
                id="subscription"
                index={3}
                wide
                width={fullWidth}
                onPress={setType}
              />
            </View>
          </ScrollView>
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
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    alignSelf: "center",
    paddingHorizontal: SIDE,
    paddingBottom: 40,
  },
  intro: {
    marginTop: 24,
    marginBottom: 22,
  },
  introSub: {
    color: colors.medium,
    marginTop: 4,
  },
  grid: {
    rowGap: GAP,
  },
  row: {
    flexDirection: "row",
    columnGap: GAP,
  },
  card: {
    overflow: "hidden",
    borderWidth: 3,
    borderBottomWidth: 8,
    borderRadius: 26,
  },
  cardWide: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 16,
    padding: 20,
    minHeight: 120,
  },
  cardTile: {
    padding: 18,
    minHeight: 170,
    justifyContent: "space-between",
  },
  iconBubble: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  wideText: {
    flex: 1,
  },
  tileText: {
    marginTop: 14,
  },
  kicker: {
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 1.2,
  },
  cardTitle: {
    color: colors.white,
    marginTop: 1,
  },
  cardHint: {
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },
  goBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  blobBig: {
    position: "absolute",
    right: -34,
    top: -40,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  blobSmall: {
    position: "absolute",
    right: 40,
    bottom: -30,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
});
