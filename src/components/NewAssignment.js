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
} from "../context/schoolSlice";
import { useState } from "react";
import colors from "../helpers/colors";
import { PAD_BOTTOM, schoolClasses } from "../helpers/dataStore";
import { useSelector } from "react-redux";
import { useRouter } from "expo-router";
import AppHeader from "./AppHeader";

const { width, height } = Dimensions.get("screen");

const NewAssignment = () => {
  const { data: subjects, isLoading: subjLoading } = useFetchSubjectsQuery();
  const [createAssignment, { isLoading }] = useCreateAssignmentMutation();
  const school = useSelector(selectSchool);
  const router = useRouter();

  const [popper, setPopper] = useState({ vis: false });

  const handleForm = async (formData) => {
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
  };

  return (
    <>
      <AppHeader title="New Assignment" />
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
                  style={{ minHeight: height * 0.2, alignItems: "flex-start" }}
                  numberOfLines={5}
                />

                <FormikInput
                  name={"date"}
                  placeholder={"Pick Expected Date of Submission"}
                  headerText={"Expected Date of Submission:"}
                  futureYear={true}
                  type="date"
                />
                <View style={styles.formBtns}>
                  <FormikButton title={"Create"} />

                  <AppButton
                    title={"Close"}
                    type="warn"
                    onPress={() => router.back()}
                  />
                </View>
              </>
            </Formik>
          </ScrollView>
          <LottieAnimator visible={isLoading} absolute wTransparent />
        </View>
        <PopMessage popData={popper} setPopData={setPopper} />
      </KeyboardAvoidingView>
    </>
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
