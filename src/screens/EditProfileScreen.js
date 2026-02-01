import {
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import Screen from "../components/Screen";
import AppHeader from "../components/AppHeader";
import Avatar from "../components/Avatar";
import colors from "../helpers/colors";
import { useDispatch, useSelector } from "react-redux";
import {
  selectUser,
  useUpdateUserProfileMutation,
} from "../context/usersSlice";
import { Formik } from "formik";
import { FormikInput } from "../components/FormInput";
import yupSchemas from "../helpers/yupSchemas";
import { FormikButton } from "../components/AppButton";
import PopMessage from "../components/PopMessage";
import LottieAnimator from "../components/LottieAnimator";
import { capFirstLetter, dateFormatter } from "../helpers/helperFunctions";
import {
  genderDropdown,
  ngLocale,
  schoolClasses,
  states,
  teacherPreffix,
} from "../helpers/dataStore";
import { nanoid } from "@reduxjs/toolkit";
import AppText from "../components/AppText";
import { useRouter } from "expo-router";

const bithYears = Array(45)
  .fill(0)
  .map((_num, idx) => {
    const currentYear = new Date().getFullYear() - 15;
    return currentYear - idx;
  });

const { width, height } = Dimensions.get("screen");

const EditProfileScreen = () => {
  const user = useSelector(selectUser);

  const [updateUserProfile, { isLoading, isError, error, isSuccess }] =
    useUpdateUserProfileMutation();

  const [popper, setPopper] = useState({ vis: false });
  const [errMsg, setErrMsg] = useState(null);

  const isTeacher = user?.accountType === "teacher";
  const isStudent = user?.accountType === "student";
  const router = useRouter();

  const editProfileInitials = {
    address: user?.address ?? "",
    email: user?.email ?? "",
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    state: { _id: "1", name: user?.state } ?? "",
    lga: { _id: "1", name: user?.lga } ?? "",
    class: { _id: "1", name: user?.class?.level } ?? "",
    country: user?.country ?? "nigeria",
    gender: { _id: "1", name: user?.gender } ?? "",
    birthday: user?.birthday ?? null,
    contact: user?.contact ?? 0,
    preffix: { _id: "1", name: user?.preffix } ?? "",
  };

  const handleImagePicker = (image) => {
    if (image.error) {
      setErrMsg(image.error);
    } else {
      // update user cover image
    }
  };

  const handleFormSubmit = async (formValues) => {
    try {
      await updateUserProfile(formValues).unwrap();
    } catch (err) {}
  };

  const handleImagePickerError = (bool) => {
    if (bool) {
      setPopper({
        vis: true,
        type: "failed",
        msg: "Operation was canceled",
      });
    }
  };

  useEffect(() => {
    if (isSuccess) {
      setPopper({
        vis: true,
        msg: "Your profile has been updated successfully",
        timer: 3000,
        type: "success",
      });
    }
  }, [isSuccess, router]);

  return (
    <>
      <View style={styles.container}>
        <AppHeader title="Edit Profile" />
        <KeyboardAvoidingView
          keyboardVerticalOffset={10}
          behavior="padding"
          style={{ flex: 1 }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: height * 0.15 }}
          >
            <View style={styles.main}>
              <Avatar
                source={user?.avatar?.image}
                imagePicker={handleImagePicker}
                imagePickerError={handleImagePickerError}
                size={width * 0.5}
              />
              <View style={{ marginTop: 20 }}>
                <Formik
                  validationSchema={yupSchemas.editProfileSchema}
                  initialValues={editProfileInitials}
                  onSubmit={handleFormSubmit}
                >
                  {({ values, errors }) => {
                    const dataNG = ngLocale.find(
                      (item) =>
                        item.state?.toLowerCase() ==
                        values["state"]?.name?.toLowerCase(),
                    );
                    const dataArr = dataNG?.lgas?.map((item) => ({
                      _id: nanoid(),
                      name: item,
                    }));

                    return (
                      <View style={{ flex: 1 }}>
                        <FormikInput
                          name={"firstName"}
                          placeholder={`${
                            user.firstName ?? "Enter your first name"
                          }`}
                          headerText={"First Name:"}
                        />
                        <FormikInput
                          name={"lastName"}
                          placeholder={`${
                            user.lastName ?? "Enter your last name"
                          }`}
                          headerText={"Last Name:"}
                        />
                        {isTeacher && (
                          <FormikInput
                            name={"preffix"}
                            placeholder={"Select name preffix"}
                            data={teacherPreffix}
                            numDisplayItems={3}
                            headerText={"Name preffix"}
                            type="dropdown"
                          />
                        )}
                        <FormikInput
                          name={"email"}
                          placeholder={`${
                            user.email ?? "Enter your email address"
                          }`}
                          headerText={"Email:"}
                        />
                        {isStudent && (
                          <FormikInput
                            name={"class"}
                            disabled={user?.class?.hasChanged && user?.verified}
                            placeholder={
                              user?.class?.level
                                ? `${user.class?.level?.toUpperCase()}`
                                : "Select your current class"
                            }
                            data={schoolClasses}
                            // numDisplayItems={2}
                            headerText={"Class level"}
                            type="dropdown"
                          />
                        )}

                        {!isTeacher && (
                          <FormikInput
                            name={"gender"}
                            placeholder={user.gender ?? "Select your gender"}
                            headerText={"Gender:"}
                            useDefaultModalHeight
                            data={genderDropdown}
                            type="dropdown"
                          />
                        )}
                        <FormikInput
                          name={"address"}
                          placeholder={`${
                            user.address ??
                            "Enter your current residential address"
                          }`}
                          headerText={"Residential Address:"}
                        />
                        <FormikInput
                          name={"birthday"}
                          placeholder={`${
                            dateFormatter(user.birthday, "fullDate") ??
                            "Select your birthday"
                          }`}
                          headerText={"Birthday:"}
                          type="date"
                          rangeYrs={isStudent ? null : bithYears}
                        />
                        <FormikInput
                          name={"state"}
                          data={states}
                          placeholder={`${
                            capFirstLetter(user.state) ?? "Select your state"
                          }`}
                          headerText={"State:"}
                          type="dropdown"
                        />
                        <FormikInput
                          headerText={"LGA"}
                          placeholder={user?.lga ?? "Local government area"}
                          type="dropdown"
                          data={dataArr}
                          name={"lga"}
                        />
                        <FormikInput
                          name={"contact"}
                          keyboardType="numeric"
                          headerText={"Contact:"}
                          LeftComponent={() => (
                            <View>
                              <AppText
                                fontWeight="bold"
                                style={{ color: colors.medium }}
                              >
                                +234
                              </AppText>
                            </View>
                          )}
                          placeholder={`${
                            user?.contact ?? "Enter your contact info"
                          }`}
                        />
                        {isError && (
                          <AppText style={styles.error}>
                            {error?.message}
                          </AppText>
                        )}

                        <FormikButton
                          title={"Update Profile"}
                          contStyle={{ marginTop: 20 }}
                        />
                      </View>
                    );
                  }}
                </Formik>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        <LottieAnimator visible={isLoading} absolute wTransparent />
      </View>
      <PopMessage popData={popper} setPopData={setPopper} />
    </>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.unchange,
    flex: 1,
  },
  error: {
    textAlign: "center",
    color: colors.heart,
    marginVertical: 10,
  },
  main: {
    alignItems: "center",
    flex: 1,
  },
});
