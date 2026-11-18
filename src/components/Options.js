import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Dimensions, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Katex from "react-native-katex";
import Animated from "react-native-reanimated";

import AppText from "../components/AppText";
import colors from "../helpers/colors";
import { capFirstLetter } from "../helpers/helperFunctions";
import AnimatedCheckBox from "./AnimatedCheckbox";
import { Q, TONES } from "./quiz/QuizTheme";
import { QuizPressable } from "./quiz/QuizUI";
import { popIn, popOut } from "./quiz/QuizMotion";

const { width } = Dimensions.get("screen");

const inlineStyle = `
html, body {
  display: flex;
  background-color: transparent;
  justify-content: center;
  align-items: center;
  height: 100%;
  margin: 0;
  padding: 0;
}
.katex {
  font-size: 4em;
  margin: 0;
  font-weight: 800;
  display: flex;
  color: ${Q.ink};
}
`;

const LatexOptionText = ({ value, isLatex }) => {
  if (!value) return null;

  if (!isLatex) {
    return (
      <AppText fontWeight="bold" size={15.5} style={styles.nonEditableText}>
        {value}
      </AppText>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Katex
        expression={value?.replace(/\$/g, "")}
        style={{
          width: width * 0.8,
          height: 10,
          backgroundColor: "transparent",
        }}
        inlineStyle={inlineStyle}
        displayMode={false}
        throwOnError={false}
        errorColor={colors.primary}
        macros={{}}
        colorIsTextColor={false}
        onError={() => console.error("Error")}
      />
    </View>
  );
};

// A / B / C / D each get their own colour
const SCHEMES = [
  { tone: TONES.blue, letter: "A" },
  { tone: TONES.yellow, letter: "B" },
  { tone: TONES.coral, letter: "C" },
  { tone: TONES.green, letter: "D" },
];

const Options = ({
  idx = 0,
  isSelected = false,
  editable = false,
  handleSelectAnswer,
  data = {},
  handleUpdateAnswer,
}) => {
  const [text, setText] = useState(data?.name || "");

  const scheme = useMemo(() => SCHEMES[idx] ?? SCHEMES[0], [idx]);
  const { tone, letter } = scheme;

  useEffect(() => {
    setText(data?.name || "");
  }, [data]);

  const handleTextChange = useCallback(
    (newText) => {
      setText(newText);
      handleUpdateAnswer?.({
        ...data,
        name: newText,
        correct: data?.correct || false,
      });
    },
    [data, handleUpdateAnswer],
  );

  const handleSelection = useCallback(() => {
    handleUpdateAnswer?.({
      ...data,
      name: text,
      correct: !data?.correct,
    });
  }, [data, text, handleUpdateAnswer]);

  const handleNonEditableSelection = useCallback(() => {
    handleSelectAnswer?.(data);
  }, [data, handleSelectAnswer]);

  const badgeFg = tone === TONES.yellow ? Q.ink : "#FFFFFF";

  // ── Editor: solid coloured card so the checkbox stays visible ──────────────
  if (editable) {
    return (
      <View
        style={[
          styles.container,
          styles.editCard,
          { backgroundColor: tone.face, borderBottomColor: tone.lip },
        ]}
      >
        <View style={styles.main}>
          <View style={styles.editBadge}>
            <AppText fontWeight="black" size={15} style={{ color: tone.ink }}>
              {letter}
            </AppText>
          </View>
          <TextInput
            onChangeText={handleTextChange}
            multiline
            style={[styles.input, { color: tone.text }]}
            value={text}
            placeholder="Enter answer option"
            placeholderTextColor={tone.text + "90"}
          />
          <AnimatedCheckBox
            isChecked={data?.correct || false}
            setIsChecked={handleSelection}
          />
        </View>
      </View>
    );
  }

  // ── Quiz: white chunky card, tinted + checked when selected ───────────────
  return (
    <QuizPressable
      onPress={handleNonEditableSelection}
      scaleTo={0.97}
      style={styles.container}
      contentStyle={[
        styles.card,
        isSelected && {
          backgroundColor: tone.soft,
          borderColor: tone.face,
          borderBottomColor: tone.lip,
        },
      ]}
    >
      <View style={styles.main}>
        <View
          style={[
            styles.badge,
            { backgroundColor: isSelected ? tone.face : tone.soft },
          ]}
        >
          <AppText
            fontWeight="black"
            size={15}
            style={{ color: isSelected ? badgeFg : tone.ink }}
          >
            {letter}
          </AppText>
        </View>

        <View style={{ flex: 1, justifyContent: "center", marginLeft: 12 }}>
          <LatexOptionText
            value={
              data?.isLatex
                ? data?.latex
                : capFirstLetter(data?.name) || "______"
            }
            isLatex={data?.isLatex}
          />
        </View>

        <View style={styles.checkSlot}>
          {isSelected && (
            <Animated.View
              entering={popIn}
              exiting={popOut}
              style={[styles.check, { backgroundColor: tone.face }]}
            >
              <Ionicons name="checkmark" size={16} color={badgeFg} />
            </Animated.View>
          )}
        </View>
      </View>
    </QuizPressable>
  );
};

export default Options;

const styles = StyleSheet.create({
  container: {
    width: "96%",
    marginBottom: 12,
  },
  card: {
    backgroundColor: Q.card,
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: Q.line,
  },
  editCard: {
    borderRadius: 20,
    borderBottomWidth: 5,
  },
  main: {
    width: "100%",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 62,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  editBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkSlot: {
    width: 30,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    height: "100%",
    fontFamily: "sf-bold",
    fontSize: 16,
    outlineStyle: "none",
    paddingVertical: 18,
    minHeight: 62,
  },
  nonEditableText: {
    color: Q.ink,
    paddingVertical: 16,
    lineHeight: 21,
  },
});
