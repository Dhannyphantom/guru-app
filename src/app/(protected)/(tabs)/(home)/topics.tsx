import TopicsScreen from "@/src/screens/TopicsScreen";
import { useLocalSearchParams } from "expo-router";

export default function TopicsPage() {
  const route = useLocalSearchParams();

  return <TopicsScreen route={route} />;
}
