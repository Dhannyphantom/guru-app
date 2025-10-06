import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import { dummyLeaderboards, gradesArr } from "../helpers/dataStore";
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
import { useNavigation } from "@react-navigation/native";

const { width, height } = Dimensions.get("screen");

const scoresList = dummyLeaderboards
  .map((item) => {
    const randInt = Math.floor(Math.random() * gradesArr.length);
    return {
      ...item,
      score: Math.floor(Math.random() * 50),
      grade: gradesArr[randInt],
    };
  })
  .sort((a, b) => b.score - a.score);

const StudentScore = ({ item, index, isAssignment }) => {
  const navigation = useNavigation();

  return (
    <Pressable
      disabled={!isAssignment}
      onPress={() =>
        navigation?.navigate("AssignmentReview", { item, uploaded: true })
      }
      style={styles.item}
    >
      <View style={styles.itemMain}>
        <AppText fontWeight="black" style={styles.itemCount} size={"xxlarge"}>
          {index + 1}
        </AppText>
        <Avatar name={item?.name} horizontal />
      </View>
      <View>
        {isAssignment ? (
          <AppText
            fontWeight="black"
            size={"xxxlarge"}
            style={{ marginRight: 10, color: item?.grade?.color }}
          >
            {item?.grade?.text}
          </AppText>
        ) : (
          <AppText fontWeight="heavy" size={"xxlarge"}>
            {item.score}
            <AppText
              fontWeight="bold"
              size={"small"}
              style={{ color: colors.medium }}
            >
              /50
            </AppText>
          </AppText>
        )}
      </View>
    </Pressable>
  );
};

const QuizReviewScreen = ({ route }) => {
  const isAssignment = route?.params?.isAssignment;
  const [bools, setBools] = useState({ search: false });

  const searchRef = useAnimatedRef(null);

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
        data={scoresList}
        renderItem={({ item, index }) => (
          <StudentScore index={index} item={item} isAssignment={isAssignment} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: height * 0.125 }}
      />
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
