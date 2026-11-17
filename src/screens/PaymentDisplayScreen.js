import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import AppHeader from "../components/AppHeader";
import DisplayPayments from "../components/DisplayPayments";
import { P } from "../components/payment/PayTheme";

export default function PaymentDisplayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // `data` arrives as a JSON string in the route params. Parse it once (and
  // safely) instead of mutating the params object on every render.
  const route = useMemo(() => {
    let parsed = {};
    try {
      parsed = params?.data ? JSON.parse(params.data) : {};
    } catch {
      parsed = {};
    }
    return { ...params, data: parsed };
  }, [params?.data, params?.type, params?.schoolId]);

  const goBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Subscribe" />
      {/* DisplayPayments owns its own scrolling + sticky pay bar */}
      <DisplayPayments hideModal={goBack} data={route} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.paper,
  },
});
