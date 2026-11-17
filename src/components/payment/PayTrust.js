/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { P } from "./PayTheme";
import { LAYOUT, SPRING, enter } from "./PayMotion";
import { Card, PayText, PressScale, SectionTitle } from "./PayUI";
import { HELP, METHODS } from "../../helpers/payConfig";

const HelpRow = ({ item, open, onToggle, first }) => {
  const rot = useSharedValue(0);

  useEffect(() => {
    rot.value = withSpring(open ? 1 : 0, SPRING.smooth);
  }, [open]);

  const chevron = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value * 180}deg` }],
  }));

  return (
    <Animated.View layout={LAYOUT} style={!first && styles.rowBorder}>
      <PressScale
        onPress={onToggle}
        scaleTo={0.99}
        contentStyle={styles.helpHead}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.helpIcon}>
          <Ionicons name={item.icon} size={16} color={P.brandDark} />
        </View>
        <PayText
          fontWeight="bold"
          size={13.5}
          style={{ color: P.ink, flex: 1 }}
        >
          {item.title}
        </PayText>
        <Animated.View style={chevron}>
          <Ionicons name="chevron-down" size={16} color={P.sub} />
        </Animated.View>
      </PressScale>

      {open && (
        <Animated.View
          entering={FadeInDown.duration(220)}
          exiting={FadeOut.duration(120)}
        >
          <PayText
            fontWeight="medium"
            size={12}
            style={{ color: P.sub, lineHeight: 18, paddingLeft: 42, paddingBottom: 12 }}
          >
            {item.desc}
          </PayText>
        </Animated.View>
      )}
    </Animated.View>
  );
};

/**
 * "Pay your way" method chips + secure-checkout help accordion
 * (replaces the old plain tips list under the form).
 */
const PayTrust = () => {
  const [openIdx, setOpenIdx] = useState(-1);

  return (
    <View style={styles.wrap}>
      <SectionTitle
        icon="shield-checkmark"
        color={P.greenDark}
        bg={P.greenSoft}
        title="Safe & simple checkout"
        sub="Pay your way, secured by Flutterwave"
      />

      <Animated.View entering={enter(0, 60)} style={styles.methods}>
        {METHODS.map((m) => (
          <View key={m.label} style={styles.method}>
            <Ionicons name={m.icon} size={18} color={P.brandDark} />
            <PayText
              fontWeight="bold"
              size={11.5}
              style={{ color: P.ink, marginTop: 4 }}
            >
              {m.label}
            </PayText>
          </View>
        ))}
      </Animated.View>

      <Card index={1} base={60} style={{ paddingVertical: 4 }}>
        {HELP.map((item, i) => (
          <HelpRow
            key={item.title}
            item={item}
            first={i === 0}
            open={openIdx === i}
            onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
          />
        ))}
      </Card>
    </View>
  );
};

export default PayTrust;

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 10 },
  methods: { flexDirection: "row", marginBottom: 14 },
  method: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: P.line,
    backgroundColor: P.card,
  },
  helpHead: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  helpIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: P.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowBorder: {
    borderTopWidth: 2,
    borderTopColor: P.line,
    borderStyle: "dashed",
  },
});
