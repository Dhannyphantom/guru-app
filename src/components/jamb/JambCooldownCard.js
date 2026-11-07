import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "./JambText";
import { COOLDOWN_HOURS, J } from "../../helpers/jambConfig";
import { AnimatedBar, Card, Chip } from "./JambUI";

/** Shown while the rest period between rounds is running. */
const JambCooldownCard = ({ cooldown, index = 0, title = "Next round unlocks in" }) => (
  <Card index={index} style={styles.card}>
    <View style={styles.row}>
      <View style={styles.icon}>
        <Ionicons name="hourglass" size={22} color={J.amber} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText fontWeight="semibold" size={12} style={{ color: "#7A6820" }}>
          {title}
        </AppText>
        <AppText
          fontWeight="black"
          size={26}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={styles.time}
        >
          {cooldown.hms}
        </AppText>
      </View>
      <Chip label={`${COOLDOWN_HOURS}h rest`} color={J.amber} bg="#fff" />
    </View>

    <View style={{ marginTop: 10 }}>
      <AnimatedBar
        percent={cooldown.progress * 100}
        color={J.amber}
        track="#F3E7BE"
        height={6}
        delay={0}
      />
    </View>

    <AppText fontWeight="medium" size={11} style={styles.note}>
      Rest, review your corrections and come back sharper. Your next round starts
      when the timer ends.
    </AppText>
  </Card>
);

export default JambCooldownCard;

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFF8DC", borderWidth: 1, borderColor: J.amberLine },
  row: { flexDirection: "row", alignItems: "center" },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FCE7A1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  time: { color: J.ink, fontVariant: ["tabular-nums"] },
  note: { color: "#6B5A1E", marginTop: 8, lineHeight: 16 },
});
