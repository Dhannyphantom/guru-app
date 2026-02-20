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

import Screen from "../components/Screen";
import colors from "../helpers/colors";
import AppText from "../components/AppText";
import { Authors } from "../components/AppDetails";
import { schoolActions } from "../helpers/dataStore";
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
  // useLazyFetchSchoolQuery,
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
    if (item?.status === "active") {
      onPress?.(item, "start");
    }
  };

  return (
    <View style={styles.quizCard} onPress={handlePress}>
      {/* Top Row */}
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
        {/* Button */}
        {Boolean(btnText) && (
          <AppButton
            title={btnText}
            contStyle={styles.quizBtn}
            onPress={handlePress}
          />
        )}
      </View>

      {/* Teacher Row */}
      <View style={styles.quizTeacherRow}>
        <Avatar
          size={40}
          source={item?.teacher?.avatar?.image}
          border={{ width: 1, color: colors.primaryDeep }}
          // name={`${}`}
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

        {/* Title */}
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <AppText
            fontWeight="medium"
            size="small"
            style={{ color: colors.medium }}
            // numberOfLines={2}
          >
            Quiz Title
          </AppText>
          <AppText
            fontWeight="bold"
            size="large"
            style={styles.quizTitle}
            // numberOfLines={2}
          >
            {item?.title}
          </AppText>
        </View>
      </View>
    </View>
  );
};

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
      //  ("NewQuiz");
      router.push("/main/new_quiz");
    } else {
      //  ("QuizHistory");
      router.push("/school/quiz_history");
    }
    // closeModal();
  };

  const onQuizAction = (item) => {
    // closeModal?.();
    router.push({
      pathname: "/main/session",
      params: {
        view: "quiz",
        type: "school",
        schoolId: school?._id,
        quizId: item?._id,
      },
    });
    // setQuizModal({
    //   vis: true,
    //   data: {
    //     view: "quiz",
    //     type: "school",
    //     schoolId: school?._id,
    //     quizId: item?._id,
    //   },
    // });
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
          refreshControl={getRefresher({
            refreshing,
            onRefresh: getQuizData,
          })}
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
          // data={schoolQuiz}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={() => (
            <ListEmpty
              vis={!isLoading}
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
      {/* <Quiz
        startQuiz={quizModal?.vis}
        data={quizModal?.data}
        setStartQuiz={(bool) => setQuizModal({ vis: bool })}
      /> */}
    </View>
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
        // return console.log({ item });
        router.push({
          pathname: item?.nav?.screen,
          params: { data: JSON.stringify(item?.nav?.data) },
        });
      } else {
        if (item?.name === "Classes" && user?.accountType === "teacher") {
          router.push("/school/classrooms");
          return;
        }
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
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

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

  // Optimize scroll handler - use runOnJS sparingly
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      "worklet";
      translationY.value = event.contentOffset.y;
    },
  });

  // Memoize action data
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
      {/* <SchoolHeader data={headerData} scrollY={translationY} /> */}
      {/* <Animated.FlatList
        data={["School"]}
        keyExtractor={keyExtractor}
        onScroll={scrollHandler}
        scrollEventThrottle={16} // Critical for smooth animation
       
        renderItem={renderItem}
        removeClippedSubviews={true} // Performance boost
        maxToRenderPerBatch={1}
        windowSize={3}
        initialNumToRender={1}
        // Important: Disable nested scrolling if not needed
        nestedScrollEnabled={false}
      /> */}
      <Animated.View
        style={[
          styles.headerSticker,
          {
            paddingTop: insets.top + 10,
          },
          Rstyle,
        ]}
      >
        <Ionicons name="school" color={colors.primary} size={30} />
        <AppText style={styles.headerTxt} fontWeight="heavy" size="large">
          {data?.name}
        </AppText>
      </Animated.View>
      <Animated.FlatList
        data={["School"]}
        onScroll={scrollHandler}
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
            <SchoolActions data={actionData} />
            <Authors data={data?.teachers} />
            <ClassMates data={data?.students} />
          </View>
        )}
      />
    </>
  );
};

const SchoolProfileMemo = memo(SchoolProfile);

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
    } catch (_err) {
    } finally {
    }
  };

  // useFocusEffect(
  //   // Callback should be wrapped in `React.useCallback` to avoid running the effect too often.
  //   useCallback(() => {
  //     // Invoked whenever the route is focused.
  //     if (route?.check === "school_join") {
  //       setPopData({
  //         vis: true,
  //         msg: isStudent
  //           ? "Join your school now by searching for it"
  //           : "Create your school profile now or Join one if created already",
  //         timer: 1000,
  //         type: "failed",
  //       });
  //     }

  //     // Return function is invoked whenever the route gets out of focus.
  //     return () => {
  //       // log("This route is now unfocused.");
  //     };
  //   }, [route?.check]),
  // );

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
    marginTop: 5,
    marginRight: 15,
  },
  filterBtn: {
    paddingRight: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTxt: {
    textTransform: "capitalize",
    // margin: 15,
  },
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
    // marginTop: 10,
    minHeight: height * 0.5,
    // backgroundColor: "white",
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
  quizCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 15,
    marginVertical: 8,
    boxShadow: `2px 8px 18px ${colors.primary}25`,
    width: width * 0.9,
  },

  quizHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  quizIconCont: {
    width: 55,
    height: 55,
    borderRadius: 12,
    backgroundColor: colors.extraLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  quizIcon: {
    width: 30,
    height: 30,
  },

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

  quizTitle: {
    // marginTop: 12,
    // color: colors.medium,
  },

  quizBtn: {
    marginTop: 15,
  },
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
