import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { LAYOUT } from "./JambMotion";

import AppText from "./JambText";
import { J } from "../../helpers/jambConfig";
import JambHero from "./JambHero";
import { Card, JambPressable } from "./JambUI";

const FEATURES = [
  { icon: "locate", title: "Predict Your Score Range", sub: "Get an estimated JAMB score", color: J.violet, bg: J.violetBg },
  { icon: "warning", title: "Discover Weak Areas", sub: "See your weakest subjects & topics", color: J.danger, bg: J.dangerBg },
  { icon: "book", title: "Personalised Study Plan", sub: "Focus on what you need most", color: J.deep, bg: J.mint },
  { icon: "stats-chart", title: "Track Progress", sub: "See your improvement over time", color: J.blue, bg: J.blueBg },
];

/** Step 1 — mockup 1.jpeg (Start Assessment replaced with Continue). */
const JambIntroStep = ({ onContinue, summary }) => {
  const [open, setOpen] = useState(false);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      <JambHero variant="intro" buttonLabel="Continue" onPress={onContinue} summary={summary} />

      <Card index={1} base={100} style={styles.features}>
        {FEATURES.map((f, i) => (
          <Animated.View
            key={f.title}
            entering={FadeIn.delay(300 + i * 90)}
            style={[styles.feature, i > 0 && styles.featureDivider]}
          >
            <View style={[styles.featureIcon, { backgroundColor: f.bg }]}>
              <Ionicons name={f.icon} size={22} color={f.color} />
            </View>
            <AppText fontWeight="bold" size={12} style={styles.featureTitle}>
              {f.title}
            </AppText>
            <AppText fontWeight="medium" size={10.5} style={styles.featureSub}>
              {f.sub}
            </AppText>
          </Animated.View>
        ))}
      </Card>

      <Card index={2} base={100} style={styles.disclaimer}>
        <JambPressable onPress={() => setOpen((o) => !o)} contentStyle={styles.disclaimerRow}>
          <View style={styles.bulb}>
            <Ionicons name="bulb" size={24} color={J.amber} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText fontWeight="bold" size={15} style={{ color: J.ink }}>
              Important Disclaimer
            </AppText>
            <AppText
              fontWeight="medium"
              size={12.5}
              style={{ color: "#5C5636", marginTop: 4, lineHeight: 18 }}
            >
              The Guru JAMB Score Predictor estimates your potential score range
              based purely on your performance within the Guru App. This is not a
              guarantee of your actual JAMB result and should be used as a guide
              for effective study.
            </AppText>
            {open && (
              <Animated.View entering={FadeIn} exiting={FadeOut}>
                <AppText
                  fontWeight="medium"
                  size={12.5}
                  style={{ color: "#5C5636", marginTop: 8, lineHeight: 18 }}
                >
                  Predictions get more accurate the more questions you answer on
                  Guru, so retake the assessment as you improve.
                </AppText>
              </Animated.View>
            )}
          </View>
          <Animated.View layout={LAYOUT}>
            <Ionicons
              name={open ? "chevron-up" : "chevron-forward"}
              size={18}
              color="#7B6B2C"
            />
          </Animated.View>
        </JambPressable>
      </Card>

      <Animated.View entering={FadeIn.delay(450)}>
        <JambPressable onPress={onContinue} contentStyle={styles.cta}>
          <View style={styles.ctaIcon}>
            <Ionicons name="school" size={24} color={J.deep} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText fontWeight="bold" size={17} style={{ color: "#fff" }}>
              Ready to know your JAMB readiness?
            </AppText>
            <AppText fontWeight="medium" size={13} style={{ color: "#CDEBD6", marginTop: 2 }}>
              Take the diagnostic assessment now.
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </JambPressable>
      </Animated.View>
    </ScrollView>
  );
};

export default JambIntroStep;

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4 },
  features: { flexDirection: "row", paddingHorizontal: 4, paddingVertical: 16 },
  feature: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  featureDivider: { borderLeftWidth: 1, borderLeftColor: J.line },
  featureIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  featureTitle: { color: J.ink, textAlign: "center" },
  featureSub: { color: J.muted, textAlign: "center", marginTop: 4 },
  disclaimer: { backgroundColor: "#FFF8DC", borderWidth: 1, borderColor: J.amberLine },
  disclaimerRow: { flexDirection: "row", alignItems: "flex-start" },
  bulb: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FCE7A1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: J.deep,
    borderRadius: 22,
    padding: 14,
    shadowColor: J.deepest,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  ctaIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#DDF3E4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
});
