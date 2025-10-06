import { Dimensions, FlatList, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import AppButton from "./AppButton";
import colors from "../helpers/colors";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import { otherClasses } from "../helpers/dataStore";
import { selectSchool, useLazyFetchClassesQuery } from "../context/schoolSlice";
import LottieAnimator from "./LottieAnimator";
import { useEffect } from "react";

const { width, height } = Dimensions.get("screen");

const ClassItem = ({ item, index }) => {
  return (
    <View
      style={[styles.classViewOverlay, { backgroundColor: colors.accentLight }]}
    >
      <View style={[styles.classView, { backgroundColor: colors.accentDeep }]}>
        <View style={[styles.dot, { backgroundColor: "#6846b7" }]} />
        <AppText
          fontWeight="black"
          style={{
            ...styles.classViewTxt,
            textTransform: "uppercase",
            flex: 0.8,
          }}
        >
          {item.level}
        </AppText>
        <AppText fontWeight="black" style={styles.classViewTxt}>
          {item.alias}
        </AppText>
      </View>
    </View>
  );
};

const ClassModal = ({ closeModal, type = "display" }) => {
  const user = useSelector(selectUser);
  const school = useSelector(selectSchool);
  const [fetchClasses, { data, isLoading }] = useLazyFetchClassesQuery();

  const classes = data?.data;

  const isTeacher = user?.accountType == "teacher";
  const isStudent = user?.accountType == "student";

  const getClasses = async () => {
    try {
      await fetchClasses(school?._id).unwrap();
    } catch (error) {
      console.log({ error });
    }
  };

  useEffect(() => {
    getClasses();
  }, []);

  return (
    <View style={styles.container}>
      {!Boolean(isLoading) && (
        <>
          {isTeacher && (
            <View style={styles.greeting}>
              <Ionicons
                name="information-circle"
                color={colors.primary}
                size={16}
              />
              <AppText
                style={styles.greetingTxt}
                fontWeight="bold"
                size={"small"}
              >
                Select the classes you're currently teaching, These are the
                classes that will get access to your quizzes, announcements and
                assignments
              </AppText>
            </View>
          )}
          <FlatList
            data={["Classes"]}
            showsVerticalScrollIndicator={false}
            renderItem={() => (
              <>
                {isStudent && (
                  <View style={styles.section}>
                    <AppText
                      fontWeight="bold"
                      size={"xlarge"}
                      style={styles.headerTxt}
                    >
                      My Class:
                    </AppText>
                    <View style={styles.separator} />
                    <View style={styles.classViewOverlay}>
                      <View style={styles.classView}>
                        <View style={styles.dot} />
                        <AppText fontWeight="black" style={styles.classViewTxt}>
                          The Elite (SS2) Class
                        </AppText>
                      </View>
                    </View>
                  </View>
                )}
                <View style={styles.section}>
                  <AppText
                    fontWeight="bold"
                    size={"xxlarge"}
                    style={styles.headerTxt}
                  >
                    Classes:
                  </AppText>
                  <View style={styles.separator} />

                  <View>
                    <FlatList
                      data={classes}
                      keyExtractor={(item) => item._id}
                      renderItem={({ item, index }) => (
                        <ClassItem item={item} index={index} />
                      )}
                    />
                  </View>
                </View>
              </>
            )}
          />
        </>
      )}
      <LottieAnimator visible={isLoading} absolute />

      <AppButton
        onPress={closeModal}
        contStyle={styles.closeBtn}
        type="white"
        title={"Close"}
      />
    </View>
  );
};

export default ClassModal;

const styles = StyleSheet.create({
  container: {
    width: width * 0.95,
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 10,
    maxHeight: height * 0.85,
    elevation: 10,
  },
  closeBtn: {
    marginHorizontal: width * 0.2,
  },
  classView: {
    backgroundColor: colors.primaryDeep,
    // alignSelf: "center",
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 15,
  },
  classViewOverlay: {
    borderRadius: 15,
    width: "95%",
    backgroundColor: colors.primaryLight,
    paddingBottom: 3,
    alignSelf: "center",
    elevation: 2,
    marginBottom: 10,
  },
  classViewTxt: {
    flex: 0.8,
    color: colors.white,
    marginLeft: 12,
  },
  dot: {
    width: 30,
    height: 30,
    backgroundColor: colors.primary,
    borderRadius: 100,
  },
  greeting: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    alignSelf: "center",
  },
  greetingTxt: {
    textAlign: "center",
    color: colors.medium,
    width: "90%",
  },
  headerTxt: {
    marginLeft: 15,
    marginBottom: 10,
  },
  section: {
    marginBottom: 25,
  },
  separator: {
    width: "95%",
    height: 3,
    backgroundColor: colors.extraLight,
    alignSelf: "center",
    marginBottom: 20,
  },
});
