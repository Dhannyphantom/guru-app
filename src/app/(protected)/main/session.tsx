import RenderQuiz from "@/src/components/RenderQuiz";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function SessionPage() {
  const router = useRouter();

  const { type } = useLocalSearchParams();

  const handleNav = () => {
    if (type === "school") {
      router.replace("/(protected)/(tabs)/school");
    } else {
      router.replace("/(protected)/(tabs)/(home)");
    }
  };

  return <RenderQuiz setVisible={handleNav} />;
}
