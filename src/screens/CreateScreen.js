import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import NewTopics from "../components/NewTopics";
import NewSubjects from "../components/NewSubjects";
import NewCategory from "../components/NewCategory";
import NewQuestions from "../components/NewQuestions";
import { addInstanceActions } from "../helpers/helperFunctions";

const CreateScreen = ({ route }) => {
  const screenKey = route?.name;
  const screenType = route?.type;
  const screenData = route?.data ? JSON.parse(route?.data) : {};
  let ScreenComponent;

  switch (screenKey) {
    case "questions":
      ScreenComponent = NewQuestions;
      break;
    case "category":
      ScreenComponent = NewCategory;
      break;
    case "subjects":
      ScreenComponent = NewSubjects;
      break;
    case "topics":
      ScreenComponent = NewTopics;
      break;

    default:
      break;
  }
  return (
    <View style={styles.container}>
      {ScreenComponent && (
        <ScreenComponent
          addInstanceActions={addInstanceActions}
          type={screenType}
          data={screenData}
        />
      )}
      <StatusBar style="dark" />
    </View>
  );
};

export default CreateScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
