import {
  Dimensions,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { T } from "../components/jamb/JambTheme";
import { JambButton } from "../components/jamb/JambUI";
import LottieAnimator from "../components/LottieAnimator";
import AppText from "../components/AppText";
import Avatar from "../components/Avatar";
import ListEmpty from "../components/ListEmpty";
import getRefresher from "../components/Refresher";
import { FlagStudentModal } from "../components/LeaveFlagModals";
import { selectUser } from "../context/usersSlice";
import {
  selectSchool,
  useFetchSchoolStudentsQuery,
} from "../context/schoolSlice";
import { PAD_BOTTOM } from "../helpers/dataStore";

const { width } = Dimensions.get("window");

const PAGE_SIZE = 20; // even → no half-empty last row in 2 columns
const H_PAD = 16;
const GAP = 12;
const CARD_W = (width - H_PAD * 2 - GAP) / 2;
const BACK_W = 44;
const SEARCH_MAX_W = width - H_PAD * 2 - BACK_W - 8;

const AVATAR_BORDER = { width: 3, color: T.line };
const AVATAR_BORDER_OWN = { width: 3, color: T.green };
const CAPITALIZE = { textTransform: "capitalize" };

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\s+/g, "");

const compact = (n = 0) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

const keyExtractor = (item) => item._id;
const classKeyExtractor = (item) => item.key;

// ─────────────────────────────────────────────────────────────────────────────
// Class card (top carousel)
// ─────────────────────────────────────────────────────────────────────────────
const ClassCard = memo(({ item, selected, onPress }) => {
  const fg = selected ? "#fff" : T.ink;
  const sub = selected ? "rgba(255,255,255,0.85)" : T.sub;

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.classCard,
        selected && styles.classCardOn,
        pressed && { transform: [{ translateY: 2 }] },
      ]}
    >
      <View style={styles.classTop}>
        <View
          style={[
            styles.classIcon,
            selected && { backgroundColor: "rgba(255,255,255,0.25)" },
          ]}
        >
          <Ionicons
            name={item.isAll ? "business" : "people"}
            size={16}
            color={selected ? "#fff" : T.greenDark}
          />
        </View>
        {item.isMine && (
          <View
            style={[
              styles.mineTag,
              selected && { backgroundColor: "rgba(255,255,255,0.28)" },
            ]}
          >
            <AppText
              size="xsmall"
              fontWeight="black"
              style={{ color: selected ? "#fff" : T.yellowInk }}
            >
              Your class
            </AppText>
          </View>
        )}
      </View>

      <AppText
        fontWeight="black"
        size="large"
        numberOfLines={1}
        style={{ color: fg, marginTop: 10, textTransform: "uppercase" }}
      >
        {item.title}
      </AppText>
      <AppText
        size="small"
        numberOfLines={1}
        style={{ color: sub, marginTop: 1 }}
      >
        {item.count} {item.count === 1 ? "student" : "students"}
        {item.alias ? ` · ${item.alias}` : ""}
      </AppText>
    </Pressable>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Stat tile inside a student card
// ─────────────────────────────────────────────────────────────────────────────
const Stat = memo(({ icon, color, bg, value, label }) => (
  <View style={[styles.stat, { backgroundColor: bg }]}>
    <View style={styles.statTop}>
      <Ionicons name={icon} size={13} color={color} />
      <AppText
        fontWeight="black"
        size="small"
        style={{ marginLeft: 4, color: T.ink }}
      >
        {value}
      </AppText>
    </View>
    <AppText size="xsmall" fontWeight="bold" style={{ color }}>
      {label}
    </AppText>
  </View>
));

// ─────────────────────────────────────────────────────────────────────────────
// Student card
// ─────────────────────────────────────────────────────────────────────────────
const StudentCard = memo(({ item, isOwn, onFlag }) => {
  const name =
    `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || item.username;
  const level = item.class?.level;

  return (
    <View style={[styles.card, isOwn && styles.cardOwn]}>
      {isOwn ? (
        <View style={styles.youBadge}>
          <AppText size="xsmall" fontWeight="black" style={{ color: "#fff" }}>
            YOU
          </AppText>
        </View>
      ) : (
        <Pressable
          onPress={() => onFlag(item)}
          hitSlop={10}
          style={styles.flagBtn}
        >
          <Ionicons name="flag-outline" size={13} color={T.sub} />
        </Pressable>
      )}

      <Avatar
        size={68}
        source={item.avatar?.image}
        data={{ user: item }}
        userID={item._id}
        border={isOwn ? AVATAR_BORDER_OWN : AVATAR_BORDER}
      />

      <AppText
        fontWeight="black"
        size="medium"
        numberOfLines={1}
        style={[CAPITALIZE, styles.name]}
      >
        {name}
      </AppText>
      {Boolean(item.username) && (
        <AppText
          size="small"
          numberOfLines={1}
          style={{ color: T.sub, marginTop: 1 }}
        >
          @{item.username}
        </AppText>
      )}

      {Boolean(level) && (
        <View style={styles.levelBadge}>
          <AppText
            size="xsmall"
            fontWeight="black"
            style={{
              color: T.blueDark,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {level}
          </AppText>
        </View>
      )}

      <View style={styles.statsRow}>
        <Stat
          icon="trophy"
          color={T.yellowInk}
          bg={T.yellowSoft}
          value={compact(item.totalPoints)}
          label="Points"
        />
        <Stat
          icon="flame"
          color={T.coralDark}
          bg={T.coralSoft}
          value={compact(item.streak)}
          label="Streak"
        />
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────
const SchoolStudentsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);
  const school = useSelector(selectSchool);
  const isTeacher = user?.accountType === "teacher";

  // query, class filter and offset live in ONE object so they always change
  // together (never a request with a new filter and an old offset).
  // Students start on their own class; teachers start on the whole school.
  const [params, setParams] = useState(() => ({
    q: "",
    offset: 0,
    classLevel: isTeacher ? "" : (user?.class?.level ?? ""),
  }));
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [flagTarget, setFlagTarget] = useState(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const {
    data: res,
    isFetching,
    isError,
    error,
    refetch,
  } = useFetchSchoolStudentsQuery(
    {
      schoolId: school?._id,
      q: params.q,
      classLevel: params.classLevel,
      offset: params.offset,
      limit: PAGE_SIZE,
    },
    { skip: !school?._id },
  );

  // RTK keeps the previous result while a new filter loads — don't show it
  // under the wrong class/search.
  const staleByFilter =
    Boolean(res) &&
    ((res.filters?.q ?? "") !== params.q ||
      norm(res.filters?.classLevel) !== norm(params.classLevel));

  const items = staleByFilter ? undefined : res?.data;
  const total = staleByFilter ? 0 : (res?.pagination?.total ?? 0);
  const hasMore = !staleByFilter && Boolean(res?.pagination?.hasMore);

  // ── Class cards ─────────────────────────────────────────────────────────
  const selectedKey = params.classLevel ? norm(params.classLevel) : "all";

  const classCards = useMemo(() => {
    const mapped = (res?.classes ?? []).map((c) => ({
      key: norm(c.level),
      level: c.level,
      title: c.level,
      alias: c.alias,
      count: c.count,
      isMine: c.isMine,
    }));
    const all = {
      key: "all",
      level: "",
      title: "Whole school",
      count: res?.schoolTotal ?? 0,
      isAll: true,
    };
    const mine = mapped.filter((c) => c.isMine);
    const rest = mapped.filter((c) => !c.isMine);
    return [...mine, all, ...rest];
  }, [res?.classes, res?.schoolTotal]);

  const onSelectClass = useCallback((c) => {
    setParams((p) =>
      norm(p.classLevel) === norm(c.level)
        ? p
        : { ...p, classLevel: c.level, offset: 0 },
    );
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const renderClass = useCallback(
    ({ item }) => (
      <ClassCard
        item={item}
        selected={item.key === selectedKey}
        onPress={onSelectClass}
      />
    ),
    [selectedKey, onSelectClass],
  );

  // ── Debounced search ────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      const next = text.trim();
      setParams((p) => (p.q === next ? p : { ...p, q: next, offset: 0 }));
    }, 350);
    return () => clearTimeout(t);
  }, [text]);

  // ── Animated search bar ─────────────────────────────────────────────────
  const progress = useSharedValue(0);

  const searchStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [BACK_W, SEARCH_MAX_W]),
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [0, -14],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));
  const inputWrapStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.5, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const openSearch = useCallback(() => {
    setOpen(true);
    progress.value = withTiming(1, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
    setTimeout(() => inputRef.current?.focus(), 220);
  }, []);

  const closeSearch = useCallback(() => {
    Keyboard.dismiss();
    setText("");
    setParams((p) => (p.q === "" ? p : { ...p, q: "", offset: 0 }));
    setOpen(false);
    progress.value = withTiming(0, {
      duration: 220,
      easing: Easing.inOut(Easing.cubic),
    });
  }, []);

  // ── List handlers ───────────────────────────────────────────────────────
  const onEndReached = useCallback(() => {
    if (!hasMore || isFetching || !items?.length) return;
    setParams((p) => ({ ...p, offset: items.length }));
  }, [hasMore, isFetching, items?.length]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (params.offset === 0) await refetch();
      else setParams((p) => ({ ...p, offset: 0 }));
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  }, [params.offset, refetch]);

  const refreshControl = useMemo(
    () => getRefresher({ refreshing, onRefresh }),
    [refreshing, onRefresh],
  );

  const ownId = user?._id;
  const handleFlag = useCallback((u) => setFlagTarget(u), []);
  const closeFlag = useCallback(() => setFlagTarget(null), []);
  const goBack = useCallback(() => router.back(), []);
  const retry = useCallback(() => refetch(), [refetch]);

  const renderItem = useCallback(
    ({ item }) => (
      <StudentCard item={item} isOwn={item._id === ownId} onFlag={handleFlag} />
    ),
    [ownId, handleFlag],
  );

  // ── Header: class cards + result line ───────────────────────────────────
  const selectedCard = classCards.find((c) => c.key === selectedKey);

  const subtitle = (() => {
    if (!res || staleByFilter) return " ";
    if (params.q) {
      return `${total} result${total === 1 ? "" : "s"} for "${params.q}"`;
    }
    if (selectedKey === "all") {
      return `${total} students in ${school?.name ?? "your school"}`;
    }
    const lvl = String(selectedCard?.title ?? params.classLevel).toUpperCase();
    return selectedCard?.isMine
      ? `Your classmates in ${lvl} · ${total}`
      : `${total} student${total === 1 ? "" : "s"} in ${lvl}`;
  })();

  const ListHeader = useMemo(
    () => (
      <View>
        {classCards.length > 1 && (
          <View style={styles.classSection}>
            <View style={styles.sectionRow}>
              <View style={styles.sectionIcon}>
                <Ionicons name="school" size={16} color={T.blueDark} />
              </View>
              <AppText fontWeight="black" size="large" style={{ color: T.ink }}>
                Browse by class
              </AppText>
            </View>
            <FlatList
              data={classCards}
              horizontal
              keyExtractor={classKeyExtractor}
              renderItem={renderClass}
              extraData={selectedKey}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.classList}
            />
          </View>
        )}
        <View style={styles.subHeader}>
          <AppText
            size="small"
            fontWeight="bold"
            numberOfLines={1}
            style={{ color: T.sub }}
          >
            {subtitle}
          </AppText>
        </View>
      </View>
    ),
    [classCards, renderClass, selectedKey, subtitle],
  );

  const ListFooter = useMemo(() => {
    if (isFetching && items?.length) {
      return (
        <View style={styles.footer}>
          <LottieAnimator visible size={48} />
        </View>
      );
    }
    if (!hasMore && items?.length > PAGE_SIZE) {
      return (
        <View style={styles.footer}>
          <View style={styles.endPill}>
            <Ionicons name="checkmark-done" size={14} color={T.greenDark} />
            <AppText
              size="small"
              fontWeight="bold"
              style={{ color: T.greenDark, marginLeft: 5 }}
            >
              You've reached the end
            </AppText>
          </View>
        </View>
      );
    }
    return <View style={{ height: 8 }} />;
  }, [isFetching, hasMore, items?.length]);

  const ListEmptyEl = useMemo(() => {
    if (isError && !items?.length) {
      return (
        <View style={styles.centerBox}>
          <View style={styles.errIcon}>
            <Ionicons name="cloud-offline" size={36} color={T.coralDark} />
          </View>
          <AppText
            fontWeight="black"
            style={{ color: T.ink, marginTop: 14, textAlign: "center" }}
          >
            {error?.data?.message || error?.error || "Couldn't load students"}
          </AppText>
          <JambButton
            title="Try again"
            icon="refresh"
            small
            onPress={retry}
            style={{ marginTop: 16 }}
          />
        </View>
      );
    }
    if (isFetching || staleByFilter || !res) {
      return (
        <View style={styles.centerBox}>
          <LottieAnimator visible size={90} />
        </View>
      );
    }
    return (
      <ListEmpty
        message={
          params.q
            ? `No one matches "${params.q}".\nTry a different name or username`
            : "No students in this class yet"
        }
      />
    );
  }, [isError, error, isFetching, staleByFilter, res, items?.length, params.q]);

  return (
    <View style={styles.container}>
      {/* ── Header with animated search ─────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={goBack} style={styles.iconBtn} hitSlop={6}>
          <Ionicons name="arrow-back" size={22} color={T.ink} />
        </Pressable>

        <Animated.View
          style={[styles.titleWrap, titleStyle]}
          pointerEvents="none"
        >
          <AppText fontWeight="black" size="xlarge" style={{ color: T.ink }}>
            {isTeacher ? "All Students" : "Schoolmates"}
          </AppText>
        </Animated.View>

        <Animated.View
          style={[styles.searchBox, { top: insets.top + 8 }, searchStyle]}
        >
          <Pressable
            onPress={open ? () => inputRef.current?.focus() : openSearch}
            style={styles.searchIcon}
            hitSlop={6}
          >
            <Ionicons name="search" size={20} color={T.ink} />
          </Pressable>

          <Animated.View
            style={[styles.inputWrap, inputWrapStyle]}
            pointerEvents={open ? "auto" : "none"}
          >
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder="Search by name or username"
              placeholderTextColor={T.faint}
              style={styles.input}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            <Pressable
              onPress={closeSearch}
              style={styles.closeBtn}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={20} color={T.faint} />
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>

      {/* ── Two-column infinite list ────────────────────────────────── */}
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.columnWrap}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmptyEl}
        refreshControl={refreshControl}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: PAD_BOTTOM }}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={40}
        windowSize={9}
      />

      <FlagStudentModal
        visible={Boolean(flagTarget)}
        onClose={closeFlag}
        school={school}
        targetUser={flagTarget}
      />
      <StatusBar style="dark" />
    </View>
  );
};

export default SchoolStudentsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.paper },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: H_PAD,
    paddingBottom: 12,
    minHeight: 44 + 8,
    backgroundColor: T.paper,
  },
  iconBtn: {
    width: BACK_W,
    height: BACK_W,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.line,
  },
  titleWrap: { marginLeft: 12, flex: 1 },
  searchBox: {
    position: "absolute",
    right: H_PAD,
    height: 44,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: T.line,
  },
  searchIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: { flex: 1, flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: T.ink,
    paddingRight: 4,
  },
  closeBtn: { paddingHorizontal: 10, height: 40, justifyContent: "center" },

  // class cards
  classSection: { paddingTop: 4 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: H_PAD,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: T.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  classList: { paddingHorizontal: H_PAD, paddingBottom: 6, gap: 10 },
  classCard: {
    width: 150,
    padding: 12,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: T.line,
  },
  classCardOn: { backgroundColor: T.green, borderColor: T.greenDark },
  classTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  classIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.greenSoft,
  },
  mineTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    backgroundColor: T.yellowSoft,
  },

  subHeader: { paddingHorizontal: H_PAD, paddingTop: 14, paddingBottom: 14 },
  columnWrap: { paddingHorizontal: H_PAD, gap: GAP, marginBottom: GAP },

  card: {
    width: CARD_W,
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 12,
    paddingHorizontal: 10,
    borderRadius: 24,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: T.line,
  },
  cardOwn: {
    borderColor: T.green,
    backgroundColor: T.greenSoft,
  },
  youBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: T.green,
  },
  flagBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
    borderRadius: 20,
    backgroundColor: T.paper,
    borderWidth: 1.5,
    borderColor: T.line,
  },
  name: { marginTop: 10, maxWidth: "100%", color: T.ink },
  levelBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: T.blueSoft,
  },
  statsRow: {
    flexDirection: "row",
    alignSelf: "stretch",
    gap: 6,
    marginTop: 12,
  },
  stat: { flex: 1, alignItems: "center", borderRadius: 12, paddingVertical: 6 },
  statTop: { flexDirection: "row", alignItems: "center" },

  footer: { paddingVertical: 20, alignItems: "center" },
  endPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.greenSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  centerBox: { paddingTop: 50, paddingHorizontal: 30, alignItems: "center" },
  errIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: T.coralSoft,
    borderWidth: 2,
    borderColor: T.coralLine,
    alignItems: "center",
    justifyContent: "center",
  },
});
