/* eslint-disable react/display-name */
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

import { T, TINTS } from "../components/jamb/JambTheme";
import { Chip, JambButton, SectionTitle } from "../components/jamb/JambUI";
import AppText from "../components/AppText";
import { PAD_BOTTOM, schoolActions } from "../helpers/dataStore";
import Avatar from "../components/Avatar";

import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
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

// Only this many students are rendered on the profile screen.
// Everything else lives on the paginated "all students" screen.
export const PREVIEW_LIMIT = 21;

const keyExtractor = (item) => item._id;

// Stable style/prop objects (no new objects per render)
const AVATAR_BORDER = { width: 3, color: T.line };
const CAPITALIZE = { textTransform: "capitalize" };
const AVATAR_CONT = { width: width * 0.26 };

// ─────────────────────────────────────────────────────────────────────────────
// Student grid cell (memoized)
// ─────────────────────────────────────────────────────────────────────────────
const StudentItem = memo(({ item, ownId, onFlag }) => {
  const u = item?.user;
  const isOwnCard = u?._id === ownId;

  return (
    <View style={styles.studentCell}>
      <Avatar
        source={u?.avatar?.image}
        data={item}
        userID={u?._id}
        border={AVATAR_BORDER}
        name={`${u?.firstName} ${u?.lastName}`}
        textStyle={CAPITALIZE}
        textFontsize="medium"
        maxWidth={width * 0.2}
        contStyle={AVATAR_CONT}
      />
      {!isOwnCard && (
        <Pressable onPress={() => onFlag(u)} hitSlop={8} style={styles.flagBtn}>
          <Ionicons name="flag-outline" size={13} color={T.sub} />
        </Pressable>
      )}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// "View all" call-to-action shown under the preview grid
// ─────────────────────────────────────────────────────────────────────────────
const ViewAllButton = memo(({ total, isTeacher, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.viewAll, pressed && { opacity: 0.85 }]}
  >
    <View style={styles.viewAllIcon}>
      <Ionicons name="people" size={22} color={T.yellowInk} />
    </View>
    <View style={{ flex: 1 }}>
      <AppText fontWeight="black" size="medium" style={{ color: T.ink }}>
        {isTeacher
          ? `Browse all ${total} students`
          : `See all ${total} schoolmates`}
      </AppText>
      <AppText size="small" style={{ color: T.sub, marginTop: 2 }}>
        {isTeacher
          ? "Filter by class, search and view stats"
          : "Your class first. Browse other classes too"}
      </AppText>
    </View>
    <View style={styles.viewAllArrow}>
      <Ionicons name="arrow-forward" size={16} color={T.ink} />
    </View>
  </Pressable>
));

// ─────────────────────────────────────────────────────────────────────────────
// TeacherQuiz
// ─────────────────────────────────────────────────────────────────────────────
const TeacherQuiz = memo(({ item, closeModal, index }) => {
  const router = useRouter();
  const isActive = item?.status === "active";
  const txtColor = isActive ? T.greenDark : T.sub;
  const txtBg = isActive ? T.greenSoft : T.track;

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
        <AppText fontWeight="black" size="large" style={{ color: T.ink }}>
          {item.title}
        </AppText>
        <AppText size="medium" fontWeight="bold" style={styles.tQuizSubj}>
          {item.subject?.name}
        </AppText>
        <View style={[styles.tQuizStat, { backgroundColor: txtBg }]}>
          <Ionicons name="disc" color={txtColor} size={12} />
          <AppText
            fontWeight="black"
            size="small"
            style={{
              marginLeft: 4,
              color: txtColor,
              textTransform: "capitalize",
            }}
          >
            {item.status}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SchoolQuiz
// ─────────────────────────────────────────────────────────────────────────────
const SchoolQuiz = memo(({ item, onPress }) => {
  let statusText, btnText, badgeColor, badgeBg;

  switch (item?.status) {
    case "active":
      statusText = "Pending";
      btnText = "Start Quiz";
      badgeColor = T.greenDark;
      badgeBg = T.greenSoft;
      break;
    case "result":
      statusText = "Result";
      btnText = "See Result";
      badgeColor = T.purpleDark;
      badgeBg = T.purpleSoft;
      break;
    case "review":
    case "submitted":
      statusText = "Submitted";
      badgeColor = T.yellowInk;
      badgeBg = T.yellowSoft;
      break;
  }

  const handlePress = () => {
    if (item?.status === "active") onPress?.(item, "start");
  };

  return (
    <View style={styles.quizCard}>
      <View style={styles.quizHeader}>
        <View style={styles.quizIconCont}>
          <Image source={item?.subject?.image} style={styles.quizIcon} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText
            fontWeight="black"
            style={[CAPITALIZE, { color: T.ink }]}
            size="large"
          >
            {item?.subject?.name}
          </AppText>
          <Chip
            label={statusText ?? ""}
            color={badgeColor}
            bg={badgeBg}
            style={{ marginTop: 6 }}
          />
        </View>
        {Boolean(btnText) && (
          <JambButton
            title={btnText}
            small
            icon={item?.status === "active" ? "play" : "eye"}
            variant={item?.status === "active" ? "primary" : "ghost"}
            onPress={handlePress}
          />
        )}
      </View>
      <View style={styles.quizTeacherRow}>
        <Avatar
          size={40}
          source={item?.teacher?.avatar?.image}
          border={{ width: 2, color: T.line }}
        />
        <View style={{ marginLeft: 10 }}>
          <AppText
            fontWeight="bold"
            style={[CAPITALIZE, { color: T.ink }]}
            size="small"
          >
            {item?.teacher?.preffix} {item?.teacher?.firstName}{" "}
            {item?.teacher?.lastName}
          </AppText>
          <AppText size="xsmall" style={{ color: T.sub }}>
            {dateFormatter(item.date, "feed")}
          </AppText>
        </View>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <AppText fontWeight="bold" size="xsmall" style={{ color: T.sub }}>
            Quiz Title
          </AppText>
          <AppText fontWeight="black" size="medium" style={{ color: T.ink }}>
            {item?.title}
          </AppText>
        </View>
      </View>
    </View>
  );
});

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

  const navigateHistory = useCallback(() => {
    router.push(isTeacher ? "/main/new_quiz" : "/school/quiz_history");
  }, [isTeacher]);

  const onQuizAction = useCallback(
    (item) => {
      router.push({
        pathname: "/main/session",
        params: {
          view: "quiz",
          type: "school",
          schoolId: school?._id,
          quizId: item?._id,
        },
      });
    },
    [school?._id],
  );

  const getQuizData = useCallback(
    async (refresh) => {
      refresh && setRefreshing(true);
      try {
        await fetchSchoolQuiz({ schoolId: school?._id, type: "detail" });
      } catch (err) {
        console.log(err);
      } finally {
        refresh && setRefreshing(false);
      }
    },
    [school?._id],
  );

  useEffect(() => {
    getQuizData();
  }, []);

  const closeModal = useCallback(() => router.back(), []);

  const HeaderRight = useCallback(
    () => (
      <View style={styles.close}>
        <JambButton
          title={isTeacher ? "New Quiz" : "History"}
          variant="ghost"
          small
          icon={isTeacher ? "add" : "time"}
          onPress={navigateHistory}
          style={{ marginRight: 10 }}
        />
      </View>
    ),
    [isTeacher, navigateHistory],
  );

  const refreshControl = useMemo(
    () => getRefresher({ refreshing, onRefresh: getQuizData }),
    [refreshing, getQuizData],
  );

  const emptyEl = useMemo(
    () => (
      <ListEmpty
        vis={!isLoading}
        message={
          isTeacher
            ? "You don't have any quiz yet.\nCreate one now for your students"
            : "There are no quizzes for you yet.\nWait for your teachers to start one"
        }
      />
    ),
    [isLoading, isTeacher],
  );

  const renderTeacher = useCallback(
    ({ item, index }) => (
      <TeacherQuiz item={item} closeModal={closeModal} index={index} />
    ),
    [closeModal],
  );
  const renderStudent = useCallback(
    ({ item }) => <SchoolQuiz item={item} onPress={onQuizAction} />,
    [onQuizAction],
  );

  return (
    <View style={styles.modalQuiz}>
      <AppHeader title="School Quiz" Component={HeaderRight} />
      <FlatList
        data={quizzes?.data}
        refreshControl={refreshControl}
        keyExtractor={keyExtractor}
        ListEmptyComponent={emptyEl}
        contentContainerStyle={isTeacher ? { paddingVertical: 15 } : undefined}
        renderItem={isTeacher ? renderTeacher : renderStudent}
        initialNumToRender={6}
        windowSize={7}
      />
      <LottieAnimator visible={Boolean(isLoading)} absolute wTransparent />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SchoolActions
// ─────────────────────────────────────────────────────────────────────────────
const ActionItem = memo(({ item, count, onPress, index }) => {
  const tint = TINTS[index % TINTS.length];
  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.action,
        pressed && { transform: [{ translateY: 2 }] },
      ]}
    >
      <View
        style={[
          styles.actionImgCont,
          { backgroundColor: tint.bg, borderColor: tint.border },
        ]}
      >
        <Image source={item.image} style={styles.actionImg} />
      </View>
      <View style={styles.actionDetail}>
        <AppText style={{ color: T.ink }} fontWeight="black" size="small">
          {item.name}
        </AppText>
        {count != null && (
          <View style={[styles.actionCount, { backgroundColor: tint.bg }]}>
            <AppText
              fontWeight="black"
              size="small"
              style={{ color: tint.ink }}
            >
              {count}
            </AppText>
          </View>
        )}
      </View>
    </Pressable>
  );
});

const SchoolActions = memo(({ data }) => {
  const router = useRouter();
  const accountType = useSelector(selectUser)?.accountType;

  const visibleActions = useMemo(
    () =>
      schoolActions.filter(
        (item) => !(item.name === "Dashboard" && accountType !== "teacher"),
      ),
    [accountType],
  );

  const handleActionPress = useCallback(
    (item) => {
      if (item.nav) {
        router.push({
          pathname: item.nav.screen,
          params: { data: JSON.stringify(item.nav.data) },
        });
        return;
      }
      if (item.name === "Classes") {
        // Teachers manage classrooms; students see their schoolmates
        // (same screen as "See all schoolmates").
        router.push(
          accountType === "teacher" ? "/school/classrooms" : "/school/students",
        );
      }
    },
    [accountType],
  );

  const renderItem = useCallback(
    ({ item, index }) => (
      <ActionItem
        item={item}
        index={index}
        count={data[item?.name?.toLowerCase()]}
        onPress={handleActionPress}
      />
    ),
    [data, handleActionPress],
  );

  return (
    <View>
      <View style={styles.sectionPad}>
        <SectionTitle
          icon="grid"
          color={T.blueDark}
          bg={T.blueSoft}
          title="My School"
        />
      </View>

      <FlatList
        data={visibleActions}
        horizontal
        keyExtractor={keyExtractor}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 6 }}
        renderItem={renderItem}
      />
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Teachers (local so the shared AppDetails stays untouched)
// ─────────────────────────────────────────────────────────────────────────────
const TeacherCell = memo(({ item }) => {
  const user = item?.user;
  return (
    <View style={{ marginHorizontal: 10 }}>
      <Avatar
        size={width * 0.26}
        source={user?.avatar?.image}
        userID={user?._id}
        data={item}
        border={{ width: 3, color: T.line }}
        name={`${user?.preffix ?? ""} ${user?.firstName} ${user?.lastName}`}
        textStyle={CAPITALIZE}
      />
    </View>
  );
});

const renderTeacherCell = ({ item }) => <TeacherCell item={item} />;

const Teachers = memo(({ data = [] }) => (
  <View style={styles.teachersWrap}>
    <SectionTitle
      icon="ribbon"
      color={T.purpleDark}
      bg={T.purpleSoft}
      title="Teachers"
      right={
        <Chip
          label={`${data?.length ?? 0}`}
          color={T.purpleDark}
          bg={T.purpleSoft}
        />
      }
    />
    <View style={styles.teachersCard}>
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderTeacherCell}
        horizontal
        showsHorizontalScrollIndicator={false}
      />
    </View>
  </View>
));

// ─────────────────────────────────────────────────────────────────────────────
// SchoolProfile
// ─────────────────────────────────────────────────────────────────────────────
const SchoolProfile = ({ data, fetchSchoolData }) => {
  const user = useSelector(selectUser);
  const school = useSelector(selectSchool);
  const router = useRouter();
  const isTeacher = user?.accountType === "teacher";

  const translationY = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [leaveModalVis, setLeaveModalVis] = useState(false);
  const [flagTarget, setFlagTarget] = useState(null);

  const TOUR_KEY = isTeacher
    ? TOUR_KEY_PROFILE_TEACHER
    : TOUR_KEY_PROFILE_STUDENT;

  // ── Tutorial steps (memoized) ───────────────────────────────────────────
  const profileTutorialSteps = useMemo(
    () =>
      isTeacher
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
              text: 'A preview of your students appears in the Students section.\nTap "Browse all students" to filter by class, search and see their stats.\n\nHead to Classes to assign and verify students.',
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
              title: "Your Schoolmates",
              text: 'See who else has joined your school! Students from your own class show first.\nTap "See all schoolmates" to browse other classes, search and view stats.\n\nTap the 🏳 icon on a student to report them if they don\'t belong here.',
            },
          ],
    [isTeacher, user?.username],
  );

  // ── Tour lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    let t;
    (async () => {
      const seen = await AsyncStorage.getItem(TOUR_KEY);
      if (!seen) t = setTimeout(() => setShowTutorial(true), 800);
    })();
    return () => clearTimeout(t);
  }, []);

  const handleTutorialDone = useCallback(async () => {
    setShowTutorial(false);
    await AsyncStorage.setItem(TOUR_KEY, "true");
  }, [TOUR_KEY]);

  // ── Handlers (all stable) ───────────────────────────────────────────────
  const handleFlagStudent = useCallback((u) => setFlagTarget(u), []);
  const openLeave = useCallback(() => setLeaveModalVis(true), []);
  const closeLeave = useCallback(() => setLeaveModalVis(false), []);
  const closeFlag = useCallback(() => setFlagTarget(null), []);
  const openAllStudents = useCallback(
    () => router.push("/school/students"),
    [],
  );
  const onLeaveSuccess = useCallback(() => {
    setLeaveModalVis(false);
    fetchSchoolData();
  }, [fetchSchoolData]);

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

  // ── Animated sticky header ──────────────────────────────────────────────
  const Rstyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            translationY.value,
            [0, 200],
            [-(insets.top + 60), 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
      opacity: interpolate(
        translationY.value,
        [0, 200],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    };
  }, [insets.top]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      translationY.value = event.contentOffset.y;
    },
  });

  // ── Memoized data ───────────────────────────────────────────────────────
  const actionData = useMemo(
    () => ({
      quiz: data?.quizCount,
      assignments: data?.assignmentCount,
      classes: data?.classCount,
    }),
    [data?.quizCount, data?.assignmentCount, data?.classCount],
  );

  const headerData = useMemo(
    () => ({ name: data?.name, lga: data?.lga, state: data?.state }),
    [data?.name, data?.lga, data?.state],
  );

  const refreshControl = useMemo(
    () => getRefresher({ refreshing, onRefresh }),
    [refreshing, onRefresh],
  );

  // Capped preview — at most PREVIEW_LIMIT cells are ever mounted here.
  const students = data?.students;
  const previewStudents = useMemo(
    () => (students ?? []).slice(0, PREVIEW_LIMIT),
    [students],
  );
  const totalStudents = data?.studentCount ?? students?.length ?? 0;
  const hasMore = totalStudents > PREVIEW_LIMIT;
  const ownId = user?._id;

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[styles.headerSticker, { paddingTop: insets.top + 10 }, Rstyle]}
      >
        <View style={styles.headerIcon}>
          <Ionicons name="school" color={T.ink} size={20} />
        </View>
        <AppText style={styles.headerTxt} fontWeight="black" size="large">
          {data?.name}
        </AppText>
      </Animated.View>

      {/*
        A plain ScrollView is used on purpose: with the student list capped at
        21 there's nothing to virtualize, and skipping VirtualizedList removes
        blank-cell flashes, re-measure jank and removeClippedSubviews glitches.
      */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: PAD_BOTTOM }}
      >
        <SchoolHeader data={headerData} scrollY={translationY} />
        <SchoolActions data={actionData} />
        <Teachers data={data?.teachers} />

        {/* ── Students sheet ─────────────────────────────────────────── */}
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View style={styles.row}>
              <View style={styles.sheetIcon}>
                <Ionicons name="people" size={18} color={T.greenDark} />
              </View>
              <AppText size="large" fontWeight="black" style={{ color: T.ink }}>
                {isTeacher ? "Students" : "Schoolmates"}
              </AppText>
              <View style={styles.countBadge}>
                <AppText
                  size="small"
                  fontWeight="black"
                  style={{ color: T.greenDark }}
                >
                  {totalStudents}
                </AppText>
              </View>
            </View>
            {hasMore && (
              <Pressable
                onPress={openAllStudents}
                hitSlop={10}
                style={styles.seeAll}
              >
                <AppText
                  fontWeight="black"
                  size="small"
                  style={{ color: T.greenDark }}
                >
                  SEE ALL
                </AppText>
                <Ionicons
                  name="chevron-forward"
                  size={13}
                  color={T.greenDark}
                />
              </Pressable>
            )}
          </View>

          {!isTeacher && Boolean(data?.myClassLevel) && (
            <AppText size="small" style={styles.sheetCaption}>
              Your {String(data.myClassLevel).toUpperCase()} classmates come
              first
            </AppText>
          )}

          {previewStudents.length === 0 ? (
            <ListEmpty
              message={
                isTeacher
                  ? "Go to your Dashboard and create classes for your students, then invite them to join your school"
                  : "No schoolmates yet. Invite your friends to join your school!"
              }
            />
          ) : (
            <View style={styles.grid}>
              {previewStudents.map((item) => (
                <StudentItem
                  key={item._id}
                  item={item}
                  ownId={ownId}
                  onFlag={handleFlagStudent}
                />
              ))}
            </View>
          )}

          {hasMore && (
            <ViewAllButton
              total={totalStudents}
              isTeacher={isTeacher}
              onPress={openAllStudents}
            />
          )}

          <View style={styles.leaveSection}>
            <Pressable onPress={openLeave} style={styles.leaveBtn}>
              <Ionicons name="exit-outline" size={18} color={T.coralDark} />
              <AppText
                fontWeight="black"
                size="medium"
                style={{ color: T.coralDark, marginLeft: 8 }}
              >
                Leave School
              </AppText>
            </Pressable>
          </View>
        </View>
      </Animated.ScrollView>

      <LeaveSchoolModal
        visible={leaveModalVis}
        onClose={closeLeave}
        onSuccess={onLeaveSuccess}
      />
      <FlagStudentModal
        visible={Boolean(flagTarget)}
        onClose={closeFlag}
        school={school}
        targetUser={flagTarget}
      />
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

  const getSchoolData = useCallback(async () => {
    try {
      await refetch().unwrap();
    } catch (_err) {}
  }, [refetch]);

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
          <AppText fontWeight="black" style={{ color: T.sub }} size="large">
            You do not have access to this screen
          </AppText>
          <AppText
            fontWeight="black"
            style={{ color: T.sub, marginTop: 8 }}
            size="small"
          >
            Go to your Profile screen to access Pro Features
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
  container: { flex: 1, backgroundColor: T.paper },
  sectionPad: { paddingHorizontal: 16 },

  // action tiles
  action: {
    minWidth: width * 0.3,
    backgroundColor: "#fff",
    marginHorizontal: 6,
    borderRadius: 24,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: T.line,
    padding: 10,
    marginBottom: 18,
  },
  actionImgCont: {
    width: width * 0.24,
    height: width * 0.24,
    justifyContent: "center",
    alignSelf: "center",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 2,
  },
  actionImg: { width: "52%", height: "52%" },
  actionDetail: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  actionCount: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 6,
  },

  // teachers
  teachersWrap: { paddingHorizontal: 16, marginBottom: 6 },
  teachersCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: T.line,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },

  // students sheet
  sheet: {
    marginTop: 18,
    backgroundColor: "#fff",
    borderTopStartRadius: 32,
    borderTopEndRadius: 32,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: T.line,
    paddingTop: 20,
    paddingHorizontal: 15,
    paddingBottom: 30,
    minHeight: height * 0.5,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  row: { flexDirection: "row", alignItems: "center" },
  sheetIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: T.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sheetCaption: {
    color: T.sub,
    marginTop: -6,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  countBadge: {
    marginLeft: 10,
    minWidth: 28,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 9,
    alignItems: "center",
    backgroundColor: T.greenSoft,
  },
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.greenSoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 2,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  studentCell: {
    width: "33.3333%",
    alignItems: "center",
    marginBottom: 20,
  },
  flagBtn: {
    position: "absolute",
    bottom: 22,
    right: 8,
    backgroundColor: T.paper,
    borderWidth: 1.5,
    borderColor: T.line,
    borderRadius: 20,
    padding: 5,
  },
  viewAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
    padding: 14,
    borderRadius: 20,
    backgroundColor: T.yellowSoft,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: T.yellowLine,
  },
  viewAllIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: T.yellowLine,
  },
  viewAllArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: T.yellow,
    alignItems: "center",
    justifyContent: "center",
  },

  close: { marginTop: 5, marginRight: 5 },
  headerTxt: { textTransform: "capitalize", color: T.ink, flex: 1 },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: T.yellow,
    borderBottomWidth: 3,
    borderBottomColor: T.yellowDark,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSticker: {
    backgroundColor: "#fff",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 400,
    alignItems: "center",
    gap: 10,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: T.line,
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
    backgroundColor: T.paper,
  },
  leaveSection: { alignItems: "center", paddingTop: 28 },
  leaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.coralLine,
    backgroundColor: T.coralSoft,
  },

  // quiz cards
  quizCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: T.line,
    padding: 16,
    marginHorizontal: 15,
    marginVertical: 8,
    width: width * 0.9,
  },
  quizHeader: { flexDirection: "row", alignItems: "center" },
  quizIconCont: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: T.blueSoft,
    borderWidth: 2,
    borderColor: T.blueLine,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  quizIcon: { width: 30, height: 30 },
  quizTeacherRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1.5,
    borderTopColor: T.line,
    borderStyle: "dashed",
  },
  teacherQuiz: {
    backgroundColor: "#fff",
    flexDirection: "row",
    width: width * 0.92,
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: T.line,
    padding: 12,
    marginBottom: 12,
    alignSelf: "center",
  },
  tQuizMain: { marginLeft: 10, flex: 1, marginRight: 15 },
  tQuizSubj: {
    marginTop: 8,
    color: T.sub,
    textTransform: "capitalize",
  },
  tQuizStat: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
    marginTop: 8,
  },
});
