import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Dimensions, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";

import AppText from "../components/AppText";
import AnimatedCheckBox from "./AnimatedCheckbox";
import { Q, TONES } from "./quiz/QuizTheme";
import { QuizPressable } from "./quiz/QuizUI";
import { popIn, popOut } from "./quiz/QuizMotion";
import { RichView, optionRt } from "./quiz/RichText";

const { width } = Dimensions.get("screen");

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

  const richRt = useMemo(() => optionRt(data), [data]);

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
          <RichView
            rt={richRt}
            size={15.5}
            weight="bold"
            color={Q.ink}
            maxWidth={width * 0.58}
            style={{ paddingVertical: 14 }}
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
});
