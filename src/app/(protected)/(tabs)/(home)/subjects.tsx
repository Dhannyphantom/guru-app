import SubjectsListScreen from "@/src/screens/SubjectListScreen";
import { useLocalSearchParams } from "expo-router";

export default function SubjectsPage() {
  const route = useLocalSearchParams();
  return <SubjectsListScreen route={route} />;
}
