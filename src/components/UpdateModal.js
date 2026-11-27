import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated from "react-native-reanimated";

import AppText from "./jamb/JambText";
import { T } from "./jamb/JambTheme";
import { JambButton, enter } from "./jamb/JambUI";
import { popIn, popOut } from "./jamb/JambMotion";
import UpdateBoard from "./update/UpdateBoard";
import { UpdatePerks, VersionRow } from "./update/UpdateParts";

const FALLBACK_MESSAGE =
  "A fresh version of Guru just landed, and it is better than ever. Grab it now!";

/**
 * Friendly (skippable) "a new version is out" prompt.
 *
 * The big green button is the star; "Maybe later" is deliberately quiet.
 * The forced flow lives in ForceUpdateScreen, not here.
 *
 *   <UpdateModal
 *     visible={promptVisible}
 *     message={message}
 *     currentVersion={currentVersion}
 *     latestVersion={latestVersion}
 *     onUpdate={startUpdate}
 *     onLater={dismissPrompt}
 *   />
 */
export default function UpdateModal({
  visible,
  message,
  currentVersion,
  latestVersion,
  onUpdate,
  onLater,
}) {
  const { width, height } = useWindowDimensions();
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (visible) setLeaving(false);
  }, [visible]);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!visible) return null;

  const handleLater = () => {
    if (leaving) return;
    setLeaving(true); // play the pop-out, then actually close
    timer.current = setTimeout(() => onLater && onLater(), 170);
  };

  const cardWidth = Math.min(width - 36, 420);

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleLater}
    >
      <View style={styles.overlay}>
        {!leaving && (
          <Animated.View
            entering={popIn}
            exiting={popOut}
            style={[styles.card, { width: cardWidth, maxHeight: height * 0.9 }]}
          >
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
            >
              <UpdateBoard
                animateIn={false}
                version={latestVersion}
                title="New stuff just dropped!"
                subtitle={message || FALLBACK_MESSAGE}
              />

              <Animated.View entering={enter(1, 120)}>
                <VersionRow
                  currentVersion={currentVersion}
                  latestVersion={latestVersion}
                  style={{ marginTop: 14 }}
                />
              </Animated.View>

              <Animated.View entering={enter(2, 120)} style={styles.perks}>
                <UpdatePerks />
              </Animated.View>

              <Animated.View entering={enter(3, 120)} style={{ marginTop: 18 }}>
                <JambButton
                  title="Update now"
                  icon="rocket"
                  onPress={onUpdate}
                  style={{ alignSelf: "stretch" }}
                />
                <AppText
                  fontWeight="medium"
                  size={11.5}
                  style={styles.reassure}
                >
                  Free and quick. Your progress stays safe.
                </AppText>
              </Animated.View>

              <Pressable
                onPress={handleLater}
                hitSlop={10}
                style={styles.later}
              >
                <AppText
                  fontWeight="semibold"
                  size={12}
                  style={{ color: T.faint }}
                >
                  Maybe later
                </AppText>
              </Pressable>
            </ScrollView>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(30,42,74,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: T.paper,
    borderRadius: 30,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: T.lineDark,
    overflow: "hidden",
  },
  scroll: { padding: 12 },
  perks: {
    marginTop: 16,
    backgroundColor: T.card,
    borderRadius: 22,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: T.line,
    padding: 14,
  },
  reassure: { color: T.sub, textAlign: "center", marginTop: 8 },
  later: { alignSelf: "center", paddingVertical: 8, marginTop: 4 },
});
