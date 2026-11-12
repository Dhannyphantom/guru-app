/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { LAYOUT } from "./JambMotion";

import AppText from "./JambText";
import {
  JAMB_TOTAL,
  getLevelInfo,
  levelRangeLabel,
} from "../../helpers/jambConfig";
import { T, TINTS } from "./JambTheme";
import JambHero from "./JambHero";
import JambCooldownCard from "./JambCooldownCard";
import { useCooldown } from "./useCooldown";
import {
  AnimatedBar,
  Card,
  Chip,
  JambButton,
  ProgressRing,
  SectionTitle,
  SubjectIcon,
  enter,
  useCountUp,
} from "./JambUI";

const SubjectResult = ({ item, index, width }) => {
  const tint = TINTS[index % TINTS.length];
  return (
    <Animated.View
      entering={enter(index, 350)}
      style={[styles.sub, { width, backgroundColor: tint.bg, borderColor: tint.border }]}
    >
      <View style={styles.subTop}>
        <SubjectIcon subject={item} size={40} bg="#fff" radius={13} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <AppText fontWeight="bold" size={12.5} numberOfLines={1} style={{ color: T.ink, textTransform: "capitalize" }}>
            {item.name}
          </AppText>
          <AppText fontWeight="black" size={20} style={{ color: T.ink }}>
            {item.correct}
            <AppText fontWeight="semibold" size={13} style={{ color: T.sub }}>
              /{item.total}
            </AppText>
          </AppText>
        </View>
      </View>
      <View style={styles.subMid}>
        <Chip label={`${item.percent}%`} color={tint.ink} bg="#fff" />
        <AppText fontWeight="medium" size={11} style={{ color: T.sub }}>
          {item.total} questions
        </AppText>
      </View>
      <AnimatedBar percent={item.percent} color={tint.bar} track="#fff" height={10} delay={600 + index * 120} />
    </Animated.View>
  );
};

const Insight = ({ icon, color, bg, line, label, children, index }) => (
  <Animated.View
    entering={enter(index, 600)}
    style={[styles.insight, { backgroundColor: bg, borderColor: line }]}
  >
    <View style={styles.insightIcon}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <AppText fontWeight="black" size={11} style={{ color: color, marginTop: 8, letterSpacing: 0.4, textTransform: "uppercase" }}>
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
        <AppText fontWeight="bold" size={13} style={{ color: T.ink, flex: 1, textTransform: "capitalize" }}>
          {item.name}
        </AppText>
        <AppText fontWeight="semibold" size={11.5} style={{ color: T.sub }}>
          {item.percent}%
        </AppText>
      </View>
      <View style={styles.stack}>
        {seg(item.correct) > 0 && <View style={{ flex: item.correct, backgroundColor: T.green }} />}
        {seg(item.wrong) > 0 && <View style={{ flex: item.wrong, backgroundColor: T.coral }} />}
        {seg(item.skipped) > 0 && <View style={{ flex: item.skipped, backgroundColor: "#CFC9B3" }} />}
      </View>
      <View style={styles.legend}>
        <AppText size={11} fontWeight="bold" style={{ color: T.greenDark }}>
          {item.correct} correct
        </AppText>
        <AppText size={11} fontWeight="bold" style={{ color: T.coralDark }}>
          {item.wrong} wrong
        </AppText>
        <AppText size={11} fontWeight="bold" style={{ color: T.sub }}>
          {item.skipped} skipped
        </AppText>
      </View>
    </Animated.View>
  );
};

/** Step 5 — result / report card */
const JambResultStep = ({ result, lifetimeCorrect = 0, summary, onRetake, onDone, onExpire }) => {
  const cooldown = useCooldown(summary?.cooldownUntil, onExpire);
  const { width } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);

  const score = useCountUp(result.predicted, 1200, 350);
  const info = getLevelInfo(lifetimeCorrect);
  const ins = result.insights;
  const cardW = (width - 32 - 28 - 4 - 10) / 2;

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <JambHero variant="result" showButton={false} predicted={result.predicted} />

        {/* Report card: score */}
        <Card index={1} base={150} style={styles.scoreCard}>
          <View style={styles.scoreTop}>
            <View style={{ flex: 1 }}>
              <AppText fontWeight="black" size={10} style={{ color: T.yellowInk, letterSpacing: 1.3 }}>
                PREDICTED JAMB SCORE
              </AppText>
              <View style={styles.scoreRow}>
                <AppText fontWeight="black" size={46} style={{ color: T.ink, lineHeight: 54 }}>
                  {score}
                </AppText>
                <AppText fontWeight="bold" size={17} style={{ color: T.sub, marginLeft: 3, marginBottom: 8 }}>
                  /{JAMB_TOTAL}
                </AppText>
              </View>
              <Chip label={result.rating.label} color={result.rating.color} bg={result.rating.bg} />
              {result.subjects.length < 4 && (
                <AppText fontWeight="medium" size={10} style={{ color: T.sub, marginTop: 6 }}>
                  Projected from {result.subjects.length} of 4 subjects
                </AppText>
              )}
            </View>
            <ProgressRing
              percent={result.percent}
              size={86}
              stroke={10}
              color={T.yellowDark}
              track="#fff"
              delay={400}
            >
              <AppText fontWeight="black" size={16} style={{ color: T.ink }}>
                {result.percent}%
              </AppText>
            </ProgressRing>
          </View>

          <View style={styles.levelStrip}>
            <View style={[styles.levelIcon, { backgroundColor: info.level.bg }]}>
              <Ionicons name={info.level.icon} size={22} color={info.level.color} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <AppText fontWeight="medium" size={10.5} style={{ color: T.sub }}>
                Current Level
              </AppText>
              <AppText fontWeight="black" size={15} style={{ color: T.ink }}>
                {info.level.name}
              </AppText>
              <AppText fontWeight="medium" size={10} style={{ color: T.sub }}>
                {levelRangeLabel(info.level)} correct
              </AppText>
            </View>
            <Chip label={`+${result.totalCorrect} added`} color={T.greenDark} bg={T.greenSoft} />
          </View>
        </Card>

        {cooldown.active && <JambCooldownCard cooldown={cooldown} index={2} base={150} />}

        {/* Round / average / best */}
        {Boolean(summary) && (
          <Card index={2} base={150}>
            <View style={styles.statRow}>
              <View style={[styles.stat, { backgroundColor: T.blueSoft }]}>
                <AppText fontWeight="bold" size={10.5} style={{ color: T.blueDark }}>Round</AppText>
                <AppText fontWeight="black" size={17} style={{ color: T.ink }}>#{result.number ?? summary.rounds}</AppText>
              </View>
              <View style={[styles.stat, { backgroundColor: T.yellowSoft }]}>
                <AppText fontWeight="bold" size={10.5} style={{ color: T.yellowInk }}>Average</AppText>
                <AppText fontWeight="black" size={17} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: T.ink }}>
                  {summary.average}/{JAMB_TOTAL}
                </AppText>
              </View>
              <View style={[styles.stat, { backgroundColor: T.greenSoft }]}>
                <AppText fontWeight="bold" size={10.5} style={{ color: T.greenDark }}>Best</AppText>
                <AppText fontWeight="black" size={17} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: T.ink }}>
                  {summary.best}/{JAMB_TOTAL}
                </AppText>
              </View>
            </View>
            <AppText fontWeight="medium" size={11} style={{ color: T.sub, textAlign: "center", marginTop: 10 }}>
              Your average prediction across {summary.rounds} round{summary.rounds === 1 ? "" : "s"} is shown on the JAMB banner.
            </AppText>
          </Card>
        )}

        {/* Subject performance */}
        <Card index={2} base={150}>
          <SectionTitle
            icon="stats-chart"
            color={T.blueDark}
            bg={T.blueSoft}
            title="Subject Performance"
            right={
              <Chip label={`${result.subjects.length}/4`} bg={T.blueSoft} color={T.blueDark} />
            }
          />
          <View style={styles.subGrid}>
            {result.subjects.map((s, i) => (
              <SubjectResult key={s._id} item={s} index={i} width={cardW} />
            ))}
          </View>
        </Card>

        {/* Key insights */}
        {Boolean(ins) && (
          <Card index={3} base={150}>
            <SectionTitle icon="bulb" color={T.yellowInk} bg={T.yellowSoft} title="Teacher's Remarks" />

            <View style={styles.subGrid}>
              <View style={{ width: cardW }}>
                <Insight index={0} icon="trending-up" color={T.greenDark} bg={T.greenSoft} line={T.greenLine} label="Strongest">
                  <AppText fontWeight="bold" size={12.5} style={{ color: T.ink, marginTop: 4, textTransform: "capitalize" }}>
                    {ins.strongest.name} ({ins.strongest.percent}%)
                  </AppText>
                </Insight>
              </View>
              <View style={{ width: cardW }}>
                <Insight index={1} icon="warning" color={T.coralDark} bg={T.coralSoft} line={T.coralLine} label="Needs work">
                  <AppText fontWeight="bold" size={12.5} style={{ color: T.ink, marginTop: 4, textTransform: "capitalize" }}>
                    {ins.weakest.name} ({ins.weakest.percent}%)
                  </AppText>
                </Insight>
              </View>
              <View style={{ width: cardW }}>
                <Insight index={2} icon="locate" color={T.blueDark} bg={T.blueSoft} line={T.blueLine} label="Focus areas">
                  {ins.focus.map((f) => (
                    <AppText key={f.name} fontWeight="medium" size={12} style={{ color: T.ink, marginTop: 3, textTransform: "capitalize" }}>
                      • {f.name} ({f.percent}%)
                    </AppText>
                  ))}
                </Insight>
              </View>
              <View style={{ width: cardW }}>
                <Insight index={3} icon="bulb" color={T.purpleDark} bg={T.purpleSoft} line={T.purpleLine} label="Next step">
                  <AppText fontWeight="medium" size={12} style={{ color: T.ink, marginTop: 4, lineHeight: 16 }}>
                    {ins.nextStep}
                  </AppText>
                </Insight>
              </View>
            </View>

            <JambButton
              title={expanded ? "Hide Detailed Analysis" : "View Detailed Analysis"}
              variant="ghost"
              icon={expanded ? "chevron-up" : "arrow-forward"}
              onPress={() => setExpanded((e) => !e)}
              style={{ marginTop: 14 }}
            />

            {expanded && (
              <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(150)} layout={LAYOUT}>
                <View style={styles.rangeBox}>
                  <Ionicons name="swap-horizontal" size={18} color={T.yellowInk} />
                  <AppText fontWeight="semibold" size={13} style={{ color: T.ink, marginLeft: 8, flex: 1 }}>
                    Likely JAMB range:{" "}
                    <AppText fontWeight="black" size={13} style={{ color: T.ink }}>
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
  root: { flex: 1, backgroundColor: T.paper },
  scroll: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4 },
  scoreCard: { backgroundColor: T.yellowSoft, borderColor: T.yellowLine },
  scoreTop: { flexDirection: "row", alignItems: "center" },
  scoreRow: { flexDirection: "row", alignItems: "flex-end", marginVertical: 2 },
  levelStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 10,
    marginTop: 14,
  },
  levelIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  subGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sub: { borderRadius: 18, borderWidth: 2, borderBottomWidth: 4, padding: 10 },
  subTop: { flexDirection: "row", alignItems: "center" },
  subMid: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 10 },
  insight: { borderRadius: 18, borderWidth: 2, borderBottomWidth: 4, padding: 10, minHeight: 112 },
  insightIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  statRow: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, alignItems: "center", borderRadius: 14, paddingVertical: 10, paddingHorizontal: 4 },
  rangeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.yellowSoft,
    borderWidth: 2,
    borderColor: T.yellowLine,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  detailHead: { flexDirection: "row", marginBottom: 6 },
  stack: { flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden", backgroundColor: T.track },
  legend: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: T.paper,
    borderTopWidth: 2,
    borderTopColor: T.line,
  },
});
