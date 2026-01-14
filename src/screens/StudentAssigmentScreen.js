import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import AppHeader from "../components/AppHeader";
import AnimatedPressable from "../components/AnimatedPressable";
import { useState } from "react";
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";
import SearchBar from "../components/SearchBar";
import {
  A_DAY,
  assignmentHistory,
  dummyLeaderboards,
  PAD_BOTTOM,
  schoolQuizHistory,
} from "../helpers/dataStore";
import colors from "../helpers/colors";
import Avatar from "../components/Avatar";
import { capFirstLetter, dateFormatter } from "../helpers/helperFunctions";
import { useNavigation } from "@react-navigation/native";
import AppButton from "../components/AppButton";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import PopMessage from "../components/PopMessage";
import { QuizItem } from "./QuizHistoryScreen";
import { TQuizItem } from "./TeacherQuizScreen";
import { useLocalSearchParams, useRouter } from "expo-router";

const { width, height } = Dimensions.get("screen");

const listArr = dummyLeaderboards.map((item, idx) => {
  // const randInt = Math.floor(Math.random() * 5);
  const date = new Date(new Date().getTime() - A_DAY).toISOString();
  if (idx === 0) {
    return {
      name: item.name,
      date,
      grade: { color: colors.primary, text: "A+" },
    };
  } else if (idx == 1) {
    return {
      name: item.name,
      date,
      grade: { color: colors.greenDark, text: "C" },
    };
  } else if (idx == 2) {
    return {
      name: item.name,
      date,
      grade: { color: colors.accent, text: "A" },
    };
  } else if (idx == 3) {
    return {
      name: item.name,
      date,
      grade: { color: colors.accent, text: "A" },
    };
  } else if (idx == 4) {
    return {
      name: item.name,
      date,
      grade: { color: colors.warningDark, text: "B" },
    };
  } else if (idx == 5) {
    return {
      name: item.name,
      date,
      grade: { color: colors.greenDark, text: "C" },
    };
  } else if (idx == 6) {
    return {
      name: item.name,
      date,
      grade: { color: colors.primary, text: "A+" },
    };
  } else {
    return {
      name: item.name,
      date,
    };
  }
});

const ListItem = ({ item, index }) => {
  const router = useRouter();
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/school/assignment/review",
          params: { item: JSON.stringify(item) },
        })
      }
      style={styles.item}
    >
      <View style={styles.itemMain}>
        <AppText fontWeight="black" style={styles.itemCount} size={"xlarge"}>
          {index + 1}
        </AppText>
        <Avatar size={width * 0.12} name={item?.name} horizontal />
      </View>
      <View>
        {item?.grade ? (
          <AppText
            style={{ color: item?.grade?.color, marginRight: 15 }}
            fontWeight="black"
            size={"xxxlarge"}
          >
            {item?.grade?.text}
          </AppText>
        ) : (
          <AppText
            fontWeight="medium"
            style={{ color: colors.medium }}
            size={"xxsmall"}
          >
            {dateFormatter(item?.date, "fullDate")}
          </AppText>
        )}
      </View>
    </Pressable>
  );
};

const StudentAssigmentScreen = () => {
  const route = useLocalSearchParams();
  const routeData = Boolean(route?.item) ? JSON.parse(route?.item) : {};
  const user = useSelector(selectUser);

  const [bools, setBools] = useState({ search: false });
  const [submissions, setSubmissions] = useState(listArr);
  const [popper, setPopper] = useState({ vis: false });

  const isActive = routeData?.status === "ongoing";
  const router = useRouter();

  let statColor = "";
  switch (routeData?.status) {
    case "ongoing":
      statColor = colors.greenDark;
      break;
    case "inactive":
      statColor = colors.medium;
      break;
  }

  const onReleaseScores = () => {
    const checkAll = submissions?.every((item) => Boolean(item.grade));
    if (checkAll) {
      setPopper({
        vis: true,
        msg: "Assignment scores uploaded!",
        type: "success",
      });
    } else {
      setPopper({
        vis: true,
        msg: "Review all student's assignment",
        type: "failed",
        timer: 2000,
      });
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Assignment"
        Component={() => (
          <AnimatedPressable
            onPress={() => setBools({ ...bools, search: !bools.search })}
            style={styles.search}
          >
            <Ionicons name="search" size={25} color={colors.medium} />
          </AnimatedPressable>
        )}
      />
      <View style={styles.main}>
        <View style={{ flex: 1 }}>
          <AppText
            style={{ color: colors.medium }}
            size="small"
            fontWeight="bold"
          >
            TITLE: <AppText fontWeight="heavy">{routeData?.title}</AppText>
          </AppText>
          <AppText
            style={{ marginTop: 5, color: colors.medium }}
            size="small"
            fontWeight="bold"
          >
            SUBMISSION:{" "}
            <AppText fontWeight="heavy">
              {dateFormatter(routeData?.expiry, "fullDate")}
            </AppText>
          </AppText>
          <View style={styles.row}>
            <AppText
              style={{ color: colors.medium }}
              size="small"
              fontWeight="bold"
            >
              STATUS:{" "}
            </AppText>
            <AppText
              fontWeight="heavy"
              style={{
                backgroundColor: statColor + 30,
                color: statColor,
                borderColor: statColor,
                padding: 3,
                paddingHorizontal: 10,
                borderRadius: 20,
                paddingBottom: 6,
                borderWidth: 1.5,
                borderBottomWidth: 3,
              }}
            >
              {routeData?.status}
            </AppText>
          </View>

          <View style={styles.btns}>
            <AppButton
              icon={{ left: true, name: "rocket" }}
              onPress={onReleaseScores}
              type={isActive ? "accent" : "primary"}
              title={isActive ? "Release scores" : "Start Assigment"}
            />
            <AppButton
              title={"Edit Assignment"}
              disabled={isActive}
              onPress={
                () =>
                  router.push({
                    pathname: "/school/assignment/create",
                    params: { isEdit: true, data: JSON.stringify(routeData) },
                  })
                // ("NewQuiz", {
                //   type: "edit",
                //   data: routeData,
                // })
              }
              type="white"
              icon={{ left: true, name: "pencil", color: colors.medium }}
            />
          </View>
        </View>
        <Avatar name={user?.username} />
      </View>
      {bools.search && (
        <Animated.View
          entering={FadeInDown.springify().damping(20)}
          exiting={FadeOutUp.springify().damping(20)}
        >
          <SearchBar
            // searchRef={searchRef}
            placeholder="Search your student by name..."
          />
        </Animated.View>
      )}
      {isActive && (
        <Animated.FlatList
          layout={LinearTransition.damping(20)}
          data={listArr}
          renderItem={({ item, index }) => (
            <ListItem item={item} index={index} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={{ paddingBottom: PAD_BOTTOM }}
        />
      )}
      {!isActive && (
        <View style={styles.history}>
          <AppText
            fontWeight="heavy"
            size={"large"}
            style={{ marginLeft: 15, marginBottom: 10 }}
          >
            Assignment History
          </AppText>

          <FlatList
            data={assignmentHistory}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ paddingBottom: PAD_BOTTOM }}
            renderItem={({ item, index }) => (
              <TQuizItem item={item} index={index} isAssignment={true} />
            )}
          />
        </View>
      )}
      <PopMessage popData={popper} setPopData={setPopper} />
    </View>
  );
};

export default StudentAssigmentScreen;

const styles = StyleSheet.create({
  btns: {
    width: "65%",
    marginTop: 8,
  },
  container: {
    flex: 1,
  },
  history: {
    flex: 1,
    marginTop: 10,
  },
  item: {
    flexDirection: "row",
    backgroundColor: colors.white,
    alignItems: "center",
    paddingHorizontal: 20,
    justifyContent: "space-between",
    paddingVertical: 15,
  },
  itemCount: {
    marginRight: 15,
  },
  itemMain: {
    flexDirection: "row",
    alignItems: "center",
  },
  main: {
    flexDirection: "row",
    backgroundColor: colors.white,
    justifyContent: "space-between",
    marginHorizontal: 15,
    borderRadius: 15,
    padding: 15,
    paddingBottom: 0,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
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
