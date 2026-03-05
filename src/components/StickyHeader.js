import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "./AppText";
import colors from "../helpers/colors";
import Avatar from "./Avatar";

// ── Add near the top of the file, after existing imports ──
const StickyHeader = ({ scrollY, user, insets }) => {
  const animStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [120, 180],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [120, 180],
      [-40, 0],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateY }] };
  });

  return (
    <Animated.View
      style={[
        sh.bar,
        { paddingTop: insets.top, height: insets.top + 56 },
        animStyle,
      ]}
      pointerEvents="none"
    >
      <View style={sh.inner}>
        <Avatar
          size={50}
          imageStyle={{ backgroundColor: "#fff" }}
          data={{ user }}
          source={user?.avatar?.image}
          //   border={{ width: 2, color: "#fff" }}
          //   textFontsize={20}
        />
        <View style={sh.nameCol}>
          <AppText fontWeight="bold" style={sh.name} numberOfLines={1}>
            {user?.firstName} {user?.lastName}
          </AppText>
          <AppText style={sh.handle} size="tiny" fontWeight="medium">
            @{user?.username}
          </AppText>
        </View>
        {user?.points != null && (
          <View style={sh.pill}>
            <Ionicons name="flash" size={11} color="#f59e0b" />
            <AppText fontWeight="bold" style={sh.pillText} size="tiny">
              {user.points.toLocaleString()}
            </AppText>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// ── Sticky header styles (add at the bottom of StyleSheet.create) ──
const sh = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.extraLight,
    zIndex: 99,
    // subtle shadow
    boxShadow: "0px 2px 8px rgba(0,0,0,0.08)",
  },
  inner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
  },
  miniAvatar: {
    borderRadius: 17,
    backgroundColor: colors.primaryDeep + "20",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary + "40",
  },
  miniAvatarText: { color: colors.primaryDeep },
  nameCol: { flex: 1 },
  name: { fontSize: 14, color: colors.black, textTransform: "capitalize" },
  handle: { color: colors.medium, marginTop: 1 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fef3c7",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: { color: "#92400e" },
});

export default StickyHeader;
