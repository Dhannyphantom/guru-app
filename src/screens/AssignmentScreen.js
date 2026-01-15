import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

import AppText from "../components/AppText";
import AppHeader from "../components/AppHeader";
import { assignmentsArr } from "../helpers/dataStore";
import Avatar from "../components/Avatar";
import {
  capFirstLetter,
  dateFormatter,
  getFullName,
} from "../helpers/helperFunctions";
import colors from "../helpers/colors";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import Counter from "../components/Counter";
import { ProgressBar } from "../components/AppDetails";
import { selectSchool, useFetchAssignmentsQuery } from "../context/schoolSlice";
import LottieAnimator from "../components/LottieAnimator";
import { useRouter } from "expo-router";
import ListEmpty from "../components/ListEmpty";
import AppButton from "../components/AppButton";
import { useState } from "react";
import getRefresher from "../components/Refresher";

const { width, height } = Dimensions.get("screen");
const ITEM_WIDTH = width * 0.75;

const RenderItem = ({ item, index }) => {
  const router = useRouter();
  let bgColor, txtColor, borderColor;
  // let stats = "accepted";
  switch (item?.userStatus) {
    case "submitted":
      bgColor = colors.white;
      borderColor = colors.extraLight;
      txtColor = colors.medium;

      break;
    case "failed":
      bgColor = colors.heart;
      borderColor = colors.heartDark;
      txtColor = colors.heartLighter;
      break;
    case "passed":
      bgColor = colors.primary;
      borderColor = colors.primaryDeeper;
      txtColor = colors.primaryLighter;
      break;
    case "pending":
      bgColor = colors.warning + 40;
      borderColor = colors.warning;
      txtColor = colors.warningDark;
      break;
  }

  // ("Solve", { item })

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/school/solve",
          params: { item: JSON.stringify(item) },
        })
      }
      style={styles.assItem}
    >
      <View style={styles.number}>
        <AppText style={styles.numberText} fontWeight="black" size={"small"}>
          {index + 1}
        </AppText>
      </View>
      <View style={styles.assItemDetail}>
        <AppText
          fontWeight="bold"
          numberOfLines={1}
          ellipsizeMode="tail"
          style={styles.assItemTitle}
        >
          {item.title}
        </AppText>
        <AppText style={styles.assItemExp}>
          Due {dateFormatter(item.expiry, "future")}
        </AppText>
        <View
          style={[
            styles.assItemStat,
            { backgroundColor: bgColor, borderColor },
          ]}
        >
          <AppText style={{ ...styles.assItemStatTxt, color: txtColor }}>
            {item.userStatus}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
};

const RenderAssignment = ({ item, index }) => {
  return (
    <View style={styles.ass}>
      <View style={styles.assHeader}>
        <Avatar source={item?.teacher?.avatar?.image} />
        <View style={styles.assHeadDetail}>
          <AppText fontWeight="bold" style={styles.name} size={"large"}>
            {item?.teacher?.preffix} {getFullName(item?.teacher)}
          </AppText>
          {/* <AppText size={"small"} fontWeight="medium" style={styles.assSubj}>
            {item?.subject} Teacher
          </AppText> */}
          <AppText style={styles.assStat}>
            {item?.pendingCount} pending assignments
          </AppText>
        </View>
      </View>
      <View style={styles.assList}>
        <FlatList
          data={item?.list}
          contentContainerStyle={{ paddingHorizontal: 15 }}
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          scrollEventThrottle={16}
          snapToAlignment="start"
          decelerationRate={0.7}
          snapToInterval={ITEM_WIDTH}
          horizontal
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <RenderItem index={index} item={item} />
          )}
        />
      </View>
    </View>
  );
};

const TeacherAssignment = ({ item, index }) => {
  const isActive = item?.status === "ongoing";
  const router = useRouter();
  let statStyle = {};

  if (!isActive) {
    statStyle = {
      color: colors.medium,
      backgroundColor: colors.extraLight,
    };
  }
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/school/assignment/students",
          params: { item: JSON.stringify(item) },
        })
      }
      style={styles.teacher}
    >
      <Counter count={index + 1} />
      <View style={styles.teacherMain}>
        <AppText size={"large"} fontWeight="heavy">
          {item.title}
        </AppText>
        <AppText fontWeight="bold" style={{ color: colors.medium }}>
          {capFirstLetter(item.subject?.name)}
        </AppText>
        <AppText
          fontWeight="bold"
          size={"xsmall"}
          style={{ ...styles.teacherStat, ...statStyle }}
        >
          {item.status}
        </AppText>
        {isActive && (
          <View style={styles.teacherStats}>
            <AppText
              size={"small"}
              fontWeight="medium"
              style={{ color: colors.medium }}
            >
              Class:{" "}
              <AppText
                fontWeight="bold"
                style={{
                  color: colors.primaryDeep,
                  textTransform: "uppercase",
                }}
              >
                {item?.classes?.join(", ")}
              </AppText>
            </AppText>
            <AppText
              size={"small"}
              fontWeight="medium"
              style={{ color: colors.medium }}
            >
              Date Given:{" "}
              <AppText fontWeight="bold" style={{ color: colors.primaryDeep }}>
                {dateFormatter(item.date, "fullDate")}
              </AppText>
            </AppText>
            <AppText
              size={"small"}
              fontWeight="medium"
              style={{ color: colors.medium }}
            >
              Date of Submission:{" "}
              <AppText fontWeight="bold" style={{ color: colors.primaryDeep }}>
                {capFirstLetter(dateFormatter(item.expiry, "fullDate"))}
              </AppText>
            </AppText>
            <AppText
              size={"small"}
              fontWeight="medium"
              style={{ color: colors.medium }}
            >
              Submissions:{" "}
              <AppText fontWeight="bold" style={{ color: colors.primaryDeep }}>
                {item?.submissionsCount}
                <AppText
                  size={"xxsmall"}
                  fontWeight="bold"
                  style={{ color: colors.medium }}
                >
                  /{item?.total}
                </AppText>
              </AppText>
            </AppText>
            <ProgressBar
              value={item?.submissionsCount}
              max={item?.total}
              style={{ marginTop: 6, width: "100%" }}
              hideProgressText
              barHeight={18}
            />
          </View>
        )}
      </View>
    </Pressable>
  );
};

const AssignmentScreen = () => {
  const user = useSelector(selectUser);
  const school = useSelector(selectSchool);
  const isTeacher = user?.accountType === "teacher";

  const { data, isLoading, refetch } = useFetchAssignmentsQuery(school?._id);

  const [refreshing, setRefreshing] = useState(false);

  const assignments = data?.data;
  const router = useRouter();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (_errr) {
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Assignments" />
      {isTeacher ? (
        <>
          <AppButton
            contStyle={styles.btn}
            title={"Create New Assignment"}
            onPress={() => router.push("/school/assignment/create")}
          />
          <FlatList
            data={assignments}
            keyExtractor={(item) => item._id}
            renderItem={({ item, index }) => (
              <TeacherAssignment index={index} item={item} />
            )}
            refreshControl={getRefresher({ refreshing, onRefresh })}
            ListEmptyComponent={
              <ListEmpty
                vis={!isLoading}
                style={{ height: height * 0.7 }}
                message="You haven't prepared any assignments for your students yet"
              />
            }
            contentContainerStyle={{ paddingBottom: height * 0.125 }}
          />
        </>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingBottom: height * 0.125 }}
          renderItem={({ item, index }) => (
            <RenderAssignment item={item} index={index} />
          )}
          refreshControl={getRefresher({ refreshing, onRefresh })}
          ListEmptyComponent={
            <ListEmpty
              vis={!isLoading}
              style={{ height: height * 0.7 }}
              message="You don't have any assignments data from your teachers"
            />
          }
        />
      )}
      <LottieAnimator visible={isLoading} absolute wTransparent />
      <StatusBar style="dark" />
    </View>
  );
};

export default AssignmentScreen;

const styles = StyleSheet.create({
  ass: {
    width: width * 0.96,
    alignSelf: "center",
    backgroundColor: colors.white,
    // backgroundColor: "#ECF3F8",
    margin: 10,
    marginBottom: 10,
    elevation: 3,
    borderRadius: 15,
  },
  assStat: {
    color: colors.medium,
    marginTop: 6,
  },
  assHeader: {
    flexDirection: "row",
    marginBottom: 5,
    padding: 20,
    alignItems: "center",
  },
  assHeadDetail: {
    flex: 1,
    marginLeft: 12,
  },
  assItem: {
    backgroundColor: colors.unchange,
    // backgroundColor: "#F5F8FA",
    width: ITEM_WIDTH,
    flexDirection: "row",
    marginRight: 15,
    marginBottom: 20,
    padding: 10,
    borderRadius: 6,
  },
  assItemDetail: {
    flex: 1,
  },
  assItemExp: {
    color: colors.medium,
    marginBottom: 5,
  },
  assItemTitle: {
    // width: "70%",
  },
  assItemStat: {
    borderWidth: 1.5,
    borderBottomWidth: 3,
    paddingBottom: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  assItemStatTxt: {
    textTransform: "capitalize",
    marginTop: 1,
  },
  btn: {
    marginHorizontal: 30,
  },
  container: {
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
  name: {
    textTransform: "capitalize",
  },
  teacher: {
    width: width * 0.95,
    alignSelf: "center",
    backgroundColor: colors.white,
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
  },
  teacherMain: {
    marginLeft: 18,
    flex: 1,
  },
  teacherStats: {
    flex: 1,
    marginTop: 10,
  },
  teacherStat: {
    backgroundColor: colors.primaryLighter,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    paddingBottom: 6,
    borderRadius: 50,
    marginTop: 5,
    color: colors.greenDark,
  },
});
