import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../jamb/JambText";
import { T } from "../jamb/JambTheme";
import { Chip } from "../jamb/JambUI";

/** Selling points shown in both the prompt and the force-update screen. */
export const PERKS = [
  {
    icon: "flash",
    title: "Faster, smoother quizzes",
    sub: "Less waiting, more answering.",
    bg: T.yellowSoft,
    line: T.yellowLine,
    ink: T.yellowInk,
  },
  {
    icon: "sparkles",
    title: "Fresh features & surprises",
    sub: "New goodies you will want to try.",
    bg: T.purpleSoft,
    line: T.purpleLine,
    ink: T.purpleDark,
  },
  {
    icon: "shield-checkmark",
    title: "Fixes & extra stability",
    sub: "A safer, steadier Guru.",
    bg: T.greenSoft,
    line: T.greenLine,
    ink: T.greenDark,
  },
];

export const UpdatePerks = ({ style }) => (
  <View style={style}>
    {PERKS.map((p, i) => (
      <View key={p.title} style={[styles.perk, i > 0 && { marginTop: 10 }]}>
        <View
          style={[styles.perkIcon, { backgroundColor: p.bg, borderColor: p.line }]}
        >
          <Ionicons name={p.icon} size={19} color={p.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText fontWeight="black" size={14} style={{ color: T.ink }}>
            {p.title}
          </AppText>
          <AppText fontWeight="medium" size={12} style={{ color: T.sub, marginTop: 1 }}>
            {p.sub}
          </AppText>
        </View>
      </View>
    ))}
  </View>
);

/** "v1.0.0  ->  v1.2.0" strip. Renders nothing if neither version is known. */
export const VersionRow = ({ currentVersion, latestVersion, style }) => {
  if (!currentVersion && !latestVersion) return null;

  return (
    <View style={[styles.versionRow, style]}>
      {Boolean(currentVersion) && (
        <Chip
          label={`You: v${currentVersion}`}
          color={T.sub}
          bg={T.lockedBg}
        />
      )}
      {Boolean(currentVersion) && Boolean(latestVersion) && (
        <Ionicons
          name="arrow-forward"
          size={16}
          color={T.faint}
          style={{ marginHorizontal: 8 }}
        />
      )}
      {Boolean(latestVersion) && (
        <Chip
          icon="sparkles"
          label={`New: v${latestVersion}`}
          color={T.greenDark}
          bg={T.greenSoft}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  perk: { flexDirection: "row", alignItems: "center" },
  perkIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  versionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
