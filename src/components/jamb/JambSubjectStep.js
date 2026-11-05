/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
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
import { J, JAMB_MAX_SUBJECTS, isEnglish } from "../../helpers/jambConfig";
import { Card, Chip, JambButton, JambPressable, Skeleton, SubjectIcon } from "./JambUI";
import JambIllustration from "./JambIllustration";

const GAP = 8;
const BANNER_ART_SM = 116;

const SubjectTile = ({ subject, selected, required, size, index, onPress }) => {
  const sel = useSharedValue(selected ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    sel.value = withTiming(selected ? 1 : 0, { duration: 240 });
  }, [selected]);

  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(sel.value, [0, 1], ["#FFFFFF", J.mint]),
    borderColor: interpolateColor(sel.value, [0, 1], [J.line, J.green]),
    transform: [{ scale: scale.value }],
  }));

  const press = () => {
    scale.value = withSequence(
      withTiming(0.94, { duration: 90 }),
      withSpring(1, SPRING.bounce),
    );
    onPress(subject);
  };

  return (
    <Animated.View
      entering={enter(index * 0.6, 100)}
      layout={LAYOUT}
      style={{ width: size, marginBottom: GAP }}
    >
      <Animated.View style={[styles.tile, { height: size * 1.3 }, style]}>
        <JambPressable
          onPress={press}
          scaleTo={1}
          contentStyle={styles.tileInner}
        >
          <View style={styles.badgeSlot}>
            {selected ? (
              <Animated.View
                key="on"
                entering={popIn}
                exiting={popOut}
                style={[styles.badge, { backgroundColor: J.deep }]}
              >
                <Ionicons
                  name={required ? "lock-closed" : "checkmark"}
                  size={required ? 10 : 13}
                  color="#fff"
                />
              </Animated.View>
            ) : (
              <Animated.View
                key="off"
                entering={popIn}
                exiting={popOut}
                style={[styles.badge, { backgroundColor: "#E6ECE2" }]}
              >
                <Ionicons name="add" size={14} color="#9AA89E" />
              </Animated.View>
            )}
          </View>

          <SubjectIcon subject={subject} size={size * 0.5} bg="transparent" />
          <View style={styles.nameBox}>
            <AppText
              fontWeight="bold"
              size={11}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={styles.tileName}
            >
              {subject.name}
            </AppText>
          </View>
        </JambPressable>
      </Animated.View>
    </Animated.View>
  );
};

/** Step 2 — mockup 2.jpeg */
const JambSubjectStep = ({
  subjects = [],
  loading = false,
  initialIds = [],
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
      const base = (prev.length ? prev : initialIds).filter((id) => valid.has(id));
      const merged = english ? [english._id, ...base.filter((id) => id !== english._id)] : base;
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
  const gridWidth = width - 32 - 24; // screen padding + card padding
  const tile = Math.floor((gridWidth - GAP * (cols - 1)) / cols);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header card */}
        <BannerShell
          art={<JambIllustration variant="books" size={BANNER_ART_SM} />}
        >
          <JambPressable onPress={onBack} contentStyle={styles.backBtn}>
            <Ionicons name="arrow-back" size={18} color={J.deep} />
          </JambPressable>
          <AppText fontWeight="black" size={22} style={styles.headerTitle}>
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
              <AppText fontWeight="black" size={18} style={{ color: J.ink }}>
                Select Your 4 JAMB Subjects
              </AppText>
              <Animated.View key={hint ?? "default"} entering={FadeIn.duration(220)}>
                <AppText
                  fontWeight="medium"
                  size={12.5}
                  style={{ color: hint ? J.danger : J.muted, marginTop: 4 }}
                >
                  {hint ?? "You can only select a maximum of 4 subjects."}
                </AppText>
              </Animated.View>
            </View>
            <Animated.View style={chipShake}>
              <Animated.View key={count} entering={popIn}>
                <Chip
                  label={`${count}/${JAMB_MAX_SUBJECTS} selected`}
                  color={complete ? "#fff" : J.deep}
                  bg={complete ? J.green : J.mintStrong}
                />
              </Animated.View>
            </Animated.View>
          </View>

          <View style={styles.grid}>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    style={{ width: tile, height: tile * 1.3, marginBottom: GAP }}
                  />
                ))
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
        <Card index={2} base={80} style={styles.note}>
          <View style={styles.noteRow}>
            <View style={styles.noteIcon}>
              <Ionicons name="bulb" size={22} color={J.deep} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText fontWeight="bold" size={15} style={{ color: J.ink }}>
                Important Note
              </AppText>
              <AppText
                fontWeight="medium"
                size={12.5}
                style={{ color: J.ink, marginTop: 3, lineHeight: 18 }}
              >
                Once you select your 4 subjects, the JAMB Score Predictor will
                estimate your potential score range based purely on your
                performance within the Guru App. This is not a guarantee of your
                actual JAMB result and should be used as a guide for effective
                study.
              </AppText>
            </View>
          </View>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <JambButton
          title={complete ? "Continue" : `Select ${JAMB_MAX_SUBJECTS - count} more`}
          disabled={!complete}
          onPress={() =>
            onContinue(ids.map((id) => subjects.find((s) => s._id === id)).filter(Boolean))
          }
        />
      </View>
    </View>
  );
};

export default JambSubjectStep;

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  headerTitle: { color: J.deepest, lineHeight: 27 },
  headerDesc: { color: J.ink, marginTop: 6, lineHeight: 18 },
  selectHead: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", columnGap: GAP },
  tile: { borderRadius: 18, borderWidth: 1.5, overflow: "hidden" },
  tileInner: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 3, paddingTop: 6 },
  nameBox: { height: 30, alignSelf: "stretch", justifyContent: "center", marginTop: 4 },
  tileName: {
    color: J.ink,
    textAlign: "center",
    textTransform: "capitalize",
    lineHeight: 14,
  },
  badgeSlot: { position: "absolute", top: 6, right: 6, zIndex: 2 },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  note: { backgroundColor: "#EEF8E6", borderWidth: 1, borderColor: J.mintStrong },
  noteRow: { flexDirection: "row", alignItems: "flex-start" },
  noteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: J.mintStrong,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  footer: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 6 },
});
