import {
  ActivityIndicator,
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

import colors from "../helpers/colors";
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

const AVATAR_BORDER = { width: 2, color: colors.lightly };
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
  const fg = selected ? colors.white : colors.black;
  const sub = selected ? colors.white : colors.medium;

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.classCard,
        selected && styles.classCardOn,
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={styles.classTop}>
        <View
          style={[
            styles.classIcon,
            selected && { backgroundColor: "rgba(255,255,255,0.22)" },
          ]}
        >
          <Ionicons
            name={item.isAll ? "business" : "people"}
            size={16}
            color={selected ? colors.white : colors.primaryDeeper}
          />
        </View>
        {item.isMine && (
          <View
            style={[
              styles.mineTag,
              selected && { backgroundColor: "rgba(255,255,255,0.25)" },
            ]}
          >
            <AppText
              size="xsmall"
              fontWeight="black"
              style={{ color: selected ? colors.white : colors.primaryDeeper }}
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
// Stat chip inside a student card
// ─────────────────────────────────────────────────────────────────────────────
const Stat = memo(({ icon, color, value, label }) => (
  <View style={styles.stat}>
    <View style={styles.statTop}>
      <Ionicons name={icon} size={13} color={color} />
      <AppText fontWeight="heavy" size="small" style={{ marginLeft: 3 }}>
        {value}
      </AppText>
    </View>
    <AppText size="xsmall" style={{ color: colors.medium }}>
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
          <AppText
            size="xsmall"
            fontWeight="black"
            style={{ color: colors.primaryDeeper }}
          >
            You
          </AppText>
        </View>
      ) : (
        <Pressable
          onPress={() => onFlag(item)}
          hitSlop={10}
          style={styles.flagBtn}
        >
          <Ionicons name="flag-outline" size={14} color={colors.medium} />
        </Pressable>
      )}

      <Avatar
        size={68}
        source={item.avatar?.image}
        data={{ user: item }}
        userID={item._id}
        border={AVATAR_BORDER}
      />

      <AppText
        fontWeight="heavy"
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
          style={{ color: colors.medium, marginTop: 1 }}
        >
          @{item.username}
        </AppText>
      )}

      {Boolean(level) && (
        <View style={styles.levelBadge}>
          <AppText
            size="xsmall"
            fontWeight="bold"
            style={{ color: colors.primaryDeeper, textTransform: "uppercase" }}
          >
            {level}
          </AppText>
        </View>
      )}

      <View style={styles.statsRow}>
        <Stat
          icon="trophy"
          color={colors.primary}
          value={compact(item.totalPoints)}
          label="Points"
        />
        <View style={styles.statDivider} />
        <Stat
          icon="flame"
          color={colors.heart}
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
            <AppText
              fontWeight="heavy"
              size="large"
              style={styles.sectionTitle}
            >
              Browse by class
            </AppText>
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
            fontWeight="medium"
            numberOfLines={1}
            style={{ color: colors.medium }}
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
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }
    if (!hasMore && items?.length > PAGE_SIZE) {
      return (
        <View style={styles.footer}>
          <AppText size="small" style={{ color: colors.medium }}>
            You've reached the end
          </AppText>
        </View>
      );
    }
    return <View style={{ height: 8 }} />;
  }, [isFetching, hasMore, items?.length]);

  const ListEmptyEl = useMemo(() => {
    if (isError && !items?.length) {
      return (
        <View style={styles.centerBox}>
          <Ionicons name="cloud-offline" size={40} color={colors.medium} />
          <AppText
            fontWeight="bold"
            style={{ color: colors.medium, marginTop: 10, textAlign: "center" }}
          >
            {error?.data?.message || error?.error || "Couldn't load students"}
          </AppText>
          <Pressable onPress={retry} style={styles.retryBtn}>
            <AppText fontWeight="bold" style={{ color: colors.primaryDeeper }}>
              Try again
            </AppText>
          </Pressable>
        </View>
      );
    }
    if (isFetching || staleByFilter || !res) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
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
          <Ionicons name="arrow-back" size={22} color={colors.black} />
        </Pressable>

        <Animated.View
          style={[styles.titleWrap, titleStyle]}
          pointerEvents="none"
        >
          <AppText fontWeight="black" size="xlarge">
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
            <Ionicons name="search" size={20} color={colors.black} />
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
              placeholderTextColor={colors.medium}
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
              <Ionicons name="close-circle" size={20} color={colors.medium} />
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
  container: { flex: 1, backgroundColor: colors.unchange },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: H_PAD,
    paddingBottom: 10,
    minHeight: 44 + 8,
    backgroundColor: colors.unchange,
  },
  iconBtn: {
    width: BACK_W,
    height: BACK_W,
    borderRadius: BACK_W / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    boxShadow: `2px 8px 12px ${colors.black}25`,
  },
  titleWrap: { marginLeft: 12, flex: 1 },
  searchBox: {
    position: "absolute",
    right: H_PAD,
    height: 44,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: colors.white,
    boxShadow: `2px 8px 12px ${colors.black}25`,
  },
  searchIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: { flex: 1, flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: colors.black,
    paddingRight: 4,
  },
  closeBtn: { paddingHorizontal: 12, height: 44, justifyContent: "center" },

  // class cards
  classSection: { paddingTop: 4 },
  sectionTitle: { paddingHorizontal: H_PAD, marginBottom: 10 },
  classList: { paddingHorizontal: H_PAD, gap: 10 },
  classCard: {
    width: 150,
    padding: 12,
    borderRadius: 20,
    backgroundColor: colors.white,
    boxShadow: `2px 8px 12px ${colors.black}25`,
  },
  classCardOn: { backgroundColor: colors.primary },
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
    backgroundColor: colors.primaryLighter,
  },
  mineTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
    backgroundColor: colors.primaryLighter,
  },

  subHeader: { paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 14 },
  columnWrap: { paddingHorizontal: H_PAD, gap: GAP, marginBottom: GAP },

  card: {
    width: CARD_W,
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 12,
    paddingHorizontal: 10,
    borderRadius: 22,
    backgroundColor: colors.white,
    boxShadow: `2px 8px 12px ${colors.black}25`,
  },
  cardOwn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLighter + "40",
  },
  youBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    backgroundColor: colors.primaryLighter,
  },
  flagBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
    borderRadius: 20,
    backgroundColor: colors.extraLight,
  },
  name: { marginTop: 10, maxWidth: "100%" },
  levelBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
    backgroundColor: colors.primaryLighter,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.extraLight,
  },
  stat: { flex: 1, alignItems: "center" },
  statTop: { flexDirection: "row", alignItems: "center" },
  statDivider: { width: 1, height: 24, backgroundColor: colors.extraLight },

  footer: { paddingVertical: 20, alignItems: "center" },
  centerBox: { paddingTop: 60, paddingHorizontal: 30, alignItems: "center" },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: colors.primaryLighter,
  },
});
