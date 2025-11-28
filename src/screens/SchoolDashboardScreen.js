import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import AppText from "../components/AppText";
import {
  DashboardActions,
  enterAnimOther,
  exitingAnim,
  schoolClasses,
} from "../helpers/dataStore";
import { ProfileLink } from "./ProfileScreen";
import colors from "../helpers/colors";
import { Header } from "./NotificationsScreen";
import AppModal from "../components/AppModal";
import { useState } from "react";
import { FormikInput } from "../components/FormInput";
import AppButton, { FormikButton } from "../components/AppButton";
import { Formik } from "formik";
import {
  newAssignmentInitials,
  newAssignmentSchema,
  newClassInitials,
  newClassSchema,
} from "../helpers/yupSchemas";
import Animated, { LinearTransition } from "react-native-reanimated";
import NewAnnouncement from "../components/NewAnnouncement";
import { useSelector } from "react-redux";
import {
  selectSchool,
  useCreateAssignmentMutation,
  useCreateClassMutation,
} from "../context/schoolSlice";
import LottieAnimator from "../components/LottieAnimator";
import PopMessage from "../components/PopMessage";
import { useFetchSubjectsQuery } from "../context/instanceSlice";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("screen");
const layoutTrans = LinearTransition.springify().damping(50);

export const NewAssignment = ({ closeModal, data }) => {
  const { data: subjects, isLoading: subjLoading } = useFetchSubjectsQuery();
  const [createAssignment, { isLoading }] = useCreateAssignmentMutation();

  const [popper, setPopper] = useState({ vis: false });

  const handleForm = async (formData) => {
    try {
      const res = await createAssignment({
        ...formData,
        schoolId: data?.schoolId,
      }).unwrap();
      if (res.status === "success") {
        setPopper({
          vis: true,
          timer: 2000,
          msg: `Assignment created successfully`,
          type: "success",
          cb: () => closeModal && closeModal(),
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
    <KeyboardAvoidingView style={styles.avoidingView} behavior="padding">
      <Animated.View layout={layoutTrans} style={styles.form}>
        <AppText style={styles.formTitle} size={"xlarge"} fontWeight="heavy">
          New Assignment
        </AppText>
        <ScrollView showsVerticalScrollIndicator={false}>
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
                name={"question"}
                headerText={"Assignment Question"}
                placeholder="Enter Assigment Question"
                multiline
                numberOfLines={5}
              />

              <FormikInput
                name={"title"}
                headerText={"Assignment Title"}
                placeholder="Title e.g the topic, context or a reference"
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

                <AppButton title={"Close"} type="warn" onPress={closeModal} />
              </View>
            </>
          </Formik>
        </ScrollView>
        <LottieAnimator visible={isLoading} absolute wTransparent />
      </Animated.View>
      <PopMessage popData={popper} setPopData={setPopper} />
    </KeyboardAvoidingView>
  );
};

const SchoolDashboardScreen = () => {
  const [modal, setModal] = useState({ vis: false, type: null });

  const school = useSelector(selectSchool);
  const router = useRouter();

  let ModalComponent = null;
  switch (modal?.type) {
    case "announcement":
      ModalComponent = NewAnnouncement;
      break;
    case "assignment":
      ModalComponent = NewAssignment;
      break;
  }

  const handleActionPress = (item) => {
    if (item?.modal) {
      setModal({ vis: true, type: item.modal });
    } else if (item?.nav) {
      // router.push("/(protected)/quiz/new_quiz")
      router.push({
        pathname: item?.nav?.screen,
        params: { data: JSON.stringify(item?.nav?.data) },
      });
      // navigation?.navigate(item.nav?.screen, item?.nav?.data);
    }
  };

  return (
    <View style={styles.container}>
      <Header title={school?.name} icon="school" />
      <View style={styles.main}>
        <FlatList
          data={DashboardActions}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <ProfileLink
              title={item.name}
              icon={item.icon}
              onPress={() => handleActionPress(item)}
            />
          )}
        />
      </View>
      <AppModal
        visible={modal.vis}
        setVisible={(bool) => setModal({ ...modal, vis: bool })}
        Component={() => (
          <ModalComponent
            data={{ schoolId: school?._id }}
            closeModal={() => setModal({ vis: false, type: null })}
          />
        )}
      />
    </View>
  );
};

export default SchoolDashboardScreen;

const styles = StyleSheet.create({
  avoidingView: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
  },
  form: {
    width: width * 0.95,
    backgroundColor: colors.white,
    elevation: 6,
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: "center",
    // minHeight: height * 0.4,
    maxHeight: height * 0.9,
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
