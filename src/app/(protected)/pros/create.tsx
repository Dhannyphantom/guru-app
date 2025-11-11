import CreateScreen from "@/src/screens/CreateScreen";
import { useLocalSearchParams } from "expo-router";

export default function CreatePage() {
  const route = useLocalSearchParams();
  return <CreateScreen route={route} />;
}
