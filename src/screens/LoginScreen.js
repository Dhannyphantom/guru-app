/* eslint-disable react/no-unescaped-entities */
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Keyboard,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import React, { useState, useRef, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import LottieAnimator from "../components/LottieAnimator";
import colors from "../helpers/colors";
import { FormikButton } from "../components/AppButton";
import { FormikInput } from "../components/FormInput";
import { Formik } from "formik";
import yupSchemas from "../helpers/yupSchemas";
import { useSignInUserMutation } from "../context/usersSlice";
import AnimatedPressable from "../components/AnimatedPressable";
import WebLayout from "../components/WebLayout";
import { useRouter } from "expo-router";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  interpolate,
  Extrapolation,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
  ZoomIn,
  ZoomOut,
  LinearTransition,
} from "react-native-reanimated";

const { loginInitials, validationSchemaLogin } = yupSchemas;
const { width, height } = Dimensions.get("screen");

// ─── STEP INDICATORS ──────────────────────────────────────────────────────────
const StepDot = ({ active, done, index }) => {
  const scale = useSharedValue(active ? 1 : 0.7);
  React.useEffect(() => {
    scale.value = withSpring(active ? 1.1 : done ? 1 : 0.7);
  }, [active, done]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        stepStyles.dot,
        active && stepStyles.dotActive,
        done && stepStyles.dotDone,
        animStyle,
      ]}
    >
      {done ? (
        <Ionicons name="checkmark" size={10} color="#fff" />
      ) : (
        <AppText style={[stepStyles.dotText, active && { color: "#fff" }]}>
          {index + 1}
        </AppText>
      )}
    </Animated.View>
  );
};

const stepStyles = StyleSheet.create({
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  dotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dotDone: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  dotText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#aaa",
  },
});

// ─── 6-DIGIT CODE INPUT ────────────────────────────────────────────────────────
const CodeInput = ({ value, onChange }) => {
  const inputRef = useRef(null);
  const shakeSv = useSharedValue(0);
  const digits = (value + "      ").slice(0, 6).split("");

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeSv.value }],
  }));

  const shake = () => {
    shakeSv.value = withSequence(
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(-6, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  };

  return (
    <Animated.View style={[codeStyles.wrapper, shakeStyle]}>
      <View style={codeStyles.dotsRow}>
        {digits.map((d, i) => {
          const filled = d.trim().length > 0;
          const isCursor = i === Math.min(value.length, 5);
          return (
            <Animated.View
              key={i}
              entering={ZoomIn.delay(i * 40).springify()}
              style={[
                codeStyles.cell,
                filled && codeStyles.cellFilled,
                isCursor && value.length < 6 && codeStyles.cellCursor,
              ]}
            >
              {filled ? (
                <AppText style={codeStyles.digit}>{d}</AppText>
              ) : (
                <View style={codeStyles.emptyDot} />
              )}
            </Animated.View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        style={codeStyles.hiddenInput}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, "").slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        caretHidden
      />
      <TouchableOpacity
        onPress={() => inputRef.current?.focus()}
        style={codeStyles.tapArea}
      />
    </Animated.View>
  );
};

const codeStyles = StyleSheet.create({
  wrapper: { alignItems: "center", marginVertical: 16 },
  dotsRow: { flexDirection: "row", gap: 10 },
  cell: {
    width: 44,
    height: 54,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e8e8e8",
    backgroundColor: "#fafafa",
    alignItems: "center",
    justifyContent: "center",
  },
  cellFilled: {
    borderColor: colors.primary,
    backgroundColor: "#f0f5ff",
  },
  cellCursor: {
    borderColor: colors.primary,
    borderStyle: "dashed",
  },
  digit: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.primary,
  },
  emptyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ddd",
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
  tapArea: {
    ...StyleSheet.absoluteFillObject,
  },
});

// ─── FORGOT PASSWORD MODAL ─────────────────────────────────────────────────────
const STEPS = ["Email", "Verify", "Reset"];

const ForgotPasswordModal = ({ visible, onClose }) => {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [direction, setDirection] = useState(1); // 1=forward, -1=back

  const backdropOpacity = useSharedValue(0);
  const containerScale = useSharedValue(0.92);
  const containerOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 260 });
      containerScale.value = withSpring(1, { damping: 18, stiffness: 200 });
      containerOpacity.value = withTiming(1, { duration: 220 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 220 });
      containerScale.value = withTiming(0.92, { duration: 180 });
      containerOpacity.value = withTiming(0, { duration: 180 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: containerScale.value }],
    opacity: containerOpacity.value,
  }));

  const goNext = () => {
    setDirection(1);
    setError("");
    setStep((s) => Math.min(s + 1, 2));
  };
  const goBack = () => {
    setDirection(-1);
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleClose = () => {
    setStep(0);
    setEmail("");
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    onClose();
  };

  const handleEmailSubmit = async () => {
    if (!email.includes("@")) {
      setError("Please enter a valid email address 📧");
      return;
    }
    setLoading(true);
    // TODO: call your API to send verification code
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    goNext();
  };

  const handleCodeSubmit = async () => {
    if (code.length < 6) {
      setError("Enter all 6 digits of your code 🔢");
      return;
    }
    setLoading(true);
    // TODO: verify code via API
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    goNext();
  };

  const handlePasswordReset = async () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters 🔒");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match — double check! 👀");
      return;
    }
    setLoading(true);
    // TODO: call reset password API
    await new Promise((r) => setTimeout(r, 1400));
    setLoading(false);
    handleClose();
  };

  const stepContent = [
    // STEP 0: EMAIL
    <Animated.View
      key="email"
      entering={
        direction > 0
          ? SlideInRight.springify().damping(50)
          : SlideInLeft.springify().damping(50)
      }
      exiting={direction > 0 ? SlideOutLeft : SlideOutRight}
      style={modalStyles.stepContent}
    >
      <View style={modalStyles.iconCircle}>
        <Ionicons name="mail-outline" size={32} color={colors.primary} />
      </View>
      <AppText fontWeight="heavy" style={modalStyles.stepTitle}>
        Where should we send it?
      </AppText>
      <AppText style={modalStyles.stepSubtitle}>
        Enter your email and we'll send a verification code faster than your
        Wi-Fi cuts out 📡
      </AppText>
      <View style={modalStyles.inputWrapper}>
        <Ionicons
          name="mail"
          size={18}
          color="#aaa"
          style={modalStyles.inputIcon}
        />
        <TextInput
          style={modalStyles.textInput}
          placeholder="your@email.com"
          placeholderTextColor="#bbb"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoFocus
        />
      </View>
      {!!error && (
        <Animated.Text entering={FadeIn} style={modalStyles.errorText}>
          {error}
        </Animated.Text>
      )}
      <TouchableOpacity
        style={[modalStyles.primaryBtn, loading && { opacity: 0.7 }]}
        onPress={handleEmailSubmit}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <LottieAnimator
            visible={true}
            absolute={false}
            style={{ width: 28, height: 28 }}
          />
        ) : (
          <AppText fontWeight="bold" style={modalStyles.primaryBtnText}>
            Send Code →
          </AppText>
        )}
      </TouchableOpacity>
    </Animated.View>,

    // STEP 1: VERIFY CODE
    <Animated.View
      key="verify"
      entering={
        direction > 0
          ? SlideInRight.springify().damping(50)
          : SlideInLeft.springify().damping(50)
      }
      exiting={direction > 0 ? SlideOutLeft : SlideOutRight}
      style={modalStyles.stepContent}
    >
      <View style={[modalStyles.iconCircle, { backgroundColor: "#fff5e6" }]}>
        <Ionicons name="keypad-outline" size={32} color="#FF9500" />
      </View>
      <AppText fontWeight="heavy" style={modalStyles.stepTitle}>
        Check your inbox!
      </AppText>
      <AppText style={modalStyles.stepSubtitle}>
        We sent a 6-digit code to{" "}
        <AppText fontWeight="bold" style={{ color: colors.primary }}>
          {email}
        </AppText>
        {"\n"}Don't see it? Check spam (we get it 😅)
      </AppText>
      <CodeInput value={code} onChange={setCode} />
      {!!error && (
        <Animated.Text entering={FadeIn} style={modalStyles.errorText}>
          {error}
        </Animated.Text>
      )}
      <TouchableOpacity
        style={[
          modalStyles.primaryBtn,
          { backgroundColor: "#FF9500" },
          loading && { opacity: 0.7 },
        ]}
        onPress={handleCodeSubmit}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <LottieAnimator
            visible={true}
            absolute={false}
            style={{ width: 28, height: 28 }}
          />
        ) : (
          <AppText fontWeight="bold" style={modalStyles.primaryBtnText}>
            Verify Code ✓
          </AppText>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={modalStyles.resendBtn} onPress={() => {}}>
        <AppText style={modalStyles.resendText}>Resend code</AppText>
      </TouchableOpacity>
    </Animated.View>,

    // STEP 2: NEW PASSWORD
    <Animated.View
      key="reset"
      entering={
        direction > 0
          ? SlideInRight.springify().damping(50)
          : SlideInLeft.springify().damping(50)
      }
      exiting={direction > 0 ? SlideOutLeft : SlideOutRight}
      style={modalStyles.stepContent}
    >
      <View style={[modalStyles.iconCircle, { backgroundColor: "#e8f5e9" }]}>
        <Ionicons name="lock-closed-outline" size={32} color="#4CAF50" />
      </View>
      <AppText fontWeight="heavy" style={modalStyles.stepTitle}>
        Almost there, legend!
      </AppText>
      <AppText style={modalStyles.stepSubtitle}>
        Pick a strong new password. Your future self will thank you 💪
      </AppText>
      <View style={modalStyles.inputWrapper}>
        <Ionicons
          name="lock-closed"
          size={18}
          color="#aaa"
          style={modalStyles.inputIcon}
        />
        <TextInput
          style={[modalStyles.textInput, { flex: 1 }]}
          placeholder="New password"
          placeholderTextColor="#bbb"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoFocus
        />
        <TouchableOpacity
          onPress={() => setShowPassword((v) => !v)}
          style={{ padding: 4 }}
        >
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={18}
            color="#aaa"
          />
        </TouchableOpacity>
      </View>
      <View style={[modalStyles.inputWrapper, { marginTop: 10 }]}>
        <Ionicons
          name="lock-closed"
          size={18}
          color="#aaa"
          style={modalStyles.inputIcon}
        />
        <TextInput
          style={[modalStyles.textInput, { flex: 1 }]}
          placeholder="Confirm password"
          placeholderTextColor="#bbb"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
        />
      </View>
      {!!error && (
        <Animated.Text entering={FadeIn} style={modalStyles.errorText}>
          {error}
        </Animated.Text>
      )}
      <TouchableOpacity
        style={[
          modalStyles.primaryBtn,
          { backgroundColor: "#4CAF50" },
          loading && { opacity: 0.7 },
        ]}
        onPress={handlePasswordReset}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <LottieAnimator
            visible={true}
            absolute={false}
            style={{ width: 28, height: 28 }}
          />
        ) : (
          <AppText fontWeight="bold" style={modalStyles.primaryBtnText}>
            Reset Password 🎉
          </AppText>
        )}
      </TouchableOpacity>
    </Animated.View>,
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      {/* 1. Backdrop fills the screen */}
      <Animated.View style={[modalStyles.backdrop, backdropStyle]}>
        {/* 2. Dismiss on backdrop tap */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        {/* 3. KAV owns the full flex layout and pushes content up */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={modalStyles.kav}
        >
          {/* 4. ScrollView lets content scroll if keyboard is very tall */}
          <ScrollView
            contentContainerStyle={modalStyles.scrollContent}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              layout={LinearTransition.springify()}
              style={[modalStyles.container, containerStyle]}
            >
              {/* Header */}
              <View style={modalStyles.header}>
                {step > 0 ? (
                  <TouchableOpacity
                    onPress={goBack}
                    style={modalStyles.backBtn}
                  >
                    <Ionicons
                      name="arrow-back"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 36 }} />
                )}
                <View style={modalStyles.stepsRow}>
                  {STEPS.map((label, i) => (
                    <React.Fragment key={i}>
                      <StepDot active={i === step} done={i < step} index={i} />
                      {i < STEPS.length - 1 && (
                        <View
                          style={[
                            modalStyles.stepLine,
                            i < step && modalStyles.stepLineDone,
                          ]}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={modalStyles.closeBtn}
                >
                  <Ionicons name="close" size={20} color="#999" />
                </TouchableOpacity>
              </View>

              {/* Step label */}
              <Animated.View
                key={`label-${step}`}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
              >
                <AppText style={modalStyles.stepLabel}>
                  Step {step + 1} of {STEPS.length} — {STEPS[step]}
                </AppText>
              </Animated.View>

              {/* Step Content */}
              <View style={modalStyles.contentArea}>{stepContent[step]}</View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    // justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-end", // ✅ keeps sheet pinned to bottom
    paddingBottom: Platform.OS === "android" ? 8 : 0,
  },
  kav: {
    flex: 1,
    justifyContent: "flex-end", // ✅ moved here so KAV owns the push-up
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 28,
    width: Math.min(width - 24, 440),
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
    marginBottom: Platform.OS === "web" ? 0 : 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepLine: {
    width: 28,
    height: 2,
    backgroundColor: "#e8e8e8",
    marginHorizontal: 4,
    borderRadius: 1,
  },
  stepLineDone: {
    backgroundColor: "#4CAF50",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f5ff",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    textAlign: "center",
    fontSize: 11,
    color: "#bbb",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  contentArea: {
    minHeight: 320,
    overflow: "hidden",
  },
  stepContent: {
    alignItems: "center",
    paddingTop: 8,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#f0f5ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  stepTitle: {
    fontSize: 22,
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 20,
    maxWidth: 300,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 4,
    backgroundColor: "#fafafa",
    width: "100%",
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#1a1a1a",
  },
  errorText: {
    color: "#e53935",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 20,
    minHeight: 52,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
  },
  resendBtn: {
    marginTop: 14,
    paddingVertical: 8,
  },
  resendText: {
    color: colors.primary,
    fontSize: 14,
    textDecorationLine: "underline",
  },
});

// ─── FORGOT PASSWORD TRIGGER (shown after failed login) ───────────────────────
const ForgotPasswordPrompt = ({ onPress }) => {
  return (
    <Pressable onPress={onPress}>
      <Animated.View
        entering={FadeIn.duration(400).delay(100)}
        style={promptStyles.container}
      >
        <View style={promptStyles.inner}>
          <AppText style={promptStyles.emoji}>🤔</AppText>
          <View style={{ flex: null }}>
            <AppText style={promptStyles.message}>
              Happens to the best of us! Forgot your password?
            </AppText>
            <View style={promptStyles.link}>
              <AppText fontWeight="bold" style={promptStyles.linkText}>
                Reset it in 60 seconds →
              </AppText>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const promptStyles = StyleSheet.create({
  container: {
    marginTop: 6,
    marginHorizontal: 8,
    borderRadius: 16,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    padding: 14,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emoji: {
    fontSize: 28,
  },
  message: {
    fontSize: 13,
    color: "#78350f",
    lineHeight: 19,
  },
  link: {
    marginTop: 4,
  },
  linkText: {
    color: "#d97706",
    fontSize: 13,
  },
});

// ─── RENDER SOCIALS ────────────────────────────────────────────────────────────
export const RenderSocials = ({ isLogin = true }) => {
  const router = useRouter();
  // const msg = isLogin ? "in" : "up";
  const msgReversed = isLogin ? "up" : "in";
  const message = isLogin
    ? "Don't have an account?"
    : "Already have an account?";
  const nav = isLogin ? "Register" : "Login";

  return (
    <View style={{ alignItems: "center" }}>
      <View style={styles.navSection}>
        <AppText style={styles.navText}>{message}</AppText>
        <TouchableOpacity
          onPress={() =>
            router.replace({
              pathname: `/${nav.toLowerCase()}`,
              params: { isSelectAccountType: true },
            })
          }
          activeOpacity={0.8}
          style={styles.navBtn}
        >
          <AppText fontWeight="bold" style={{ color: colors.primary }}>
            {" "}
            Sign {msgReversed} now
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── MAIN LOGIN SCREEN ─────────────────────────────────────────────────────────
const LoginScreen = () => {
  const [loginUser, { isLoading, isError, error }] = useSignInUserMutation();
  const [errMsg, setErrMsg] = useState(null);
  const [showForgotPrompt, setShowForgotPrompt] = useState(false);
  const [forgotModalVisible, setForgotModalVisible] = useState(false);

  const handleFormSubmit = async (formValues) => {
    setErrMsg(null);
    setShowForgotPrompt(false);
    Keyboard.dismiss();

    await loginUser(formValues)
      .unwrap()
      .catch((err) => {
        const networkErr =
          typeof err?.status == "string" && err?.status?.includes("FETCH_ERROR")
            ? "Network request failed, Poor internet connection"
            : null;
        console.log(err);
        const msg = networkErr ?? err?.error ?? "Something went wrong";
        setErrMsg(msg);
        // Show forgot password prompt only on credential-like errors
        const isCredentialError =
          !networkErr &&
          (err?.status === 401 ||
            err?.status === 400 ||
            msg?.toLowerCase().includes("invalid") ||
            msg?.toLowerCase().includes("wrong") ||
            msg?.toLowerCase().includes("incorrect"));
        setShowForgotPrompt(isCredentialError);
      });
  };

  const FormContent = (
    <Formik
      initialValues={loginInitials}
      validationSchema={validationSchemaLogin}
      onSubmit={handleFormSubmit}
    >
      <View style={styles.form}>
        <View style={{ alignItems: "center" }}>
          <FormikInput
            name="username"
            placeholder="Email | Phone No. | Username"
          />
          <FormikInput name="password" secureTextEntry placeholder="Password" />
          <LottieAnimator visible={isLoading} absolute />
        </View>

        {(isError || errMsg) && (
          <AppText style={styles.errorText}>{error?.data ?? errMsg}</AppText>
        )}

        {showForgotPrompt && (
          <ForgotPasswordPrompt onPress={() => setForgotModalVisible(true)} />
        )}

        <FormikButton
          title="Login"
          contStyle={{
            marginTop: 14,
            alignSelf: "center",
            width: width * 0.65,
          }}
        />
        <RenderSocials />
      </View>
    </Formik>
  );

  const FormContentWeb = (
    <Formik
      initialValues={loginInitials}
      validationSchema={validationSchemaLogin}
      onSubmit={handleFormSubmit}
    >
      <View style={{ ...styles.form, flex: 1 }}>
        <View style={{ width: "80%" }}>
          <FormikInput
            name="username"
            placeholder="Email or Phone No. or Username"
          />
          <FormikInput name="password" secureTextEntry placeholder="Password" />
          <LottieAnimator visible={isLoading} absolute />
        </View>

        {(isError || errMsg) && (
          <AppText style={styles.errorText}>{error?.data ?? errMsg}</AppText>
        )}

        {showForgotPrompt && (
          <ForgotPasswordPrompt onPress={() => setForgotModalVisible(true)} />
        )}

        <FormikButton
          title="Login"
          contStyle={{ marginTop: 10, alignSelf: "center", width: "40%" }}
        />
        <RenderSocials />
      </View>
    </Formik>
  );

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? null : height * 0.4,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {Platform.OS === "web" ? (
          <WebLayout style={{ flexDirection: "row" }}>
            <WebLayout>
              <AppText fontWeight="heavy" style={styles.title}>
                Sign Back In!
              </AppText>
              <View style={{ alignSelf: "center", maxWidth: 500 }}>
                <LottieAnimator name="student_jumping" style={styles.lottie} />
              </View>
            </WebLayout>
            <WebLayout style={{ flex: 1 }}>
              <View style={styles.formSection}>{FormContentWeb}</View>
            </WebLayout>
          </WebLayout>
        ) : (
          <>
            <View style={{ alignSelf: "center" }}>
              <LottieAnimator name="student_jumping" style={styles.lottie} />
            </View>
            <View style={styles.formSection}>
              <AppText fontWeight="heavy" style={styles.title}>
                Sign Back In!
              </AppText>
              {FormContent}
            </View>
          </>
        )}
        <View style={styles.btnSection} />
        <StatusBar style="dark" />
      </ScrollView>

      <ForgotPasswordModal
        visible={forgotModalVisible}
        onClose={() => setForgotModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  btnSection: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },
  errorText: {
    textAlign: "center",
    color: colors.heartDark,
    marginVertical: 6,
  },
  lottie: {
    width: width / 1.5,
    height: width / 1.5,
    marginTop: 40,
  },
  form: { marginTop: 25, alignItems: "center" },
  formSection: {
    marginTop: 15,
    ...(Platform.OS === "web"
      ? { backgroundColor: colors.white, borderRadius: 20 }
      : {}),
  },
  navBtn: { paddingVertical: 15, paddingRight: 5 },
  navSection: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  title: {
    alignSelf: "flex-start",
    fontSize: 30,
    marginTop: 20,
    marginLeft: 20,
    color: colors.primary,
    textAlign: "center",
  },
});

export default LoginScreen;
