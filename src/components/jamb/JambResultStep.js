/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { LAYOUT } from "./JambMotion";

import AppText from "./JambText";
import {
  J,
  JAMB_TOTAL,
  SUBJECT_TINTS,
  getLevelInfo,
  levelRangeLabel,
} from "../../helpers/jambConfig";
import JambHero from "./JambHero";
import JambCooldownCard from "./JambCooldownCard";
import { useCooldown } from "./useCooldown";
import {
  AnimatedBar,
  Card,
  Chip,
  JambButton,
  ProgressRing,
  SubjectIcon,
  enter,
  useCountUp,
} from "./JambUI";

const SubjectResult = ({ item, index, width }) => {
  const tint = SUBJECT_TINTS[index % SUBJECT_TINTS.length];
  return (
    <Animated.View
      entering={enter(index, 350)}
      style={[styles.sub, { width, backgroundColor: tint.bg, borderColor: tint.border }]}
    >
      <View style={styles.subTop}>
        <SubjectIcon subject={item} size={42} bg="#fff" />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <AppText fontWeight="bold" size={13} numberOfLines={1} style={{ color: J.ink, textTransform: "capitalize" }}>
            {item.name}
          </AppText>
          <AppText fontWeight="black" size={20} style={{ color: J.ink }}>
            {item.correct}
            <AppText fontWeight="semibold" size={13} style={{ color: J.muted }}>
              /{item.total}
            </AppText>
          </AppText>
        </View>
      </View>
      <View style={styles.subMid}>
        <Chip label={`${item.percent}%`} color={J.deep} bg="#fff" />
        <AppText fontWeight="medium" size={11} style={{ color: J.muted }}>
          {item.total} questions
        </AppText>
      </View>
      <AnimatedBar percent={item.percent} color={tint.bar} track="#fff" delay={600 + index * 120} />
    </Animated.View>
  );
};

const Insight = ({ icon, color, bg, label, children, index }) => (
  <Animated.View entering={enter(index, 600)} style={[styles.insight, { backgroundColor: bg }]}>
    <View style={[styles.insightIcon, { backgroundColor: "#fff" }]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <AppText fontWeight="bold" size={11.5} style={{ color: J.ink, marginTop: 6 }}>
      {label}
    </AppText>
    {children}
  </Animated.View>
);

const DetailRow = ({ item, index }) => {
  const seg = (n) => Math.max(n, 0);
  return (
    <Animated.View entering={FadeIn.delay(index * 80)} style={{ marginTop: 14 }}>
      <View style={styles.detailHead}>
        <AppText fontWeight="bold" size={13} style={{ color: J.ink, flex: 1, textTransform: "capitalize" }}>
          {item.name}
        </AppText>
        <AppText fontWeight="semibold" size={11.5} style={{ color: J.muted }}>
          {item.percent}%
        </AppText>
      </View>
      <View style={styles.stack}>
        {seg(item.correct) > 0 && <View style={{ flex: item.correct, backgroundColor: J.green }} />}
        {seg(item.wrong) > 0 && <View style={{ flex: item.wrong, backgroundColor: J.danger }} />}
        {seg(item.skipped) > 0 && <View style={{ flex: item.skipped, backgroundColor: "#C9D3C6" }} />}
      </View>
      <View style={styles.legend}>
        <AppText size={11} fontWeight="semibold" style={{ color: J.green }}>
          {item.correct} correct
        </AppText>
        <AppText size={11} fontWeight="semibold" style={{ color: J.danger }}>
          {item.wrong} wrong
        </AppText>
        <AppText size={11} fontWeight="semibold" style={{ color: J.muted }}>
          {item.skipped} skipped
        </AppText>
      </View>
    </Animated.View>
  );
};

/** Step 5 — mockup 4.jpeg */
const JambResultStep = ({ result, lifetimeCorrect = 0, summary, onRetake, onDone, onExpire }) => {
  const cooldown = useCooldown(summary?.cooldownUntil, onExpire);
  const { width } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);

  const score = useCountUp(result.predicted, 1200, 350);
  const info = getLevelInfo(lifetimeCorrect);
  const ins = result.insights;
  const cardW = (width - 32 - 28 - 10) / 2;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <JambHero variant="result" showButton={false} predicted={result.predicted} />

        {/* Score + level */}
        <Card index={1} base={150} style={styles.scoreCard}>
          <View style={styles.scoreLeft}>
            <ProgressRing percent={result.percent} size={78} stroke={9} delay={400}>
              <AppText fontWeight="black" size={16} style={{ color: J.ink }}>
                {result.percent}%
              </AppText>
            </ProgressRing>
            <View style={{ marginLeft: 12 }}>
              <AppText fontWeight="semibold" size={12.5} style={{ color: J.ink }}>
                Predicted JAMB Score
              </AppText>
              <AppText fontWeight="black" size={28} style={{ color: J.ink }}>
                {score}
                <AppText fontWeight="semibold" size={16} style={{ color: J.muted }}>
                  /{JAMB_TOTAL}
                </AppText>
              </AppText>
              <Chip label={result.rating.label} color={result.rating.color} bg={result.rating.bg} />
              {result.subjects.length < 4 && (
                <AppText fontWeight="medium" size={10} style={{ color: J.muted, marginTop: 5 }}>
                  Projected from {result.subjects.length} of 4 subjects
                </AppText>
              )}
            </View>
          </View>

          <View style={styles.levelBox}>
            <View style={[styles.levelIcon, { backgroundColor: info.level.bg }]}>
              <Ionicons name={info.level.icon} size={22} color={info.level.color} />
            </View>
            <AppText fontWeight="medium" size={11} style={{ color: J.muted, marginTop: 6 }}>
              Current Level
            </AppText>
            <AppText fontWeight="black" size={16} style={{ color: J.ink }}>
              {info.level.name}
            </AppText>
            <AppText fontWeight="medium" size={10} style={{ color: J.muted, textAlign: "center" }}>
              {levelRangeLabel(info.level)} correct
            </AppText>
            <AppText fontWeight="semibold" size={10} style={{ color: J.green, marginTop: 2 }}>
              +{result.totalCorrect} added
            </AppText>
          </View>
        </Card>

        {cooldown.active && <JambCooldownCard cooldown={cooldown} index={2} base={150} />}

        {/* Round / average / best */}
        {Boolean(summary) && (
          <Card index={2} base={150}>
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <AppText fontWeight="medium" size={10.5} style={{ color: J.muted }}>Round</AppText>
                <AppText fontWeight="black" size={17} style={{ color: J.ink }}>#{result.number ?? summary.rounds}</AppText>
              </View>
              <View style={[styles.stat, styles.statMid]}>
                <AppText fontWeight="medium" size={10.5} style={{ color: J.muted }}>Average</AppText>
                <AppText fontWeight="black" size={17} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: J.deep }}>
                  {summary.average}/{JAMB_TOTAL}
                </AppText>
              </View>
              <View style={styles.stat}>
                <AppText fontWeight="medium" size={10.5} style={{ color: J.muted }}>Best</AppText>
                <AppText fontWeight="black" size={17} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: J.ink }}>
                  {summary.best}/{JAMB_TOTAL}
                </AppText>
              </View>
            </View>
            <AppText fontWeight="medium" size={11} style={{ color: J.muted, textAlign: "center", marginTop: 8 }}>
              Your average prediction across {summary.rounds} round{summary.rounds === 1 ? "" : "s"} is shown on the JAMB banner.
            </AppText>
          </Card>
        )}

        {/* Subject performance */}
        <Card index={2} base={150}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionTitle}>
              <Ionicons name="stats-chart" size={20} color={J.green} />
              <AppText fontWeight="black" size={19} style={{ color: J.ink, marginLeft: 8 }}>
                Subject Performance
              </AppText>
            </View>
            <Chip label={`${result.subjects.length}/4 Subjects`} bg={J.mintStrong} />
          </View>
          <View style={styles.subGrid}>
            {result.subjects.map((s, i) => (
              <SubjectResult key={s._id} item={s} index={i} width={cardW} />
            ))}
          </View>
        </Card>

        {/* Key insights */}
        {Boolean(ins) && (
          <Card index={3} base={150}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionTitle}>
                <Ionicons name="bulb" size={20} color={J.amber} />
                <AppText fontWeight="black" size={19} style={{ color: J.ink, marginLeft: 8 }}>
                  Key Insights
                </AppText>
              </View>
            </View>

            <View style={styles.subGrid}>
              <View style={{ width: cardW }}>
                <Insight index={0} icon="trending-up" color={J.green} bg={J.mint} label="Strongest Subject">
                  <AppText fontWeight="bold" size={12.5} style={{ color: J.deep, marginTop: 4, textTransform: "capitalize" }}>
                    {ins.strongest.name} ({ins.strongest.percent}%)
                  </AppText>
                </Insight>
              </View>
              <View style={{ width: cardW }}>
                <Insight index={1} icon="warning" color={J.amber} bg={J.amberBg} label="Needs Improvement">
                  <AppText fontWeight="bold" size={12.5} style={{ color: J.amber, marginTop: 4, textTransform: "capitalize" }}>
                    {ins.weakest.name} ({ins.weakest.percent}%)
                  </AppText>
                </Insight>
              </View>
              <View style={{ width: cardW }}>
                <Insight index={2} icon="locate" color={J.deep} bg={J.mint} label="Focus Areas">
                  {ins.focus.map((f) => (
                    <AppText key={f.name} fontWeight="medium" size={12} style={{ color: J.ink, marginTop: 3, textTransform: "capitalize" }}>
                      • {f.name} ({f.percent}%)
                    </AppText>
                  ))}
                </Insight>
              </View>
              <View style={{ width: cardW }}>
                <Insight index={3} icon="bulb" color={J.green} bg={J.mint} label="Next Step">
                  <AppText fontWeight="medium" size={12} style={{ color: J.ink, marginTop: 4, lineHeight: 16 }}>
                    {ins.nextStep}
                  </AppText>
                </Insight>
              </View>
            </View>

            <JambButton
              title={expanded ? "Hide Detailed Analysis" : "View Detailed Analysis"}
              icon={expanded ? "chevron-up" : "arrow-forward"}
              onPress={() => setExpanded((e) => !e)}
              style={{ marginTop: 6 }}
            />

            {expanded && (
              <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(150)} layout={LAYOUT}>
                <View style={styles.rangeBox}>
                  <Ionicons name="swap-horizontal" size={18} color={J.deep} />
                  <AppText fontWeight="semibold" size={13} style={{ color: J.ink, marginLeft: 8, flex: 1 }}>
                    Likely JAMB range:{" "}
                    <AppText fontWeight="black" size={13} style={{ color: J.deep }}>
                      {result.range.low} – {result.range.high}
                    </AppText>
                  </AppText>
                </View>
                {result.subjects.map((s, i) => (
                  <DetailRow key={s._id} item={s} index={i} />
                ))}
              </Animated.View>
            )}
          </Card>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <JambButton
          title={cooldown.active ? "History" : "New Round"}
          variant="ghost"
          icon={cooldown.active ? "time" : "refresh"}
          onPress={onRetake}
          style={{ flex: 1 }}
        />
        <JambButton title="Done" icon="checkmark" onPress={onDone} style={{ flex: 1 }} />
      </View>
    </View>
  );
};

export default JambResultStep;

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4 },
  scoreCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scoreLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  levelBox: {
    width: 112,
    alignItems: "center",
    backgroundColor: "#F2FAEA",
    borderRadius: 18,
    padding: 10,
    marginLeft: 6,
  },
  levelIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { flexDirection: "row", alignItems: "center" },
  subGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sub: { borderRadius: 18, borderWidth: 1, padding: 10 },
  subTop: { flexDirection: "row", alignItems: "center" },
  subMid: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 10 },
  insight: { borderRadius: 16, padding: 10, minHeight: 108 },
  insightIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  statRow: { flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, alignItems: "center" },
  statMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: J.line },
  rangeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: J.mint,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  detailHead: { flexDirection: "row", marginBottom: 6 },
  stack: { flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", backgroundColor: "#E4EDE0" },
  legend: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
  footer: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingBottom: 12, paddingTop: 6 },
});
