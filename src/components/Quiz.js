import { Modal, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import RenderQuiz from "./RenderQuiz";

const Quiz = ({ data, startQuiz, setStartQuiz }) => {
  if (!startQuiz) return null;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.modal}>
        <Modal
          visible={startQuiz}
          onRequestClose={null}
          statusBarTranslucent
          style={{ backgroundColor: "red" }}
          transparent
          animationType="none"
        >
          <RenderQuiz setVisible={setStartQuiz} data={data} />
          <StatusBar style="dark" />
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default Quiz;

const styles = StyleSheet.create({
  modal: {
    flex: 1,
  },
});
