import RenderQuiz from "@/src/components/RenderQuiz";
import { useRouter } from "expo-router";

export default function SessionPage() {
  const router = useRouter();
  return (
    <RenderQuiz
      setVisible={() => router.replace("/(protected)/(tabs)/(home)")}
      data={{}}
    />
  );
}
