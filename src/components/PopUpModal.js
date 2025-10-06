import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import colors from "../helpers/colors";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("screen");

const PopUpModal = ({
  visible,
  setVisible,
  mainStyle,
  Component,
  useDefaultHeight = false,
}) => {
  const handleCloseModal = () => {
    opaciter.value = withTiming(0, {}, (finished) => {
      if (finished) {
        runOnJS(setVisible)(false);
      }
    });
  };

  const opaciter = useSharedValue(0);

  const RStyle = useAnimatedStyle(() => {
    return {
      opacity: opaciter.value,
    };
  });

  const mainRStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            opaciter.value,
            [0, 1],
            [useDefaultHeight ? height : height * 0.08, 0] // Start from bottom if useDefaultHeight
          ),
        },
      ],
    };
  });

  const dropperStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        opaciter.value,
        [0, 0.7, 1],
        [0, 0, 1] // Start from bottom if useDefaultHeight
      ),
    };
  });

  useEffect(() => {
    if (visible === true) {
      opaciter.value = withTiming(1, {
        duration: 600,
      });
    }
  }, [visible]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.modal}>
        <Modal
          visible={visible}
          statusBarTranslucent
          animationType="none"
          transparent
          onRequestClose={handleCloseModal}
        >
          <Animated.View style={[styles.container, RStyle]}>
            <Animated.View style={[mainStyle, mainRStyle]}>
              <Animated.View style={[styles.dropper, dropperStyle]} />
              <Animated.View
                style={[
                  styles.main,
                  useDefaultHeight && { height: undefined }, // Let content determine height
                ]}
              >
                <Pressable
                  onPress={handleCloseModal}
                  style={{
                    alignSelf: "flex-end",
                    padding: 20,
                    paddingTop: 15,
                    paddingBottom: 6,
                  }}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={25}
                    color={colors.medium}
                  />
                </Pressable>
                {Component && <Component closeModal={handleCloseModal} />}
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default PopUpModal;

const styles = StyleSheet.create({
  container: {
    flex: Platform.OS == "web" ? null : 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  dropper: {
    width: width * 0.92,
    height: 30,
    backgroundColor: colors.extraLight,
    alignSelf: "center",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.white,
    top: 16,
  },
  main: {
    backgroundColor: colors.white,
    // elevation: 25,
    borderTopStartRadius: 10,
    borderTopEndRadius: 10,
    height: height * 0.92, // Default height (full screen)
  },
  modal: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
