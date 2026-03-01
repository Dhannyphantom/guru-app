// import GuruTooltip from "@/src/components/GuruTooltip";
import SchoolScreen from "@/src/screens/SchoolScreen";
import { useLocalSearchParams } from "expo-router";
// import { CopilotProvider } from "react-native-copilot";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SchoolPage() {
  const route = useLocalSearchParams();

  return <SchoolScreen route={route} />;
}
