import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import colors from "../helpers/colors";
import { useRouter } from "expo-router";

export const NavBack = ({ style, color = colors.white }) => {
  const router = useRouter();

  const handleNav = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(protected)/(tabs)/(home)");
    }
  };

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
    // elevation: 2,
  },
});
