import { View, Text, Platform, StyleSheet } from "react-native";
import React from "react";

import LottieView from "lottie-react-native";

// LOTTIE FILES
import bookPeopleAnim from "../../assets/animations/people_books.json";
import loadingAnim from "../../assets/animations/dot_loader.json";
import studentHiAnim from "../../assets/animations/student_hi.json";
import studentJumpingAnim from "../../assets/animations/student_jumping.json";
import personFloat from "../../assets/animations/person_float.json";
import progressAnim from "../../assets/animations/progress.json";
import timerAnim from "../../assets/animations/timer.json";
import congratAnim from "../../assets/animations/medal_congrats.json";
import circleProgress from "../../assets/animations/circle_progress.json";
import successAnim from "../../assets/animations/success_animation.json";
import paymentAnim from "../../assets/animations/payment_success.json";
import avatarAnim from "../../assets/animations/avatar2.json";
import waitingAnin from "../../assets/animations/please_wait.json";

import colors from "../helpers/colors";

const LottieAnimator = ({
  autoPlay = true,
  visible = true,
  style,
  size = 100,
  contStyle,
  loop = true,
  onAnimationFinish,
  wTransparent = false,
  animRef,
  name = "loading",
  progress,
  absolute = false,
  ...otherProps
}) => {
  if (!visible) return;
  let lottieAnim,
    colorFilters = [],
    otherStyles = {};

  let SIZE = size,
    styleObj = { ...style };
  if (Platform.OS === "web" && name === "loading") {
    SIZE = 60;
    styleObj.width = 60;
    styleObj.height = 60;
  }

  switch (name) {
    case "welcome":
      lottieAnim = bookPeopleAnim;
      break;
    case "avatar":
      lottieAnim = avatarAnim;
      colorFilters = [
        { keypath: "Body", color: colors.primaryLight },
        { keypath: "Circle", color: colors.primaryLight },
        { keypath: "Head", color: colors.primaryLight },
      ];
      break;
    case "success":
      lottieAnim = successAnim;
      break;
    case "payment":
      lottieAnim = paymentAnim;
      break;
    case "student_hi":
      lottieAnim = studentHiAnim;
      break;
    case "student_jumping":
      lottieAnim = studentJumpingAnim;
      break;
    case "person_float":
      lottieAnim = personFloat;
      break;
    case "progress":
      lottieAnim = progressAnim;
      break;
    case "waiting":
      lottieAnim = waitingAnin;
      colorFilters = [
        { keypath: "top sand", color: colors.primaryDeep },
        { keypath: "bottom sand 2", color: colors.primary },
        { keypath: "filler path", color: colors.primaryLight },
        { keypath: "botter", color: colors.primaryLight },
        { keypath: "top fill", color: colors.primaryDeep },
        { keypath: "bottom fill", color: colors.primaryDeep },
        { keypath: "cristal", color: "red" },
      ];
      break;
    case "timer":
      lottieAnim = timerAnim;
      break;
    case "congrats":
      lottieAnim = congratAnim;
      break;
    case "circle_progress":
      lottieAnim = circleProgress;
      colorFilters = [
        { keypath: "minute", color: colors.primaryLighter },
        { keypath: "track", color: colors.accentDeep },
      ];
      break;

    default:
      lottieAnim = loadingAnim;
      colorFilters = [
        { keypath: "#dot01", color: colors.primaryDeep },
        { keypath: "#dot02", color: colors.primary },
        { keypath: "#dot03", color: colors.primaryLight },
      ];
      break;
  }

  if (wTransparent) {
    otherStyles = {
      // backgroundColor: "black",
      backgroundColor: "rgba(255,255,255,0.6)",
    };
  }

  return (
    <View
      style={[
        absolute ? { ...styles.absolute, ...otherStyles } : styles.container,
        contStyle,
      ]}
    >
      <LottieView
        source={lottieAnim}
        colorFilters={colorFilters}
        ref={animRef}
        loop={loop}
        progress={progress}
        autoPlay={autoPlay}
        onAnimationFinish={onAnimationFinish}
        style={[{ width: SIZE, height: SIZE }, styleObj]}
        // style={styles.lottie}
        {...otherProps}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  absolute: {
    position: "absolute",
    right: 0,
    left: 0,
    bottom: 0,
    top: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
    borderRadius: 20,
  },
  container: { flex: Platform.OS === "web" ? 1 : null },

  lottie: {
    width: 50,
    height: 500,
    backgroundColor: "red",
  },
});

export default LottieAnimator;
