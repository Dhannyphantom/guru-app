import {
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import AppText from "../components/AppText";
import { Formik } from "formik";
import {
  newAnnouncementInitials,
  newAnnouncementSchema,
} from "../helpers/yupSchemas";
import { FormikInput } from "./FormInput";
import AppButton, { FormikButton } from "./AppButton";
import colors from "../helpers/colors";
import { schoolClasses } from "../helpers/dataStore";
import Animated, { LinearTransition } from "react-native-reanimated";
import { useSelector } from "react-redux";
import {
  selectSchool,
  useCreateAnnouncementMutation,
} from "../context/schoolSlice";
import LottieAnimator from "./LottieAnimator";
import PopMessage from "./PopMessage";
import { useState } from "react";

const layoutTrans = LinearTransition.springify().damping(18);

const { width, height } = Dimensions.get("screen");

const NewAnnouncement = ({ closeModal }) => {
  const school = useSelector(selectSchool);
  const [createAnnouncement, { isLoading }] = useCreateAnnouncementMutation();

  const [popper, setPopper] = useState({ vis: false });

  const handleForm = async (formData) => {
    try {
      const res = await createAnnouncement({
        ...formData,
        schoolId: school?._id,
      }).unwrap();
      if (res.status == "success") {
        setPopper({
          vis: true,
          msg: "New announcement created successfully",
          type: "success",
          timer: 1500,
          cb: () => closeModal(),
        });
      }
    } catch (error) {
      console.log(error);
      setPopper({
        vis: true,
        msg:
          error?.data ??
          error?.message ??
          "Something went wrong, Try again please",
        type: "failed",
        timer: 3500,
      });
    }
  };

  return (
    <>
      <KeyboardAvoidingView style={styles.avoidingView} behavior={"padding"}>
        <Animated.View layout={layoutTrans} style={styles.form}>
          <AppText style={styles.formTitle} size={"xlarge"} fontWeight="heavy">
            New Announcement
          </AppText>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Formik
              validationSchema={newAnnouncementSchema}
              initialValues={newAnnouncementInitials}
              onSubmit={handleForm}
            >
              <>
                <FormikInput
                  name={"title"}
                  headerText={"Announcement Message"}
                  placeholder="Enter Announcement"
                  style={{
                    minHeight: 150,
                    alignItems: "flex-start",
                    paddingTop: 12,
                  }}
                  multiline
                  numberOfLines={5}
                />

                <FormikInput
                  name={"classes"}
                  placeholder={"Select Classes"}
                  type="dropdown"
                  data={schoolClasses}
                  multiple
                  headerText={"Announcement For:"}
                  // onLayout={() => setFieldTouched("topics", true)}
                  // showErr={bools.showErr}
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
      </KeyboardAvoidingView>
      <PopMessage popData={popper} setPopData={setPopper} />
    </>
  );
};

export default NewAnnouncement;

const styles = StyleSheet.create({
  avoidingView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  form: {
    width: width * 0.95,
    backgroundColor: colors.white,
    boxShadow: `2px 8px 18px ${colors.primary}25`,
    borderRadius: 15,
    paddingVertical: 16,
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
});
