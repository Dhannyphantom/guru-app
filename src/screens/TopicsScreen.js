/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";

import AppHeader from "../components/AppHeader";
import ListEmpty from "../components/ListEmpty";
import LottieAnimator from "../components/LottieAnimator";
import getRefresher from "../components/Refresher";
import TopicItem, {
  getTopicProgress,
  getTopicRoute,
} from "../components/TopicItem";
import AppText from "../components/jamb/JambText";
import { BANNER_ART, BannerShell } from "../components/jamb/JambHero";
import { T } from "../components/jamb/JambTheme";
import {
  Chip,
  JambPressable,
  Note,
  ProgressRing,
  SectionTitle,
  SubjectIcon,
  useCountUp,
} from "../components/jamb/JambUI";
import { PAD_BOTTOM } from "../helpers/dataStore";
import { useFetchSubjTopicsQuery } from "../context/instanceSlice";
import { selectUser } from "../context/usersSlice";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "doing", label: "Learning" },
  { key: "done", label: "Mastered" },
];

/** Fun rank label that grows with overall progress. */
const getRank = (percent, started) => {
  if (!started) return { label: "Ready to start", icon: "rocket" };
  if (percent >= 80) return { label: "Master", icon: "trophy" };
  if (percent >= 50) return { label: "Scholar", icon: "school" };
  if (percent >= 25) return { label: "Rising star", icon: "star" };
  return { label: "Rookie", icon: "leaf" };
};

// ─── Pieces ──────────────────────────────────────────────────────────────────

const Hero = ({ subject, stats }) => {
  const shown = useCountUp(stats.percent, 1100, 200);
  const rank = getRank(stats.percent, stats.started > 0);

  return (
    <BannerShell
      art={
        <View style={styles.heroArt}>
          <ProgressRing
            percent={stats.percent}
            size={100}
            stroke={11}
            color={T.yellow}
            track="rgba(255,248,231,0.16)"
          >
            <AppText fontWeight="black" size={24} style={{ color: T.chalk }}>
              {shown}%
            </AppText>
            <AppText
              fontWeight="bold"
              size={9.5}
              style={{ color: T.chalkSoft, letterSpacing: 0.8, marginTop: -1 }}
            >
              DONE
            </AppText>
          </ProgressRing>
        </View>
      }
    >
      <View style={styles.heroTag}>
        <AppText fontWeight="black" size={9.5} style={styles.heroTagText}>
          STUDY PATH
        </AppText>
      </View>

      <View style={styles.heroTitleRow}>
        <SubjectIcon
          subject={subject}
          size={34}
          bg={T.chalk}
          radius={11}
          imageScale={0.8}
        />
        <AppText
          fontWeight="black"
          size={20}
          numberOfLines={2}
          style={styles.heroTitle}
        >
          {subject?.name}
        </AppText>
      </View>

      <AppText fontWeight="medium" size={12.5} style={styles.heroDesc}>
        {stats.total > 0
          ? `${stats.mastered} of ${stats.total} topic${stats.total === 1 ? "" : "s"} mastered`
          : "Your topics will show up here"}
      </AppText>

      <Chip
        icon={rank.icon}
        label={rank.label}
        color={T.yellowInk}
        bg={T.yellow}
        style={{ marginTop: 10 }}
      />
    </BannerShell>
  );
};

const FilterPill = ({ label, count, active, onPress }) => (
  <JambPressable
    onPress={onPress}
    scaleTo={0.94}
    contentStyle={[styles.pill, active && styles.pillOn]}
  >
    <AppText
      fontWeight="bold"
      size={12.5}
      style={{ color: active ? "#fff" : T.ink }}
    >
      {label}
    </AppText>
    <View style={[styles.pillCount, active && styles.pillCountOn]}>
      <AppText
        fontWeight="black"
        size={10.5}
        style={{ color: active ? "#fff" : T.sub }}
      >
        {count}
      </AppText>
    </View>
  </JambPressable>
);

// ─── Screen ──────────────────────────────────────────────────────────────────

const TopicsScreen = ({ route }) => {
  const router = useRouter();
  const { data, isLoading, refetch } = useFetchSubjTopicsQuery(route?._id);
  const user = useSelector(selectUser);

  const [cache, setCache] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");

  const isStudent = user?.accountType === "student";

  const fetchCache = async () => {
    let topics = await AsyncStorage.getItem(`topics_${route?._id}`);
    if (topics) {
      topics = JSON.parse(topics);
      setCache(topics);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await refetch().unwrap();
    } catch (_errr) {
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCache();
  }, []);

  const topics = data?.data ?? cache;

  // Everything derived from the topic list, computed once per change.
  const { entries, stats, counts, next } = useMemo(() => {
    const list = Array.isArray(topics) ? topics : [];

    let answered = 0;
    let questions = 0;
    const c = { all: list.length, new: 0, doing: 0, done: 0 };

    const all = list.map((topic, i) => {
      const p = getTopicProgress(topic);
      answered += p.done;
      questions += p.total;
      c[p.status] += 1;
      return { topic, number: i + 1, status: p.status, percent: p.percent };
    });

    // Up next: keep going on something in progress, otherwise the first new one.
    const upNext =
      all.find((e) => e.status === "doing") ??
      all.find((e) => e.status === "new");

    return {
      entries: all,
      counts: c,
      next: upNext,
      stats: {
        total: list.length,
        mastered: c.done,
        started: c.doing + c.done,
        percent:
          questions > 0
            ? Math.min(Math.round((answered / questions) * 100), 100)
            : 0,
      },
    };
  }, [topics]);

  const visible = useMemo(
    () =>
      filter === "all" ? entries : entries.filter((e) => e.status === filter),
    [entries, filter],
  );

  const openNext = () => {
    if (next) router.push(getTopicRoute(next.topic, route));
  };

  const renderItem = useCallback(
    ({ item, index }) => (
      <TopicItem
        data={item.topic}
        number={item.number}
        index={index}
        subject={route}
        isFirst={index === 0}
        isLast={index === visible.length - 1}
        isNext={isStudent && item.topic._id === next?.topic._id}
        disabled={!isStudent}
      />
    ),
    [route, visible.length, isStudent, next?.topic._id],
  );

  const header = (
    <View>
      <Hero subject={route} stats={stats} />

      {isStudent && next && stats.total > 0 && (
        <Note
          index={1}
          base={80}
          tone="green"
          icon="flash"
          title={
            next.status === "doing"
              ? "Pick up where you left off"
              : "Start your first win"
          }
          onPress={openNext}
          right={
            <Chip label="Go" icon="arrow-forward" color="#fff" bg={T.green} />
          }
        >
          <AppText
            fontWeight="medium"
            size={12.5}
            numberOfLines={1}
            style={styles.noteText}
          >
            {next.topic.name}
            {next.status === "doing" ? ` · ${next.percent}% done` : ""}
          </AppText>
        </Note>
      )}

      <View style={styles.sectionGap}>
        <SectionTitle
          icon="map"
          title="Your topics"
          sub="Complete a topic to light up the path"
        />
      </View>

      {stats.total > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillsScroll}
          contentContainerStyle={styles.pills}
        >
          {FILTERS.map((f) => (
            <FilterPill
              key={f.key}
              label={f.label}
              count={counts[f.key]}
              active={filter === f.key}
              onPress={() => setFilter(f.key)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader title={route?.name} />
      <FlatList
        data={visible}
        keyExtractor={(item) => item.topic._id}
        contentContainerStyle={[styles.content, { paddingBottom: PAD_BOTTOM }]}
        showsVerticalScrollIndicator={false}
        refreshControl={getRefresher({ refreshing, onRefresh })}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <ListEmpty
            vis={!isLoading}
            message={filter === "all" ? "No Topics Yet" : "Nothing here yet"}
          />
        }
        renderItem={renderItem}
        initialNumToRender={8}
        windowSize={9}
      />
      <LottieAnimator visible={isLoading} absolute />
    </View>
  );
};

export default TopicsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },

  // hero
  heroArt: {
    width: BANNER_ART * 1.15,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,199,54,0.18)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 9,
  },
  heroTagText: { color: T.yellow, letterSpacing: 1 },
  heroTitleRow: { flexDirection: "row", alignItems: "center" },
  heroTitle: {
    color: T.chalk,
    flex: 1,
    marginLeft: 10,
    lineHeight: 24,
    textTransform: "capitalize",
  },
  heroDesc: { color: T.chalkSoft, marginTop: 9, lineHeight: 18 },

  noteText: { color: "#2E5B43", marginTop: 3 },
  sectionGap: { marginTop: 8 },

  // filters
  pillsScroll: { marginHorizontal: -16, marginBottom: 12 },
  pills: { paddingHorizontal: 16, paddingBottom: 2, gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.line,
  },
  pillOn: { backgroundColor: T.green, borderColor: T.greenDark },
  pillCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.track,
  },
  pillCountOn: { backgroundColor: "rgba(255,255,255,0.25)" },
});
