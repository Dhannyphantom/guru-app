import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "./JambText";
import { COOLDOWN_HOURS } from "../../helpers/jambConfig";
import { T } from "./JambTheme";
import { AnimatedBar, Card, Chip } from "./JambUI";

/** Shown while the rest period between rounds is running ("recess"). */
const JambCooldownCard = ({ cooldown, index = 0, title = "Next round unlocks in" }) => (
  <Card index={index} style={styles.card}>
    <View style={styles.row}>
      <View style={styles.icon}>
        <Ionicons name="hourglass" size={22} color={T.yellowInk} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText fontWeight="bold" size={11.5} style={styles.label}>
          {title}
        </AppText>
        <AppText
          fontWeight="black"
          size={28}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={styles.time}
        >
          {cooldown.hms}
        </AppText>
      </View>
      <Chip label={`${COOLDOWN_HOURS}h rest`} color={T.yellowInk} bg="#fff" />
    </View>

    <View style={{ marginTop: 10 }}>
      <AnimatedBar
        percent={cooldown.progress * 100}
        color={T.yellow}
        track="#F6E7A8"
        height={10}
        delay={0}
      />
    </View>

    <AppText fontWeight="medium" size={11} style={styles.note}>
      Recess time! Rest, review your corrections and come back sharper. Your
      next round starts when the timer ends.
    </AppText>
  </Card>
);

export default JambCooldownCard;

const styles = StyleSheet.create({
  card: { backgroundColor: T.yellowSoft, borderColor: T.yellowLine },
  row: { flexDirection: "row", alignItems: "center" },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: T.yellowLine,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  label: { color: T.yellowInk },
  time: { color: T.ink, fontVariant: ["tabular-nums"] },
  note: { color: "#5C4B10", marginTop: 9, lineHeight: 16 },
});
