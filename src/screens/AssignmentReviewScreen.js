import { Dimensions, FlatList, StyleSheet, View } from "react-native";

import AppText from "../components/AppText";
import Screen from "../components/Screen";
import { NavBack } from "../components/AppIcons";
import colors from "../helpers/colors";
import Avatar from "../components/Avatar";
import AppButton from "../components/AppButton";
import AppModal from "../components/AppModal";
import { useEffect, useRef, useState } from "react";
import { passGrades, studentAssignment } from "../helpers/dataStore";
import AnimatedPressable from "../components/AnimatedPressable";
import { RichEditor } from "react-native-pell-rich-editor";

const { width, height } = Dimensions.get("screen");

const Grades = ({ closeModal, getGrade }) => {
  const onItemPress = (data) => {
    getGrade && getGrade(data);
    closeModal();
  };
  return (
    <View style={styles.grade}>
      <AppText
        style={{ marginBottom: 15, color: colors.medium }}
        fontWeight="black"
        size={"xxlarge"}
      >
        Grade
      </AppText>
      <FlatList
        data={passGrades}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          let overlay, bg, color, light;
          switch (item?.score) {
            case "100":
              overlay = colors.primaryLight;
              bg = colors.primaryDeep;
              color = colors.white;
              light = colors.primaryLighter;

              break;
            case "70":
              overlay = colors.accentLight;
              bg = colors.accentDeep;
              color = colors.white;
              light = colors.accentLighter;

              break;
            case "60":
              overlay = colors.warningLight;
              bg = colors.warningDark;
              color = colors.white;
              light = colors.warningLighter;

              break;
            case "40":
              overlay = colors.heartLight;
              bg = colors.heartDark;
              color = colors.white;
              light = colors.heartLight;

              break;

            default:
              overlay = colors.greenLighter;
              bg = colors.greenDark;
              color = colors.white;
              light = colors.greenLighter;

              break;
          }

          return (
            <AnimatedPressable
              onPress={() => onItemPress({ ...item, bg })}
              style={{ ...styles.gradeOverlay, backgroundColor: overlay }}
            >
              <View style={[styles.gradeItem, { backgroundColor: bg }]}>
                <View style={[styles.gradeMain]}>
                  <AppText
                    style={{ ...styles.gradeLetter, color: light }}
                    fontWeight="black"
                    size={"xxxlarge"}
                  >
                    {item.grade}
                  </AppText>
                  <AppText style={{ color }} fontWeight="bold">
                    {item.title}
                  </AppText>
                </View>
                <AppText style={{ color }} fontWeight="black">
                  {item.score}%
                </AppText>
              </View>
            </AnimatedPressable>
          );
        }}
      />
    </View>
  );
};

const AssignmentReviewScreen = () => {
  const editorRef = useRef();
  const [modal, setModal] = useState({ vis: false });
  const [grade, setGrade] = useState(null);
  const route = {};
  const routeData = route?.params?.item;

  const hasUploaded = route?.params?.uploaded === true;

  const handleFailBtn = () => {
    setGrade({ grade: "F", bg: colors.heartDeep });
  };

  useEffect(() => {
    if (routeData?.grade) {
      setGrade({ grade: routeData?.grade?.text, bg: routeData?.grade?.color });
    }
  }, []);

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerNav}>
          <NavBack color={colors.medium} style={styles.nav} />
          <Avatar name={routeData?.name} horizontal />
        </View>
        {grade && (
          <View style={styles.studentGrade}>
            <AppText
              style={{ color: grade?.bg }}
              fontWeight="black"
              size={"xxxlarge"}
            >
              {grade?.grade}
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
          initialContentHTML={studentAssignment}
          // editorInitializedCallback={onEditorInitialized}
          editorStyle={{ backgroundColor: "tranparent" }}
          disabled={true}
          // onChange={(text) => setText(text)}
        />
      </View>
      {!hasUploaded && (
        <View style={styles.btns}>
          <AppButton title={"Pass"} onPress={() => setModal({ vis: true })} />
          <AppButton title={"Fail"} onPress={handleFailBtn} type="warn" />
        </View>
      )}
      <AppModal
        visible={modal.vis}
        setVisible={(bool) => setModal({ vis: bool })}
        Component={() => (
          <Grades
            closeModal={() => setModal({ vis: false })}
            getGrade={(data) => setGrade(data)}
          />
        )}
      />
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
    marginBottom: 80,
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
  main: {
    flex: 1,
    backgroundColor: colors.white,
    marginBottom: 20,
    marginHorizontal: 10,
    borderRadius: 15,
  },
  nav: {
    paddingLeft: 22,
    paddingRight: 8,
  },
  studentGrade: {
    marginRight: 30,
  },
  studentGradeTxt: {},
  title: {
    textAlign: "center",
    marginBottom: 10,
  },
});
