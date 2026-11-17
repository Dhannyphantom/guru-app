import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";

import { P } from "./PayTheme";
import { enter } from "./PayMotion";
import { PayButton, PayText } from "./PayUI";

/** Shown instead of the pay button while the user's profile is incomplete. */
const PayProfileGate = ({ message, onPress, buttonLabel }) => (
  <Animated.View entering={enter(0, 120)} style={styles.card}>
    <View style={styles.iconWrap}>
      <Ionicons name="person-circle" size={30} color={P.goldInk} />
    </View>
    <View style={{ flex: 1 }}>
      <PayText fontWeight="black" size={15.5} style={{ color: P.ink }}>
        One quick step first
      </PayText>
      <PayText
        fontWeight="medium"
        size={12.5}
        style={{ color: P.goldInk, marginTop: 3, lineHeight: 18 }}
      >
        {message ||
          "Complete your profile before subscribing so we can activate your plan on the right account."}
      </PayText>
      <PayButton
        title={buttonLabel}
        icon="arrow-forward"
        variant="gold"
        small
        onPress={onPress}
        style={{ marginTop: 12, alignSelf: "flex-start" }}
      />
    </View>
  </Animated.View>
);

export default PayProfileGate;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: 16,
    marginBottom: 18,
    backgroundColor: P.goldSoft,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: P.goldLine,
    borderRadius: 22,
    padding: 14,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: P.goldLine,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
});
