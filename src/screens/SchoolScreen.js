/* eslint-disable react-hooks/exhaustive-deps */
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import Screen from "../components/Screen";
import colors from "../helpers/colors";
import AppText from "../components/AppText";
import { Authors } from "../components/AppDetails";
import { schoolActions } from "../helpers/dataStore";
import Avatar from "../components/Avatar";
import AppButton from "../components/AppButton";

import classroomImg from "../../assets/images/online-learning.png";
import resultImg from "../../assets/images/result.png";
import timerImg from "../../assets/images/clock.png";

import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import AppModal from "../components/AppModal";
import ClassModal from "../components/ClassModal";
import { selectUser } from "../context/usersSlice";
import { useSelector } from "react-redux";
import JoinSchool from "../components/JoinSchool";
import SchoolHeader from "../components/SchoolHeader";
import CreateSchool from "../components/CreateSchool";
import Counter from "../components/Counter";
import {
  selectSchool,
  useLazyFetchSchoolQuery,
  useLazyFetchSchoolQuizQuery,
} from "../context/schoolSlice";
import LottieAnimator from "../components/LottieAnimator";
import AnimatedPressable from "../components/AnimatedPressable";
import getRefresher from "../components/Refresher";
import ListEmpty from "../components/ListEmpty";
import { dateFormatter } from "../helpers/helperFunctions";
import Quiz from "../components/Quiz";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("screen");

const ClassMates = ({ data = [] }) => {
  const user = useSelector(selectUser);
  const isTeacher = user?.accountType == "teacher";
  const renderClassmates = ({ item }) => {
    return (
      <View
        style={{
          width: width * 0.33,
          marginBottom: 20,
        }}
      >
        <Avatar
          source={item?.user?.avatar?.image}
          data={item}
          border={{ width: 2, color: colors.lightly }}
          name={`${item?.user?.firstName} ${item?.user?.lastName}`}
          textStyle={{ textTransform: "capitalize" }}
          textFontsize="medium"
          maxWidth={width * 0.2}
          contStyle={{ width: width * 0.26 }}
        />
      </View>
    );
  };

  return (
    <View style={{ marginTop: 30 }}>
      <View style={styles.rowWide}>
        <AppText style={{ marginLeft: 15 }} size={"xlarge"} fontWeight="bold">
          Students
        </AppText>

        {isTeacher && (
          <AnimatedPressable style={styles.filterBtn}>
            <AppText
              fontWeight="bold"
              style={{ color: colors.primary, marginRight: 5 }}
            >
              All
            </AppText>
            <Ionicons
              name="swap-vertical-outline"
              size={16}
              color={colors.medium}
            />
          </AnimatedPressable>
        )}
      </View>
      <View style={styles.classmatesSection}>
        <FlatList
          data={data}
          // data={dummyLeaderboards}
          keyExtractor={(item) => item._id}
          renderItem={renderClassmates}
          ListEmptyComponent={() => (
            <ListEmpty message="Goto your Dashboard and Create Classes for your students now and prompt them to join your school" />
          )}
          numColumns={3}
        />
      </View>
    </View>
  );
};

const TeacherQuiz = ({ item, closeModal, index }) => {
  const router = useRouter();
  let txtColor, txtBg;
  switch (item?.status) {
    case "active":
      txtColor = colors.primaryDeeper;
      txtBg = colors.primaryLighter;
      break;

    default:
      txtColor = colors.medium;
      txtBg = colors.extraLight;
      break;
  }

  const handlePress = () => {
    closeModal && closeModal();
    router.push({
      pathname: "/school/teacher_quiz",
      params: { item: JSON.stringify(item) },
    });
    //  ("TeacherQuiz", { item });
  };

  return (
    <Pressable onPress={handlePress} style={styles.teacherQuiz}>
      <Counter count={index + 1} />
      <View style={styles.tQuizMain}>
        <AppText fontWeight="heavy" size={"xlarge"}>
          {item.title}
        </AppText>
        <AppText size={"large"} fontWeight="heavy" style={styles.tQuizSubj}>
          {item.subject?.name}
        </AppText>
        <View style={[styles.tQuizStat, { backgroundColor: txtBg }]}>
          <Ionicons name="disc" color={txtColor} size={12} />
          <AppText
            fontWeight="bold"
            size={"small"}
            style={{ marginLeft: 4, color: txtColor }}
          >
            {item.status}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
};

const SchoolQuiz = ({ item, onPress }) => {
  let statusText, btnText, iconImg;
  switch (item?.status) {
    case "active":
      statusText = "pending";
      btnText = "START QUIZ";
      iconImg = timerImg;

      break;
    case "result":
      btnText = "SEE RESULT";
      statusText = "result";
      iconImg = resultImg;

      break;
    case "review":
    case "submitted":
      statusText = `quiz ${item?.status}`;
      iconImg = classroomImg;
      break;
  }

  const handlePress = () => {
    if (item?.status == "active") {
      onPress && onPress(item, "start");
    }
  };

  return (
    <View style={styles.modalQuizItem}>
      <Image source={iconImg} style={styles.modalQuizItemImg} />
      <AppText size={20} fontWeight="bold" style={styles.modalQuizItemSbj}>
        {item?.subject?.name} Quiz
      </AppText>
      <AppText size={40} fontWeight="black" style={styles.modalQuizItemStat}>
        {statusText}
      </AppText>
      <View style={styles.separator} />
      <Avatar
        size={width * 0.3}
        source={item?.teacher?.avatar?.image}
        textStyle={styles.modalQuizItemAvatar}
        border={{ width: 2, color: colors.primaryDeep }}
        name={`${item?.teacher?.preffix} ${item?.teacher?.firstName} ${item?.teacher?.lastName}`}
      />
      <AppText fontWeight="bold" style={styles.modalQuizItemDate}>
        {dateFormatter(item.date, "feed")}
      </AppText>
      {item?.status != "review" ? (
        <AppText
          fontWeight="medium"
          size={"large"}
          style={styles.modalQuizItemMsg}
        >
          {item?.title}
        </AppText>
      ) : (
        <AppText
          fontWeight="bold"
          size={"large"}
          style={styles.modalQuizItemRev}
        >
          In review...
        </AppText>
      )}
      {Boolean(btnText) && (
        <AppButton
          style={styles.modalQuizItemBtn}
          title={btnText}
          onPress={handlePress}
        />
      )}
    </View>
  );
};

const SchoolModal = ({ data, closeModal }) => {
  const user = useSelector(selectUser);
  const school = useSelector(selectSchool);
  const isTeacher = user?.accountType === "teacher";
  const router = useRouter();

  const [quizModal, setQuizModal] = useState({ vis: false, data: null });
  const [refreshing, setRefreshing] = useState(false);

  const [fetchSchoolQuiz, { data: quizzes, isLoading }] =
    useLazyFetchSchoolQuizQuery();

  const navigateHistory = () => {
    if (isTeacher) {
      //  ("NewQuiz");
      router.push("/school/new_quiz");
    } else {
      //  ("QuizHistory");
      router.push("/school/quiz_history");
    }
    closeModal();
  };

  const onQuizAction = (item) => {
    setQuizModal({
      vis: true,
      data: {
        view: "quiz",
        type: "school",
        schoolId: school?._id,
        quizId: item?._id,
      },
    });
  };

  const getQuizData = async (refresh) => {
    refresh && setRefreshing(true);
    try {
      await fetchSchoolQuiz({ schoolId: school?._id, type: "detail" });
    } catch (err) {
      console.log(err);
    } finally {
      refresh && setRefreshing(false);
    }
  };

  useEffect(() => {
    getQuizData();
  }, []);

  return (
    <Screen style={styles.modalQuiz}>
      <View style={styles.close}>
        <AppButton
          title={isTeacher ? "New Quiz" : "History"}
          type="white"
          onPress={navigateHistory}
          contStyle={{ marginRight: 10 }}
        />
        <AppButton
          title={"Close"}
          type="warn"
          onPress={closeModal}
          icon={{ left: true, name: "close", color: colors.white }}
        />
      </View>

      {isTeacher ? (
        <View style={styles.list}>
          <FlatList
            data={quizzes?.data}
            refreshControl={getRefresher({
              refreshing,
              onRefresh: getQuizData,
            })}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={() => (
              <ListEmpty
                message={
                  "You don't have any quiz yet.\nCreate one now for your students"
                }
              />
            )}
            contentContainerStyle={{ paddingVertical: 15 }}
            renderItem={({ item, index }) => (
              <TeacherQuiz item={item} closeModal={closeModal} index={index} />
            )}
          />
        </View>
      ) : (
        <FlatList
          data={quizzes?.data}
          refreshControl={getRefresher({ refreshing, onRefresh: getQuizData })}
          // data={schoolQuiz}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={() => (
            <ListEmpty
              message={
                "There are not quiz for you yet.\nWait for your teachers to start one"
              }
            />
          )}
          renderItem={({ item }) => (
            <SchoolQuiz item={item} onPress={onQuizAction} />
          )}
        />
      )}
      <LottieAnimator visible={Boolean(isLoading)} absolute wTransparent />
      <Quiz
        startQuiz={quizModal?.vis}
        data={quizModal?.data}
        setStartQuiz={(bool) => setQuizModal({ vis: bool })}
      />
    </Screen>
  );
};

const SchoolActions = ({ data }) => {
  const router = useRouter();
  const user = useSelector(selectUser);

  const [modal, setModal] = useState({ visible: false, data: null });

  const renderSchoolActions = ({ item }) => {
    const itemCount = data[item?.name?.toLowerCase()] ?? "X";
    if (item.name === "Dashboard" && user?.accountType !== "teacher") {
      return null;
    }
    const handleActionPress = () => {
      if (Boolean(item.nav)) {
        router.push({
          pathname: item?.nav?.screen,
          params: { data: JSON.stringify(item?.nav?.data) },
        });
      } else {
        // open modal
        setModal({ ...modal, visible: true, data: { name: item.name } });
      }
    };

    return (
      <Pressable onPress={handleActionPress} style={styles.action}>
        <View style={[styles.actionImgCont, { backgroundColor: item.bgColor }]}>
          <Image source={item.image} style={styles.actionImg} />
        </View>
        <View style={styles.actionDetail}>
          <AppText style={{ paddingHorizontal: 5 }} fontWeight="heavy">
            {" "}
            {item.name}{" "}
          </AppText>
          {itemCount !== "X" && (
            <AppText
              style={{ ...styles.actionCount, backgroundColor: colors.light }}
              fontWeight="black"
            >
              {itemCount}
            </AppText>
          )}
        </View>
      </Pressable>
    );
  };

  let ModalComponet = SchoolModal;
  switch (modal?.data?.name) {
    case "Classes":
      ModalComponet = ClassModal;

      break;
  }

  return (
    <View>
      <AppText
        style={{ marginBottom: 15, marginLeft: 15 }}
        size={"xlarge"}
        fontWeight="bold"
      >
        My School
      </AppText>
      <FlatList
        data={schoolActions}
        horizontal
        keyExtractor={(item) => item._id}
        showsHorizontalScrollIndicator={false}
        renderItem={renderSchoolActions}
      />
      <AppModal
        visible={modal.visible}
        setVisible={(bool) => setModal({ ...modal, visible: bool })}
        Component={() => (
          <ModalComponet
            data={modal.data}
            closeModal={() => setModal({ ...modal, visible: false })}
          />
        )}
      />
    </View>
  );
};

const SchoolProfile = ({ data, fetchSchoolData }) => {
  const translationY = useSharedValue(0);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchSchoolData();
    } catch (error) {
      console.log(error);
    } finally {
      setRefreshing(false);
    }
  };

  const scrollHandler = useAnimatedScrollHandler((event) => {
    translationY.value = event.contentOffset.y;
  });

  return (
    <>
      <SchoolHeader
        data={{ name: data.name, lga: data.lga, state: data.state }}
        scrollY={translationY}
      />
      <Animated.FlatList
        data={["School"]}
        onScroll={scrollHandler}
        refreshControl={getRefresher({ refreshing, onRefresh })}
        renderItem={() => (
          <View>
            <SchoolActions
              data={{
                quiz: data?.quizCount,
                assignments: data?.assignmentCount,
                classes: data?.classCount,
              }}
            />
            <Authors data={data?.teachers} />
            <ClassMates data={data?.students} />
          </View>
        )}
      />
    </>
  );
};

const SchoolScreen = ({ route }) => {
  const user = useSelector(selectUser);
  const params = JSON.parse(JSON.stringify(route));

  const shouldRefresh = params?.refresh;

  const [bools, setBools] = useState({ loading: true });
  const [fetchSchool, { data: school, isLoading }] = useLazyFetchSchoolQuery();

  const hasJoined = Boolean(
    school?.data && school?.isVerified && school?.data?.subscription?.isActive
  );

  const isStudent = user?.accountType === "student";
  const isTeacher = user?.accountType === "teacher";
  const isPro = ["professional", "manager"].includes(user?.accountType);

  const getSchoolData = async () => {
    try {
      await fetchSchool().unwrap();
    } catch (err) {
      console.log(err);
    } finally {
      setBools({ ...bools, loading: false });
    }
  };

  useEffect(() => {
    getSchoolData();
  }, []);

  useEffect(() => {
    if (shouldRefresh) {
      getSchoolData();
    }
  }, [route]);

  return (
    <View style={styles.container}>
      {(isStudent || isTeacher) && hasJoined && (
        <SchoolProfile data={school?.data} fetchSchoolData={getSchoolData} />
      )}
      {isStudent && !hasJoined && (
        <JoinSchool schoolData={school?.data} fetchSchoolData={getSchoolData} />
      )}
      {isTeacher && !hasJoined && (
        <CreateSchool
          schoolData={school?.data}
          fetchSchoolData={getSchoolData}
        />
      )}
      {isPro && (
        <View style={styles.main}>
          <LottieAnimator name="person_float" size={width * 0.8} />
          <AppText
            fontWeight="black"
            style={{ color: colors.medium }}
            size={"large"}
          >
            You do not have access to this screen
          </AppText>
          <AppText
            fontWeight="black"
            style={{ color: colors.medium, marginTop: 8 }}
            size={"small"}
          >
            Goto to your Profile screen to access Pro Features
          </AppText>
        </View>
      )}
      <LottieAnimator
        visible={isLoading || bools.loading}
        wTransparent
        absolute
      />
      <StatusBar style="dark" />
    </View>
  );
};

export default SchoolScreen;

const styles = StyleSheet.create({
  action: {
    minWidth: width * 0.3,
    backgroundColor: colors.white,
    // height: height * 0.25,
    marginHorizontal: 10,
    borderRadius: 35,
    paddingTop: 10,
    elevation: 2,
    marginBottom: 20,
  },
  actionImgCont: {
    width: width * 0.25,
    height: width * 0.25,
    justifyContent: "center",
    alignSelf: "center",
    alignItems: "center",
    elevation: 1.5,
    borderRadius: 30,
  },
  actionImg: {
    width: "50%",
    height: "50%",
  },
  actionDetail: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  actionCount: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    color: colors.primaryDeeper,
    marginTop: 8,
  },
  container: {
    flex: 1,
    backgroundColor: colors.unchange,
  },
  classmatesSection: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopStartRadius: 30,
    borderTopEndRadius: 30,
    paddingHorizontal: 15,
    paddingTop: 20,
    paddingBottom: height * 0.11,
    marginBottom: 120,
  },
  close: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginRight: 15,
  },
  filterBtn: {
    paddingRight: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  list: {
    width: width * 0.96,
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 20,
    alignSelf: "center",
  },
  main: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: height * 0.15,
  },
  modalQuiz: {
    width,
    alignItems: "center",
    marginTop: 10,
    minHeight: height * 0.5,
    backgroundColor: "white",
  },
  modalQuizItem: {
    width: width * 0.94,
    borderRadius: 15,
    minHeight: height * 0.5,
    backgroundColor: colors.white,
    marginBottom: 15,
    elevation: 6,
    alignItems: "center",
    marginHorizontal: 10,
    marginTop: 10,
    paddingTop: 30,
  },
  modalQuizItemImg: {
    width: width * 0.25,
    height: width * 0.25,
  },
  modalQuizItemSbj: {
    marginTop: 15,
    color: colors.medium,
    textTransform: "capitalize",
  },
  modalQuizItemStat: {
    textTransform: "uppercase",
    color: colors.primary,
  },
  modalQuizItemAvatar: {
    width: width * 0.5,
    marginBottom: 15,
  },
  modalQuizItemDate: {
    color: colors.medium,
  },
  modalQuizItemRev: {
    color: colors.primaryDeeper,
    marginBottom: 25,
    marginTop: 20,
    textTransform: "capitalize",
  },
  modalQuizItemMsg: {
    textAlign: "center",
    marginBottom: 20,
    marginTop: 20,
  },
  rowWide: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  separator: {
    height: 3,
    width: "100%",
    backgroundColor: colors.extraLight,
    marginVertical: 30,
  },
  teacherQuiz: {
    backgroundColor: colors.light,
    flexDirection: "row",
    width: width * 0.9,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    alignSelf: "center",
    elevation: 1,
  },
  tQuizMain: {
    marginLeft: 10,
    flex: 1,
    marginRight: 15,
  },
  tQuizSubj: {
    marginTop: 10,
    color: colors.medium,
    textTransform: "capitalize",
  },
  tQuizStat: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "red",
    borderRadius: 50,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
    marginTop: 5,
  },
});
