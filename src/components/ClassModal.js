/* eslint-disable react/no-unescaped-entities */
import { Dimensions, FlatList, StyleSheet, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing as REasing,
  LinearTransition,
} from "react-native-reanimated";

import AppText from "../components/AppText";
import AppButton from "./AppButton";
import colors from "../helpers/colors";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import {
  selectSchool,
  useFetchClassesQuery,
  useLazyFetchClassesQuery,
} from "../context/schoolSlice";
import LottieAnimator from "./LottieAnimator";
import { useEffect } from "react";

const { width, height } = Dimensions.get("screen");
const CARD_WIDTH = (width * 0.95 - 24 - 12) / 2;

// ── Muted per-card color palettes ─────────────────────────────────────────────
// Each palette: { bg, border, chipBg, chipTxt, icon, divider }
const CARD_PALETTES = [
  {
    bg: "#F1F8E9",
    border: "#C5E1A5",
    chipBg: "#DCEDC8",
    chipTxt: "#33691e",
    icon: "#558B2F",
    divider: "#C5E1A5",
  },
  {
    bg: "#EDE7F6",
    border: "#D1C4E9",
    chipBg: "#D1C4E9",
    chipTxt: "#311b92",
    icon: "#512DA8",
    divider: "#D1C4E9",
  },
  {
    bg: "#E3F2FD",
    border: "#BBDEFB",
    chipBg: "#BBDEFB",
    chipTxt: "#0d47a1",
    icon: "#1565C0",
    divider: "#BBDEFB",
  },
  {
    bg: "#FFF8E1",
    border: "#FFECB3",
    chipBg: "#FFECB3",
    chipTxt: "#e65100",
    icon: "#F57C00",
    divider: "#FFE082",
  },
  {
    bg: "#E8F5E9",
    border: "#C8E6C9",
    chipBg: "#C8E6C9",
    chipTxt: "#1B5E20",
    icon: "#2E7D32",
    divider: "#A5D6A7",
  },
  {
    bg: "#FCE4EC",
    border: "#F8BBD0",
    chipBg: "#F8BBD0",
    chipTxt: "#880E4F",
    icon: "#C2185B",
    divider: "#F48FB1",
  },
  {
    bg: "#E0F7FA",
    border: "#B2EBF2",
    chipBg: "#B2EBF2",
    chipTxt: "#006064",
    icon: "#00838F",
    divider: "#80DEEA",
  },
  {
    bg: "#F9FBE7",
    border: "#F0F4C3",
    chipBg: "#F0F4C3",
    chipTxt: "#827717",
    icon: "#9E9D24",
    divider: "#E6EE9C",
  },
];

const getPalette = (index) => CARD_PALETTES[index % CARD_PALETTES.length];

// ── ClassItem ──────────────────────────────────────────────────────────────────
const ClassItem = ({ item, index, isCurrentClass }) => {
  const palette = getPalette(index);

  const scale = useSharedValue(0.88);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    const delay = index * 40;
    opacity.value = withTiming(1, {
      duration: 280,
      easing: REasing.out(REasing.quad),
    });
    translateY.value = withTiming(0, {
      duration: 300,
      easing: REasing.out(REasing.cubic),
    });
    scale.value = withSpring(1, { damping: 14, stiffness: 120 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  if (isCurrentClass) {
    return (
      <Animated.View style={[styles.cardWrapper, animStyle]}>
        {/* Outer accent ring */}
        <View style={styles.currentRing}>
          <View style={styles.currentCard}>
            {/* Top row: MY CLASS badge + star icon */}
            <View style={styles.currentTopRow}>
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <AppText
                  style={styles.activeBadgeTxt}
                  size="tiny"
                  fontWeight="black"
                >
                  MY CLASS
                </AppText>
              </View>
              <Ionicons name="star" size={14} color={colors.warning} />
            </View>

            {/* Level */}
            <View style={styles.currentLevelChip}>
              <AppText
                fontWeight="black"
                style={styles.currentLevelTxt}
                size="large"
              >
                {item?.level ?? "—"}
              </AppText>
            </View>

            {/* Alias */}
            {item?.alias && (
              <AppText
                fontWeight="bold"
                style={styles.currentAliasTxt}
                numberOfLines={2}
              >
                {item?.alias ?? "—"}
              </AppText>
            )}

            {/* Divider */}
            <View style={styles.currentDivider} />

            {/* Stats */}
            <View style={styles.currentStatsCol}>
              <View style={styles.currentStatRow}>
                <Ionicons
                  name="people"
                  size={12}
                  color="rgba(255,255,255,0.75)"
                />
                <AppText style={styles.currentStatTxt} size="tiny">
                  {item?.students ?? 0} student(s)
                </AppText>
              </View>
              <View style={styles.currentStatRow}>
                <Ionicons
                  name="person-circle"
                  size={12}
                  color="rgba(255,255,255,0.75)"
                />
                <AppText style={styles.currentStatTxt} size="tiny">
                  {item?.teachers ?? 0} teacher(s)
                </AppText>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.cardWrapper, animStyle]}>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.bg, borderColor: palette.border },
        ]}
      >
        {/* Level chip */}
        <View style={[styles.levelChip, { backgroundColor: palette.chipBg }]}>
          <AppText
            fontWeight="black"
            style={{ ...styles.levelTxt, color: palette.chipTxt }}
            size="small"
          >
            {item?.level ?? "—"}
          </AppText>
        </View>

        {/* Alias */}
        {item?.alias && (
          <AppText fontWeight="bold" style={styles.aliasTxt} numberOfLines={2}>
            {item?.alias ?? "—"}
          </AppText>
        )}

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: palette.divider }]} />

        {/* Stats */}
        <View style={styles.statsCol}>
          <View style={styles.statRow}>
            <Ionicons name="people-outline" size={12} color={palette.icon} />
            <AppText
              style={[styles.statTxt, { color: palette.icon }]}
              size="tiny"
            >
              {item?.students ?? 0} student(s)
            </AppText>
          </View>
          <View style={styles.statRow}>
            <Ionicons
              name="person-circle-outline"
              size={12}
              color={palette.icon}
            />
            <AppText
              style={[styles.statTxt, { color: palette.icon }]}
              size="tiny"
            >
              {item?.teachers ?? 0} teacher(s)
            </AppText>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

// ── ClassModal ─────────────────────────────────────────────────────────────────
const ClassModal = ({ closeModal }) => {
  const user = useSelector(selectUser);
  const school = useSelector(selectSchool);
  const { data, isLoading } = useFetchClassesQuery(school?._id);

  const classes = data?.data ?? [];

  const isTeacher = user?.accountType === "teacher";
  const isStudent = user?.accountType === "student";
  const currentClassId = user?.class?.id;

  const renderHeader = () => (
    <>
      <View style={styles.handle} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AppText fontWeight="black" size="xlarge" style={styles.title}>
            {isTeacher ? "School Classes" : "Classes"}
          </AppText>
          {!!school?.name && (
            <AppText
              style={styles.subtitle}
              size="small"
              fontWeight="medium"
              numberOfLines={1}
            >
              {school.name}
            </AppText>
          )}
        </View>
        <View style={styles.countBadge}>
          <AppText fontWeight="black" style={styles.countTxt}>
            {classes.length}
          </AppText>
          <AppText style={styles.countLabel} size="tiny">
            total
          </AppText>
        </View>
      </View>

      {isTeacher && (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" color={colors.accent} size={17} />
          <AppText style={styles.infoBannerTxt} size="small">
            Select classes you're currently teaching. Students in these classes
            can access your quizzes and assignments.
          </AppText>
        </View>
      )}
    </>
  );

  return (
    <Animated.View
      layout={LinearTransition.springify()}
      style={styles.container}
    >
      {!isLoading ? (
        <FlatList
          data={classes}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <ClassItem
              item={item}
              index={index}
              isCurrentClass={
                isStudent && !!currentClassId && item._id === currentClassId
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="school-outline"
                size={40}
                color={colors.lighter}
              />
              <AppText style={{ color: colors.medium, marginTop: 10 }}>
                No classes found
              </AppText>
            </View>
          }
        />
      ) : (
        <View style={styles.loaderBox}>
          <LottieAnimator visible absolute />
        </View>
      )}

      <View style={styles.footer}>
        <AppButton
          onPress={closeModal}
          contStyle={styles.closeBtn}
          type="white"
          title="Close"
        />
      </View>
    </Animated.View>
  );
};

export default ClassModal;

const styles = StyleSheet.create({
  container: {
    width: width * 0.95,
    backgroundColor: colors.white,
    borderRadius: 20,
    maxHeight: height * 0.87,
    minHeight: height * 0.45,
    elevation: 16,
    overflow: "hidden",
  },

  // ── Handle & Header ─────────────────────────────────────────────────────────
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.lighter,
    borderRadius: 99,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: colors.deep,
    lineHeight: 26,
  },
  subtitle: {
    color: colors.medium,
    marginTop: 2,
    textTransform: "capitalize",
  },
  countBadge: {
    backgroundColor: colors.primaryDeeper,
    borderRadius: 12,
    minWidth: 44,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  countTxt: {
    color: colors.white,
    fontSize: 17,
    lineHeight: 20,
  },
  countLabel: {
    color: colors.primaryLighter,
    letterSpacing: 0.3,
  },

  // ── Info banner ──────────────────────────────────────────────────────────────
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.accentLightest,
    borderRadius: 12,
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 10,
    gap: 8,
  },
  infoBannerTxt: {
    color: colors.accent,
    flex: 1,
    lineHeight: 18,
  },

  // ── Section label ────────────────────────────────────────────────────────────
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  // ── List ─────────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },

  // ── Card shared ──────────────────────────────────────────────────────────────
  cardWrapper: {
    width: CARD_WIDTH,
    marginBottom: 12,
  },

  // ── Regular card ─────────────────────────────────────────────────────────────
  card: {
    borderRadius: 16,
    padding: 13,
    borderWidth: 1.5,
    elevation: 1,
  },
  levelChip: {
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  levelTxt: {
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  aliasTxt: {
    color: colors.deep,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
    textTransform: "capitalize",
  },
  divider: {
    height: 1,
    marginBottom: 8,
  },
  statsCol: {
    gap: 5,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statTxt: {
    lineHeight: 15,
  },

  // ── Current class card ───────────────────────────────────────────────────────
  currentRing: {
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: colors.primaryLight,
    elevation: 8,
    shadowColor: colors.primaryDeep,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    backgroundColor: colors.primaryDeeper,
  },
  currentCard: {
    backgroundColor: colors.primaryDeeper,
    borderRadius: 16,
    padding: 13,
  },
  currentTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: colors.greenLight,
  },
  activeBadgeTxt: {
    color: colors.white,
    letterSpacing: 0.6,
    fontSize: 9,
  },
  currentLevelChip: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  currentLevelTxt: {
    color: colors.primaryLighter,
    letterSpacing: 0.3,
  },
  currentAliasTxt: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 10,
  },
  currentDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 8,
  },
  currentStatsCol: {
    gap: 5,
  },
  currentStatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  currentStatTxt: {
    color: "rgba(255,255,255,0.75)",
    lineHeight: 15,
  },

  // ── Empty & loader ───────────────────────────────────────────────────────────
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loaderBox: {
    flex: 1,
    minHeight: 200,
  },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.lightly,
    backgroundColor: colors.white,
  },
  closeBtn: {
    marginHorizontal: width * 0.15,
  },
});
