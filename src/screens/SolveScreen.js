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

const { width, height } = Dimensions.get("screen");

const SUBMIT_PROMPT = {
  title: "Submit Assignment",
  msg: "Are you sure you want to submit your assignment?\n\nThis process cannot be reversed once you've submitted\n\nSo ensure you're satisfied with your solution",
  btn: "Submit",
  type: "submit",
};
const submitBtnTransition = LinearTransition.springify().damping(25);

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

const SolveScreen = ({ route }) => {
  const routeData = route?.params?.item;

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
        setPopper({
          vis: true,
          msg: "Assignment submitted successfully",
          type: "success",
          cb: async () => {
            await submitAssignment();
          },
        });
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
    const cachedData = await AsyncStorage.getItem(`assignments`);
    if (cachedData) {
      const cachedArr = JSON.parse(cachedData);
      const currentAssignment = cachedArr.find(
        (item) => item._id == routeData?.title
      );
      setCached(currentAssignment?.text);
      setBools({
        ...bools,
        isSubmitted: Boolean(currentAssignment?.isSubmitted),
      });
    }
  };

  const submitAssignment = async () => {
    setBools({ ...bools, isSubmitted: true });
    const cachedData = await AsyncStorage.getItem("assignments");
    let editedCache = [{ id: routeData?.title, text, isSubmitted: true }];
    if (Boolean(cachedData)) {
      const cachedArr = JSON.parse(cachedData);
      const currentAssignment = cachedArr.find(
        (item) => item._id == routeData?.title
      );
      if (currentAssignment) {
        editedCache = cachedArr.map((item) => {
          if (item._id == routeData?.title) {
            return {
              ...item,
              isSubmitted: true,
            };
          } else {
            return item;
          }
        });
      } else {
        editedCache = cachedArr?.concat(editedCache);
      }
    }
    await AsyncStorage.setItem("assignments", JSON.stringify(editedCache));
  };

  const saveText = async () => {
    const cachedData = await AsyncStorage.getItem("assignments");
    let editedCache = [{ id: routeData?.title, text }];
    if (Boolean(cachedData)) {
      const cachedArr = JSON.parse(cachedData);
      const currentAssignment = cachedArr.find(
        (item) => item._id == routeData?.title
      );
      if (currentAssignment) {
        editedCache = cachedArr.map((item) => {
          if (item._id == routeData?.title) {
            return {
              ...item,
              text,
            };
          } else {
            return item;
          }
        });
      } else {
        editedCache = cachedArr?.concat(editedCache);
      }
    }
    await AsyncStorage.setItem("assignments", JSON.stringify(editedCache));
    setCached(text);
    // setPopper({
    //   vis: true,
    //   msg: "Changes saved",
    //   type: "success",
    // });
  };

  useEffect(() => {
    getSavedText();
  }, []);

  return (
    <View style={styles.container}>
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
          entering={FlipInEasyX.springify().damping(15)}
          exiting={FadeOutUp.springify().damping(15)}
          style={styles.question}
        >
          <AppText fontWeight="heavy" style={{ color: colors.medium }}>
            Question:{" "}
            <AppText fontWeight="medium">{routeData?.question}</AppText>
          </AppText>
        </Animated.View>
      )}
      <Animated.View
        layout={LinearTransition.springify().damping(20)}
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
      <PopMessage popData={popper} setPopData={setPopper} />
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
    // backgroundColor: "red",
    paddingRight: 15,
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
