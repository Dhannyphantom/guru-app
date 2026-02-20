import { Dimensions, FlatList, StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import AppHeader from "../components/AppHeader";
// import { schoolQuizHistory } from "../helpers/dataStore";
import colors from "../helpers/colors";
import Counter from "../components/Counter";
import {
  selectSchool,
  useFetchUserQuizHistoryQuery,
} from "../context/schoolSlice";
import LottieAnimator from "../components/LottieAnimator";
import ListEmpty from "../components/ListEmpty";
import { useSelector } from "react-redux";
import { dateFormatter } from "../helpers/helperFunctions";

const { width, height } = Dimensions.get("screen");

export const QuizItem = ({ item, index, isAssignment }) => {
  const percent = Math.floor((item.score / item.totalScore) * 100);
  let bgColor, borderColor;
  if (percent < 50) {
    bgColor = colors.heartDeep;
    borderColor = colors.heartLight;
  } else if (percent < 75) {
    bgColor = colors.warningDark;
    borderColor = colors.warningLight;
  } else {
    bgColor = colors.primaryDeep;
    borderColor = colors.primaryLight;
  }
  return (
    <View style={styles.item}>
      <Counter count={index + 1} style={styles.number} size={width * 0.1} />
      <View style={{ flex: 1 }}>
        <AppText
          size={"xlarge"}
          fontWeight="black"
          style={styles.itemHeaderTxt}
        >
          {item.subject}
        </AppText>
        <AppText fontWeight="heavy" style={{ marginBottom: 10 }}>
          {item.quizTitle}
        </AppText>
        <AppText style={styles.itemPropTxt} size={"large"} fontWeight="heavy">
          Teacher:{"  "}
          <AppText fontWeight="medium" style={styles.itemValueTxt}>
            {item.teacher.name}
          </AppText>
        </AppText>
        <AppText style={styles.itemPropTxt} size={"large"} fontWeight="heavy">
          Date:{"  "}
          <AppText fontWeight="medium" style={styles.itemValueTxt}>
            {dateFormatter(item?.sessionDate, "fullDate")}
          </AppText>
        </AppText>
        <AppText style={styles.itemPropTxt} size={"large"} fontWeight="heavy">
          Score:{"  "}
          <AppText fontWeight="medium" style={styles.itemValueTxt}>
            {item.score}/{item.totalScore}
          </AppText>
        </AppText>
      </View>
      <View style={styles.percent}>
        <View
          style={[
            styles.percentView,
            { backgroundColor: bgColor, borderColor },
          ]}
        >
          <AppText
            fontWeight="black"
            size={"xxlarge"}
            style={styles.percentTxt}
          >
            {percent}%
          </AppText>
        </View>
      </View>
    </View>
  );
};

const QuizHistoryScreen = () => {
  const school = useSelector(selectSchool);
  const { data, isLoading, error, isError } = useFetchUserQuizHistoryQuery({
    schoolId: school._id,
  });

  return (
    <View style={styles.container}>
      <AppHeader title="My School Quizzes" />
      {isError && (
        <AppText style={styles.error}>{JSON.stringify(error.message)}</AppText>
      )}
      <FlatList
        data={data?.results ?? []}
        keyExtractor={(item) => item._id ?? item?.sessionId}
        contentContainerStyle={{ paddingBottom: height * 0.12 }}
        ListEmptyComponent={
          <ListEmpty
            vis={!isLoading}
            message={
              "You haven't participated in any school quiz yet\n\nEither participate in one now\nOR\n Inform your teachers to create quiz sessions for your class"
            }
          />
        }
        renderItem={({ item, index }) => <QuizItem index={index} item={item} />}
      />
      <LottieAnimator visible={isLoading} wTransparent absolute />
    </View>
  );
};

export default QuizHistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
  },
  error: {
    textAlign: "center",
    color: colors.heart,
    marginVertical: 10,
  },
  item: {
    width: width * 0.95,
    backgroundColor: colors.unchange,
    marginBottom: 10,
    alignSelf: "center",
    borderRadius: 10,
    elevation: 2,
    flexDirection: "row",
    paddingVertical: 15,
  },
  itemPropTxt: {
    color: colors.medium,
    marginBottom: 5,
  },
  itemValueTxt: {
    textTransform: "capitalize",
  },
  itemHeaderTxt: {
    textTransform: "capitalize",
    color: colors.primaryDeeper,
    // marginBottom: 20,
  },
  number: {
    marginRight: 15,
    marginLeft: 15,
  },
  percent: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  percentView: {
    backgroundColor: colors.primaryDeep,
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    borderWidth: 5,
  },
  percentTxt: {
    color: colors.white,
  },
});
