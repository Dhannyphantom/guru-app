import { Dimensions, Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import AppText from "../components/AppText";
import { T } from "./jamb/JambTheme";
import { JambButton, useFloat } from "./jamb/JambUI";

const { width, height } = Dimensions.get("screen");

const ART = Platform.OS === "web" ? 150 : width * 0.32;

/** Three overlapping "classmate" avatars + a chat bubble. Pure views, no images. */
const FriendsArt = () => {
  const floatA = useFloat(0, 2800, 4);
  const floatB = useFloat(500, 3100, 4);
  const floatC = useFloat(900, 2600, 3);
  const floatBubble = useFloat(300, 2400, 5);

  const A = ART * 0.42;
  const C = ART * 0.48;

  return (
    <View style={{ width: ART, height: ART }}>
      <View
        style={[
          styles.blob,
          { width: ART * 0.9, height: ART * 0.9, borderRadius: ART },
        ]}
      />

      {/* chat bubble */}
      <Animated.View style={[styles.bubble, { right: 0, top: 0 }, floatBubble]}>
        <Ionicons
          name="chatbubble-ellipses"
          size={ART * 0.17}
          color={T.blueDark}
        />
      </Animated.View>

      {/* avatars */}
      <Animated.View
        style={[
          styles.avatar,
          {
            width: A,
            height: A,
            borderRadius: A / 2,
            backgroundColor: T.coral,
            left: 0,
            top: ART * 0.2,
          },
          floatA,
        ]}
      >
        <Ionicons name="person" size={A * 0.55} color={T.ink} />
      </Animated.View>
      <Animated.View
        style={[
          styles.avatar,
          {
            width: A,
            height: A,
            borderRadius: A / 2,
            backgroundColor: T.yellow,
            right: ART * 0.02,
            top: ART * 0.3,
          },
          floatB,
        ]}
      >
        <Ionicons name="person" size={A * 0.55} color={T.ink} />
      </Animated.View>
      <Animated.View
        style={[
          styles.avatar,
          {
            width: C,
            height: C,
            borderRadius: C / 2,
            backgroundColor: T.green,
            left: (ART - C) / 2,
            bottom: 0,
            zIndex: 3,
          },
          floatC,
        ]}
      >
        <Ionicons name="happy" size={C * 0.58} color={T.ink} />
      </Animated.View>

      {/* sparkles */}
      <View
        style={[
          styles.dot,
          { left: ART * 0.3, top: 2, backgroundColor: "#fff" },
        ]}
      />
      <View
        style={[
          styles.dot,
          {
            left: ART * 0.02,
            bottom: ART * 0.2,
            width: 5,
            height: 5,
            backgroundColor: T.yellow,
          },
        ]}
      />
    </View>
  );
};

const FindFriendsBoard = ({ onPress }) => {
  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.lip}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.tag}>
            <AppText fontWeight="black" size="xxsmall" style={styles.tagText}>
              STUDY BUDDIES
            </AppText>
          </View>
          <AppText
            style={{
              lineHeight: 26,
              maxWidth: "92%",
              color: "#fff",
              marginTop: 8,
            }}
            fontWeight="black"
            size={"large"}
          >
            Learn and solve questions together with your friends now
          </AppText>
          <JambButton
            title="Find Friends"
            variant="yellow"
            icon="person-add"
            small
            onPress={onPress}
            style={styles.btn}
          />
        </View>
        <FriendsArt />
      </View>
    </Animated.View>
  );
};

export default FindFriendsBoard;

const styles = StyleSheet.create({
  lip: {
    width: Platform.OS === "web" ? "45%" : width * 0.95,
    alignSelf: "center",
    marginBottom: 20,
    borderRadius: 22,
    backgroundColor: T.blueDark,
    paddingBottom: 6,
  },
  container: {
    backgroundColor: T.blue,
    borderRadius: 22,
    paddingVertical: 18,
    paddingLeft: 18,
    paddingRight: 12,
    minHeight: height * 0.15,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },
  content: { flex: 1, paddingRight: 6 },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  tagText: { color: "#fff", letterSpacing: 1 },
  btn: { alignSelf: "flex-start", marginTop: 16 },

  blob: {
    position: "absolute",
    left: ART * 0.05,
    top: ART * 0.05,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  avatar: {
    position: "absolute",
    borderWidth: 2.5,
    borderColor: T.ink,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    position: "absolute",
    zIndex: 4,
    width: ART * 0.3,
    height: ART * 0.26,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 2.5,
    borderColor: T.ink,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
