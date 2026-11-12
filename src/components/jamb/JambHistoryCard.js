import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";

import AppText from "./JambText";
import { JAMB_TOTAL } from "../../helpers/jambConfig";
import { T } from "./JambTheme";
import { LAYOUT, enter } from "./JambMotion";
import { Card, Chip, JambPressable, ProgressRing, SectionTitle } from "./JambUI";

const VISIBLE = 4;

const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
};

const Row = ({ item, older, index }) => {
  const delta = older ? item.predicted - older.predicted : null;
  const up = delta > 0;

  return (
    <Animated.View
      entering={enter(index, 80)}
      layout={LAYOUT}
      style={styles.row}
    >
      <View style={styles.badge}>
        <AppText fontWeight="black" size={9} style={{ color: T.sub, letterSpacing: 0.6 }}>
          RD
        </AppText>
        <AppText fontWeight="black" size={14} style={{ color: T.ink, marginTop: -2 }}>
          {item.number}
        </AppText>
      </View>

      <View style={{ flex: 1 }}>
        <AppText fontWeight="bold" size={13} style={{ color: T.ink }}>
          Round {item.number}
        </AppText>
        <AppText fontWeight="medium" size={10.5} style={{ color: T.sub }}>
          {fmtDate(item.date)} · {item.totalCorrect}/{item.totalQuestions} correct
        </AppText>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <AppText fontWeight="black" size={16} style={{ color: T.ink }}>
          {item.predicted}
          <AppText fontWeight="semibold" size={10.5} style={{ color: T.sub }}>
            /{JAMB_TOTAL}
          </AppText>
        </AppText>
        {delta !== null && delta !== 0 ? (
          <View
            style={[
              styles.delta,
              { backgroundColor: up ? T.greenSoft : T.coralSoft },
            ]}
          >
            <Ionicons
              name={up ? "arrow-up" : "arrow-down"}
              size={10}
              color={up ? T.greenDark : T.coralDark}
            />
            <AppText
              fontWeight="black"
              size={10.5}
              style={{ color: up ? T.greenDark : T.coralDark, marginLeft: 2 }}
            >
              {Math.abs(delta)}
            </AppText>
          </View>
        ) : (
          <Chip
            label={item.rating?.label ?? ""}
            color={item.rating?.color}
            bg={item.rating?.bg}
            style={{ marginTop: 3 }}
          />
        )}
      </View>
    </Animated.View>
  );
};

/** Round history + average prediction (out of 400). */
const JambHistoryCard = ({ summary, index = 2 }) => {
  const [all, setAll] = useState(false);
  const history = summary?.history ?? [];
  const rounds = summary?.rounds ?? 0;
  const rows = all ? history : history.slice(0, VISIBLE);

  return (
    <Card index={index}>
      <SectionTitle
        icon="time"
        color={T.blueDark}
        bg={T.blueSoft}
        title="Round History"
        right={
          <Chip
            label={`${rounds} round${rounds === 1 ? "" : "s"}`}
            bg={T.blueSoft}
            color={T.blueDark}
          />
        }
      />

      {rounds === 0 ? (
        <Animated.View entering={FadeIn.delay(200)} style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="flag" size={24} color={T.greenDark} />
          </View>
          <AppText
            fontWeight="medium"
            size={12.5}
            style={{ color: T.sub, textAlign: "center", marginTop: 10, lineHeight: 18 }}
          >
            Practise all four subjects to complete a round. Your score prediction
            and average will show up here.
          </AppText>
        </Animated.View>
      ) : (
        <>
          <View style={styles.avgBox}>
            <ProgressRing
              size={64}
              stroke={8}
              color={T.yellowDark}
              track="#fff"
              percent={Math.round((summary.average / JAMB_TOTAL) * 100)}
              delay={300}
            >
              <AppText fontWeight="black" size={14} style={{ color: T.ink }}>
                {summary.average}
              </AppText>
            </ProgressRing>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <AppText fontWeight="bold" size={11.5} style={{ color: T.yellowInk }}>
                Average prediction
              </AppText>
              <AppText fontWeight="black" size={24} style={{ color: T.ink }}>
                {summary.average}
                <AppText fontWeight="semibold" size={13} style={{ color: T.sub }}>
                  /{JAMB_TOTAL}
                </AppText>
              </AppText>
            </View>
            <View style={styles.bestBox}>
              <Ionicons name="trophy" size={14} color={T.yellowDark} />
              <AppText fontWeight="medium" size={9.5} style={{ color: T.sub, marginTop: 2 }}>
                Best
              </AppText>
              <AppText fontWeight="black" size={15} style={{ color: T.ink }}>
                {summary.best}
              </AppText>
            </View>
          </View>

          {rows.map((r, i) => (
            <Row key={r.id} item={r} older={history[history.indexOf(r) + 1]} index={i} />
          ))}

          {history.length > VISIBLE && (
            <JambPressable
              onPress={() => setAll((a) => !a)}
              style={{ alignSelf: "center", marginTop: 10 }}
              contentStyle={styles.more}
            >
              <AppText fontWeight="black" size={11.5} style={{ color: T.greenDark, letterSpacing: 0.5 }}>
                {all ? "SHOW LESS" : `SHOW ALL ${history.length}`}
              </AppText>
              <Ionicons
                name={all ? "chevron-up" : "chevron-down"}
                size={14}
                color={T.greenDark}
                style={{ marginLeft: 4 }}
              />
            </JambPressable>
          )}
        </>
      )}
    </Card>
  );
};

export default JambHistoryCard;

const styles = StyleSheet.create({
  empty: { alignItems: "center", paddingVertical: 10, paddingHorizontal: 8 },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: T.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avgBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.yellowSoft,
    borderWidth: 2,
    borderColor: T.yellowLine,
    borderRadius: 18,
    padding: 12,
    marginBottom: 4,
  },
  bestBox: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: T.line,
    borderStyle: "dashed",
  },
  badge: {
    width: 38,
    height: 42,
    borderRadius: 10,
    backgroundColor: T.paper,
    borderWidth: 2,
    borderColor: T.line,
    borderTopWidth: 6,
    borderTopColor: T.coral,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  delta: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 3,
  },
  more: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: T.greenSoft,
  },
});
