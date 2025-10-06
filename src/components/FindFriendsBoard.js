import { Dimensions, Image, Platform, StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import colors from "../helpers/colors";
import AppButton from "./AppButton";

import cometBgImage from "../../assets/images/comet.jpg";
import handTrophyImage from "../../assets/images/win.png";
import WebLayout from "./WebLayout";

const { width, height } = Dimensions.get("screen");

const FindFriendsBoard = ({ onPress }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <AppText
          style={{
            lineHeight: 28,
            maxWidth: "90%",
            color: "#fff",
          }}
          fontWeight="semibold"
          size={"large"}
        >
          Learn and solve questions together with your friends now
        </AppText>
        <AppButton
          type="white"
          contStyle={styles.btn}
          onPress={onPress}
          title={"Find Friends"}
        />
      </View>
      <Image source={handTrophyImage} style={styles.trophImg} />
      <WebLayout
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "pink",
          alignSelf: null,
          zIndex: -1,
        }}
      >
        <Image
          source={cometBgImage}
          resizeMethod="resize"
          blurRadius={6}
          resizeMode="cover"
          style={{
            position: "absolute",
            width: Platform.OS == "web" ? "100%" : width * 0.95,
            height: 500,
            // bottom: 0,
            // top: 0,
            zIndex: -1,
          }}
        />
      </WebLayout>
    </View>
  );
};

export default FindFriendsBoard;

const styles = StyleSheet.create({
  btn: {
    alignSelf: "flex-start",
    marginBottom: 0,
    marginTop: 20,
  },
  container: {
    width: Platform.OS === "web" ? "45%" : width * 0.95,
    backgroundColor: colors.primary,
    alignSelf: "center",
    padding: 12,
    paddingLeft: 20,
    borderRadius: 16,
    paddingVertical: 20,
    minHeight: height * 0.15,
    height: Platform.OS == "web" ? 250 : null,
    overflow: "hidden",
    elevation: 5,
    flexDirection: "row",
    marginBottom: 20,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  trophImg: {
    width: Platform.OS === "web" ? 150 : width * 0.3,
    height: Platform.OS === "web" ? 150 : width * 0.3,
    alignSelf: "center",
    opacity: 0.7,
  },
});
