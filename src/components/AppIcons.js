import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import colors from "../helpers/colors";
import { useNavigation } from "@react-navigation/native";

export const NavBack = ({ style, color = colors.white }) => {
  const navigation = useNavigation();
  return (
    <Pressable
      onPress={() => navigation.goBack()}
      style={[styles.container, style]}
    >
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
