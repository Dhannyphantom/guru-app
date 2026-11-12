import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import colors from "../helpers/colors";
import { T } from "./jamb/JambTheme";
import { useRouter } from "expo-router";

/**
 * Back button.
 *  - default: the original bare chevron.
 *  - `jamb`: the exercise-book look used by the Jamb-styled screens
 *    (white tile, thick bottom edge, press-scale).
 */
export const NavBack = ({ style, color = colors.white, jamb = false }) => {
  const router = useRouter();

  const handleNav = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(protected)/(tabs)/(home)");
    }
  };

  if (jamb) {
    return (
      <Pressable
        onPress={handleNav}
        hitSlop={8}
        style={({ pressed }) => [
          styles.jamb,
          pressed && { transform: [{ scale: 0.92 }] },
          style,
        ]}
      >
        <Ionicons name="chevron-back" color={color} size={22} />
      </Pressable>
    );
  }

  return (
    <Pressable onPress={handleNav} style={[styles.container, style]}>
      <Ionicons name="chevron-back" color={color} size={25} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    // width: 46,
    // height: 45,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor: colors.unchange,
    borderRadius: 100,
    boxShadow: `2px 8px 12px ${colors.primary}25`,
  },
  jamb: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 13,
    backgroundColor: T.card,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.line,
    justifyContent: "center",
    alignItems: "center",
  },
});
