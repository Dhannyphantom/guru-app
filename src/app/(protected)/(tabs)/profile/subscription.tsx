import SubscriptionScreen from "@/src/screens/SubscriptionScreen";
import { useLocalSearchParams } from "expo-router";

export default function SubscriptionPage() {
  const route = useLocalSearchParams();
  return <SubscriptionScreen route={route} />;
}
