import {
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import AppButton, { FormikButton } from "./AppButton";
import { FormikInput } from "./FormInput";
import { Formik } from "formik";
import {
  newAssignmentInitials,
  newAssignmentSchema,
} from "../helpers/yupSchemas";
import LottieAnimator from "./LottieAnimator";
import PopMessage from "./PopMessage";
import { useFetchSubjectsQuery } from "../context/instanceSlice";

import {
  selectSchool,
  //   selectSchool,
  useCreateAssignmentMutation,
  useDeleteAssignmentMutation,
  useUpdateAssignmentMutation,
} from "../context/schoolSlice";
import { useState } from "react";
import colors from "../helpers/colors";
import { PAD_BOTTOM, schoolClasses } from "../helpers/dataStore";
import { useSelector } from "react-redux";
import { useLocalSearchParams, useRouter } from "expo-router";
import AppHeader from "./AppHeader";
import { nanoid } from "@reduxjs/toolkit";
import PromptModal from "./PromptModal";
import AnimatedCheckBox from "./AnimatedCheckbox";
import AppText from "./AppText";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("screen");

const NewAssignment = () => {
  const { data: subjects, isLoading: subjLoading } = useFetchSubjectsQuery();
  const [createAssignment, { isLoading }] = useCreateAssignmentMutation();
  const [updateAssignment, { isLoading: updating }] =
    useUpdateAssignmentMutation();
  const [deleteAssignmet, { isLoading: deleting }] =
    useDeleteAssignmentMutation();
  const school = useSelector(selectSchool);
  const router = useRouter();
  const route = useLocalSearchParams();

  const [popper, setPopper] = useState({ vis: false });
  const [prompt, setPrompt] = useState({ vis: false });

  const isEdit = Boolean(route?.isEdit);
  const routeData = route?.data ? JSON.parse(route?.data) : null;

  if (isEdit) {
    newAssignmentInitials.title = routeData?.title || "";
    newAssignmentInitials.question = routeData?.question || "";
    newAssignmentInitials.subject = routeData?.subject || "";
    newAssignmentInitials.classes =
      routeData?.classes?.map((clas) => ({
        _id: nanoid(),
        name: clas?.toUpperCase?.(),
      })) || [];
    newAssignmentInitials.date = routeData?.date || "";
  }

  const handleForm = async (formData) => {
    if (isEdit) {
      try {
        const res = await updateAssignment({
          data: { ...routeData, ...formData },
          schoolId: school?._id,
          assignmentId: routeData?._id,
        }).unwrap();
        if (res.status === "success") {
          setPopper({
            vis: true,
            timer: 2000,
            msg: `Assignment updated successfully`,
            type: "success",
          });
        }
      } catch (error) {
        console.log(error);
        setPopper({
          vis: true,
          timer: 2000,
          msg: error?.data?.message ?? "Something went wrong, Please retry",
          type: "failed",
        });
      }
    } else {
      try {
        const res = await createAssignment({
          ...formData,
          schoolId: school?._id,
        }).unwrap();
        if (res.status === "success") {
          setPopper({
            vis: true,
            timer: 2000,
            msg: `Assignment created successfully`,
            type: "success",
            cb: () => router.back(),
          });
        }
      } catch (error) {
        console.log(error);
        setPopper({
          vis: true,
          timer: 2000,
          msg: error?.data?.message ?? "Something went wrong, Please retry",
          type: "failed",
        });
      }
    }
  };

  const handlePrompts = async () => {
    switch (prompt?.data?.type) {
      case "delete":
        try {
          await deleteAssignmet({
            schoolId: school?._id,
            assignmentId: routeData?._id,
          }).unwrap();
          setPopper({
            vis: true,
            msg: `Assignment deleted successfully`,
            type: "success",
            cb: () => router.back(),
          });
        } catch (errr) {
          console.log(errr);
          setPopper({
            vis: true,
            msg: errr?.data ?? "Something went wrong",
            type: "failed",
            cb: () => router.back(),
          });
        }
        break;

      default:
        break;
    }
  };

  const handleDeleteAssignment = () => {
    setPrompt({
      vis: true,
      data: {
        title: "Delete Assignment",
        msg: "Are really sure you want to delete this assignment permanently?",
        type: "delete",
        btn: "Delete",
      },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title={`${isEdit ? "Edit" : "New"} Assignment`} />
      <KeyboardAvoidingView style={styles.avoidingView} behavior="padding">
        <View style={styles.form}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: PAD_BOTTOM }}
          >
            <Formik
              validationSchema={newAssignmentSchema}
              initialValues={newAssignmentInitials}
              onSubmit={handleForm}
            >
              {({ values, setFieldValue }) => {
                return (
                  <>
                    <FormikInput
                      name={"subject"}
                      placeholder={"Select Subject"}
                      type="dropdown"
                      data={subjects?.data}
                      isLoading={subjLoading}
                      // multiple
                      headerText={"Select Subject:"}
                      // onLayout={() => setFieldTouched("topics", true)}
                      // showErr={bools.showErr}
                    />
                    <FormikInput
                      name={"classes"}
                      placeholder={"Select Class"}
                      type="dropdown"
                      data={schoolClasses}
                      multiple
                      headerText={"Select Eligible Classes:"}
                      // onLayout={() => setFieldTouched("topics", true)}
                      // showErr={bools.showErr}
                    />
                    <FormikInput
                      name={"title"}
                      headerText={"Assignment Title"}
                      placeholder="e.g Maths assignment, Fractions Assignment"
                    />
                    <FormikInput
                      name={"question"}
                      headerText={"Assignment Questions"}
                      placeholder="Write Your Assigment Questions"
                      multiline
                      style={{
                        minHeight: height * 0.2,
                        alignItems: "flex-start",
                      }}
                      numberOfLines={5}
                    />

                    {!isEdit && values["status"] === "ongoing" && (
                      <Animated.View
                        layout={LinearTransition}
                        entering={FadeIn}
                        exiting={FadeOut}
                      >
                        <FormikInput
                          name={"date"}
                          placeholder={"Pick Expected Date of Submission"}
                          headerText={"Expected Date of Submission:"}
                          futureYear={true}
                          type="date"
                        />
                      </Animated.View>
                    )}
                    {!isEdit && (
                      <Animated.View
                        layout={LinearTransition}
                        style={styles.row}
                      >
                        <AppText
                          style={{ color: colors.medium }}
                          fontWeight="bold"
                          size="medium"
                        >
                          Save Assignment as draft for later?
                        </AppText>
                        <AnimatedCheckBox
                          isChecked={values["status"] === "inactive"}
                          setIsChecked={(bool) => {
                            if (bool === true) {
                              setFieldValue("status", "inactive");
                            } else {
                              setFieldValue("status", "ongoing");
                            }
                          }}
                        />
                      </Animated.View>
                    )}
                    <Animated.View
                      layout={LinearTransition}
                      style={styles.formBtns}
                    >
                      <FormikButton
                        title={`${isEdit ? "Update" : "Create"} Assignment`}
                      />

                      {isEdit && (
                        <AppButton
                          title={"Delete Assignment"}
                          type="warn"
                          onPress={handleDeleteAssignment}
                        />
                      )}
                    </Animated.View>
                  </>
                );
              }}
            </Formik>
          </ScrollView>
          <LottieAnimator visible={isLoading} absolute wTransparent />
        </View>
      </KeyboardAvoidingView>
      <PopMessage popData={popper} setPopData={setPopper} />
      <PromptModal
        prompt={prompt}
        setPrompt={setPrompt}
        onPress={handlePrompts}
      />
    </View>
  );
};

export default NewAssignment;

const styles = StyleSheet.create({
  avoidingView: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    // backgroundColor: colors.white,
  },
  form: {
    flex: 1,
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: "center",
    // minHeight: height * 0.4,
  },
  formBtns: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  formTitle: {
    marginBottom: 20,
  },
  formText: {
    marginBottom: 20,
    marginTop: 15,
    textAlign: "center",
  },
  footer: {
    marginHorizontal: 25,
    alignItems: "center",
  },
  footerHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  footerTxt: {
    padding: 10,
    backgroundColor: colors.white,
    color: colors.medium,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 30,
  },
  separator: {
    height: 2,
    flex: 1,
    backgroundColor: colors.extraLight,
  },
  main: {
    backgroundColor: colors.white,
    bottom: 30,
    width: width * 0.9,
    alignSelf: "center",
    borderRadius: 10,
    paddingBottom: 10,
  },
});
