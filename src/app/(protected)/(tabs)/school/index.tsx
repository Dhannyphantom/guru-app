import SchoolScreen from "@/src/screens/SchoolScreen";
import { useLocalSearchParams } from "expo-router";

export default function SchoolPage() {
  const route = useLocalSearchParams();
  return <SchoolScreen route={route} />;
}
