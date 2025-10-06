import { Modal, StyleSheet, View } from "react-native";
import React from "react";
import { BlurView } from "expo-blur";
import Animated, {
  Easing,
  SlideInLeft,
  SlideOutRight,
} from "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const AppModal = ({ visible, Component, noBlur = false, setVisible }) => {
  if (!visible) return null;
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.modal}>
        <Modal
          visible={visible}
          onRequestClose={null}
          statusBarTranslucent
          transparent
          animationType="none"
        >
          {noBlur ? (
            <Animated.View style={styles.noblur}>
              <Animated.View
                style={styles.main}
                exiting={SlideOutRight.duration(350)}
                entering={SlideInLeft.duration(600)}
              >
                {Component && <Component />}
              </Animated.View>
            </Animated.View>
          ) : (
            <BlurView
              style={styles.blur}
              intensity={20}
              experimentalBlurMethod="dimezisBlurView"
            >
              <Animated.View
                style={styles.main}
                exiting={SlideOutRight.duration(350)}
                entering={SlideInLeft.duration(600)}
              >
                {Component && <Component />}
              </Animated.View>
            </BlurView>
          )}
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default AppModal;

const styles = StyleSheet.create({
  blur: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  main: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noblur: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
});
