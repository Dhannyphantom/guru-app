import { ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppLogo from "../components/AppLogo";
import AppText from "../components/jamb/JambText";
import { T } from "../components/jamb/JambTheme";
import { Card, Chip, JambButton, Note, enter } from "../components/jamb/JambUI";
import UpdateBoard from "../components/update/UpdateBoard";
import { UpdatePerks, VersionRow } from "../components/update/UpdateParts";

const FALLBACK_MESSAGE =
  "This version of Guru has retired. Grab the latest one and jump right back in!";

/**
 * Blocking screen shown when the installed version is below the server's
 * minimumSupportedVersion. There is no way to dismiss it on purpose.
 *
 * @param {string}   [props.title]          Override the headline
 * @param {string}   [props.message]        Server `forceMessage`
 * @param {string}   [props.version]        Latest version, e.g. "1.2.0"
 * @param {string}   [props.currentVersion] Installed version, e.g. "1.0.0"
 * @param {function} props.onUpdate         Opens the store / starts the update
 */
export default function ForceUpdateScreen({
  title = "Time to level up!",
  message,
  version,
  currentVersion,
  onUpdate,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 14 },
        ]}
      >
        <Animated.View entering={enter(0)} style={styles.topRow}>
          <AppLogo size={34} transparent />
          <Chip
            icon="lock-closed"
            label="Update required"
            color={T.coralDark}
            bg={T.coralSoft}
          />
        </Animated.View>

        <UpdateBoard
          version={version}
          title={title}
          subtitle={message || FALLBACK_MESSAGE}
        />

        <VersionRow
          currentVersion={currentVersion}
          latestVersion={version}
          style={{ marginTop: 14, marginBottom: 14 }}
        />

        <Card index={1} base={80}>
          <AppText
            fontWeight="black"
            size={15}
            style={{ color: T.ink, marginBottom: 12 }}
          >
            What is waiting for you
          </AppText>
          <UpdatePerks />
        </Card>

        <Note
          tone="green"
          icon="shield-checkmark"
          title="Your progress is safe"
          index={2}
          base={80}
          style={{ marginBottom: 0 }}
        >
          <AppText
            fontWeight="medium"
            size={12.5}
            style={{ color: T.sub, marginTop: 3, lineHeight: 18 }}
          >
            Your quizzes, points and rankings live in your account, so updating
            will not touch them.
          </AppText>
        </Note>
      </ScrollView>

      <Animated.View
        entering={enter(3, 160)}
        style={[styles.bottom, { paddingBottom: insets.bottom + 14 }]}
      >
        <JambButton
          title="Update now"
          icon="rocket"
          onPress={onUpdate}
          style={{ alignSelf: "stretch" }}
        />
        <View style={styles.foot}>
          <Ionicons name="information-circle" size={14} color={T.faint} />
          <AppText
            fontWeight="medium"
            size={11.5}
            style={{ color: T.sub, marginLeft: 5 }}
          >
            You need the latest version to keep using Guru
          </AppText>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.paper },
  scroll: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 18 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  bottom: {
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: T.paper,
    borderTopWidth: 2,
    borderTopColor: T.line,
  },
  foot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
});
