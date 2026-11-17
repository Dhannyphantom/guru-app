/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { P } from "./PayTheme";
import { SPRING, enter } from "./PayMotion";
import { Card, PayButton, PayText, formatMoney, useTween } from "./PayUI";
import PayConfetti from "./PayConfetti";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const BADGE = 112;
const HALO = 156;

/** Green badge that pops in, draws its own check mark, and breathes. */
const SuccessBadge = () => {
  const scale = useSharedValue(0);
  const draw = useSharedValue(90);
  const glow = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(150, withSpring(1, SPRING.bounce));
    draw.value = withDelay(
      520,
      withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) }),
    );
    glow.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const badge = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const halo = useAnimatedStyle(() => ({
    opacity: scale.value * (0.35 + 0.25 * glow.value),
    transform: [{ scale: 0.9 + 0.14 * glow.value }],
  }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: draw.value }));

  return (
    <View style={styles.badgeBox}>
      <Animated.View style={[styles.halo, halo]} />
      <Animated.View style={[styles.badge, badge]}>
        <Svg width={BADGE} height={BADGE} style={StyleSheet.absoluteFill}>
          <AnimatedPath
            d="M31 58 L50 77 L84 37"
            stroke="#fff"
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={90}
            animatedProps={checkProps}
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

const Row = ({ label, value, first, mono }) => (
  <View style={[styles.row, !first && styles.rowBorder]}>
    <PayText fontWeight="semibold" size={12.5} style={{ color: P.sub }}>
      {label}
    </PayText>
    <PayText
      fontWeight="bold"
      size={mono ? 11.5 : 13}
      numberOfLines={1}
      style={{ color: P.ink, flex: 1, textAlign: "right", marginLeft: 16 }}
    >
      {value}
    </PayText>
  </View>
);

/**
 * Celebration screen: confetti burst from the badge (tap the badge to fire it
 * again), a counting "+N days" card, and a receipt that slides in row by row.
 */
const PaySuccess = ({
  receipt,
  userName,
  isSchool,
  onDone,
  bottomOffset = 0,
}) => {
  const insets = useSafeAreaInsets();
  const [burst, setBurst] = useState(0);

  const totalDays = Number(receipt?.days) || 0;
  const days = useTween(totalDays, { duration: 1200, initial: 0, delay: 700 });
  const firstName = String(userName ?? "").trim().split(" ")[0];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 110 + (bottomOffset || insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => setBurst((b) => b + 1)} style={styles.stage}>
          <SuccessBadge />
          <PayConfetti key={burst} />
        </Pressable>

        <Animated.View entering={enter(0, 450)} style={styles.center}>
          <PayText fontWeight="black" size={32} style={{ color: P.ink }}>
            You're in! 🎉
          </PayText>
          <PayText
            fontWeight="medium"
            size={14}
            style={styles.subtitle}
          >
            {isSchool
              ? "Your school's subscription is now active."
              : `${firstName ? `Nice one, ${firstName}! ` : ""}Your premium access is now active.`}
          </PayText>
        </Animated.View>

        {totalDays > 0 && (
          <Animated.View entering={enter(1, 450)} style={styles.daysCard}>
            <PayText fontWeight="black" size={52} style={styles.daysNum}>
              {`+${days}`}
            </PayText>
            <PayText fontWeight="heavy" size={14} style={styles.daysLbl}>
              DAYS OF PREMIUM ADDED
            </PayText>
          </Animated.View>
        )}

        <Card index={2} base={450} style={{ width: "100%", marginTop: 6 }}>
          <PayText
            fontWeight="black"
            size={11}
            style={{ color: P.faint, letterSpacing: 1, marginBottom: 2 }}
          >
            RECEIPT
          </PayText>
          {Boolean(receipt?.label) && (
            <Row first label="Plan" value={receipt.label} />
          )}
          <Row
            first={!receipt?.label}
            label="Amount paid"
            value={formatMoney(receipt?.amount)}
          />
          {Boolean(userName) && <Row label="Account" value={userName} />}
          <Row mono label="Reference" value={receipt?.txRef ?? "—"} />
        </Card>
      </ScrollView>

      <Animated.View
        entering={enter(0, 900)}
        style={[
          styles.footer,
          {
            bottom: bottomOffset,
            paddingBottom: bottomOffset > 0 ? 14 : Math.max(insets.bottom, 14),
          },
        ]}
      >
        <PayButton
          title="Start learning"
          icon="rocket"
          variant="gold"
          shine
          onPress={onDone}
        />
      </Animated.View>
    </View>
  );
};

export default PaySuccess;

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { alignItems: "center", paddingHorizontal: 18, paddingTop: 10 },
  stage: {
    width: HALO,
    height: HALO,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 10,
  },
  badgeBox: {
    width: HALO,
    height: HALO,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
    backgroundColor: P.greenLine,
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    backgroundColor: P.green,
    borderBottomWidth: 6,
    borderBottomColor: P.greenDark,
  },
  center: { alignItems: "center", marginTop: 8 },
  subtitle: {
    color: P.sub,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  daysCard: {
    width: "100%",
    alignItems: "center",
    backgroundColor: P.gold,
    borderRadius: 24,
    borderBottomWidth: 7,
    borderBottomColor: P.goldDark,
    paddingVertical: 18,
    marginBottom: 20,
  },
  daysNum: { color: P.ink, lineHeight: 58 },
  daysLbl: { color: P.goldInk, letterSpacing: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
  },
  rowBorder: {
    borderTopWidth: 2,
    borderTopColor: P.line,
    borderStyle: "dashed",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    backgroundColor: P.paper,
  },
});
