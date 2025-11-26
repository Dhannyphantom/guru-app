import { Dimensions, StyleSheet, View } from "react-native";

import AppHeader from "../components/AppHeader";
import { Formik } from "formik";
import { FormikInput } from "../components/FormInput";
import {
  enterAnimOther,
  exitingAnim,
  schoolClasses,
} from "../helpers/dataStore";
import { newQuizInitials, newQuizSchema } from "../helpers/yupSchemas";
import { FormikButton } from "../components/AppButton";
import { useEffect, useState } from "react";
import Animated from "react-native-reanimated";
import NewQuestions from "../components/NewQuestions";
import { addInstanceActions } from "../helpers/helperFunctions";
import PopMessage from "../components/PopMessage";
import { useFetchSubjectsQuery } from "../context/instanceSlice";
import { StatusBar } from "expo-status-bar";
import {
  selectSchool,
  useChangeSchoolQuizMutation,
} from "../context/schoolSlice";
import { useSelector } from "react-redux";
import { useLocalSearchParams } from "expo-router";

const { width, height } = Dimensions.get("screen");

const NewQuizScreen = () => {
  const school = useSelector(selectSchool);

  const params = useLocalSearchParams();
  const screenType = params?.type;

  const isStart = screenType === "start";
  const isEdit = screenType === "edit";
  const routeData = JSON.parse(params?.data);

  const { data: subjects, isLoading: subjLoading } = useFetchSubjectsQuery();
  const [changeSchoolQuiz, { isLoading }] = useChangeSchoolQuizMutation();

  const [bools, setBools] = useState({
    screen: "form",
    header: "Create Quiz Session",
  });
  const [popper, setPopper] = useState({ vis: false });
  const [quizMeta, setQuizMeta] = useState(null);

  const handleForm = async (formData) => {
    if (isStart) {
      // handle quiz start
      try {
        await changeSchoolQuiz({
          status: "active",
          quizId: routeData?._id,
          schoolId: school?._id,
          class: formData?.class?.name?.toLowerCase(),
        }).unwrap();
        setPopper({
          vis: true,
          msg: "Quiz session is now Active",
          type: "success",
          cb: () => {
            navigation.navigate("TeacherQuiz", {
              item: routeData,
              refresh: true,
            });
          },
        });
      } catch (err) {
        setPopper({
          vis: true,
          msg: "Something went wrong",
          type: "failed",
          cb: () => navigation?.goBack(),
        });
      }
    } else {
      setBools({ ...bools, screen: "question" });
      setQuizMeta(formData);
    }
  };

  if ((isStart || isEdit) && Boolean(routeData?.subject)) {
    if (quizMeta) {
      newQuizInitials["subject"] = quizMeta?.subject;
      newQuizInitials["title"] = quizMeta?.title;
      // newQuizInitials["class"] = {
      //   _id: "1",
      //   name: quizMeta?.class,
      // };
    } else {
      newQuizInitials["subject"] = routeData?.subject;
      newQuizInitials["title"] = routeData?.title;
      // newQuizInitials["class"] = {
      //   _id: "1",
      //   name: routeData?.class?.toUpperCase(),
      // };
    }
  }

  useEffect(() => {
    switch (screenType) {
      case "edit":
        setBools({
          ...bools,
          screen: "form",
          header: "Edit Quiz Questions",
        });
        break;
      case "start":
        setBools({ ...bools, screen: "form", header: "Start Quiz" });
        break;
    }
  }, [params]);

  return (
    <View style={styles.container}>
      {bools?.screen === "form" && (
        <Animated.View entering={enterAnimOther} exiting={exitingAnim}>
          <AppHeader title={bools.header} />
          <Formik
            initialValues={newQuizInitials}
            validationSchema={newQuizSchema}
            onSubmit={handleForm}
          >
            <>
              <FormikInput
                name={"subject"}
                placeholder={routeData?.subject ?? "Select Subject"}
                type="dropdown"
                data={subjects?.data}
                isLoading={subjLoading}
                disabled={isStart}
                headerText={"Select Subject:"}
              />
              <FormikInput
                name={"class"}
                placeholder={"Select Class"}
                type="dropdown"
                data={schoolClasses}
                headerText={"Quiz For:"}
              />
              <FormikInput
                name={"title"}
                placeholder={
                  isStart
                    ? routeData?.title
                    : "Title for quiz, e.g could be a topic or quiz context"
                }
                disabled={isStart}
                headerText={"Quiz Title:"}
              />

              <FormikButton
                title={isStart ? "Start" : "Next"}
                contStyle={styles.formBtn}
              />
            </>
          </Formik>
        </Animated.View>
      )}
      {bools?.screen === "question" && (
        <Animated.View
          entering={enterAnimOther}
          exiting={exitingAnim}
          style={styles.question}
        >
          <NewQuestions
            addInstanceActions={addInstanceActions}
            scrollPaddingBottom={height * 0.04}
            questionBank={routeData?.questions}
            isEdit={isEdit}
            schoolQuiz={{
              ...quizMeta,
              subject: {
                _id: quizMeta?.subject?._id,
                name: quizMeta?.subject?.name,
              },
            }}
            extra={{ quizId: routeData?._id }}
            noHeader={bools?.header}
            // hideBackBtn
            secBtn={{
              title: "Back",
              type: "white",
              primary: isEdit ? "Update Quiz" : "Start Quiz Now",
              accent: isEdit ? null : "Save for Later",
              onPress: () => setBools({ ...bools, screen: "form" }),
            }}
          />
        </Animated.View>
      )}
      <PopMessage popData={popper} setPopData={setPopper} />
      <StatusBar style="dark" />
    </View>
  );
};

export default NewQuizScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formBtn: {
    marginTop: 20,
    marginHorizontal: width * 0.2,
  },
  question: {
    flex: 1,
  },
});
