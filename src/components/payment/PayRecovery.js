import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";

import { P } from "./PayTheme";
import { enter } from "./PayMotion";
import { PayButton, PayText } from "./PayUI";

/**
 * Shown when Flutterwave returned but we couldn't confirm with the server.
 * The user might have been debited, so we never just say "failed" — we give
 * them a clear "check again" path, and a support route.
 */
const PayRecovery = ({ onRetry, onStartOver }) => (
  <Animated.View entering={enter(0)} style={styles.card}>
    <View style={styles.iconWrap}>
      <Ionicons name="shield-half" size={28} color={P.coralDark} />
    </View>

    <PayText fontWeight="black" size={19} style={{ color: P.ink, textAlign: "center" }}>
      We're checking your payment
    </PayText>
    <PayText
      fontWeight="medium"
      size={13}
      style={{
        color: P.sub,
        textAlign: "center",
        marginTop: 6,
        marginBottom: 16,
        lineHeight: 19,
      }}
    >
      We couldn't confirm it just yet. If money left your account, don't worry
      — tap the button below to check again.
    </PayText>

    <PayButton
      title="Check payment status"
      icon="refresh"
      variant="brand"
      onPress={onRetry}
    />

    <View style={styles.supportBox}>
      <Ionicons name="help-buoy" size={16} color={P.goldInk} />
      <PayText
        fontWeight="medium"
        size={11.5}
        style={{ color: P.goldInk, flex: 1, marginLeft: 8, lineHeight: 17 }}
      >
        Still not showing? Go to Profile → Settings & More → Contact Us and
        open a Payment & Billing ticket. We'll get back to you within minutes.
      </PayText>
    </View>

    <PayButton
      title="I didn't pay — start over"
      icon={null}
      variant="ghost"
      small
      onPress={onStartOver}
      style={{ marginTop: 14 }}
    />
  </Animated.View>
);

export default PayRecovery;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: P.card,
    borderRadius: 24,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: P.coralLine,
    padding: 18,
  },
  iconWrap: {
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: P.coralSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  supportBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: P.goldSoft,
    borderWidth: 2,
    borderColor: P.goldLine,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
});
