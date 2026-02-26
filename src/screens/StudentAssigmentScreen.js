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
  // A_DAY,
  // assignmentHistory,
  gradesList,
  PAD_BOTTOM,
  // schoolQuizHistory,
} from "../helpers/dataStore";
import colors from "../helpers/colors";
import Avatar from "../components/Avatar";
import {
  // capFirstLetter,
  dateFormatter,
  getFullName,
} from "../helpers/helperFunctions";
// import { useNavigation } from "@react-navigation/native";
import AppButton, { FormikButton } from "../components/AppButton";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import PopMessage from "../components/PopMessage";
// import { QuizItem } from "./QuizHistoryScreen";
import { TQuizItem } from "./TeacherQuizScreen";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  selectSchool,
  useFetchAssignmentByIdQuery,
  usePublishAssignmentMutation,
  useUpdateAssignmentStatusMutation,
} from "../context/schoolSlice";
import LottieAnimator from "../components/LottieAnimator";
import getRefresher from "../components/Refresher";
import ListEmpty from "../components/ListEmpty";
import { Formik } from "formik";
import { FormikInput } from "../components/FormInput";
import {
  assignmentDateInitials,
  assignmentDateSchema,
} from "../helpers/yupSchemas";
import AppModal from "../components/AppModal";

const { width } = Dimensions.get("screen");

const ListItem = ({ item, assId, index }) => {
  const router = useRouter();

  const gradeData = gradesList.find((grade) => {
    return item?.score?.value >= grade.score && item?.score?.value <= grade.max;
  });

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/school/assignment/review",
          params: { item: JSON.stringify(item), assignmentId: assId },
        })
      }
      style={styles.item}
    >
      <View style={styles.itemMain}>
        <AppText fontWeight="black" style={styles.itemCount} size={"xlarge"}>
          {index + 1}
        </AppText>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Avatar size={width * 0.12} source={item?.student?.avatar?.image} />
          <View>
            <AppText fontWeight="bold" size="large" style={styles.name}>
              {getFullName(item?.student)}
            </AppText>
            <AppText
              fontWeight="medium"
              size="medium"
              style={{ color: colors.medium, textTransform: "uppercase" }}
            >
              {item?.student?.class?.level}
            </AppText>
          </View>
        </View>
      </View>
      <View>
        {item?.score?.value ? (
          <AppText
            style={{ color: gradeData.color, marginRight: 15 }}
            fontWeight="black"
            size={"xxxlarge"}
          >
            {item?.score?.grade}
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

const PickDateModal = ({ closeModal, setPopper, assignmentId, schoolId }) => {
  const [updateAssignmentStatus, { isLoading: updating }] =
    useUpdateAssignmentStatusMutation();
  const handleSubmit = async (fv) => {
    try {
      const res = await updateAssignmentStatus({
        schoolId,
        assignmentId,
        status: "ongoing",
        date: fv?.date,
      }).unwrap();
      if (res?.status === "success") {
        setPopper({
          vis: true,
          msg: "Assignment session started successfully",
          type: "success",
        });
        closeModal?.();
      }
    } catch (errr) {
      setPopper({
        vis: true,
        msg: errr?.message ?? errr?.data?.message ?? "Something went wrong",
        type: "failed",
        timer: 2500,
      });
      closeModal?.();
    }
  };

  const handleCloseModal = () => {
    closeModal?.();
  };

  return (
    <View style={styles.modal}>
      <AppText fontWeight="heavy" size="large" style={styles.modalTitle}>
        Submission Date
      </AppText>
      <Formik
        initialValues={assignmentDateInitials}
        validationSchema={assignmentDateSchema}
        onSubmit={handleSubmit}
      >
        <>
          <FormikInput
            name={"date"}
            placeholder={"Pick Expected Date of Submission"}
            headerText={"Expected Date of Submission:"}
            futureYear={true}
            type="date"
          />
          <FormikButton title={"Start Assignment"} />
          <AppButton
            title={"Cancel Session"}
            type="warn"
            onPress={handleCloseModal}
          />
        </>
      </Formik>
      <LottieAnimator visible={updating} absolute />
    </View>
  );
};

const StudentAssigmentScreen = () => {
  const route = useLocalSearchParams();
  const school = useSelector(selectSchool);
  const routeData = Boolean(route?.item) ? JSON.parse(route?.item) : {};
  const user = useSelector(selectUser);

  const { data, isLoading, refetch } = useFetchAssignmentByIdQuery({
    assignmentId: routeData?._id,
    schoolId: school?._id,
  });
  const [publishAssignment, { isLoading: publishing }] =
    usePublishAssignmentMutation();

  const [bools, setBools] = useState({ search: false, date: false });
  const [popper, setPopper] = useState({ vis: false });
  const [refreshing, setRefreshing] = useState(false);

  const assignment = data?.data;
  const isActive = assignment?.status === "ongoing";
  const isFinished = assignment?.status === "finished";
  const router = useRouter();
  const submissions = assignment?.submissions || [];
  const showSubmisions = ["ongoing", "finished"].includes(assignment?.status);

  let statColor = "";
  switch (assignment?.status) {
    case "ongoing":
      statColor = colors.greenDark;
      break;
    case "finished":
      statColor = colors.warningDark;
      break;
    case "inactive":
      statColor = colors.medium;
      break;
  }

  const onReleaseScores = async () => {
    if (isActive || isFinished) {
      try {
        const res = await publishAssignment({
          schoolId: school?._id,
          assignmentId: assignment?._id,
        }).unwrap();
        if (res?.status === "success") {
          setPopper({
            vis: true,
            msg: res?.message,
            type: "success",
          });
        }
      } catch (errr) {
        setPopper({
          vis: true,
          msg: errr?.message ?? errr?.data?.message ?? "Something went wrong",
          type: "failed",
          timer: 2500,
        });
      }
    } else {
      setBools({ ...bools, date: true });
    }
    // const checkAll = submissions?.every((item) => Boolean(item.grade));
    // if (checkAll) {
    // } else {
    // }
  };

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
        title={`${assignment?.subject?.name} Assignment`}
        Component={() => {
          if (showSubmisions && submissions?.length > 10) {
            return (
              <AnimatedPressable
                onPress={() => setBools({ ...bools, search: !bools.search })}
                style={styles.search}
              >
                <Ionicons name="search" size={25} color={colors.medium} />
              </AnimatedPressable>
            );
          }
        }}
      />
      <View style={styles.main}>
        <View style={{ flex: 1 }}>
          <AppText
            style={{ color: colors.medium }}
            size="small"
            fontWeight="bold"
          >
            TITLE: <AppText fontWeight="heavy">{assignment?.title}</AppText>
          </AppText>
          <AppText
            style={{ marginTop: 5, color: colors.medium }}
            size="small"
            fontWeight="bold"
          >
            SUBMISSION:{" "}
            <AppText fontWeight="heavy">
              {dateFormatter(assignment?.expiry, "fullDate")}
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
              {assignment?.status ?? "status"}
            </AppText>
          </View>

          <View style={styles.btns}>
            <AppButton
              icon={{ left: true, name: "rocket" }}
              onPress={onReleaseScores}
              type={isActive || isFinished ? "accent" : "primary"}
              title={
                isActive || isFinished ? "Release scores" : "Start Assigment"
              }
            />
            <AppButton
              title={"Edit Assignment"}
              disabled={isActive || isFinished}
              onPress={
                () =>
                  router.push({
                    pathname: "/main/new_assignment",
                    params: { isEdit: true, data: JSON.stringify(assignment) },
                  })
                // ("NewQuiz", {
                //   type: "edit",
                //   data: assignment,
                // })
              }
              type="white"
              icon={{ left: true, name: "pencil", color: colors.medium }}
            />
          </View>
        </View>
        <Avatar name={user?.username} source={user?.avatar?.image} />
      </View>
      {bools.search && (
        <Animated.View
          entering={FadeInDown.springify()}
          exiting={FadeOutUp.springify()}
        >
          <SearchBar
            // searchRef={searchRef}
            placeholder="Search your student by name..."
          />
        </Animated.View>
      )}
      <View style={{ flex: 1 }}>
        {showSubmisions && (
          <Animated.FlatList
            layout={LinearTransition.damping(20)}
            data={submissions}
            renderItem={({ item, index }) => (
              <ListItem item={item} assId={assignment?._id} index={index} />
            )}
            refreshControl={getRefresher({ refreshing, onRefresh })}
            ListEmptyComponent={
              <ListEmpty
                vis={!isLoading}
                message={"No student submissions yet"}
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={{ paddingBottom: PAD_BOTTOM }}
          />
        )}
        {!isActive && !isFinished && (
          <View style={styles.history}>
            <AppText
              fontWeight="heavy"
              size={"large"}
              style={{ marginLeft: 15, marginBottom: 10 }}
            >
              Assignment History
            </AppText>

            <FlatList
              data={assignment?.history}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingBottom: PAD_BOTTOM }}
              refreshControl={getRefresher({ refreshing, onRefresh })}
              renderItem={({ item, index }) => (
                <TQuizItem
                  item={item}
                  assId={assignment?._id}
                  index={index}
                  isAssignment={true}
                />
              )}
            />
          </View>
        )}
        <LottieAnimator visible={isLoading || publishing} absolute />
      </View>
      <PopMessage popData={popper} setPopData={setPopper} />
      <AppModal
        Component={() => (
          <PickDateModal
            closeModal={() => setBools({ ...bools, date: false })}
            assignmentId={routeData?._id}
            setPopper={setPopper}
            schoolId={school?._id}
          />
        )}
        visible={bools.date}
        setVisible={() => setBools({ ...bools, date: false })}
      />
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
    flex: 1,
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
    // flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  main: {
    flexDirection: "row",
    backgroundColor: colors.white,
    justifyContent: "space-between",
    marginHorizontal: 15,
    boxShadow: `1px 3px 10px ${colors.primary}35`,
    borderRadius: 15,
    padding: 15,
    paddingBottom: 0,
    marginBottom: 10,
  },
  name: {
    textTransform: "capitalize",
  },
  modal: {
    backgroundColor: colors.white,
    padding: 10,
    borderRadius: 20,
  },
  modalTitle: {
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
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
