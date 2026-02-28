import { Dimensions, Pressable, StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import colors from "../helpers/colors";
import { ProgressBar } from "./AppDetails";
import AnimatedPressable from "./AnimatedPressable";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("screen");

const TopicItem = ({ data, index, subject, disabled = false, onPress }) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      //  ("Questions", { ...data, subject });
      router.push({
        pathname: "/main/study",
        params: {
          topicId: data?._id,
          topicName: data?.name,
          subjectName: subject?.name,
          subjectId: subject?._id,
        },
      });
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
          <AppText style={styles.title} fontWeight="semibold">
            {data?.name}
          </AppText>
          {/* <AppText size={"xxsmall"} fontWeight="light">
            {data?.answeredNum}/{data?.questionsNum}
          </AppText> */}
        </View>
        <ProgressBar
          barHeight={12}
          value={data?.qBankQuestions}
          max={data?.totalQuestions >= 1 ? data?.totalQuestions : 1}
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
    boxShadow: `2px 5px 8px ${colors.primary}25`,

    // elevation: 2,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    paddingBottom: 20,
  },
  main: {
    flex: 1,
  },
  number: {
    backgroundColor: colors.primary + 40,
    // width: 35,
    // height: 35,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    borderBottomWidth: 3,
    padding: 7,
    paddingHorizontal: 12,
  },

  numberText: {
    color: colors.primaryDeeper,
  },
  rowWide: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginRight: 8,
    marginBottom: 10,
  },
  title: {
    width: "90%",
    textTransform: "capitalize",
  },
});
