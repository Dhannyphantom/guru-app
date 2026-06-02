/* eslint-disable react-hooks/exhaustive-deps */
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import React, { useCallback, useEffect, memo, useMemo, useState } from "react";

import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import colors from "../helpers/colors";
import AppText from "../components/AppText";
import { Authors } from "../components/AppDetails";
import { PAD_BOTTOM, schoolActions } from "../helpers/dataStore";
import Avatar from "../components/Avatar";
import AppButton from "../components/AppButton";

import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
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
  useFetchSchoolQuery,
  useLazyFetchSchoolQuizQuery,
} from "../context/schoolSlice";
import LottieAnimator from "../components/LottieAnimator";
import AnimatedPressable from "../components/AnimatedPressable";
import getRefresher from "../components/Refresher";
import ListEmpty from "../components/ListEmpty";
import { dateFormatter } from "../helpers/helperFunctions";
import { useRouter } from "expo-router";
import PopMessage from "../components/PopMessage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppHeader from "../components/AppHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppTutorial from "../components/AppTutorial";
import {
  LeaveSchoolModal,
  FlagStudentModal,
} from "../components/LeaveFlagModals";

const { width, height } = Dimensions.get("screen");

const TOUR_KEY_PROFILE_STUDENT = "guru_school_profile_student_tour_seen";
const TOUR_KEY_PROFILE_TEACHER = "guru_school_profile_teacher_tour_seen";

// ─────────────────────────────────────────────────────────────────────────────
// ClassMates
// ─────────────────────────────────────────────────────────────────────────────
const ClassMates = ({ data = [], setLeaveModalVis, onFlagStudent }) => {
  const user = useSelector(selectUser);
  const isTeacher = user?.accountType === "teacher";

  const renderClassmates = ({ item }) => {
    const isOwnCard = item?.user?._id === user?._id;

    return (
      <View style={{ width: width * 0.33, marginBottom: 20 }}>
        <Avatar
          source={item?.user?.avatar?.image}
          data={item}
          userID={item?.user?._id}
          border={{ width: 2, color: colors.lightly }}
          name={`${item?.user?.firstName} ${item?.user?.lastName}`}
          textStyle={{ textTransform: "capitalize" }}
          textFontsize="medium"
          maxWidth={width * 0.2}
          contStyle={{ width: width * 0.26 }}
        />
        {!isOwnCard && (
          <Pressable
            onPress={() => onFlagStudent?.(item?.user)}
            hitSlop={8}
            style={styles.flagBtn}
          >
            <Ionicons name="flag-outline" size={14} color={colors.medium} />
          </Pressable>
        )}
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
        {user?.accountType === "student" && (
          <Pressable
            onPress={() => setLeaveModalVis(true)}
            style={styles.leaveBtn2}
          >
            <Ionicons name="exit-outline" size={18} color={colors.heart} />
            <AppText
              fontWeight="bold"
              size="medium"
              style={{ color: colors.heart, marginLeft: 8 }}
            >
              Leave School
            </AppText>
          </Pressable>
        )}
      </View>
      <View style={styles.classmatesSection}>
        <FlatList
          data={data}
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

// ─────────────────────────────────────────────────────────────────────────────
// TeacherQuiz
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// SchoolQuiz
// ─────────────────────────────────────────────────────────────────────────────
const SchoolQuiz = ({ item, onPress }) => {
  let statusText, btnText, badgeColor, badgeBg;

  switch (item?.status) {
    case "active":
      statusText = "Pending";
      btnText = "Start Quiz";
      badgeColor = colors.primaryDeeper;
      badgeBg = colors.primaryLighter;
      break;
    case "result":
      statusText = "Result";
      btnText = "See Result";
      badgeColor = colors.success;
      badgeBg = colors.successLight;
      break;
    case "review":
    case "submitted":
      statusText = "Submitted";
      badgeColor = colors.warning;
      badgeBg = colors.warningLight + 30;
      break;
  }

  const handlePress = () => {
    if (item?.status === "active") onPress?.(item, "start");
  };

  return (
    <View style={styles.quizCard} onPress={handlePress}>
      <View style={styles.quizHeader}>
        <View style={styles.quizIconCont}>
          <Image source={item?.subject?.image} style={styles.quizIcon} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText
            fontWeight="heavy"
            style={{ textTransform: "capitalize" }}
            size="large"
          >
            {item?.subject?.name}
          </AppText>
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <AppText
              size="small"
              fontWeight="bold"
              style={{ color: badgeColor }}
            >
              {statusText}
            </AppText>
          </View>
        </View>
        {Boolean(btnText) && (
          <AppButton
            title={btnText}
            contStyle={styles.quizBtn}
            onPress={handlePress}
          />
        )}
      </View>
      <View style={styles.quizTeacherRow}>
        <Avatar
          size={40}
          source={item?.teacher?.avatar?.image}
          border={{ width: 1, color: colors.primaryDeep }}
        />
        <View style={{ marginLeft: 10 }}>
          <AppText
            fontWeight="bold"
            style={{ textTransform: "capitalize" }}
            size="small"
          >
            {item?.teacher?.preffix} {item?.teacher?.firstName}{" "}
            {item?.teacher?.lastName}
          </AppText>
          <AppText size="xsmall" style={{ color: colors.medium }}>
            {dateFormatter(item.date, "feed")}
          </AppText>
        </View>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <AppText
            fontWeight="medium"
            size="small"
            style={{ color: colors.medium }}
          >
            Quiz Title
          </AppText>
          <AppText fontWeight="bold" size="large" style={styles.quizTitle}>
            {item?.title}
          </AppText>
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SchoolModal
// ─────────────────────────────────────────────────────────────────────────────
export const SchoolModal = () => {
  const user = useSelector(selectUser);
  const school = useSelector(selectSchool);
  const isTeacher = user?.accountType === "teacher";
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [fetchSchoolQuiz, { data: quizzes, isLoading }] =
    useLazyFetchSchoolQuizQuery();

  const navigateHistory = () => {
    if (isTeacher) {
      router.push("/main/new_quiz");
    } else {
      router.push("/school/quiz_history");
    }
  };

  const onQuizAction = (item) => {
    router.push({
      pathname: "/main/session",
      params: {
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
    <View style={styles.modalQuiz}>
      <AppHeader
        title="School Quiz"
        Component={() => (
          <View style={styles.close}>
            <AppButton
              title={isTeacher ? "New Quiz" : "History"}
              type="white"
              onPress={navigateHistory}
              contStyle={{ marginRight: 10 }}
            />
          </View>
        )}
      />
      {isTeacher ? (
        <FlatList
          data={quizzes?.data}
          refreshControl={getRefresher({ refreshing, onRefresh: getQuizData })}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={() => (
            <ListEmpty
              vis={!isLoading}
              message={
                "You don't have any quiz yet.\nCreate one now for your students"
              }
            />
          )}
          contentContainerStyle={{ paddingVertical: 15 }}
          renderItem={({ item, index }) => (
            <TeacherQuiz
              item={item}
              closeModal={() => router.back()}
              index={index}
            />
          )}
        />
      ) : (
        <FlatList
          data={quizzes?.data}
          refreshControl={getRefresher({ refreshing, onRefresh: getQuizData })}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={() => (
            <ListEmpty
              vis={!isLoading}
              message={
                "There are no quizzes for you yet.\nWait for your teachers to start one"
              }
            />
          )}
          renderItem={({ item }) => (
            <SchoolQuiz item={item} onPress={onQuizAction} />
          )}
        />
      )}
      <LottieAnimator visible={Boolean(isLoading)} absolute wTransparent />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SchoolActions
// ─────────────────────────────────────────────────────────────────────────────
const SchoolActions = ({ data, isTeacher }) => {
  const router = useRouter();
  const user = useSelector(selectUser);
  const [modal, setModal] = useState({ visible: false, data: null });

  const visibleActions = useMemo(
    () =>
      schoolActions.filter(
        (item) =>
          !(item.name === "Dashboard" && user?.accountType !== "teacher"),
      ),
    [user?.accountType],
  );

  const handleActionPress = (item) => {
    if (Boolean(item.nav)) {
      router.push({
        pathname: item?.nav?.screen,
        params: { data: JSON.stringify(item?.nav?.data) },
      });
    } else {
      if (item?.name === "Classes" && user?.accountType === "teacher") {
        router.push("/school/classrooms");
        return;
      }
      setModal({ ...modal, visible: true, data: { name: item.name } });
    }
  };

  const renderItem = ({ item }) => {
    const itemCount = data[item?.name?.toLowerCase()] ?? "X";
    return (
      <Pressable onPress={() => handleActionPress(item)} style={styles.action}>
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

  let ModalComponet;
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
        data={visibleActions}
        horizontal
        keyExtractor={(item) => item._id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 4 }}
        renderItem={renderItem}
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

// ─────────────────────────────────────────────────────────────────────────────
// SchoolProfile
// ─────────────────────────────────────────────────────────────────────────────
const SchoolProfile = ({ data, fetchSchoolData }) => {
  const user = useSelector(selectUser);
  const isTeacher = user?.accountType === "teacher";

  const translationY = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [leaveModalVis, setLeaveModalVis] = useState(false);
  const [flagTarget, setFlagTarget] = useState(null);

  const school = useSelector(selectSchool);

  const TOUR_KEY = isTeacher
    ? TOUR_KEY_PROFILE_TEACHER
    : TOUR_KEY_PROFILE_STUDENT;

  // ── Tutorial steps ──────────────────────────────────────────────────────
  const profileTutorialSteps = isTeacher
    ? [
        {
          title: `Welcome to your School! 🏫`,
          text: `Hi ${user?.username}! This is your school's profile page — everything you need to manage your students and run a great academic experience is right here\n\nEnjoy your 3-month access to all premium features!`,
        },
        {
          title: "Your School Tools",
          text: `Swipe through the action tiles to access all features:\n\nDashboard — overview of all school activity\nQuiz — create & launch live quizzes\nAssignments — set tasks and track submissions\nAnnouncements — broadcast messages\nLeaderboard — top-performing students\nClasses — manage classrooms`,
        },
        {
          title: "Your Teaching Team",
          text: "Your fellow teachers are listed in the Teachers section.\nSee who else is part of your school's academic team and collaborate with them.",
        },
        {
          title: "Managing Students",
          text: "All verified students appear in the Students section.\nYou can filter by class and manage which students belong where.\n\nHead to Classes to assign and verify students.",
        },
      ]
    : [
        {
          title: `Welcome to your School! 🏫`,
          text: `Hi ${user?.username}! This is your school's profile page. Everything you need for a great academic year is right here — quizzes, assignments, leaderboards and more!`,
        },
        {
          title: "Not Seeing Your School?",
          text: `If you don't see your school or Guru school details here, it means you haven't completed your profile details.\n\nGo to your Profile tab, complete your details, and you'll be joined to Guru EduTech!`,
        },
        {
          title: "Your School Features",
          text: `Swipe through the action tiles to see everything available:\n\nQuiz — join live quizzes and check your results\nAssignments — submit tasks before the deadline\nAnnouncements — important updates from teachers\nLeaderboard — see where you rank`,
        },
        {
          title: "Your Teachers",
          text: "These are the teachers registered in your school.\nThey will create quizzes and assignments for you — treat them well! 😄",
        },
        {
          title: "Your Classmates",
          text: "See who else has joined your school!\nThe more active everyone is, the more competitive the leaderboard gets.\n\nTap the 🏳 icon on a student to report them if they don't belong here.",
        },
      ];

  // ── Tour lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    const checkTour = async () => {
      // await AsyncStorage.removeItem(TOUR_KEY); // ← for testing purposes, remove in production
      const seen = await AsyncStorage.getItem(TOUR_KEY);
      if (!seen) {
        setTimeout(() => setShowTutorial(true), 800);
      }
    };
    checkTour();
  }, []);

  const handleTutorialDone = async () => {
    setShowTutorial(false);
    await AsyncStorage.setItem(TOUR_KEY, "true");
  };

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleFlagStudent = useCallback((userObj) => {
    setFlagTarget(userObj);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchSchoolData();
    } catch (error) {
      console.log(error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchSchoolData]);

  const Rstyle = useAnimatedStyle(() => {
    const scale = interpolate(
      translationY.value,
      [0, 200],
      [-(insets.top + 60), 0],
      Extrapolation.CLAMP,
    );
    const opaciter = interpolate(
      translationY.value,
      [0, 200],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateY: scale }],
      opacity: opaciter,
    };
  });

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      "worklet";
      translationY.value = event.contentOffset.y;
    },
  });

  const actionData = useMemo(
    () => ({
      quiz: data?.quizCount,
      assignments: data?.assignmentCount,
      classes: data?.classCount,
    }),
    [data?.quizCount, data?.assignmentCount, data?.classCount],
  );

  return (
    <>
      <Animated.View
        style={[styles.headerSticker, { paddingTop: insets.top + 10 }, Rstyle]}
      >
        <Ionicons name="school" color={colors.primary} size={30} />
        <AppText style={styles.headerTxt} fontWeight="heavy" size="large">
          {data?.name}
        </AppText>
      </Animated.View>

      <Animated.FlatList
        data={["School"]}
        onScroll={scrollHandler}
        contentContainerStyle={{ paddingBottom: PAD_BOTTOM }}
        scrollEventThrottle={16}
        refreshControl={getRefresher({ refreshing, onRefresh })}
        ListHeaderComponent={
          <SchoolHeader
            data={{ name: data.name, lga: data.lga, state: data.state }}
            scrollY={translationY}
          />
        }
        renderItem={() => (
          <View>
            <SchoolActions data={actionData} isTeacher={isTeacher} />
            <Authors data={data?.teachers} />
            <ClassMates
              data={data?.students}
              setLeaveModalVis={setLeaveModalVis}
              onFlagStudent={handleFlagStudent}
            />

            <View style={styles.leaveSection}>
              <Pressable
                onPress={() => setLeaveModalVis(true)}
                style={styles.leaveBtn}
              >
                <Ionicons name="exit-outline" size={18} color={colors.heart} />
                <AppText
                  fontWeight="bold"
                  size="medium"
                  style={{ color: colors.heart, marginLeft: 8 }}
                >
                  Leave School
                </AppText>
              </Pressable>
            </View>
          </View>
        )}
      />

      {/* Leave School modal */}
      <LeaveSchoolModal
        visible={leaveModalVis}
        onClose={() => setLeaveModalVis(false)}
        onSuccess={() => {
          setLeaveModalVis(false);
          fetchSchoolData();
        }}
      />

      {/* Flag Student modal */}
      <FlagStudentModal
        visible={Boolean(flagTarget)}
        onClose={() => setFlagTarget(null)}
        school={school}
        targetUser={flagTarget}
      />

      {/* Tutorial modal */}
      <AppTutorial
        visible={showTutorial}
        steps={profileTutorialSteps}
        onDone={handleTutorialDone}
      />
    </>
  );
};

const SchoolProfileMemo = memo(SchoolProfile);

// ─────────────────────────────────────────────────────────────────────────────
// SchoolScreen
// ─────────────────────────────────────────────────────────────────────────────
const SchoolScreen = ({ route }) => {
  const user = useSelector(selectUser);
  const shouldRefresh = route?.refresh === "true";

  const [popData, setPopData] = useState({ vis: false });
  const { data: school, isLoading, refetch } = useFetchSchoolQuery();

  const hasJoined = Boolean(
    school?.data && school?.isVerified && school?.data?.subscription?.isActive,
  );

  const isStudent = user?.accountType === "student";
  const isTeacher = user?.accountType === "teacher";
  const isPro = ["professional", "manager"].includes(user?.accountType);

  const getSchoolData = async () => {
    try {
      await refetch().unwrap();
    } catch (_err) {}
  };

  useEffect(() => {
    getSchoolData();
  }, []);

  useEffect(() => {
    if (shouldRefresh) getSchoolData();
  }, [route]);

  return (
    <View style={styles.container}>
      {(isStudent || isTeacher) && hasJoined && (
        <SchoolProfileMemo
          data={school?.data}
          fetchSchoolData={getSchoolData}
        />
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
      <LottieAnimator visible={isLoading} wTransparent absolute />
      <PopMessage popData={popData} setPopData={setPopData} />
      <StatusBar style="dark" />
    </View>
  );
};

export default SchoolScreen;

const styles = StyleSheet.create({
  action: {
    minWidth: width * 0.3,
    backgroundColor: colors.white,
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
  actionImg: { width: "50%", height: "50%" },
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
  close: { marginTop: 5, marginRight: 15 },
  filterBtn: {
    paddingRight: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTxt: { textTransform: "capitalize" },
  headerSticker: {
    backgroundColor: colors.white,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 400,
    alignItems: "center",
    gap: 8,
    flexDirection: "row",
    padding: 15,
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
    minHeight: height * 0.5,
  },
  leaveSection: {
    alignItems: "center",
    paddingVertical: 20,
  },
  leaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: colors.heart + "50",
    backgroundColor: colors.heart + "0A",
  },
  leaveBtn2: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    marginRight: 10,
    borderColor: colors.heart + "50",
    backgroundColor: colors.heart + "0A",
  },
  flagBtn: {
    position: "absolute",
    bottom: 22,
    right: 6,
    backgroundColor: colors.extraLight,
    borderRadius: 20,
    padding: 4,
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
  quizCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 15,
    marginVertical: 8,
    boxShadow: `2px 8px 18px ${colors.primary}25`,
    width: width * 0.9,
  },
  quizHeader: { flexDirection: "row", alignItems: "center" },
  quizIconCont: {
    width: 55,
    height: 55,
    borderRadius: 12,
    backgroundColor: colors.extraLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  quizIcon: { width: 30, height: 30 },
  badge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
    alignSelf: "flex-start",
  },
  quizTeacherRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
  },
  quizTitle: {},
  quizBtn: { marginTop: 15 },
  teacherQuiz: {
    backgroundColor: colors.light,
    flexDirection: "row",
    width: width * 0.92,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    marginHorizontal: width * 0.1,
    alignSelf: "center",
    boxShadow: `2px 8px 18px ${colors.primary}25`,
  },
  tQuizMain: { marginLeft: 10, flex: 1, marginRight: 15 },
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
