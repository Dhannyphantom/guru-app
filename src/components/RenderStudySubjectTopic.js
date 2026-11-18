/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";

import AppText from "../components/AppText";
import LottieAnimator from "./LottieAnimator";
import ListEmpty from "./ListEmpty";
import { useFetchSubjectsTopicsMutation } from "../context/instanceSlice";
import { capFirstLetter } from "../helpers/helperFunctions";
import { Q, TONES, TONE_CYCLE } from "./quiz/QuizTheme";
import {
  AnimatedBar,
  Chip,
  QuizButton,
  QuizCard,
  QuizPressable,
  QuizSheet,
} from "./quiz/QuizUI";
import { popIn, popOut } from "./quiz/QuizMotion";

const pct = (v, m) => (m ? Math.min(Math.round(((v ?? 0) / m) * 100), 100) : 0);

const Checkbox = ({ on, tone }) => (
  <View style={[styles.box, on && { backgroundColor: tone.face, borderColor: tone.lip }]}>
    {on && (
      <Animated.View entering={popIn} exiting={popOut}>
        <Ionicons name="checkmark" size={18} color="#fff" />
      </Animated.View>
    )}
  </View>
);

const TopicRow = ({ topic, tone, onToggle }) => {
  const on = Boolean(topic.hasStudied);
  return (
    <QuizPressable
      onPress={onToggle}
      scaleTo={0.98}
      contentStyle={[styles.topic, on && { backgroundColor: TONES.green.soft, borderColor: TONES.green.line }]}
    >
      <Checkbox on={on} tone={TONES.green} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.topicTop}>
          <AppText fontWeight="bold" size={14.5} style={{ color: on ? TONES.green.ink : Q.ink, flex: 1 }}>
            {capFirstLetter(topic.name)}
          </AppText>
          {on && <Chip label="Revised" icon="sparkles" style={{ marginLeft: 6 }} />}
        </View>
        <View style={{ marginTop: 8 }}>
          <AnimatedBar
            percent={pct(topic.qBankQuestions, topic.totalQuestions)}
            color={on ? TONES.green.face : tone.face}
            height={8}
            delay={0}
          />
        </View>
      </View>
    </QuizPressable>
  );
};

const SubjectBlock = ({ subject, index, onToggle, onChange }) => {
  const tone = TONES[TONE_CYCLE[(index + 1) % TONE_CYCLE.length]];
  const visible = subject.topics?.filter((t) => t.visible) ?? [];

  return (
    <QuizCard index={index} base={80} style={{ padding: 0, overflow: "hidden" }}>
      <View style={[styles.subHead, { backgroundColor: tone.soft, borderBottomColor: tone.line }]}>
        <View style={[styles.subIcon, { backgroundColor: "#fff", borderColor: tone.line }]}>
          <Ionicons name="book" size={18} color={tone.ink} />
        </View>
        <AppText fontWeight="black" size={17} numberOfLines={1} style={{ flex: 1, color: Q.ink, textTransform: "capitalize" }}>
          {subject.name}
        </AppText>
        <QuizPressable onPress={onChange} scaleTo={0.94} contentStyle={[styles.change, { borderColor: tone.line }]}>
          <Ionicons name="swap-horizontal" size={14} color={tone.ink} />
          <AppText fontWeight="bold" size={12} style={{ color: tone.ink, marginLeft: 5 }}>
            Change topic
          </AppText>
        </QuizPressable>
      </View>

      <View style={{ padding: 12, gap: 10 }}>
        {!subject.topics ? (
          <AppText fontWeight="medium" size={13} style={{ color: Q.sub }}>
            Loading topics…
          </AppText>
        ) : visible.length === 0 ? (
          <AppText fontWeight="medium" size={13} style={{ color: Q.sub }}>
            No topic selected. Tap “Change topic” to pick one.
          </AppText>
        ) : (
          visible.map((t) => <TopicRow key={t._id} topic={t} tone={tone} onToggle={() => onToggle(t._id)} />)
        )}
      </View>
    </QuizCard>
  );
};

/**
 * Study step. `setQuizInfo` accepts a partial object OR an updater
 * (prev => partial); the parent merges it into quizInfo.
 */
const RenderStudySubjectTopic = ({ quizInfo, setQuizInfo }) => {
  const [sheet, setSheet] = useState({ vis: false, subjectId: null });
  const [refreshing, setRefreshing] = useState(false);
  const [fetchTopics, { isLoading }] = useFetchSubjectsTopicsMutation();

  const subjects = quizInfo?.subjects ?? [];
  const active = subjects.find((s) => s._id === sheet.subjectId);

  const total = subjects.reduce((n, s) => n + (s.topics?.filter((t) => t.visible).length ?? 0), 0);
  const done = subjects.reduce((n, s) => n + (s.topics?.filter((t) => t.visible && t.hasStudied).length ?? 0), 0);

  const mapSubject = (subjectId, fn) =>
    setQuizInfo((prev) => ({
      subjects: (prev.subjects ?? []).map((s) => (s._id === subjectId ? { ...s, topics: fn(s.topics ?? []) } : s)),
    }));

  const toggleStudied = (subjectId, topicId) =>
    mapSubject(subjectId, (topics) =>
      topics.map((t) => (t._id === topicId ? { ...t, hasStudied: !t.hasStudied } : t)),
    );

  const pickTopic = (subjectId, topicId) =>
    mapSubject(subjectId, (topics) => topics.map((t) => ({ ...t, visible: t._id === topicId })));

  const getTopics = async () => {
    try {
      const res = await fetchTopics({
        subjects: subjects.map((s) => s._id),
        category: quizInfo.category?._id,
      }).unwrap();

      setQuizInfo((prev) => ({
        subjects: (prev.subjects ?? []).map((subject) => {
          const fresh = res?.data?.find((r) => r?._id === subject?._id);
          if (!fresh) return subject;
          // keep what the student already ticked / picked
          const old = new Map((subject.topics ?? []).map((t) => [t._id, t]));
          return {
            ...subject,
            topics: (fresh.topics ?? []).map((t) => {
              const prevTopic = old.get(t._id);
              return prevTopic ? { ...t, hasStudied: prevTopic.hasStudied, visible: prevTopic.visible } : t;
            }),
          };
        }),
      }));
    } catch (_error) {}
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await getTopics();
    setRefreshing(false);
  };

  useEffect(() => {
    getTopics();
  }, []);

  const hasTopic = Boolean(active?.topics?.[0]);
  const closeSheet = () => setSheet((s) => ({ ...s, vis: false }));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <QuizCard tone="yellow" index={0} style={{ paddingTop: 14 }}>
          <View style={styles.coachTop}>
            <View style={styles.coachIcon}>
              <Ionicons name="bulb" size={20} color={TONES.yellow.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText fontWeight="black" size={15} style={{ color: Q.ink }}>
                Revise, tick, play!
              </AppText>
              <AppText fontWeight="medium" size={12.5} style={{ color: "#4A4020", marginTop: 2, lineHeight: 18 }}>
                Pick topics you&apos;ve revised, or take a few minutes to revise them now. Tick every topic to unlock your quiz.
              </AppText>
            </View>
          </View>
          <View style={styles.coachBar}>
            <AnimatedBar percent={pct(done, total)} color={TONES.green.face} track="#fff" height={12} delay={0} />
            <AppText fontWeight="black" size={12} style={{ color: TONES.yellow.ink, marginTop: 6 }}>
              {done} of {total} topics revised
            </AppText>
          </View>
        </QuizCard>

        {subjects.map((subject, i) => (
          <SubjectBlock
            key={subject._id}
            subject={subject}
            index={i + 1}
            onToggle={(topicId) => toggleStudied(subject._id, topicId)}
            onChange={() => setSheet({ vis: true, subjectId: subject._id })}
          />
        ))}
      </ScrollView>

      <QuizSheet
        fill
        visible={sheet.vis}
        onClose={closeSheet}
        tone="green"
        icon="list"
        title={`${capFirstLetter(active?.name ?? "")} topics`}
        subtitle="Choose the topic you want to be quizzed on"
        footer={
          <QuizButton
            title={hasTopic ? "Update Quiz Topic" : "Close"}
            icon={hasTopic ? "checkmark" : "close"}
            variant={hasTopic ? "primary" : "coral"}
            onPress={closeSheet}
          />
        }
      >
        <FlatList
          data={active?.topics ?? []}
          keyExtractor={(item) => item._id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 4, gap: 10 }}
          ListEmptyComponent={<ListEmpty style={{ width: null }} vis message="No Topics Found!" />}
          renderItem={({ item }) => (
            <QuizPressable
              onPress={() => pickTopic(active._id, item._id)}
              scaleTo={0.98}
              contentStyle={[styles.topic, item.visible && { backgroundColor: TONES.green.soft, borderColor: TONES.green.face }]}
            >
              <Ionicons
                name={item.visible ? "radio-button-on" : "radio-button-off"}
                size={24}
                color={item.visible ? TONES.green.face : Q.faint}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText fontWeight={item.visible ? "black" : "bold"} size={14.5} style={{ color: item.visible ? TONES.green.ink : Q.ink }}>
                  {capFirstLetter(item.name)}
                </AppText>
                <View style={{ marginTop: 8 }}>
                  <AnimatedBar
                    percent={pct(item.qBankQuestions, item.totalQuestions)}
                    color={item.visible ? TONES.green.face : Q.faint}
                    height={8}
                    delay={0}
                  />
                </View>
              </View>
            </QuizPressable>
          )}
        />
      </QuizSheet>

      <LottieAnimator visible={isLoading} absolute wTransparent />
    </View>
  );
};

export default RenderStudySubjectTopic;

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 2 },
  coachTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  coachIcon: {
    width: 40, height: 40, borderRadius: 13, backgroundColor: "#fff",
    borderWidth: 2, borderColor: TONES.yellow.line, alignItems: "center", justifyContent: "center",
  },
  coachBar: { marginTop: 12 },
  subHead: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 2 },
  subIcon: { width: 36, height: 36, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center", marginRight: 10 },
  change: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 12, borderWidth: 2, borderBottomWidth: 3, paddingVertical: 6, paddingHorizontal: 10,
  },
  topic: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 16, borderWidth: 2, borderBottomWidth: 4, borderColor: Q.line, padding: 12,
  },
  topicTop: { flexDirection: "row", alignItems: "center" },
  box: {
    width: 28, height: 28, borderRadius: 9, borderWidth: 2.5, borderColor: Q.lineDark,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
  },
});
