import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { T } from "./JambTheme";
import { JambPressable } from "./JambUI";

/**
 * Back button in the Jamb style (white tile, thick bottom edge).
 *
 *  - no `to`  -> router.back()
 *  - with `to`-> router.navigate(to): returns to that screen if it is already
 *                in the stack (no duplicate), otherwise opens it. Use it when
 *                history.back() can land somewhere unexpected.
 */
const JambBackButton = ({ to, onPress, style }) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) return onPress();
    if (to) return router.navigate(to);
    if (router.canGoBack()) return router.back();
    router.replace("/");
  };

  return (
    <JambPressable
      onPress={handlePress}
      scaleTo={0.9}
      hitSlop={8}
      style={[{ marginRight: 12 }, style]}
      contentStyle={styles.btn}
    >
      <Ionicons name="chevron-back" size={22} color={T.ink} />
    </JambPressable>
  );
};

export default JambBackButton;

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: T.card,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.line,
    alignItems: "center",
    justifyContent: "center",
  },
});
