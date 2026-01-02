import { Dimensions, StyleSheet, Text, View } from "react-native";
import React from "react";
import colors from "../helpers/colors";
import Avatar from "./Avatar";
import AppText from "./AppText";
import AppButton from "./AppButton";
import { getFullName } from "../helpers/helperFunctions";
import Animated, { LinearTransition } from "react-native-reanimated";
import { enterAnim, exitingAnim } from "../helpers/dataStore";

const { width, height } = Dimensions.get("screen");

export default function Invited({ data, onPress }) {
  if (!data) return null;

  return (
    <Animated.View
      entering={enterAnim}
      exiting={exitingAnim}
      layout={LinearTransition}
      style={styles.container}
    >
      <Avatar
        size={70}
        contStyle={{ padding: 15 }}
        source={data?.host?.avatar}
        name={getFullName(data?.host, true)}
      />
      <View style={styles.main}>
        <AppText
          size="xlarge"
          fontWeight="heavy"
          style={{ color: colors.primary }}
        >
          Quiz Invite!!!
        </AppText>
        <AppText style={styles.text}>
          {data?.host?.username} sent you a quiz invite{" "}
        </AppText>
        <View style={styles.btns}>
          <AppButton title={"Accept"} onPress={() => onPress?.("accept")} />
          <AppButton
            title={"Decline"}
            onPress={() => onPress?.("reject")}
            type="warn"
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btns: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  container: {
    backgroundColor: colors.white,
    width: width * 0.9,
    alignSelf: "center",
    padding: 5,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: colors.lightly,
    flexDirection: "row",
  },
  main: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 15,
  },
  text: {
    marginVertical: 10,
    maxWidth: "90%",
  },
});
