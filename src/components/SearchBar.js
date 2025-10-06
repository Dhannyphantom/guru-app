import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import React, { useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("screen");

import colors from "../helpers/colors";
import LottieAnimator from "./LottieAnimator";
import AnimatedPressable from "./AnimatedPressable";

const SearchBar = ({
  onClickSearch,
  placeholder = "Enter to search...",
  onChangeCallback,
  onInputFocus,
  onInputBlur,
  loading = false,
  onClose,
  style,
  searchRef,
}) => {
  const [text, setText] = useState("");

  const ref = useRef(null);

  const onCloseSearch = () => {
    ref?.current?.blur();
    searchRef && searchRef?.current?.blur();
    onClose && onClose();
  };

  const compRef = searchRef ?? ref;

  return (
    <View style={[styles.container, style]}>
      <Ionicons
        name="search"
        size={20}
        color={colors.primary}
        style={styles.searchIcon}
      />
      <TextInput
        ref={compRef}
        value={text}
        placeholder={placeholder}
        onFocus={onInputFocus}
        keyboardType="web-search"
        onBlur={onInputBlur}
        onChangeText={(val) => {
          setText(val);
          onChangeCallback && onChangeCallback(val);
        }}
        style={styles.input}
      />
      {onClickSearch && text?.length > 1 && !loading && (
        <AnimatedPressable
          onPress={() => onClickSearch(text)}
          style={styles.searchBtn}
        >
          <Ionicons name="search" size={18} color={colors.primaryLighter} />
        </AnimatedPressable>
      )}
      {onClose && text.length < 1 && !loading && (
        <Pressable onPress={onCloseSearch} style={styles.search}>
          <Ionicons name="close-circle" size={20} color={colors.medium} />
        </Pressable>
      )}
      <LottieAnimator visible={loading} size={60} />
    </View>
  );
};

export default SearchBar;

const styles = StyleSheet.create({
  container: {
    width: "95%",
    minWidth: Platform.OS === "web" ? null : width * 0.5,
    height: 50,
    borderRadius: 8,
    alignSelf: "center",
    backgroundColor: colors.unchange,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  input: {
    flex: 1,
    paddingLeft: 15,
    height: "100%",
    fontFamily: "sf-medium",
    fontSize: 16,
    outlineStyle: "none",
  },
  search: {
    height: "100%",
    color: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBtn: {
    height: "100%",
    color: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 15,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  searchIcon: {
    marginLeft: 15,
  },
});
