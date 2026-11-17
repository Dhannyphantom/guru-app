import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";

import { P, TINTS } from "./PayTheme";
import { enter } from "./PayMotion";
import { Card, PayText, SectionTitle } from "./PayUI";

/** "What you unlock" — staggered rows with coloured icon tiles. */
const PerksList = ({ perks = [] }) => {
  if (!perks.length) return null;

  return (
    <View style={styles.wrap}>
      <SectionTitle
        icon="gift"
        title="What you unlock"
        sub="Included with every plan"
      />
      <Card animateIn={false} style={{ paddingVertical: 6 }}>
        {perks.map((perk, i) => {
          const tint = TINTS[i % TINTS.length];
          return (
            <Animated.View
              key={perk.title}
              entering={enter(i, 60)}
              style={[styles.row, i > 0 && styles.rowBorder]}
            >
              <View
                style={[
                  styles.icon,
                  { backgroundColor: tint.bg, borderColor: tint.line },
                ]}
              >
                <Ionicons name={perk.icon} size={20} color={tint.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <PayText fontWeight="black" size={14.5} style={{ color: P.ink }}>
                  {perk.title}
                </PayText>
                <PayText
                  fontWeight="medium"
                  size={12}
                  style={{ color: P.sub, marginTop: 2, lineHeight: 17 }}
                >
                  {perk.desc}
                </PayText>
              </View>
            </Animated.View>
          );
        })}
      </Card>
    </View>
  );
};

export default PerksList;

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 10 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  rowBorder: {
    borderTopWidth: 2,
    borderTopColor: P.line,
    borderStyle: "dashed",
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
});
