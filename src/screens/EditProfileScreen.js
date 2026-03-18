import {
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
  Pressable,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
// import Screen from "../components/Screen";
import AppHeader from "../components/AppHeader";
import Avatar from "../components/Avatar";
import colors from "../helpers/colors";
import { useSelector } from "react-redux";
import {
  selectUser,
  useUpdateUserProfileMutation,
  useSendEmailOtpMutation,
  useVerifyEmailOtpMutation,
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
import { Ionicons } from "@expo/vector-icons";

const bithYears = Array(45)
  .fill(0)
  .map((_num, idx) => {
    const currentYear = new Date().getFullYear() - 15;
    return currentYear - idx;
  });

const { width, height } = Dimensions.get("screen");

// Simple email regex for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const OTP_RESEND_COUNTDOWN = 60; // seconds

const EditProfileScreen = () => {
  const user = useSelector(selectUser);

  const [updateUserProfile, { isLoading, isError, error, isSuccess }] =
    useUpdateUserProfileMutation();

  // These mutations should be wired up in your usersSlice:
  //   sendEmailOtp(email) — sends OTP to the given email
  //   verifyEmailOtp({ email, otp }) — verifies OTP, returns success/failure
  const [sendEmailOtp, { isLoading: isSendingOtp }] = useSendEmailOtpMutation();
  const [verifyEmailOtp, { isLoading: isVerifyingOtp }] =
    useVerifyEmailOtpMutation();

  const [popper, setPopper] = useState({ vis: false });
  const [errMsg, setErrMsg] = useState(null);

  // OTP / email verification state
  const [emailInput, setEmailInput] = useState(user?.email ?? "");
  const [otpValue, setOtpValue] = useState("");
  const [otpSent, setOtpSent] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState(user?.email ?? "");
  const [otpError, setOtpError] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(null);

  const isTeacher = user?.accountType === "teacher";
  const isStudent = user?.accountType === "student";
  const router = useRouter();

  // Determine if the email currently entered is a "new" email that needs verification
  const isNewEmail = EMAIL_REGEX.test(emailInput) && emailInput !== user?.email;
  const isExistingUnverifiedEmail =
    EMAIL_REGEX.test(emailInput) &&
    emailInput === user?.email &&
    !user?.emailVerified;

  // Email requires OTP if it's new or existing but unverified
  const requiresOtp = isNewEmail || isExistingUnverifiedEmail;

  // Whether the current email field state is valid and verified
  const currentEmailReady =
    EMAIL_REGEX.test(emailInput) &&
    (emailVerified || (emailInput === user?.email && user?.emailVerified));

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

  // Start / reset the resend countdown
  const startCountdown = () => {
    setCountdown(OTP_RESEND_COUNTDOWN);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Reset OTP state whenever email input changes
  const handleEmailChange = (val) => {
    setEmailInput(val);
    setOtpSent(false);
    setOtpValue("");
    setOtpError(null);
    setEmailVerified(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(0);
  };

  const handleSendOtp = async () => {
    if (!EMAIL_REGEX.test(emailInput)) return;
    setOtpError(null);
    setOtpValue("");
    try {
      await sendEmailOtp(emailInput).unwrap();
      setOtpSent(true);
      startCountdown();
      setPopper({
        vis: true,
        msg: `OTP sent to ${emailInput}`,
        timer: 3000,
        type: "success",
      });
    } catch (err) {
      setOtpError(
        err?.data?.message || err?.data || "Failed to send OTP. Try again.",
      );
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValue || otpValue.length < 4) {
      setOtpError("Please enter the OTP sent to your email.");
      return;
    }
    setOtpError(null);
    try {
      await verifyEmailOtp({ email: emailInput, otp: otpValue }).unwrap();
      setEmailVerified(true);
      setVerifiedEmail(emailInput);
      setPopper({
        vis: true,
        msg: "Email verified successfully!",
        timer: 3000,
        type: "success",
      });
    } catch (err) {
      setOtpError(
        err?.data?.message || err?.data || "Invalid OTP. Please try again.",
      );
    }
  };

  const handleImagePicker = (image) => {
    if (image.error) {
      setErrMsg(image.error);
    } else {
      // update user cover image
    }
  };

  const handleFormSubmit = async (formValues) => {
    // Guard: email must be verified before submitting
    if (!currentEmailReady) {
      setErrMsg(
        "Please verify your email address before updating your profile.",
      );
      return;
    }
    setErrMsg(null);
    try {
      await updateUserProfile({
        ...formValues,
        email: verifiedEmail || emailInput,
      }).unwrap();
    } catch (err) {
      console.log(err);
      setErrMsg(
        err?.data?.includes("duplicate key error")
          ? "Email already exists"
          : err?.data || "An error occurred",
      );
    }
  };

  const handleImagePickerError = (bool, err) => {
    console.log(err);
    if (bool) {
      setPopper({
        vis: true,
        type: "failed",
        timer: 2500,
        msg:
          err?.data ||
          err?.message ||
          err?.data?.message ||
          "Operation was canceled, please try again",
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
        {errMsg && (
          <AppText size="small" fontWeight="medium" style={styles.error}>
            {errMsg}
          </AppText>
        )}
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
                  {({ values, errors, setFieldValue }) => {
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
                            useDefaultModalHeight
                            type="dropdown"
                          />
                        )}

                        {/* ── Email field ── */}
                        <FormikInput
                          name={"email"}
                          placeholder={"Enter your email address"}
                          headerText={"Email:"}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          onChangeText={(val) => {
                            setFieldValue("email", val);
                            handleEmailChange(val);
                          }}
                          value={emailInput}
                          RightComponent={
                            currentEmailReady
                              ? () => (
                                  <View style={styles.verifiedBadge}>
                                    <Ionicons
                                      name="checkmark-circle"
                                      size={18}
                                      color={colors.success ?? "#22c55e"}
                                    />
                                    <AppText
                                      size="xsmall"
                                      fontWeight="medium"
                                      style={styles.verifiedText}
                                    >
                                      Verified
                                    </AppText>
                                  </View>
                                )
                              : undefined
                          }
                        />

                        {/* ── Send OTP button — shown when email is valid and not yet verified ── */}
                        {requiresOtp && !emailVerified && (
                          <View style={styles.otpSection}>
                            <View style={styles.otpInfoRow}>
                              <Ionicons
                                name="mail-outline"
                                size={14}
                                color={colors.medium}
                              />
                              <AppText
                                size="xsmall"
                                fontWeight="light"
                                style={styles.otpInfoText}
                              >
                                {isNewEmail
                                  ? "A new email requires verification. "
                                  : "Your email is not verified. "}
                                {otpSent
                                  ? "Check your inbox for the OTP."
                                  : "Tap below to send an OTP."}
                              </AppText>
                            </View>

                            {/* Send / Resend OTP button */}
                            <Pressable
                              style={[
                                styles.otpActionBtn,
                                (isSendingOtp || countdown > 0) &&
                                  styles.otpActionBtnDisabled,
                              ]}
                              onPress={handleSendOtp}
                              disabled={isSendingOtp || countdown > 0}
                              activeOpacity={0.75}
                            >
                              {isSendingOtp ? (
                                <AppText
                                  size="small"
                                  fontWeight="semibold"
                                  style={styles.otpActionBtnText}
                                >
                                  Sending...
                                </AppText>
                              ) : countdown > 0 ? (
                                <AppText
                                  size="small"
                                  fontWeight="semibold"
                                  style={styles.otpActionBtnText}
                                >
                                  Resend OTP in {countdown}s
                                </AppText>
                              ) : (
                                <AppText
                                  size="small"
                                  fontWeight="semibold"
                                  style={styles.otpActionBtnText}
                                >
                                  {otpSent ? "Resend OTP" : "Send OTP"}
                                </AppText>
                              )}
                            </Pressable>

                            {/* OTP input + Verify — shown after OTP is sent */}
                            {otpSent && (
                              <View style={styles.otpInputRow}>
                                <View style={styles.otpInputWrapper}>
                                  <AppText
                                    size="xsmall"
                                    fontWeight="medium"
                                    style={styles.otpLabel}
                                  >
                                    Enter OTP:
                                  </AppText>
                                  <FormikInput
                                    name={"_otp"}
                                    placeholder={"e.g. 123456"}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    value={otpValue}
                                    onChangeText={(val) => {
                                      setOtpValue(val);
                                      setOtpError(null);
                                    }}
                                    style={styles.otpInput}
                                  />
                                </View>
                                <Pressable
                                  style={[
                                    styles.verifyBtn,
                                    isVerifyingOtp &&
                                      styles.otpActionBtnDisabled,
                                  ]}
                                  onPress={handleVerifyOtp}
                                  disabled={isVerifyingOtp}
                                  activeOpacity={0.75}
                                >
                                  <AppText
                                    size="small"
                                    fontWeight="bold"
                                    style={styles.verifyBtnText}
                                  >
                                    {isVerifyingOtp ? "Verifying..." : "Verify"}
                                  </AppText>
                                </Pressable>
                              </View>
                            )}

                            {otpError && (
                              <AppText
                                size="xsmall"
                                fontWeight="medium"
                                style={styles.otpError}
                              >
                                {otpError}
                              </AppText>
                            )}
                          </View>
                        )}

                        {isStudent && (
                          <>
                            <FormikInput
                              name={"class"}
                              disabled={
                                user?.class?.hasChanged && user?.verified
                              }
                              placeholder={
                                user?.class?.level
                                  ? `${user.class?.level?.toUpperCase()}`
                                  : "Select your current class"
                              }
                              data={schoolClasses}
                              headerText={"Class level"}
                              type="dropdown"
                            />
                            <View style={styles.info}>
                              <Ionicons
                                name="information-circle-outline"
                                size={14}
                                color={colors.medium}
                              />
                              <AppText
                                style={{ color: colors.medium, width: "90%" }}
                                size="xsmall"
                                fontWeight="light"
                              >
                                Ensure you provide your accurate current class
                                as you{" "}
                                <AppText size="small" fontWeight="heavy">
                                  CANNOT
                                </AppText>{" "}
                                change this later. Only your Teachers can update
                                student class info{" "}
                              </AppText>
                            </View>
                          </>
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
                          disabled={requiresOtp && !emailVerified}
                        />

                        {requiresOtp && !emailVerified && (
                          <AppText
                            size="xsmall"
                            fontWeight="light"
                            style={styles.submitHint}
                          >
                            Verify your email to enable profile update.
                          </AppText>
                        )}
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
  info: {
    flexDirection: "row",
    marginHorizontal: 15,
    gap: 2,
    bottom: 10,
  },
  main: {
    alignItems: "center",
    flex: 1,
  },

  // ── OTP section ──────────────────────────────────
  otpSection: {
    marginHorizontal: 15,
    marginBottom: 12,
    backgroundColor: colors.light ?? "#f5f5f5",
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  otpInfoRow: {
    flexDirection: "row",
    gap: 4,
    alignItems: "flex-start",
  },
  otpInfoText: {
    color: colors.medium,
    flex: 1,
  },
  otpActionBtn: {
    backgroundColor: colors.primary ?? "#4f46e5",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  otpActionBtnDisabled: {
    opacity: 0.5,
  },
  otpActionBtnText: {
    color: "#fff",
  },
  otpInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  otpInputWrapper: {
    flex: 1,
  },
  otpLabel: {
    color: colors.medium,
    marginBottom: 4,
  },
  otpInput: {
    marginBottom: 0,
    width: "100%",
    backgroundColor: colors.extraLight,
  },
  verifyBtn: {
    backgroundColor: colors.success ?? "#22c55e",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  verifyBtnText: {
    color: "#fff",
  },
  otpError: {
    color: colors.heart,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingRight: 4,
  },
  verifiedText: {
    color: colors.success ?? "#22c55e",
  },
  submitHint: {
    textAlign: "center",
    color: colors.medium,
    marginTop: 6,
  },
});
