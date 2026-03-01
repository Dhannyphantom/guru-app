import GuruTooltip from "@/src/components/GuruTooltip";
import LeaderboardScreen from "@/src/screens/LeaderboardScreen";
import { CopilotProvider } from "react-native-copilot";
import { useSafeAreaInsets } from "react-native-safe-area-context";
export default function SchoolLeaderboardPage() {
  const insets = useSafeAreaInsets();

  return (
    <CopilotProvider
      tooltipComponent={GuruTooltip}
      tooltipStyle={{ backgroundColor: "transparent" }}
      arrowSize={0}
      overlay="svg"
      animated
      backdropColor="rgba(0, 0, 0, 0.75)"
      verticalOffset={insets.top}
    >
      <LeaderboardScreen />;
    </CopilotProvider>
  );
}
