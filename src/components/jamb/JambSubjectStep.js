/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LAYOUT, SPRING, enter, popIn, popOut } from "./JambMotion";
import { BannerShell } from "./JambHero";

import AppText from "./JambText";
import { JAMB_MAX_SUBJECTS, isEnglish } from "../../helpers/jambConfig";
import { T } from "./JambTheme";
import {
  Card,
  Chip,
  JambButton,
  JambPressable,
  Loader,
  Note,
  SubjectIcon,
} from "./JambUI";
import JambIllustration from "./JambIllustration";

const GAP = 8;
const ROW_GAP = 10;
const BANNER_ART_SM = 116;
const BOX_PAD = 10; // space around the icon inside the tile
const NAME_H = 30; // room for up to 2 lines of name
const NAME_GAP = 6; // space between icon and name

const getIconSize = (size) => Math.round(size * 0.5);
const getBoxHeight = (size) => getIconSize(size) + BOX_PAD * 2 + NAME_GAP + NAME_H;

const SubjectTile = ({ subject, selected, required, size, index, onPress }) => {
  const sel = useSharedValue(selected ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    sel.value = withTiming(selected ? 1 : 0, { duration: 240 });
  }, [selected]);

  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(sel.value, [0, 1], ["#FFFFFF", T.greenSoft]),
    borderColor: interpolateColor(sel.value, [0, 1], [T.line, T.green]),
    transform: [{ scale: scale.value }],
  }));

  const press = () => {
    scale.value = withSequence(
      withTiming(0.94, { duration: 90 }),
      withSpring(1, SPRING.bounce),
    );
    onPress(subject);
  };

  const iconSize = getIconSize(size);
  const boxHeight = getBoxHeight(size);

  return (
    <Animated.View
      entering={enter(index * 0.6, 100)}
      layout={LAYOUT}
      style={{ width: size, marginBottom: ROW_GAP }}
    >
      <Animated.View style={[styles.tile, { height: boxHeight }, boxStyle]}>
        <JambPressable
          onPress={press}
          scaleTo={1}
          style={styles.pressFill}
          contentStyle={styles.tileInner}
        >
          <View style={styles.badgeSlot}>
            {selected ? (
              <Animated.View
                key="on"
                entering={popIn}
                exiting={popOut}
                style={[styles.badge, { backgroundColor: T.green }]}
              >
                <Ionicons
                  name={required ? "lock-closed" : "checkmark"}
                  size={required ? 9 : 11}
                  color="#fff"
                />
              </Animated.View>
            ) : (
              <Animated.View
                key="off"
                entering={popIn}
                exiting={popOut}
                style={[styles.badge, { backgroundColor: T.track }]}
              >
                <Ionicons name="add" size={12} color={T.faint} />
              </Animated.View>
            )}
          </View>

          <View style={styles.iconWrap}>
            <SubjectIcon subject={subject} size={iconSize} bg="transparent" />
          </View>

          <View style={styles.nameBox}>
            <AppText
              fontWeight="bold"
              size={11}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={[styles.tileName, selected && { color: T.greenDark }]}
            >
              {subject.name}
            </AppText>
          </View>
        </JambPressable>
      </Animated.View>
    </Animated.View>
  );
};

/** Step 2 — subject combination selector */
const JambSubjectStep = ({
  subjects = [],
  loading = false,
  initialIds = [],
  roundProgress = 0,
  onBack,
  onContinue,
}) => {
  const { width } = useWindowDimensions();
  const [ids, setIds] = useState([]);
  const [hint, setHint] = useState(null);
  const shake = useSharedValue(0);

  const english = useMemo(() => subjects.find(isEnglish), [subjects]);

  // Seed selection: compulsory English + previously saved picks
  useEffect(() => {
    if (!subjects.length) return;
    setIds((prev) => {
      const valid = new Set(subjects.map((s) => s._id));
      const base = (prev.length ? prev : initialIds).filter((id) =>
        valid.has(id),
      );
      const merged = english
        ? [english._id, ...base.filter((id) => id !== english._id)]
        : base;
      return merged.slice(0, JAMB_MAX_SUBJECTS);
    });
  }, [subjects, initialIds]);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 2200);
    return () => clearTimeout(t);
  }, [hint]);

  const count = ids.length;
  const complete = count === JAMB_MAX_SUBJECTS;

  const chipShake = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const toggle = (subject) => {
    if (isEnglish(subject)) {
      setHint("English Language is compulsory for JAMB.");
      return;
    }
    if (ids.includes(subject._id)) {
      setIds((p) => p.filter((id) => id !== subject._id));
      return;
    }
    if (count >= JAMB_MAX_SUBJECTS) {
      setHint("You can only select a maximum of 4 subjects.");
      shake.value = withSequence(
        withTiming(-7, { duration: 50 }),
        withRepeat(withTiming(7, { duration: 90 }), 4, true),
        withTiming(0, { duration: 50 }),
      );
      return;
    }
    setIds((p) => [...p, subject._id]);
  };

  const cols = width < 340 ? 3 : 4;
  const gridWidth = width - 32 - 28 - 4; // screen padding + card padding + borders
  const tile = Math.floor((gridWidth - GAP * (cols - 1)) / cols);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header board */}
        <BannerShell
          art={<JambIllustration variant="books" size={BANNER_ART_SM} />}
        >
          <JambPressable onPress={onBack} contentStyle={styles.backBtn}>
            <Ionicons name="arrow-back" size={18} color={T.ink} />
          </JambPressable>
          <AppText fontWeight="black" size={21} style={styles.headerTitle}>
            {"JAMB Subject\nCombination Selector"}
          </AppText>
          <AppText fontWeight="medium" size={12.5} style={styles.headerDesc}>
            Select your 4 JAMB subjects carefully. This will form the basis of
            your diagnostics and predictions.
          </AppText>
        </BannerShell>

        {/* Selection card */}
        <Card index={1} base={80}>
          <View style={styles.selectHead}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <AppText fontWeight="black" size={17} style={{ color: T.ink }}>
                Pick Your 4 Subjects
              </AppText>
              <Animated.View
                key={hint ?? "default"}
                entering={FadeIn.duration(220)}
              >
                <AppText
                  fontWeight="medium"
                  size={12}
                  style={{ color: hint ? T.coralDark : T.sub, marginTop: 4 }}
                >
                  {hint ?? "You can only select a maximum of 4 subjects."}
                </AppText>
              </Animated.View>
            </View>
            <Animated.View style={chipShake}>
              <Animated.View key={count} entering={popIn}>
                <Chip
                  label={`${count}/${JAMB_MAX_SUBJECTS} selected`}
                  color={complete ? "#fff" : T.greenDark}
                  bg={complete ? T.green : T.greenSoft}
                />
              </Animated.View>
            </Animated.View>
          </View>

          {/* progress pips */}
          <View style={styles.pips}>
            {Array.from({ length: JAMB_MAX_SUBJECTS }).map((_, i) => (
              <View
                key={i}
                style={[styles.pip, i < count && { backgroundColor: T.green }]}
              />
            ))}
          </View>

          {roundProgress > 0 && (
            <Animated.View entering={FadeIn} style={styles.warn}>
              <Ionicons name="information-circle" size={16} color={T.yellowInk} />
              <AppText
                fontWeight="medium"
                size={11.5}
                style={{ color: "#5C4B10", marginLeft: 6, flex: 1, lineHeight: 16 }}
              >
                A round is in progress. Changing your subjects will restart it.
              </AppText>
            </Animated.View>
          )}

          <View style={styles.grid}>
            {loading
              ? <Loader size={72} label="Loading subjects…" style={{ width: "100%", paddingVertical: 36 }} />
              : subjects.map((s, i) => (
                  <SubjectTile
                    key={s._id}
                    subject={s}
                    index={i}
                    size={tile}
                    selected={ids.includes(s._id)}
                    required={isEnglish(s)}
                    onPress={toggle}
                  />
                ))}
          </View>
        </Card>

        {/* Note */}
        <Note index={2} base={80} title="Important Note" icon="bulb">
          <AppText fontWeight="medium" size={12.5} style={styles.noteText}>
            Once you select your 4 subjects, the JAMB Score Predictor will
            estimate your potential score range based purely on your
            performance within the Guru App. This is not a guarantee of your
            actual JAMB result and should be used as a guide for effective
            study.
          </AppText>
        </Note>
      </ScrollView>

      <View style={styles.footer}>
        <JambButton
          title={
            complete ? "Continue" : `Select ${JAMB_MAX_SUBJECTS - count} more`
          }
          disabled={!complete}
          onPress={() =>
            onContinue(
              ids
                .map((id) => subjects.find((s) => s._id === id))
                .filter(Boolean),
            )
          }
        />
      </View>
    </View>
  );
};

export default JambSubjectStep;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.paper },
  scroll: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: T.chalk,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  headerTitle: { color: T.chalk, lineHeight: 26 },
  headerDesc: { color: T.chalkSoft, marginTop: 6, lineHeight: 18 },
  selectHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  pips: { flexDirection: "row", gap: 6, marginBottom: 14 },
  pip: { flex: 1, height: 6, borderRadius: 3, backgroundColor: T.track },
  grid: { flexDirection: "row", flexWrap: "wrap", columnGap: GAP },
  tile: { borderRadius: 18, borderWidth: 2, borderBottomWidth: 4, overflow: "hidden" },
  pressFill: { flex: 1 },
  tileInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: BOX_PAD,
    paddingHorizontal: 3,
  },
  iconWrap: { alignItems: "center", justifyContent: "center" },
  nameBox: {
    height: NAME_H,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    marginTop: NAME_GAP,
  },
  tileName: {
    color: T.ink,
    textAlign: "center",
    textTransform: "capitalize",
    lineHeight: 14,
  },
  badgeSlot: { position: "absolute", top: 5, right: 5, zIndex: 2 },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  warn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.yellowSoft,
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
  },
  noteText: { color: "#4A4020", marginTop: 4, lineHeight: 18 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: T.paper,
    borderTopWidth: 2,
    borderTopColor: T.line,
  },
});
