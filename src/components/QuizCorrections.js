/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react/display-name */
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Katex from "react-native-katex";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

import AppText from "../components/AppText";
import colors from "../helpers/colors";
import { capFirstLetter } from "../helpers/helperFunctions";
import { Q, TONES } from "./quiz/QuizTheme";
import { LAYOUT } from "./quiz/QuizMotion";
import { Chip, QuizButton, QuizPressable, QuizSheet } from "./quiz/QuizUI";

const inlineExpStyle = `
html, body { display:flex; background-color:transparent; justify-content:flex-start; align-items:center; height:100%; margin:0; padding:0; }
.katex { font-size:4em; margin-left:40px; font-weight:600; display:flex; color:${colors.black}; }
`;
const inlineStyle = `
html, body { display:flex; background-color:transparent; justify-content:flex-start; align-items:center; height:100%; margin:0; padding:0; }
.katex { font-size:3em; margin-left:40px; font-weight:600; display:flex; color:${colors.black}; }
`;

/** "right" | "wrong" | "skipped" for one question. */
export const getQuestionStatus = (question) => {
  const answered = question?.answered;
  if (!answered || (!answered._id && !answered.name)) return "skipped";
  const correctAnswer = question?.answers?.find((a) => a.correct);
  const ok = answered.correct ?? correctAnswer?._id === answered._id;
  return ok ? "right" : "wrong";
};

const STATUS = {
  right: { tone: TONES.green, label: "Correct", icon: "checkmark-circle" },
  wrong: { tone: TONES.coral, label: "Wrong", icon: "close-circle" },
  skipped: { tone: { ...TONES.ink, face: Q.faint, lip: Q.lineDark, soft: "#F1EEE4", line: "#DDD6C0", ink: Q.sub }, label: "Skipped", icon: "remove-circle" },
};

const LatexOptionText = ({ value, isExp, isLatex, minHeight }) => {
  if (!value) return null;

  if (!isLatex) {
    return (
      <AppText fontWeight="semibold" size={14.5} style={{ color: Q.ink, lineHeight: 22 }}>
        {capFirstLetter(value)}
      </AppText>
    );
  }

  return (
    <View style={{ flex: 1, minHeight }}>
      <Katex
        expression={value?.replace(/\$/g, "")}
        style={{ width: "100%", backgroundColor: "transparent" }}
        inlineStyle={isExp ? inlineExpStyle : inlineStyle}
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

const ExplanationSheet = ({ visible, data, onClose }) => (
  <QuizSheet
    visible={visible}
    onClose={onClose}
    tone="yellow"
    icon="bulb"
    title="Explanation"
    subtitle="Learn from every question"
    footer={<QuizButton title="Got it!" icon="checkmark" variant="primary" onPress={onClose} />}
  >
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4, gap: 12 }}>
      <View style={styles.sheetBox}>
        <AppText fontWeight="black" size={10.5} style={styles.sheetLabel}>
          QUESTION
        </AppText>
        <LatexOptionText
          value={data?.isLatex ? data?.questionLatex : capFirstLetter(data?.question)}
          isLatex={data?.isLatex}
          minHeight={data?.isLatex ? 56 : undefined}
        />
      </View>
      <View style={[styles.sheetBox, { backgroundColor: TONES.yellow.soft, borderColor: TONES.yellow.line }]}>
        <AppText fontWeight="black" size={10.5} style={[styles.sheetLabel, { color: TONES.yellow.ink }]}>
          WHY
        </AppText>
        <LatexOptionText
          value={data?.isLatex ? data?.explanationLatex + "\n\nPlain Text: " + data?.explanation : data?.explanation}
          isLatex={data?.isLatex}
          isExp
          minHeight={data?.isLatex ? 220 : undefined}
        />
      </View>
    </ScrollView>
  </QuizSheet>
);

const AnswerRow = ({ label, name, tone, icon }) => (
  <View style={[styles.answerRow, { backgroundColor: tone.soft, borderColor: tone.line }]}>
    <Ionicons name={icon} size={20} color={tone.face} />
    <View style={{ flex: 1, marginLeft: 10 }}>
      <AppText fontWeight="black" size={10.5} style={{ color: tone.ink, letterSpacing: 0.8 }}>
        {label}
      </AppText>
      <AppText fontWeight="bold" size={13.5} style={{ color: Q.ink, marginTop: 1 }}>
        {capFirstLetter(name)}
      </AppText>
    </View>
  </View>
);

export const RenderQuestion = memo(({ question, isSingle, itemNum }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [modal, setModal] = useState({ vis: false, data: null });
  const rotation = useSharedValue(0);

  const correctAnswer = useMemo(() => question?.answers?.find((item) => item.correct), [question?.answers]);
  const status = getQuestionStatus(question);
  const s = STATUS[status];

  useEffect(() => {
    rotation.value = withTiming(isExpanded ? 180 : 0, { duration: 260 });
  }, [isExpanded]);

  const toggleExpand = useCallback(() => setIsExpanded((p) => !p), []);
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <Animated.View
      layout={LAYOUT}
      style={[styles.card, { borderColor: s.tone.line, marginHorizontal: isSingle ? 12 : 16 }]}
    >
      <View style={styles.top}>
        <View style={[styles.index, { backgroundColor: s.tone.face }]}>
          <AppText fontWeight="black" size={14} style={{ color: "#fff" }}>
            {itemNum}
          </AppText>
        </View>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <LatexOptionText
            value={question?.isLatex ? question?.questionLatex : capFirstLetter(question?.question)}
            isLatex={question?.isLatex}
            minHeight={question?.isLatex ? 56 : undefined}
          />
        </View>
        <Pressable onPress={toggleExpand} hitSlop={10} style={[styles.arrow, { backgroundColor: s.tone.soft }]}>
          <Animated.View style={arrowStyle}>
            <Ionicons name="chevron-down" size={20} color={s.tone.ink} />
          </Animated.View>
        </Pressable>
      </View>

      <View style={styles.meta}>
        <Chip label={s.label} icon={s.icon} color={s.tone.ink} bg={s.tone.soft} />
        {Boolean(question?.explanation) && (
          <QuizPressable
            scaleTo={0.94}
            contentStyle={styles.explain}
            onPress={() =>
              setModal({
                vis: true,
                data: {
                  question: question?.question,
                  questionLatex: question?.questionLatex,
                  explanation: question?.explanation,
                  explanationLatex: question?.explanationLatex,
                  isLatex: question?.isLatex,
                },
              })
            }
          >
            <Ionicons name="bulb" size={13} color={TONES.yellow.ink} />
            <AppText fontWeight="bold" size={11.5} style={{ color: TONES.yellow.ink, marginLeft: 5 }}>
              See Explanation
            </AppText>
          </QuizPressable>
        )}
      </View>

      {isExpanded && (
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={styles.answers}>
          <AnswerRow label="CORRECT ANSWER" name={correctAnswer?.name ?? ""} tone={TONES.green} icon="checkmark-circle" />
          {status === "wrong" && (
            <AnswerRow label="YOUR ANSWER" name={question?.answered?.name ?? ""} tone={TONES.coral} icon="close-circle" />
          )}
          {status === "skipped" && (
            <AppText fontWeight="medium" size={12} style={{ color: Q.sub }}>
              You skipped this question.
            </AppText>
          )}
        </Animated.View>
      )}

      <ExplanationSheet
        visible={modal.vis}
        data={modal.data}
        onClose={() => setModal((m) => ({ ...m, vis: false }))}
      />
    </Animated.View>
  );
});

const matches = (question, filter) => filter === "all" || (filter === "wrong" ? getQuestionStatus(question) !== "right" : getQuestionStatus(question) === "right");

const QuestionViewToggle = memo(({ item, isSingle, filter }) => {
  const questions = item?.questions || [];
  return (
    <>
      {questions.map((question, idx) =>
        matches(question, filter) ? (
          // question._id may be an ObjectId — toString() keeps React keys primitive
          <RenderQuestion key={question._id?.toString() || `q-${idx}`} question={question} isSingle={isSingle} itemNum={idx + 1} />
        ) : null,
      )}
    </>
  );
});

const EmptyList = ({ filter = "all" }) => (
  <View style={styles.emptyList}>
    <Ionicons name={filter === "all" ? "help-circle" : "sparkles"} size={40} color={Q.faint} />
    <AppText fontWeight="bold" style={styles.emptyListTxt}>
      {filter === "all"
        ? "You haven't answered any quiz questions under this topic"
        : filter === "wrong"
          ? "No misses here — nice work!"
          : "No correct answers to show yet"}
    </AppText>
  </View>
);

/**
 * Props unchanged, plus `filter`: "all" | "wrong" | "right" (wrong includes skipped).
 */
const QuizCorrections = ({ data, contentContainerStyle, ListHeaderComponent, isSingle = false, filter = "all" }) => {
  const groups = useMemo(
    () => (data ?? []).filter((g) => filter === "all" || (g?.questions ?? []).some((q) => matches(q, filter))),
    [data, filter],
  );

  const renderCorrections = useCallback(
    ({ item }) => {
      if (isSingle) {
        return (
          <>
            <QuestionViewToggle item={item} isSingle={isSingle} filter={filter} />
            {!item?.questions?.length && <EmptyList />}
          </>
        );
      }
      return (
        <>
          <View style={styles.group}>
            <View style={styles.groupDot}>
              <Ionicons name="book" size={14} color={TONES.blue.ink} />
            </View>
            <AppText size={18} style={styles.subjectText} fontWeight="black">
              {item.subject?.name}
            </AppText>
          </View>
          <QuestionViewToggle isSingle={isSingle} item={item} filter={filter} />
        </>
      );
    },
    [isSingle, filter],
  );

  const keyExtractor = useCallback(
    (item, index) =>
      item._id?.toString() ?? item.subject?._id?.toString() ?? item.subject?.name ?? `group-${index}`,
    [],
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={groups}
        keyExtractor={keyExtractor}
        ListEmptyComponent={<EmptyList filter={filter} />}
        ListHeaderComponent={ListHeaderComponent}
        contentContainerStyle={[{ paddingBottom: 20 }, contentContainerStyle]}
        renderItem={renderCorrections}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default memo(QuizCorrections);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Q.card, borderRadius: 20, borderWidth: 2, borderBottomWidth: 5,
    padding: 12, marginBottom: 12,
  },
  top: { flexDirection: "row", alignItems: "flex-start" },
  index: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 10 },
  arrow: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  meta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  explain: {
    flexDirection: "row", alignItems: "center", backgroundColor: TONES.yellow.soft,
    borderWidth: 2, borderBottomWidth: 3, borderColor: TONES.yellow.line, borderRadius: 12,
    paddingVertical: 5, paddingHorizontal: 10,
  },
  answers: { marginTop: 12, gap: 8 },
  answerRow: { flexDirection: "row", alignItems: "center", borderWidth: 2, borderRadius: 14, padding: 10 },
  group: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 6, marginBottom: 10 },
  groupDot: {
    width: 30, height: 30, borderRadius: 10, backgroundColor: TONES.blue.soft,
    borderWidth: 2, borderColor: TONES.blue.line, alignItems: "center", justifyContent: "center",
  },
  subjectText: { textTransform: "capitalize", marginLeft: 10, color: Q.ink },
  emptyList: { alignItems: "center", justifyContent: "center", paddingVertical: 50, gap: 10 },
  emptyListTxt: { color: Q.sub, textAlign: "center", width: "65%" },
  sheetBox: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 2, borderColor: Q.line, padding: 12 },
  sheetLabel: { color: Q.sub, letterSpacing: 1, marginBottom: 6 },
});
