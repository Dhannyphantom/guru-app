import { Dimensions, Modal, StyleSheet, Text, View } from "react-native";
import React from "react";
import AppText from "./AppText";
import { BlurView } from "expo-blur";
import AppButton from "./AppButton";
import colors from "../helpers/colors";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("screen");

const PromptModal = ({ prompt, setPrompt, onPress }) => {
  // prompt = {vis, data: title, msg, btn,cb, type}
  const { vis, data } = prompt;
  if (!vis) return null;

  const handleCloseModal = () => {
    setPrompt({ vis: false, data: null });
  };

  const handlePress = () => {
    onPress && onPress(data.type);
    prompt?.cb(data?.type);
    handleCloseModal();
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.modal}>
        <Modal
          visible={vis}
          onRequestClose={null}
          statusBarTranslucent
          transparent
          animationType="fade"
        >
          <BlurView
            style={styles.blur}
            intensity={20}
            experimentalBlurMethod="dimezisBlurView"
          >
            <View style={styles.container}>
              <AppText fontWeight="heavy" size={"xxlarge"} style={styles.title}>
                {data.title}
              </AppText>
              <AppText style={styles.msg}> {data.msg} </AppText>
              <View style={styles.btnContainer}>
                <AppButton title={data.btn} onPress={handlePress} />
                <AppButton
                  title={"Cancel"}
                  type="warn"
                  onPress={handleCloseModal}
                />
              </View>
            </View>
          </BlurView>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default PromptModal;

const styles = StyleSheet.create({
  blur: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  btnContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  container: {
    width: width * 0.9,
    padding: 15,
    backgroundColor: colors.lightly,
    borderRadius: 25,
    elevation: 30,
  },
  title: {
    marginTop: 5,
    marginBottom: 10,
  },
  msg: {
    marginBottom: 25,
  },
  modal: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
