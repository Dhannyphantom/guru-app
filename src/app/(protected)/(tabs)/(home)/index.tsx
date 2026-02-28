import { useEffect } from "react";
import HomeScreen from "../../../../screens/HomeScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch } from "react-redux";
import { updateUser } from "@/src/context/usersSlice";
import { CopilotProvider } from "react-native-copilot";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GuruTooltip from "@/src/components/GuruTooltip";

export default function AppPage() {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const prepare = async () => {
      const userStr = await AsyncStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      dispatch(updateUser(user));
    };
    prepare();
  }, [dispatch]);

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
      <HomeScreen />
    </CopilotProvider>
  );
}
