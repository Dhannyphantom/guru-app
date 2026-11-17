/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { P } from "./PayTheme";
import { LAYOUT, SPRING, enter, popIn, popOut } from "./PayMotion";
import { Chip, PayText, PressScale, formatMoney } from "./PayUI";

/**
 * One selectable plan. Selecting springs the card up, tints it purple, fills
 * the radio with a popping check, and thickens the lip.
 */
const PlanCard = ({ plan, selected, onSelect, index = 0 }) => {
  const sel = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    sel.value = withSpring(selected ? 1 : 0, SPRING.smooth);
  }, [selected]);

  const cardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(sel.value, [0, 1], [P.card, P.brandSoft]),
    borderColor: interpolateColor(sel.value, [0, 1], [P.line, P.brand]),
    borderBottomColor: interpolateColor(sel.value, [0, 1], [P.line, P.brandDark]),
    transform: [{ translateY: -2 * sel.value }, { scale: 1 + 0.012 * sel.value }],
  }));

  const radioStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(sel.value, [0, 1], [P.card, P.brand]),
    borderColor: interpolateColor(sel.value, [0, 1], [P.lineDark, P.brand]),
  }));

  const hasRibbon = plan.best || plan.popular;

  return (
    <Animated.View
      entering={enter(index, 140)}
      layout={LAYOUT}
      style={[styles.wrap, hasRibbon && { marginTop: 10 }]}
    >
      <PressScale
        onPress={() => onSelect(plan.id)}
        scaleTo={0.98}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${plan.label}, ${formatMoney(plan.amount)}`}
      >
        <Animated.View style={[styles.card, cardStyle]}>
          <Animated.View style={[styles.radio, radioStyle]}>
            {selected && (
              <Animated.View entering={popIn} exiting={popOut}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </Animated.View>
            )}
          </Animated.View>

          <View style={styles.mid}>
            <PayText fontWeight="black" size={17} style={{ color: P.ink }}>
              {plan.label}
            </PayText>
            <PayText
              fontWeight="medium"
              size={12}
              style={{ color: P.sub, marginTop: 2 }}
            >
              {plan.days ? `${plan.days} days of access` : "Full access"}
            </PayText>
            {plan.savePct > 0 && (
              <Chip
                label={`Save ${plan.savePct}%`}
                icon="pricetag"
                style={{ marginTop: 8 }}
              />
            )}
          </View>

          <View style={styles.right}>
            <PayText
              fontWeight="black"
              size={22}
              style={{ color: selected ? P.brandDark : P.ink }}
            >
              {formatMoney(plan.amount)}
            </PayText>
            {plan.perDay ? (
              <PayText
                fontWeight="semibold"
                size={11}
                style={{ color: P.sub, marginTop: 2 }}
              >
                {`${formatMoney(plan.perDay)}/day`}
              </PayText>
            ) : null}
          </View>
        </Animated.View>
      </PressScale>

      {hasRibbon && (
        <Animated.View
          entering={popIn}
          pointerEvents="none"
          style={[styles.ribbon, plan.best ? styles.ribbonBest : styles.ribbonPop]}
        >
          <Ionicons
            name={plan.best ? "trophy" : "flame"}
            size={11}
            color={plan.best ? P.goldInk : "#fff"}
          />
          <PayText
            fontWeight="black"
            size={10.5}
            style={{
              color: plan.best ? P.goldInk : "#fff",
              marginLeft: 4,
              letterSpacing: 0.6,
            }}
          >
            {plan.best ? "BEST VALUE" : "POPULAR"}
          </PayText>
        </Animated.View>
      )}
    </Animated.View>
  );
};

export default PlanCard;

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 2,
    borderBottomWidth: 5,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  mid: { flex: 1, paddingRight: 8 },
  right: { alignItems: "flex-end" },
  ribbon: {
    position: "absolute",
    top: -11,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderBottomWidth: 3,
    transform: [{ rotate: "2deg" }],
  },
  ribbonBest: { backgroundColor: P.gold, borderBottomColor: P.goldDark },
  ribbonPop: { backgroundColor: P.coral, borderBottomColor: P.coralDark },
});
