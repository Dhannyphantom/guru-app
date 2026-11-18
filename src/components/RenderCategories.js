import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import Animated from "react-native-reanimated";
import { useSelector } from "react-redux";

import AppText from "../components/AppText";
import { selectUser } from "../context/usersSlice";
import { isCategoryAllowedForUser } from "../helpers/helperFunctions";
import { Q, TONES, TONE_CYCLE } from "./quiz/QuizTheme";
import { QuizPressable } from "./quiz/QuizUI";
import { enter, popIn, popOut } from "./quiz/QuizMotion";

export const MAX_QUIZ_SUBJECTS = 2;

/**
 * Category / subject tile.
 * `setQuizInfo` now receives ONLY the changed keys ({ category } or
 * { subjects }) — the parent merges them, so nothing stale is written back.
 * `onLimit` fires when the user tries to pick more than MAX_QUIZ_SUBJECTS.
 */
const RenderCategories = ({
  item,
  quizInfo,
  disabled,
  checkLevel,
  levelErr,
  onLimit,
  size,
  style,
  setQuizInfo,
  index = 0,
}) => {
  const user = useSelector(selectUser);
  const { width } = useWindowDimensions();
  const tile = size ?? Math.min(Math.floor((width - 32 - 14) / 2), 190);
  const tone = TONES[TONE_CYCLE[index % TONE_CYCLE.length]];

  const isCategoryView = quizInfo?.view === "category";
  const isSelected = Boolean(
    isCategoryView
      ? quizInfo?.category?._id === item._id
      : quizInfo?.subjects?.find((subj) => subj?._id === item._id),
  );
  const locked = Boolean(
    checkLevel && isCategoryView && !isCategoryAllowedForUser(user?.class?.level, item?.name),
  );

  const handleItemPress = () => {
    if (isCategoryView) {
      if (locked) return levelErr?.();
      setQuizInfo?.({ category: item });
      return;
    }

    if (quizInfo?.view === "subjects") {
      const copier = [...(quizInfo?.subjects ?? [])];
      const findIdx = copier.findIndex((subj) => subj?._id === item._id);
      if (findIdx >= 0) {
        copier.splice(findIdx, 1);
      } else {
        if (copier.length >= MAX_QUIZ_SUBJECTS) return onLimit?.();
        copier.push(item);
      }
      setQuizInfo?.({ subjects: copier });
    }
  };

  const showBadge = !disabled && (isSelected || locked || !isCategoryView);

  return (
    <Animated.View entering={enter(index, 40)} style={[styles.wrap, { width: tile }, style]}>
      <QuizPressable
        disabled={disabled}
        onPress={handleItemPress}
        scaleTo={0.95}
        contentStyle={[
          styles.face,
          isSelected && { backgroundColor: TONES.green.soft, borderColor: TONES.green.face },
          locked && { backgroundColor: "#F1EEE4", borderColor: "#DDD6C0" },
        ]}
      >
        {showBadge && (
          <View style={styles.badgeSlot}>
            {isSelected ? (
              <Animated.View key="on" entering={popIn} exiting={popOut} style={[styles.badge, { backgroundColor: TONES.green.face }]}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </Animated.View>
            ) : locked ? (
              <View style={[styles.badge, { backgroundColor: Q.lineDark }]}>
                <Ionicons name="lock-closed" size={11} color="#fff" />
              </View>
            ) : (
              <View style={[styles.badge, { backgroundColor: Q.track }]}>
                <Ionicons name="add" size={14} color={Q.faint} />
              </View>
            )}
          </View>
        )}

        <View
          style={[
            styles.imgBox,
            { height: tile * 0.56, backgroundColor: isSelected ? "#fff" : tone.soft },
          ]}
        >
          <Image
            source={item.image}
            contentFit="contain"
            style={{ width: "62%", height: "62%", opacity: locked ? 0.4 : 1 }}
          />
        </View>

        <AppText
          fontWeight="black"
          size={15}
          numberOfLines={2}
          style={[
            styles.name,
            { textTransform: isCategoryView ? "none" : "capitalize" },
            isSelected && { color: TONES.green.ink },
            locked && { color: Q.faint },
          ]}
        >
          {item.name}
        </AppText>
      </QuizPressable>
    </Animated.View>
  );
};

export default RenderCategories;

const styles = StyleSheet.create({
  wrap: { marginBottom: 14, marginHorizontal: 5 },
  face: {
    backgroundColor: Q.card,
    borderRadius: 22,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: Q.line,
    padding: 8,
    alignItems: "center",
  },
  imgBox: {
    width: "100%",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: Q.ink, textAlign: "center", marginTop: 9, marginBottom: 4, minHeight: 20 },
  badgeSlot: { position: "absolute", top: 12, right: 12, zIndex: 2 },
  badge: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
});
