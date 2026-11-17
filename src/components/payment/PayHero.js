import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";

import { P } from "./PayTheme";
import { enter } from "./PayMotion";
import { PayText, useFloat } from "./PayUI";

const ART = 118;

/** Small floating sticker around the main badge. */
const Sticker = ({ icon, color, bg, size = 34, style, delay, amp }) => {
  const float = useFloat(delay, 3000, amp);
  return (
    <Animated.View
      style={[
        styles.sticker,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        style,
        float,
      ]}
    >
      <Ionicons name={icon} size={size * 0.52} color={color} />
    </Animated.View>
  );
};

/**
 * Purple "chalkboard" hero: dashed frame, faint study doodles, a floating
 * gold diamond with orbiting stickers, and a row of reassurance pills.
 */
const PayHero = ({ title, sub, pills = [] }) => {
  const bob = useFloat(0, 3200, 6);

  return (
    <Animated.View entering={enter(0)} style={styles.wrap}>
      <View style={styles.board}>
        <View pointerEvents="none" style={styles.frame} />

        {/* faint doodles */}
        <PayText fontWeight="black" size={38} style={[styles.doodle, { top: 8, left: "52%" }]}>
          A+
        </PayText>
        <PayText fontWeight="black" size={30} style={[styles.doodle, { bottom: 52, left: "40%" }]}>
          ✓
        </PayText>

        <View style={styles.row}>
          <View style={styles.textCol}>
            <View style={styles.badgeRow}>
              <Ionicons name="sparkles" size={12} color={P.goldInk} />
              <PayText fontWeight="black" size={10.5} style={styles.badgeTxt}>
                PREMIUM
              </PayText>
            </View>
            <PayText fontWeight="black" size={25} style={styles.title}>
              {title}
            </PayText>
            <PayText fontWeight="medium" size={12.5} style={styles.sub}>
              {sub}
            </PayText>
          </View>

          <View style={styles.art}>
            <Animated.View style={[styles.gem, bob]}>
              <Ionicons name="diamond" size={40} color={P.ink} />
            </Animated.View>
            <Sticker
              icon="star"
              color={P.goldInk}
              bg={P.goldSoft}
              style={{ top: 0, left: 0 }}
              delay={200}
              amp={5}
            />
            <Sticker
              icon="rocket"
              color={P.coralDark}
              bg={P.coralSoft}
              size={30}
              style={{ bottom: 2, left: 2 }}
              delay={700}
              amp={6}
            />
            <Sticker
              icon="flash"
              color={P.greenDark}
              bg={P.greenSoft}
              size={28}
              style={{ top: 10, right: 0 }}
              delay={1100}
              amp={4}
            />
          </View>
        </View>

        {pills.length > 0 && (
          <View style={styles.pills}>
            {pills.map((label) => (
              <View key={label} style={styles.pill}>
                <Ionicons name="checkmark-circle" size={13} color={P.gold} />
                <PayText
                  fontWeight="bold"
                  size={11}
                  style={{ color: "#fff", marginLeft: 4 }}
                >
                  {label}
                </PayText>
              </View>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

export default PayHero;

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 12, marginBottom: 22 },
  board: {
    backgroundColor: P.brandDark,
    borderRadius: 28,
    borderBottomWidth: 7,
    borderBottomColor: P.brandDeep,
    padding: 20,
    paddingBottom: 18,
    overflow: "hidden",
  },
  frame: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 22,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.16)",
  },
  doodle: { position: "absolute", color: "rgba(255,255,255,0.07)" },
  row: { flexDirection: "row", alignItems: "center" },
  textCol: { flex: 1, paddingRight: 10 },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: P.gold,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  badgeTxt: { color: P.goldInk, marginLeft: 4, letterSpacing: 0.8 },
  title: { color: "#fff", lineHeight: 30 },
  sub: { color: P.brandLine, marginTop: 6, lineHeight: 18 },
  art: { width: ART, height: ART, alignItems: "center", justifyContent: "center" },
  gem: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: P.gold,
    borderBottomWidth: 6,
    borderBottomColor: P.goldDark,
    alignItems: "center",
    justifyContent: "center",
  },
  sticker: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
  },
  pills: { flexDirection: "row", flexWrap: "wrap", marginTop: 16 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 6,
  },
});
