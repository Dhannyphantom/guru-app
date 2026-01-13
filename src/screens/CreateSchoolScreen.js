import { Dimensions, ScrollView, StyleSheet, View } from "react-native";

import AppHeader from "../components/AppHeader";
import { Formik } from "formik";
import { FormikInput } from "../components/FormInput";
import AppButton, { FormikButton } from "../components/AppButton";
import {
  createSchoolInitials,
  createSchoolSchema,
} from "../helpers/yupSchemas";
import {
  ngLocale,
  schoolLevels,
  schoolTypes,
  states,
} from "../helpers/dataStore";
import { useState } from "react";
import AppModal from "../components/AppModal";
import { nanoid } from "@reduxjs/toolkit";
import Animated from "react-native-reanimated";
import LottieAnimator from "../components/LottieAnimator";
import colors from "../helpers/colors";
import AppText from "../components/AppText";
import { useCreateSchoolMutation } from "../context/schoolSlice";
import DisplayPayments from "../components/DisplayPayments";
import PopMessage from "../components/PopMessage";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("screen");

const CreationModal = ({ hideModal, data }) => {
  const [screen, setScreen] = useState(0);

  return (
    <>
      {screen == 0 && (
        <Animated.View style={styles.created}>
          <LottieAnimator
            visible
            name="success"
            style={{ alignSelf: "center" }}
            size={width * 0.7}
          />
          <AppText size={"large"} fontWeight="bold" style={styles.createdTitle}>
            Your school{" "}
            <AppText
              style={{
                textTransform: "capitalize",
                color: colors.primaryDeep,
              }}
              size={"xlarge"}
              fontWeight="black"
            >
              {data?.school?.name}
            </AppText>{" "}
            school profile has successfully been created
          </AppText>
          <AppText fontWeight="bold" style={styles.createdTxt}>
            Subscribe now to give your students and teachers access to Guru
          </AppText>

          <View>
            <AppButton title={"Subscribe Now"} onPress={() => setScreen(1)} />
            <AppButton
              title={"Maybe Later"}
              type="accent"
              onPress={hideModal}
            />
          </View>
        </Animated.View>
      )}
      {screen == 1 && <DisplayPayments hideModal={hideModal} data={data} />}
    </>
  );
};

const CreateSchoolScreen = () => {
  const [bools, setBools] = useState({ subModal: false, data: null });
  const [createSchool, { isLoading }] = useCreateSchoolMutation();
  const [popper, setPopper] = useState({ vis: false });

  const router = useRouter();

  const handleSubmit = async (formData) => {
    // console.log({ formData });
    try {
      const res = await createSchool(formData).unwrap();
      if (res?.status == "success") {
        setBools({
          ...bools,
          subModal: true,
          data: { type: "school", school: res?.data },
        });
      }
    } catch (err) {
      setPopper({
        vis: true,
        type: "failed",
        timer: 4500,
        msg: err?.data,
      });
    }
  };

  const onModalClose = (refresh) => {
    setBools({ ...bools, subModal: false });
    // replace("Learn", { refresh });
    router.replace({
      pathname: "/school",
      params: { refresh },
    });
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Create School Profile" />
      <ScrollView contentContainerStyle={{ paddingBottom: height * 0.12 }}>
        <Formik
          validationSchema={createSchoolSchema}
          initialValues={createSchoolInitials}
          onSubmit={handleSubmit}
        >
          {({ values }) => {
            const dataNG = ngLocale.find(
              (item) =>
                item.state?.toLowerCase() ==
                values["state"]?.name?.toLowerCase()
            );
            const dataArr = dataNG?.lgas?.map((item) => ({
              _id: nanoid(),
              name: item,
            }));
            return (
              <>
                <FormikInput
                  headerText={"School Name"}
                  name={"name"}
                  placeholder={"Name"}
                />
                <FormikInput
                  headerText={"State"}
                  placeholder={"Select your state"}
                  name={"state"}
                  data={states}
                  type="dropdown"
                />
                <FormikInput
                  headerText={"School LGA"}
                  placeholder={"Local government area"}
                  type="dropdown"
                  data={dataArr}
                  name={"lga"}
                />
                <FormikInput
                  name={"type"}
                  placeholder={"Select school type"}
                  type="dropdown"
                  data={schoolTypes}
                  numDisplayItems={2}
                  headerText={"Select School Type:"}
                  // onLayout={() => setFieldTouched("categories", true)}
                  // showErr={bools.showErr}
                />
                <FormikInput
                  name={"levels"}
                  placeholder={"Select levels"}
                  type="dropdown"
                  numDisplayItems={4}
                  data={schoolLevels}
                  multiple
                  headerText={"Select Educational Levels:"}
                  // onLayout={() => setFieldTouched("categories", true)}
                  // showErr={bools.showErr}
                />
                <FormikInput
                  headerText={"School Official Email"}
                  name={"email"}
                  placeholder={"Email"}
                />
                <FormikInput
                  headerText={"School Official Contact"}
                  name={"contact"}
                  placeholder={"Phone number"}
                />
                <FormikButton
                  title={"Create Profile"}
                  contStyle={styles.formBtn}
                />
              </>
            );
          }}
        </Formik>
      </ScrollView>
      <AppModal
        visible={bools.subModal}
        setVisible={(bool) => setBools({ ...bools, subModal: bool })}
        Component={() => (
          <CreationModal hideModal={onModalClose} data={bools?.data} />
        )}
      />
      <LottieAnimator visible={isLoading} absolute wTransparent />
      <PopMessage popData={popper} setPopData={setPopper} />
    </View>
  );
};

export default CreateSchoolScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  created: {
    width: width * 0.95,
    minHeight: height * 0.55,
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 15,
  },
  createdTitle: {
    textAlign: "center",
    marginTop: 10,
  },
  createdTxt: {
    textAlign: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  formBtn: { marginHorizontal: width * 0.16, marginTop: 20 },
});
