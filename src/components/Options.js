import React, { useState, useCallback, useEffect, useMemo } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import AppText from "../components/AppText";
import colors from "../helpers/colors";
import AnimatedPressable from "./AnimatedPressable";
import { capFirstLetter } from "../helpers/helperFunctions";
import AnimatedCheckBox from "./AnimatedCheckbox";

const Options = ({
  idx = 0,
  isSelected = false,
  editable = false,
  handleSelectAnswer,
  data = {},
  handleUpdateAnswer,
}) => {
  const [text, setText] = useState(data?.name || "");

  // Color scheme based on index
  const colorScheme = useMemo(() => {
    switch (idx) {
      case 1:
        return {
          bg: colors.warning,
          overlay: colors.warningDark,
          prefix: "B. ",
        };
      case 2:
        return {
          bg: colors.heartDark,
          overlay: colors.heart,
          prefix: "C. ",
        };
      case 3:
        return {
          bg: colors.green,
          overlay: colors.greenDark,
          prefix: "D. ",
        };
      default:
        return {
          bg: colors.accentDeeper,
          overlay: colors.accent,
          prefix: "A. ",
        };
    }
  }, [idx]);

  // Update local text when prop data changes
  useEffect(() => {
    setText(data?.name || "");
  }, [data]);

  // Handle text change with debouncing
  const handleTextChange = useCallback(
    (newText) => {
      setText(newText);
      // Update immediately for better UX
      handleUpdateAnswer?.({
        ...data,
        name: newText,
        correct: data?.correct || false,
      });
    },
    [data, handleUpdateAnswer]
  );

  // Handle correct answer selection
  const handleSelection = useCallback(() => {
    handleUpdateAnswer?.({
      ...data,
      name: text,
      correct: !data?.correct,
    });
  }, [data, text, handleUpdateAnswer]);

  // Handle non-editable selection
  const handleNonEditableSelection = useCallback(() => {
    handleSelectAnswer?.(data);
  }, [data, handleSelectAnswer]);

  if (editable) {
    return (
      <View style={[styles.container, { backgroundColor: colorScheme.bg }]}>
        <View style={[styles.main, { backgroundColor: colorScheme.overlay }]}>
          <AppText fontWeight="semibold" style={styles.prefixText}>
            {colorScheme.prefix}
          </AppText>
          <TextInput
            onChangeText={handleTextChange}
            multiline
            style={styles.input}
            value={text}
            placeholder="Enter answer option"
            placeholderTextColor={colors.white + "90"}
          />
          <AnimatedCheckBox
            isChecked={data?.correct || false}
            setIsChecked={handleSelection}
          />
        </View>
      </View>
    );
  }

  return (
    <AnimatedPressable
      onPress={handleNonEditableSelection}
      style={[
        styles.container,
        {
          backgroundColor: colorScheme.bg,
          borderWidth: isSelected ? 3 : 0,
          borderColor: isSelected ? colors.white : null,
          boxShadow: isSelected ? `2px 8px 18px ${colors.primary}40` : null,
        },
      ]}
    >
      <View style={[styles.main, { backgroundColor: colorScheme.overlay }]}>
        <AppText fontWeight="semibold" style={styles.nonEditableText}>
          {colorScheme.prefix + (capFirstLetter(data?.name) || "______")}
        </AppText>
        {isSelected && (
          <MaterialCommunityIcons
            name="check-bold"
            size={26}
            color={colors.white}
          />
        )}
      </View>
    </AnimatedPressable>
  );
};

export default Options;

const styles = StyleSheet.create({
  container: {
    width: "96%",
    borderRadius: 18,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    height: "100%",
    fontFamily: "sf-bold",
    color: colors.white,
    fontSize: 16,
    outlineStyle: "none",
    paddingVertical: 20,
    minHeight: 60,
  },
  main: {
    width: "100%",
    paddingHorizontal: 20,
    borderRadius: 18,
    marginBottom: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 60,
  },
  prefixText: {
    color: colors.white,
  },
  nonEditableText: {
    color: colors.white,
    paddingVertical: 20,
    flex: 1,
  },
});
