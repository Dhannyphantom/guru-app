import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  RichEditor,
  RichToolbar,
  actions,
} from "react-native-pell-rich-editor";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import AppText from "../components/AppText";
import AppHeader from "../components/AppHeader";
import colors from "../helpers/colors";
import AppButton from "../components/AppButton";
import { useEffect, useRef, useState } from "react";
import AnimatedPressable from "../components/AnimatedPressable";
import Animated, {
  FadeOutUp,
  FlipInEasyX,
  LightSpeedInRight,
  LightSpeedOutRight,
  LinearTransition,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PopMessage from "../components/PopMessage";
import PromptModal from "../components/PromptModal";
import { useLocalSearchParams } from "expo-router";
import { useSelector } from "react-redux";
import {
  selectSchool,
  useSubmitAssignmentMutation,
} from "../context/schoolSlice";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LottieAnimator from "../components/LottieAnimator";

const { width, height } = Dimensions.get("screen");

const SUBMIT_PROMPT = {
  title: "Submit Assignment",
  msg: "Submit assignment now?\nThis action cannot be undone.",
  btn: "Submit",
  type: "submit",
};
const submitBtnTransition = LinearTransition.springify();

export const plusAction = ({ tintColor }) => (
  <AppText size={"xlarge"} fontWeight="bold" style={{ color: tintColor }}>
    +
  </AppText>
);
export const minusAction = ({ tintColor }) => (
  <AppText size={"xlarge"} fontWeight="bold" style={{ color: tintColor }}>
    -
  </AppText>
);
export const mulAction = ({ tintColor }) => (
  <AppText size={"xlarge"} fontWeight="bold" style={{ color: tintColor }}>
    x
  </AppText>
);
export const divideAction = ({ tintColor }) => (
  <AppText size={"xlarge"} fontWeight="bold" style={{ color: tintColor }}>
    /
  </AppText>
);
export const equalAction = ({ tintColor }) => (
  <AppText size={"xlarge"} fontWeight="bold" style={{ color: tintColor }}>
    =
  </AppText>
);
export const bracketAction = ({ tintColor }) => (
  <AppText size={"xlarge"} fontWeight="bold" style={{ color: tintColor }}>
    ()
  </AppText>
);

export const handleHead1 = ({ tintColor }) => (
  <AppText fontWeight="heavy" style={{ color: tintColor }}>
    H
    <AppText fontWeight="heavy" style={{ color: tintColor }} size={"xxsmall"}>
      1
    </AppText>
  </AppText>
);

export const handleHead3 = ({ tintColor }) => (
  <AppText fontWeight="heavy" style={{ color: tintColor }}>
    H
    <AppText fontWeight="heavy" style={{ color: tintColor }} size={"xxsmall"}>
      3
    </AppText>
  </AppText>
);

const SolveScreen = () => {
  const route = useLocalSearchParams();
  const school = useSelector(selectSchool);
  const routeData = Boolean(route?.item) ? JSON.parse(route?.item) : {};

  const [submitAssignment, { isLoading }] = useSubmitAssignmentMutation();

  const [bools, setBools] = useState({
    showQuestion: true,
    isSubmitted: false,
  });
  const [text, setText] = useState("");
  const [cached, setCached] = useState(null);
  const [popper, setPopper] = useState({ vis: false });
  const [prompt, setPrompt] = useState({ vis: false, data: null });

  const editorRef = useRef(null);
  const isChanged = cached != text;
  const isEmpty = text == "";
  const insets = useSafeAreaInsets();
  const CACHE_KEY = `assignments_${routeData?._id}`;

  const onEditorInitialized = () => {
    if (cached) {
      setText(cached);
    }
  };

  const handleText = async () => {
    if (isChanged) {
      // save
      await saveText();
    } else {
      // submit
      setPrompt({
        vis: true,
        data: SUBMIT_PROMPT,
      });
    }
  };

  const handlePrompt = async (type) => {
    switch (type) {
      case "submit":
        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ text, isSubmitted: true })
        );

        try {
          const res = await submitAssignment({
            schoolId: school?._id,
            assignmentId: routeData?._id,
            solution: text,
          }).unwrap();
          if (res?.success) {
            setBools({ ...bools, isSubmitted: true });
            setPopper({
              vis: true,
              msg: "Assignment submitted successfully",
              type: "success",
            });
          }
        } catch (errr) {
          console.log(errr);
          setPopper({
            vis: true,
            msg: "Something went wrong while submitting assignment",
            type: "failed",
          });
          await AsyncStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ text, isSubmitted: false })
          );
        }

        break;

      default:
        break;
    }
  };

  const handleCustomActions = (type) => {
    switch (type) {
      case "plus":
        editorRef?.current?.insertText(" + ");
        break;
      case "minus":
        editorRef?.current?.insertText(" - ");
        break;
      case "mul":
        editorRef?.current?.insertText(" x ");
        break;
      case "divide":
        editorRef?.current?.insertText(" / ");
        break;
      case "bracket":
        editorRef?.current?.insertText("( ) ");
        break;
      case "equal":
        editorRef?.current?.insertText(" = ");
        break;

      default:
        break;
    }
  };

  const getSavedText = async () => {
    // await AsyncStorage.removeItem("assignments");
    const cachedData = await AsyncStorage.getItem(CACHE_KEY);

    if (cachedData) {
      const cachedObj = JSON.parse(cachedData);
      setCached(cachedObj?.text);
      setText(cachedObj?.text);
      setBools({
        ...bools,
        // isSubmitted: Boolean(cachedObj?.isSubmitted),
      });
    }
  };

  const saveText = async () => {
    // const cachedData = await AsyncStorage.getItem(`assignments_${routeData?._id}`);

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ text }));
    setCached(text);
  };

  useEffect(() => {
    getSavedText();
  }, []);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <AppHeader
        title={routeData?.title}
        Component={() => (
          <AnimatedPressable
            style={styles.hide}
            onPress={() =>
              setBools({ ...bools, showQuestion: !bools.showQuestion })
            }
          >
            <Ionicons
              name={bools.showQuestion ? "eye" : "eye-off"}
              size={26}
              color={bools.showQuestion ? colors.primary : colors.medium}
            />
          </AnimatedPressable>
        )}
      />
      {bools?.showQuestion && (
        <Animated.View
          entering={FlipInEasyX.springify().damping(45)}
          exiting={FadeOutUp.springify().damping(45)}
          style={styles.question}
        >
          <AppText fontWeight="heavy" style={{ color: colors.medium }}>
            Question:{" "}
            <AppText fontWeight="medium">{routeData?.question}</AppText>
          </AppText>
        </Animated.View>
      )}
      {!bools.isSubmitted && !isEmpty && (
        <Animated.View
          layout={submitBtnTransition}
          entering={LightSpeedInRight}
          exiting={LightSpeedOutRight}
        >
          <AppButton
            title={isChanged ? "Save Changes" : "Submit"}
            type={isChanged ? "accent" : "primary"}
            onPress={handleText}
            contStyle={{ marginHorizontal: width * 0.2 }}
          />
        </Animated.View>
      )}
      <KeyboardAvoidingView style={styles.avoidingView} behavior="padding">
        <Animated.View
          layout={LinearTransition.springify().damping(40)}
          style={styles.main}
        >
          <RichEditor
            ref={editorRef}
            useContainer={false}
            initialContentHTML={cached}
            disabled={bools.isSubmitted}
            placeholder="Start working on your assignment here..."
            editorInitializedCallback={onEditorInitialized}
            // onInput={onInputText}
            editorStyle={{ backgroundColor: "tranparent" }}
            onChange={(text) => setText(text)}
          />
        </Animated.View>
        {!bools.isSubmitted && (
          <RichToolbar
            editor={editorRef}
            selectedIconTint={colors.primary}
            actions={[
              actions.undo,
              actions.redo,
              actions.setBold,
              actions.setItalic,
              actions.setUnderline,
              actions.heading1,
              actions.heading3,
              actions.alignLeft,
              actions.alignCenter,
              actions.alignRight,
              actions.insertOrderedList,
              actions.insertBulletsList,
              actions.indent,
              actions.outdent,
              "plusAction",
              "minusAction",
              "divideAction",
              "mulAction",
              "equalAction",
              "bracketAction",
              actions.setSubscript,
              actions.setSuperscript,
            ]}
            plusAction={() => handleCustomActions("plus")}
            minusAction={() => handleCustomActions("minus")}
            divideAction={() => handleCustomActions("divide")}
            mulAction={() => handleCustomActions("mul")}
            equalAction={() => handleCustomActions("equal")}
            bracketAction={() => handleCustomActions("bracket")}
            iconMap={{
              [actions.heading1]: handleHead1,
              [actions.heading3]: handleHead3,
              plusAction,
              mulAction,
              minusAction,
              divideAction,
              equalAction,
              bracketAction,
            }}
          />
        )}
      </KeyboardAvoidingView>

      <PopMessage popData={popper} setPopData={setPopper} />
      <LottieAnimator visible={isLoading} absolute wTransparent />
      <PromptModal
        prompt={prompt}
        setPrompt={(data) => setPrompt(data)}
        onPress={handlePrompt}
      />
      <StatusBar style="dark" />
    </View>
  );
};

export default SolveScreen;

const styles = StyleSheet.create({
  avoidingView: {
    flex: 1,
  },
  btns: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 10,
  },
  container: {
    flex: 1,
    marginBottom: 5,
  },
  hide: {
    paddingRight: 15,
    paddingLeft: 25,
    paddingVertical: 10,
  },
  main: {
    width: width * 0.96,
    flex: 1,
    backgroundColor: colors.unchange,
    alignSelf: "center",
    borderRadius: 16,
    marginBottom: 10,
    padding: 10,
    paddingTop: 3,
    // elevation: 20,
  },
  question: {
    backgroundColor: colors.white,
    marginBottom: 15,
    marginHorizontal: 18,
    padding: 12,
    borderRadius: 6,
  },
});
