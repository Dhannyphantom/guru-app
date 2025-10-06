import { Dimensions, Pressable, StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import colors from "../helpers/colors";
import { ProgressBar } from "./AppDetails";
import { useNavigation } from "@react-navigation/native";
import AnimatedPressable from "./AnimatedPressable";

const { width, height } = Dimensions.get("screen");

const TopicItem = ({ data, index, subject, disabled = true, onPress }) => {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate("Questions", { ...data, subject });
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      disabled={disabled}
      style={styles.container}
    >
      <View style={styles.number}>
        <AppText style={styles.numberText} fontWeight="heavy" size={"xxlarge"}>
          {index + 1}
        </AppText>
      </View>
      <View style={styles.main}>
        <View style={styles.rowWide}>
          <AppText style={styles.title} fontWeight="medium">
            {data?.name}
          </AppText>
          {/* <AppText size={"xxsmall"} fontWeight="light">
            {data?.answeredNum}/{data?.questionsNum}
          </AppText> */}
        </View>
        <ProgressBar
          barHeight={12}
          value={data?.answeredNum}
          max={data?.questionsNum}
          hideProgressText
          style={{ marginTop: 10 }}
        />
      </View>
    </AnimatedPressable>
  );
};

export default TopicItem;

const styles = StyleSheet.create({
  container: {
    width: width * 0.95,
    backgroundColor: colors.unchange,
    flexDirection: "row",
    marginBottom: 15,
    alignSelf: "center",
    elevation: 2,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    paddingBottom: 20,
  },
  main: {
    flex: 1,
  },
  number: {
    backgroundColor: colors.primaryDeeper,
    width: 35,
    height: 35,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },

  numberText: {
    color: colors.white,
  },
  rowWide: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginRight: 8,
    marginBottom: 10,
  },
  title: {
    textTransform: "capitalize",
  },
});
