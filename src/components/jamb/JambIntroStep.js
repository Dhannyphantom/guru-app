import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { LAYOUT } from "./JambMotion";

import AppText from "./JambText";
import { T } from "./JambTheme";
import JambHero from "./JambHero";
import { Chunky, Note } from "./JambUI";

const FEATURES = [
  { icon: "locate", title: "Predict Your Score Range", sub: "Get an estimated JAMB score", color: T.purpleDark, bg: T.purpleSoft, line: T.purpleLine },
  { icon: "warning", title: "Discover Weak Areas", sub: "See your weakest subjects & topics", color: T.coralDark, bg: T.coralSoft, line: T.coralLine },
  { icon: "book", title: "Personalised Study Plan", sub: "Focus on what you need most", color: T.greenDark, bg: T.greenSoft, line: T.greenLine },
  { icon: "stats-chart", title: "Track Progress", sub: "See your improvement over time", color: T.blueDark, bg: T.blueSoft, line: T.blueLine },
];

/** Step 1 — intro (Start Assessment replaced with Continue). */
const JambIntroStep = ({ onContinue, summary }) => {
  const [open, setOpen] = useState(false);

  return (
    <ScrollView
      style={{ backgroundColor: T.paper }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      <JambHero variant="intro" buttonLabel="Continue" onPress={onContinue} summary={summary} />

      <AppText fontWeight="black" size={12} style={styles.kicker}>
        WHAT YOU'LL GET
      </AppText>
      <View style={styles.grid}>
        {FEATURES.map((f, i) => (
          <Animated.View
            key={f.title}
            entering={FadeIn.delay(250 + i * 90)}
            style={[styles.feature, { backgroundColor: f.bg, borderColor: f.line }]}
          >
            <View style={[styles.featureIcon, { borderColor: f.line }]}>
              <Ionicons name={f.icon} size={20} color={f.color} />
            </View>
            <AppText fontWeight="black" size={13} style={styles.featureTitle}>
              {f.title}
            </AppText>
            <AppText fontWeight="medium" size={11} style={styles.featureSub}>
              {f.sub}
            </AppText>
          </Animated.View>
        ))}
      </View>

      <Note
        index={2}
        base={100}
        title="Teacher's Note"
        onPress={() => setOpen((o) => !o)}
        right={
          <Animated.View layout={LAYOUT} style={{ marginLeft: 6, marginTop: 2 }}>
            <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={T.yellowInk} />
          </Animated.View>
        }
      >
        <AppText fontWeight="medium" size={12.5} style={styles.noteText}>
          The Guru JAMB Score Predictor estimates your potential score range
          based purely on your performance within the Guru App. This is not a
          guarantee of your actual JAMB result and should be used as a guide
          for effective study.
        </AppText>
        {open && (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <AppText fontWeight="medium" size={12.5} style={[styles.noteText, { marginTop: 8 }]}>
              Predictions get more accurate the more questions you answer on
              Guru, so retake the assessment as you improve.
            </AppText>
          </Animated.View>
        )}
      </Note>

      <Animated.View entering={FadeIn.delay(450)} style={{ marginTop: 6 }}>
        <Chunky
          onPress={onContinue}
          face={T.ink}
          lip="#0F1830"
          radius={22}
          depth={6}
          contentStyle={styles.cta}
        >
          <View style={styles.ctaIcon}>
            <Ionicons name="school" size={24} color={T.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText fontWeight="black" size={16} style={{ color: "#fff" }}>
              Ready to know your JAMB readiness?
            </AppText>
            <AppText fontWeight="medium" size={12.5} style={{ color: "#B8C2DD", marginTop: 2 }}>
              Take the diagnostic assessment now.
            </AppText>
          </View>
          <View style={styles.ctaArrow}>
            <Ionicons name="arrow-forward" size={18} color={T.ink} />
          </View>
        </Chunky>
      </Animated.View>
    </ScrollView>
  );
};

export default JambIntroStep;

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4 },
  kicker: { color: T.sub, letterSpacing: 1.2, marginBottom: 10, marginLeft: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  feature: {
    width: "48.4%",
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
    padding: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#fff",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  featureTitle: { color: T.ink, lineHeight: 17 },
  featureSub: { color: T.sub, marginTop: 3, lineHeight: 15 },
  noteText: { color: "#4A4020", marginTop: 4, lineHeight: 18 },
  cta: { flexDirection: "row", alignItems: "center", padding: 14 },
  ctaIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: T.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  ctaArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});
