import { useState } from "react";

import { selectSchool, useCreateClassMutation } from "../context/schoolSlice";
import {
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import AppText from "./AppText";
import { FormikInput } from "../components/FormInput";
import AppButton, { FormikButton } from "../components/AppButton";
import PopMessage from "./PopMessage";
import { Formik } from "formik";
import { newClassInitials, newClassSchema } from "../helpers/yupSchemas";
import {
  enterAnimOther,
  exitingAnim,
  layoutTransit,
  schoolClasses,
} from "../helpers/dataStore";
import LottieAnimator from "./LottieAnimator";
import colors from "../helpers/colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import Screen from "./Screen";
import AppHeader from "./AppHeader";
import { useSelector } from "react-redux";

const { width, height } = Dimensions.get("screen");

const NewClass = () => {
  const [bools, setBools] = useState({ screen: "create" });
  const [popper, setPopper] = useState({ vis: false });
  const params = useLocalSearchParams();
  const school = useSelector(selectSchool);

  const [createClass, { isLoading }] = useCreateClassMutation();

  const router = useRouter();
  const handleForm = async (formData, cb) => {
    try {
      const res = await createClass({
        ...formData,
        schoolId: school?._id,
      }).unwrap();
      if (res.status === "success") {
        setPopper({
          vis: true,
          timer: 2000,
          msg: `${formData?.name} class${
            formData?.type === "all" ? "es" : ""
          } created successfully`,
          type: "success",
          cb: () => cb && cb(),
        });
      }
    } catch (error) {
      setPopper({
        vis: true,
        timer: 2000,
        msg: error?.data?.message ?? "Something went wrong, Please retry",
        type: "failed",
      });
    }
  };

  const handlePopulate = (type) => {
    switch (type) {
      case "prompt":
        setBools({ ...bools, screen: "populate" });

        break;
      case "continue":
        handleForm({ name: "All", type: "all" }, () => router.back());

        break;
    }
  };

  return (
    <>
      <AppHeader title="School Classes" />
      <ScrollView style={styles.scrollView}>
        <Animated.View layout={layoutTransit} style={styles.form}>
          {bools?.screen === "create" && (
            <Animated.View entering={enterAnimOther} exiting={exitingAnim}>
              <Formik
                validationSchema={newClassSchema}
                initialValues={newClassInitials}
                onSubmit={(fv) => handleForm({ ...fv, type: "single" })}
              >
                <>
                  <FormikInput
                    name={"class"}
                    placeholder={"Select Class"}
                    type="dropdown"
                    data={schoolClasses}
                    // multiple
                    headerText={"Select Class:"}
                    // onLayout={() => setFieldTouched("topics", true)}
                    // showErr={bools.showErr}
                  />
                  <FormikInput
                    name={"name"}
                    placeholder="Class alias e.g The Overcomers or SS2"
                  />
                  <View style={styles.formBtns}>
                    <FormikButton title={"Create"} />

                    <AppButton
                      title={"Close"}
                      type="warn"
                      onPress={() => router.back()}
                    />
                  </View>
                  <View style={styles.footer}>
                    <View style={styles.footerHead}>
                      <View style={styles.separator} />
                      <AppText style={styles.footerTxt} fontWeight="heavy">
                        OR
                      </AppText>
                      <View style={styles.separator} />
                    </View>
                    <AppButton
                      title={"Auto-Create All Classes"}
                      type="accent"
                      onPress={() => handlePopulate("prompt")}
                    />
                  </View>
                </>
              </Formik>
            </Animated.View>
          )}
          {bools?.screen === "populate" && (
            <Animated.View entering={enterAnimOther} exiting={exitingAnim}>
              <AppText fontWeight="medium" style={styles.formText}>
                This will automatically create all the class levels from JSS 1
                to SSS 3, but with no generic names.{"\n\n"}Are you sure you
                want to continue?
              </AppText>
              <View style={styles.formBtns}>
                <AppButton
                  title={"Populate All Classes"}
                  onPress={() => handlePopulate("continue")}
                  type="accent"
                />
                <AppButton
                  title={"Cancel"}
                  onPress={() => setBools({ ...bools, screen: "create" })}
                  type="warn"
                />
              </View>
            </Animated.View>
          )}
          <LottieAnimator visible={isLoading} absolute wTransparent />
        </Animated.View>
      </ScrollView>
      <PopMessage popData={popper} setPopData={setPopper} />
    </>
  );
};

export default NewClass;

const styles = StyleSheet.create({
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
