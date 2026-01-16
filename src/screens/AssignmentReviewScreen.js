import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import AppText from "../components/AppText";
import Screen from "../components/Screen";
import { NavBack } from "../components/AppIcons";
import colors from "../helpers/colors";
import Avatar from "../components/Avatar";
import AppButton from "../components/AppButton";
import AppModal from "../components/AppModal";
import { useEffect, useMemo, useRef, useState } from "react";
import { gradesList, PAD_BOTTOM } from "../helpers/dataStore";
import AnimatedPressable from "../components/AnimatedPressable";
import { RichEditor } from "react-native-pell-rich-editor";
import {
  selectSchool,
  useGradeAssignmentMutation,
} from "../context/schoolSlice";
import { useSelector } from "react-redux";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getFullName } from "../helpers/helperFunctions";
import Animated, {
  FlipInEasyY,
  LinearTransition,
  ZoomOutRotate,
} from "react-native-reanimated";
import LottieAnimator from "../components/LottieAnimator";

const { width, height } = Dimensions.get("screen");

const Grades = ({ closeModal, init, getGrade }) => {
  const [score, setScore] = useState(init ? String(init) : "");

  const textRef = useRef();

  const onItemPress = (data) => {
    getGrade && getGrade({ ...data, score: Number(score) });
    closeModal();
  };

  const handleScoreChange = (value) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, "");

    // Convert to number and limit to 100
    const numericScore = Number(numericValue);

    if (numericScore <= 100) {
      setScore(numericValue);
    } else {
      setScore("100");
    }
  };

  // Better way to get score data
  const scoreData = useMemo(() => {
    const numericScore = Number(score);

    // Return null if score is invalid
    if (isNaN(numericScore) || score === "") {
      return null;
    }

    // Find the matching grade
    return gradesList.find((grade) => {
      return numericScore >= grade.score && numericScore <= grade.max;
    });
  }, [score]);

  useEffect(() => {
    setTimeout(() => {
      textRef?.current?.focus();
    }, 600);
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, justifyContent: "center" }}
      behavior="padding"
    >
      <Animated.View layout={LinearTransition.springify()} style={styles.grade}>
        <AppText
          style={{ marginBottom: 15, color: colors.medium }}
          fontWeight="black"
          size={"xxlarge"}
        >
          Grade
        </AppText>
        <View style={styles.row}>
          <TextInput
            placeholder="Enter score"
            placeholderTextColor={colors.medium + 80}
            style={styles.input}
            maxLength={3}
            ref={textRef}
            value={score}
            onChangeText={handleScoreChange} // Changed from onChange
            keyboardType="numeric"
          />
          {scoreData && (
            <Animated.View
              entering={FlipInEasyY.springify().damping(30)}
              exiting={ZoomOutRotate.springify()}
              style={{ flex: 1, alignItems: "center" }}
            >
              <AppText
                fontWeight="black"
                size={40}
                style={{ color: scoreData?.color }}
              >
                {scoreData?.grade}
              </AppText>
              <AppText style={{ color: scoreData?.color + 80 }}>
                {scoreData?.title}
              </AppText>
            </Animated.View>
          )}
        </View>

        <View style={styles.btns}>
          <AppButton
            title={"Save Grade"}
            onPress={() => scoreData && onItemPress(scoreData)}
            disabled={!scoreData}
          />
          <AppButton title={"Cancel"} type="warn" onPress={closeModal} />
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const AssignmentReviewScreen = () => {
  const editorRef = useRef();
  const [modal, setModal] = useState({ vis: false });
  const [grade, setGrade] = useState(null);
  const route = useLocalSearchParams();
  const routeData = Boolean(route?.item) ? JSON.parse(route?.item) : {};
  const assignmentId = route?.assignmentId;

  const router = useRouter();

  const school = useSelector(selectSchool);
  const [gradeAssignment, { isLoading }] = useGradeAssignmentMutation();

  const hasUploaded = route?.uploaded === "true";

  const handleCancelBtn = () => {
    router?.back();
    // setGrade({ grade: "F", bg: colors.heartDeep });
  };

  const uploadGrade = async (data) => {
    setGrade({ ...data, value: data?.score });
    try {
      await gradeAssignment({
        schoolId: school?._id,
        assignmentId,
        score: data?.score,
        user: routeData?.student?._id,
      }).unwrap();
    } catch (errr) {
      console.log(errr);
    }
  };

  useEffect(() => {
    if (routeData?.score?.value) {
      const numericScore = routeData?.score?.value;
      const gradeData = gradesList.find((grade) => {
        return numericScore >= grade.score && numericScore <= grade.max;
      });
      setGrade({
        grade: gradeData.grade,
        value: numericScore,
        color: gradeData?.color,
      });
    }
  }, []);

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerNav}>
          <NavBack color={colors.medium} style={styles.nav} />
          <Avatar
            name={getFullName(routeData?.student)}
            source={routeData?.student?.avatar?.image}
            horizontal
          />
        </View>
        {grade && (
          <View style={styles.studentGrade}>
            <AppText
              style={{ color: grade?.color }}
              fontWeight="black"
              size={40}
            >
              {grade?.grade}
            </AppText>
            <AppText style={{ color: grade?.color }} fontWeight="black">
              {grade?.value}
            </AppText>
          </View>
        )}
      </View>
      <AppText style={styles.title} fontWeight="heavy" size={"large"}>
        Assignmet Review
      </AppText>
      <View style={styles.main}>
        <RichEditor
          ref={editorRef}
          useContainer={false}
          initialContentHTML={routeData?.solution ?? ""}
          // editorInitializedCallback={onEditorInitialized}
          editorStyle={{ backgroundColor: "tranparent" }}
          disabled={true}
          // onChange={(text) => setText(text)}
        />
      </View>
      {!hasUploaded && (
        <View style={[styles.btns, { marginBottom: 20 }]}>
          <AppButton
            title={`${grade ? "Update" : "Set"} Grade`}
            onPress={() => setModal({ vis: true })}
          />
          <AppButton title={"Cancel"} onPress={handleCancelBtn} type="white" />
        </View>
      )}
      <AppModal
        visible={modal.vis}
        setVisible={(bool) => setModal({ vis: bool })}
        Component={() => (
          <Grades
            closeModal={() => setModal({ vis: false })}
            getGrade={uploadGrade}
            init={routeData?.score?.value}
          />
        )}
      />
      <LottieAnimator absolute wTransparent visible={isLoading} />
    </Screen>
  );
};

export default AssignmentReviewScreen;

const styles = StyleSheet.create({
  btns: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  container: {
    flex: 1,
    backgroundColor: colors.unchange,
    paddingBottom: PAD_BOTTOM,
    // marginBottom: 80,
  },
  grade: {
    width: width * 0.95,
    backgroundColor: colors.white,
    padding: 16,
    elevation: 5,
    borderRadius: 12,
  },
  gradeOverlay: {
    backgroundColor: colors.medium,
    paddingBottom: 5,
    borderRadius: 15,
    paddingRight: 2,
    marginBottom: 10,
  },
  gradeItem: {
    backgroundColor: colors.extraLight,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  gradeLetter: {
    marginLeft: 10,
    width: width * 0.2,
  },
  gradeMain: {
    flexDirection: "row",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerNav: {
    flexDirection: "row",
  },
  input: {
    backgroundColor: colors.primary + 20,
    height: 60,
    width: width * 0.4,
    borderRadius: 20,
    padding: 20,
    fontFamily: "sf-black",
    fontSize: 20,
  },
  main: {
    flex: 1,
    backgroundColor: colors.white,
    marginHorizontal: 10,
    borderRadius: 15,
  },
  nav: {
    paddingLeft: 22,
    paddingRight: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  studentGrade: {
    alignItems: "center",
    marginRight: 30,
    transform: [{ rotate: "-15deg" }],
  },
  studentGradeTxt: {},
  title: {
    textAlign: "center",
    marginBottom: 10,
  },
});
