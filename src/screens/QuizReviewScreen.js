import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import { getGradeData, gradesArr } from "../helpers/dataStore";
import AppHeader from "../components/AppHeader";
import Avatar from "../components/Avatar";
import colors from "../helpers/colors";
import AnimatedPressable from "../components/AnimatedPressable";
import { useRef, useState } from "react";
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  runOnJS,
  useAnimatedRef,
} from "react-native-reanimated";
import SearchBar from "../components/SearchBar";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  selectSchool,
  useFetchAssignmentHistoryQuery,
  useFetchQuizHistoryQuery,
} from "../context/schoolSlice";
import { useSelector } from "react-redux";
import LottieAnimator from "../components/LottieAnimator";
import { getFullName } from "../helpers/helperFunctions";
import getRefresher from "../components/Refresher";

const { width, height } = Dimensions.get("screen");

const StudentScore = ({ item, index, isAssignment, totalScore }) => {
  const router = useRouter();

  // ("AssignmentReview", { item, uploaded: true })
  return (
    <Pressable
      disabled={!isAssignment}
      onPress={() =>
        router.push({
          pathname: "/school/assignment/review",
          params: { item: JSON.stringify(item), uploaded: true },
        })
      }
      style={styles.item}
    >
      <View style={styles.itemMain}>
        <AppText fontWeight="black" style={styles.itemCount} size={"xxlarge"}>
          {index + 1}
        </AppText>
        <Avatar
          name={item?.name ?? getFullName(item?.student)}
          source={item?.student?.avatar?.image}
          horizontal
        />
      </View>
      <View>
        {isAssignment ? (
          <View style={{ alignItems: "center" }}>
            <AppText
              fontWeight="black"
              size={"xxxlarge"}
              style={{
                marginRight: 10,
                color: getGradeData(item?.score?.value).color,
              }}
            >
              {item?.score?.grade}
            </AppText>
            <AppText
              fontWeight="black"
              // size={"xxxlarge"}
              style={{
                marginRight: 10,
                color: getGradeData(item?.score?.value).color,
              }}
            >
              {item?.score?.value}
            </AppText>
          </View>
        ) : (
          <AppText fontWeight="heavy" size={"xxlarge"}>
            {item.score}
            <AppText
              fontWeight="bold"
              size={"small"}
              style={{ color: colors.medium }}
            >
              /{totalScore}
            </AppText>
          </AppText>
        )}
      </View>
    </Pressable>
  );
};

const QuizReviewScreen = () => {
  const route = useLocalSearchParams();
  const school = useSelector(selectSchool);
  const isAssignment = Boolean(route?.isAssignment);
  const historyId = route?.historyId;

  const assignmentId = route?.assignmentId;

  const { data, isLoading, refetch } = useFetchAssignmentHistoryQuery(
    {
      assignmentId,
      schoolId: school?._id,
      historyId,
    },
    { skip: !isAssignment },
  );

  const {
    data: quizData,
    isLoading: quizLoading,
    refetch: quizRefetch,
  } = useFetchQuizHistoryQuery(
    {
      quizId: assignmentId,
      schoolId: school?._id,
      sessionId: historyId,
    },
    { skip: isAssignment },
  );

  const [bools, setBools] = useState({ search: false });
  const [refreshing, setRefreshing] = useState(false);

  const searchRef = useAnimatedRef(null);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch().unwrap();
    } catch (errr) {
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Student Stats"
        Component={() => (
          <AnimatedPressable
            onPress={() => setBools({ ...bools, search: !bools.search })}
            style={styles.search}
          >
            <Ionicons name="search" size={25} color={colors.medium} />
          </AnimatedPressable>
        )}
      />
      {bools.search && (
        <Animated.View
          entering={FadeInDown.springify()
            .damping(20)
            .withCallback((finished) => {
              if (finished) {
                searchRef?.current?.focus();
              }
            })}
          exiting={FadeOutUp.springify().damping(20)}
        >
          <SearchBar
            searchRef={searchRef}
            placeholder="Search your student by name..."
          />
        </Animated.View>
      )}
      <Animated.FlatList
        layout={LinearTransition.damping(20)}
        data={data?.data?.participants ?? quizData?.students ?? []}
        renderItem={({ item, index }) => (
          <StudentScore
            index={index}
            item={item}
            totalScore={quizData?.totalScore}
            isAssignment={isAssignment}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={getRefresher({ refreshing, onRefresh })}
        contentContainerStyle={{ paddingBottom: height * 0.125 }}
      />
      <LottieAnimator visible={isLoading} wTransparent absolute />
    </View>
  );
};

export default QuizReviewScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    flexDirection: "row",
    backgroundColor: colors.white,
    alignItems: "center",
    paddingHorizontal: 20,
    justifyContent: "space-between",
    paddingVertical: 18,
  },
  itemCount: {
    marginRight: 15,
  },
  itemMain: {
    flexDirection: "row",
    alignItems: "center",
  },
  separator: {
    height: 1.5,
    width: width * 0.5,
    backgroundColor: colors.extraLight,
    alignSelf: "center",
  },
  search: {
    paddingHorizontal: 15,
    paddingVertical: 4,
  },
});
