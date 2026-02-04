import { StyleSheet, View } from "react-native";
import AppHeader from "../components/AppHeader";
import DisplayPayments from "../components/DisplayPayments";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function PaymentDisplayScreen() {
  const router = useRouter();
  const route = useLocalSearchParams();

  route.data = route?.data ? JSON.parse(route?.data) : {};

  const goBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Subscribe" />
      <DisplayPayments hideModal={goBack} data={route} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
